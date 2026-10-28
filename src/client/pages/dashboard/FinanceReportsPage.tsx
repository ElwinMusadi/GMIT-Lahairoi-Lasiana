import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { isCalendarDate, witaToday } from '@shared/dates'
import { formatRupiah } from '@shared/finance'
import type {
  ApiList,
  FinanceFund,
  FinanceReportFund,
  FinanceReportLine,
  FinanceReportSummary,
} from '@shared/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  addDays,
  formatLongDate,
  formatShortDay,
  monthLabel,
  periodLabel,
  periodRange,
  recentMonths,
  recentWeeks,
  shiftPeriod,
  weekStart,
  type ReportPeriod,
} from '@/lib/finance'
import { formatDate, formatTime } from '@/lib/format'
import { useCurrentUser } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const controlClass =
  'h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

const CHURCH_NAME = 'GMIT Jemaat Lahairoi Tuak Sabu Lasiana'

const PERIODS: { value: ReportPeriod; label: string; title: string }[] = [
  { value: 'week', label: 'Mingguan', title: 'Laporan Keuangan Mingguan' },
  { value: 'month', label: 'Bulanan', title: 'Laporan Keuangan Bulanan' },
  { value: 'year', label: 'Tahunan', title: 'Laporan Keuangan Tahunan' },
]

type Detail = 'entries' | 'accounts'

// Nilai periode dari URL (?week=YYYY-MM-DD, ?month=YYYY-MM, ?year=YYYY); tanpa nilai
// yang sah, periode yang sedang berjalan.
function periodValue(period: ReportPeriod, params: URLSearchParams, today: string): string {
  const raw = params.get(period) ?? ''
  if (period === 'week') return weekStart(isCalendarDate(raw) ? raw : today)
  if (period === 'month') return /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : today.slice(0, 7)
  const year = Number(raw)
  return /^\d{4}$/.test(raw) && year >= 2000 && year <= 2100 ? raw : today.slice(0, 4)
}

