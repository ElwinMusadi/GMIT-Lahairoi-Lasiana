import type { ApiErrorBody } from '@shared/types'

// Pemanggil API Hono. Path relatif ke /api karena SPA dan Worker berjalan di origin
// yang sama (dev server Vite maupun Cloudflare Workers), sehingga cookie sesi ikut
// terkirim otomatis. Header Authorization ditambahkan bila ada token.

const DEFAULT_TIMEOUT_MS = 30_000

export const NETWORK_ERROR_MESSAGE =
  'Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.'

type QueryValue = string | number | boolean | null | undefined

export type ApiRequestOptions = {
  query?: Record<string, QueryValue>
  // Objek biasa dikirim sebagai JSON; FormData, Blob, dan URLSearchParams apa adanya.
  body?: unknown
  headers?: HeadersInit
  signal?: AbortSignal
  timeoutMs?: number
  // false untuk endpoint yang tidak memakai sesi (mis. login), agar respons 401
  // tidak dianggap sebagai sesi yang berakhir.
  auth?: boolean
}

export class ApiError extends Error {
  readonly status: number
  readonly details: Record<string, string[]>

  constructor(status: number, message: string, details: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }

  // status 0: permintaan tidak sampai ke server (offline, DNS, timeout).
  get isNetworkError() {
    return this.status === 0
  }
}

type ApiConfig = {
  getToken: () => string | null
  onUnauthorized: () => void
}

const config: ApiConfig = {
  getToken: () => null,
  onUnauthorized: () => {},
}

// Dipanggil sekali oleh modul sesi untuk menyambungkan token dan penanganan 401.
export function configureApi(options: Partial<ApiConfig>) {
  Object.assign(config, options)
}

export function authHeaders(): Record<string, string> {
  const token = config.getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export function notifyUnauthorized() {
  config.onUnauthorized()
}

export function defaultErrorMessage(status: number): string {
  if (status === 400) return 'Permintaan tidak valid.'
  if (status === 401) return 'Sesi Anda telah berakhir. Silakan masuk kembali.'
  if (status === 403) return 'Anda tidak memiliki akses untuk tindakan ini.'
  if (status === 404) return 'Data tidak ditemukan.'
  if (status === 409) return 'Data bentrok dengan data yang sudah ada.'
  if (status === 413) return 'Ukuran berkas terlalu besar.'
  if (status === 415) return 'Jenis berkas tidak didukung.'
  if (status === 422) return 'Data belum lengkap atau tidak valid.'
  if (status === 429) return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.'
  if (status >= 500) return 'Terjadi kesalahan pada server. Coba lagi beberapa saat lagi.'
  return `Permintaan gagal (HTTP ${status}).`
}

export async function apiRequest<T>(
  method: string,
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { query, body, signal, timeoutMs = DEFAULT_TIMEOUT_MS, auth = true } = options

  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (auth) {
    for (const [name, value] of Object.entries(authHeaders())) headers.set(name, value)
  }

  let payload: BodyInit | undefined
  if (body instanceof FormData || body instanceof Blob || body instanceof URLSearchParams) {
    payload = body
  } else if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
    payload = JSON.stringify(body)
  }

  const timeout = AbortSignal.timeout(timeoutMs)
  let res: Response
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: payload,
      credentials: 'same-origin',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
  } catch (err) {
    // Dibatalkan oleh pemanggil (mis. komponen unmount): teruskan AbortError apa adanya.
    if (signal?.aborted) throw err
    if (timeout.aborted) throw new ApiError(0, 'Server terlalu lama merespons. Coba lagi.')
    throw new ApiError(0, NETWORK_ERROR_MESSAGE)
  }

  if (!res.ok) {
    const errorBody = (await res.json().catch(() => null)) as ApiErrorBody | null
    if (res.status === 401 && auth) notifyUnauthorized()
    throw new ApiError(
      res.status,
      errorBody?.error ?? defaultErrorMessage(res.status),
      errorBody?.details,
    )
  }

  if (res.status === 204) return undefined as T
  const isJson = res.headers.get('content-type')?.includes('application/json')
  return (isJson ? await res.json() : await res.text()) as T
}

function buildUrl(path: string, query: ApiRequestOptions['query']): string {
  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(name, String(value))
  }
  const search = params.size > 0 ? `?${params}` : ''
  return `/api${path.startsWith('/') ? path : `/${path}`}${search}`
}

type BodyOptions = Omit<ApiRequestOptions, 'body'>

export const api = {
  get: <T>(path: string, options?: BodyOptions) => apiRequest<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: BodyOptions) =>
    apiRequest<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: BodyOptions) =>
    apiRequest<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: BodyOptions) =>
    apiRequest<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: BodyOptions) => apiRequest<T>('DELETE', path, options),
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
