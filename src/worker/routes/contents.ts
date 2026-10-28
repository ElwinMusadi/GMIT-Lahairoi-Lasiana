import { Hono, type Context } from 'hono'
import type { FieldErrors } from '../../shared/accounts'
import {
  parseContentInput,
  publishProblems,
  slugify,
  type ContentFields,
} from '../../shared/contents'
import {
  CONTENT_CATEGORIES,
  type ApiErrorBody,
  type ApiPage,
  type ContentListItem,
  type ContentResponse,
  type SessionUser,
} from '../../shared/types'
import { LAST_INSERT_ID, auditStatement, diffChanges } from '../lib/audit'
import {
  PUBLIC_VISIBLE,
  contentAuditView,
  contentFields,
  contentLabel,
  contentSelect,
  findContent,
  nowUtc,
  toContentListItem,
  type ContentRow,
} from '../lib/contents'
import {
  containsPattern,
  invalid,
  positiveInt,
  readJsonObject,
  readPaging,
  runBatch,
  searchWords,
  whereBuilder,
} from '../lib/request'
import { requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

// CMS konten Portal Publik (PRD: Warta, Renungan, Berita, Media, Profil, Info
// Persembahan). Admin mengelola semua konten. Pendeta menulis Renungan (PRD: renungan
// ditulis Pendeta) dan hanya melihat, mengubah, dan menghapus renungan miliknya.
//
// Konten tampil di portal (/api/public) bila is_published dan published_at sudah lewat;
// published_at di masa depan berarti terjadwal. Menerbitkan tanpa published_at
// mengisinya dengan waktu sekarang. Draf boleh belum lengkap; kelengkapan diperiksa
// saat diterbitkan (src/shared/contents.ts).
//
// GET / query opsional: category, status (draft/scheduled/published), q (judul atau
// ringkasan), page, per_page.
const contents = new Hono<AppEnv>()

contents.use(requireRole('ADMIN', 'PASTOR'))

type Ctx = Context<AppEnv>

const DUPLICATE_SLUG = 'Alamat konten sudah dipakai.'
const PASTOR_ONLY_DEVOTIONAL = 'Pendeta hanya dapat menulis dan mengubah Renungan miliknya sendiri.'

const STATUS_CLAUSES: Record<string, string> = {
  DRAFT: 'c.is_published = 0',
  SCHEDULED: "c.is_published = 1 AND c.published_at > datetime('now')",
  PUBLISHED: PUBLIC_VISIBLE,
}

// Pendeta hanya boleh menyentuh Renungan yang ditulisnya sendiri.
function outsidePastorScope(
  user: SessionUser,
  content: { category: string; author_id: number | null },
) {
  return (
    user.role === 'PASTOR' && (content.category !== 'DEVOTIONAL' || content.author_id !== user.id)
  )
}

contents.get('/', async (c) => {
  const user = c.get('user')
  const query = c.req.query()
  const details: FieldErrors = {}
  const where = whereBuilder()
  const { page, perPage } = readPaging(query, details)

  if (query.category !== undefined) {
    const category = query.category.trim().toUpperCase()
    if (!(CONTENT_CATEGORIES as readonly string[]).includes(category)) {
      details.category = [`Pilih salah satu: ${CONTENT_CATEGORIES.join(', ')}.`]
    } else where.add('c.category = ?', category)
  }
  if (query.status !== undefined) {
    const clause = STATUS_CLAUSES[query.status.trim().toUpperCase()]
    if (!clause) details.status = ['Isi draft, scheduled, atau published.']
    else where.addClause(`(${clause})`)
  }
  if (query.q !== undefined) {
    const words = searchWords(query.q)
    if (words === null) details.q = ['Kata pencarian maksimal 100 karakter.']
    for (const word of words ?? []) {
      where.add(
        `(c.title LIKE ? ESCAPE '\\' OR c.summary LIKE ? ESCAPE '\\')`,
        containsPattern(word),
      )
    }
  }
  if (Object.keys(details).length > 0) return invalid(c, 'Filter konten tidak valid.', details)
  if (user.role === 'PASTOR') {
    where.add('c.category = ?', 'DEVOTIONAL')
    where.add('c.author_id = ?', user.id)
  }

  const db = c.env.DB
  const count = where.params.length
  const [total, list] = await db.batch([
    db.prepare(`SELECT COUNT(*) AS n FROM public_contents c ${where.sql}`).bind(...where.params),
    db
      .prepare(
        `${contentSelect(false)} ${where.sql}
         ORDER BY COALESCE(c.published_at, c.created_at) DESC, c.id DESC
         LIMIT ?${count + 1} OFFSET ?${count + 2}`,
      )
      .bind(...where.params, perPage, (page - 1) * perPage),
  ])
  return c.json<ApiPage<ContentListItem>>({
    data: (list.results as ContentRow[]).map(toContentListItem),
    meta: { page, per_page: perPage, total: (total.results[0] as { n: number }).n },
  })
})

contents.get('/:id', async (c) => {
  const id = positiveInt(c.req.param('id'))
  const content = id ? await findContent(c.env.DB, id) : null
  if (!content || outsidePastorScope(c.get('user'), content)) {
    return c.json<ApiErrorBody>({ error: 'Konten tidak ditemukan.' }, 404)
  }
  return c.json<ContentResponse>({ content })
})

contents.post('/', async (c) => {
  const user = c.get('user')
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data konten tidak valid.' }, 400)

  const { input, details } = parseContentInput(body, 'create')
  if (Object.keys(details).length > 0) return invalid(c, 'Data konten belum benar.', details)
  const next: ContentFields = {
    category: input.category ?? 'NEWS',
    title: input.title ?? '',
    slug: input.slug ?? '',
    summary: input.summary ?? null,
    content_body: input.content_body ?? null,
    attachment_url: input.attachment_url ?? null,
    thumbnail_url: input.thumbnail_url ?? null,
    published_at: input.published_at ?? null,
    is_published: input.is_published ?? false,
  }
  if (outsidePastorScope(user, { category: next.category, author_id: user.id })) {
    return c.json<ApiErrorBody>({ error: PASTOR_ONLY_DEVOTIONAL }, 403)
  }
  if (next.is_published && !next.published_at) next.published_at = nowUtc()
  const problems = publishProblems(next)
  if (Object.keys(problems).length > 0) {
    return invalid(c, 'Konten belum lengkap untuk diterbitkan.', problems)
  }

  const db = c.env.DB
  if (input.slug) {
    const taken = await slugTaken(c, input.slug, null)
    if (taken) return taken
  } else {
    next.slug = await uniqueSlug(db, slugify(next.title), null)
  }

  const result = await runBatch(
    c,
    [
      db
        .prepare(
          `INSERT INTO public_contents (category, title, slug, summary, content_body,
             attachment_url, thumbnail_url, published_at, author_id, is_published)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10) RETURNING id`,
        )
        .bind(...columnValues(next), user.id, next.is_published ? 1 : 0),
      auditStatement(c, {
        action: 'CREATE',
        entityType: 'public_contents',
        entityId: LAST_INSERT_ID,
        label: contentLabel(next.category, next.title),
        after: contentAuditView(next),
      }),
    ],
    DUPLICATE_SLUG,
  )
  if (result instanceof Response) return result

  const id = (result[0].results[0] as { id: number }).id
  return c.json<ContentResponse>({ content: await mustFind(c, id) }, 201)
})

// PRD menyebut PUT; PATCH diterima dengan arti yang sama. Field yang tidak dikirim tidak
// diubah, termasuk alamat (slug), agar tautan yang sudah dibagikan tetap berlaku.
// slug: null membuat ulang alamat dari judul.
contents.on(['PUT', 'PATCH'], '/:id', async (c) => {
  const user = c.get('user')
  const id = positiveInt(c.req.param('id'))
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data konten tidak valid.' }, 400)

  const { input, details } = parseContentInput(body, 'update')
  if (Object.keys(details).length > 0) return invalid(c, 'Data konten belum benar.', details)
  if (Object.keys(input).length === 0) {
    return c.json<ApiErrorBody>({ error: 'Tidak ada data yang diubah.' }, 400)
  }

  const db = c.env.DB
  const current = id ? await findContent(db, id) : null
  if (!id || !current) return c.json<ApiErrorBody>({ error: 'Konten tidak ditemukan.' }, 404)
  if (outsidePastorScope(user, current)) {
    return c.json<ApiErrorBody>({ error: PASTOR_ONLY_DEVOTIONAL }, 403)
  }

  const before = contentFields(current)
  const { slug, ...rest } = input
  const next: ContentFields = { ...before, ...rest }
  if (outsidePastorScope(user, { category: next.category, author_id: current.author_id })) {
    return c.json<ApiErrorBody>({ error: PASTOR_ONLY_DEVOTIONAL }, 403)
  }
  if (next.is_published && !next.published_at) next.published_at = nowUtc()
  const problems = publishProblems(next)
  if (Object.keys(problems).length > 0) {
    return invalid(c, 'Konten belum lengkap untuk diterbitkan.', problems)
  }

  if (slug === null) {
    next.slug = await uniqueSlug(db, slugify(next.title), id)
  } else if (slug !== undefined && slug !== current.slug) {
    const taken = await slugTaken(c, slug, id)
    if (taken) return taken
    next.slug = slug
  }

  const beforeView = contentAuditView(before)
  const afterView = contentAuditView(next)
  if (Object.keys(diffChanges(beforeView, afterView)).length === 0) {
    return c.json<ContentResponse>({ content: current })
  }

  const result = await runBatch(
    c,
    [
      db
        .prepare(
          `UPDATE public_contents
           SET category = ?2, title = ?3, slug = ?4, summary = ?5, content_body = ?6,
               attachment_url = ?7, thumbnail_url = ?8, published_at = ?9, is_published = ?10,
               updated_at = datetime('now')
           WHERE id = ?1`,
        )
        .bind(id, ...columnValues(next), next.is_published ? 1 : 0),
      auditStatement(c, {
        action: 'UPDATE',
        entityType: 'public_contents',
        entityId: id,
        label: contentLabel(next.category, next.title),
        before: beforeView,
        after: afterView,
      }),
    ],
    DUPLICATE_SLUG,
  )
  if (result instanceof Response) return result

  return c.json<ContentResponse>({ content: await mustFind(c, id) })
})

// Berkas yang sudah diunggah (PDF warta, gambar) tetap tersimpan di R2.
contents.delete('/:id', async (c) => {
  const id = positiveInt(c.req.param('id'))
  const db = c.env.DB
  const current = id ? await findContent(db, id) : null
  if (!id || !current) return c.json<ApiErrorBody>({ error: 'Konten tidak ditemukan.' }, 404)
  if (outsidePastorScope(c.get('user'), current)) {
    return c.json<ApiErrorBody>({ error: PASTOR_ONLY_DEVOTIONAL }, 403)
  }

  await db.batch([
    db.prepare('DELETE FROM public_contents WHERE id = ?1').bind(id),
    auditStatement(c, {
      action: 'DELETE',
      entityType: 'public_contents',
      entityId: id,
      label: contentLabel(current.category, current.title),
      before: contentAuditView(contentFields(current)),
    }),
  ])
  return c.body(null, 204)
})

// category, title, slug, summary, content_body, attachment_url, thumbnail_url, published_at
function columnValues(next: ContentFields) {
  return [
    next.category,
    next.title,
    next.slug,
    next.summary,
    next.content_body,
    next.attachment_url,
    next.thumbnail_url,
    next.published_at,
  ]
}

async function slugTaken(c: Ctx, slug: string, excludeId: number | null) {
  const row = await c.env.DB.prepare(
    'SELECT title FROM public_contents WHERE slug = ?1 AND id IS NOT ?2',
  )
    .bind(slug, excludeId)
    .first<{ title: string }>()
  if (!row) return null
  return c.json<ApiErrorBody>(
    { error: DUPLICATE_SLUG, details: { slug: [`Alamat ${slug} sudah dipakai “${row.title}”.`] } },
    409,
  )
}

// Alamat dari judul; bila sudah dipakai, diberi nomor: renungan-pagi, renungan-pagi-2, …
async function uniqueSlug(db: D1Database, base: string, excludeId: number | null) {
  const { results } = await db
    .prepare(
      `SELECT slug FROM public_contents
       WHERE (slug = ?1 OR slug LIKE ?2) AND id IS NOT ?3`,
    )
    .bind(base, `${base}-%`, excludeId)
    .all<{ slug: string }>()
  const taken = new Set(results.map((row) => row.slug))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

async function mustFind(c: Ctx, id: number) {
  const content = await findContent(c.env.DB, id)
  if (!content) throw new Error(`Konten ${id} tidak ditemukan setelah disimpan`)
  return content
}

export default contents
