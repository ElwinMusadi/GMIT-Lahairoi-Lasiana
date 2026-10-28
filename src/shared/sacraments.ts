import type { FieldErrors } from './accounts'
import { isCalendarDate } from './dates'
import { createReader } from './form-reader'
import {
  GENDERS,
  GENDER_LABELS,
  SACRAMENT_STATUSES,
  SACRAMENT_STATUS_LABELS,
  SACRAMENT_TYPES,
  SACRAMENT_TYPE_LABELS,
  type SacramentStatus,
  type SacramentType,
} from './types'

// Aturan pendaftaran sakramen online (PRD: Baptisan, Sidi, Pemberkatan Nikah) dan
// verifikasi pastoralnya, dipakai bersama oleh API dan formulir portal/dashboard.

type Body = Record<string, unknown>

type FieldKind = 'text' | 'gender' | 'past-date' | 'future-date'

export type FormField = {
  key: string
  label: string
  kind: FieldKind
  required: boolean
  max?: number
}

export type DocumentKind = {
  kind: string
  label: string
  required: boolean
}

// Isian dan dokumen syarat per jenis layanan.
export const SACRAMENT_FORMS: Record<
  SacramentType,
  { fields: FormField[]; documents: DocumentKind[] }
> = {
  BAPTISM: {
    fields: [
      { key: 'full_name', label: 'Nama calon baptis', kind: 'text', required: true, max: 100 },
      { key: 'gender', label: 'Jenis kelamin', kind: 'gender', required: true },
      { key: 'birth_place', label: 'Tempat lahir', kind: 'text', required: true, max: 100 },
      { key: 'birth_date', label: 'Tanggal lahir', kind: 'past-date', required: true },
      { key: 'father_name', label: 'Nama ayah', kind: 'text', required: true, max: 100 },
      { key: 'mother_name', label: 'Nama ibu', kind: 'text', required: true, max: 100 },
    ],
    documents: [
      { kind: 'birth_certificate', label: 'Akta kelahiran', required: true },
      { kind: 'parents_marriage', label: 'Surat nikah gereja orang tua', required: false },
      { kind: 'family_card', label: 'Kartu Keluarga', required: false },
    ],
  },
  SIDI: {
    fields: [
      { key: 'full_name', label: 'Nama calon sidi', kind: 'text', required: true, max: 100 },
      { key: 'gender', label: 'Jenis kelamin', kind: 'gender', required: true },
      { key: 'birth_place', label: 'Tempat lahir', kind: 'text', required: true, max: 100 },
      { key: 'birth_date', label: 'Tanggal lahir', kind: 'past-date', required: true },
      {
        key: 'baptism_church',
        label: 'Gereja tempat dibaptis',
        kind: 'text',
        required: true,
        max: 150,
      },
      { key: 'baptism_date', label: 'Tanggal baptis', kind: 'past-date', required: false },
      { key: 'father_name', label: 'Nama ayah', kind: 'text', required: false, max: 100 },
      { key: 'mother_name', label: 'Nama ibu', kind: 'text', required: false, max: 100 },
    ],
    documents: [
      { kind: 'baptism_certificate', label: 'Surat baptis', required: true },
      { kind: 'photo', label: 'Pas foto', required: false },
      { kind: 'family_card', label: 'Kartu Keluarga', required: false },
    ],
  },
  MARRIAGE: {
    fields: [
      { key: 'groom_name', label: 'Nama mempelai pria', kind: 'text', required: true, max: 100 },
      {
        key: 'groom_birth_place',
        label: 'Tempat lahir mempelai pria',
        kind: 'text',
        required: true,
        max: 100,
      },
      {
        key: 'groom_birth_date',
        label: 'Tanggal lahir mempelai pria',
        kind: 'past-date',
        required: true,
      },
      {
        key: 'groom_church',
        label: 'Jemaat asal mempelai pria',
        kind: 'text',
        required: true,
        max: 150,
      },
      { key: 'bride_name', label: 'Nama mempelai wanita', kind: 'text', required: true, max: 100 },
      {
        key: 'bride_birth_place',
        label: 'Tempat lahir mempelai wanita',
        kind: 'text',
        required: true,
        max: 100,
      },
      {
        key: 'bride_birth_date',
        label: 'Tanggal lahir mempelai wanita',
        kind: 'past-date',
        required: true,
      },
      {
        key: 'bride_church',
        label: 'Jemaat asal mempelai wanita',
        kind: 'text',
        required: true,
        max: 150,
      },
      {
        key: 'planned_date',
        label: 'Rencana tanggal pemberkatan',
        kind: 'future-date',
        required: false,
      },
    ],
    documents: [
      {
        kind: 'groom_certificates',
        label: 'Surat baptis dan sidi mempelai pria',
        required: true,
      },
      {
        kind: 'bride_certificates',
        label: 'Surat baptis dan sidi mempelai wanita',
        required: true,
      },
      { kind: 'id_cards', label: 'KTP kedua mempelai', required: false },
      { kind: 'photo', label: 'Foto berdua', required: false },
    ],
  },
}

