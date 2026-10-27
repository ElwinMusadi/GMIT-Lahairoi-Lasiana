import {
  CATEGORICAL_GROUP_LABELS,
  FAMILY_RELATION_LABELS,
  GENDER_LABELS,
  MARRIAGE_STATUS_LABELS,
  MEMBER_STATUS_LABELS,
  ROLE_LABELS,
  type AuditLogItem,
} from '@shared/types'
import { formatDate } from './format'

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
  EXPORT: 'Mengekspor',
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
  description: 'Keterangan',
  coordinator_name: 'Koordinator',
  family: 'KK',
  kk_number: 'Nomor KK',
  family_head_name: 'Kepala keluarga',
  address: 'Alamat',
  phone: 'Telepon',
  church_member_number: 'Nomor Induk',
  nik: 'NIK',
  full_name: 'Nama',
  gender: 'Jenis kelamin',
  birth_place: 'Tempat lahir',
  birth_date: 'Tanggal lahir',
  blood_type: 'Golongan darah',
  family_relation: 'Hubungan keluarga',
  education: 'Pendidikan',
  occupation: 'Pekerjaan',
  categorical_group: 'Kategorial',
  baptism_status: 'Baptis',
  baptism_date: 'Tanggal baptis',
  sidi_status: 'Sidi',
  sidi_date: 'Tanggal sidi',
  marriage_status: 'Status nikah',
  marriage_date: 'Tanggal nikah',
  status: 'Status',
}

// Field yang sudah tersebut lewat label entitas di kalimat ringkasan.
const LABEL_FIELDS = new Set(['name', 'full_name', 'kk_number', 'family_head_name'])

// Kode tersimpan → sebutannya, per jenis data.
const VALUE_LABELS: Record<string, Record<string, Record<string, string>>> = {
  users: { role: ROLE_LABELS },
  members: {
    gender: GENDER_LABELS,
    family_relation: FAMILY_RELATION_LABELS,
    categorical_group: CATEGORICAL_GROUP_LABELS,
    marriage_status: MARRIAGE_STATUS_LABELS,
    status: MEMBER_STATUS_LABELS,
  },
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

  if (item.action === 'IMPORT' || item.action === 'EXPORT') {
    const count = (key: string) => Number(details[key] ?? 0).toLocaleString('id-ID')
    return item.action === 'IMPORT'
      ? {
          summary: `Mengimpor ${entity} dari ${label}`,
          detail: `${count('members_created')} jemaat · ${count('families_created')} KK baru · ${Number(details.duplicates ?? 0) + Number(details.errors ?? 0)} baris dilewati`,
          flag: null,
        }
      : {
          summary: `Mengekspor ${entity} (${count('rows')} baris)`,
          detail: label,
          flag: null,
        }
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
          : `${fieldLabel(field)}: ${formatValue(item.entity_type, field, changes[field].from)} → ${formatValue(item.entity_type, field, changes[field].to)}`,
      )
      .join(' · ')
    return { summary: `Mengubah ${entity} ${label}`, detail, flag: null }
  }

  const verb = ACTION_LABELS[item.action] ?? item.action
  const data = details.data
  const detail = data
    ? Object.entries(data)
        // Nama (dan nomor KK) sudah ada di kalimat, dan akun baru selalu aktif.
        .filter(
          ([field, value]) =>
            !LABEL_FIELDS.has(field) &&
            !(field === 'is_active' && value === true) &&
            value !== null &&
            value !== '',
        )
        .slice(0, 4)
        .map(
          ([field, value]) => `${fieldLabel(field)} ${formatValue(item.entity_type, field, value)}`,
        )
        .join(' · ')
    : null
  return { summary: `${verb} ${entity} ${label}`.trim(), detail: detail || null, flag: null }
}

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replaceAll('_', ' ')
}

function formatValue(entity: string, field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  const labels = VALUE_LABELS[entity]?.[field]
  if (labels && typeof value === 'string' && Object.hasOwn(labels, value)) return labels[value]
  if (field === 'is_active') return value ? 'Aktif' : 'Nonaktif'
  if (field === 'baptism_status' || field === 'sidi_status') return value ? 'Sudah' : 'Belum'
  if (field.endsWith('_date') && typeof value === 'string') return formatDate(value)
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  return String(value)
}
