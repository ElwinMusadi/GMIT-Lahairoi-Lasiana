import { useRef, useState, type ReactNode } from 'react'
import { Download, ListFilter, Plus, Upload, X } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import {
  BLOOD_TYPES,
  CATEGORICAL_GROUPS,
  CATEGORICAL_GROUP_LABELS,
  FAMILY_RELATION_LABELS,
  MEMBER_STATUS_LABELS,
  type ApiList,
  type ApiPage,
  type MemberWithFamily,
  type RayonListItem,
} from '@shared/types'
import { MemberMenu } from '@/components/congregation/member-menu'
import { useMemberActions } from '@/components/congregation/use-member-actions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { StatusBadge } from '@/components/zenith/status-badge'
import { errorMessage } from '@/lib/api'
import { ageOn, categoricalLabel, familyName, sacramentSummary } from '@/lib/congregation'
import { downloadExport } from '@/lib/member-files'
import { useCan, useCurrentUser } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const PER_PAGE = 50
// Filter di URL. status kosong berarti Aktif; "ALL" menampilkan semua status.
const FILTER_KEYS = [
  'rayon_id',
  'categorical_group',
  'blood_type',
  'baptism_status',
  'sidi_status',
  'status',
] as const

// Status keanggotaan sebagai kontrol bersegmen di atas tabel (Zenith).
type StatusView = 'ACTIVE' | 'MOVED' | 'DECEASED' | 'ALL'
const STATUS_VIEWS: { value: StatusView; label: string }[] = [
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'MOVED', label: 'Pindah' },
  { value: 'DECEASED', label: 'Meninggal' },
  { value: 'ALL', label: 'Semua' },
]

