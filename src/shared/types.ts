// Tipe data yang dipakai bersama oleh API (src/worker) dan frontend (src/client).

export type ApiList<T> = {
  data: T[]
}

// Bentuk respons error API. `details` berisi pesan per field untuk error validasi.
export type ApiErrorBody = {
  error: string
  details?: Record<string, string[]>
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

export const USER_ROLES = ['ADMIN', 'TREASURER', 'PASTOR', 'ELDER'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  TREASURER: 'Bendahara',
  PASTOR: 'Pendeta',
  ELDER: 'Majelis',
}

// Pengguna yang sedang masuk, sesuai kolom tabel users (tanpa password_hash).
export type SessionUser = {
  id: number
  name: string
  email: string | null
  username: string | null
  role: UserRole
  rayon_id: number | null
}
