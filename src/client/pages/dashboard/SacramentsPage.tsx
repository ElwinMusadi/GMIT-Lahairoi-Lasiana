import { useRef, useState, type ReactNode } from 'react'
import { FileText, Printer, Search } from 'lucide-react'
import { Link } from 'react-router'
import {
  SACRAMENT_STATUSES,
  SACRAMENT_STATUS_LABELS,
  SACRAMENT_TYPES,
  SACRAMENT_TYPE_LABELS,
  type SacramentListItem,
  type SacramentPage,
  type SacramentStatus,
  type SacramentType,
} from '@shared/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { formatLongDate } from '@/lib/finance'
import { formatDate } from '@/lib/format'
import { STATUS_PILL, STATUS_SHORT, TYPE_SHORT } from '@/lib/sacrament-admin'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const PER_PAGE = 50

const controlClass =
  'h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

// Status antrean: semua kecuali Selesai (Selesai = buku induk).
const QUEUE_STATUSES = SACRAMENT_STATUSES.filter((status) => status !== 'COMPLETED')

type View = 'queue' | 'register'

// Layanan Sakramen (PRD: Verifikasi & Antrean Layanan Pastoral, Register Buku Induk).
// Antrean pendaftar dari portal, terlama dulu; Buku Induk berisi pendaftaran Selesai
// per jenis sakramen beserta nomor registernya. Filter disimpan di URL.
export default function SacramentsPage() {
  const { params, update } = useUrlFilters()
  const view: View = params.get('view') === 'register' ? 'register' : 'queue'
  const statusParam = (params.get('status') ?? '').toUpperCase()
  const status = (QUEUE_STATUSES as string[]).includes(statusParam)
    ? (statusParam as SacramentStatus)
    : ''
  const typeParam = (params.get('type') ?? '').toUpperCase()
  const type = (SACRAMENT_TYPES as string[]).includes(typeParam) ? (typeParam as SacramentType) : ''
  // Buku induk selalu per jenis sakramen.
  const registerType: SacramentType = type || 'BAPTISM'
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)

  const [search, setSearch] = useState(q)
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    if (q !== search.trim()) setSearch(q)
  }
  const searchTimer = useRef<number | undefined>(undefined)

  const list = useApiQuery<SacramentPage>(
    '/sacraments',
    view === 'register'
      ? { status: 'COMPLETED', type: registerType, q, sort: 'latest', page, per_page: PER_PAGE }
      : { status: status || 'active', type, q, sort: 'oldest', page, per_page: PER_PAGE },
  )
  // Ringkasan di bawah judul: seluruh pendaftaran, tanpa filter.
  const overall = useApiQuery<SacramentPage>('/sacraments', { per_page: 1 })

  const result = list.data
  const items = result?.data ?? []
  const total = result?.meta.total ?? 0
  const counts = result?.counts
  const activeCount = counts
    ? QUEUE_STATUSES.reduce((sum, value) => sum + counts[value], 0)
    : undefined
  const first = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const last = Math.min(page * PER_PAGE, total)

  function handleSearch(value: string) {
    setSearch(value)
    window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => update({ q: value.trim() }), 300)
  }

  function clearSearch(changes: Record<string, string> = {}) {
    window.clearTimeout(searchTimer.current)
    setSearch('')
    update({ ...changes, q: '' })
  }

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Layanan Sakramen</h1>
        {overall.data ? (
          <Summary counts={overall.data.counts} />
        ) : (
          <Skeleton className="h-5 w-96 max-w-full" />
        )}
      </header>

      <nav aria-label="Tampilan" className="border-b">
        <ul className="flex gap-1">
          {(
            [
              ['queue', 'Antrean verifikasi'],
              ['register', 'Buku Induk'],
            ] as const
          ).map(([value, label]) => (
            <li key={value}>
              <button
                type="button"
                aria-pressed={view === value}
                onClick={() =>
                  clearSearch({ view: value === 'register' ? 'register' : '', status: '' })
                }
                className={cn(
                  '-mb-px border-b-2 px-3 pt-1 pb-2.5 text-sm outline-offset-[-2px]',
                  view === value
                    ? 'border-foreground font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-3">
        {view === 'queue' ? (
          <div
            role="group"
            aria-label="Status pendaftaran"
            className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
          >
            <StatusChip
              active={!status}
              label="Semua aktif"
              count={activeCount}
              onClick={() => update({ status: '' })}
            />
            {QUEUE_STATUSES.map((value) => (
              <StatusChip
                key={value}
                active={status === value}
                label={SACRAMENT_STATUS_LABELS[value]}
                count={counts?.[value]}
                onClick={() => update({ status: value.toLowerCase() })}
              />
            ))}
          </div>
        ) : (
          <div
            role="group"
            aria-label="Jenis buku induk"
            className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
          >
            {SACRAMENT_TYPES.map((value) => (
              <StatusChip
                key={value}
                active={registerType === value}
                label={`Buku Induk ${TYPE_SHORT[value]}`}
                onClick={() => update({ type: value.toLowerCase() })}
              />
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          {view === 'queue' && (
            <div className="grid w-full gap-1.5 sm:w-56">
              <Label htmlFor="filter-jenis" className="text-xs font-normal text-muted-foreground">
                Jenis layanan
              </Label>
              <select
                id="filter-jenis"
                value={type}
                onChange={(event) => update({ type: event.target.value.toLowerCase() })}
                className={controlClass}
              >
                <option value="">Semua layanan</option>
                {SACRAMENT_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {SACRAMENT_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="relative w-full sm:w-80">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder={
                view === 'register'
                  ? 'Cari nama atau nomor register'
                  : 'Cari nama, kode, atau nomor HP'
              }
              aria-label="Cari pendaftaran"
              className={cn(controlClass, 'pl-9')}
            />
          </div>
          <p className="ml-auto text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {result
              ? `${total.toLocaleString('id-ID')} ${view === 'register' ? 'catatan' : 'pendaftaran'}`
              : ''}
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        {list.error ? (
          <Message>
            Data tidak dapat dimuat: {list.error}{' '}
            <button type="button" onClick={list.reload} className="font-medium underline">
              Coba lagi
            </button>
          </Message>
        ) : !result ? (
          <div className="grid gap-3 p-4" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Message>
            {q ? (
              <>
                Tidak ada yang cocok dengan “{q}”.{' '}
                <button
                  type="button"
                  className="font-medium underline"
                  onClick={() => clearSearch()}
                >
                  Hapus pencarian
                </button>
              </>
            ) : view === 'register' ? (
              `Buku Induk ${TYPE_SHORT[registerType]} masih kosong. Pendaftaran yang diselesaikan tercatat di sini beserta nomor registernya.`
            ) : status ? (
              `Tidak ada pendaftaran berstatus ${SACRAMENT_STATUS_LABELS[status].toLowerCase()}.`
            ) : (
              'Antrean kosong. Pendaftaran baru dari portal (/layanan-sakramen) muncul di sini.'
            )}
          </Message>
        ) : view === 'register' ? (
          <RegisterTable items={items} loading={list.loading} />
        ) : (
          <QueueTable items={items} loading={list.loading} />
        )}

        {result && total > PER_PAGE && (
          <nav
            aria-label="Halaman daftar"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-3"
          >
            <p className="text-sm text-muted-foreground tabular-nums">
              {first.toLocaleString('id-ID')}–{last.toLocaleString('id-ID')} dari{' '}
              {total.toLocaleString('id-ID')}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => update({ page: String(page - 1) })}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                disabled={last >= total}
                onClick={() => update({ page: String(page + 1) })}
              >
                Berikutnya
              </Button>
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}

function Summary({ counts }: { counts: Record<SacramentStatus, number> }) {
  const parts = [
    counts.PENDING > 0 && (
      <span key="pending" className="font-medium text-foreground">
        {counts.PENDING.toLocaleString('id-ID')} menunggu verifikasi
      </span>
    ),
    counts.REVISION > 0 && `${counts.REVISION.toLocaleString('id-ID')} revisi berkas`,
    counts.COUNSELING > 0 && `${counts.COUNSELING.toLocaleString('id-ID')} konseling`,
    counts.APPROVED > 0 && `${counts.APPROVED.toLocaleString('id-ID')} disetujui`,
    `${counts.COMPLETED.toLocaleString('id-ID')} tercatat di buku induk`,
  ].filter(Boolean)
  return (
    <p className="text-sm text-muted-foreground tabular-nums">
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && ' · '}
          {part}
        </span>
      ))}
    </p>
  )
}

function StatusChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 flex-none items-center gap-2 rounded-lg border px-3 text-sm whitespace-nowrap',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-input bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn('tabular-nums', active ? 'text-background/70' : 'text-muted-foreground')}
        >
          {count.toLocaleString('id-ID')}
        </span>
      )}
    </button>
  )
}

function StatusPill({ status }: { status: SacramentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex flex-none rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        STATUS_PILL[status],
      )}
      title={SACRAMENT_STATUS_LABELS[status]}
    >
      {STATUS_SHORT[status]}
    </span>
  )
}

// Jadwal yang relevan untuk status ini: pelaksanaan bila ada, selain itu konseling.
function nextSchedule(
  item: SacramentListItem,
): { label: string; date: string; time: string | null } | null {
  if (item.scheduled_date) {
    return { label: 'Pelaksanaan', date: item.scheduled_date, time: item.scheduled_time }
  }
  if (item.counseling_date) {
    return { label: 'Konseling', date: item.counseling_date, time: item.counseling_time }
  }
  return null
}

function QueueTable({ items, loading }: { items: SacramentListItem[]; loading: boolean }) {
  return (
    <table
      className={cn('w-full table-fixed text-sm', loading && 'opacity-60')}
      aria-busy={loading}
    >
      <caption className="sr-only">Antrean pendaftaran sakramen</caption>
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          <th scope="col" className="h-10 pr-4 pl-4 font-normal">
            Pendaftar
          </th>
          <th scope="col" className="hidden w-32 pr-4 font-normal md:table-cell">
            Masuk
          </th>
          <th scope="col" className="hidden w-44 pr-4 font-normal lg:table-cell">
            Jadwal
          </th>
          <th scope="col" className="hidden w-20 pr-4 text-right font-normal sm:table-cell">
            Berkas
          </th>
          <th scope="col" className="w-36 pr-4 font-normal sm:w-44">
            Status
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const schedule = nextSchedule(item)
          return (
            <tr key={item.id} className="border-t border-rule align-top">
              <td className="py-3 pr-4 pl-4">
                <Link
                  to={`/dashboard/sacraments/${item.id}`}
                  className="block truncate font-medium underline-offset-4 hover:underline"
                >
                  {item.applicant_name}
                </Link>
                <p className="mt-0.5 truncate text-[0.8125rem] text-muted-foreground">
                  <span className="font-mono">{item.registration_code}</span> ·{' '}
                  {SACRAMENT_TYPE_LABELS[item.type]}
                  <span className="md:hidden"> · masuk {formatDate(item.created_at)}</span>
                </p>
              </td>
              <td className="hidden py-3 pr-4 whitespace-nowrap tabular-nums md:table-cell">
                {formatDate(item.created_at)}
              </td>
              <td className="hidden py-3 pr-4 lg:table-cell">
                {schedule ? (
                  <>
                    <span className="block tabular-nums">{formatLongDate(schedule.date)}</span>
                    <span className="text-[0.8125rem] text-muted-foreground">
                      {schedule.label}
                      {schedule.time && ` · ${schedule.time.replace(':', '.')}`}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="hidden py-3 pr-4 text-right tabular-nums sm:table-cell">
                {item.document_count}
              </td>
              <td className="py-3 pr-4">
                <StatusPill status={item.status} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function RegisterTable({ items, loading }: { items: SacramentListItem[]; loading: boolean }) {
  return (
    <table
      className={cn('w-full table-fixed text-sm', loading && 'opacity-60')}
      aria-busy={loading}
    >
      <caption className="sr-only">Buku induk sakramen</caption>
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          <th scope="col" className="hidden h-10 w-44 pl-4 font-normal sm:table-cell">
            Nomor register
          </th>
          <th scope="col" className="h-10 pr-4 pl-4 font-normal sm:pl-4">
            Nama
          </th>
          <th scope="col" className="hidden w-40 pr-4 font-normal md:table-cell">
            Tanggal pelaksanaan
          </th>
          <th scope="col" className="hidden w-52 pr-4 font-normal lg:table-cell">
            Pendeta
          </th>
          <th scope="col" className="w-28 pr-4 text-right font-normal">
            <span className="sr-only">Cetak</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const members = [item.member_name, item.partner_name].filter(Boolean).join(' & ')
          return (
            <tr key={item.id} className="border-t border-rule align-top">
              <td className="hidden py-3 pl-4 font-mono text-[0.8125rem] sm:table-cell">
                {item.certificate_number}
              </td>
              <td className="py-3 pr-4 pl-4">
                <Link
                  to={`/dashboard/sacraments/${item.id}`}
                  className="block truncate font-medium underline-offset-4 hover:underline"
                >
                  {item.applicant_name}
                </Link>
                <p className="mt-0.5 truncate text-[0.8125rem] text-muted-foreground">
                  <span className="font-mono sm:hidden">{item.certificate_number} · </span>
                  <span className="md:hidden">
                    {item.scheduled_date && formatLongDate(item.scheduled_date)} ·{' '}
                  </span>
                  {members ? `Data jemaat: ${members}` : 'Tidak tertaut ke data jemaat'}
                </p>
              </td>
              <td className="hidden py-3 pr-4 whitespace-nowrap tabular-nums md:table-cell">
                {item.scheduled_date ? formatLongDate(item.scheduled_date) : '—'}
              </td>
              <td className="hidden truncate py-3 pr-4 lg:table-cell">
                {item.officiating_pastor ?? '—'}
              </td>
              <td className="py-2 pr-4 text-right">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/dashboard/sacraments/${item.id}/cetak`}>
                    <Printer data-icon="inline-start" />
                    Cetak
                    <span className="sr-only"> sertifikat {item.applicant_name}</span>
                  </Link>
                </Button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Message({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 px-4 py-6 text-sm text-muted-foreground">
      <FileText className="mt-0.5 size-4 flex-none" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}