// Anggota Jemaat dengan pencarian dan filter kombinasi (PRD: minimal 3 parameter
// sekaligus, mis. Rayon + Kategori + Status Sidi). Semua filter disimpan di URL. Tabel
// bergaya Zenith: status bersegmen, pencarian dan filter di bilah alat, avatar per jiwa.
export default function MembersPage() {
  const me = useCurrentUser()
  const isElder = me.role === 'ELDER'
  const { params, setParams, update } = useUrlFilters()
  const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key) ?? '']))
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [search, setSearch] = useState(q)
  // Kotak pencarian mengikuti URL bila q berubah dari luar (tombol Kembali, Hapus filter).
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    if (q !== search.trim()) setSearch(q)
  }
  const searchTimer = useRef<number | undefined>(undefined)
  const [showFilters, setShowFilters] = useState(false)
  const activeFilters = FILTER_KEYS.filter((key) => filters[key]).length
  // Jumlah di tombol Filter (ponsel): tanpa status, yang selalu tampil sebagai segmen.
  const panelFilters = FILTER_KEYS.filter((key) => key !== 'status' && filters[key]).length

  // Filter yang sama dipakai daftar dan tombol Ekspor.
  const listQuery = {
    ...filters,
    status: filters.status === 'ALL' ? '' : filters.status || 'ACTIVE',
    q,
  }
  const members = useApiQuery<ApiPage<MemberWithFamily>>('/members', {
    ...listQuery,
    page,
    per_page: PER_PAGE,
  })
  const isAdmin = useCan(['ADMIN'])
  const [exporting, setExporting] = useState(false)

  async function exportAs(format: 'xlsx' | 'csv') {
    setExporting(true)
    try {
      await downloadExport(format, listQuery)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setExporting(false)
    }
  }
  const rayons = useApiQuery<ApiList<RayonListItem>>(isElder ? null : '/rayons')
  // Temuan di bawah judul: Pemuda aktif yang belum sidi, calon peserta katekisasi.
  const activeCount = useApiQuery<ApiPage<MemberWithFamily>>('/members', {
    status: 'ACTIVE',
    per_page: 1,
  })
  const katekisasi = useApiQuery<ApiPage<MemberWithFamily>>('/members', {
    status: 'ACTIVE',
    categorical_group: 'PEMUDA',
    sidi_status: 'false',
    per_page: 1,
  })

  function reloadAll() {
    members.reload()
    activeCount.reload()
    katekisasi.reload()
  }
  const actions = useMemberActions({ onChanged: reloadAll })

  function handleSearch(value: string) {
    setSearch(value)
    window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => update({ q: value.trim() }), 300)
  }

  // Mengganti semua filter sekaligus; pencarian yang masih tertunda dibatalkan.
  function replaceFilters(next: Record<string, string> = {}) {
    window.clearTimeout(searchTimer.current)
    setSearch('')
    setParams(new URLSearchParams(next))
  }
  const clearAll = () => replaceFilters()

  const result = members.data
  const items = result?.data ?? []
  const total = result?.meta.total ?? 0
  const showRayon = !isElder && !filters.rayon_id
  const statusLabel =
    filters.status === 'ALL'
      ? 'semua status'
      : MEMBER_STATUS_LABELS[(filters.status || 'ACTIVE') as keyof typeof MEMBER_STATUS_LABELS]

  const statusValue = (filters.status || 'ACTIVE') as StatusView
  const columns = showRayon ? 6 : 5
  // Kolom yang tampil untuk kerangka baris, sama dengan kepala tabel.
  const skeletonCells = [
    '',
    ...(showRayon ? ['hidden sm:table-cell'] : []),
    'hidden md:table-cell',
    'hidden md:table-cell',
    'hidden xl:table-cell',
    '',
  ]

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Anggota Jemaat"
        description={
          activeCount.data && katekisasi.data ? (
            <span className="tabular-nums">
              {activeCount.data.meta.total.toLocaleString('id-ID')} jiwa aktif
              {isElder && ' di rayon Anda'}
              {katekisasi.data.meta.total > 0 && (
                <>
                  {' · '}
                  <span className="font-medium text-foreground">
                    {katekisasi.data.meta.total.toLocaleString('id-ID')} Pemuda belum sidi
                  </span>
                  , calon peserta katekisasi ·{' '}
                  <button
                    type="button"
                    className="font-medium text-foreground underline underline-offset-4"
                    onClick={() =>
                      replaceFilters({ categorical_group: 'PEMUDA', sidi_status: 'false' })
                    }
                  >
                    Tampilkan
                  </button>
                </>
              )}
            </span>
          ) : (
            <span className="inline-block h-4 w-72 max-w-full animate-pulse rounded-md bg-muted align-middle" />
          )
        }
        actions={
          <>
            {isAdmin && (
              <Button asChild variant="outline" size="lg">
                <Link to="/dashboard/members/import">
                  <Upload data-icon="inline-start" />
                  Impor
                </Link>
              </Button>
            )}
            {actions.canEdit && (
              <Button size="lg" onClick={() => actions.add()}>
                <Plus data-icon="inline-start" />
                Tambah anggota
              </Button>
            )}
          </>
        }
      />

      <TableCard
        aria-label="Daftar anggota jemaat"
        toolbar={
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented
                label="Status keanggotaan"
                value={statusValue}
                onChange={(value) => update({ status: value === 'ACTIVE' ? '' : value })}
                options={STATUS_VIEWS}
              />
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
                  {result ? `${total.toLocaleString('id-ID')} jiwa` : ''}
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={exporting || !result || total === 0}>
                      <Download data-icon="inline-start" />
                      {exporting ? 'Menyiapkan…' : 'Ekspor'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="font-normal text-muted-foreground">
                      {total.toLocaleString('id-ID')} jiwa sesuai pencarian dan filter
                    </DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => void exportAs('xlsx')}>
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void exportAs('csv')}>
                      CSV (.csv)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SearchField
                value={search}
                onChange={handleSearch}
                label="Cari anggota jemaat"
                placeholder="Cari nama, NIK, No. Induk, No. KK"
              />
              <Button
                variant="outline"
                size="lg"
                className="md:hidden"
                aria-expanded={showFilters}
                aria-controls="filter-jemaat"
                onClick={() => setShowFilters((shown) => !shown)}
              >
                <ListFilter data-icon="inline-start" />
                Filter{panelFilters > 0 && ` (${panelFilters})`}
              </Button>
              {/* Di ponsel filter dilipat di balik tombol Filter; di layar lebar selalu tampil. */}
              <div
                id="filter-jemaat"
                role="group"
                aria-label="Filter"
                className={cn(
                  'grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap',
                  !showFilters && 'hidden md:flex',
                )}
              >
                {!isElder && (
                  <select
                    aria-label="Rayon"
                    value={filters.rayon_id}
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
                )}
                <select
                  aria-label="Kategori"
                  value={filters.categorical_group}
                  onChange={(event) => update({ categorical_group: event.target.value })}
                  className={selectClass}
                >
                  <option value="">Semua kategori</option>
                  {CATEGORICAL_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {CATEGORICAL_GROUP_LABELS[group]}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Golongan darah"
                  value={filters.blood_type}
                  onChange={(event) => update({ blood_type: event.target.value })}
                  className={selectClass}
                >
                  <option value="">Semua gol. darah</option>
                  {BLOOD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      Gol. darah {type}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Baptis"
                  value={filters.baptism_status}
                  onChange={(event) => update({ baptism_status: event.target.value })}
                  className={selectClass}
                >
                  <option value="">Baptis: semua</option>
                  <option value="true">Sudah baptis</option>
                  <option value="false">Belum baptis</option>
                </select>
                <select
                  aria-label="Sidi"
                  value={filters.sidi_status}
                  onChange={(event) => update({ sidi_status: event.target.value })}
                  className={selectClass}
                >
                  <option value="">Sidi: semua</option>
                  <option value="true">Sudah sidi</option>
                  <option value="false">Belum sidi</option>
                </select>
              </div>
              {(activeFilters > 0 || q) && (
                <Button variant="ghost" size="lg" onClick={clearAll}>
                  <X data-icon="inline-start" />
                  Hapus filter
                </Button>
              )}
            </div>
          </>
        }
        footer={
          result && (
            <TablePagination
              label="Halaman daftar jemaat"
              page={page}
              perPage={PER_PAGE}
              total={total}
              unit="jiwa"
              onPage={(next) => update({ page: String(next) })}
            />
          )
        }
      >
        <Table className="table-fixed" aria-busy={members.loading}>
          <caption className="sr-only">Anggota jemaat, {statusLabel}, urut nama</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nama</TableHead>
              {showRayon && <TableHead className="hidden w-32 sm:table-cell">Rayon</TableHead>}
              <TableHead className="hidden w-32 md:table-cell">Kategori</TableHead>
              <TableHead className="hidden w-16 text-right md:table-cell">Umur</TableHead>
              <TableHead className="hidden w-40 xl:table-cell">Sakramen</TableHead>
              <TableHead className="w-14">
                <span className="sr-only">Tindakan</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody
            className={cn('transition-opacity', members.loading && result && 'opacity-60')}
          >
            {members.error && (
              <TableMessage colSpan={columns}>
                Data jemaat tidak dapat dimuat: {members.error}{' '}
                <button type="button" onClick={members.reload} className="font-medium underline">
                  Coba lagi
                </button>
              </TableMessage>
            )}
            {!result && !members.error && <SkeletonRows rows={8} cells={skeletonCells} />}
            {result && !members.error && items.length === 0 && (
              <TableMessage colSpan={columns}>
                {activeFilters > 0 || q ? (
                  <>
                    Tidak ada jemaat yang cocok dengan pencarian dan filter ini.{' '}
                    <button type="button" className="font-medium underline" onClick={clearAll}>
                      Hapus filter
                    </button>
                  </>
                ) : (
                  <>
                    Belum ada anggota jemaat yang tercatat. Anggota ditambahkan ke Kartu Keluarga
                    masing-masing.{' '}
                    <Link
                      to="/dashboard/families"
                      className="font-medium text-foreground underline"
                    >
                      Buka Kartu Keluarga
                    </Link>
                  </>
                )}
              </TableMessage>
            )}
            {!members.error &&
              items.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  showRayon={showRayon}
                  onView={() => actions.view(member)}
                  menu={<MemberMenu member={member} actions={actions} />}
                />
              ))}
          </TableBody>
        </Table>
      </TableCard>

      {actions.dialogs}
    </div>
  )
}

