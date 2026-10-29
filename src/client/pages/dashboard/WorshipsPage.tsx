import { useRef, useState, type ReactNode } from 'react'
import {
  ClipboardList,
  EllipsisVertical,
  Eye,
  FileText,
  Globe,
  Pencil,
  Plus,
  TriangleAlert,
  X,
} from 'lucide-react'
import { Link } from 'react-router'
import { witaToday } from '@shared/dates'
import {
  WORSHIP_CATEGORY_LABELS,
  type ApiList,
  type ApiPage,
  type RayonListItem,
  type WorshipCategory,
  type WorshipItem,
} from '@shared/types'
import { AttendanceDialog } from '@/components/worship/attendance-dialog'
import { WorshipDetailSheet } from '@/components/worship/worship-detail-sheet'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  GroupHeaderRow,
  SearchField,
  SkeletonRows,
  TableCard,
  TableMessage,
  TablePagination,
  selectClass,
} from '@/components/zenith/data-table'
import { PageHeader } from '@/components/zenith/page-header'
import { Segmented } from '@/components/zenith/segmented'
import { StatusBadge } from '@/components/zenith/status-badge'
import { useCan } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'
import {
  CATEGORY_ORDER,
  WORSHIP_PLANNERS,
  attendanceBreakdown,
  dayHeading,
  worshipKind,
  worshipTime,
} from '@/lib/worship'

const PER_PAGE = 100
// Jam, Ibadah, Petugas, Kehadiran/Tata ibadah, Tindakan.
const COLUMNS = 5

type View = 'upcoming' | 'past'

