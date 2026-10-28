import type { FieldErrors } from './accounts'
import { isCalendarDate } from './dates'
import { createReader } from './form-reader'
import {
  SERVANT_ROLES,
  SERVANT_ROLE_LABELS,
  WORSHIP_CATEGORIES,
  WORSHIP_CATEGORY_LABELS,
  type ServantRole,
  type WorshipCategory,
  type WorshipItem,
} from './types'

// Aturan data jadwal ibadah, petugas pelayanan, dan kehadiran (PRD: Penjadwalan Ibadah,
// Pelayan & Kehadiran), dipakai bersama oleh API dan form dashboard.

type Mode = 'create' | 'update'
type Body = Record<string, unknown>

export type WorshipFields = {
  title: string
  category: WorshipCategory
  rayon_id: number | null
  worship_date: string
  worship_time: string | null
  location: string | null
  theme: string | null
  bible_reading: string | null
  liturgy_file_url: string | null
  is_public: boolean
}

// servant_name boleh kosong bila member_id diisi; API memakai nama anggota itu.
export type ServantInput = {
  role: ServantRole
  servant_name: string | null
  member_id: number | null
}

export const ATTENDANCE_FIELDS = [
  'attendance_men',
  'attendance_women',
  'attendance_youth_children',
] as const
export type AttendanceField = (typeof ATTENDANCE_FIELDS)[number]
export type AttendanceFields = Record<AttendanceField, number | null>

export const ATTENDANCE_LABELS: Record<AttendanceField, string> = {
  attendance_men: 'Pria',
  attendance_women: 'Wanita',
  attendance_youth_children: 'Anak/Pemuda',
}

