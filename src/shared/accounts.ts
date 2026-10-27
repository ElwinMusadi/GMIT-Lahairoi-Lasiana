import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, USER_ROLES, type UserRole } from './types'

// Aturan data akun pengurus, dipakai bersama oleh form di dashboard (src/client) dan
// API /api/users (src/worker), sehingga pesan kesalahannya selalu sama di keduanya.

export type FieldErrors = Record<string, string[]>

// Data akun yang bisa diatur Admin.
export type AccountFields = {
  name: string
  email: string | null
  username: string | null
  role: UserRole
  rayon_id: number | null
}

export type AccountInput = Partial<AccountFields> & {
  is_active?: boolean
  password?: string
  reset_password?: true
}

export const NAME_MAX_LENGTH = 100
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// 3–32 karakter tanpa "@", sehingga username tidak pernah tertukar dengan email saat login.
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/

// Membaca dan menormalkan body POST/PATCH: nama dirapikan, email dan username huruf
// kecil, '' berarti dikosongkan. Field yang tidak dikirim tidak diubah (mode update).
export function parseAccountInput(body: Record<string, unknown>, mode: 'create' | 'update') {
  const input: AccountInput = {}
  const details: FieldErrors = {}
  const has = (key: string) => body[key] !== undefined

  if (mode === 'create' || has('name')) {
    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
    if (!name) details.name = ['Nama wajib diisi.']
    else if (name.length > NAME_MAX_LENGTH)
      details.name = [`Nama maksimal ${NAME_MAX_LENGTH} karakter.`]
    else input.name = name
  }

  if (has('email')) {
    const email = optionalText(body.email)
    if (
      email === undefined ||
      (email !== null && (email.length > 254 || !EMAIL_PATTERN.test(email)))
    ) {
      details.email = ['Format email tidak valid.']
    } else input.email = email
  }

  if (has('username')) {
    const username = optionalText(body.username)
    if (username === undefined || (username !== null && !USERNAME_PATTERN.test(username))) {
      details.username = [
        'Username 3–32 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.',
      ]
    } else input.username = username
  }

  if (mode === 'create' || has('role')) {
    if (USER_ROLES.includes(body.role as UserRole)) input.role = body.role as UserRole
    else details.role = ['Pilih peran: Admin, Bendahara, Pendeta, atau Majelis.']
  }

  if (has('rayon_id')) {
    const rayonId = body.rayon_id
    if (rayonId === null) input.rayon_id = null
    else if (typeof rayonId === 'number' && Number.isInteger(rayonId) && rayonId > 0) {
      input.rayon_id = rayonId
    } else details.rayon_id = ['Rayon tidak valid.']
  }

  if (mode === 'update' && has('is_active')) {
    if (typeof body.is_active === 'boolean') input.is_active = body.is_active
    else details.is_active = ['Status aktif harus true atau false.']
  }

  // Kata sandi kosong dianggap tidak diisi: saat membuat akun, server membuatkan
  // kata sandi sementara.
  if (has('password') && body.password !== '' && body.password !== null) {
    const password = body.password
    if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
      details.password = [`Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter.`]
    } else if (password.length > PASSWORD_MAX_LENGTH) {
      details.password = [`Kata sandi maksimal ${PASSWORD_MAX_LENGTH} karakter.`]
    } else input.password = password
  }

  if (mode === 'update' && has('reset_password')) {
    if (body.reset_password !== true) {
      details.reset_password = [
        'Isi reset_password dengan true untuk membuat kata sandi sementara.',
      ]
    } else if (input.password !== undefined || details.password) {
      details.password = ['Pilih salah satu: isi kata sandi baru, atau buat kata sandi sementara.']
    } else input.reset_password = true
  }

  return { input, details }
}

// Aturan yang melibatkan beberapa field, diperiksa pada data akhir (setelah PATCH
// digabung dengan data tersimpan).
export function validateAccount(next: AccountFields, details: FieldErrors) {
  if (!next.email && !next.username && !details.email && !details.username) {
    const message = 'Isi email atau username (minimal salah satu) untuk login.'
    details.email = [message]
    details.username = [message]
  }
  // Rayon hanya berlaku untuk Majelis; untuk peran lain selalu dikosongkan.
  if (next.role !== 'ELDER') next.rayon_id = null
  else if (next.rayon_id === null && !details.rayon_id && !details.role) {
    details.rayon_id = ['Majelis wajib ditempatkan di salah satu rayon.']
  }
}

// '' dan null berarti dikosongkan; selain string dianggap tidak valid (undefined).
function optionalText(value: unknown): string | null | undefined {
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  const text = value.trim().toLowerCase()
  return text === '' ? null : text
}
