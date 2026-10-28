import type { ContentFields } from '../../shared/contents'
import {
  CONTENT_CATEGORY_LABELS,
  type ContentCategory,
  type ContentItem,
  type ContentListItem,
  type ContentStatus,
  type PublicContent,
} from '../../shared/types'

// Bagian bersama rute /api/contents (CMS) dan /api/public: kolom SQL, konversi baris
// D1, dan bentuk data di Log Aktivitas.

const ISO = (column: string) => `strftime('%Y-%m-%dT%H:%M:%SZ', ${column})`

// Konten tampil di portal bila diterbitkan dan waktu terbitnya sudah lewat.
export const PUBLIC_VISIBLE = `c.is_published = 1 AND c.published_at IS NOT NULL
  AND c.published_at <= datetime('now')`

// Daftar CMS tidak memuat isi lengkap.
export const contentSelect = (withBody = true) => `
  SELECT c.id, c.category, c.title, c.slug, c.summary,
         ${withBody ? 'c.content_body,' : ''} c.attachment_url,
         c.thumbnail_url, ${ISO('c.published_at')} AS published_at, c.is_published,
         CASE WHEN c.is_published = 0 THEN 'DRAFT'
              WHEN c.published_at > datetime('now') THEN 'SCHEDULED'
              ELSE 'PUBLISHED' END AS status,
         c.author_id, u.name AS author_name,
         ${ISO('c.created_at')} AS created_at, ${ISO('c.updated_at')} AS updated_at
  FROM public_contents c
  LEFT JOIN users u ON u.id = c.author_id`

export type ContentRow = Omit<ContentItem, 'is_published' | 'status' | 'content_body'> & {
  content_body?: string | null
  is_published: number
  status: ContentStatus
}

export function toContentItem(row: ContentRow): ContentItem {
  return { ...row, content_body: row.content_body ?? null, is_published: row.is_published === 1 }
}

export function toContentListItem(row: ContentRow): ContentListItem {
  const { content_body: _body, ...rest } = row
  return { ...rest, is_published: row.is_published === 1 }
}

export async function findContent(db: D1Database, id: number) {
  const row = await db.prepare(`${contentSelect()} WHERE c.id = ?1`).bind(id).first<ContentRow>()
  return row ? toContentItem(row) : null
}

// ContentItem → nilai kolom (published_at kembali ke format D1 UTC).
export function contentFields(item: ContentItem): ContentFields {
  return {
    category: item.category,
    title: item.title,
    slug: item.slug,
    summary: item.summary,
    content_body: item.content_body,
    attachment_url: item.attachment_url,
    thumbnail_url: item.thumbnail_url,
    published_at: item.published_at ? item.published_at.slice(0, 19).replace('T', ' ') : null,
    is_published: item.is_published,
  }
}

// Waktu sekarang dalam format kolom D1.
export function nowUtc(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

export function contentLabel(category: ContentCategory, title: string) {
  return `${CONTENT_CATEGORY_LABELS[category]} “${title}”`
}

// Isi artikel tidak disalin utuh ke Log Aktivitas: cukup panjang dan sidik jarinya,
// sehingga perubahan isi tetap terlihat.
export function contentAuditView(fields: ContentFields) {
  return {
    category: fields.category,
    title: fields.title,
    slug: fields.slug,
    summary: fields.summary,
    content_body: fields.content_body ? digest(fields.content_body) : null,
    attachment_url: fields.attachment_url,
    thumbnail_url: fields.thumbnail_url,
    published_at: fields.published_at,
    is_published: fields.is_published,
  }
}

function digest(text: string) {
  // FNV-1a 32-bit
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0')
  return `${text.length.toLocaleString('id-ID')} karakter #${hex}`
}

// Kolom konten untuk portal. Isi lengkap hanya untuk halaman baca; daftar cukup awal
// isinya untuk cuplikan.
export const publicSelect = (fullBody: boolean) => `
  SELECT c.id, c.category, c.title, c.slug, c.summary,
         ${fullBody ? 'c.content_body' : 'substr(c.content_body, 1, 600) AS content_body'},
         c.attachment_url,
         c.thumbnail_url, ${ISO('c.published_at')} AS published_at, u.name AS author_name
  FROM public_contents c
  LEFT JOIN users u ON u.id = c.author_id`

type PublicRow = Omit<PublicContent, 'content_body'> & { content_body: string | null }

// Tanpa ringkasan, kartu portal memakai awal isi (±280 karakter, dipotong di batas kata).
export function toPublicContent(row: PublicRow, withBody: boolean): PublicContent {
  const { content_body, ...rest } = row
  const item: PublicContent = { ...rest, summary: row.summary ?? excerpt(content_body) }
  if (withBody) item.content_body = content_body
  return item
}

function excerpt(text: string | null, max = 280): string | null {
  if (!text) return null
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[.,;:!?-]+$/, '')}…`
}
