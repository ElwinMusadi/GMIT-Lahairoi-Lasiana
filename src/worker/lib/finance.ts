import type { BudgetFields, FundFields, TransactionFields } from '../../shared/finance'
import { formatRupiah } from '../../shared/finance'
import {
  TRANSACTION_TYPE_LABELS,
  type FinanceBudget,
  type FinanceFund,
  type FinanceTransaction,
  type FinanceType,
  type UserRole,
} from '../../shared/types'

// Bagian bersama rute /api/finance/*: hak akses, kolom SQL, konversi baris D1, dan
// bentuk data di Log Aktivitas.

// Keempat peran pengurus boleh membaca data keuangan; Pendeta dan Majelis hanya
// membaca (PRD: akses baca pada laporan).
export const FINANCE_READERS: UserRole[] = ['TREASURER', 'ADMIN', 'PASTOR', 'ELDER']
// Mengubah Pos Kas, mata anggaran, dan transaksi: Bendahara, juga Admin.
export const FINANCE_WRITERS: UserRole[] = ['TREASURER', 'ADMIN']

const ISO = (column: string) => `strftime('%Y-%m-%dT%H:%M:%SZ', ${column})`

export const FUND_SELECT = `
  SELECT f.id, f.code, f.name, f.description, f.current_balance, f.is_active,
         (SELECT COUNT(*) FROM finance_budgets b WHERE b.fund_id = f.id) AS budget_count,
         (SELECT COUNT(*) FROM finance_transactions t WHERE t.fund_id = f.id) AS transaction_count,
         ${ISO('f.created_at')} AS created_at, ${ISO('f.updated_at')} AS updated_at
  FROM finance_funds f`

export const BUDGET_SELECT = `
  SELECT b.id, b.fund_id, f.code AS fund_code, f.name AS fund_name, b.fiscal_year,
         b.account_code, b.account_name, b.type, b.target_amount,
         COALESCE((SELECT SUM(t.amount) FROM finance_transactions t
                   WHERE t.budget_id = b.id), 0) AS realized_amount,
         b.is_active, ${ISO('b.created_at')} AS created_at, ${ISO('b.updated_at')} AS updated_at
  FROM finance_budgets b
  JOIN finance_funds f ON f.id = b.fund_id`

export const TRANSACTION_SELECT = `
  SELECT t.id, t.fund_id, f.code AS fund_code, f.name AS fund_name, t.budget_id,
         b.account_code AS budget_code, b.account_name AS budget_name, t.transaction_date,
         t.type, t.amount, t.description, t.receipt_url, t.created_by,
         u.name AS created_by_name,
         ${ISO('t.created_at')} AS created_at, ${ISO('t.updated_at')} AS updated_at
  FROM finance_transactions t
  JOIN finance_funds f ON f.id = t.fund_id
  LEFT JOIN finance_budgets b ON b.id = t.budget_id
  LEFT JOIN users u ON u.id = t.created_by`

type Stored<T> = Omit<T, 'is_active'> & { is_active: number }

export function toFund(row: Stored<FinanceFund>): FinanceFund {
  return { ...row, is_active: row.is_active === 1 }
}

export function toBudget(row: Stored<FinanceBudget>): FinanceBudget {
  return { ...row, is_active: row.is_active === 1 }
}

export async function findFund(db: D1Database, id: number): Promise<FinanceFund | null> {
  const row = await db
    .prepare(`${FUND_SELECT} WHERE f.id = ?1`)
    .bind(id)
    .first<Stored<FinanceFund>>()
  return row ? toFund(row) : null
}

export async function findBudget(db: D1Database, id: number): Promise<FinanceBudget | null> {
  const row = await db
    .prepare(`${BUDGET_SELECT} WHERE b.id = ?1`)
    .bind(id)
    .first<Stored<FinanceBudget>>()
  return row ? toBudget(row) : null
}

export async function findTransaction(
  db: D1Database,
  id: number,
): Promise<FinanceTransaction | null> {
  return db.prepare(`${TRANSACTION_SELECT} WHERE t.id = ?1`).bind(id).first<FinanceTransaction>()
}

// Nama di Log Aktivitas, mis. "UMUM (Kas Umum / Sinode)".
export function fundLabel(code: string, name: string) {
  return `${code} (${name})`
}

// "4.1.01 Kolekte Ibadah Minggu · 2026"
export function budgetLabel(
  budget: Pick<BudgetFields, 'account_code' | 'account_name' | 'fiscal_year'>,
) {
  return `${budget.account_code} ${budget.account_name} · ${budget.fiscal_year}`
}

// "Kas masuk Rp1.500.000 · UMUM"
export function transactionLabel(type: FinanceType, amount: number, fundCode: string) {
  return `${TRANSACTION_TYPE_LABELS[type]} ${formatRupiah(amount)} · ${fundCode}`
}

export function fundAuditView(fields: FundFields) {
  return {
    code: fields.code,
    name: fields.name,
    description: fields.description,
    is_active: fields.is_active,
  }
}

// Pos Kas disebut dengan kodenya, bukan id, agar riwayatnya mudah dibaca.
export function budgetAuditView(fields: BudgetFields, fundCode: string) {
  return {
    fund: fundCode,
    fiscal_year: fields.fiscal_year,
    account_code: fields.account_code,
    account_name: fields.account_name,
    type: fields.type,
    target_amount: fields.target_amount,
    is_active: fields.is_active,
  }
}

export function transactionAuditView(
  fields: TransactionFields,
  fundCode: string,
  budget: string | null,
) {
  return {
    fund: fundCode,
    budget,
    transaction_date: fields.transaction_date,
    type: fields.type,
    amount: fields.amount,
    description: fields.description,
    receipt_url: fields.receipt_url,
  }
}