// Batas wajar satu angka kehadiran, untuk menangkap salah ketik angka nol.
export const ATTENDANCE_MAX = 10_000
export const MAX_SERVANTS = 30

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/
// PDF tata ibadah yang diunggah lewat POST /api/uploads ke folder liturgi, atau tautan https.
const LITURGY_PATTERN = /^(?:\/api\/files\/liturgi\/[A-Za-z0-9/._-]+\.pdf|https:\/\/[^\s<>"]+)$/

export function parseWorshipInput(body: Body, mode: Mode) {
  const read = createReader(body, mode)
  read.text('title', 'Nama ibadah', { max: 150, required: true })
  read.choice('category', 'jenis ibadah', WORSHIP_CATEGORIES, WORSHIP_CATEGORY_LABELS, {
    required: true,
  })
  read.id('rayon_id', 'rayon', { required: false })
  read.text('worship_date', 'Tanggal ibadah', {
    max: 10,
    required: true,
    pattern: [DATE_PATTERN, 'Tanggal ibadah harus YYYY-MM-DD.'],
  })
  if (typeof read.input.worship_date === 'string' && !isCalendarDate(read.input.worship_date)) {
    read.details.worship_date = ['Tanggal ibadah tidak ada di kalender.']
    delete read.input.worship_date
  }
  // "7.00" dan "7:00" menjadi "07:00".
  read.text('worship_time', 'Jam ibadah', {
    max: 10,
    normalize: (value) => value.replace('.', ':').padStart(5, '0'),
    pattern: [TIME_PATTERN, 'Jam ibadah harus HH:MM, mis. 07:00.'],
  })
  read.text('location', 'Lokasi', { max: 200 })
  read.text('theme', 'Tema', { max: 300 })
  read.text('bible_reading', 'Bacaan Alkitab', { max: 200 })
  read.text('liturgy_file_url', 'Tata ibadah', {
    max: 500,
    pattern: [
      LITURGY_PATTERN,
      'Tata ibadah harus PDF yang diunggah ke folder liturgi, atau tautan https.',
    ],
  })
  read.flag('is_public', 'Status publik')
  return { input: read.input as Partial<WorshipFields>, details: read.details }
}

// Aturan antar-kolom, diperiksa setelah data lama dan perubahan digabung.
export function worshipProblems(next: WorshipFields): FieldErrors {
  const details: FieldErrors = {}
  if (next.category === 'RAYON' && next.rayon_id === null) {
    details.rayon_id = ['Ibadah Rayon wajib memilih rayon.']
  }
  return details
}

// Body { servants: [{ role, servant_name, member_id }] }: susunan petugas lengkap satu
// ibadah. Kesalahan dicatat per baris, mis. details['servants.2.role'].
export function parseServantsInput(body: Body) {
  const details: FieldErrors = {}
  const servants: ServantInput[] = []
  const raw = body.servants
  if (!Array.isArray(raw)) {
    details.servants = ['Kirim servants berupa daftar petugas; daftar kosong mengosongkan petugas.']
    return { servants, details }
  }
  if (raw.length > MAX_SERVANTS) {
    details.servants = [`Maksimal ${MAX_SERVANTS} petugas per ibadah.`]
    return { servants, details }
  }

  const seen = new Set<string>()
  raw.forEach((item, index) => {
    const prefix = `servants.${index}`
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      details[prefix] = ['Data petugas tidak valid.']
      return
    }
    const read = createReader(item as Body, 'create')
    read.choice('role', 'tugas', SERVANT_ROLES, SERVANT_ROLE_LABELS, { required: true })
    read.id('member_id', 'anggota jemaat', { required: false })
    const memberId = (read.input.member_id as number | null | undefined) ?? null
    read.text('servant_name', 'Nama petugas', { max: 100, required: memberId === null })
    for (const [key, messages] of Object.entries(read.details)) {
      details[`${prefix}.${key}`] = messages
    }
    if (Object.keys(read.details).length > 0) return

    const servant: ServantInput = {
      role: read.input.role as ServantRole,
      servant_name: (read.input.servant_name as string | null | undefined) ?? null,
      member_id: memberId,
    }
    const person =
      servant.member_id !== null
        ? `anggota:${servant.member_id}`
        : `nama:${servantKey(servant.servant_name ?? '')}`
    const key = `${servant.role}|${person}`
    if (seen.has(key)) {
      details[`${prefix}.servant_name`] = [
        `Petugas ini sudah tercantum sebagai ${SERVANT_ROLE_LABELS[servant.role]}.`,
      ]
      return
    }
    seen.add(key)
    servants.push(servant)
  })
  return { servants, details }
}

// Body PATCH kehadiran: angka yang tidak dikirim tidak diubah, null mengosongkan.
export function parseAttendanceInput(body: Body) {
  const read = createReader(body, 'update')
  for (const field of ATTENDANCE_FIELDS) {
    if (body[field] === null || body[field] === '') read.input[field] = null
    else {
      read.integer(field, `Kehadiran ${ATTENDANCE_LABELS[field]}`, {
        min: 0,
        max: ATTENDANCE_MAX,
      })
    }
  }
  return { input: read.input as Partial<AttendanceFields>, details: read.details }
}

// Sapaan dan gelar di depan nama yang tidak membedakan orang.
const NAME_TITLES = new Set([
  'pdt',
  'pendeta',
  'em',
  'pnt',
  'penatua',
  'dkn',
  'diaken',
  'pengajar',
  'vik',
  'vikaris',
  'sdr',
  'sdri',
  'bpk',
  'bapak',
  'bapa',
  'ibu',
  'mama',
  'kak',
  'nn',
  'ny',
  'tn',
  'dr',
  'drs',
  'dra',
  'ir',
  'prof',
])

// Kunci pembanding nama petugas: "Pdt. Agustina Riwu Kaho, S.Th." dan
// "agustina  riwu kaho" dianggap orang yang sama. Gelar akademik ditulis setelah koma.
export function servantKey(name: string): string {
  const words = (name.split(',')[0] ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  let start = 0
  while (start < words.length - 1 && NAME_TITLES.has(words[start])) start++
  return words.slice(start).join(' ')
}

// Dua tugas dipegang orang yang sama: menurut anggota jemaat bila keduanya terhubung ke
// data jemaat, selain itu menurut nama.
export function sameServant(
  a: { servant_name: string; member_id: number | null },
  b: { servant_name: string; member_id: number | null },
): boolean {
  if (a.member_id !== null && b.member_id !== null) return a.member_id === b.member_id
  return servantKey(a.servant_name) === servantKey(b.servant_name)
}

const LONG_DATE = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

// "Minggu, 1 November 2026"
export function worshipDateLabel(date: string): string {
  return LONG_DATE.format(Date.parse(`${date}T00:00:00Z`))
}

// Kalimat peringatan bentrok untuk setiap tugas yang bentrok, mis. "Pdt. Agustina
// (Pelayan Firman) juga bertugas sebagai Pelayan Firman di “Ibadah Rayon Golgota” pada
// Minggu, 1 November 2026 pukul 07.00 WITA."
export function conflictWarnings(worship: WorshipItem): string[] {
  const when = `${worshipDateLabel(worship.worship_date)} pukul ${worship.worship_time?.replace(':', '.')} WITA`
  return worship.servants.flatMap((servant) =>
    servant.conflicts.map(
      (conflict) =>
        `${servant.servant_name} (${SERVANT_ROLE_LABELS[servant.role]}) juga bertugas sebagai ` +
        `${SERVANT_ROLE_LABELS[conflict.role]} di “${conflict.title}” pada ${when}.`,
    ),
  )
}
