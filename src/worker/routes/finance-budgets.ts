import { Hono, type Context } from 'hono'
import type { FieldErrors } from '../../shared/accounts'
import { parseBudgetInput, type BudgetFields } from '../../shared/finance'
import {
  FINANCE_TYPES,
  type ApiErrorBody,
  type ApiList,
  type FinanceBudget,
  type FinanceBudgetResponse,
} from '../../shared/types'
import { LAST_INSERT_ID, auditStatement, diffChanges } from '../lib/audit'
import {
  BUDGET_SELECT,
  FINANCE_READERS,
  FINANCE_WRITERS,
  budgetAuditView,
  budgetLabel,
  findBudget,
  toBudget,
} from '../lib/finance'
import {
  containsPattern,
  invalid,
  positiveInt,
  readJsonObject,
  runBatch,
  searchWords,
  whereBuilder,
} from '../lib/request'
import { requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

// Mata anggaran RAPBJ (PRD, Keuangan Multi-Pos): kode dan nama bebas ditentukan
// Bendahara, unik per tahun anggaran, masing-masing pada satu Pos Kas dengan target
// tahunan. realized_amount menjumlahkan transaksi yang dicatat pada mata anggaran itu.
// Semua pengurus dapat melihat; mengubah khusus Bendahara (dan Admin).
//
// GET / query opsional: fiscal_year, fund_id, type (INCOME/EXPENSE),
// is_active=true|false, q (kode atau nama).
const budgets = new Hono<AppEnv>()

budgets.use(requireRole(...FINANCE_READERS))

type Ctx = Context<AppEnv>

const DUPLICATE_CODE = 'Kode mata anggaran sudah dipakai di tahun anggaran ini.'

budgets.get('/', async (c) => {
  const query = c.req.query()
  const details: FieldErrors = {}
  const where = whereBuilder()

  if (query.fiscal_year !== undefined) {
    const year = positiveInt(query.fiscal_year)
    if (year === null || year < 2000 || year > 2100) {
      details.fiscal_year = ['Tahun anggaran antara 2000 dan 2100.']
    } else where.add('b.fiscal_year = ?', year)
  }
  if (query.fund_id !== undefined) {
    const fundId = positiveInt(query.fund_id)
    if (fundId === null) details.fund_id = ['Pos Kas tidak valid.']
    else where.add('b.fund_id = ?', fundId)
  }
  if (query.type !== undefined) {
    const type = query.type.trim().toUpperCase()
    if (!(FINANCE_TYPES as readonly string[]).includes(type)) {
      details.type = ['Isi INCOME (penerimaan) atau EXPENSE (pengeluaran).']
    } else where.add('b.type = ?', type)
  }
  if (query.is_active !== undefined) {
    if (query.is_active !== 'true' && query.is_active !== 'false') {
      details.is_active = ['Isi true atau false.']
    } else where.add('b.is_active = ?', query.is_active === 'true' ? 1 : 0)
  }
  if (query.q !== undefined) {
    const words = searchWords(query.q)
    if (words === null) details.q = ['Kata pencarian maksimal 100 karakter.']
    for (const word of words ?? []) {
      where.add(
        `(b.account_code LIKE ? ESCAPE '\\' OR b.account_name LIKE ? ESCAPE '\\')`,
        containsPattern(word),
      )
    }
  }
  if (Object.keys(details).length > 0) {
    return invalid(c, 'Filter mata anggaran tidak valid.', details)
  }

  // Urut seperti dokumen RAPBJ: tahun terbaru, penerimaan dulu, lalu kode.
  const { results } = await c.env.DB.prepare(
    `${BUDGET_SELECT} ${where.sql}
     ORDER BY b.fiscal_year DESC, CASE b.type WHEN 'INCOME' THEN 0 ELSE 1 END, b.account_code`,
  )
    .bind(...where.params)
    .all<Parameters<typeof toBudget>[0]>()
  return c.json<ApiList<FinanceBudget>>({ data: results.map(toBudget) })
})

budgets.get('/:id', async (c) => {
  const id = positiveInt(c.req.param('id'))
  const budget = id ? await findBudget(c.env.DB, id) : null
  if (!budget) return c.json<ApiErrorBody>({ error: 'Mata anggaran tidak ditemukan.' }, 404)
  return c.json<FinanceBudgetResponse>({ budget })
})

budgets.post('/', requireRole(...FINANCE_WRITERS), async (c) => {
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data mata anggaran tidak valid.' }, 400)

  const { input, details } = parseBudgetInput(body, 'create')
  if (Object.keys(details).length > 0) {
    return invalid(c, 'Data mata anggaran belum benar.', details)
  }
  const next: BudgetFields = {
    fund_id: input.fund_id ?? 0,
    fiscal_year: input.fiscal_year ?? 0,
    account_code: input.account_code ?? '',
    account_name: input.account_name ?? '',
    type: input.type ?? 'INCOME',
    target_amount: input.target_amount ?? 0,
    is_active: input.is_active ?? true,
  }

  const checked = await checkAgainstDatabase(c, next, null, true)
  if (checked instanceof Response) return checked

  const db = c.env.DB
  const result = await runBatch(
    c,
    [
      db
        .prepare(
          `INSERT INTO finance_budgets
             (fund_id, fiscal_year, account_code, account_name, type, target_amount, is_active)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) RETURNING id`,
        )
        .bind(
          next.fund_id,
          next.fiscal_year,
          next.account_code,
          next.account_name,
          next.type,
          next.target_amount,
          next.is_active ? 1 : 0,
        ),
      auditStatement(c, {
        action: 'CREATE',
        entityType: 'finance_budgets',
        entityId: LAST_INSERT_ID,
        label: budgetLabel(next),
        after: budgetAuditView(next, checked.fundCode),
      }),
    ],
    DUPLICATE_CODE,
  )
  if (result instanceof Response) return result

  const id = (result[0].results[0] as { id: number }).id
  return c.json<FinanceBudgetResponse>({ budget: await mustFind(c, id) }, 201)
})

// PRD menyebut PUT; PATCH diterima dengan arti yang sama. Field yang tidak dikirim
// tidak diubah. Pos Kas, jenis, dan tahun anggaran terkunci setelah ada transaksi,
// agar realisasinya tetap sesuai.
budgets.on(['PUT', 'PATCH'], '/:id', requireRole(...FINANCE_WRITERS), async (c) => {
  const id = positiveInt(c.req.param('id'))
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data mata anggaran tidak valid.' }, 400)

  const { input, details } = parseBudgetInput(body, 'update')
  if (Object.keys(details).length > 0) {
    return invalid(c, 'Data mata anggaran belum benar.', details)
  }
  if (Object.keys(input).length === 0) {
    return c.json<ApiErrorBody>({ error: 'Tidak ada data yang diubah.' }, 400)
  }

  const db = c.env.DB
  const current = id ? await findBudget(db, id) : null
  if (!id || !current) return c.json<ApiErrorBody>({ error: 'Mata anggaran tidak ditemukan.' }, 404)

  const stored: BudgetFields = {
    fund_id: current.fund_id,
    fiscal_year: current.fiscal_year,
    account_code: current.account_code,
    account_name: current.account_name,
    type: current.type,
    target_amount: current.target_amount,
    is_active: current.is_active,
  }
  const next: BudgetFields = { ...stored, ...input }

  const used = await db
    .prepare('SELECT COUNT(*) AS n FROM finance_transactions WHERE budget_id = ?1')
    .bind(id)
    .first<{ n: number }>()
  if (used && used.n > 0) {
    const locked: FieldErrors = {}
    const reason = `Sudah dipakai ${used.n} transaksi, jadi tidak bisa diubah.`
    if (next.fund_id !== stored.fund_id) locked.fund_id = [reason]
    if (next.type !== stored.type) locked.type = [reason]
    if (next.fiscal_year !== stored.fiscal_year) locked.fiscal_year = [reason]
    if (Object.keys(locked).length > 0) {
      return c.json<ApiErrorBody>(
        { error: 'Mata anggaran ini sudah dipakai transaksi.', details: locked },
        409,
      )
    }
  }

  const checked = await checkAgainstDatabase(c, next, id, next.fund_id !== stored.fund_id)
  if (checked instanceof Response) return checked

  const before = budgetAuditView(stored, current.fund_code)
  const after = budgetAuditView(next, checked.fundCode)
  if (Object.keys(diffChanges(before, after)).length === 0) {
    return c.json<FinanceBudgetResponse>({ budget: current })
  }

  const result = await runBatch(
    c,
    [
      db
        .prepare(
          `UPDATE finance_budgets
           SET fund_id = ?2, fiscal_year = ?3, account_code = ?4, account_name = ?5, type = ?6,
               target_amount = ?7, is_active = ?8, updated_at = datetime('now')
           WHERE id = ?1`,
        )
        .bind(
          id,
          next.fund_id,
          next.fiscal_year,
          next.account_code,
          next.account_name,
          next.type,
          next.target_amount,
          next.is_active ? 1 : 0,
        ),
      auditStatement(c, {
        action: 'UPDATE',
        entityType: 'finance_budgets',
        entityId: id,
        label: budgetLabel(next),
        before,
        after,
      }),
    ],
    DUPLICATE_CODE,
  )
  if (result instanceof Response) return result

  return c.json<FinanceBudgetResponse>({ budget: await mustFind(c, id) })
})

// Hanya mata anggaran tanpa transaksi; yang sudah dipakai dinonaktifkan saja.
budgets.delete('/:id', requireRole(...FINANCE_WRITERS), async (c) => {
  const id = positiveInt(c.req.param('id'))
  const db = c.env.DB
  const budget = id ? await findBudget(db, id) : null
  if (!id || !budget) return c.json<ApiErrorBody>({ error: 'Mata anggaran tidak ditemukan.' }, 404)

  const used = await db
    .prepare('SELECT COUNT(*) AS n FROM finance_transactions WHERE budget_id = ?1')
    .bind(id)
    .first<{ n: number }>()
  if (used && used.n > 0) {
    return c.json<ApiErrorBody>(
      {
        error: `Mata anggaran ${budget.account_code} sudah dipakai ${used.n} transaksi. Nonaktifkan saja agar realisasinya tetap tercatat.`,
      },
      409,
    )
  }

  await db.batch([
    db.prepare('DELETE FROM finance_budgets WHERE id = ?1').bind(id),
    auditStatement(c, {
      action: 'DELETE',
      entityType: 'finance_budgets',
      entityId: id,
      label: budgetLabel(budget),
      before: budgetAuditView(budget, budget.fund_code),
    }),
  ])
  return c.body(null, 204)
})

// Pos Kas harus ada (dan aktif bila baru dipilih), dan kode belum dipakai di tahun
// anggaran yang sama. Mengembalikan kode Pos Kas untuk Log Aktivitas, atau respons error.
async function checkAgainstDatabase(
  c: Ctx,
  next: BudgetFields,
  excludeId: number | null,
  fundChanged: boolean,
) {
  const db = c.env.DB
  const [fund, taken] = await db.batch([
    db.prepare('SELECT code, is_active FROM finance_funds WHERE id = ?1').bind(next.fund_id),
    db
      .prepare(
        `SELECT account_name FROM finance_budgets
         WHERE fiscal_year = ?1 AND account_code = ?2 AND id IS NOT ?3`,
      )
      .bind(next.fiscal_year, next.account_code, excludeId),
  ])

  const fundRow = fund.results[0] as { code: string; is_active: number } | undefined
  if (!fundRow) {
    return invalid(c, 'Data mata anggaran belum benar.', { fund_id: ['Pos Kas tidak ditemukan.'] })
  }
  if (fundChanged && fundRow.is_active !== 1) {
    return invalid(c, 'Data mata anggaran belum benar.', {
      fund_id: [`Pos Kas ${fundRow.code} sudah dinonaktifkan.`],
    })
  }
  const duplicate = taken.results[0] as { account_name: string } | undefined
  if (duplicate) {
    return c.json<ApiErrorBody>(
      {
        error: DUPLICATE_CODE,
        details: {
          account_code: [
            `Kode ${next.account_code} sudah dipakai “${duplicate.account_name}” di tahun ${next.fiscal_year}.`,
          ],
        },
      },
      409,
    )
  }
  return { fundCode: fundRow.code }
}

async function mustFind(c: Ctx, id: number) {
  const budget = await findBudget(c.env.DB, id)
  if (!budget) throw new Error(`Mata anggaran ${id} tidak ditemukan setelah disimpan`)
  return budget
}

export default budgets
