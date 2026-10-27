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

export type LoginRequest = {
  // Email atau username.
  identifier: string
  password: string
}

// Respons POST /api/auth/login dan GET /api/auth/me. Token sesi dikirim lewat
// cookie HttpOnly, tidak pernah di body, agar tidak bisa dibaca JavaScript.
export type AuthResponse = {
  user: SessionUser
}

export type UserListItem = SessionUser & {
  rayon_name: string | null
  is_active: boolean
  created_at: string
}
