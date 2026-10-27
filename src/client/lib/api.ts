import type { ApiError } from '@shared/types'

// Pembungkus fetch untuk API Hono. Path relatif ke /api karena SPA dan Worker
// berjalan di origin yang sama (dev server Vite maupun Cloudflare Workers).
export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init)
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null
    throw new Error(body?.error ?? `Permintaan gagal (HTTP ${res.status})`)
  }
  return (await res.json()) as T
}
