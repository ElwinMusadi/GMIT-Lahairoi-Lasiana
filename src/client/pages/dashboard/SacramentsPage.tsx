import { useRef, useState, type ReactNode } from 'react'
import { Printer } from 'lucide-react'
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
import { SacramentStatusBadge } from '@/components/sacrament/status-badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  SearchField,
  SkeletonRows,
  TableCard,
  TableMessage,
  TablePagination,
  selectClass,
} from '@/components/zenith/data-table'
import { PageHeader } from '@/components/zenith/page-header'
import { PersonAvatar } from '@/components/zenith/person-avatar'
import { Segmented } from '@/components/zenith/segmented'
import { formatLongDate } from '@/lib/finance'
import { formatDate } from '@/lib/format'
import { STATUS_SHORT, TYPE_SHORT } from '@/lib/sacrament-admin'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const PER_PAGE = 50

// Status antrean: semua kecuali Selesai (Selesai = buku induk).
const QUEUE_STATUSES = SACRAMENT_STATUSES.filter((status) => status !== 'COMPLETED')

type View = 'queue' | 'register'

const VIEWS: { value: View; label: string }[] = [
  { value: 'queue', label: 'Antrean verifikasi' },
  { value: 'register', label: 'Buku Induk' },
]

// Layanan Sakramen (PRD: Verifikasi & Antrean Layanan Pastoral, Register Buku Induk).
// Antrean pendaftar dari portal, terlama dulu; Buku Induk berisi pendaftaran Selesai
// per jenis sakramen beserta nomor registernya. Filter disimpan di URL. Pola Zenith:
// tampilan di kepala halaman, status atau jenis bersegmen di bilah alat tabel.
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
  const unit = view === 'register' ? 'catatan' : 'pendaftaran'

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

  // Pesan selebar tabel: galat atau daftar kosong. Null bila baris (atau kerangka) tampil.
  const message: ReactNode = list.error ? (
    <>
      Data tidak dapat dimuat: {list.error}{' '}
      <button type="button" onClick={list.reload} className="font-medium underline">
        Coba lagi
      </button>
    </>
  ) : result && items.length === 0 ? (
    q ? (
      <>
        Tidak ada yang cocok dengan “{q}”.{' '}
        <button type="button" className="font-medium underline" onClick={() => clearSearch()}>
          Hapus pencarian
        </button>
      </>
    ) : view === 'register' ? (
      `Buku Induk ${TYPE_SHORT[registerType]} masih kosong. Pendaftaran yang diselesaikan tercatat di sini beserta nomor registernya.`
    ) : status ? (
      `Tidak ada pendaftaran berstatus ${SACRAMENT_STATUS_LABELS[status].toLowerCase()}.`
    ) : (
      'Antrean kosong. Pendaftaran baru dari portal (/layanan-sakramen) muncul di sini.'
    )
  ) : null

  const tableProps = { items, loading: list.loading, ready: Boolean(result), message }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Layanan Sakramen"
        description={
          overall.data ? (
            <Summary counts={overall.data.counts} />
          ) : (
            <span className="inline-block h-4 w-96 max-w-full animate-pulse rounded-md bg-muted align-middle" />
          )
        }
        actions={
          <Segmented
            label="Tampilan"
            value={view}
            onChange={(value) =>
              clearSearch({ view: value === 'register' ? 'register' : '', status: '' })
            }
            options={VIEWS}
          />
        }
      />

      <TableCard
        aria-label={view === 'register' ? 'Buku induk sakramen' : 'Antrean pendaftaran sakramen'}
        toolbar={
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {view === 'queue' ? (
                <Segmented
                  label="Status pendaftaran"
                  value={status || 'ALL'}
                  onChange={(value) =>
                    update({ status: value === 'ALL' ? '' : value.toLowerCase() })
                  }
                  options={[
                    { value: 'ALL', label: 'Semua aktif', count: activeCount },
                    ...QUEUE_STATUSES.map((value) => ({
                      value,
                      label: STATUS_SHORT[value],
                      count: counts?.[value],
                    })),
                  ]}
                />
              ) : (
                <Segmented
                  label="Jenis buku induk"
                  value={registerType}
                  onChange={(value) => update({ type: value.toLowerCase() })}
                  options={SACRAMENT_TYPES.map((value) => ({ value, label: TYPE_SHORT[value] }))}
                />
              )}
              <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
                {result ? `${total.toLocaleString('id-ID')} ${unit}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SearchField
                value={search}
                onChange={handleSearch}
                label="Cari pendaftaran"
                placeholder={
                  view === 'register'
                    ? 'Cari nama atau nomor register'
                    : 'Cari nama, kode, atau nomor HP'
                }
              />
              {view === 'queue' && (
                <select
                  aria-label="Jenis layanan"
                  value={type}
                  onChange={(event) => update({ type: event.target.value.toLowerCase() })}
                  className={cn(selectClass, 'w-full sm:w-56')}
                >
                  <option value="">Semua layanan</option>
                  {SACRAMENT_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {SACRAMENT_TYPE_LABELS[value]}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </>
        }
        footer={
          result && (
            <TablePagination
              label="Halaman daftar"
              page={page}
              perPage={PER_PAGE}
              total={total}
              unit={unit}
              onPage={(next) => update({ page: String(next) })}
            />
          )
        }
      >
        {view === 'register' ? <RegisterTable {...tableProps} /> : <QueueTable {...tableProps} />}
      </TableCard>
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
    <span className="tabular-nums">
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && ' · '}
          {part}
        </span>
      ))}
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

type TableProps = {
  items: SacramentListItem[]
  loading: boolean
  // Data pertama sudah tiba; sebelum itu tampil baris kerangka.
  ready: boolean
  message: ReactNode
}

// Isi badan tabel: pesan, kerangka, atau baris data.
function Rows({
  columns,
  skeleton,
  avatar = true,
  ready,
  message,
  children,
}: {
  columns: number
  skeleton: string[]
  // Buku induk diawali nomor register, bukan nama berpotret.
  avatar?: boolean
  ready: boolean
  message: ReactNode
  children: ReactNode
}) {
  if (message) return <TableMessage colSpan={columns}>{message}</TableMessage>
  if (!ready) return <SkeletonRows rows={8} cells={skeleton} avatar={avatar} />
  return children
}

// Sel nama: avatar, nama ke rincian, dan baris keterangan. Nama membungkus di bawah 1024 px
// agar nama dua mempelai terbaca utuh di ponsel.
function NameCell({ item, children }: { item: SacramentListItem; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <PersonAvatar name={item.applicant_name} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <Link
          to={`/dashboard/sacraments/${item.id}`}
          className="block font-medium break-words underline-offset-4 hover:underline lg:truncate"
        >
          {item.applicant_name}
        </Link>
        {children}
      </div>
    </div>
  )
}

const QUEUE_SKELETON = [
  '',
  'hidden md:table-cell',
  'hidden lg:table-cell',
  'hidden sm:table-cell',
  'hidden sm:table-cell',
]

function QueueTable({ items, loading, ready, message }: TableProps) {
  return (
    <Table className="table-fixed" aria-busy={loading}>
      <caption className="sr-only">Antrean pendaftaran sakramen</caption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Pendaftar</TableHead>
          <TableHead className="hidden w-32 md:table-cell">Masuk</TableHead>
          <TableHead className="hidden w-44 lg:table-cell">Jadwal</TableHead>
          <TableHead className="hidden w-20 text-right sm:table-cell">Berkas</TableHead>
          <TableHead className="hidden w-40 sm:table-cell">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className={cn('transition-opacity', loading && ready && 'opacity-60')}>
        <Rows columns={5} skeleton={QUEUE_SKELETON} ready={ready} message={message}>
          {items.map((item) => {
            const schedule = nextSchedule(item)
            return (
              <TableRow key={item.id} className="[&>td]:align-top">
                <TableCell>
                  <NameCell item={item}>
                    <p className="mt-0.5 text-[0.8125rem] text-muted-foreground lg:truncate">
                      <span className="font-mono">{item.registration_code}</span> ·{' '}
                      {SACRAMENT_TYPE_LABELS[item.type]}
                      <span className="md:hidden"> · masuk {formatDate(item.created_at)}</span>
                    </p>
                    {/* Di ponsel kolom status disembunyikan; lencananya pindah ke bawah nama. */}
                    <SacramentStatusBadge status={item.status} short className="mt-1.5 sm:hidden" />
                  </NameCell>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap tabular-nums md:table-cell">
                  {formatDate(item.created_at)}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
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
                </TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">
                  {item.document_count}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <SacramentStatusBadge status={item.status} short />
                </TableCell>
              </TableRow>
            )
          })}
        </Rows>
      </TableBody>
    </Table>
  )
}

const REGISTER_SKELETON = [
  'hidden sm:table-cell',
  '',
  'hidden md:table-cell',
  'hidden lg:table-cell',
  '',
]

function RegisterTable({ items, loading, ready, message }: TableProps) {
  return (
    <Table className="table-fixed" aria-busy={loading}>
      <caption className="sr-only">Buku induk sakramen</caption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="hidden w-44 sm:table-cell">Nomor register</TableHead>
          <TableHead>Nama</TableHead>
          <TableHead className="hidden w-40 md:table-cell">Tanggal pelaksanaan</TableHead>
          <TableHead className="hidden w-52 lg:table-cell">Pendeta</TableHead>
          <TableHead className="w-14 sm:w-28">
            <span className="sr-only">Cetak</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className={cn('transition-opacity', loading && ready && 'opacity-60')}>
        <Rows
          columns={5}
          skeleton={REGISTER_SKELETON}
          avatar={false}
          ready={ready}
          message={message}
        >
          {items.map((item) => {
            const members = [item.member_name, item.partner_name].filter(Boolean).join(' & ')
            return (
              <TableRow key={item.id} className="[&>td]:align-top">
                <TableCell className="hidden font-mono text-[0.8125rem] sm:table-cell">
                  {item.certificate_number}
                </TableCell>
                <TableCell>
                  <NameCell item={item}>
                    <p className="mt-0.5 text-[0.8125rem] text-muted-foreground lg:truncate">
                      <span className="font-mono sm:hidden">{item.certificate_number} · </span>
                      <span className="md:hidden">
                        {item.scheduled_date && formatLongDate(item.scheduled_date)} ·{' '}
                      </span>
                      {members ? `Data jemaat: ${members}` : 'Tidak tertaut ke data jemaat'}
                    </p>
                  </NameCell>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap tabular-nums md:table-cell">
                  {item.scheduled_date ? formatLongDate(item.scheduled_date) : '—'}
                </TableCell>
                <TableCell className="hidden truncate lg:table-cell">
                  {item.officiating_pastor ?? '—'}
                </TableCell>
                <TableCell className="py-2 pr-2 pl-0 text-right sm:pr-4">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/dashboard/sacraments/${item.id}/cetak`}>
                      <Printer data-icon="inline-start" />
                      {/* Di ponsel cukup ikon, agar kolom nama tetap lebar. */}
                      <span className="hidden sm:inline">Cetak</span>
                      <span className="sr-only"> sertifikat {item.applicant_name}</span>
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </Rows>
      </TableBody>
    </Table>
  )
}
