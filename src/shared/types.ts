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

export type RayonStats = {
  family_count: number
  // Anggota berstatus Aktif.
  member_count: number
}

// GET /api/rayons publik untuk portal; statistik hanya disertakan untuk pengurus
// yang sedang masuk.
export type RayonListItem = Rayon & Partial<RayonStats>

// POST /api/rayons dan PUT /api/rayons/:id (khusus Admin).
export type RayonRequest = {
  name: string
  description?: string | null
  coordinator_name?: string | null
}

export type RayonResponse = { rayon: Rayon & RayonStats }

// Kode yang tersimpan di database (CHECK pada migrasi 0003) beserta sebutannya.
export const GENDERS = ['MALE', 'FEMALE'] as const
export type Gender = (typeof GENDERS)[number]
export const GENDER_LABELS: Record<Gender, string> = { MALE: 'Laki-laki', FEMALE: 'Perempuan' }

export const BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const
export type BloodType = (typeof BLOOD_TYPES)[number]

export const FAMILY_RELATIONS = ['HEAD', 'SPOUSE', 'CHILD', 'DEPENDENT'] as const
export type FamilyRelation = (typeof FAMILY_RELATIONS)[number]
export const FAMILY_RELATION_LABELS: Record<FamilyRelation, string> = {
  HEAD: 'Kepala Keluarga',
  SPOUSE: 'Istri/Suami',
  CHILD: 'Anak',
  DEPENDENT: 'Tanggungan',
}

export const CATEGORICAL_GROUPS = ['PAR', 'PEMUDA', 'KAUM_IBU', 'KAUM_BAPAK', 'LANSIA'] as const
export type CategoricalGroup = (typeof CATEGORICAL_GROUPS)[number]
export const CATEGORICAL_GROUP_LABELS: Record<CategoricalGroup, string> = {
  PAR: 'PAR',
  PEMUDA: 'Pemuda',
  KAUM_IBU: 'Kaum Ibu',
  KAUM_BAPAK: 'Kaum Bapak',
  LANSIA: 'Lansia',
}

export const MARRIAGE_STATUSES = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'] as const
export type MarriageStatus = (typeof MARRIAGE_STATUSES)[number]
export const MARRIAGE_STATUS_LABELS: Record<MarriageStatus, string> = {
  SINGLE: 'Belum menikah',
  MARRIED: 'Menikah',
  DIVORCED: 'Cerai hidup',
  WIDOWED: 'Cerai mati',
}

export const MEMBER_STATUSES = ['ACTIVE', 'MOVED', 'DECEASED'] as const
export type MemberStatus = (typeof MEMBER_STATUSES)[number]
export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  ACTIVE: 'Aktif',
  MOVED: 'Pindah',
  DECEASED: 'Meninggal',
}

// Kartu Keluarga gereja. Rayon anggota jemaat mengikuti rayon KK-nya.
export type Family = {
  id: number
  kk_number: string | null
  family_head_name: string
  rayon_id: number
  rayon_name: string
  address: string | null
  phone: string | null
  // Anggota berstatus Aktif.
  member_count: number
  created_at: string
  updated_at: string
}

// GET /api/families/:id: KK beserta seluruh anggotanya (termasuk yang pindah atau
// meninggal), urut Kepala Keluarga, Istri/Suami, Anak, Tanggungan.
export type FamilyDetail = Family & { members: Member[] }

// POST /api/families dan PUT /api/families/:id.
export type FamilyRequest = {
  kk_number?: string | null
  family_head_name: string
  // Majelis: bila kosong, diisi rayon Majelis tersebut.
  rayon_id: number
  address?: string | null
  phone?: string | null
}

export type FamilyResponse = { family: FamilyDetail }

// Tanggal berformat YYYY-MM-DD; status baptis/sidi true berarti sudah.
export type Member = {
  id: number
  family_id: number
  church_member_number: string | null
  nik: string | null
  full_name: string
  gender: Gender
  birth_place: string | null
  birth_date: string | null
  blood_type: BloodType | null
  family_relation: FamilyRelation
  education: string | null
  occupation: string | null
  categorical_group: CategoricalGroup | null
  baptism_status: boolean
  baptism_date: string | null
  sidi_status: boolean
  sidi_date: string | null
  marriage_status: MarriageStatus | null
  marriage_date: string | null
  status: MemberStatus
  created_at: string
  updated_at: string
}

// GET /api/members dan GET /api/members/:id: anggota beserta KK dan rayonnya.
export type MemberWithFamily = Member & {
  kk_number: string | null
  family_head_name: string
  rayon_id: number
  rayon_name: string
}

// POST /api/members dan PUT /api/members/:id. Mengisi tanggal baptis/sidi tanpa
// statusnya berarti sudah dibaptis/sidi.
export type MemberRequest = {
  family_id: number
  church_member_number?: string | null
  nik?: string | null
  full_name: string
  gender: Gender
  birth_place?: string | null
  birth_date?: string | null
  blood_type?: BloodType | null
  family_relation: FamilyRelation
  education?: string | null
  occupation?: string | null
  categorical_group?: CategoricalGroup | null
  baptism_status?: boolean
  baptism_date?: string | null
  sidi_status?: boolean
  sidi_date?: string | null
  marriage_status?: MarriageStatus | null
  marriage_date?: string | null
  status?: MemberStatus
}

export type MemberResponse = { member: MemberWithFamily }

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
