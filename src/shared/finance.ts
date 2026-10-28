import { witaToday } from './dates'
import { createReader, group, upper } from './form-reader'
import {
  BUDGET_TYPE_LABELS,
  FINANCE_TYPES,
  TRANSACTION_TYPE_LABELS,
  type FinanceType,
} from './types'

// Aturan data Pos Kas, mata anggaran RAPBJ, dan transaksi kas, dipakai bersama oleh
// API (src/worker) dan form di dashboard (src/client). Nominal selalu bilangan bulat
// Rupiah tanpa desimal.

type Mode = 'create' | 'update'
type Body = Record<string, unknown>

// Batas wajar satu nominal (Rp1 triliun), untuk menangkap salah ketik angka nol.
export const MAX_AMOUNT = 1_000_000_000_000

export type FundFields = {
  code: string
  name: string
  description: string | null
  is_active: boolean
}

export type BudgetFields = {
  fund_id: number
  fiscal_year: number
  account_code: string
  account_name: string
  type: FinanceType
  target_amount: number
  is_active: boolean
}

export type TransactionFields = {
  fund_id: number
  budget_id: number | null
  transaction_date: string
  type: FinanceType
  amount: number
  description: string | null
  receipt_url: string | null
}

// "Rp1.500.000"
export function formatRupiah(amount: number): string {
  return `${amount < 0 ? '-' : ''}Rp${group(Math.abs(amount))}`
}

export function parseFundInput(body: Body, mode: Mode) {
  const read = createReader(body, mode)
  read.text('code', 'Kode Pos Kas', {
    max: 20,
    required: true,
    normalize: (value) => upper(value).replace(/\s+/g, '_'),
    pattern: [
      /^[A-Z0-9][A-Z0-9._-]*$/,
      'Kode Pos Kas berisi huruf, angka, titik, garis bawah, atau tanda hubung.',
    ],
  })
  read.text('name', 'Nama Pos Kas', { max: 100, required: true })
  read.text('description', 'Keterangan', { max: 500 })
  read.flag('is_active', 'Status aktif')
  return { input: read.input as Partial<FundFields>, details: read.details }
}

export function parseBudgetInput(body: Body, mode: Mode) {
  const read = createReader(body, mode)
  read.id('fund_id', 'Pos Kas')
  read.integer('fiscal_year', 'Tahun anggaran', {
    min: 2000,
    max: 2100,
    required: true,
    format: String,
  })
  read.text('account_code', 'Kode mata anggaran', {
    max: 30,
    required: true,
    normalize: upper,
    pattern: [
      /^[A-Z0-9][A-Z0-9 ./_-]*$/,
      'Kode mata anggaran berisi huruf, angka, spasi, titik, garis miring, atau tanda hubung.',
    ],
  })
  read.text('account_name', 'Nama mata anggaran', { max: 150, required: true })
  read.choice('type', 'jenis anggaran', FINANCE_TYPES, BUDGET_TYPE_LABELS, { required: true })
  read.integer('target_amount', 'Target anggaran', {
    min: 0,
    max: MAX_AMOUNT,
    format: formatRupiah,
  })
  read.flag('is_active', 'Status aktif')
  return { input: read.input as Partial<BudgetFields>, details: read.details }
}

export function parseTransactionInput(body: Body, mode: Mode, today = witaToday()) {
  const read = createReader(body, mode)
  read.id('fund_id', 'Pos Kas')
  read.id('budget_id', 'mata anggaran', { required: false })
  read.date('transaction_date', 'Tanggal transaksi', today, { required: true })
  read.choice('type', 'jenis transaksi', FINANCE_TYPES, TRANSACTION_TYPE_LABELS, {
    required: true,
  })
  read.integer('amount', 'Nominal', {
    min: 1,
    max: MAX_AMOUNT,
    required: true,
    format: formatRupiah,
  })
  read.text('description', 'Keterangan', { max: 500 })
  // Bukti kuitansi diunggah dulu lewat POST /api/uploads (folder kuitansi).
  read.text('receipt_url', 'Bukti kuitansi', {
    max: 300,
    pattern: [
      /^\/api\/files\/kuitansi\/[A-Za-z0-9/._-]+$/,
      'Bukti kuitansi harus berkas yang diunggah ke folder kuitansi.',
    ],
  })
  return { input: read.input as Partial<TransactionFields>, details: read.details }
}
