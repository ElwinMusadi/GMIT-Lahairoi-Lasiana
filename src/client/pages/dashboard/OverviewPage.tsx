import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { CalendarCheck, House, RefreshCw, Users, WalletCards } from 'lucide-react'
import { MIN_ANALYTICS_YEAR } from '@shared/analytics'
import { witaToday } from '@shared/dates'
import { formatRupiah } from '@shared/finance'
import {
  WORSHIP_CATEGORIES,
  WORSHIP_CATEGORY_LABELS,
  type AnalyticsDashboard,
  type AnalyticsFinance,
  type HealthStatus,
  type UserRole,
  type WorshipCategory,
} from '@shared/types'
import { AttendanceChart } from '@/components/analytics/attendance-chart'
import { BirthdayCard } from '@/components/analytics/birthday-card'
import { CashFlowChart, EXPENSE_COLOR, INCOME_COLOR } from '@/components/analytics/cash-flow-chart'
import { ChartCard, DataTable, LegendItem } from '@/components/analytics/chart-card'
import {
  CategoricalBars,
  GenderComposition,
  RayonBars,
  SacramentCoverage,
} from '@/components/analytics/demographics'
import { BudgetRealization, FundBalances } from '@/components/analytics/funds-panel'
import { RecentActivity } from '@/components/analytics/recent-activity'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiCard } from '@/components/zenith/kpi-card'
import { PageHeader } from '@/components/zenith/page-header'
import { Panel, PanelLink } from '@/components/zenith/panel'
import { errorMessage } from '@/lib/api'
import { formatLongDate, formatShortDay, monthLabel } from '@/lib/finance'
import { formatTime } from '@/lib/format'
import { canOpenModule } from '@/lib/navigation'
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
  'h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

// Dua kolom di layar lebar: isi utama dan kartu samping selebar 22rem. Kartu samping
// setinggi kartu utama (h-0 + min-h-full) dan isinya bergulir bila lebih panjang.
const ROW = 'grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]'
const SIDE = 'xl:h-0 xl:min-h-full'

type BlockKey = 'jemaat' | 'keuangan' | 'kehadiran'
type KpiKey = 'jiwa' | 'kk' | 'saldo' | 'hadir'

// Urutan per peran (D8). Bendahara melihat keuangan lebih dulu; Pendeta dan Majelis
// melihat kehadiran sebelum keuangan. Kartu KPI pertama menjadi angka utama (crimson).
const BLOCK_ORDER: Record<UserRole, BlockKey[]> = {
  ADMIN: ['jemaat', 'keuangan', 'kehadiran'],
  TREASURER: ['keuangan', 'kehadiran', 'jemaat'],
  PASTOR: ['jemaat', 'kehadiran', 'keuangan'],
  ELDER: ['jemaat', 'kehadiran', 'keuangan'],
}
const KPI_ORDER: Record<UserRole, KpiKey[]> = {
  ADMIN: ['jiwa', 'kk', 'saldo', 'hadir'],
  TREASURER: ['saldo', 'hadir', 'jiwa', 'kk'],
  PASTOR: ['jiwa', 'kk', 'hadir', 'saldo'],
  ELDER: ['jiwa', 'kk', 'hadir', 'saldo'],
}

