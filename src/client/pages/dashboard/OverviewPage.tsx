import { useEffect, useState, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { Link } from 'react-router'
import { MIN_ANALYTICS_YEAR } from '@shared/analytics'
import { witaToday } from '@shared/dates'
import { formatRupiah } from '@shared/finance'
import {
  ROLE_LABELS,
  WORSHIP_CATEGORIES,
  WORSHIP_CATEGORY_LABELS,
  type AnalyticsDashboard,
  type AnalyticsSummary,
  type ApiPage,
  type AuditLogItem,
  type HealthStatus,
  type WorshipCategory,
} from '@shared/types'
import { AttendanceChart } from '@/components/analytics/attendance-chart'
import { BirthdayCard } from '@/components/analytics/birthday-card'
import { CashFlowChart, EXPENSE_COLOR, INCOME_COLOR } from '@/components/analytics/cash-flow-chart'
import { ChartCard, DataTable, LegendItem } from '@/components/analytics/chart-card'
import { CategoricalBars, RayonBars, SacramentCoverage } from '@/components/analytics/demographics'
import { BudgetRealization, FundBalances } from '@/components/analytics/funds-panel'
import { Can } from '@/components/session-provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/api'
import { describeAudit } from '@/lib/audit-format'
import { formatLongDate, formatShortDay, monthLabel } from '@/lib/finance'
import { formatRecent, formatTime } from '@/lib/format'
import { useCurrentUser } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const MONTH_NAMES = [
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
const YEARS_SHOWN = 6

const controlClass =
  'h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

// Dashboard Eksekutif & Analitik (PRD Fase 3), halaman utama /dashboard: ringkasan
// metrik, demografi jemaat, ulang tahun, arus kas, dan tren kehadiran dari
// GET /api/analytics/dashboard. Filter tahun dan rentang bulan (di URL) hanya berlaku
// untuk keuangan dan kehadiran.
export default function OverviewPage() {
  const user = useCurrentUser()
  const { params, update } = useUrlFilters()
  const [today] = useState(witaToday)
  const [reloadKey, setReloadKey] = useState(0)
  const currentYear = Number(today.slice(0, 4))
  const currentMonth = Number(today.slice(5, 7))
  const categoryParam = (params.get('ibadah') ?? '').toUpperCase()
  const category = (WORSHIP_CATEGORIES as string[]).includes(categoryParam)
    ? (categoryParam as WorshipCategory)
    : 'SUNDAY_SERVICE'

  const dashboard = useApiQuery<AnalyticsDashboard>('/analytics/dashboard', {
    year: params.get('year') ?? '',
    month_from: params.get('month_from') ?? '',
    month_to: params.get('month_to') ?? '',
  })
  const data = dashboard.data
  const period = data?.period
  const busy = dashboard.loading && data !== undefined

  const years = Array.from({ length: YEARS_SHOWN }, (_, index) => currentYear - index).filter(
    (year) => year >= MIN_ANALYTICS_YEAR,
  )
  if (period && !years.includes(period.year)) years.push(period.year)
  const lastSelectable = period?.year === currentYear ? currentMonth : 12

  function setYear(value: number) {
    // Rentang bulan kembali ke bawaan tahun itu.
    update({
      year: value === currentYear ? '' : String(value),
      month_from: '',
      month_to: '',
    })
  }

  function setMonths(from: number, to: number) {
    update({ month_from: String(from), month_to: String(to) })
  }

  const periodText = period
    ? period.month_from === period.month_to
      ? `${MONTH_NAMES[period.month_from - 1]} ${period.year}`
      : `${MONTH_NAMES[period.month_from - 1]} – ${MONTH_NAMES[period.month_to - 1]} ${period.year}`
    : ''

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Ringkasan</h1>
          <p className="text-sm text-muted-foreground">
            GMIT Jemaat Lahairoi Tuak Sabu Lasiana · {ROLE_LABELS[user.role]} ·{' '}
            {formatLongDate(today, true)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-muted-foreground">
          <SystemStatus reloadKey={reloadKey} />
          {dashboard.updatedAt && (
            <span className="flex items-center gap-1">
              Diperbarui {formatTime(new Date(dashboard.updatedAt).toISOString())}
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => {
                  dashboard.reload()
                  setReloadKey((key) => key + 1)
                }}
                disabled={dashboard.loading}
              >
                <RefreshCw className={cn(dashboard.loading && 'animate-spin')} />
                <span className="sr-only">Muat ulang data dan periksa status sistem</span>
              </Button>
            </span>
          )}
        </div>
      </header>

      {dashboard.error && !busy && (
        <div role="alert" className="rounded-lg border bg-card px-5 py-4 text-sm">
          Data dashboard tidak dapat dimuat: {dashboard.error}{' '}
          <button type="button" onClick={dashboard.reload} className="font-medium underline">
            Coba lagi
          </button>
          {params.size > 0 && (
            <>
              {' '}
              atau{' '}
              <button
                type="button"
                onClick={() => update({ year: '', month_from: '', month_to: '', ibadah: '' })}
                className="font-medium underline"
              >
                kembali ke periode bawaan
              </button>
            </>
          )}
        </div>
      )}

      {data ? (
        <>
          <KpiStrip summary={data.summary} rayons={data.demographics.by_rayon} />

          <div
            className={cn(
              'grid items-stretch gap-4',
              data.birthdays && 'xl:grid-cols-[minmax(0,1fr)_22rem]',
            )}
          >
            <section
              aria-labelledby="judul-jemaat"
              className="@container grid gap-6 rounded-lg border bg-card p-5"
            >
              <div className="grid gap-0.5">
                <h2 id="judul-jemaat" className="text-base font-semibold">
                  Jemaat
                </h2>
                <p className="text-[0.8125rem] text-muted-foreground">Anggota aktif per hari ini</p>
              </div>
              <div className="grid gap-x-10 gap-y-6 @lg:grid-cols-2">
                <SubSection title="Jiwa per rayon">
                  <RayonBars rayons={data.demographics.by_rayon} />
                </SubSection>
                <SubSection title="Kelompok kategorial">
                  <CategoricalBars
                    groups={data.demographics.by_categorical}
                    members={data.summary.members}
                  />
                </SubSection>
              </div>
              <div className="border-t border-rule pt-5">
                <SubSection title="Cakupan sakramen">
                  <SacramentCoverage sacraments={data.demographics.sacraments} />
                </SubSection>
              </div>
            </section>
            {data.birthdays && <BirthdayCard birthdays={data.birthdays} today={data.today} />}
          </div>

          <section aria-labelledby="judul-keuangan" className="grid gap-4">
            {/* Filter periode satu baris di samping judul, berbunyi seperti kalimat:
                Tahun [2026] · Bulan [Januari] s.d. [Oktober]. */}
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <h2 id="judul-keuangan" className="text-lg font-semibold">
                Keuangan & kehadiran
              </h2>
              <p className="sr-only" aria-live="polite">
                Periode {periodText}
              </p>
              {period && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <label className="flex items-center gap-2">
                    Tahun anggaran
                    <select
                      value={period.year}
                      onChange={(event) => setYear(Number(event.target.value))}
                      className={cn(controlClass, 'w-24 text-foreground')}
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="flex items-center gap-2">
                    <label htmlFor="filter-dari">Bulan</label>
                    <select
                      id="filter-dari"
                      aria-label="Dari bulan"
                      value={period.month_from}
                      onChange={(event) => {
                        const from = Number(event.target.value)
                        setMonths(from, Math.max(from, period.month_to))
                      }}
                      className={cn(controlClass, 'w-32 text-foreground')}
                    >
                      {MONTH_NAMES.map((name, index) => (
                        <option key={name} value={index + 1} disabled={index + 1 > lastSelectable}>
                          {name}
                        </option>
                      ))}
                    </select>
                    s.d.
                    <select
                      aria-label="Sampai bulan"
                      value={period.month_to}
                      onChange={(event) => {
                        const to = Number(event.target.value)
                        setMonths(Math.min(period.month_from, to), to)
                      }}
                      className={cn(controlClass, 'w-32 text-foreground')}
                    >
                      {MONTH_NAMES.map((name, index) => (
                        <option key={name} value={index + 1} disabled={index + 1 > lastSelectable}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </span>
                </div>
              )}
            </div>

            <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <ChartCard
                title="Kas masuk dan keluar per bulan"
                meta="Seluruh Pos Kas"
                busy={busy}
                legend={
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    <LegendItem
                      swatch={<Swatch color={INCOME_COLOR} />}
                      label="Kas masuk"
                      value={formatRupiah(data.finance.income)}
                    />
                    <LegendItem
                      swatch={<Swatch color={EXPENSE_COLOR} />}
                      label="Kas keluar"
                      value={formatRupiah(data.finance.expense)}
                    />
                    <LegendItem
                      swatch={null}
                      label="Selisih"
                      value={`${data.finance.income - data.finance.expense > 0 ? '+' : ''}${formatRupiah(data.finance.income - data.finance.expense)}`}
                    />
                  </div>
                }
                table={
                  <DataTable
                    caption={`Kas masuk dan keluar per bulan, ${periodText}`}
                    head={['Bulan', 'Kas masuk', 'Kas keluar', 'Selisih']}
                    rows={data.finance.months.map((month) => ({
                      key: month.month,
                      cells: [
                        monthLabel(month.month),
                        formatRupiah(month.income),
                        formatRupiah(month.expense),
                        formatRupiah(month.income - month.expense),
                      ],
                    }))}
                  />
                }
                footer={
                  <SubSection title={`Realisasi RAPBJ ${data.period.year}`}>
                    <BudgetRealization
                      lines={data.finance.budget}
                      period={data.period}
                      today={data.today}
                    />
                  </SubSection>
                }
              >
                <CashFlowChart months={data.finance.months} />
              </ChartCard>

              <section
                aria-labelledby="judul-pos-kas"
                aria-busy={busy}
                className={cn(
                  'flex flex-col gap-3 rounded-lg border bg-card p-5 transition-opacity xl:h-0 xl:min-h-full',
                  busy && 'opacity-60',
                )}
              >
                <div className="grid gap-0.5">
                  <h2 id="judul-pos-kas" className="text-base font-semibold">
                    Saldo per Pos Kas
                  </h2>
                  <p className="text-[0.8125rem] text-muted-foreground">
                    {data.period.to >= data.today
                      ? 'Saldo hari ini; arus kas pada periode terpilih'
                      : `Saldo per ${formatLongDate(data.period.to)}; arus kas pada periode terpilih`}
                  </p>
                </div>
                <FundBalances funds={data.finance.funds} total={data.finance.closing_balance} />
              </section>
            </div>

            <ChartCard
              title="Tren kehadiran ibadah"
              meta={
                <AttendanceMeta
                  stat={data.attendance.by_category[category]}
                  label={WORSHIP_CATEGORY_LABELS[category]}
                />
              }
              busy={busy}
              controls={
                <label className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
                  <span className="sr-only sm:not-sr-only">Jenis ibadah</span>
                  <select
                    value={category}
                    onChange={(event) =>
                      update({
                        ibadah:
                          event.target.value === 'SUNDAY_SERVICE'
                            ? ''
                            : event.target.value.toLowerCase(),
                      })
                    }
                    className={cn(controlClass, 'w-auto text-foreground')}
                  >
                    {WORSHIP_CATEGORIES.map((value) => (
                      <option key={value} value={value}>
                        {WORSHIP_CATEGORY_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </label>
              }
              table={
                <DataTable
                  caption={`Kehadiran ${WORSHIP_CATEGORY_LABELS[category]} per minggu, ${periodText}`}
                  head={['Minggu', 'Ibadah', 'Total hadir', 'Rata-rata']}
                  rows={data.attendance.weeks
                    .filter((week) => week.by_category[category].services > 0)
                    .reverse()
                    .map((week) => ({
                      key: week.week_start,
                      cells: [
                        `${formatShortDay(week.week_start)} – ${formatShortDay(week.week_end)} ${week.week_end.slice(0, 4)}`,
                        week.by_category[category].services.toLocaleString('id-ID'),
                        week.by_category[category].total.toLocaleString('id-ID'),
                        (week.by_category[category].average ?? 0).toLocaleString('id-ID'),
                      ],
                    }))}
                />
              }
            >
              <AttendanceChart
                weeks={data.attendance.weeks}
                category={category}
                emptyText={`Belum ada kehadiran ${WORSHIP_CATEGORY_LABELS[category]} yang diinput pada ${periodText}.`}
              />
            </ChartCard>
          </section>
        </>
      ) : (
        !dashboard.error && <DashboardSkeleton />
      )}

      <Can roles={['ADMIN']}>
        <RecentActivity />
      </Can>
    </div>
  )
}

// Empat metrik utama dalam satu wadah bergaris pemisah.
function KpiStrip({
  summary,
  rayons,
}: {
  summary: AnalyticsSummary
  rayons: AnalyticsDashboard['demographics']['by_rayon']
}) {
  const served = rayons.filter((rayon) => rayon.families > 0).length
  const last = summary.last_sunday
  const previous = summary.previous_sunday
  const change = last && previous ? last.total - previous.total : null
  return (
    // Garis pemisah dari celah 1px di atas warna garis, sehingga rapi di 1, 2, atau 4
    // kolom. Di ponsel tiap metrik satu baris: label kiri, angka kanan.
    <dl className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
      <Kpi label="Total jiwa" value={summary.members.toLocaleString('id-ID')}>
        Anggota aktif
      </Kpi>
      <Kpi label="Total KK" value={summary.families.toLocaleString('id-ID')}>
        Di {served.toLocaleString('id-ID')} dari {rayons.length.toLocaleString('id-ID')} rayon
      </Kpi>
      <Kpi
        label="Saldo kas total"
        value={<span className="font-bold">{formatRupiah(summary.cash_balance)}</span>}
      >
        Seluruh Pos Kas, hari ini
      </Kpi>
      <Kpi
        label="Kehadiran Minggu terakhir"
        value={
          last ? (
            last.total.toLocaleString('id-ID')
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        }
      >
        {last ? (
          <>
            {formatShortDay(last.worship_date)}
            {last.services > 1 && ` · ${last.services} kebaktian`}
            {change !== null && previous && (
              <>
                {' · '}
                <span
                  className={cn(
                    'whitespace-nowrap',
                    change > 0 && 'text-positive',
                    change < 0 && 'text-destructive',
                  )}
                >
                  {change > 0 ? '+' : change < 0 ? '−' : '±'}
                  {Math.abs(change).toLocaleString('id-ID')}
                </span>{' '}
                dari {formatShortDay(previous.worship_date)}
              </>
            )}
          </>
        ) : (
          'Belum ada kehadiran yang diinput'
        )}
      </Kpi>
    </dl>
  )
}

function Kpi({ label, value, children }: { label: string; value: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] content-start items-center gap-x-4 gap-y-1 bg-card px-4 py-3 sm:grid-cols-1 sm:p-5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="col-start-2 row-span-2 row-start-1 text-right text-[1.375rem] leading-tight font-medium tracking-[-0.01em] whitespace-nowrap sm:col-start-1 sm:row-span-1 sm:row-start-2 sm:text-left sm:text-[1.625rem]">
        {value}
      </dd>
      <dd className="text-[0.8125rem] text-muted-foreground sm:row-start-3">{children}</dd>
    </div>
  )
}

function AttendanceMeta({
  stat,
  label,
}: {
  stat: AnalyticsDashboard['attendance']['all']
  label: string
}) {
  if (stat.average === null) return <>Rata-rata kehadiran per ibadah, per minggu</>
  return (
    <>
      {label}: rata-rata{' '}
      <span className="font-medium text-foreground tabular-nums">
        {stat.average.toLocaleString('id-ID')}
      </span>{' '}
      per ibadah · {stat.services.toLocaleString('id-ID')} ibadah ·{' '}
      {stat.total.toLocaleString('id-ID')} hadir
    </>
  )
}

function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </div>
  )
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="size-2.5 flex-none rounded-sm"
      style={{ background: color }}
    />
  )
}

// Kerangka akhir dengan batang abu-abu seukuran isinya, tanpa kilau.
function DashboardSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-card lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="grid gap-2 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-96 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
      <Skeleton className="h-72 rounded-lg" />
    </div>
  )
}

// Khusus Admin: lima aktivitas terakhir, dengan tautan ke Log Aktivitas lengkap.
function RecentActivity() {
  const logs = useApiQuery<ApiPage<AuditLogItem>>('/audit-logs', { per_page: 5 })

  return (
    <section aria-labelledby="judul-aktivitas" className="grid gap-2">
      <div className="flex items-baseline justify-between">
        <h2 id="judul-aktivitas" className="text-base font-semibold">
          Aktivitas terbaru
        </h2>
        <Link
          to="/dashboard/audit-logs"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Lihat semua
        </Link>
      </div>
      <div className="rounded-lg border bg-card px-5 py-1">
        {logs.error && !logs.data && (
          <p className="py-3 text-sm">
            Log Aktivitas tidak dapat dimuat: {logs.error}{' '}
            <button type="button" onClick={logs.reload} className="font-medium underline">
              Coba lagi
            </button>
          </p>
        )}
        {!logs.data && !logs.error && (
          <ul aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="grid gap-1.5 border-t border-rule py-3 first:border-t-0">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3.5 w-32" />
              </li>
            ))}
          </ul>
        )}
        {logs.data && logs.data.data.length === 0 && (
          <p className="py-3 text-sm text-muted-foreground">Belum ada aktivitas yang tercatat.</p>
        )}
        {logs.data && logs.data.data.length > 0 && (
          <ol>
            {logs.data.data.map((item) => {
              const { summary, flag } = describeAudit(item)
              return (
                <li
                  key={item.id}
                  className="grid gap-0.5 border-t border-rule py-3 first:border-t-0"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span className="truncate">{summary}</span>
                    {flag && (
                      <span className="flex-none rounded-full bg-negative-soft px-2 py-0.5 text-xs font-medium text-negative-ink">
                        {flag}
                      </span>
                    )}
                  </span>
                  <span className="truncate text-[0.8125rem] text-muted-foreground">
                    {item.user_name ?? 'Tanpa akun'} · {formatRecent(item.created_at)}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}

type HealthState =
  | { status: 'loading' }
  | { status: 'success'; data: HealthStatus }
  | { status: 'error'; message: string }

// Status API dan D1 dalam satu baris di header; diperiksa ulang bersama tombol muat ulang.
// /api/health mengembalikan HealthStatus baik saat 200 maupun 503 (D1 bermasalah).
function SystemStatus({ reloadKey }: { reloadKey: number }) {
  const [health, setHealth] = useState<HealthState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/health', { signal: controller.signal })
      .then(async (res) =>
        setHealth({ status: 'success', data: (await res.json()) as HealthStatus }),
      )
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setHealth({ status: 'error', message: errorMessage(err) })
      })
    return () => controller.abort()
  }, [reloadKey])

  if (health.status === 'loading') return <Skeleton className="h-5 w-32" />
  const ok = health.status === 'success' && health.data.database === 'ok'
  const detail =
    health.status === 'error'
      ? `API tidak terjangkau: ${health.message}`
      : ok
        ? `API dan database D1 berjalan, diperiksa ${new Date(health.data.timestamp).toLocaleTimeString('id-ID')}`
        : 'Database D1 tidak merespons'
  return (
    <span
      title={detail}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        ok ? 'bg-positive-soft text-positive-ink' : 'bg-negative-soft text-negative-ink',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full', ok ? 'bg-positive' : 'bg-destructive')}
      />
      {ok
        ? 'Sistem berjalan'
        : health.status === 'error'
          ? 'API tidak terjangkau'
          : 'Database bermasalah'}
      <span className="sr-only">: {detail}</span>
    </span>
  )
}
