import { Hono, type Context } from 'hono'
import type { FieldErrors } from '../../shared/accounts'
import { isCalendarDate, witaToday } from '../../shared/dates'
import { parseTransactionInput, type TransactionFields } from '../../shared/finance'
import {
  BUDGET_TYPE_LABELS,
  FINANCE_TYPES,
  TRANSACTION_TYPE_LABELS,
  type ApiErrorBody,
  type FinanceTransaction,
  type FinanceTransactionPage,
  type FinanceTransactionResponse,
} from '../../shared/types'
import { LAST_INSERT_ID, auditStatement, diffChanges } from '../lib/audit'
import {
  FINANCE_READERS,
  FINANCE_WRITERS,
  TRANSACTION_SELECT,
  findFund,
  findTransaction,
  transactionAuditView,
  transactionLabel,
} from '../lib/finance'
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

// Transaksi kas masuk/keluar (PRD, Keuangan Multi-Pos). Semua pengurus dapat melihat;
// mencatat, mengubah, dan menghapus khusus Bendahara (dan Admin).
//
// Saldo Pos Kas (finance_funds.current_balance) diperbarui oleh trigger di migrasi 0004
// pada statement INSERT/UPDATE/DELETE yang sama, dan statement itu dijalankan dalam
// satu batch dengan catatan Log Aktivitas. Saldo, transaksi, dan lognya selalu
// berubah bersama atau tidak sama sekali; aplikasi tidak pernah menulis saldo sendiri.
//
// GET / query opsional: fund_id, budget_id, type (INCOME/EXPENSE), from, to
// (YYYY-MM-DD, inklusif), receipt (with/without kuitansi), q (keterangan), page,
// per_page (maks. 100). Respons menyertakan totals: jumlah kas masuk dan kas keluar
// seluruh hasil filter.
const transactions = new Hono<AppEnv>()

transactions.use(requireRole(...FINANCE_READERS))

type Ctx = Context<AppEnv>
type BudgetRow = {
  id: number
  fund_id: number
  fiscal_year: number
  account_code: string
  account_name: string
  type: TransactionFields['type']
  is_active: number
}

