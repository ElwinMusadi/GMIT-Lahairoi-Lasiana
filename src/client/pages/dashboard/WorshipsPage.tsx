import { useRef, useState, type ReactNode } from 'react'
import {
  ClipboardList,
  EllipsisVertical,
  Eye,
  FileText,
  Globe,
  Pencil,
  Plus,
  Search,
  TriangleAlert,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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

const controlClass =
  'h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

type View = 'upcoming' | 'past'

// Jadwal Ibadah (PRD: Penjadwalan Ibadah, Pelayan & Kehadiran). "Mendatang" untuk
// menyusun jadwal dan petugas, dengan tanda bentrok; "Sudah berlangsung" untuk mencatat
// kehadiran. Hari ini ada di keduanya. Filter disimpan di URL.
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
  const first = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const last = Math.min(page * PER_PAGE, total)
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
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Jadwal Ibadah</h1>
          {result && missingCount !== undefined ? (
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
            <Skeleton className="h-5 w-80" />
          )}
        </div>
        {canPlan && (
          <Button asChild size="lg">
            <Link to="/dashboard/worships/new">
              <Plus data-icon="inline-start" />
              Tambah jadwal
            </Link>
          </Button>
        )}
      </header>

      <nav aria-label="Tampilan jadwal" className="border-b">
        <ul className="flex gap-1">
          {(
            [
              ['upcoming', 'Mendatang'],
              ['past', 'Sudah berlangsung'],
            ] as const
          ).map(([value, label]) => (
            <li key={value}>
              <button
                type="button"
                aria-pressed={view === value}
                onClick={() =>
                  update({ view: value === 'past' ? 'past' : '', attendance: '', page: '' })
                }
                className={cn(
                  '-mb-px border-b-2 px-3 pt-1 pb-2.5 text-sm outline-offset-[-2px]',
                  view === value
                    ? 'border-foreground font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
                {value === 'past' && missingCount !== undefined && missingCount > 0 && (
                  <span className="ml-1.5 text-muted-foreground tabular-nums">
                    {missingCount.toLocaleString('id-ID')}
                    <span className="sr-only sm:not-sr-only"> belum dicatat</span>
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-3">
        <div
          className={cn(
            'grid grid-cols-2 items-end gap-3',
            view === 'past' ? 'md:grid-cols-4' : 'md:grid-cols-3',
          )}
        >
          <FilterField id="filter-jenis" label="Jenis ibadah">
            <select
              id="filter-jenis"
              value={category}
              onChange={(event) =>
                update({
                  category: event.target.value,
                  rayon_id: event.target.value && event.target.value !== 'RAYON' ? '' : rayonId,
                })
              }
              className={controlClass}
            >
              <option value="">Semua jenis</option>
              {CATEGORY_ORDER.map((value) => (
                <option key={value} value={value}>
                  {WORSHIP_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField id="filter-rayon" label="Rayon">
            <select
              id="filter-rayon"
              value={rayonId}
              disabled={!rayons.data}
              onChange={(event) => update({ rayon_id: event.target.value })}
              className={controlClass}
            >
              <option value="">Semua rayon</option>
              {(rayons.data?.data ?? []).map((rayon) => (
                <option key={rayon.id} value={rayon.id}>
                  {rayon.name}
                </option>
              ))}
            </select>
          </FilterField>
          {view === 'past' && (
            <FilterField id="filter-kehadiran" label="Kehadiran">
              <select
                id="filter-kehadiran"
                value={attendance}
                onChange={(event) => update({ attendance: event.target.value })}
                className={controlClass}
              >
                <option value="">Semua</option>
                <option value="missing">Belum dicatat</option>
                <option value="recorded">Sudah dicatat</option>
              </select>
            </FilterField>
          )}
          {/* Tampilan Sudah berlangsung: pencarian berbagi baris dengan Kehadiran di ponsel. */}
          <div className={cn('relative', view === 'upcoming' && 'col-span-2 md:col-span-1')}>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Cari nama, tema, atau lokasi"
              aria-label="Cari jadwal ibadah"
              className={cn(controlClass, 'pl-9')}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {filtered && (
            <Button
              variant="ghost"
              onClick={() => clearSearch({ category: '', rayon_id: '', attendance: '' })}
            >
              Hapus filter
            </Button>
          )}
          <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {result ? `${total.toLocaleString('id-ID')} jadwal` : ''}
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card" aria-busy={worships.loading}>
        {/* Judul kolom tampil sekali; setiap tanggal adalah tabel tersendiri dengan judul
            kolom untuk pembaca layar, agar kolom yang disembunyikan di ponsel tidak
            menyisakan lebar. */}
        <table className="w-full table-fixed text-sm" aria-hidden="true">
          <thead>
            <ColumnHeads view={view} />
          </thead>
        </table>
        {worships.error ? (
          <Message>
            Jadwal tidak dapat dimuat: {worships.error}{' '}
            <button type="button" onClick={worships.reload} className="font-medium underline">
              Coba lagi
            </button>
          </Message>
        ) : !result ? (
          <table className="w-full table-fixed text-sm" aria-hidden="true">
            <thead>
              <ColumnHeads view={view} quiet />
            </thead>
            <tbody>
              {Array.from({ length: 6 }, (_, index) => (
                <SkeletonRow key={index} view={view} />
              ))}
            </tbody>
          </table>
        ) : items.length === 0 ? (
          <Message>
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
          </Message>
        ) : (
          <div className={cn('transition-opacity', worships.loading && 'opacity-60')}>
            {days.map((day) => (
              <table
                key={day.date}
                className="w-full table-fixed border-t border-rule text-sm first:border-t-0"
              >
                <caption className="px-4 pt-4 pb-1 text-left text-[0.8125rem] font-semibold">
                  {dayHeading(day.date, today)}
                </caption>
                <thead>
                  <ColumnHeads view={view} quiet />
                </thead>
                <tbody>
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
                </tbody>
              </table>
            ))}
          </div>
        )}

        {result && total > PER_PAGE && (
          <nav
            aria-label="Halaman jadwal ibadah"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-3"
          >
            <p className="text-sm text-muted-foreground tabular-nums">
              {first.toLocaleString('id-ID')}–{last.toLocaleString('id-ID')} dari{' '}
              {total.toLocaleString('id-ID')} jadwal
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
    <span className="inline-flex flex-none items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium whitespace-nowrap text-warning-ink ring-1 ring-warning-border">
      <TriangleAlert className="size-3" aria-hidden="true" />
      {conflicts} bentrok
    </span>
  )

  return (
    <tr className="align-top">
      <td className="hidden py-2.5 pl-4 whitespace-nowrap tabular-nums sm:table-cell">
        {time ?? (
          <span className="text-muted-foreground" title="Jam menyusul">
            —<span className="sr-only">Jam menyusul</span>
          </span>
        )}
      </td>
      <td className="py-2.5 pr-4 pl-4 sm:pl-0">
        <button
          type="button"
          onClick={onView}
          className="block max-w-full text-left font-medium underline-offset-4 hover:underline sm:truncate"
        >
          {worship.title}
        </button>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
          <span className="truncate">
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
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[0.8125rem] md:hidden">
          <span className={cn('truncate', !crew && 'text-muted-foreground')}>
            {crew ?? 'Belum ada petugas'}
          </span>
          {conflictMark}
        </p>
      </td>
      <td className="hidden py-2.5 pr-4 md:table-cell">
        <p className={cn('truncate', !crew && 'text-muted-foreground')}>
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
      </td>
      {view === 'past' ? (
        <td className="py-2.5 pr-4 text-right">
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
        </td>
      ) : (
        <td className="hidden py-2.5 sm:table-cell">
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
        </td>
      )}
      <td className="py-1.5 pr-2 text-right">
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
      </td>
    </tr>
  )
}

function FilterField({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function Message({ children }: { children: ReactNode }) {
  return <p className="border-t border-rule px-4 py-6 text-sm text-muted-foreground">{children}</p>
}

// Judul kolom. quiet: hanya untuk pembaca layar, tetapi tetap menentukan lebar kolom
// (tabel table-fixed mengambil lebar dari baris pertamanya).
function ColumnHeads({ view, quiet = false }: { view: View; quiet?: boolean }) {
  const label = (text: string) => (quiet ? <span className="sr-only">{text}</span> : text)
  return (
    <tr className="text-left text-xs text-muted-foreground">
      <th
        scope="col"
        className={cn('hidden w-20 font-normal sm:table-cell', quiet ? 'p-0' : 'h-10 pl-4')}
      >
        {label('Jam')}
      </th>
      <th scope="col" className={cn('font-normal', quiet ? 'p-0' : 'h-10 pr-4 pl-4 sm:pl-0')}>
        {label('Ibadah')}
      </th>
      <th
        scope="col"
        className={cn('hidden w-[30%] font-normal md:table-cell', quiet ? 'p-0' : 'pr-4')}
      >
        {label('Petugas')}
      </th>
      {view === 'past' ? (
        <th
          scope="col"
          className={cn('w-28 text-right font-normal sm:w-32', quiet ? 'p-0' : 'pr-4')}
        >
          {label('Kehadiran')}
        </th>
      ) : (
        <th scope="col" className={cn('hidden w-12 font-normal sm:table-cell', quiet && 'p-0')}>
          {!quiet && <FileText className="size-3.5" aria-hidden="true" />}
          <span className="sr-only">Tata ibadah</span>
        </th>
      )}
      <th scope="col" className={cn('w-12', quiet ? 'p-0' : 'pr-2')}>
        <span className="sr-only">Tindakan</span>
      </th>
    </tr>
  )
}

function SkeletonRow({ view }: { view: View }) {
  return (
    <tr className="border-t border-rule">
      <td className="hidden py-3 pl-4 sm:table-cell">
        <Skeleton className="h-5 w-12" />
      </td>
      <td className="py-3 pr-4 pl-4 sm:pl-0">
        <Skeleton className="h-5 w-56 max-w-full" />
        <Skeleton className="mt-1.5 h-4 w-40 max-w-full" />
      </td>
      <td className="hidden py-3 pr-4 md:table-cell">
        <Skeleton className="h-5 w-40 max-w-full" />
      </td>
      <td className={cn('py-3 pr-4', view === 'upcoming' && 'hidden sm:table-cell')}>
        <Skeleton className="ml-auto h-5 w-10" />
      </td>
      <td />
    </tr>
  )
}
