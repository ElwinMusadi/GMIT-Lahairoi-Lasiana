import { Hono } from 'hono'
import type { FieldErrors } from '../../shared/accounts'
import { isCalendarDate } from '../../shared/dates'
import type {
  ApiErrorBody,
  FinanceReportFund,
  FinanceReportLine,
  FinanceReportSummary,
  FinanceType,
} from '../../shared/types'
import { FINANCE_READERS } from '../lib/finance'
import { invalid, positiveInt } from '../lib/request'
import { requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

// Laporan keuangan per Pos Kas (PRD, Laporan Keuangan & Cetak Warta). Semua pengurus
// dapat membaca.
//
// GET /summary?from=YYYY-MM-DD&to=YYYY-MM-DD[&fund_id=]: rentang inklusif, paling
// panjang 366 hari. Untuk tiap Pos Kas: saldo awal (seluruh transaksi sebelum `from`),
// kas masuk dan kas keluar per mata anggaran beserta rinciannya, dan saldo akhir.
// Saldo dihitung dari transaksi, bukan dari current_balance, sehingga laporan periode
// lampau tetap benar. Untuk periode yang mencakup hari ini, saldo akhirnya sama dengan
// current_balance karena transaksi tidak boleh bertanggal setelah hari ini.
const reports = new Hono<AppEnv>()

reports.use(requireRole(...FINANCE_READERS))

const MAX_DAYS = 366
const DAY_MS = 86_400_000

type FundRow = { id: number; code: string; name: string; is_active: number }
type EntryRow = {
  id: number
  fund_id: number
  budget_id: number | null
  account_code: string | null
  account_name: string | null
  transaction_date: string
  type: FinanceType
  amount: number
  description: string | null
}

reports.get('/summary', async (c) => {
  const query = c.req.query()
  const details: FieldErrors = {}
  const { from, to } = query
  if (!from) details.from = ['Tanggal awal wajib diisi (YYYY-MM-DD).']
  else if (!isCalendarDate(from)) details.from = ['Tanggal awal harus YYYY-MM-DD.']
  if (!to) details.to = ['Tanggal akhir wajib diisi (YYYY-MM-DD).']
  else if (!isCalendarDate(to)) details.to = ['Tanggal akhir harus YYYY-MM-DD.']
  if (!details.from && !details.to) {
    if (from > to) details.to = ['Tanggal akhir tidak boleh sebelum tanggal awal.']
    else if ((Date.parse(to) - Date.parse(from)) / DAY_MS + 1 > MAX_DAYS) {
      details.to = [`Rentang laporan paling panjang ${MAX_DAYS} hari (satu tahun).`]
    }
  }
  let fundId: number | null = null
  if (query.fund_id !== undefined) {
    fundId = positiveInt(query.fund_id)
    if (fundId === null) details.fund_id = ['Pos Kas tidak valid.']
  }
  if (Object.keys(details).length > 0) return invalid(c, 'Periode laporan tidak valid.', details)

  const db = c.env.DB
  // fundId null berarti semua Pos Kas.
  const [funds, openings, entries] = await db.batch([
    db
      .prepare(
        `SELECT id, code, name, is_active FROM finance_funds
         WHERE ?1 IS NULL OR id = ?1 ORDER BY is_active DESC, code`,
      )
      .bind(fundId),
    db
      .prepare(
        `SELECT fund_id, SUM(CASE type WHEN 'INCOME' THEN amount ELSE -amount END) AS balance
         FROM finance_transactions
         WHERE transaction_date < ?1 AND (?2 IS NULL OR fund_id = ?2)
         GROUP BY fund_id`,
      )
      .bind(from, fundId),
    db
      .prepare(
        `SELECT t.id, t.fund_id, t.budget_id, b.account_code, b.account_name,
                t.transaction_date, t.type, t.amount, t.description
         FROM finance_transactions t
         LEFT JOIN finance_budgets b ON b.id = t.budget_id
         WHERE t.transaction_date BETWEEN ?1 AND ?2 AND (?3 IS NULL OR t.fund_id = ?3)
         ORDER BY t.transaction_date, t.id`,
      )
      .bind(from, to, fundId),
  ])

  const fundRows = funds.results as FundRow[]
  if (fundId !== null && fundRows.length === 0) {
    return c.json<ApiErrorBody>({ error: 'Pos Kas tidak ditemukan.' }, 404)
  }
  const opening = new Map(
    (openings.results as { fund_id: number; balance: number }[]).map((row) => [
      row.fund_id,
      row.balance,
    ]),
  )

  // Kelompokkan transaksi per Pos Kas, jenis, lalu mata anggaran.
  const lines = new Map<number, Record<FinanceType, Map<string, FinanceReportLine>>>()
  for (const entry of entries.results as EntryRow[]) {
    let byType = lines.get(entry.fund_id)
    if (!byType) {
      byType = { INCOME: new Map(), EXPENSE: new Map() }
      lines.set(entry.fund_id, byType)
    }
    const key = String(entry.budget_id ?? 'none')
    let line = byType[entry.type].get(key)
    if (!line) {
      line = {
        budget_id: entry.budget_id,
        account_code: entry.account_code,
        account_name: entry.account_name,
        total: 0,
        entries: [],
      }
      byType[entry.type].set(key, line)
    }
    line.total += entry.amount
    line.entries.push({
      id: entry.id,
      transaction_date: entry.transaction_date,
      description: entry.description,
      amount: entry.amount,
    })
  }

  const report: FinanceReportFund[] = []
  for (const fund of fundRows) {
    const byType = lines.get(fund.id)
    const income = sortLines(byType?.INCOME)
    const expense = sortLines(byType?.EXPENSE)
    const openingBalance = opening.get(fund.id) ?? 0
    // Pos Kas nonaktif tanpa saldo dan tanpa transaksi pada periode ini tidak dilaporkan.
    if (
      fundId === null &&
      fund.is_active !== 1 &&
      openingBalance === 0 &&
      income.length === 0 &&
      expense.length === 0
    ) {
      continue
    }
    const incomeTotal = sum(income)
    const expenseTotal = sum(expense)
    report.push({
      id: fund.id,
      code: fund.code,
      name: fund.name,
      is_active: fund.is_active === 1,
      opening_balance: openingBalance,
      income_total: incomeTotal,
      expense_total: expenseTotal,
      closing_balance: openingBalance + incomeTotal - expenseTotal,
      income,
      expense,
    })
  }

  return c.json<FinanceReportSummary>({
    from,
    to,
    funds: report,
    totals: {
      opening_balance: report.reduce((total, fund) => total + fund.opening_balance, 0),
      income: report.reduce((total, fund) => total + fund.income_total, 0),
      expense: report.reduce((total, fund) => total + fund.expense_total, 0),
      closing_balance: report.reduce((total, fund) => total + fund.closing_balance, 0),
      transaction_count: entries.results.length,
    },
  })
})

// Urut kode mata anggaran ("4.1.2" sebelum "4.1.10"); tanpa mata anggaran di akhir.
function sortLines(lines: Map<string, FinanceReportLine> | undefined): FinanceReportLine[] {
  return [...(lines?.values() ?? [])].sort((a, b) => {
    if (a.account_code === null || b.account_code === null) {
      return a.account_code === null ? (b.account_code === null ? 0 : 1) : -1
    }
    return a.account_code.localeCompare(b.account_code, 'id', { numeric: true })
  })
}

function sum(lines: FinanceReportLine[]) {
  return lines.reduce((total, line) => total + line.total, 0)
}

export default reports
