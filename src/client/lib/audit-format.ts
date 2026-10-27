import { ROLE_LABELS, type AuditLogItem, type UserRole } from '@shared/types'

// Menerjemahkan baris audit_logs menjadi kalimat untuk Log Aktivitas, mis.
// "Menonaktifkan akun Yohanis Dimu" dengan rincian "Peran: Majelis → Pendeta".

// Nama tabel → sebutan di kalimat. Urutan ini juga urutan pilihan filter entitas.
export const ENTITY_LABELS: Record<string, string> = {
  users: 'akun pengurus',
  rayons: 'rayon',
  families: 'Kartu Keluarga',
  members: 'data jemaat',
  finance_funds: 'Pos Kas',
  finance_budgets: 'mata anggaran',
  finance_transactions: 'transaksi kas',
  public_contents: 'konten portal',
  worship_schedules: 'jadwal ibadah',
  worship_servants: 'jadwal pelayan',
  sacrament_applications: 'pendaftaran sakramen',
  mail_archives: 'arsip surat',
  assets: 'aset',
  asset_loans: 'peminjaman aset',
}

export const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Menambah',
  UPDATE: 'Mengubah',
  DELETE: 'Menghapus',
  IMPORT: 'Mengimpor',
  LOGIN: 'Masuk',
  LOGOUT: 'Keluar',
  LOGIN_FAILED: 'Gagal masuk',
  LOGIN_REJECTED_INACTIVE: 'Masuk ditolak (akun nonaktif)',
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nama',
  email: 'Email',
  username: 'Username',
  role: 'Peran',
  rayon: 'Rayon',
  is_active: 'Status',
  password_hash: 'Kata sandi',
}

export type AuditDescription = {
  summary: string
  // Baris kedua: kolom yang berubah, data yang dibuat, atau alamat IP.
  detail: string | null
  // Penanda status untuk percobaan masuk yang gagal atau ditolak.
  flag: string | null
}

export function describeAudit(item: AuditLogItem): AuditDescription {
  const details = item.details ?? {}
  const label = details.label ?? (item.entity_id !== null ? `#${item.entity_id}` : '')
  const entity = ENTITY_LABELS[item.entity_type] ?? item.entity_type
  const ip = typeof details.ip === 'string' ? `IP ${details.ip}` : null

  switch (item.action) {
    case 'LOGIN':
      return { summary: 'Masuk ke dashboard', detail: ip, flag: null }
    case 'LOGOUT':
      return { summary: 'Keluar dari dashboard', detail: ip, flag: null }
    case 'LOGIN_FAILED':
      return {
        summary: `Percobaan masuk sebagai “${String(details.identifier ?? '')}”`,
        detail: ip,
        flag: 'Gagal',
      }
    case 'LOGIN_REJECTED_INACTIVE':
      return { summary: 'Percobaan masuk dengan akun nonaktif', detail: ip, flag: 'Ditolak' }
  }

  if (item.action === 'UPDATE' && details.changes) {
    const changes = details.changes
    const fields = Object.keys(changes)
    const only = fields.length === 1 ? fields[0] : null
    if (item.entity_type === 'users' && only === 'is_active') {
      const verb = changes.is_active.to ? 'Mengaktifkan kembali' : 'Menonaktifkan'
      return { summary: `${verb} akun ${label}`, detail: null, flag: null }
    }
    if (only === 'password_hash') {
      return { summary: `Mengatur ulang kata sandi ${label}`, detail: null, flag: null }
    }
    const detail = fields
      .map((field) =>
        field === 'password_hash'
          ? 'Kata sandi diatur ulang'
          : `${fieldLabel(field)}: ${formatValue(field, changes[field].from)} → ${formatValue(field, changes[field].to)}`,
      )
      .join(' · ')
    return { summary: `Mengubah ${entity} ${label}`, detail, flag: null }
  }

  const verb = ACTION_LABELS[item.action] ?? item.action
  const data = details.data
  const detail = data
    ? Object.entries(data)
        // Nama sudah ada di kalimat, dan akun baru selalu aktif.
        .filter(
          ([field, value]) =>
            field !== 'name' &&
            !(field === 'is_active' && value === true) &&
            value !== null &&
            value !== '',
        )
        .slice(0, 4)
        .map(([field, value]) => `${fieldLabel(field)} ${formatValue(field, value)}`)
        .join(' · ')
    : null
  return { summary: `${verb} ${entity} ${label}`.trim(), detail: detail || null, flag: null }
}

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replaceAll('_', ' ')
}

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (field === 'role' && typeof value === 'string' && value in ROLE_LABELS) {
    return ROLE_LABELS[value as UserRole]
  }
  if (field === 'is_active') return value ? 'Aktif' : 'Nonaktif'
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  return String(value)
}
