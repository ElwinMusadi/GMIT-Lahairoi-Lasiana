// Tipe data yang dipakai bersama oleh API (src/worker) dan frontend (src/client).

export type ApiList<T> = {
  data: T[]
}

export type ApiError = {
  error: string
}

export type HealthStatus = {
  status: 'ok' | 'degraded'
  database: 'ok' | 'error'
  timestamp: string
}

export type Rayon = {
  id: number
  name: string
  description: string | null
  coordinator_name: string | null
}