// Salam menurut jam di Kupang (WITA, UTC+8).
function greeting(now = Date.now()): string {
  const hour = new Date(now + 8 * 60 * 60 * 1000).getUTCHours()
  if (hour >= 4 && hour < 11) return 'Selamat pagi'
  if (hour >= 11 && hour < 15) return 'Selamat siang'
  if (hour >= 15 && hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

// Ringkasan (/dashboard) bergaya Zenith: kartu KPI, lalu blok jemaat, keuangan, dan
// kehadiran dalam urutan sesuai peran, dari GET /api/analytics/dashboard. Filter tahun dan
// rentang bulan (di URL, di kanan judul) hanya berlaku untuk keuangan dan kehadiran;
// KPI, demografi, dan ulang tahun selalu keadaan hari ini.
export default function OverviewPage() {
  const user = useCurrentUser()
  const { params, update } = useUrlFilters()
  const [today] = useState(witaToday)
  const [hello] = useState(greeting)
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

  const blocks: Record<BlockKey, (data: AnalyticsDashboard) => ReactNode> = {
    jemaat: (data) => (
      <div className={cn(data.birthdays ? ROW : 'grid')}>
        <Panel
          title="Jemaat"
          description="Anggota aktif per hari ini"
          action={
            canOpenModule(user.role, 'members') && (
              <PanelLink to="/dashboard/members">Lihat anggota</PanelLink>
            )
          }
          contentClassName="grid gap-6"
        >
          <div className="grid gap-x-10 gap-y-6 @xl:grid-cols-2">
            <SubSection title="Komposisi">
              <GenderComposition genders={data.demographics.by_gender} />
            </SubSection>
            <SubSection title="Cakupan sakramen">
              <SacramentCoverage sacraments={data.demographics.sacraments} />
            </SubSection>
          </div>
          <div className="grid gap-x-10 gap-y-6 border-t pt-6 @xl:grid-cols-2">
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
        </Panel>
        {data.birthdays && (
          <BirthdayCard birthdays={data.birthdays} today={data.today} className={SIDE} />
        )}
      </div>
    ),
    keuangan: (data) => (
      <div className={ROW}>
        <ChartCard
          title="Kas masuk dan keluar"
          meta={`${periodText} · seluruh Pos Kas`}
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

        <Panel
          title="Saldo per Pos Kas"
          description={
            data.period.to >= data.today
              ? 'Saldo hari ini; arus kas pada periode terpilih'
              : `Saldo per ${formatLongDate(data.period.to)}; arus kas pada periode terpilih`
          }
          action={
            canOpenModule(user.role, 'finance/budgets') && (
              <PanelLink to="/dashboard/finance/budgets">Pos Kas</PanelLink>
            )
          }
          busy={busy}
          className={SIDE}
          contentClassName="flex min-h-0 flex-1 flex-col"
        >
          <FundBalances funds={data.finance.funds} total={data.finance.closing_balance} />
        </Panel>
      </div>
    ),
    kehadiran: (data) => {
      const chart = (
        <ChartCard
          title="Tren kehadiran ibadah"
          meta={
            <AttendanceMeta
              period={periodText}
              stat={data.attendance.by_category[category]}
              label={WORSHIP_CATEGORY_LABELS[category]}
            />
          }
          busy={busy}
          controls={
            <select
              aria-label="Jenis ibadah"
              value={category}
              onChange={(event) =>
                update({
                  ibadah:
                    event.target.value === 'SUNDAY_SERVICE' ? '' : event.target.value.toLowerCase(),
                })
              }
              className={cn(controlClass, 'h-8 w-auto max-w-full')}
            >
              {WORSHIP_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {WORSHIP_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
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
      )
      // Admin: linimasa aktivitas terbaru di samping grafik kehadiran.
      return user.role === 'ADMIN' ? (
        <div className={ROW}>
          {chart}
          <RecentActivity className={SIDE} />
        </div>
      ) : (
        chart
      )
    },
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Ringkasan"
        description={`${hello}, ${user.name} · ${formatLongDate(today, true)}`}
        meta={
          <>
            <SystemStatus reloadKey={reloadKey} />
            {dashboard.updatedAt && (
              <span className="flex items-center gap-1">
                Diperbarui {formatTime(new Date(dashboard.updatedAt).toISOString())}
                <Button
                  variant="ghost"
                  size="icon"
                  className="-my-1.5 text-muted-foreground"
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
          </>
        }
        actions={
          period && (
            // Di ponsel: "Periode [tahun]" lalu rentang bulan selebar layar di baris kedua.
            <div
              role="group"
              aria-label="Periode keuangan dan kehadiran"
              className="flex w-full flex-wrap items-center gap-2 text-sm text-muted-foreground sm:w-auto"
            >
              <span>Periode</span>
              <select
                aria-label="Tahun anggaran"
                value={period.year}
                onChange={(event) => setYear(Number(event.target.value))}
                className={cn(controlClass, 'w-24')}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <span className="flex basis-full items-center gap-2 sm:basis-auto">
                <select
                  aria-label="Dari bulan"
                  value={period.month_from}
                  onChange={(event) => {
                    const from = Number(event.target.value)
                    setMonths(from, Math.max(from, period.month_to))
                  }}
                  className={cn(controlClass, 'min-w-0 flex-1 sm:w-[7.5rem] sm:flex-none')}
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
                  className={cn(controlClass, 'min-w-0 flex-1 sm:w-[7.5rem] sm:flex-none')}
                >
                  {MONTH_NAMES.map((name, index) => (
                    <option key={name} value={index + 1} disabled={index + 1 > lastSelectable}>
                      {name}
                    </option>
                  ))}
                </select>
              </span>
            </div>
          )
        }
      />
      <p className="sr-only" aria-live="polite">
        {periodText && `Periode keuangan dan kehadiran ${periodText}`}
      </p>

      {dashboard.error && !busy && (
        <div role="alert" className="rounded-xl border bg-card px-5 py-4 text-sm">
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
          <KpiRow data={data} role={user.role} />
          {BLOCK_ORDER[user.role].map((key) => (
            <section key={key} aria-label={BLOCK_LABELS[key]} className="grid gap-4">
              {blocks[key](data)}
            </section>
          ))}
        </>
      ) : (
        !dashboard.error && <DashboardSkeleton />
      )}
    </div>
  )
}

const BLOCK_LABELS: Record<BlockKey, string> = {
  jemaat: 'Jemaat',
  keuangan: 'Keuangan',
  kehadiran: 'Kehadiran',
}

// Saldo seluruh Pos Kas di awal periode dan di akhir tiap bulannya, dihitung mundur dari
// saldo akhir periode.
function monthEndBalances(finance: AnalyticsFinance): number[] {
  const balances = [finance.closing_balance]
  for (const month of [...finance.months].reverse()) {
    balances.unshift(balances[0] - (month.income - month.expense))
  }
  return balances
}

function percentChange(value: number, base: number): number | null {
  return base > 0 ? Math.round(((value - base) / base) * 1000) / 10 : null
}

// Empat kartu KPI keadaan hari ini. Grafik mini dan tren saldo/kehadiran diambil dari data
// periode, jadi hanya tampil bila periode memuat hari ini (bawaan: tahun berjalan).
function KpiRow({ data, role }: { data: AnalyticsDashboard; role: UserRole }) {
  const { summary, period, today } = data
  const live = period.to >= today
  const served = data.demographics.by_rayon.filter((rayon) => rayon.families > 0).length
  const link = (path: string) => (canOpenModule(role, path) ? `/dashboard/${path}` : undefined)

  const balances = monthEndBalances(data.finance)
  const previousEnd = live ? balances.at(-2) : undefined
  const balanceTrend =
    previousEnd === undefined ? null : percentChange(summary.cash_balance, previousEnd)

  const last = summary.last_sunday
  const previous = summary.previous_sunday
  const sundays = data.attendance.weeks
    .map((week) => week.by_category.SUNDAY_SERVICE)
    .filter((stat) => stat.services > 0)
    .map((stat) => stat.total)

  const cards: Record<KpiKey, Omit<ComponentProps<typeof KpiCard>, 'tone'>> = {
    jiwa: {
      label: 'Total jiwa',
      value: summary.members.toLocaleString('id-ID'),
      icon: Users,
      hint: 'Anggota aktif',
      to: link('members'),
    },
    kk: {
      label: 'Kartu Keluarga',
      value: summary.families.toLocaleString('id-ID'),
      icon: House,
      hint: `Di ${served.toLocaleString('id-ID')} dari ${data.demographics.by_rayon.length.toLocaleString('id-ID')} rayon`,
      to: link('families'),
    },
    saldo: {
      label: 'Saldo kas',
      value: formatRupiah(summary.cash_balance),
      icon: WalletCards,
      trend: balanceTrend,
      hint:
        balanceTrend === null
          ? 'Seluruh Pos Kas, hari ini'
          : `dari akhir ${MONTH_NAMES[(period.month_to + 10) % 12]}`,
      spark: live ? [...balances.slice(0, -1), summary.cash_balance] : undefined,
      to: link('finance/budgets'),
    },
    hadir: {
      label: 'Kehadiran Minggu',
      value: last ? last.total.toLocaleString('id-ID') : '—',
      icon: CalendarCheck,
      trend: last && previous ? percentChange(last.total, previous.total) : null,
      hint: last
        ? previous
          ? `${formatShortDay(last.worship_date)} vs ${formatShortDay(previous.worship_date)}`
          : `${formatShortDay(last.worship_date)}${last.services > 1 ? ` · ${last.services} kebaktian` : ''}`
        : 'Belum ada kehadiran yang diinput',
      spark: live ? sundays : undefined,
      to: link('worships'),
    },
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {KPI_ORDER[role].map((key, index) => (
        <KpiCard key={key} {...cards[key]} tone={index === 0 ? 'brand' : 'neutral'} />
      ))}
    </div>
  )
}

function AttendanceMeta({
  period,
  stat,
  label,
}: {
  period: string
  stat: AnalyticsDashboard['attendance']['all']
  label: string
}) {
  if (stat.average === null) return <>{period} · rata-rata kehadiran per ibadah, per minggu</>
  return (
    <>
      {period} · {label}: rata-rata{' '}
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
    <div aria-hidden="true" className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="grid gap-3 rounded-xl p-5 ring-1 ring-foreground/10">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3.5 w-36" />
          </div>
        ))}
      </div>
      <div className={ROW}>
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
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
