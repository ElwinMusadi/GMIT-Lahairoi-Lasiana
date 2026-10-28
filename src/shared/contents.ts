import type { FieldErrors } from './accounts'
import { isCalendarDate } from './dates'
import { createReader } from './form-reader'
import { CONTENT_CATEGORIES, CONTENT_CATEGORY_LABELS, type ContentCategory } from './types'

// Aturan data konten Portal Publik (PRD: Warta, Renungan, Berita, Media, Profil, Info
// Persembahan), dipakai bersama oleh API CMS dan form dashboard.

type Mode = 'create' | 'update'
type Body = Record<string, unknown>

export const CONTENT_BODY_MAX = 50_000

export type ContentFields = {
  category: ContentCategory
  title: string
  slug: string
  summary: string | null
  content_body: string | null
  attachment_url: string | null
  thumbnail_url: string | null
  // UTC 'YYYY-MM-DD HH:MM:SS', seperti kolom waktu lain di D1.
  published_at: string | null
  is_published: boolean
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
// Berkas yang diunggah lewat POST /api/uploads ke folder publik, atau tautan https.
const ATTACHMENT_PATTERN =
  /^(?:\/api\/files\/(?:warta|konten|media|liturgi)\/[A-Za-z0-9/._-]+\.(?:pdf|jpg|png|webp)|https:\/\/[^\s<>"]+)$/
const THUMBNAIL_PATTERN = /^\/api\/files\/(?:konten|media)\/[A-Za-z0-9/._-]+\.(?:jpg|png|webp)$/
const WARTA_PDF_PATTERN = /^\/api\/files\/warta\/[A-Za-z0-9/._-]+\.pdf$/
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/

// Kategori yang isinya dibaca sebagai artikel, sehingga wajib berisi saat diterbitkan.
const ARTICLE_CATEGORIES: readonly ContentCategory[] = ['DEVOTIONAL', 'NEWS', 'PROFILE']

// "Kebaktian Minggu, 25 Okt" → "kebaktian-minggu-25-okt"
export function slugify(text: string): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
  return slug || 'konten'
}

// Waktu terbit: 'YYYY-MM-DD' berarti pukul 00.00 WITA hari itu; selain itu ISO 8601
// dengan zona waktu. Hasilnya UTC 'YYYY-MM-DD HH:MM:SS', atau null bila tidak sah.
export function parsePublishedAt(value: string): string | null {
  let time: number
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (!isCalendarDate(value)) return null
    time = Date.parse(`${value}T00:00:00+08:00`)
  } else if (ISO_DATETIME.test(value) && isCalendarDate(value.slice(0, 10))) {
    time = Date.parse(value)
  } else {
    return null
  }
  if (Number.isNaN(time)) return null
  return new Date(time).toISOString().slice(0, 19).replace('T', ' ')
}

export function parseContentInput(body: Body, mode: Mode) {
  const read = createReader(body, mode)
  read.choice('category', 'kategori konten', CONTENT_CATEGORIES, CONTENT_CATEGORY_LABELS, {
    required: true,
  })
  read.text('title', 'Judul', { max: 200, required: true })
  read.text('slug', 'Alamat', {
    max: 100,
    normalize: (value) => value.toLowerCase(),
    pattern: [
      SLUG_PATTERN,
      'Alamat hanya berisi huruf kecil, angka, dan tanda hubung, mis. warta-minggu-25-oktober.',
    ],
  })
  read.text('summary', 'Ringkasan', { max: 500 })
  read.text('content_body', 'Isi', { max: CONTENT_BODY_MAX, multiline: true })
  read.text('attachment_url', 'Lampiran', {
    max: 500,
    pattern: [
      ATTACHMENT_PATTERN,
      'Lampiran harus berkas yang diunggah ke folder warta, konten, media, atau liturgi, atau tautan https.',
    ],
  })
  read.text('thumbnail_url', 'Gambar', {
    max: 300,
    pattern: [
      THUMBNAIL_PATTERN,
      'Gambar harus foto JPG, PNG, atau WebP yang diunggah ke folder konten atau media.',
    ],
  })
  if (read.has('published_at')) {
    const raw = body.published_at
    if (raw === null || raw === '') {
      read.input.published_at = null
    } else {
      const parsed = typeof raw === 'string' ? parsePublishedAt(raw.trim()) : null
      if (parsed) read.input.published_at = parsed
      else {
        read.details.published_at = [
          'Waktu terbit harus tanggal YYYY-MM-DD atau waktu ISO 8601 dengan zona waktu.',
        ]
      }
    }
  }
  read.flag('is_published', 'Status terbit')
  return { input: read.input as Partial<ContentFields>, details: read.details }
}

// Kelengkapan yang diperiksa saat konten diterbitkan; draf boleh belum lengkap.
export function publishProblems(next: ContentFields): FieldErrors {
  const details: FieldErrors = {}
  if (!next.is_published) return details
  if (
    next.category === 'WARTA' &&
    !(next.attachment_url && WARTA_PDF_PATTERN.test(next.attachment_url))
  ) {
    details.attachment_url = ['Warta yang diterbitkan wajib melampirkan PDF dari folder warta.']
  }
  if (ARTICLE_CATEGORIES.includes(next.category) && !next.content_body) {
    details.content_body = ['Isi wajib diisi sebelum diterbitkan.']
  }
  if (next.category === 'MEDIA' && !next.thumbnail_url && !next.attachment_url) {
    details.thumbnail_url = ['Media wajib punya foto atau tautan video sebelum diterbitkan.']
  }
  if (next.category === 'PAYMENT_INFO' && !next.summary && !next.thumbnail_url) {
    details.summary = [
      'Isi nomor rekening di Ringkasan atau unggah gambar QRIS sebelum diterbitkan.',
    ]
  }
  return details
}