// Isian kontak yang sama untuk semua layanan. Nomor HP disimpan di kolom phone, rayon
// sebagai rayon_id (dicek API).
export const CONTACT_FIELDS: FormField[] = [
  { key: 'contact_name', label: 'Nama pendaftar', kind: 'text', required: true, max: 100 },
  { key: 'address', label: 'Alamat', kind: 'text', required: true, max: 300 },
  {
    key: 'church_member_number',
    label: 'Nomor Induk Gereja',
    kind: 'text',
    required: false,
    max: 30,
  },
  { key: 'applicant_notes', label: 'Catatan', kind: 'text', required: false, max: 500 },
]

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const PHONE_PATTERN = /^\+?\d{8,15}$/

export type ApplicationInput = {
  type: SacramentType
  // Calon baptis/sidi, atau "mempelai pria & mempelai wanita".
  applicant_name: string
  phone: string
  form_data: Record<string, string | number>
}

// Isian formulir portal (teks dari multipart/form-data). Dokumen diperiksa API.
export function parseApplicationInput(body: Body, today: string) {
  const details: FieldErrors = {}
  const rawType = typeof body.type === 'string' ? body.type.trim().toUpperCase() : ''
  if (!(SACRAMENT_TYPES as string[]).includes(rawType)) {
    details.type = [
      `Pilih layanan: ${SACRAMENT_TYPES.map((type) => SACRAMENT_TYPE_LABELS[type]).join(', ')}.`,
    ]
    return { type: null, input: null, details }
  }
  const type = rawType as SacramentType
  const read = createReader(body, 'create')

  for (const field of [...SACRAMENT_FORMS[type].fields, ...CONTACT_FIELDS]) {
    if (field.kind === 'text') {
      read.text(field.key, field.label, {
        max: field.max ?? 100,
        required: field.required,
        multiline: field.key === 'applicant_notes',
      })
    } else if (field.kind === 'gender') {
      read.choice(field.key, 'jenis kelamin', GENDERS, GENDER_LABELS, { required: field.required })
    } else if (field.kind === 'past-date') {
      read.date(field.key, field.label, today, { required: field.required })
    } else {
      readDate(read, field.key, field.label, field.required)
      const value = read.input[field.key]
      if (typeof value === 'string' && value < today) {
        read.details[field.key] = [`${field.label} tidak boleh sebelum hari ini.`]
        delete read.input[field.key]
      }
    }
  }
  read.text('phone', 'Nomor HP/WhatsApp', {
    max: 20,
    required: true,
    normalize: (value) => value.replace(/[\s.()-]/g, ''),
    pattern: [PHONE_PATTERN, 'Nomor HP berisi 8–15 angka, mis. 081234567890.'],
  })
  const rayon = typeof body.rayon_id === 'string' ? body.rayon_id.trim() : body.rayon_id
  if (rayon !== undefined && rayon !== null && rayon !== '') {
    if (typeof rayon === 'string' && /^\d{1,9}$/.test(rayon) && Number(rayon) > 0) {
      read.input.rayon_id = Number(rayon)
    } else read.details.rayon_id = ['Rayon tidak valid.']
  }

  Object.assign(details, read.details)
  if (Object.keys(details).length > 0) return { type, input: null, details }

  const { phone, ...rest } = read.input
  const form_data = Object.fromEntries(
    Object.entries(rest).filter(([, value]) => value !== null && value !== undefined),
  ) as Record<string, string | number>
  const applicant_name =
    type === 'MARRIAGE'
      ? `${form_data.groom_name} & ${form_data.bride_name}`
      : String(form_data.full_name)
  const input: ApplicationInput = { type, applicant_name, phone: String(phone), form_data }
  return { type, input, details }
}

// Dokumen wajib yang belum dilampirkan, dan berkas yang tidak diminta layanan ini.
export function documentProblems(type: SacramentType, kinds: string[]): FieldErrors {
  const details: FieldErrors = {}
  const config = SACRAMENT_FORMS[type].documents
  for (const kind of kinds) {
    if (!config.some((document) => document.kind === kind)) {
      details[kind] = ['Dokumen ini tidak diminta untuk layanan yang dipilih.']
    }
  }
  for (const document of config) {
    if (document.required && !kinds.includes(document.kind)) {
      details[document.kind] = [`Lampirkan ${document.label.toLowerCase()}.`]
    }
  }
  return details
}

export type StatusFields = {
  status: SacramentStatus
  notes: string | null
  counseling_date: string | null
  counseling_time: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  officiating_pastor: string | null
  certificate_number: string | null
  member_id: number | null
  partner_member_id: number | null
}

