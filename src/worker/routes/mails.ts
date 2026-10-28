import { Hono } from 'hono'
import type { FieldErrors } from '../../shared/accounts'
import { isCalendarDate, witaToday } from '../../shared/dates'
import { parseMailInput, type MailFields } from '../../shared/mails'
import {
  MAIL_CATEGORIES,
  MAIL_DIRECTIONS,
  type ApiErrorBody,
  type MailArchive,
  type MailDirection,
  type MailPage,
  type MailResponse,
} from '../../shared/types'
import { LAST_INSERT_ID, auditStatement } from '../lib/audit'
import {
  containsPattern,
  invalid,
  positiveInt,
  readJsonObject,
  readPaging,
  searchWords,
  whereBuilder,
} from '../lib/request'
import { requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

// Buku Agenda Surat Masuk & Keluar (PRD: Arsip Persuratan): atestasi/surat pindah
// jemaat, surat tugas pelayanan, undangan klasis/sinode, dan surat lain beserta salinan
// digitalnya. Khusus Admin, sama dengan folder unggahan `surat`.
//
// Salinan diunggah dulu ke POST /api/uploads (folder surat), lalu URL-nya dikirim
// sebagai file_url. Menghapus catatan tidak menghapus berkasnya di R2, sama seperti
// konten portal.
//
// GET / query opsional: direction (INCOMING/OUTGOING), category, q (nomor, pengirim/
// penerima, perihal), from, to (tanggal surat, inklusif), page, per_page. Urut tanggal
// surat terbaru dulu. Respons menyertakan counts: jumlah per arah untuk filter lain yang
// sama.
const mails = new Hono<AppEnv>()

mails.use(requireRole('ADMIN'))

const SELECT = `
  SELECT id, direction, reference_number, mail_date, sender_or_recipient, subject,
         category, file_url,
         strftime('%Y-%m-%dT%H:%M:%SZ', created_at) AS created_at,
         strftime('%Y-%m-%dT%H:%M:%SZ', updated_at) AS updated_at
  FROM mail_archives`

function mailLabel(mail: Pick<MailFields, 'direction' | 'reference_number' | 'subject'>) {
  const kind = mail.direction === 'INCOMING' ? 'Masuk' : 'Keluar'
  return `${kind}${mail.reference_number ? ` ${mail.reference_number}` : ''}: ${mail.subject}`
}

mails.get('/', async (c) => {
  const query = c.req.query()
  const details: FieldErrors = {}
  const where = whereBuilder()
  const { page, perPage } = readPaging(query, details)

  if (query.category !== undefined) {
    const category = query.category.trim().toUpperCase()
    if (!(MAIL_CATEGORIES as string[]).includes(category)) {
      details.category = [`Pilih salah satu: ${MAIL_CATEGORIES.join(', ')}.`]
    } else where.add('category = ?', category)
  }
  const { from, to } = query
  if (from !== undefined && !isCalendarDate(from)) details.from = ['Tanggal awal harus YYYY-MM-DD.']
  if (to !== undefined && !isCalendarDate(to)) details.to = ['Tanggal akhir harus YYYY-MM-DD.']
  if (!details.from && !details.to && from && to && from > to) {
    details.to = ['Tanggal akhir tidak boleh sebelum tanggal awal.']
  }
  if (from && !details.from) where.add('mail_date >= ?', from)
  if (to && !details.to) where.add('mail_date <= ?', to)
  if (query.q !== undefined) {
    const words = searchWords(query.q)
    if (words === null) details.q = ['Kata pencarian maksimal 100 karakter.']
    for (const word of words ?? []) {
      where.add(
        `(reference_number LIKE ? ESCAPE '\\' OR sender_or_recipient LIKE ? ESCAPE '\\'
          OR subject LIKE ? ESCAPE '\\')`,
        containsPattern(word),
      )
    }
  }
  // Hitungan per arah mengikuti filter lain, bukan filter arah.
  const countWhere = { sql: where.sql, params: [...where.params] }
  let direction: MailDirection | null = null
  if (query.direction !== undefined) {
    const value = query.direction.trim().toUpperCase()
    if (!(MAIL_DIRECTIONS as string[]).includes(value)) {
      details.direction = ['Isi INCOMING (surat masuk) atau OUTGOING (surat keluar).']
    } else {
      direction = value as MailDirection
      where.add('direction = ?', direction)
    }
  }
  if (Object.keys(details).length > 0) return invalid(c, 'Filter arsip surat tidak valid.', details)

  const db = c.env.DB
  const count = where.params.length
  const [counts, list] = await db.batch([
    db
      .prepare(
        `SELECT direction, COUNT(*) AS n FROM mail_archives ${countWhere.sql} GROUP BY direction`,
      )
      .bind(...countWhere.params),
    db
      .prepare(
        `${SELECT} ${where.sql}
         ORDER BY mail_date DESC, id DESC
         LIMIT ?${count + 1} OFFSET ?${count + 2}`,
      )
      .bind(...where.params, perPage, (page - 1) * perPage),
  ])
  const byDirection: Record<MailDirection, number> = { INCOMING: 0, OUTGOING: 0 }
  for (const row of counts.results as { direction: MailDirection; n: number }[]) {
    byDirection[row.direction] = row.n
  }
  return c.json<MailPage>({
    data: list.results as MailArchive[],
    meta: {
      page,
      per_page: perPage,
      total: direction ? byDirection[direction] : byDirection.INCOMING + byDirection.OUTGOING,
    },
    counts: byDirection,
  })
})

mails.post('/', async (c) => {
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data surat tidak valid.' }, 400)

  const { input, details } = parseMailInput(body, witaToday())
  if (Object.keys(details).length > 0) return invalid(c, 'Data surat belum benar.', details)
  const mail: MailFields = {
    direction: input.direction ?? 'INCOMING',
    reference_number: input.reference_number ?? null,
    mail_date: input.mail_date ?? '',
    sender_or_recipient: input.sender_or_recipient ?? '',
    subject: input.subject ?? '',
    category: input.category ?? 'UMUM',
    file_url: input.file_url ?? null,
  }

  const db = c.env.DB
  const [insert] = await db.batch([
    db
      .prepare(
        `INSERT INTO mail_archives (direction, reference_number, mail_date,
           sender_or_recipient, subject, category, file_url)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) RETURNING id`,
      )
      .bind(
        mail.direction,
        mail.reference_number,
        mail.mail_date,
        mail.sender_or_recipient,
        mail.subject,
        mail.category,
        mail.file_url,
      ),
    auditStatement(c, {
      action: 'CREATE',
      entityType: 'mail_archives',
      entityId: LAST_INSERT_ID,
      label: mailLabel(mail),
      after: mail,
    }),
  ])
  const id = (insert.results[0] as { id: number }).id
  const saved = await db.prepare(`${SELECT} WHERE id = ?1`).bind(id).first<MailArchive>()
  if (!saved) throw new Error(`Surat ${id} tidak ditemukan setelah disimpan`)
  return c.json<MailResponse>({ mail: saved }, 201)
})

mails.delete('/:id', async (c) => {
  const id = positiveInt(c.req.param('id'))
  const db = c.env.DB
  const current = id
    ? await db.prepare(`${SELECT} WHERE id = ?1`).bind(id).first<MailArchive>()
    : null
  if (!id || !current) return c.json<ApiErrorBody>({ error: 'Surat tidak ditemukan.' }, 404)

  const { id: _id, created_at: _created, updated_at: _updated, ...fields } = current
  await db.batch([
    db.prepare('DELETE FROM mail_archives WHERE id = ?1').bind(id),
    auditStatement(c, {
      action: 'DELETE',
      entityType: 'mail_archives',
      entityId: id,
      label: mailLabel(current),
      before: fields,
    }),
  ])
  return c.body(null, 204)
})

export default mails
