import { formatRupiah } from '@shared/finance'
import type { AnalyticsBudgetLine, AnalyticsFund, AnalyticsPeriod } from '@shared/types'
import { formatShare } from '@/lib/analytics'
import { yearElapsed } from '@/lib/finance'
import { cn } from '@/lib/utils'

// Saldo per Pos Kas pada akhir periode beserta porsinya dan arus kasnya di periode, dan
// realisasi RAPBJ.

export function FundBalances({ funds, total }: { funds: AnalyticsFund[]; total: number }) {
  const positive = funds.reduce((sum, fund) => sum + Math.max(0, fund.balance), 0)
  return (
    // Di layar lebar kartu setinggi grafik arus kas di sebelahnya: baris dibagi rata,
    // dan bergulir bila Pos Kas sangat banyak.
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      <ul
        aria-label="Saldo per Pos Kas"
        className="flex min-h-0 flex-1 flex-col justify-between overflow-y-auto"
      >
        {funds.map((fund) => {
          const share = positive > 0 && fund.balance > 0 ? (fund.balance / positive) * 100 : 0
          const zero = fund.balance === 0
          return (
            <li
              key={fund.fund_id}
              className="grid gap-1.5 border-t border-rule py-2.5 first:border-t-0"
            >
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={cn('min-w-0 truncate', zero && 'text-muted-foreground')}>
                  {fund.name}
                  {!fund.is_active && <span className="text-muted-foreground"> · nonaktif</span>}
                </span>
                <span
                  className={cn(
                    'flex-none tabular-nums',
                    zero ? 'text-muted-foreground' : 'font-medium',
                  )}
                >
                  {formatRupiah(fund.balance)}
                </span>
              </div>
              {/* Porsi saldo: garis tipis abu-abu, tanpa lintasan. */}
              <div className="h-0.5">
                {share > 0 && (
                  <div className="h-0.5 rounded-full bg-chart-2" style={{ width: `${share}%` }} />
                )}
              </div>
              <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground tabular-nums">
                <span className="min-w-0">
                  {fund.income || fund.expense
                    ? `+${formatRupiah(fund.income)} · −${formatRupiah(fund.expense)}`
                    : 'Tanpa transaksi di periode ini'}
                </span>
                <span className="flex-none">
                  {share > 0 ? `${formatShare(Math.round(share))} saldo` : '—'}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="flex items-baseline justify-between gap-3 border-t pt-2.5 text-sm">
        <span className="text-muted-foreground">Jumlah</span>
        <span className="font-bold tabular-nums">{formatRupiah(total)}</span>
      </div>
    </div>
  )
}

const BUDGET_LABELS = { INCOME: 'Penerimaan', EXPENSE: 'Pengeluaran' } as const

// Realisasi terhadap target RAPBJ. Bila periode dimulai Januari, garis tegak menandai
// bagian tahun yang sudah berjalan sebagai pembanding.
export function BudgetRealization({
  lines,
  period,
  today,
}: {
  lines: AnalyticsBudgetLine[]
  period: AnalyticsPeriod
  today: string
}) {
  const end = period.to < today ? period.to : today
  const elapsed = period.month_from === 1 ? yearElapsed(period.year, end) : null
  return (
    <div className="grid gap-x-10 gap-y-4 @lg:grid-cols-2">
      {lines.map((line) => {
        const over = line.target > 0 && line.realized > line.target
        const fill = line.target > 0 ? Math.min(100, (line.realized / line.target) * 100) : 0
        return (
          <div key={line.type} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span>{BUDGET_LABELS[line.type]}</span>
              <span
                className={cn(
                  'tabular-nums',
                  line.percent === null ? 'text-muted-foreground' : 'font-medium',
                  over && line.type === 'EXPENSE' && 'text-negative-ink',
                )}
              >
                {line.percent === null ? 'Target belum diisi' : formatShare(line.percent)}
              </span>
            </div>
            <div
              role="meter"
              aria-label={`Realisasi ${BUDGET_LABELS[line.type].toLowerCase()}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(fill)}
              className="relative h-2 rounded-full bg-muted"
            >
              {fill > 0 && (
                <div
                  className={cn(
                    'h-2 rounded-full',
                    over && line.type === 'EXPENSE' ? 'bg-destructive' : 'bg-foreground',
                  )}
                  style={{ width: `${fill}%` }}
                />
              )}
              {elapsed !== null && line.target > 0 && (
                <div
                  aria-hidden="true"
                  className="absolute -top-1 h-4 w-px bg-muted-foreground"
                  style={{ left: `${elapsed * 100}%` }}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatRupiah(line.realized)} dari {formatRupiah(line.target)}
              {over &&
                (line.type === 'EXPENSE'
                  ? ` · lewat ${formatRupiah(line.realized - line.target)}`
                  : ' · melampaui target')}
            </p>
          </div>
        )
      })}
      {elapsed !== null && lines.some((line) => line.target > 0) && (
        <p className="text-xs text-muted-foreground @lg:col-span-2">
          Garis tegak: {formatShare(Math.round(elapsed * 100))} tahun {period.year} sudah berjalan.
        </p>
      )}
    </div>
  )
}
