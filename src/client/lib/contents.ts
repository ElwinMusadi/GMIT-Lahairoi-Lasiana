import type { UploadFolder } from '@shared/uploads'
import type { ContentCategory, ContentStatus, UserRole } from '@shared/types'
import type { UploadKind } from '@/components/upload-field'
import { ApiError, errorMessage } from '@/lib/api'

// Tampilan CMS konten Portal Publik: sebutan per kategori, field yang dipakai, dan
// konversi waktu terbit (WITA) untuk form.

export type CategoryConfig = {
  tab: string
  // Untuk kalimat, mis. "Tambah berita", "Warta tersimpan".
  noun: string
  addLabel: string
  // Ringkasan: label dan petunjuknya (Info Persembahan memakainya untuk nomor rekening).
  summaryLabel: string
  summaryHint?: string
  // Isi artikel: wajib saat terbit, opsional, atau tidak dipakai.
  body: 'required' | 'optional' | 'hidden'
  bodyLabel: string
  thumbnail: { label: string; folder: UploadFolder } | null
  // Lampiran: berkas yang diunggah, atau tautan https (video Media).
  attachment:
    | { type: 'file'; label: string; folder: UploadFolder; kind: UploadKind; required?: boolean }
    | { type: 'link'; label: string }
    | null
  empty: string
}

export const CATEGORY_CONFIG: Record<ContentCategory, CategoryConfig> = {
  WARTA: {
    tab: 'Warta',
    noun: 'warta',
    addLabel: 'Unggah warta',
    summaryLabel: 'Ringkasan pengumuman',
    summaryHint: 'Tampil di kartu warta portal, mis. pokok pengumuman minggu ini.',
    body: 'optional',
    bodyLabel: 'Pengumuman singkat',
    thumbnail: null,
    attachment: {
      type: 'file',
      label: 'Berkas PDF Warta Jemaat',
      folder: 'warta',
      kind: 'pdf',
      required: true,
    },
    empty: 'Belum ada Warta Jemaat.',
  },
  DEVOTIONAL: {
    tab: 'Renungan',
    noun: 'renungan',
    addLabel: 'Tulis renungan',
    summaryLabel: 'Ayat bacaan',
    summaryHint: 'Mis. Yohanes 8:12. Tampil di bawah judul dan di kartu Beranda.',
    body: 'required',
    bodyLabel: 'Isi renungan',
    thumbnail: { label: 'Gambar sampul', folder: 'konten' },
    attachment: null,
    empty: 'Belum ada renungan.',
  },
  NEWS: {
    tab: 'Berita',
    noun: 'berita',
    addLabel: 'Tambah berita',
    summaryLabel: 'Ringkasan',
    summaryHint: 'Satu-dua kalimat untuk kartu berita. Kosong: diambil dari awal isi.',
    body: 'required',
    bodyLabel: 'Isi berita atau pengumuman',
    thumbnail: { label: 'Foto berita', folder: 'konten' },
    attachment: { type: 'file', label: 'Lampiran (opsional)', folder: 'konten', kind: 'any' },
    empty: 'Belum ada berita atau pengumuman.',
  },
  MEDIA: {
    tab: 'Galeri',
    noun: 'media',
    addLabel: 'Tambah media',
    summaryLabel: 'Keterangan foto',
    body: 'optional',
    bodyLabel: 'Cerita kegiatan',
    thumbnail: { label: 'Foto dokumentasi', folder: 'media' },
    attachment: { type: 'link', label: 'Tautan video (opsional)' },
    empty: 'Belum ada foto atau video dokumentasi.',
  },
  PROFILE: {
    tab: 'Profil',
    noun: 'profil',
    addLabel: 'Tambah halaman profil',
    summaryLabel: 'Ringkasan',
    body: 'required',
    bodyLabel: 'Isi',
    thumbnail: { label: 'Foto', folder: 'konten' },
    attachment: { type: 'file', label: 'Lampiran (opsional)', folder: 'konten', kind: 'any' },
    empty: 'Belum ada halaman profil (sejarah, visi misi, struktur majelis).',
  },
  PAYMENT_INFO: {
    tab: 'Rekening & QRIS',
    noun: 'rekening',
    addLabel: 'Tambah rekening',
    summaryLabel: 'Nomor rekening',
    summaryHint: 'Disalin pengunjung dengan tombol salin di halaman Persembahan.',
    body: 'optional',
    bodyLabel: 'Atas nama dan catatan',
    thumbnail: { label: 'Gambar QRIS', folder: 'konten' },
    attachment: null,
    empty: 'Belum ada rekening atau QRIS persembahan.',
  },
}

// Urutan tab di CMS.
export const CATEGORY_ORDER: ContentCategory[] = [
  'WARTA',
  'DEVOTIONAL',
  'NEWS',
  'MEDIA',
  'PROFILE',
  'PAYMENT_INFO',
]

export const STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: 'Draf',
  SCHEDULED: 'Terjadwal',
  PUBLISHED: 'Terbit',
}

export const STATUS_PILL: Record<ContentStatus, string> = {
  DRAFT: 'bg-secondary text-secondary-foreground',
  SCHEDULED: 'bg-warning-soft text-warning-ink',
  PUBLISHED: 'bg-positive-soft text-positive-ink',
}

// Admin mengelola semua kategori di /dashboard/contents; Pendeta menulis renungannya di
// /dashboard/renungan.
export function contentsBase(role: UserRole) {
  return role === 'PASTOR' ? '/dashboard/renungan' : '/dashboard/contents'
}

const witaParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Makassar',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// ISO UTC → nilai input tanggal dan jam (WITA).
export function toWitaInputs(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: '', time: '' }
  const parts = Object.fromEntries(
    witaParts.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  )
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  }
}

// Input tanggal dan jam (WITA) → waktu terbit untuk API; kosong berarti "saat disimpan".
export function fromWitaInputs(date: string, time: string): string | null {
  if (!date) return null
  return `${date}T${time || '00:00'}:00+08:00`
}

// Minggu terdekat mulai hari ini (YYYY-MM-DD), untuk judul warta baru.
export function nextSunday(today: string): string {
  const day = new Date(Date.parse(today)).getUTCDay()
  return new Date(Date.parse(today) + ((7 - day) % 7) * 86_400_000).toISOString().slice(0, 10)
}

// Judul Info Persembahan = "Bank · Keperluan", mis. "Bank NTT · Kas Pembangunan".
const PAYMENT_SEPARATOR = ' · '

export function joinPaymentTitle(bank: string, purpose: string) {
  return [bank.trim(), purpose.trim()].filter(Boolean).join(PAYMENT_SEPARATOR)
}

export function splitPaymentTitle(title: string): { bank: string; purpose: string } {
  const index = title.indexOf(PAYMENT_SEPARATOR)
  return index === -1
    ? { bank: title, purpose: '' }
    : { bank: title.slice(0, index), purpose: title.slice(index + PAYMENT_SEPARATOR.length) }
}

// Pesan kesalahan API beserta rinciannya (mis. "Warta yang diterbitkan wajib
// melampirkan PDF"), untuk notifikasi.
export function apiFailure(err: unknown) {
  const detail =
    err instanceof ApiError
      ? Object.values(err.details ?? {})
          .flat()
          .join(' ')
      : undefined
  return { message: errorMessage(err), description: detail || undefined }
}