// Jadwal Ibadah (PRD: Penjadwalan Ibadah, Pelayan & Kehadiran). "Mendatang" untuk
// menyusun jadwal dan petugas, dengan tanda bentrok; "Sudah berlangsung" untuk mencatat
// kehadiran. Hari ini ada di keduanya. Filter disimpan di URL. Tabel bergaya Zenith (D6:
// tanpa tampilan kalender): tampilan bersegmen, pencarian dan filter di bilah alat, dan
// baris dikelompokkan per tanggal.
export default function WorshipsPage() {
  const canPlan = useCan(WORSHIP_PLANNERS)
  const { params, update } = useUrlFilters()
  const [today] = useState(witaToday)
  const view: View = params.get('view') === 'past' ? 'past' : 'upcoming'
  const categoryParam = (params.get('category') ?? '').toUpperCase()
  const category = (CATEGORY_ORDER as string[]).includes(categoryParam)
    ? (categoryParam as WorshipCategory)
    : ''
  const rayonId = params.get('rayon_id') ?? ''
  const attendanceParam = params.get('attendance') ?? ''
  const attendance =
    view === 'past' && (attendanceParam === 'missing' || attendanceParam === 'recorded')
      ? attendanceParam
      : ''
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)

  const [search, setSearch] = useState(q)
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    if (q !== search.trim()) setSearch(q)
  }
  const searchTimer = useRef<number | undefined>(undefined)

  const [detail, setDetail] = useState<WorshipItem | null>(null)
  const [recording, setRecording] = useState<WorshipItem | null>(null)

  const range = view === 'past' ? { to: today, sort: 'desc' } : { from: today, sort: 'asc' }
  const worships = useApiQuery<ApiPage<WorshipItem>>('/worships', {
    ...range,
    category,
    rayon_id: rayonId,
    attendance,
    q,
    page,
    per_page: PER_PAGE,
  })
  // Temuan di bawah judul: ibadah yang sudah berlangsung tetapi belum dicatat kehadirannya.
  const missing = useApiQuery<ApiPage<WorshipItem>>('/worships', {
    to: today,
    attendance: 'missing',
    per_page: 1,
  })
  const rayons = useApiQuery<ApiList<RayonListItem>>('/rayons')

  const result = worships.data
  const items = result?.data ?? []
  const total = result?.meta.total ?? 0
  const filtered = Boolean(category || rayonId || attendance || q)
  const missingCount = missing.data?.meta.total
  const conflictCount = items.filter((item) => item.has_conflict).length

  // Kelompok per tanggal, berurutan seperti dari API.
  const days: { date: string; items: WorshipItem[] }[] = []
  for (const item of items) {
    const group = days.at(-1)
    if (group?.date === item.worship_date) group.items.push(item)
    else days.push({ date: item.worship_date, items: [item] })
  }

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

  function handleAttendanceSaved(saved: WorshipItem) {
    setRecording(null)
    setDetail((current) => (current?.id === saved.id ? saved : current))
    worships.reload()
    missing.reload()
  }

  function openAttendance(worship: WorshipItem) {
    setRecording(worship)
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Jadwal Ibadah"
        description={
          result && missingCount !== undefined ? (
            <Summary
              view={view}
              total={total}
              filtered={filtered}
              conflictCount={conflictCount}
              missingCount={missingCount}
              onShowMissing={() =>
                clearSearch({ view: 'past', attendance: 'missing', category: '', rayon_id: '' })
              }
            />
          ) : (
            <span className="inline-block h-4 w-80 max-w-full animate-pulse rounded-md bg-muted align-middle" />
          )
        }
        actions={
          canPlan && (
            <Button asChild size="lg">
              <Link to="/dashboard/worships/new">
                <Plus data-icon="inline-start" />
                Tambah jadwal
              </Link>
            </Button>
          )
        }
      />

      <TableCard
        aria-label="Daftar jadwal ibadah"
        toolbar={
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented
                label="Tampilan jadwal"
                value={view}
                onChange={(value) =>
                  update({ view: value === 'past' ? 'past' : '', attendance: '', page: '' })
                }
                options={[
                  { value: 'upcoming', label: 'Mendatang' },
                  {
                    value: 'past',
                    label: (
                      <>
                        Sudah berlangsung
                        {missingCount !== undefined && missingCount > 0 && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {missingCount.toLocaleString('id-ID')}
                            <span className="sr-only sm:not-sr-only"> belum dicatat</span>
                          </span>
                        )}
                      </>
                    ),
                  },
                ]}
              />
              <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
                {result ? `${total.toLocaleString('id-ID')} jadwal` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SearchField
                value={search}
                onChange={handleSearch}
                label="Cari jadwal ibadah"
                placeholder="Cari nama, tema, atau lokasi"
              />
              <div
                role="group"
                aria-label="Filter"
                className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap"
              >
                <select
                  aria-label="Jenis ibadah"
                  value={category}
                  onChange={(event) =>
                    update({
                      category: event.target.value,
                      rayon_id: event.target.value && event.target.value !== 'RAYON' ? '' : rayonId,
                    })
                  }
                  className={selectClass}
                >
                  <option value="">Semua jenis</option>
                  {CATEGORY_ORDER.map((value) => (
                    <option key={value} value={value}>
                      {WORSHIP_CATEGORY_LABELS[value]}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Rayon"
                  value={rayonId}
                  disabled={!rayons.data}
                  onChange={(event) => update({ rayon_id: event.target.value })}
                  className={selectClass}
                >
                  <option value="">Semua rayon</option>
                  {(rayons.data?.data ?? []).map((rayon) => (
                    <option key={rayon.id} value={rayon.id}>
                      Rayon {rayon.name}
                    </option>
                  ))}
                </select>
                {view === 'past' && (
                  <select
                    aria-label="Kehadiran"
                    value={attendance}
                    onChange={(event) => update({ attendance: event.target.value })}
                    className={cn(selectClass, 'col-span-2 sm:col-span-1')}
                  >
                    <option value="">Kehadiran: semua</option>
                    <option value="missing">Kehadiran belum dicatat</option>
                    <option value="recorded">Kehadiran sudah dicatat</option>
                  </select>
                )}
              </div>
              {filtered && (
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => clearSearch({ category: '', rayon_id: '', attendance: '' })}
                >
                  <X data-icon="inline-start" />
                  Hapus filter
                </Button>
              )}
            </div>
          </>
        }
        footer={
          result &&
          total > PER_PAGE && (
            <TablePagination
              label="Halaman jadwal ibadah"
              page={page}
              perPage={PER_PAGE}
              total={total}
              unit="jadwal"
              onPage={(next) => update({ page: String(next) })}
            />
          )
        }
      >
        <Table className="table-fixed" aria-busy={worships.loading}>
          <caption className="sr-only">
            {view === 'past'
              ? 'Ibadah yang sudah berlangsung, terbaru dulu, dikelompokkan per tanggal'
              : 'Jadwal ibadah mendatang, dikelompokkan per tanggal'}
          </caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="hidden w-20 text-right sm:table-cell">Jam</TableHead>
              <TableHead>Ibadah</TableHead>
              <TableHead className="hidden w-[30%] md:table-cell">Petugas</TableHead>
              {view === 'past' ? (
                <TableHead className="w-28 text-right sm:w-32">Kehadiran</TableHead>
              ) : (
                <TableHead className="hidden w-12 px-2 sm:table-cell">
                  <FileText className="mx-auto size-3.5" aria-hidden="true" />
                  <span className="sr-only">Tata ibadah</span>
                </TableHead>
              )}
              <TableHead className="w-12">
                <span className="sr-only">Tindakan</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          {worships.error ? (
            <TableBody>
              <TableMessage colSpan={COLUMNS}>
                Jadwal tidak dapat dimuat: {worships.error}{' '}
                <button type="button" onClick={worships.reload} className="font-medium underline">
                  Coba lagi
                </button>
              </TableMessage>
            </TableBody>
          ) : !result ? (
            <TableBody>
              <SkeletonRows
                avatar={false}
                cells={[
                  'hidden sm:table-cell',
                  '',
                  'hidden md:table-cell',
                  view === 'past' ? '' : 'hidden sm:table-cell',
                  '',
                ]}
              />
            </TableBody>
          ) : items.length === 0 ? (
            <TableBody>
              <TableMessage colSpan={COLUMNS}>
                {q ? (
                  <>
                    Tidak ada jadwal yang cocok dengan “{q}”.{' '}
                    <button
                      type="button"
                      className="font-medium underline"
                      onClick={() => clearSearch()}
                    >
                      Hapus pencarian
                    </button>
                  </>
                ) : attendance === 'missing' ? (
                  'Kehadiran semua ibadah yang sudah berlangsung sudah dicatat.'
                ) : filtered ? (
                  'Tidak ada jadwal yang cocok dengan filter ini.'
                ) : view === 'past' ? (
                  'Belum ada ibadah yang sudah berlangsung.'
                ) : (
                  <>
                    Belum ada jadwal ibadah mendatang.
                    {canPlan && (
                      <>
                        {' '}
                        <Link
                          to="/dashboard/worships/new"
                          className="font-medium text-foreground underline"
                        >
                          Tambah jadwal
                        </Link>
                      </>
                    )}
                  </>
                )}
              </TableMessage>
            </TableBody>
          ) : (
            days.map((day) => (
              <TableBody
                key={day.date}
                className={cn('transition-opacity', worships.loading && 'opacity-60')}
              >
                <GroupHeaderRow>{dayHeading(day.date, today)}</GroupHeaderRow>
                {day.items.map((worship) => (
                  <WorshipRow
                    key={worship.id}
                    worship={worship}
                    view={view}
                    held={worship.worship_date <= today}
                    canPlan={canPlan}
                    onView={() => setDetail(worship)}
                    onAttendance={() => openAttendance(worship)}
                  />
                ))}
              </TableBody>
            ))
          )}
        </Table>
      </TableCard>

      <WorshipDetailSheet
        worship={detail}
        today={today}
        canPlan={canPlan}
        onClose={() => setDetail(null)}
        onAttendance={openAttendance}
      />
      <AttendanceDialog
        worship={recording}
        onClose={() => setRecording(null)}
        onSaved={handleAttendanceSaved}
      />
    </div>
  )
}

function Summary({
  view,
  total,
  filtered,
  conflictCount,
  missingCount,
  onShowMissing,
}: {
  view: View
  total: number
  filtered: boolean
  conflictCount: number
  missingCount: number
  onShowMissing: () => void
}) {
  const count = total.toLocaleString('id-ID')
  const parts: ReactNode[] = [
    view === 'past'
      ? `${count} ibadah sudah berlangsung${filtered ? ' (sesuai filter)' : ''}`
      : `${count} ibadah mendatang${filtered ? ' (sesuai filter)' : ''}`,
  ]
  if (view === 'upcoming' && conflictCount > 0) {
    parts.push(
      <span key="bentrok" className="font-medium text-warning-ink">
        {conflictCount.toLocaleString('id-ID')} dengan petugas bentrok
      </span>,
    )
  }
  if (missingCount > 0) {
    parts.push(
      <span key="kehadiran">
        <span className="font-medium text-foreground">
          {missingCount.toLocaleString('id-ID')} kehadiran belum dicatat
        </span>{' '}
        <button
          type="button"
          className="font-medium text-foreground underline underline-offset-4"
          onClick={onShowMissing}
        >
          Tampilkan
        </button>
      </span>,
    )
  }
  // Isi deskripsi PageHeader (di dalam <p>), jadi hanya elemen sebaris.
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

function WorshipRow({
  worship,
  view,
  held,
  canPlan,
  onView,
  onAttendance,
}: {
  worship: WorshipItem
  view: View
  held: boolean
  canPlan: boolean
  onView: () => void
  onAttendance: () => void
}) {
  const time = worshipTime(worship.worship_time)
  const preacher = worship.servants.find((servant) => servant.role === 'PREACHER')
  const conflicts = worship.servants.filter((servant) => servant.conflicts.length > 0).length
  const others = worship.servants.length - (preacher ? 1 : 0)
  const crew = preacher
    ? `${preacher.servant_name}${others > 0 ? ` +${others}` : ''}`
    : worship.servants.length > 0
      ? `${worship.servants.length} petugas`
      : null

  const conflictMark = conflicts > 0 && (
    <StatusBadge tone="warning" className="flex-none">
      <TriangleAlert className="size-3" aria-hidden="true" />
      {conflicts} bentrok
    </StatusBadge>
  )

  return (
    <TableRow className="[&>td]:align-top">
      <TableCell className="hidden text-right whitespace-nowrap tabular-nums sm:table-cell">
        {time ?? (
          <span className="text-muted-foreground" title="Jam menyusul">
            —<span className="sr-only">Jam menyusul</span>
          </span>
        )}
      </TableCell>
      <TableCell className="pr-2 sm:pr-4">
        {/* Di bawah 1024 px nama, lokasi, dan petugas membungkus agar terbaca utuh. */}
        <button
          type="button"
          onClick={onView}
          className="block max-w-full text-left font-medium break-words underline-offset-4 hover:underline lg:truncate"
        >
          {worship.title}
        </button>
        <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-[0.8125rem] text-muted-foreground lg:flex-nowrap">
          <span className="min-w-0 break-words lg:truncate">
            <span className="tabular-nums sm:hidden">{time ?? 'Jam menyusul'} · </span>
            {worshipKind(worship)}
            {worship.location && ` · ${worship.location}`}
          </span>
          {worship.is_public && (
            <span
              className="inline-flex flex-none items-center gap-1"
              title="Tampil di Papan Jadwal portal"
            >
              <Globe className="size-3.5" aria-hidden="true" />
              <span className="hidden lg:inline">Publik</span>
              <span className="sr-only lg:hidden">Publik</span>
            </span>
          )}
        </p>
        {/* Di bawah lebar tablet kolom Petugas pindah ke baris ketiga. */}
        <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.8125rem] md:hidden">
          <span className={cn('min-w-0 break-words', !crew && 'text-muted-foreground')}>
            {crew ?? 'Belum ada petugas'}
          </span>
          {conflictMark}
        </p>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <p className={cn('break-words lg:truncate', !crew && 'text-muted-foreground')}>
          {crew ?? 'Belum ada petugas'}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
          {conflictMark ||
            (preacher
              ? 'Pelayan Firman'
              : worship.servants.length > 0
                ? 'Pelayan Firman belum ditetapkan'
                : '')}
        </p>
      </TableCell>
      {view === 'past' ? (
        <TableCell className="text-right">
          {worship.attendance_total !== null ? (
            <button
              type="button"
              onClick={onAttendance}
              className="grid w-full justify-items-end text-right"
              title={attendanceBreakdown(worship)}
            >
              <span className="font-medium tabular-nums">
                {worship.attendance_total.toLocaleString('id-ID')}
              </span>
              <span className="text-[0.8125rem] text-muted-foreground">orang</span>
              <span className="sr-only">. {attendanceBreakdown(worship)}. Ubah kehadiran</span>
            </button>
          ) : held ? (
            <Button variant="outline" size="sm" onClick={onAttendance}>
              Catat
              <span className="sr-only"> kehadiran {worship.title}</span>
            </Button>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
      ) : (
        <TableCell className="hidden px-2 text-center sm:table-cell">
          {worship.liturgy_file_url ? (
            <a
              href={worship.liturgy_file_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex size-6 items-center justify-center rounded-md text-foreground hover:bg-muted"
              title="Buka tata ibadah"
            >
              <FileText className="size-4" aria-hidden="true" />
              <span className="sr-only">Buka tata ibadah {worship.title} (tab baru)</span>
            </a>
          ) : (
            <span className="text-muted-foreground">
              —<span className="sr-only">Belum ada tata ibadah</span>
            </span>
          )}
        </TableCell>
      )}
      <TableCell className="py-1.5 pr-2 pl-0 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-10 sm:size-8">
              <EllipsisVertical />
              <span className="sr-only">Tindakan untuk {worship.title}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem onSelect={onView}>
              <Eye />
              Lihat rincian
            </DropdownMenuItem>
            {canPlan && (
              <DropdownMenuItem asChild>
                <Link to={`/dashboard/worships/${worship.id}`}>
                  <Pencil />
                  Ubah jadwal & petugas
                </Link>
              </DropdownMenuItem>
            )}
            {held && (
              <DropdownMenuItem onSelect={onAttendance}>
                <ClipboardList />
                {worship.attendance_total !== null ? 'Ubah kehadiran' : 'Catat kehadiran'}
              </DropdownMenuItem>
            )}
            {worship.liturgy_file_url && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href={worship.liturgy_file_url} target="_blank" rel="noreferrer">
                    <FileText />
                    Buka tata ibadah
                  </a>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
