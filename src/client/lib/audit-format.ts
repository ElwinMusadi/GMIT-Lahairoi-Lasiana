import { History, LogIn, LogOut, ShieldAlert, type LucideIcon } from 'lucide-react'
import { formatRupiah } from '@shared/finance'
import {
  ASSET_CONDITION_LABELS,
  BUDGET_TYPE_LABELS,
  CATEGORICAL_GROUP_LABELS,
  CONTENT_CATEGORY_LABELS,
  FAMILY_RELATION_LABELS,
  GENDER_LABELS,
  LOAN_STATUS_LABELS,
  MAIL_CATEGORY_LABELS,
  MAIL_DIRECTION_LABELS,
  MARRIAGE_STATUS_LABELS,
  MEMBER_STATUS_LABELS,
  PORTAL_THEME_LABELS,
  ROLE_LABELS,
  SACRAMENT_STATUS_LABELS,
  SACRAMENT_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  WORSHIP_CATEGORY_LABELS,
  type AuditLogItem,
} from '@shared/types'
import { formatDate, formatTime } from './format'
import { allModules } from './navigation'

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
  site_settings: 'pengaturan',
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
  code: 'Kode',
  fund: 'Pos Kas',
  fiscal_year: 'Tahun anggaran',
  account_code: 'Kode mata anggaran',
  account_name: 'Nama mata anggaran',
  type: 'Jenis',
  target_amount: 'Target',
  budget: 'Mata anggaran',
  transaction_date: 'Tanggal',
  amount: 'Nominal',
  receipt_url: 'Bukti kuitansi',
  category: 'Kategori',
  title: 'Judul',
  slug: 'Alamat',
  summary: 'Ringkasan',
  content_body: 'Isi',
  attachment_url: 'Lampiran',
  thumbnail_url: 'Gambar',
  published_at: 'Waktu terbit',
  is_published: 'Status terbit',
  worship_date: 'Tanggal',
  worship_time: 'Jam',
  location: 'Lokasi',
  theme: 'Tema',
  bible_reading: 'Bacaan',
  liturgy_file_url: 'Tata ibadah',
  is_public: 'Papan jadwal',
  attendance_men: 'Hadir pria',
  attendance_women: 'Hadir wanita',
  attendance_youth_children: 'Hadir anak/pemuda',
  servants: 'Petugas',
  applicant_name: 'Nama',
  registration_code: 'Kode',
  documents: 'Dokumen',
  notes: 'Catatan',
  counseling_date: 'Konseling',
  counseling_time: 'Jam konseling',
  scheduled_date: 'Pelaksanaan',
  scheduled_time: 'Jam pelaksanaan',
  officiating_pastor: 'Pendeta',
  certificate_number: 'Nomor register',
  member: 'Anggota',
  partner: 'Mempelai wanita',
  direction: 'Arah',
  reference_number: 'Nomor surat',
  mail_date: 'Tanggal surat',
  sender_or_recipient: 'Pengirim/penerima',
  subject: 'Perihal',
  asset_code: 'Kode inventaris',
  quantity: 'Jumlah unit',
  acquisition_source: 'Sumber perolehan',
  acquisition_year: 'Tahun perolehan',
  estimated_value: 'Estimasi nilai',
  condition: 'Kondisi',
  asset: 'Barang',
  borrower_name: 'Peminjam',
  quantity_borrowed: 'Jumlah dipinjam',
  borrow_date: 'Tanggal pinjam',
  due_date: 'Batas kembali',
  return_date: 'Tanggal kembali',
  return_condition: 'Kondisi kembali',
  portal_theme: 'Tema portal',
}

// Field yang sudah tersebut lewat label entitas di kalimat ringkasan.
const LABEL_FIELDS = new Set([
  'name',
  'full_name',
  'kk_number',
  'family_head_name',
  'code',
  'account_code',
  'account_name',
  'fiscal_year',
  'amount',
  'title',
  'category',
  'worship_date',
  'applicant_name',
  'registration_code',
  'reference_number',
  'subject',
  'asset_code',
  'borrower_name',
  'quantity_borrowed',
  'asset',
])

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
  finance_budgets: { type: BUDGET_TYPE_LABELS },
  finance_transactions: { type: TRANSACTION_TYPE_LABELS },
  public_contents: { category: CONTENT_CATEGORY_LABELS },
  worship_schedules: { category: WORSHIP_CATEGORY_LABELS },
  sacrament_applications: { status: SACRAMENT_STATUS_LABELS, type: SACRAMENT_TYPE_LABELS },
  mail_archives: { direction: MAIL_DIRECTION_LABELS, category: MAIL_CATEGORY_LABELS },
  assets: { condition: ASSET_CONDITION_LABELS },
  asset_loans: { status: LOAN_STATUS_LABELS, return_condition: ASSET_CONDITION_LABELS },
  site_settings: { portal_theme: PORTAL_THEME_LABELS },
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
        // Nama, kode, nominal, dan tanggal ibadah sudah ada di kalimat; data baru selalu
        // aktif, dan jadwal baru tidak tampil di portal kecuali disebut.
        .filter(
          ([field, value]) =>
            !LABEL_FIELDS.has(field) &&
            !(field === 'is_active' && value === true) &&
            !(field === 'is_public' && value === false) &&
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
  if (
    (field === 'amount' || field === 'target_amount' || field === 'estimated_value') &&
    typeof value === 'number'
  ) {
    return formatRupiah(value)
  }
  if (
    field === 'receipt_url' ||
    field === 'attachment_url' ||
    field === 'thumbnail_url' ||
    field === 'liturgy_file_url' ||
    field === 'file_url'
  ) {
    return 'terlampir'
  }
  if (field === 'is_published') return value ? 'Terbit' : 'Draf'
  if (field === 'is_public') return value ? 'Publik' : 'Internal'
  if (field === 'published_at' && typeof value === 'string') {
    // Kolom D1 berformat UTC 'YYYY-MM-DD HH:MM:SS'.
    const iso = `${value.replace(' ', 'T')}Z`
    return `${formatDate(iso)} ${formatTime(iso)}`
  }
  if (field.endsWith('_date') && typeof value === 'string') return formatDate(value)
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  return String(value)
}

// Tabel audit → modul dashboard, untuk ikon tiap aktivitas (ikon yang sama dengan sidebar), di
// Log Aktivitas dan linimasa Aktivitas terbaru di Ringkasan.
const ENTITY_MODULE: Record<string, string> = {
  users: 'users',
  rayons: 'rayons',
  families: 'families',
  members: 'members',
  finance_funds: 'finance/budgets',
  finance_budgets: 'finance/budgets',
  finance_transactions: 'finance/transactions',
  public_contents: 'contents',
  worship_schedules: 'worships',
  worship_servants: 'worships',
  sacrament_applications: 'sacraments',
  mail_archives: 'mails',
  assets: 'assets',
  asset_loans: 'assets',
  site_settings: 'settings/appearance',
}

export function auditIcon(item: AuditLogItem): LucideIcon {
  if (item.action === 'LOGIN') return LogIn
  if (item.action === 'LOGOUT') return LogOut
  if (item.action.startsWith('LOGIN_')) return ShieldAlert
  const path = ENTITY_MODULE[item.entity_type]
  return allModules.find((module) => module.path === path)?.icon ?? History
}