function MemberRow({
  member,
  showRayon,
  onView,
  menu,
}: {
  member: MemberWithFamily
  showRayon: boolean
  onView: () => void
  menu: ReactNode
}) {
  const age = ageOn(member.birth_date)
  const category = categoricalLabel(member.categorical_group)
  const inactive = member.status !== 'ACTIVE'
  // Di ponsel kolom lain disembunyikan; isinya pindah ke baris kedua.
  const phoneLine = [
    showRayon && member.rayon_name,
    category,
    age !== null && `${age} th`,
    sacramentSummary(member),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <TableRow>
      <TableCell className="py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <PersonAvatar name={member.full_name} muted={inactive} />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={onView}
                className={cn(
                  'truncate text-left font-medium underline-offset-4 hover:underline',
                  inactive && 'text-muted-foreground',
                )}
              >
                {member.full_name}
              </button>
              {inactive && (
                <StatusBadge className="flex-none">
                  {MEMBER_STATUS_LABELS[member.status]}
                </StatusBadge>
              )}
            </div>
            <p className="mt-0.5 truncate text-[0.8125rem] text-muted-foreground">
              <span className="md:hidden">{phoneLine}</span>
              <span className="hidden md:inline">
                <span className="xl:hidden">{sacramentSummary(member)} · </span>
                {FAMILY_RELATION_LABELS[member.family_relation]} · KK {familyName(member)}
              </span>
            </p>
          </div>
        </div>
      </TableCell>
      {showRayon && (
        <TableCell className="hidden truncate text-muted-foreground sm:table-cell">
          {member.rayon_name}
        </TableCell>
      )}
      <TableCell className="hidden truncate text-muted-foreground md:table-cell">
        {category ?? '—'}
      </TableCell>
      <TableCell className="hidden text-right tabular-nums md:table-cell">
        {age ?? <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="hidden truncate text-muted-foreground xl:table-cell">
        {sacramentSummary(member)}
      </TableCell>
      <TableCell className="py-1.5 pr-2 pl-0 text-right">{menu}</TableCell>
    </TableRow>
  )
}
