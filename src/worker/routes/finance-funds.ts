import { Hono, type Context } from 'hono'
import { parseFundInput, type FundFields } from '../../shared/finance'
import type { ApiErrorBody, ApiList, FinanceFund, FinanceFundResponse } from '../../shared/types'
import { LAST_INSERT_ID, auditStatement, diffChanges } from '../lib/audit'
import {
  FINANCE_READERS,
  FINANCE_WRITERS,
  FUND_SELECT,
  findFund,
  fundAuditView,
  fundLabel,
  toFund,
} from '../lib/finance'
import { invalid, positiveInt, readJsonObject, runBatch } from '../lib/request'
import { requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

// Pos Kas (PRD, Keuangan Multi-Pos): Kas Umum/Sinode, Pembangunan, Diakonia, dan pos
// lain yang ditentukan Bendahara. Semua pengurus dapat melihat; menambah, mengubah,
// menonaktifkan, dan menghapus khusus Bendahara (dan Admin).
//
// current_balance tidak pernah diterima dari body: saldo hanya berubah lewat transaksi.
// GET / query opsional: is_active=true|false.
const funds = new Hono<AppEnv>()

funds.use(requireRole(...FINANCE_READERS))

type Ctx = Context<AppEnv>

const DUPLICATE_CODE = 'Kode Pos Kas sudah dipakai.'

funds.get('/', async (c) => {
  const active = c.req.query('is_active')
  if (active !== undefined && active !== 'true' && active !== 'false') {
    return invalid(c, 'Filter Pos Kas tidak valid.', { is_active: ['Isi true atau false.'] })
  }
  const where = active === undefined ? '' : `WHERE f.is_active = ${active === 'true' ? 1 : 0}`
  const { results } = await c.env.DB.prepare(
    `${FUND_SELECT} ${where} ORDER BY f.is_active DESC, f.code`,
  ).all<Parameters<typeof toFund>[0]>()
  return c.json<ApiList<FinanceFund>>({ data: results.map(toFund) })
})

funds.get('/:id', async (c) => {
  const id = positiveInt(c.req.param('id'))
  const fund = id ? await findFund(c.env.DB, id) : null
  if (!fund) return c.json<ApiErrorBody>({ error: 'Pos Kas tidak ditemukan.' }, 404)
  return c.json<FinanceFundResponse>({ fund })
})

funds.post('/', requireRole(...FINANCE_WRITERS), async (c) => {
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data Pos Kas tidak valid.' }, 400)

  const { input, details } = parseFundInput(body, 'create')
  if (Object.keys(details).length > 0) return invalid(c, 'Data Pos Kas belum benar.', details)
  const next: FundFields = {
    code: input.code ?? '',
    name: input.name ?? '',
    description: input.description ?? null,
    is_active: input.is_active ?? true,
  }

  const taken = await codeTaken(c, next.code, null)
  if (taken) return taken

  const db = c.env.DB
  const result = await runBatch(
    c,
    [
      db
        .prepare(
          `INSERT INTO finance_funds (code, name, description, is_active)
           VALUES (?1, ?2, ?3, ?4) RETURNING id`,
        )
        .bind(next.code, next.name, next.description, next.is_active ? 1 : 0),
      auditStatement(c, {
        action: 'CREATE',
        entityType: 'finance_funds',
        entityId: LAST_INSERT_ID,
        label: fundLabel(next.code, next.name),
        after: fundAuditView(next),
      }),
    ],
    DUPLICATE_CODE,
  )
  if (result instanceof Response) return result

  const id = (result[0].results[0] as { id: number }).id
  return c.json<FinanceFundResponse>({ fund: await mustFind(c, id) }, 201)
})

// PRD menyebut PUT; PATCH diterima dengan arti yang sama. Field yang tidak dikirim
// tidak diubah. Pos Kas yang dinonaktifkan tetap terlihat beserta saldonya, tetapi
// tidak bisa dipakai untuk transaksi atau mata anggaran baru.
funds.on(['PUT', 'PATCH'], '/:id', requireRole(...FINANCE_WRITERS), async (c) => {
  const id = positiveInt(c.req.param('id'))
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data Pos Kas tidak valid.' }, 400)

  const { input, details } = parseFundInput(body, 'update')
  if (Object.keys(details).length > 0) return invalid(c, 'Data Pos Kas belum benar.', details)
  if (Object.keys(input).length === 0) {
    return c.json<ApiErrorBody>({ error: 'Tidak ada data yang diubah.' }, 400)
  }

  const db = c.env.DB
  const current = id ? await findFund(db, id) : null
  if (!id || !current) return c.json<ApiErrorBody>({ error: 'Pos Kas tidak ditemukan.' }, 404)

  const before = fundAuditView(current)
  const next: FundFields = { ...before, ...input }
  if (Object.keys(diffChanges(before, fundAuditView(next))).length === 0) {
    return c.json<FinanceFundResponse>({ fund: current })
  }

  const taken = await codeTaken(c, next.code, id)
  if (taken) return taken

  const result = await runBatch(
    c,
    [
      db
        .prepare(
          `UPDATE finance_funds
           SET code = ?2, name = ?3, description = ?4, is_active = ?5, updated_at = datetime('now')
           WHERE id = ?1`,
        )
        .bind(id, next.code, next.name, next.description, next.is_active ? 1 : 0),
      auditStatement(c, {
        action: 'UPDATE',
        entityType: 'finance_funds',
        entityId: id,
        label: fundLabel(next.code, next.name),
        before,
        after: fundAuditView(next),
      }),
    ],
    DUPLICATE_CODE,
  )
  if (result instanceof Response) return result

  return c.json<FinanceFundResponse>({ fund: await mustFind(c, id) })
})

// Hanya Pos Kas yang belum dipakai, mis. yang salah dibuat. Pos Kas yang sudah punya
// mata anggaran atau transaksi dinonaktifkan saja agar riwayatnya tetap utuh.
funds.delete('/:id', requireRole(...FINANCE_WRITERS), async (c) => {
  const id = positiveInt(c.req.param('id'))
  const db = c.env.DB
  const fund = id ? await findFund(db, id) : null
  if (!id || !fund) return c.json<ApiErrorBody>({ error: 'Pos Kas tidak ditemukan.' }, 404)

  if (fund.budget_count > 0 || fund.transaction_count > 0) {
    const usage = [
      fund.budget_count > 0 && `${fund.budget_count} mata anggaran`,
      fund.transaction_count > 0 && `${fund.transaction_count} transaksi`,
    ]
      .filter(Boolean)
      .join(' dan ')
    return c.json<ApiErrorBody>(
      {
        error: `Pos Kas ${fund.code} sudah dipakai ${usage}. Nonaktifkan saja agar riwayatnya tetap utuh.`,
      },
      409,
    )
  }

  await db.batch([
    db.prepare('DELETE FROM finance_funds WHERE id = ?1').bind(id),
    auditStatement(c, {
      action: 'DELETE',
      entityType: 'finance_funds',
      entityId: id,
      label: fundLabel(fund.code, fund.name),
      before: fundAuditView(fund),
    }),
  ])
  return c.body(null, 204)
})

// Kode Pos Kas unik tanpa membedakan huruf besar/kecil (kolom COLLATE NOCASE).
async function codeTaken(c: Ctx, code: string, excludeId: number | null) {
  const row = await c.env.DB.prepare(
    'SELECT name FROM finance_funds WHERE code = ?1 AND id IS NOT ?2',
  )
    .bind(code, excludeId)
    .first<{ name: string }>()
  if (!row) return null
  return c.json<ApiErrorBody>(
    { error: DUPLICATE_CODE, details: { code: [`Kode ${code} sudah dipakai ${row.name}.`] } },
    409,
  )
}

async function mustFind(c: Ctx, id: number) {
  const fund = await findFund(c.env.DB, id)
  if (!fund) throw new Error(`Pos Kas ${id} tidak ditemukan setelah disimpan`)
  return fund
}

export default funds
