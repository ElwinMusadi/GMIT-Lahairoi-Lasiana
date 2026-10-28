import { CONTACT_FIELDS, SACRAMENT_FORMS, type FormField } from '@shared/sacraments'
import type {
  PublicSacramentStatus,
  SacramentApplyResponse,
  SacramentStatus,
  SacramentType,
} from '@shared/types'
import { api } from '@/lib/api'
import { formatLongDate } from '@/lib/finance'
import { postForm } from '@/lib/upload'

// Bagian bersama halaman Layanan Sakramen di Portal Publik (rancangan
// design/stitch/05): tab layanan, susunan formulir, langkah lacak status.

export const SERVICE_ORDER: SacramentType[] = ['BAPTISM', 'SIDI', 'MARRIAGE']

// Nama di tab dan URL (?layanan=…), mengikuti istilah PRD.
export const SERVICES: Record<
  SacramentType,
  { tab: string; slug: string; intro: string; subject: string }
> = {
  BAPTISM: {
    tab: 'Baptisan Kudus',
    slug: 'baptis',
    intro:
      'Pendaftaran baptisan anak. Formulir diisi orang tua atau wali; Majelis menghubungi Anda untuk penggembalaan orang tua dan menetapkan tanggal pelaksanaan.',
    subject: 'Data calon baptis',
  },
  SIDI: {
    tab: 'Katekisasi/Sidi',
    slug: 'sidi',
    intro:
      'Pendaftaran katekisasi dan peneguhan sidi bagi yang sudah dibaptis. Majelis menghubungi Anda untuk jadwal katekisasi atau penggembalaan dan tanggal peneguhan.',
    subject: 'Data calon sidi',
  },
  MARRIAGE: {
    tab: 'Pemberkatan Nikah',
    slug: 'nikah',
    intro:
      'Pendaftaran pemberkatan nikah. Pendeta menghubungi kedua mempelai untuk penggembalaan pranikah sebelum tanggal pemberkatan ditetapkan.',
    subject: 'Data mempelai',
  },
}

// Isian tambahan di luar konfigurasi bersama: nomor HP (kolom phone) dan rayon.
const EXTRA_FIELDS: FormField[] = [
  { key: 'phone', label: 'Nomor HP/WhatsApp', kind: 'text', required: true, max: 20 },
  { key: 'rayon_id', label: 'Rayon', kind: 'text', required: false },
]

export type FieldView = FormField & {
  // Lebar penuh di kisi dua kolom.
  wide?: boolean
  hint?: string
  placeholder?: string
  input?: 'tel' | 'rayon' | 'textarea'
}

const FIELD_HINTS: Record<string, Partial<FieldView>> = {
  full_name: { wide: true, placeholder: 'Sesuai akta kelahiran' },
  groom_name: { wide: true },
  bride_name: { wide: true },
  groom_church: { wide: true, placeholder: 'mis. GMIT Lahairoi Tuak Sabu' },
  bride_church: { wide: true, placeholder: 'mis. GMIT Lahairoi Tuak Sabu' },
  baptism_church: { wide: true, placeholder: 'mis. GMIT Lahairoi Tuak Sabu' },
  contact_name: { hint: 'Orang tua, wali, atau calon sendiri.' },
  phone: {
    input: 'tel',
    placeholder: '0812 3456 7890',
    hint: 'Nomor WhatsApp aktif untuk dihubungi Majelis.',
  },
  address: { wide: true, placeholder: 'Jalan, RT/RW, kelurahan' },
  rayon_id: { input: 'rayon', hint: 'Kosongkan bila bukan warga Jemaat Lahairoi.' },
  church_member_number: { hint: 'Bila ada; membantu Majelis mencocokkan data jemaat.' },
  planned_date: { hint: 'Perkiraan; tanggal pasti ditetapkan setelah penggembalaan.' },
  applicant_notes: {
    wide: true,
    input: 'textarea',
    hint: 'Mis. permintaan jadwal ibadah tertentu.',
  },
}

