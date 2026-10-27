import { Hono } from 'hono'
import type { ApiErrorBody, ApiPage, AuditDetails, AuditLogItem } from '../../shared/types'
import { requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

// Log Aktivitas (PRD, Autentikasi & Hak Akses): siapa mengubah apa dan kapan,
// terbaru lebih dulu. Hanya Admin.
//
// Query opsional: page, per_page (maks. 100), user_id, action, entity_type,
// entity_id, from, to (YYYY-MM-DD, waktu WITA, keduanya inklusif).
const auditLogs = new Hono<AppEnv>()

auditLogs.use(requireRole('ADMIN'))

const DEFAULT_PER_PAGE = 50
const MAX_PER_PAGE = 100
// created_at tersimpan dalam UTC, sedangkan filter tanggal mengikuti jam Kupang
// (WITA, UTC+8, tanpa pergantian musim).
const WITA_TO_UTC = '-8 hours'

type AuditLogRow = Omit<AuditLogItem, 'details'> & { details_json: string | null }

auditLogs.get('/', async (c) => {
  const query = c.req.query()
  const details: Record<string, string[]> = {}
  const where: string[] = []
  const params: unknown[] = []
  // `?` di klausa diganti nomor parameter berikutnya.
  const filter = (clause: string, value: unknown) => {
    params.push(value)
    where.push(clause.replaceAll('?', `?${params.length}`))
  }

  const page = query.page === undefined ? 1 : positiveInt(query.page)
  if (page === null) details.page = ['Halaman harus bilangan bulat mulai dari 1.']
  const perPage = query.per_page === undefined ? DEFAULT_PER_PAGE : positiveInt(query.per_page)
  if (perPage === null || perPage > MAX_PER_PAGE) {
    details.per_page = [`Jumlah per halaman antara 1 dan ${MAX_PER_PAGE}.`]
  }

  if (query.user_id !== undefined) {
    const userId = positiveInt(query.user_id)
    if (userId === null) details.user_id = ['ID pengguna tidak valid.']
    else filter('a.user_id = ?', userId)
  }
  if (query.action !== undefined) {
    const action = query.action.trim().toUpperCase()
    if (!/^[A-Z_]{2,40}$/.test(action)) details.action = ['Jenis aksi tidak valid.']
    else filter('a.action = ?', action)
  }
  if (query.entity_type !== undefined) {
    const entityType = query.entity_type.trim().toLowerCase()
    if (!/^[a-z_]{2,40}$/.test(entityType)) details.entity_type = ['Jenis entitas tidak valid.']
    else filter('a.entity_type = ?', entityType)
  }
  if (query.entity_id !== undefined) {
    const entityId = positiveInt(query.entity_id)
    if (entityId === null) details.entity_id = ['ID entitas tidak valid.']
    else filter('a.entity_id = ?', entityId)
  }

  const from = query.from
  const to = query.to
  if (from !== undefined && !isDate(from)) details.from = ['Tanggal awal harus YYYY-MM-DD.']
  if (to !== undefined && !isDate(to)) details.to = ['Tanggal akhir harus YYYY-MM-DD.']
  if (!details.from && !details.to && from && to && from > to) {
    details.to = ['Tanggal akhir tidak boleh sebelum tanggal awal.']
  }
  if (from && !details.from) filter(`a.created_at >= datetime(?, '${WITA_TO_UTC}')`, from)
  if (to && !details.to) filter(`a.created_at < datetime(?, '+1 day', '${WITA_TO_UTC}')`, to)

  if (Object.keys(details).length > 0 || page === null || perPage === null) {
    return c.json<ApiErrorBody>({ error: 'Filter Log Aktivitas tidak valid.', details }, 400)
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
  const db = c.env.DB
  const [count, list] = await db.batch([
    db.prepare(`SELECT COUNT(*) AS total FROM audit_logs a ${whereSql}`).bind(...params),
    db
      .prepare(
        `SELECT a.id, a.action, a.entity_type, a.entity_id, a.user_id,
                u.name AS user_name, u.role AS user_role, a.details_json,
                strftime('%Y-%m-%dT%H:%M:%SZ', a.created_at) AS created_at
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.user_id
         ${whereSql}
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT ?${params.length + 1} OFFSET ?${params.length + 2}`,
      )
      .bind(...params, perPage, (page - 1) * perPage),
  ])

  const total = (count.results[0] as { total: number } | undefined)?.total ?? 0
  const data = (list.results as AuditLogRow[]).map(({ details_json, ...row }) => ({
    ...row,
    details: details_json ? (JSON.parse(details_json) as AuditDetails) : null,
  }))

  return c.json<ApiPage<AuditLogItem>>({ data, meta: { page, per_page: perPage, total } })
})

function positiveInt(text: string): number | null {
  if (!/^\d{1,15}$/.test(text)) return null
  const value = Number(text)
  return value > 0 ? value : null
}

// Tanggal kalender yang benar-benar ada, mis. menolak 2026-02-30.
function isDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false
  const date = new Date(`${text}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text)
}

export default auditLogs
