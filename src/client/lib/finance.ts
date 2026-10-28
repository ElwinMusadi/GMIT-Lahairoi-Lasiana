import { formatRupiah } from '@shared/finance'
import type { FinanceBudget, FinanceType } from '@shared/types'

// Tampilan data keuangan yang dipakai bersama oleh halaman Pos Kas & RAPBJ dan
// Transaksi Kas.

// Bendahara dan Admin boleh mengubah data keuangan; Pendeta dan Majelis hanya membaca.
export const FINANCE_WRITERS = ['TREASURER', 'ADMIN'] as const

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

// 0.684 → "68,4%"
export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toLocaleString('id-ID', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`
}

// Rasio realisasi terhadap target; null bila target belum diisi (Rp0).
export function realization(budget: Pick<FinanceBudget, 'target_amount' | 'realized_amount'>) {
  return budget.target_amount > 0 ? budget.realized_amount / budget.target_amount : null
}

// Pengeluaran yang melewati target adalah sinyal; penerimaan yang melewati target bukan.
export function overBudget(
  budget: Pick<FinanceBudget, 'type' | 'target_amount' | 'realized_amount'>,
) {
  return (
    budget.type === 'EXPENSE' &&
    budget.target_amount > 0 &&
    budget.realized_amount > budget.target_amount
  )
}

// Bagian tahun anggaran yang sudah berjalan per `today` (0–1), pembanding realisasi:
// tanggal 28 Oktober berarti sekitar 82% tahun sudah lewat.
export function yearElapsed(year: number, today: string): number {
  const current = Number(today.slice(0, 4))
  if (year !== current) return year < current ? 1 : 0
  const start = Date.UTC(year, 0, 1)
  return (Date.parse(today) + 86_400_000 - start) / (Date.UTC(year + 1, 0, 1) - start)
}

// Nominal bertanda untuk tabel transaksi: kas masuk "+Rp…", kas keluar "−Rp…".
export function signedAmount(type: FinanceType, amount: number) {
  return `${type === 'INCOME' ? '+' : '−'}${formatRupiah(amount)}`
}

// "2026-10" → "Oktober 2026"
export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number)
  return `${MONTHS[m - 1]} ${year}`
}

// Bulan-bulan terakhir (terbaru dulu) sebagai pilihan filter, mulai dari `today`.
export function recentMonths(today: string, count = 24): string[] {
  let [year, month] = today.slice(0, 7).split('-').map(Number)
  const months: string[] = []
  for (let i = 0; i < count; i++) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month -= 1
    if (month === 0) {
      month = 12
      year -= 1
    }
  }
  return months
}

// "2026-02" → { from: "2026-02-01", to: "2026-02-28" }
export function monthRange(month: string) {
  const [year, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate()
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` }
}

// Berkas kuitansi PDF ditampilkan berbeda dari gambar.
export function isPdf(url: string) {
  return url.toLowerCase().endsWith('.pdf')
}