const fieldMap = new Map<string, FormField>(
  [
    ...Object.values(SACRAMENT_FORMS).flatMap((form) => form.fields),
    ...CONTACT_FIELDS,
    ...EXTRA_FIELDS,
  ].map((field) => [field.key, field]),
)

function view(key: string, type: SacramentType): FieldView {
  const field = SACRAMENT_FORMS[type].fields.find((item) => item.key === key) ?? fieldMap.get(key)
  if (!field) throw new Error(`Isian ${key} tidak dikenal`)
  return { ...field, ...FIELD_HINTS[key] }
}

const CONTACT_KEYS = ['contact_name', 'phone', 'address', 'rayon_id', 'church_member_number']

// Bagian formulir per layanan (A, B, …); dokumen dan catatan selalu di bagian terakhir.
export function formSections(type: SacramentType): { title: string; fields: FieldView[] }[] {
  const keys = (list: string[]) => list.map((key) => view(key, type))
  if (type === 'MARRIAGE') {
    return [
      {
        title: 'Mempelai pria',
        fields: keys(['groom_name', 'groom_birth_place', 'groom_birth_date', 'groom_church']),
      },
      {
        title: 'Mempelai wanita',
        fields: keys(['bride_name', 'bride_birth_place', 'bride_birth_date', 'bride_church']),
      },
      { title: 'Kontak & rencana', fields: keys([...CONTACT_KEYS, 'planned_date']) },
    ]
  }
  // Urutan kisi dua kolom tanpa lubang di tengah; isian lebar di akhir.
  const subject =
    type === 'SIDI'
      ? ['full_name', 'gender', 'birth_place', 'birth_date', 'baptism_date', 'baptism_church']
      : ['full_name', 'gender', 'birth_place', 'birth_date']
  return [
    { title: SERVICES[type].subject, fields: keys(subject) },
    {
      title: 'Orang tua & kontak',
      fields: keys(['father_name', 'mother_name', ...CONTACT_KEYS]),
    },
  ]
}

export const NOTES_FIELD = (type: SacramentType) => view('applicant_notes', type)

export function submitApplication(form: FormData, onProgress: (percent: number) => void) {
  return postForm<SacramentApplyResponse>('/public/sacraments/apply', form, {
    onProgress,
    auth: false,
  })
}

export function trackApplication(code: string, signal?: AbortSignal) {
  return api.get<PublicSacramentStatus>(`/public/sacraments/track/${encodeURIComponent(code)}`, {
    auth: false,
    signal,
  })
}

// Langkah lacak status (rancangan 05): diterima → verifikasi → penggembalaan →
// disetujui & dijadwalkan → dilaksanakan.
export const TRACK_STEPS = [
  'Pendaftaran diterima',
  'Verifikasi berkas',
  'Penggembalaan',
  'Disetujui & dijadwalkan',
  'Sakramen dilaksanakan',
] as const

// Langkah yang sedang berjalan; Selesai berarti semua langkah tuntas.
export const STATUS_STEP: Record<SacramentStatus, number> = {
  PENDING: 1,
  REVISION: 1,
  COUNSELING: 2,
  APPROVED: 3,
  COMPLETED: 5,
}

// "Minggu, 1 November 2026 · 07.00 WITA"
export function scheduleText(date: string | null, time: string | null) {
  if (!date) return null
  return `${formatLongDate(date, true)}${time ? ` · ${time.replace(':', '.')} WITA` : ''}`
}

// Kode yang pernah dikirim dari perangkat ini, agar mudah dicek lagi. Hanya di
// peramban ini; boleh hilang (mode samaran, data situs dihapus).
const STORAGE_KEY = 'gmit-lahairoi:kode-sakramen'

export type SavedCode = { code: string; type: SacramentType; saved_at: string }

export function savedCodes(): SavedCode[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as SavedCode[]).slice(0, 5) : []
  } catch {
    return []
  }
}

export function rememberCode(entry: SavedCode) {
  try {
    const next = [entry, ...savedCodes().filter((item) => item.code !== entry.code)].slice(0, 5)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Penyimpanan peramban tidak tersedia; kode tetap tampil di layar.
  }
}