transactions.get('/', async (c) => {
  const query = c.req.query()
  const details: FieldErrors = {}
  const where = whereBuilder()
  const { page, perPage } = readPaging(query, details)

  if (query.fund_id !== undefined) {
    const fundId = positiveInt(query.fund_id)
    if (fundId === null) details.fund_id = ['Pos Kas tidak valid.']
    else where.add('t.fund_id = ?', fundId)
  }
  if (query.budget_id !== undefined) {
    const budgetId = positiveInt(query.budget_id)
    if (budgetId === null) details.budget_id = ['Mata anggaran tidak valid.']
    else where.add('t.budget_id = ?', budgetId)
  }
  if (query.type !== undefined) {
    const type = query.type.trim().toUpperCase()
    if (!(FINANCE_TYPES as readonly string[]).includes(type)) {
      details.type = ['Isi INCOME (kas masuk) atau EXPENSE (kas keluar).']
    } else where.add('t.type = ?', type)
  }
  const { from, to } = query
  if (from !== undefined && !isCalendarDate(from)) details.from = ['Tanggal awal harus YYYY-MM-DD.']
  if (to !== undefined && !isCalendarDate(to)) details.to = ['Tanggal akhir harus YYYY-MM-DD.']
  if (!details.from && !details.to && from && to && from > to) {
    details.to = ['Tanggal akhir tidak boleh sebelum tanggal awal.']
  }
  if (from && !details.from) where.add('t.transaction_date >= ?', from)
  if (to && !details.to) where.add('t.transaction_date <= ?', to)
  if (query.receipt !== undefined) {
    if (query.receipt === 'with') where.addClause('t.receipt_url IS NOT NULL')
    else if (query.receipt === 'without') where.addClause('t.receipt_url IS NULL')
    else details.receipt = ['Isi with (berkuitansi) atau without (tanpa kuitansi).']
  }
  if (query.q !== undefined) {
    const words = searchWords(query.q)
    if (words === null) details.q = ['Kata pencarian maksimal 100 karakter.']
    for (const word of words ?? []) {
      where.add(`t.description LIKE ? ESCAPE '\\'`, containsPattern(word))
    }
  }
  if (Object.keys(details).length > 0) return invalid(c, 'Filter transaksi tidak valid.', details)

  const db = c.env.DB
  const count = where.params.length
  const [summary, list] = await db.batch([
    db
      .prepare(
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount END), 0) AS income,
                COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount END), 0) AS expense
         FROM finance_transactions t ${where.sql}`,
      )
      .bind(...where.params),
    db
      .prepare(
        `${TRANSACTION_SELECT} ${where.sql}
         ORDER BY t.transaction_date DESC, t.id DESC
         LIMIT ?${count + 1} OFFSET ?${count + 2}`,
      )
      .bind(...where.params, perPage, (page - 1) * perPage),
  ])

  const totals = summary.results[0] as { total: number; income: number; expense: number }
  return c.json<FinanceTransactionPage>({
    data: list.results as FinanceTransaction[],
    meta: { page, per_page: perPage, total: totals.total },
    totals: { income: totals.income, expense: totals.expense },
  })
})

transactions.get('/:id', async (c) => {
  const id = positiveInt(c.req.param('id'))
  const transaction = id ? await findTransaction(c.env.DB, id) : null
  if (!transaction) return c.json<ApiErrorBody>({ error: 'Transaksi tidak ditemukan.' }, 404)
  return c.json<FinanceTransactionResponse>({
    transaction,
    fund: await mustFindFund(c, transaction.fund_id),
  })
})

transactions.post('/', requireRole(...FINANCE_WRITERS), async (c) => {
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data transaksi tidak valid.' }, 400)

  const { input, details } = parseTransactionInput(body, 'create', witaToday())
  if (Object.keys(details).length > 0) return invalid(c, 'Data transaksi belum benar.', details)
  const next: TransactionFields = {
    fund_id: input.fund_id ?? 0,
    budget_id: input.budget_id ?? null,
    transaction_date: input.transaction_date ?? '',
    type: input.type ?? 'INCOME',
    amount: input.amount ?? 0,
    description: input.description ?? null,
    receipt_url: input.receipt_url ?? null,
  }

  const checked = await checkReferences(c, next, null)
  if (checked instanceof Response) return checked

  const db = c.env.DB
  const [inserted] = await db.batch([
    db
      .prepare(
        `INSERT INTO finance_transactions
           (fund_id, budget_id, transaction_date, type, amount, description, receipt_url, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) RETURNING id`,
      )
      .bind(
        next.fund_id,
        next.budget_id,
        next.transaction_date,
        next.type,
        next.amount,
        next.description,
        next.receipt_url,
        c.get('user').id,
      ),
    // Trigger hanya mengubah saldo (UPDATE), jadi last_insert_rowid() tetap id transaksi.
    auditStatement(c, {
      action: 'CREATE',
      entityType: 'finance_transactions',
      entityId: LAST_INSERT_ID,
      label: transactionLabel(next.type, next.amount, checked.fundCode),
      after: transactionAuditView(next, checked.fundCode, checked.budget),
    }),
  ])

  const id = (inserted.results[0] as { id: number }).id
  return c.json<FinanceTransactionResponse>(
    {
      transaction: await findTransaction(db, id),
      fund: await mustFindFund(c, next.fund_id),
    },
    201,
  )
})

// PRD menyebut PUT; PATCH diterima dengan arti yang sama. Field yang tidak dikirim
// tidak diubah. Mengubah Pos Kas, jenis, atau nominal memindahkan selisihnya lewat
// trigger: saldo lama dikoreksi dan saldo baru ditambah dalam statement yang sama.
transactions.on(['PUT', 'PATCH'], '/:id', requireRole(...FINANCE_WRITERS), async (c) => {
  const id = positiveInt(c.req.param('id'))
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data transaksi tidak valid.' }, 400)

  const { input, details } = parseTransactionInput(body, 'update', witaToday())
  if (Object.keys(details).length > 0) return invalid(c, 'Data transaksi belum benar.', details)
  if (Object.keys(input).length === 0) {
    return c.json<ApiErrorBody>({ error: 'Tidak ada data yang diubah.' }, 400)
  }

  const db = c.env.DB
  const current = id ? await findTransaction(db, id) : null
  if (!id || !current) return c.json<ApiErrorBody>({ error: 'Transaksi tidak ditemukan.' }, 404)

  const stored: TransactionFields = {
    fund_id: current.fund_id,
    budget_id: current.budget_id,
    transaction_date: current.transaction_date,
    type: current.type,
    amount: current.amount,
    description: current.description,
    receipt_url: current.receipt_url,
  }
  // Pindah Pos Kas tanpa memilih mata anggaran baru: mata anggaran lama dilepas.
  const next: TransactionFields = {
    ...stored,
    ...(input.fund_id !== undefined && input.fund_id !== stored.fund_id && !('budget_id' in input)
      ? { budget_id: null }
      : {}),
    ...input,
  }

  const checked = await checkReferences(c, next, stored)
  if (checked instanceof Response) return checked

  const before = transactionAuditView(
    stored,
    current.fund_code,
    current.budget_code ? `${current.budget_code} ${current.budget_name}` : null,
  )
  const after = transactionAuditView(next, checked.fundCode, checked.budget)
  if (Object.keys(diffChanges(before, after)).length === 0) {
    return c.json<FinanceTransactionResponse>({
      transaction: current,
      fund: await mustFindFund(c, current.fund_id),
    })
  }

  await db.batch([
    db
      .prepare(
        `UPDATE finance_transactions
         SET fund_id = ?2, budget_id = ?3, transaction_date = ?4, type = ?5, amount = ?6,
             description = ?7, receipt_url = ?8, updated_at = datetime('now')
         WHERE id = ?1`,
      )
      .bind(
        id,
        next.fund_id,
        next.budget_id,
        next.transaction_date,
        next.type,
        next.amount,
        next.description,
        next.receipt_url,
      ),
    auditStatement(c, {
      action: 'UPDATE',
      entityType: 'finance_transactions',
      entityId: id,
      label: transactionLabel(next.type, next.amount, checked.fundCode),
      before,
      after,
    }),
  ])

  return c.json<FinanceTransactionResponse>({
    transaction: await findTransaction(db, id),
    fund: await mustFindFund(c, next.fund_id),
  })
})

// Menghapus transaksi yang salah catat; trigger mengembalikan saldo Pos Kasnya.
// Respons berisi Pos Kas dengan saldo setelah penghapusan.
transactions.delete('/:id', requireRole(...FINANCE_WRITERS), async (c) => {
  const id = positiveInt(c.req.param('id'))
  const db = c.env.DB
  const current = id ? await findTransaction(db, id) : null
  if (!id || !current) return c.json<ApiErrorBody>({ error: 'Transaksi tidak ditemukan.' }, 404)

  await db.batch([
    db.prepare('DELETE FROM finance_transactions WHERE id = ?1').bind(id),
    auditStatement(c, {
      action: 'DELETE',
      entityType: 'finance_transactions',
      entityId: id,
      label: transactionLabel(current.type, current.amount, current.fund_code),
      before: transactionAuditView(
        current,
        current.fund_code,
        current.budget_code ? `${current.budget_code} ${current.budget_name}` : null,
      ),
    }),
  ])

  return c.json<FinanceTransactionResponse>({
    transaction: null,
    fund: await mustFindFund(c, current.fund_id),
  })
})

// Pos Kas harus ada dan aktif (kecuali transaksi lama yang tidak dipindah). Mata
// anggaran, bila dipilih, harus pada Pos Kas, jenis, dan tahun anggaran yang sama
// dengan transaksinya, dan masih aktif bila baru dipilih. Mengembalikan kode Pos Kas
// dan nama mata anggaran untuk Log Aktivitas, atau respons error.
async function checkReferences(c: Ctx, next: TransactionFields, stored: TransactionFields | null) {
  const db = c.env.DB
  const [fund, budget] = await db.batch([
    db.prepare('SELECT code, is_active FROM finance_funds WHERE id = ?1').bind(next.fund_id),
    db
      .prepare(
        `SELECT id, fund_id, fiscal_year, account_code, account_name, type, is_active
         FROM finance_budgets WHERE id = ?1`,
      )
      .bind(next.budget_id),
  ])
  const errors: FieldErrors = {}
  const fundRow = fund.results[0] as { code: string; is_active: number } | undefined
  if (!fundRow) errors.fund_id = ['Pos Kas tidak ditemukan.']
  else if (fundRow.is_active !== 1 && next.fund_id !== stored?.fund_id) {
    errors.fund_id = [`Pos Kas ${fundRow.code} sudah dinonaktifkan.`]
  }

  const budgetRow = budget.results[0] as BudgetRow | undefined
  if (next.budget_id !== null) {
    const year = Number(next.transaction_date.slice(0, 4))
    if (!budgetRow) errors.budget_id = ['Mata anggaran tidak ditemukan.']
    else if (budgetRow.fund_id !== next.fund_id) {
      errors.budget_id = [`Mata anggaran ${budgetRow.account_code} bukan milik Pos Kas ini.`]
    } else if (budgetRow.type !== next.type) {
      errors.budget_id = [
        `Mata anggaran ${budgetRow.account_code} adalah ${BUDGET_TYPE_LABELS[budgetRow.type].toLowerCase()}; jenis transaksinya harus ${TRANSACTION_TYPE_LABELS[budgetRow.type].toLowerCase()}.`,
      ]
    } else if (budgetRow.fiscal_year !== year) {
      errors.budget_id = [
        `Mata anggaran ${budgetRow.account_code} untuk tahun ${budgetRow.fiscal_year}, sedangkan tanggal transaksinya tahun ${year}.`,
      ]
    } else if (budgetRow.is_active !== 1 && next.budget_id !== stored?.budget_id) {
      errors.budget_id = [`Mata anggaran ${budgetRow.account_code} sudah dinonaktifkan.`]
    }
  }
  if (Object.keys(errors).length > 0 || !fundRow) {
    return invalid(c, 'Data transaksi belum benar.', errors)
  }

  return {
    fundCode: fundRow.code,
    budget:
      budgetRow && next.budget_id !== null
        ? `${budgetRow.account_code} ${budgetRow.account_name}`
        : null,
  }
}

async function mustFindFund(c: Ctx, id: number) {
  const fund = await findFund(c.env.DB, id)
  if (!fund) throw new Error(`Pos Kas ${id} tidak ditemukan`)
  return fund
}

export default transactions
