import { Hono, type Context } from 'hono'
import type { FieldErrors } from '../../shared/accounts'
import { witaToday } from '../../shared/dates'
import { parseStatusInput, statusProblems, type StatusFields } from '../../shared/sacraments'
import {
  MEMBER_STATUS_LABELS,
  SACRAMENT_STATUSES,
  SACRAMENT_TYPES,
  type ApiErrorBody,
  type MemberStatus,
  type SacramentDetail,
  type SacramentListItem,
  type SacramentMemberUpdate,
  type SacramentPage,
  type SacramentResponse,
  type SacramentStatus,
} from '../../shared/types'
import { auditStatement, diffChanges } from '../lib/audit'
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
import {
  APPLICATION_SELECT,
  applicationLabel,
  findApplication,
  nextCertificateNumber,
  statusAuditView,
  statusFields,
} from '../lib/sacraments'
import { requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

// Antrean pendaftaran sakramen dan buku induknya (PRD: Verifikasi & Antrean Layanan
// Pastoral). Admin dan Pendeta memeriksa berkas dan mengubah status:
// PENDING (Menunggu verifikasi) → REVISION (Revisi berkas) / COUNSELING
// (Konseling/penggembalaan) → APPROVED (Disetujui) → COMPLETED (Selesai).
//
// Saat Selesai, pendaftaran masuk buku induk dengan nomor register (diisi manual atau
// dibuat otomatis, mis. BPT-2026-007), dan anggota jemaat yang ditautkan diperbarui
// dalam transaksi yang sama: baptis/sidi menjadi Sudah dengan tanggalnya, atau status
// nikah menjadi Menikah untuk kedua mempelai. Pendaftaran yang sudah Selesai terkunci.
//
// GET / query opsional: type, status, q (nama, kode, nomor HP, nomor register),
// sort (newest bawaan, oldest, scheduled), page, per_page. Respons menyertakan counts:
// jumlah per status untuk jenis dan pencarian yang sama.
const sacraments = new Hono<AppEnv>()

sacraments.use(requireRole('ADMIN', 'PASTOR'))

type Ctx = Context<AppEnv>

const NOT_FOUND = 'Pendaftaran tidak ditemukan.'

const ORDERS: Record<string, string> = {
  newest: 'a.created_at DESC, a.id DESC',
  oldest: 'a.created_at, a.id',
  // Pelaksanaan terdekat dulu; yang belum dijadwalkan di akhir.
  scheduled: 'a.scheduled_date IS NULL, a.scheduled_date, a.scheduled_time, a.id',
}

sacraments.get('/', async (c) => {
  const query = c.req.query()
  const details: FieldErrors = {}
  const where = whereBuilder()
  const { page, perPage } = readPaging(query, details)

  if (query.type !== undefined) {
    const type = query.type.trim().toUpperCase()
    if (!(SACRAMENT_TYPES as string[]).includes(type)) {
      details.type = [`Pilih salah satu: ${SACRAMENT_TYPES.join(', ')}.`]
    } else where.add('a.type = ?', type)
  }
  if (query.q !== undefined) {
    const words = searchWords(query.q)
    if (words === null) details.q = ['Kata pencarian maksimal 100 karakter.']
    for (const word of words ?? []) {
      where.add(
        `(a.applicant_name LIKE ? ESCAPE '\\' OR a.registration_code LIKE ? ESCAPE '\\'
          OR a.phone LIKE ? ESCAPE '\\' OR a.certificate_number LIKE ? ESCAPE '\\')`,
        containsPattern(word),
      )
    }
  }
  // Hitungan per status mengikuti jenis dan pencarian, bukan filter status.
  const countWhere = { sql: where.sql, params: [...where.params] }
  let status: SacramentStatus | null = null
  if (query.status !== undefined) {
    const value = query.status.trim().toUpperCase()
    if (!(SACRAMENT_STATUSES as string[]).includes(value)) {
      details.status = [`Pilih salah satu: ${SACRAMENT_STATUSES.join(', ')}.`]
    } else {
      status = value as SacramentStatus
      where.add('a.status = ?', status)
    }
  }
  const sort = query.sort ?? 'newest'
  const order = Object.hasOwn(ORDERS, sort) ? ORDERS[sort] : null
  if (!order) details.sort = ['Isi newest, oldest, atau scheduled.']
  if (Object.keys(details).length > 0) return invalid(c, 'Filter pendaftaran tidak valid.', details)

  const db = c.env.DB
  const count = where.params.length
  const [counts, list] = await db.batch([
    db
      .prepare(
        `SELECT a.status, COUNT(*) AS n FROM sacrament_applications a ${countWhere.sql}
         GROUP BY a.status`,
      )
      .bind(...countWhere.params),
    db
      .prepare(
        `${APPLICATION_SELECT()} ${where.sql}
         ORDER BY ${order}
         LIMIT ?${count + 1} OFFSET ?${count + 2}`,
      )
      .bind(...where.params, perPage, (page - 1) * perPage),
  ])
  const byStatus = Object.fromEntries(SACRAMENT_STATUSES.map((value) => [value, 0])) as Record<
    SacramentStatus,
    number
  >
  for (const row of counts.results as { status: SacramentStatus; n: number }[]) {
    byStatus[row.status] = row.n
  }
  const total = status
    ? byStatus[status]
    : Object.values(byStatus).reduce((sum, value) => sum + value, 0)
  return c.json<SacramentPage>({
    data: list.results as SacramentListItem[],
    meta: { page, per_page: perPage, total },
    counts: byStatus,
  })
})

sacraments.get('/:id', async (c) => {
  const id = positiveInt(c.req.param('id'))
  const application = id ? await findApplication(c.env.DB, id) : null
  if (!application) return c.json<ApiErrorBody>({ error: NOT_FOUND }, 404)
  return c.json<SacramentResponse>({ application, member_updates: [] })
})

type MemberRow = {
  id: number
  full_name: string
  status: MemberStatus
  baptism_status: number
  baptism_date: string | null
  sidi_status: number
  sidi_date: string | null
  marriage_status: string | null
  marriage_date: string | null
}

const LONG_DATE = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const longDate = (date: string) => LONG_DATE.format(Date.parse(`${date}T00:00:00Z`))

sacraments.patch('/:id/status', async (c) => {
  const id = positiveInt(c.req.param('id'))
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data status tidak valid.' }, 400)

  const { input, details } = parseStatusInput(body)
  if (Object.keys(details).length > 0) return invalid(c, 'Perubahan status belum benar.', details)

  const db = c.env.DB
  const current = id ? await findApplication(db, id) : null
  if (!id || !current) return c.json<ApiErrorBody>({ error: NOT_FOUND }, 404)
  if (current.status === 'COMPLETED') {
    return c.json<ApiErrorBody>(
      {
        error:
          'Pendaftaran ini sudah selesai dan tercatat di buku induk, sehingga tidak dapat diubah lagi.',
      },
      409,
    )
  }

  const today = witaToday()
  const before = statusFields(current)
  const next: StatusFields = { ...before, ...input }
  const problems = statusProblems(current.type, next, today)

  // Anggota jemaat yang ditautkan, untuk nama di log dan pembaruan saat Selesai.
  const linked = [next.member_id, next.partner_member_id].filter((value) => value !== null)
  const members = new Map<number, MemberRow>()
  if (linked.length > 0) {
    const { results } = await db
      .prepare(
        `SELECT id, full_name, status, baptism_status, baptism_date, sidi_status, sidi_date,
                marriage_status, marriage_date
         FROM members WHERE id IN (SELECT value FROM json_each(?1))`,
      )
      .bind(JSON.stringify(linked))
      .all<MemberRow>()
    for (const member of results) members.set(member.id, member)
  }
  for (const key of ['member_id', 'partner_member_id'] as const) {
    const memberId = next[key]
    if (memberId !== null && !members.has(memberId) && !problems[key]) {
      problems[key] = ['Anggota jemaat tidak ditemukan.']
    }
  }

  const completing = next.status === 'COMPLETED'
  if (completing && next.scheduled_date && !problems.scheduled_date) {
    for (const key of ['member_id', 'partner_member_id'] as const) {
      const member = next[key] === null ? undefined : members.get(next[key])
      if (!member || problems[key]) continue
      const problem = memberProblem(current.type, member, next.scheduled_date)
      if (problem) problems[key] = [problem]
    }
  }
  if (Object.keys(problems).length > 0) {
    return invalid(c, 'Perubahan status belum lengkap.', problems)
  }

  if (completing && !next.certificate_number && next.scheduled_date) {
    next.certificate_number = await nextCertificateNumber(
      db,
      current.type,
      next.scheduled_date.slice(0, 4),
    )
  }
  if (next.certificate_number && next.certificate_number !== before.certificate_number) {
    const taken = await db
      .prepare(
        `SELECT registration_code FROM sacrament_applications
         WHERE type = ?1 AND certificate_number = ?2 AND id <> ?3`,
      )
      .bind(current.type, next.certificate_number, id)
      .first<{ registration_code: string }>()
    if (taken) {
      return c.json<ApiErrorBody>(
        {
          error: 'Nomor register sudah dipakai.',
          details: {
            certificate_number: [
              `Nomor ${next.certificate_number} sudah dipakai pendaftaran ${taken.registration_code}.`,
            ],
          },
        },
        409,
      )
    }
  }

  const name = (memberId: number | null) =>
    memberId === null ? null : (members.get(memberId)?.full_name ?? null)
  const beforeView = statusAuditView(before, {
    member: current.member_name,
    partner: current.partner_name,
  })
  const afterView = statusAuditView(next, {
    member: name(next.member_id),
    partner: name(next.partner_member_id),
  })
  if (Object.keys(diffChanges(beforeView, afterView)).length === 0) {
    return c.json<SacramentResponse>({ application: current, member_updates: [] })
  }

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `UPDATE sacrament_applications
         SET status = ?2, notes = ?3, counseling_date = ?4, counseling_time = ?5,
             scheduled_date = ?6, scheduled_time = ?7, officiating_pastor = ?8,
             certificate_number = ?9, member_id = ?10, partner_member_id = ?11,
             updated_at = datetime('now')
         WHERE id = ?1`,
      )
      .bind(
        id,
        next.status,
        next.notes,
        next.counseling_date,
        next.counseling_time,
        next.scheduled_date,
        next.scheduled_time,
        next.officiating_pastor,
        next.certificate_number,
        next.member_id,
        next.partner_member_id,
      ),
    auditStatement(c, {
      action: 'UPDATE',
      entityType: 'sacrament_applications',
      entityId: id,
      label: applicationLabel(current),
      before: beforeView,
      after: afterView,
    }),
  ]

  const memberUpdates: SacramentMemberUpdate[] = []
  if (completing && next.scheduled_date) {
    for (const memberId of [next.member_id, next.partner_member_id]) {
      const member = memberId === null ? undefined : members.get(memberId)
      if (!member) continue
      const update = memberUpdate(c, current, member, next.scheduled_date)
      statements.push(...update.statements)
      memberUpdates.push(update.summary)
    }
  }

  const result = await runBatch(
    c,
    statements,
    'Nomor register baru saja dipakai pendaftaran lain. Muat ulang lalu coba lagi.',
  )
  if (result instanceof Response) return result

  const application = await findApplication(db, id)
  if (!application) throw new Error(`Pendaftaran ${id} tidak ditemukan setelah disimpan`)
  return c.json<SacramentResponse>({ application, member_updates: memberUpdates })
})

