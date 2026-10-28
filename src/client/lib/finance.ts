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

// Periode Laporan Keuangan. Nilainya: awal minggu (YYYY-MM-DD, hari Minggu), bulan
// (YYYY-MM), atau tahun (YYYY).
export type ReportPeriod = 'week' | 'month' | 'year'

const DAY_MS = 86_400_000

// "2026-10-25" + 6 → "2026-10-31"
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10)
}

// Minggu warta dihitung Minggu–Sabtu: kolekte hari Minggu membuka minggunya, dan
// laporannya dicetak Jumat/Sabtu untuk Warta Jemaat hari Minggu berikutnya.
export function weekStart(date: string): string {
  return addDays(date, -new Date(Date.parse(date)).getUTCDay())
}

// Awal minggu-minggu terakhir (terbaru dulu), mulai dari minggu `today`.
export function recentWeeks(today: string, count = 26): string[] {
  const start = weekStart(today)
  return Array.from({ length: count }, (_, index) => addDays(start, -7 * index))
}

export function periodRange(period: ReportPeriod, value: string) {
  if (period === 'week') return { from: value, to: addDays(value, 6) }
  if (period === 'month') return monthRange(value)
  return { from: `${value}-01-01`, to: `${value}-12-31` }
}

// Periode sebelum (-1) atau sesudah (+1) periode ini, dengan jenis yang sama.
export function shiftPeriod(period: ReportPeriod, value: string, step: 1 | -1): string {
  if (period === 'week') return addDays(value, 7 * step)
  if (period === 'year') return String(Number(value) + step)
  const [year, month] = value.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1 + step, 1))
  return next.toISOString().slice(0, 7)
}

// Tanggal tanpa jam (YYYY-MM-DD) diformat apa adanya, tanpa geser zona waktu.
const shortDay = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
})
const longDate = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const longDayDate = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// "25 Okt"
export function formatShortDay(date: string): string {
  return shortDay.format(Date.parse(date))
}

// "25 Oktober 2026", atau "Minggu, 25 Oktober 2026" dengan nama hari.
export function formatLongDate(date: string, withWeekday = false): string {
  return (withWeekday ? longDayDate : longDate).format(Date.parse(date))
}

// Pilihan periode: "25 Okt – 31 Okt 2026", "Oktober 2026", "Tahun 2026".
export function periodLabel(period: ReportPeriod, value: string): string {
  if (period === 'month') return monthLabel(value)
  if (period === 'year') return `Tahun ${value}`
  const end = addDays(value, 6)
  const startYear = value.slice(0, 4)
  const endYear = end.slice(0, 4)
  return startYear === endYear
    ? `${formatShortDay(value)} – ${formatShortDay(end)} ${endYear}`
    : `${formatShortDay(value)} ${startYear} – ${formatShortDay(end)} ${endYear}`
}
