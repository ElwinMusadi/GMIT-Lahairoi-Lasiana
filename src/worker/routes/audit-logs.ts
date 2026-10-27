import { Hono } from 'hono'
import type { ApiErrorBody, ApiPage, AuditDetails, AuditLogItem } from '../../shared/types'
import { isCalendarDate } from '../../shared/dates'
import { positiveInt, readPaging, whereBuilder } from '../lib/request'
import { requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

// Log Aktivitas (PRD, Autentikasi & Hak Akses): siapa mengubah apa dan kapan,
// terbaru lebih dulu. Hanya Admin.
//
// Query opsional: page, per_page (maks. 100), user_id, action, entity_type,
// entity_id, from, to (YYYY-MM-DD, waktu WITA, keduanya inklusif).
const auditLogs = new Hono<AppEnv>()

auditLogs.use(requireRole('ADMIN'))

// created_at tersimpan dalam UTC, sedangkan filter tanggal mengikuti jam Kupang
// (WITA, UTC+8, tanpa pergantian musim).
const WITA_TO_UTC = '-8 hours'

type AuditLogRow = Omit<AuditLogItem, 'details'> & { details_json: string | null }

auditLogs.get('/', async (c) => {
  const query = c.req.query()
  const details: Record<string, string[]> = {}
  const where = whereBuilder()
  const { page, perPage } = readPaging(query, details)

  if (query.user_id !== undefined) {
    const userId = positiveInt(query.user_id)
    if (userId === null) details.user_id = ['ID pengguna tidak valid.']
    else where.add('a.user_id = ?', userId)
  }
  if (query.action !== undefined) {
    const action = query.action.trim().toUpperCase()
    if (!/^[A-Z_]{2,40}$/.test(action)) details.action = ['Jenis aksi tidak valid.']
    else where.add('a.action = ?', action)
  }
  if (query.entity_type !== undefined) {
    const entityType = query.entity_type.trim().toLowerCase()
    if (!/^[a-z_]{2,40}$/.test(entityType)) details.entity_type = ['Jenis entitas tidak valid.']
    else where.add('a.entity_type = ?', entityType)
  }
  if (query.entity_id !== undefined) {
    const entityId = positiveInt(query.entity_id)
    if (entityId === null) details.entity_id = ['ID entitas tidak valid.']
    else where.add('a.entity_id = ?', entityId)
  }

  const from = query.from
  const to = query.to
  if (from !== undefined && !isCalendarDate(from)) details.from = ['Tanggal awal harus YYYY-MM-DD.']
  if (to !== undefined && !isCalendarDate(to)) details.to = ['Tanggal akhir harus YYYY-MM-DD.']
  if (!details.from && !details.to && from && to && from > to) {
    details.to = ['Tanggal akhir tidak boleh sebelum tanggal awal.']
  }
  if (from && !details.from) where.add(`a.created_at >= datetime(?, '${WITA_TO_UTC}')`, from)
  if (to && !details.to) where.add(`a.created_at < datetime(?, '+1 day', '${WITA_TO_UTC}')`, to)

  if (Object.keys(details).length > 0) {
    return c.json<ApiErrorBody>({ error: 'Filter Log Aktivitas tidak valid.', details }, 400)
  }

  const { sql: whereSql, params } = where
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

export default auditLogs
