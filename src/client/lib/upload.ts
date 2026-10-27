import type { ApiErrorBody } from '@shared/types'
import {
  UPLOAD_MAX_BYTES,
  UPLOAD_TYPES,
  isUploadContentType,
  type UploadContentType,
  type UploadedFile,
  type UploadFolder,
} from '@shared/uploads'
import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  authHeaders,
  defaultErrorMessage,
  notifyUnauthorized,
} from '@/lib/api'

// Layanan unggah berkas ke Cloudflare R2 melalui POST /api/uploads.
// Memakai XMLHttpRequest karena fetch belum bisa melaporkan progres unggahan.

export type UploadOptions = {
  folder: UploadFolder
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

// Nilai untuk atribut `accept` pada <input type="file">.
export const UPLOAD_ACCEPT = Object.keys(UPLOAD_TYPES).join(',')

const EXTENSION_TYPES: Record<string, UploadContentType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
}

// Validasi awal di browser; server tetap memeriksa isi berkas.
export function validateUpload(file: File): string | null {
  if (file.size === 0) return 'Berkas kosong.'
  if (file.size > UPLOAD_MAX_BYTES) {
    return `Ukuran berkas ${formatBytes(file.size)}, maksimal ${formatBytes(UPLOAD_MAX_BYTES)}.`
  }
  if (!isUploadContentType(detectType(file))) {
    return 'Jenis berkas tidak didukung. Gunakan JPG, PNG, WebP, atau PDF.'
  }
  return null
}

export function uploadFile(file: File, options: UploadOptions): Promise<UploadedFile> {
  const invalid = validateUpload(file)
  if (invalid) return Promise.reject(new ApiError(400, invalid))

  const { folder, onProgress, signal } = options
  if (signal?.aborted) return Promise.reject(signal.reason)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/uploads')
    xhr.responseType = 'json'
    xhr.setRequestHeader('Accept', 'application/json')
    for (const [name, value] of Object.entries(authHeaders())) xhr.setRequestHeader(name, value)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve(xhr.response as UploadedFile)
        return
      }
      const body = xhr.response as ApiErrorBody | null
      if (xhr.status === 401) notifyUnauthorized()
      reject(new ApiError(xhr.status, body?.error ?? defaultErrorMessage(xhr.status), body?.details))
    }
    xhr.onerror = () => reject(new ApiError(0, NETWORK_ERROR_MESSAGE))
    xhr.onabort = () => reject(new DOMException('Unggahan dibatalkan.', 'AbortError'))
    signal?.addEventListener('abort', () => xhr.abort(), { once: true })

    const form = new FormData()
    form.append('folder', folder)
    form.append('file', file)
    xhr.send(form)
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })} ${units[unit]}`
}

// Sebagian sistem tidak mengisi file.type (mis. .webp di Windows lama): pakai ekstensi.
function detectType(file: File): string {
  if (file.type) return file.type
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_TYPES[extension] ?? ''
}
