import { Hono } from 'hono'
import type { FieldErrors } from '../../shared/accounts'
import { witaToday } from '../../shared/dates'
import {
  CONTENT_CATEGORIES,
  type ApiErrorBody,
  type ApiPage,
  type PublicContent,
  type PublicHome,
  type PublicWorship,
} from '../../shared/types'
import { PUBLIC_VISIBLE, publicSelect, toPublicContent } from '../lib/contents'
import { containsPattern, invalid, readPaging, searchWords, whereBuilder } from '../lib/request'
import type { AppEnv } from '../types'

// Portal Publik (PRD: Portal Informasi Publik & Warta). Tanpa login: semua rute di sini
// hanya membaca, dan hanya konten yang diterbitkan dengan waktu terbit yang sudah lewat
// serta jadwal ibadah bertanda is_public.
//
// GET /home                beranda: jadwal ibadah terdekat, warta terbaru, renungan hari
//                          ini (beserta isinya), berita terbaru, foto dokumentasi
//                          terbaru, rekening/QRIS persembahan
// GET /contents            daftar konten (tanpa isi lengkap); query opsional category,
//                          q (judul/ringkasan), page, per_page, with_body=true (isi
//                          lengkap, maks. 50 per halaman; untuk halaman Profil dan
//                          Persembahan yang memuat seluruh isinya sekaligus)
// GET /contents/:slug      satu konten lengkap
const publicRoutes = new Hono<AppEnv>()

// Isi portal boleh disimpan browser sebentar; konten baru tampil paling lambat semenit.
publicRoutes.use(async (c, next) => {
  await next()
  if (c.res.ok) c.res.headers.set('Cache-Control', 'public, max-age=60')
})

const UPCOMING_LIMIT = 6
const NEWS_LIMIT = 3
const WITH_BODY_MAX = 50
// Profil dan info persembahan dibaca berurutan seperti dibuat; lainnya terbaru dulu.
const ORDERED_CATEGORIES = new Set(['PROFILE', 'PAYMENT_INFO'])

type PublicRow = Parameters<typeof toPublicContent>[0]

publicRoutes.get('/home', async (c) => {
  const db = c.env.DB
  const today = witaToday()
  const latest = (category: string, limit: number, fullBody = false) =>
    db
      .prepare(
        `${publicSelect(fullBody)} WHERE ${PUBLIC_VISIBLE} AND c.category = ?1
         ORDER BY c.published_at DESC, c.id DESC LIMIT ?2`,
      )
      .bind(category, limit)

  const [worships, warta, devotional, news, media, payment] = await db.batch([
    db
      .prepare(
        `SELECT w.id, w.title, w.category, r.name AS rayon_name, w.worship_date,
                w.worship_time, w.location, w.theme, w.bible_reading, w.liturgy_file_url,
                (SELECT s.servant_name FROM worship_servants s
                 WHERE s.schedule_id = w.id AND s.role = 'PREACHER'
                 ORDER BY s.id LIMIT 1) AS preacher
         FROM worship_schedules w
         LEFT JOIN rayons r ON r.id = w.rayon_id
         WHERE w.is_public = 1 AND w.worship_date >= ?1
         ORDER BY w.worship_date, w.worship_time IS NULL, w.worship_time, w.id
         LIMIT ?2`,
      )
      .bind(today, UPCOMING_LIMIT),
    latest('WARTA', 1),
    // Renungan pendek dibaca utuh di beranda.
    latest('DEVOTIONAL', 1, true),
    latest('NEWS', NEWS_LIMIT),
    latest('MEDIA', 1),
    db.prepare(
      `${publicSelect(true)} WHERE ${PUBLIC_VISIBLE} AND c.category = 'PAYMENT_INFO'
       ORDER BY c.published_at, c.id`,
    ),
  ])

  const first = (rows: unknown[], withBody = false) =>
    rows[0] ? toPublicContent(rows[0] as PublicRow, withBody) : null
  const todayDevotional = first(devotional.results, true)
  return c.json<PublicHome>({
    today,
    upcoming_worships: worships.results as PublicWorship[],
    latest_warta: first(warta.results),
    devotional: todayDevotional && {
      ...todayDevotional,
      is_today: witaToday(Date.parse(todayDevotional.published_at)) === today,
    },
    latest_news: (news.results as PublicRow[]).map((row) => toPublicContent(row, false)),
    latest_media: first(media.results),
    payment_info: (payment.results as PublicRow[]).map((row) => toPublicContent(row, true)),
  })
})

publicRoutes.get('/contents', async (c) => {
  const query = c.req.query()
  const details: FieldErrors = {}
  const where = whereBuilder()
  where.addClause(PUBLIC_VISIBLE)
  const { page, perPage } = readPaging(query, details)

  let category: string | null = null
  if (query.category !== undefined) {
    category = query.category.trim().toUpperCase()
    if (!(CONTENT_CATEGORIES as readonly string[]).includes(category)) {
      details.category = [`Pilih salah satu: ${CONTENT_CATEGORIES.join(', ')}.`]
    } else where.add('c.category = ?', category)
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
  let withBody = false
  if (query.with_body !== undefined) {
    if (query.with_body !== 'true' && query.with_body !== 'false') {
      details.with_body = ['Isi true atau false.']
    } else withBody = query.with_body === 'true'
  }
  if (withBody && perPage > WITH_BODY_MAX) {
    details.per_page = [`Dengan isi lengkap, paling banyak ${WITH_BODY_MAX} per halaman.`]
  }
  if (Object.keys(details).length > 0) return invalid(c, 'Filter konten tidak valid.', details)

  const order =
    category && ORDERED_CATEGORIES.has(category)
      ? 'c.published_at, c.id'
      : 'c.published_at DESC, c.id DESC'
  const db = c.env.DB
  const count = where.params.length
  const [total, list] = await db.batch([
    db.prepare(`SELECT COUNT(*) AS n FROM public_contents c ${where.sql}`).bind(...where.params),
    db
      .prepare(
        `${publicSelect(withBody)} ${where.sql} ORDER BY ${order}
         LIMIT ?${count + 1} OFFSET ?${count + 2}`,
      )
      .bind(...where.params, perPage, (page - 1) * perPage),
  ])
  return c.json<ApiPage<PublicContent>>({
    data: (list.results as PublicRow[]).map((row) => toPublicContent(row, withBody)),
    meta: { page, per_page: perPage, total: (total.results[0] as { n: number }).n },
  })
})

publicRoutes.get('/contents/:slug', async (c) => {
  const row = await c.env.DB.prepare(
    `${publicSelect(true)} WHERE ${PUBLIC_VISIBLE} AND c.slug = ?1`,
  )
    .bind(c.req.param('slug').toLowerCase())
    .first<PublicRow>()
  if (!row) return c.json<ApiErrorBody>({ error: 'Konten tidak ditemukan.' }, 404)
  return c.json<{ content: PublicContent }>({ content: toPublicContent(row, true) })
})

export default publicRoutes