// Laporan Keuangan per Pos Kas untuk Warta Jemaat: saldo awal, rincian penerimaan dan
// pengeluaran, saldo akhir. Lembar laporannya sama dengan hasil cetak; kontrol di
// atasnya disembunyikan saat dicetak (lihat @media print di index.css).
export default function FinanceReportsPage() {
  const me = useCurrentUser()
  const { params, update } = useUrlFilters()
  const [today] = useState(witaToday)
  const periodParam = params.get('period')
  const period: ReportPeriod =
    periodParam === 'month' || periodParam === 'year' ? periodParam : 'week'
  const value = periodValue(period, params, today)
  const current = periodValue(period, new URLSearchParams(), today)
  const fundId = params.get('fund_id') ?? ''
  const detailParam = params.get('detail')
  // Laporan mingguan memuat tiap transaksi; bulanan dan tahunan cukup per mata anggaran.
  const detail: Detail =
    detailParam === 'entries' || detailParam === 'accounts'
      ? detailParam
      : period === 'week'
        ? 'entries'
        : 'accounts'
  const { from, to } = periodRange(period, value)
  const title = PERIODS.find((option) => option.value === period)?.title ?? ''

  const report = useApiQuery<FinanceReportSummary>('/finance/reports/summary', {
    from,
    to,
    fund_id: fundId,
  })
  const funds = useApiQuery<ApiList<FinanceFund>>('/finance/funds')
  const fundList = funds.data?.data ?? []
  const selectedFund = fundList.find((fund) => String(fund.id) === fundId)

  // Waktu cetak di kaki laporan diperbarui tepat sebelum dicetak.
  const [printedAt, setPrintedAt] = useState(() => new Date().toISOString())
  // Nama berkas PDF mengikuti judul tab saat dicetak.
  const printTitle = `${title} ${periodLabel(period, value)}${selectedFund ? ` ${selectedFund.code}` : ''}`
  useEffect(() => {
    let previous = document.title
    const before = () => {
      previous = document.title
      document.title = printTitle
      flushSync(() => setPrintedAt(new Date().toISOString()))
    }
    const after = () => {
      document.title = previous
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [printTitle])

  const options = optionsFor(period, today)
  if (!options.includes(value)) options.push(value)
  const next = shiftPeriod(period, value, 1)
  const nextStartsLater = periodRange(period, next).from > today

  function setValue(nextValue: string) {
    update({ [period]: nextValue === current ? '' : nextValue })
  }

  // Berganti jenis periode: periode baru memuat akhir periode lama (paling lambat hari ini).
  function setPeriod(nextPeriod: ReportPeriod) {
    if (nextPeriod === period) return
    const anchor = to < today ? to : today
    const nextValue =
      nextPeriod === 'week'
        ? weekStart(anchor)
        : nextPeriod === 'month'
          ? anchor.slice(0, 7)
          : anchor.slice(0, 4)
    const nextCurrent = periodValue(nextPeriod, new URLSearchParams(), today)
    update({
      period: nextPeriod === 'week' ? '' : nextPeriod,
      week: '',
      month: '',
      year: '',
      [nextPeriod]: nextValue === nextCurrent ? '' : nextValue,
      detail: '',
    })
  }

  const data = report.data
  const running = to >= today

  return (
    <div className="grid gap-6 print:block">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 print:hidden">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Laporan Keuangan</h1>
          {data ? (
            <p className="text-sm text-muted-foreground tabular-nums">
              {periodLabel(period, value)}: {data.totals.transaction_count.toLocaleString('id-ID')}{' '}
              transaksi.{' '}
              {running ? (
                <span className="font-medium text-foreground">
                  Periode masih berjalan sampai {formatLongDate(to, true)}; transaksi baru akan
                  menambah laporan ini.
                </span>
              ) : (
                'Periode sudah lewat.'
              )}
            </p>
          ) : (
            <Skeleton className="h-5 w-80 max-w-full" />
          )}
        </div>
        <Button size="lg" onClick={() => window.print()} disabled={!data}>
          <Printer data-icon="inline-start" />
          Cetak laporan
        </Button>
      </header>

      <div className="grid grid-cols-2 items-end gap-3 md:flex md:flex-wrap print:hidden">
        <div className="col-span-2 grid gap-1.5">
          <span className="text-xs text-muted-foreground" id="jenis-periode">
            Jenis periode
          </span>
          <div
            role="group"
            aria-labelledby="jenis-periode"
            className="grid h-9 grid-cols-3 rounded-lg border border-input bg-card p-0.5"
          >
            {PERIODS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={option.value === period}
                onClick={() => setPeriod(option.value)}
                className={cn(
                  'rounded-md px-3 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                  option.value === period &&
                    'bg-primary font-medium text-primary-foreground hover:text-primary-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2 grid gap-1.5 md:w-[21rem]">
          <Label htmlFor="pilih-periode" className="text-xs font-normal text-muted-foreground">
            Periode
          </Label>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="size-9 flex-none"
              onClick={() => setValue(shiftPeriod(period, value, -1))}
            >
              <ChevronLeft />
              <span className="sr-only">Periode sebelumnya</span>
            </Button>
            <select
              id="pilih-periode"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className={cn(controlClass, 'tabular-nums')}
            >
              {options.map((option) => (
                <option key={option} value={option}>
                  {periodLabel(period, option)}
                  {option === current ? (period === 'week' ? ' (minggu ini)' : ' (berjalan)') : ''}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="icon"
              className="size-9 flex-none"
              disabled={nextStartsLater}
              onClick={() => setValue(next)}
            >
              <ChevronRight />
              <span className="sr-only">Periode berikutnya</span>
            </Button>
          </div>
        </div>
        <div className="grid min-w-0 gap-1.5 md:w-60">
          <Label htmlFor="pilih-pos" className="text-xs font-normal text-muted-foreground">
            Pos Kas
          </Label>
          <select
            id="pilih-pos"
            value={fundId}
            disabled={!funds.data}
            onChange={(event) => update({ fund_id: event.target.value })}
            className={controlClass}
          >
            <option value="">Semua Pos Kas</option>
            {fundList.map((fund) => (
              <option key={fund.id} value={fund.id}>
                {fund.code} · {fund.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid min-w-0 gap-1.5 md:w-48">
          <Label htmlFor="pilih-rincian" className="text-xs font-normal text-muted-foreground">
            Rincian
          </Label>
          <select
            id="pilih-rincian"
            value={detail}
            onChange={(event) => update({ detail: event.target.value })}
            className={controlClass}
          >
            <option value="entries">Per transaksi</option>
            <option value="accounts">Per mata anggaran</option>
          </select>
        </div>
      </div>

      <article
        aria-labelledby="judul-laporan"
        aria-busy={report.loading}
        className={cn(
          'max-w-4xl min-w-0 rounded-lg border bg-card px-5 py-6 text-sm transition-opacity sm:px-10 sm:py-10',
          'print:max-w-none print:rounded-none print:border-0 print:bg-transparent print:p-0 print:text-[10pt] print:text-black',
          report.loading && data && 'opacity-60',
        )}
      >
        <header className="grid gap-1 border-b-2 border-foreground pb-4 text-center">
          <p className="font-medium">{CHURCH_NAME}</p>
          <h2 id="judul-laporan" className="text-xl font-semibold print:text-[14pt]">
            {title}
          </h2>
          <p className="text-muted-foreground print:text-black">
            {periodHeading(period, value, from, to)}
            {selectedFund && ` · ${selectedFund.name}`}
          </p>
        </header>

        {report.error && !data ? (
          <p className="py-8 text-muted-foreground">
            Laporan tidak dapat dimuat: {report.error}{' '}
            <button type="button" onClick={report.reload} className="font-medium underline">
              Coba lagi
            </button>
          </p>
        ) : !data ? (
          <ReportSkeleton />
        ) : data.funds.length === 0 ? (
          <p className="py-8 text-muted-foreground">Belum ada Pos Kas untuk dilaporkan.</p>
        ) : (
          <>
            {data.funds.length > 1 && <Recap report={data} />}
            {data.funds.map((fund) => (
              <FundReport
                key={fund.id}
                fund={fund}
                from={from}
                to={to}
                today={today}
                detail={detail}
              />
            ))}
            <Signatures today={today} treasurer={me.role === 'TREASURER' ? me.name : null} />
            <p className="mt-8 text-xs text-muted-foreground print:text-[8pt]">
              Dicetak dari Sistem Informasi GMIT Lahairoi oleh {me.name}, {formatDate(printedAt)}{' '}
              pukul {formatTime(printedAt)} WITA.
              {running &&
                ` Periode belum berakhir; saldo akhir dihitung sampai ${formatLongDate(today)}.`}
            </p>
          </>
        )}
      </article>
    </div>
  )
}

function optionsFor(period: ReportPeriod, today: string): string[] {
  if (period === 'week') return recentWeeks(today, 26)
  if (period === 'month') return recentMonths(today, 24)
  const year = Number(today.slice(0, 4))
  return Array.from({ length: 6 }, (_, index) => String(year - index))
}

function periodHeading(period: ReportPeriod, value: string, from: string, to: string) {
  if (period === 'week') return `${formatLongDate(from, true)} – ${formatLongDate(to, true)}`
  if (period === 'month') return monthLabel(value)
  return `Tahun Anggaran ${value}`
}

// Saldo per tanggal: awal periode dihitung sampai hari sebelumnya; periode yang belum
// berakhir dihitung sampai hari ini.
function openingLabel(from: string) {
  return `Saldo awal (per ${formatLongDate(addDays(from, -1))})`
}

function closingLabel(to: string, today: string) {
  return to > today
    ? `Saldo akhir sementara (per ${formatLongDate(today)})`
    : `Saldo akhir (per ${formatLongDate(to)})`
}

// Satu tabel ringkas seluruh Pos Kas, untuk dibaca sekilas sebelum rinciannya.
function Recap({ report }: { report: FinanceReportSummary }) {
  const cell = 'py-1.5 pl-3 text-right tabular-nums whitespace-nowrap'
  return (
    <section aria-labelledby="ringkasan" className="mt-6 break-inside-avoid">
      <h3 id="ringkasan" className="font-semibold">
        Ringkasan seluruh Pos Kas
      </h3>
      <div className="mt-2 overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[34rem] print:min-w-0">
          <thead>
            <tr className="border-b border-foreground text-left text-xs text-muted-foreground print:text-[8.5pt] print:text-black">
              <th scope="col" className="py-1.5 font-normal">
                Pos Kas
              </th>
              <th scope="col" className="py-1.5 pl-3 text-right font-normal">
                Saldo awal
              </th>
              <th scope="col" className="py-1.5 pl-3 text-right font-normal">
                Penerimaan
              </th>
              <th scope="col" className="py-1.5 pl-3 text-right font-normal">
                Pengeluaran
              </th>
              <th scope="col" className="py-1.5 pl-3 text-right font-normal">
                Saldo akhir
              </th>
            </tr>
          </thead>
          <tbody>
            {report.funds.map((fund) => (
              <tr key={fund.id} className="border-b border-rule print:border-neutral-300">
                <th scope="row" className="py-1.5 text-left font-normal">
                  {fund.name}
                </th>
                <td className={cell}>{formatRupiah(fund.opening_balance)}</td>
                <td className={cell}>{formatRupiah(fund.income_total)}</td>
                <td className={cell}>{formatRupiah(fund.expense_total)}</td>
                <td className={cn(cell, 'font-medium')}>{formatRupiah(fund.closing_balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-foreground font-semibold">
              <th scope="row" className="py-1.5 text-left">
                Jumlah
              </th>
              <td className={cell}>{formatRupiah(report.totals.opening_balance)}</td>
              <td className={cell}>{formatRupiah(report.totals.income)}</td>
              <td className={cell}>{formatRupiah(report.totals.expense)}</td>
              <td className={cell}>{formatRupiah(report.totals.closing_balance)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}

function FundReport({
  fund,
  from,
  to,
  today,
  detail,
}: {
  fund: FinanceReportFund
  from: string
  to: string
  today: string
  detail: Detail
}) {
  return (
    <section aria-labelledby={`pos-${fund.id}`} className="mt-8">
      <h3
        id={`pos-${fund.id}`}
        className="flex items-baseline justify-between gap-3 border-b border-foreground pb-1 font-semibold break-after-avoid"
      >
        {fund.name}
        <span className="text-xs font-normal text-muted-foreground print:text-black">
          {fund.code}
          {!fund.is_active && ' · nonaktif'}
        </span>
      </h3>
      <table className="w-full">
        <tbody>
          <AmountRow label={openingLabel(from)} amount={fund.opening_balance} strong />
        </tbody>
        {fund.income.length === 0 && fund.expense.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={2} className="py-1 text-muted-foreground print:text-black">
                Tidak ada kas masuk maupun kas keluar pada periode ini.
              </td>
            </tr>
          </tbody>
        ) : (
          <>
            <LineGroup
              title="Penerimaan"
              lines={fund.income}
              total={fund.income_total}
              detail={detail}
            />
            <LineGroup
              title="Pengeluaran"
              lines={fund.expense}
              total={fund.expense_total}
              detail={detail}
            />
          </>
        )}
        <tfoot>
          <tr className="border-t-2 border-double border-foreground font-semibold break-inside-avoid">
            <th scope="row" className="py-2 text-left">
              {closingLabel(to, today)}
            </th>
            <td className="py-2 pl-3 text-right tabular-nums whitespace-nowrap">
              {formatRupiah(fund.closing_balance)}
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  )
}

function LineGroup({
  title,
  lines,
  total,
  detail,
}: {
  title: string
  lines: FinanceReportLine[]
  total: number
  detail: Detail
}) {
  // Kelompok kosong cukup satu baris, agar laporan mingguan tetap ringkas di kertas.
  if (lines.length === 0) {
    return (
      <tbody>
        <AmountRow label={title} note="tidak ada" amount={0} spaced />
      </tbody>
    )
  }
  return (
    <tbody>
      <tr className="break-after-avoid">
        <th scope="rowgroup" colSpan={2} className="pt-3 pb-1 text-left font-medium">
          {title}
        </th>
      </tr>
      {lines.map((line) => {
        const name = line.account_code
          ? `${line.account_code} ${line.account_name}`
          : 'Tanpa mata anggaran'
        if (detail === 'accounts') {
          return (
            <AmountRow
              key={line.budget_id ?? 'none'}
              label={name}
              note={`${line.entries.length} transaksi`}
              amount={line.total}
              indent
            />
          )
        }
        return [
          <tr key={`${line.budget_id ?? 'none'}-head`} className="break-after-avoid">
            <td colSpan={2} className="pt-1.5 pl-4">
              {name}
            </td>
          </tr>,
          ...line.entries.map((entry) => (
            <tr key={entry.id} className="break-inside-avoid">
              <td className="py-0.5 pl-8 text-muted-foreground print:text-black">
                <span className="tabular-nums">{formatShortDay(entry.transaction_date)}</span>
                {' · '}
                {entry.description ?? 'Tanpa keterangan'}
              </td>
              <td className="py-0.5 pl-3 text-right align-top tabular-nums whitespace-nowrap">
                {formatRupiah(entry.amount)}
              </td>
            </tr>
          )),
        ]
      })}
      <AmountRow label={`Jumlah ${title.toLowerCase()}`} amount={total} subtotal />
    </tbody>
  )
}

function AmountRow({
  label,
  note,
  amount,
  strong,
  indent,
  subtotal,
  spaced,
}: {
  label: string
  note?: string
  amount: number
  strong?: boolean
  indent?: boolean
  subtotal?: boolean
  // Jarak atas seperti judul kelompok (Penerimaan/Pengeluaran).
  spaced?: boolean
}) {
  return (
    <tr
      className={cn(
        'break-inside-avoid',
        subtotal && 'border-t border-rule font-medium print:border-neutral-400',
      )}
    >
      <th
        scope="row"
        className={cn(
          'py-1 text-left align-top',
          strong || subtotal ? 'font-medium' : 'font-normal',
          indent && 'pl-4',
          (strong || spaced) && 'pt-3',
          spaced && 'font-medium',
        )}
      >
        {label}
        {note && (
          <span className="ml-2 text-xs font-normal text-muted-foreground print:text-[8.5pt] print:text-black">
            {note}
          </span>
        )}
      </th>
      <td
        className={cn(
          'w-40 py-1 pl-3 text-right align-top tabular-nums whitespace-nowrap',
          (strong || spaced) && 'pt-3',
        )}
      >
        {formatRupiah(amount)}
      </td>
    </tr>
  )
}

// Kolom tanda tangan lampiran Warta Jemaat. Nama Bendahara terisi bila yang mencetak
// adalah Bendahara; selain itu dibiarkan kosong untuk ditulis tangan.
function Signatures({ today, treasurer }: { today: string; treasurer: string | null }) {
  return (
    <footer className="mt-12 grid grid-cols-2 gap-8 text-center break-inside-avoid">
      <div className="grid content-start gap-0.5">
        <p>Mengetahui,</p>
        <p>Ketua Majelis Jemaat</p>
        <p className="mx-auto mt-16 w-full max-w-56 border-t border-foreground pt-1">&nbsp;</p>
      </div>
      <div className="grid content-start gap-0.5">
        <p>Kupang, {formatLongDate(today)}</p>
        <p>Bendahara Jemaat</p>
        <p className="mx-auto mt-16 w-full max-w-56 border-t border-foreground pt-1 font-medium">
          {treasurer ?? ' '}
        </p>
      </div>
    </footer>
  )
}

function ReportSkeleton() {
  return (
    <div className="grid gap-3 py-6" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex justify-between gap-6">
          <Skeleton className="h-5 w-64 max-w-[60%]" />
          <Skeleton className="h-5 w-28" />
        </div>
      ))}
    </div>
  )
}
