// Tipe data yang dipakai bersama oleh API (src/worker) dan frontend (src/client).

export type ApiList<T> = {
  data: T[]
}

// Daftar berhalaman, mis. GET /api/audit-logs?page=2&per_page=50.
export type ApiPage<T> = {
  data: T[]
  meta: { page: number; per_page: number; total: number }
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

// Timestamp dari API selalu ISO 8601 UTC (mis. "2026-10-28T03:15:00Z").
export type UserListItem = SessionUser & {
  rayon_name: string | null
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

// POST /api/users (khusus Admin).
export type CreateUserRequest = {
  name: string
  // Minimal salah satu dari email atau username wajib diisi.
  email?: string | null
  username?: string | null
  role: UserRole
  // Wajib untuk Majelis; untuk peran lain selalu dikosongkan.
  rayon_id?: number | null
  // Bila kosong, server membuat kata sandi sementara (lihat UserMutationResponse).
  password?: string
}

// PATCH /api/users/:id (khusus Admin). Hanya field yang dikirim yang diubah.
export type UpdateUserRequest = Partial<Omit<CreateUserRequest, 'password'>> & {
  is_active?: boolean
  // Mengatur kata sandi baru secara langsung...
  password?: string
  // ...atau meminta server membuat kata sandi sementara. Keduanya menghentikan sesi
  // aktif pengguna tersebut.
  reset_password?: true
}

export type UserMutationResponse = {
  user: UserListItem
  // Hanya ada bila server membuat kata sandi sementara. Tampilkan sekali ke Admin
  // untuk diserahkan ke pemilik akun; nilainya tidak disimpan dan tidak bisa diambil lagi.
  temporary_password?: string
}

// Satu kolom yang berubah pada aksi UPDATE. Nilai kolom rahasia (kata sandi) diganti
// "[disembunyikan]".
export type AuditFieldChange = { from: unknown; to: unknown }

export type AuditDetails = {
  // Nama entitas saat aksi terjadi, agar log tetap terbaca walau datanya berubah.
  label?: string
  // UPDATE: hanya kolom yang berubah.
  changes?: Record<string, AuditFieldChange>
  // CREATE/DELETE: isi data saat dibuat atau sebelum dihapus.
  data?: Record<string, unknown>
  ip?: string | null
  [key: string]: unknown
}

export type AuditLogItem = {
  id: number
  // CREATE, UPDATE, DELETE, IMPORT, LOGIN, LOGOUT, LOGIN_FAILED, ...
  action: string
  // Nama tabel, mis. users, members, finance_transactions.
  entity_type: string
  entity_id: number | null
  user_id: number | null
  // null untuk aksi sistem, pengunjung portal, atau login dengan akun tak dikenal.
  user_name: string | null
  user_role: UserRole | null
  details: AuditDetails | null
  created_at: string
}
