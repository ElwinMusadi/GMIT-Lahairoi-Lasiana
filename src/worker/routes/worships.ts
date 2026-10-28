import { Hono, type Context } from 'hono'
import type { FieldErrors } from '../../shared/accounts'
import { isCalendarDate, witaToday } from '../../shared/dates'
import {
  SERVANT_ROLES,
  WORSHIP_CATEGORIES,
  type ApiErrorBody,
  type ApiPage,
  type ServantRole,
  type WorshipItem,
  type WorshipResponse,
} from '../../shared/types'
import {
  ATTENDANCE_FIELDS,
  conflictWarnings,
  parseAttendanceInput,
  parseServantsInput,
  parseWorshipInput,
  worshipProblems,
  type AttendanceFields,
  type WorshipFields,
} from '../../shared/worship'
import { LAST_INSERT_ID, auditStatement, diffChanges } from '../lib/audit'
import {
  containsPattern,
  invalid,
  positiveInt,
  readJsonObject,
  readPaging,
  searchWords,
  whereBuilder,
} from '../lib/request'
import {
  SCHEDULE_SELECT,
  findWorship,
  servantsAuditText,
  withServants,
  worshipAuditView,
  worshipFields,
  worshipLabel,
  type ScheduleRow,
} from '../lib/worship'
import { requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

// Jadwal ibadah, petugas pelayanan, dan kehadiran (PRD: Penjadwalan Ibadah, Pelayan &
// Kehadiran). Admin, Pendeta, dan Majelis dapat melihat. Admin dan Pendeta menyusun
// jadwal dan petugas; Majelis, Admin, dan Pendeta mencatat kehadiran setelah ibadah.
//
// Bentrok jadwal: orang yang sama (anggota jemaat yang sama, atau nama yang sama tanpa
// sapaan dan gelar) bertugas di dua ibadah berbeda pada tanggal dan jam yang sama.
// Bentrok tidak menolak penyimpanan; setiap respons memberi tanda has_conflict, rincian
// per petugas (servants[].conflicts), dan kalimat peringatan (warnings).
//
// GET / query opsional: from, to (YYYY-MM-DD, inklusif), category, rayon_id,
// is_public (true/false), attendance (recorded/missing), q (nama, tema, lokasi,
// bacaan), servant (nama petugas), sort (asc/desc menurut tanggal), page, per_page.
const worships = new Hono<AppEnv>()

worships.use(requireRole('ADMIN', 'PASTOR', 'ELDER'))

const PLANNERS = ['ADMIN', 'PASTOR'] as const

type Ctx = Context<AppEnv>

const NOT_FOUND = 'Jadwal ibadah tidak ditemukan.'

worships.get('/', async (c) => {
  const query = c.req.query()
  const details: FieldErrors = {}
  const where = whereBuilder()
  const { page, perPage } = readPaging(query, details)

  const { from, to } = query
  if (from !== undefined && !isCalendarDate(from)) details.from = ['Tanggal awal harus YYYY-MM-DD.']
  if (to !== undefined && !isCalendarDate(to)) details.to = ['Tanggal akhir harus YYYY-MM-DD.']
  if (!details.from && !details.to && from && to && from > to) {
    details.to = ['Tanggal akhir tidak boleh sebelum tanggal awal.']
  }
  if (from && !details.from) where.add('w.worship_date >= ?', from)
  if (to && !details.to) where.add('w.worship_date <= ?', to)
  if (query.category !== undefined) {
    const category = query.category.trim().toUpperCase()
    if (!(WORSHIP_CATEGORIES as string[]).includes(category)) {
      details.category = [`Pilih salah satu: ${WORSHIP_CATEGORIES.join(', ')}.`]
    } else where.add('w.category = ?', category)
  }
  if (query.rayon_id !== undefined) {
    const rayonId = positiveInt(query.rayon_id)
    if (rayonId === null) details.rayon_id = ['Rayon tidak valid.']
    else where.add('w.rayon_id = ?', rayonId)
  }
  if (query.is_public !== undefined) {
    if (query.is_public === 'true') where.addClause('w.is_public = 1')
    else if (query.is_public === 'false') where.addClause('w.is_public = 0')
    else details.is_public = ['Isi true (tampil di portal) atau false.']
  }
  if (query.attendance !== undefined) {
    if (query.attendance === 'recorded') where.addClause('w.attendance_total IS NOT NULL')
    else if (query.attendance === 'missing') where.addClause('w.attendance_total IS NULL')
    else details.attendance = ['Isi recorded (sudah dicatat) atau missing (belum dicatat).']
  }
  if (query.q !== undefined) {
    const words = searchWords(query.q)
    if (words === null) details.q = ['Kata pencarian maksimal 100 karakter.']
    for (const word of words ?? []) {
      where.add(
        `(w.title LIKE ? ESCAPE '\\' OR w.theme LIKE ? ESCAPE '\\'
          OR w.location LIKE ? ESCAPE '\\' OR w.bible_reading LIKE ? ESCAPE '\\')`,
        containsPattern(word),
      )
    }
  }
  if (query.servant !== undefined) {
    const words = searchWords(query.servant)
    if (words === null) details.servant = ['Nama petugas maksimal 100 karakter.']
    for (const word of words ?? []) {
      where.add(
        `EXISTS (SELECT 1 FROM worship_servants s
                 WHERE s.schedule_id = w.id AND s.servant_name LIKE ? ESCAPE '\\')`,
        containsPattern(word),
      )
    }
  }
  const sort = query.sort ?? 'asc'
  if (sort !== 'asc' && sort !== 'desc') details.sort = ['Isi asc (terlama dulu) atau desc.']
  if (Object.keys(details).length > 0)
    return invalid(c, 'Filter jadwal ibadah tidak valid.', details)

  // Jadwal tanpa jam berada di akhir harinya; desc tepat kebalikan urutan asc.
  const order =
    sort === 'desc'
      ? 'w.worship_date DESC, w.worship_time IS NULL DESC, w.worship_time DESC, w.id DESC'
      : 'w.worship_date, w.worship_time IS NULL, w.worship_time, w.id'
  const db = c.env.DB
  const count = where.params.length
  const [total, list] = await db.batch([
    db.prepare(`SELECT COUNT(*) AS n FROM worship_schedules w ${where.sql}`).bind(...where.params),
    db
      .prepare(
        `${SCHEDULE_SELECT} ${where.sql}
         ORDER BY ${order}
         LIMIT ?${count + 1} OFFSET ?${count + 2}`,
      )
      .bind(...where.params, perPage, (page - 1) * perPage),
  ])
  return c.json<ApiPage<WorshipItem>>({
    data: await withServants(db, list.results as ScheduleRow[]),
    meta: { page, per_page: perPage, total: (total.results[0] as { n: number }).n },
  })
})

worships.get('/:id', async (c) => {
  const id = positiveInt(c.req.param('id'))
  const worship = id ? await findWorship(c.env.DB, id) : null
  if (!worship) return c.json<ApiErrorBody>({ error: NOT_FOUND }, 404)
  return respond(c, worship)
})

worships.post('/', requireRole(...PLANNERS), async (c) => {
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data jadwal ibadah tidak valid.' }, 400)

  const { input, details } = parseWorshipInput(body, 'create')
  if (Object.keys(details).length > 0) return invalid(c, 'Data jadwal ibadah belum benar.', details)
  const next: WorshipFields = {
    title: input.title ?? '',
    category: input.category ?? 'SUNDAY_SERVICE',
    rayon_id: input.rayon_id ?? null,
    worship_date: input.worship_date ?? '',
    worship_time: input.worship_time ?? null,
    location: input.location ?? null,
    theme: input.theme ?? null,
    bible_reading: input.bible_reading ?? null,
    liturgy_file_url: input.liturgy_file_url ?? null,
    is_public: input.is_public ?? false,
  }
  const problems = worshipProblems(next)
  if (Object.keys(problems).length > 0)
    return invalid(c, 'Data jadwal ibadah belum benar.', problems)
  const rayon = await rayonName(c, next.rayon_id)
  if (rayon instanceof Response) return rayon

  const db = c.env.DB
  const [insert] = await db.batch([
    db
      .prepare(
        `INSERT INTO worship_schedules (title, category, rayon_id, worship_date, worship_time,
           location, theme, bible_reading, liturgy_file_url, is_public)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10) RETURNING id`,
      )
      .bind(...columnValues(next)),
    auditStatement(c, {
      action: 'CREATE',
      entityType: 'worship_schedules',
      entityId: LAST_INSERT_ID,
      label: worshipLabel(next),
      after: worshipAuditView(next, rayon),
    }),
  ])
  const id = (insert.results[0] as { id: number }).id
  return respond(c, await mustFind(c, id), 201)
})

// PRD menyebut PUT; PATCH diterima dengan arti yang sama. Field yang tidak dikirim tidak
// diubah. Petugas tetap melekat, sehingga memindah tanggal atau jam bisa memunculkan
// peringatan bentrok baru.
worships.on(['PUT', 'PATCH'], '/:id', requireRole(...PLANNERS), async (c) => {
  const id = positiveInt(c.req.param('id'))
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data jadwal ibadah tidak valid.' }, 400)

  const { input, details } = parseWorshipInput(body, 'update')
  if (Object.keys(details).length > 0) return invalid(c, 'Data jadwal ibadah belum benar.', details)
  if (Object.keys(input).length === 0) {
    return c.json<ApiErrorBody>({ error: 'Tidak ada data yang diubah.' }, 400)
  }

  const db = c.env.DB
  const current = id ? await findWorship(db, id) : null
  if (!id || !current) return c.json<ApiErrorBody>({ error: NOT_FOUND }, 404)

  const before = worshipFields(current)
  const next: WorshipFields = { ...before, ...input }
  const problems = worshipProblems(next)
  if (current.attendance_total !== null && next.worship_date > witaToday()) {
    problems.worship_date = [
      'Kehadiran ibadah ini sudah dicatat, jadi tanggalnya tidak bisa dipindah ke hari mendatang.',
    ]
  }
  if (Object.keys(problems).length > 0)
    return invalid(c, 'Data jadwal ibadah belum benar.', problems)
  const rayon =
    next.rayon_id === current.rayon_id ? current.rayon_name : await rayonName(c, next.rayon_id)
  if (rayon instanceof Response) return rayon

  const beforeView = worshipAuditView(before, current.rayon_name)
  const afterView = worshipAuditView(next, rayon)
  if (Object.keys(diffChanges(beforeView, afterView)).length === 0) return respond(c, current)

  await db.batch([
    db
      .prepare(
        `UPDATE worship_schedules
         SET title = ?2, category = ?3, rayon_id = ?4, worship_date = ?5, worship_time = ?6,
             location = ?7, theme = ?8, bible_reading = ?9, liturgy_file_url = ?10,
             is_public = ?11, updated_at = datetime('now')
         WHERE id = ?1`,
      )
      .bind(id, ...columnValues(next)),
    auditStatement(c, {
      action: 'UPDATE',
      entityType: 'worship_schedules',
      entityId: id,
      label: worshipLabel(next),
      before: beforeView,
      after: afterView,
    }),
  ])
  return respond(c, await mustFind(c, id))
})

// Menyimpan susunan petugas lengkap satu ibadah, menggantikan susunan sebelumnya
// (daftar kosong mengosongkan petugas). Petugas yang terhubung ke data jemaat
// (member_id) boleh tanpa nama; namanya diambil dari data jemaat. Bentrok dengan ibadah
// lain pada tanggal dan jam yang sama tetap disimpan dan dilaporkan di warnings.
worships.on(['POST', 'PUT'], '/:id/servants', requireRole(...PLANNERS), async (c) => {
  const id = positiveInt(c.req.param('id'))
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data petugas tidak valid.' }, 400)

  const { servants, details } = parseServantsInput(body)
  if (Object.keys(details).length > 0) return invalid(c, 'Daftar petugas belum benar.', details)

  const db = c.env.DB
  const current = id ? await findWorship(db, id) : null
  if (!id || !current) return c.json<ApiErrorBody>({ error: NOT_FOUND }, 404)

  const memberIds = [...new Set(servants.flatMap((servant) => servant.member_id ?? []))]
  const members = new Map<number, string>()
  if (memberIds.length > 0) {
    const { results } = await db
      .prepare('SELECT id, full_name FROM members WHERE id IN (SELECT value FROM json_each(?1))')
      .bind(JSON.stringify(memberIds))
      .all<{ id: number; full_name: string }>()
    for (const member of results) members.set(member.id, member.full_name)
  }
  const resolved = servants.map((servant, index) => {
    const memberName = servant.member_id === null ? null : members.get(servant.member_id)
    if (memberName === undefined) {
      details[`servants.${index}.member_id`] = ['Anggota jemaat tidak ditemukan.']
    }
    return { ...servant, servant_name: servant.servant_name ?? memberName ?? '' }
  })
  if (Object.keys(details).length > 0) return invalid(c, 'Daftar petugas belum benar.', details)

  // Tidak berubah bila susunannya sama menurut urutan tata ibadah.
  const links = (list: { role: ServantRole; servant_name: string; member_id: number | null }[]) =>
    JSON.stringify(
      [...list]
        .sort((a, b) => SERVANT_ROLES.indexOf(a.role) - SERVANT_ROLES.indexOf(b.role))
        .map(({ role, servant_name, member_id }) => [role, servant_name, member_id]),
    )
  const sameLinks = links(current.servants) === links(resolved)
  if (sameLinks) return respond(c, current)

  await db.batch([
    db.prepare('DELETE FROM worship_servants WHERE schedule_id = ?1').bind(id),
    db
      .prepare(
        `INSERT INTO worship_servants (schedule_id, role, servant_name, member_id)
         SELECT ?1, json_extract(value, '$.role'), json_extract(value, '$.servant_name'),
                json_extract(value, '$.member_id')
         FROM json_each(?2)
         ORDER BY key`,
      )
      .bind(id, JSON.stringify(resolved)),
    db.prepare(`UPDATE worship_schedules SET updated_at = datetime('now') WHERE id = ?1`).bind(id),
    auditStatement(c, {
      action: 'UPDATE',
      entityType: 'worship_servants',
      entityId: id,
      label: worshipLabel(current),
      before: { servants: servantsAuditText(current.servants) },
      after: { servants: servantsAuditText(resolved) },
    }),
  ])
  return respond(c, await mustFind(c, id))
})

// Kehadiran Pria, Wanita, dan Anak/Pemuda setelah ibadah berlangsung (hari ini atau
// sebelumnya, WITA). Angka yang tidak dikirim tidak diubah, null mengosongkan; total
// dihitung database (kolom attendance_total).
worships.patch('/:id/attendance', async (c) => {
  const id = positiveInt(c.req.param('id'))
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data kehadiran tidak valid.' }, 400)

  const { input, details } = parseAttendanceInput(body)
  if (Object.keys(details).length > 0) return invalid(c, 'Data kehadiran belum benar.', details)
  if (Object.keys(input).length === 0) {
    return c.json<ApiErrorBody>(
      { error: 'Kirim minimal satu angka kehadiran: Pria, Wanita, atau Anak/Pemuda.' },
      400,
    )
  }

  const db = c.env.DB
  const current = id ? await findWorship(db, id) : null
  if (!id || !current) return c.json<ApiErrorBody>({ error: NOT_FOUND }, 404)
  if (current.worship_date > witaToday()) {
    return c.json<ApiErrorBody>(
      { error: 'Kehadiran baru dapat dicatat setelah ibadah berlangsung.' },
      409,
    )
  }

  const before = Object.fromEntries(
    ATTENDANCE_FIELDS.map((field) => [field, current[field]]),
  ) as AttendanceFields
  const next: AttendanceFields = { ...before, ...input }
  if (Object.keys(diffChanges(before, next)).length === 0) return respond(c, current)

  await db.batch([
    db
      .prepare(
        `UPDATE worship_schedules
         SET attendance_men = ?2, attendance_women = ?3, attendance_youth_children = ?4,
             updated_at = datetime('now')
         WHERE id = ?1`,
      )
      .bind(id, next.attendance_men, next.attendance_women, next.attendance_youth_children),
    auditStatement(c, {
      action: 'UPDATE',
      entityType: 'worship_schedules',
      entityId: id,
      label: worshipLabel(current),
      before,
      after: next,
    }),
  ])
  return respond(c, await mustFind(c, id))
})

function respond(c: Ctx, worship: WorshipItem, status: 200 | 201 = 200) {
  return c.json<WorshipResponse>({ worship, warnings: conflictWarnings(worship) }, status)
}

// title, category, rayon_id, worship_date, worship_time, location, theme, bible_reading,
// liturgy_file_url, is_public
function columnValues(next: WorshipFields) {
  return [
    next.title,
    next.category,
    next.rayon_id,
    next.worship_date,
    next.worship_time,
    next.location,
    next.theme,
    next.bible_reading,
    next.liturgy_file_url,
    next.is_public ? 1 : 0,
  ]
}

// Nama rayon untuk Log Aktivitas, atau respons 400 bila rayonnya tidak ada.
async function rayonName(c: Ctx, rayonId: number | null): Promise<string | null | Response> {
  if (rayonId === null) return null
  const row = await c.env.DB.prepare('SELECT name FROM rayons WHERE id = ?1')
    .bind(rayonId)
    .first<{ name: string }>()
  return row
    ? row.name
    : invalid(c, 'Data jadwal ibadah belum benar.', { rayon_id: ['Rayon tidak ditemukan.'] })
}

async function mustFind(c: Ctx, id: number) {
  const worship = await findWorship(c.env.DB, id)
  if (!worship) throw new Error(`Jadwal ibadah ${id} tidak ditemukan setelah disimpan`)
  return worship
}

export default worships