// Body PATCH /api/sacraments/:id/status. status wajib; field lain yang tidak dikirim
// tidak diubah, null mengosongkan.
export function parseStatusInput(body: Body) {
  const read = createReader(body, 'update')
  if (!read.has('status')) read.details.status = ['Pilih status baru.']
  else read.choice('status', 'status', SACRAMENT_STATUSES, SACRAMENT_STATUS_LABELS)
  read.text('notes', 'Catatan verifikasi', { max: 1000, multiline: true })
  readDate(read, 'counseling_date', 'Tanggal konseling', false)
  readTime(read, 'counseling_time', 'Jam konseling')
  readDate(read, 'scheduled_date', 'Tanggal pelaksanaan', false)
  readTime(read, 'scheduled_time', 'Jam pelaksanaan')
  read.text('officiating_pastor', 'Pendeta yang melayani', { max: 100 })
  read.text('certificate_number', 'Nomor register', {
    max: 40,
    pattern: [
      /^[A-Za-z0-9][A-Za-z0-9./ -]*$/,
      'Nomor register berisi huruf, angka, titik, garis miring, atau tanda hubung.',
    ],
  })
  read.id('member_id', 'anggota jemaat', { required: false })
  read.id('partner_member_id', 'mempelai wanita', { required: false })
  return { input: read.input as Partial<StatusFields>, details: read.details }
}

// Syarat tiap status, diperiksa setelah data lama dan perubahan digabung.
export function statusProblems(
  type: SacramentType,
  next: StatusFields,
  today: string,
): FieldErrors {
  const details: FieldErrors = {}
  if (next.status === 'REVISION' && !next.notes) {
    details.notes = ['Tulis berkas atau data apa yang perlu diperbaiki pendaftar.']
  }
  if (next.status === 'COUNSELING' && !next.counseling_date) {
    details.counseling_date = ['Isi tanggal konseling/penggembalaan.']
  }
  if ((next.status === 'APPROVED' || next.status === 'COMPLETED') && !next.scheduled_date) {
    details.scheduled_date = ['Isi tanggal pelaksanaan.']
  }
  if (next.status === 'COMPLETED') {
    if (next.scheduled_date && next.scheduled_date > today) {
      details.scheduled_date = ['Pendaftaran baru bisa diselesaikan setelah sakramen dilaksanakan.']
    }
    if (!next.officiating_pastor) {
      details.officiating_pastor = ['Isi nama pendeta yang melayani.']
    }
  }
  if (next.partner_member_id !== null && type !== 'MARRIAGE') {
    details.partner_member_id = ['Mempelai kedua hanya untuk pemberkatan nikah.']
  } else if (next.partner_member_id !== null && next.partner_member_id === next.member_id) {
    details.partner_member_id = ['Mempelai pria dan wanita harus anggota jemaat yang berbeda.']
  }
  return details
}

// Awalan kode pendaftaran dan nomor register per layanan.
export const SACRAMENT_PREFIX: Record<SacramentType, string> = {
  BAPTISM: 'BPT',
  SIDI: 'SDI',
  MARRIAGE: 'NKH',
}

// Tanpa huruf/angka yang mirip (I, O, 0, 1), agar mudah dibacakan dan diketik.
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// "bpt k7qx 29md" atau "BPTK7QX29MD" → "BPT-K7QX-29MD"; null bila bukan kode pendaftaran.
export function normalizeCode(text: string): string | null {
  const compact = text.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const match = /^(BPT|SDI|NKH)([A-HJ-NP-Z2-9]{4})([A-HJ-NP-Z2-9]{4})$/.exec(compact)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null
}

// "Yosua Ndun" → "Yosua N."; "Yosua Ndun & Maria Lede" → "Yosua N. & Maria L.".
export function maskName(name: string): string {
  return name
    .split(' & ')
    .map((person) => {
      const [first, ...rest] = person.trim().split(/\s+/)
      return [first, ...rest.map((word) => `${word.charAt(0).toUpperCase()}.`)].join(' ')
    })
    .join(' & ')
}

function readDate(
  read: ReturnType<typeof createReader>,
  key: string,
  label: string,
  required: boolean,
) {
  read.text(key, label, {
    max: 10,
    required,
    pattern: [DATE_PATTERN, `${label} harus tanggal YYYY-MM-DD.`],
  })
  const value = read.input[key]
  if (typeof value === 'string' && !isCalendarDate(value)) {
    read.details[key] = [`${label} tidak ada di kalender.`]
    delete read.input[key]
  }
}

// "9.30" dan "09:30" menjadi "09:30".
function readTime(read: ReturnType<typeof createReader>, key: string, label: string) {
  read.text(key, label, {
    max: 10,
    normalize: (value) => value.replace('.', ':').padStart(5, '0'),
    pattern: [TIME_PATTERN, `${label} harus HH:MM, mis. 09:00.`],
  })
}