// Alasan anggota ini tidak bisa diperbarui saat pendaftaran Selesai, atau null.
function memberProblem(
  type: SacramentDetail['type'],
  member: MemberRow,
  date: string,
): string | null {
  if (member.status !== 'ACTIVE') {
    return `${member.full_name} berstatus ${MEMBER_STATUS_LABELS[member.status]}; tautkan anggota jemaat yang aktif.`
  }
  const recorded =
    type === 'BAPTISM'
      ? member.baptism_status === 1 && member.baptism_date
      : type === 'SIDI'
        ? member.sidi_status === 1 && member.sidi_date
        : member.marriage_status === 'MARRIED' && member.marriage_date
  const recordedDate =
    type === 'BAPTISM'
      ? member.baptism_date
      : type === 'SIDI'
        ? member.sidi_date
        : member.marriage_date
  if (recorded && recordedDate !== date) {
    const what = type === 'BAPTISM' ? 'dibaptis' : type === 'SIDI' ? 'diteguhkan sidi' : 'menikah'
    return `${member.full_name} sudah tercatat ${what} pada ${longDate(recordedDate ?? date)}. Periksa data jemaatnya terlebih dulu.`
  }
  return null
}

// Pembaruan status sakramen satu anggota jemaat beserta catatan Log Aktivitasnya.
function memberUpdate(c: Ctx, application: SacramentDetail, member: MemberRow, date: string) {
  const db = c.env.DB
  const when = longDate(date)
  const audit = (before: Record<string, unknown>, after: Record<string, unknown>) =>
    auditStatement(c, {
      action: 'UPDATE',
      entityType: 'members',
      entityId: member.id,
      label: member.full_name,
      before,
      after,
      details: { sacrament: application.registration_code },
    })

  if (application.type === 'BAPTISM' || application.type === 'SIDI') {
    const prefix = application.type === 'BAPTISM' ? 'baptism' : 'sidi'
    const done = (application.type === 'BAPTISM' ? member.baptism_status : member.sidi_status) === 1
    return {
      statements: [
        db
          .prepare(
            `UPDATE members SET ${prefix}_status = 1, ${prefix}_date = ?2,
               updated_at = datetime('now')
             WHERE id = ?1`,
          )
          .bind(member.id, date),
        audit(
          {
            [`${prefix}_status`]: done,
            [`${prefix}_date`]:
              application.type === 'BAPTISM' ? member.baptism_date : member.sidi_date,
          },
          { [`${prefix}_status`]: true, [`${prefix}_date`]: date },
        ),
      ],
      summary: {
        member_id: member.id,
        full_name: member.full_name,
        change: `${application.type === 'BAPTISM' ? 'Baptis' : 'Sidi'}: ${done ? 'Sudah' : 'Belum'} → Sudah (${when})`,
      },
    }
  }

  return {
    statements: [
      db
        .prepare(
          `UPDATE members SET marriage_status = 'MARRIED', marriage_date = ?2,
             updated_at = datetime('now')
           WHERE id = ?1`,
        )
        .bind(member.id, date),
      audit(
        { marriage_status: member.marriage_status, marriage_date: member.marriage_date },
        { marriage_status: 'MARRIED', marriage_date: date },
      ),
    ],
    summary: {
      member_id: member.id,
      full_name: member.full_name,
      change: `Status nikah: Menikah (${when})`,
    },
  }
}

export default sacraments
