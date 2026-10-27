import { useRef, useState, type ReactNode } from 'react'
import { ListFilter, Plus, Search } from 'lucide-react'
import { Link } from 'react-router'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ageOn, categoricalLabel, familyName, sacramentSummary } from '@/lib/congregation'
import { useCurrentUser } from '@/lib/session'
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

const controlClass =
  'h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

// Anggota Jemaat dengan pencarian dan filter kombinasi (PRD: minimal 3 parameter
// sekaligus, mis. Rayon + Kategori + Status Sidi). Semua filter disimpan di URL.
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

  const members = useApiQuery<ApiPage<MemberWithFamily>>('/members', {
    ...filters,
    status: filters.status === 'ALL' ? '' : filters.status || 'ACTIVE',
    q,
    page,
    per_page: PER_PAGE,
  })
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
  const first = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const last = Math.min(page * PER_PAGE, total)
  const showRayon = !isElder && !filters.rayon_id
  const columns = showRayon ? 6 : 5
  const statusLabel =
    filters.status === 'ALL'
      ? 'semua status'
      : MEMBER_STATUS_LABELS[(filters.status || 'ACTIVE') as keyof typeof MEMBER_STATUS_LABELS]

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Anggota Jemaat</h1>
          {activeCount.data && katekisasi.data ? (
            <p className="text-sm text-muted-foreground tabular-nums">
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
            </p>
          ) : (
            <Skeleton className="h-5 w-80" />
          )}
        </div>
        {actions.canEdit && (
          <Button size="lg" onClick={() => actions.add()}>
            <Plus data-icon="inline-start" />
            Tambah anggota
          </Button>
        )}
      </header>

      <section aria-label="Pencarian dan filter" className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Cari nama, NIK, Nomor Induk, nomor KK"
              aria-label="Cari anggota jemaat"
              className={cn(controlClass, 'pl-9')}
            />
          </div>
          <Button
            variant="outline"
            size="lg"
            className="md:hidden"
            aria-expanded={showFilters}
            aria-controls="filter-jemaat"
            onClick={() => setShowFilters((shown) => !shown)}
          >
            <ListFilter data-icon="inline-start" />
            Filter{activeFilters > 0 && ` (${activeFilters})`}
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {(activeFilters > 0 || q) && (
              <Button variant="ghost" onClick={clearAll}>
                Hapus filter
              </Button>
            )}
            <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
              {result ? `${total.toLocaleString('id-ID')} jiwa` : ''}
            </p>
          </div>
        </div>

        <div
          id="filter-jemaat"
          className={cn(
            'grid grid-cols-2 items-end gap-3 md:grid md:grid-cols-3 xl:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]',
            !showFilters && 'hidden',
          )}
        >
          {!isElder && (
            <FilterField id="filter-rayon" label="Rayon">
              <select
                id="filter-rayon"
                value={filters.rayon_id}
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
          )}
          <FilterField id="filter-kategori" label="Kategori">
            <select
              id="filter-kategori"
              value={filters.categorical_group}
              onChange={(event) => update({ categorical_group: event.target.value })}
              className={controlClass}
            >
              <option value="">Semua kategori</option>
              {CATEGORICAL_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {CATEGORICAL_GROUP_LABELS[group]}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField id="filter-darah" label="Golongan darah">
            <select
              id="filter-darah"
              value={filters.blood_type}
              onChange={(event) => update({ blood_type: event.target.value })}
              className={controlClass}
            >
              <option value="">Semua</option>
              {BLOOD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField id="filter-baptis" label="Baptis">
            <select
              id="filter-baptis"
              value={filters.baptism_status}
              onChange={(event) => update({ baptism_status: event.target.value })}
              className={controlClass}
            >
              <option value="">Semua</option>
              <option value="true">Sudah baptis</option>
              <option value="false">Belum baptis</option>
            </select>
          </FilterField>
          <FilterField id="filter-sidi" label="Sidi">
            <select
              id="filter-sidi"
              value={filters.sidi_status}
              onChange={(event) => update({ sidi_status: event.target.value })}
              className={controlClass}
            >
              <option value="">Semua</option>
              <option value="true">Sudah sidi</option>
              <option value="false">Belum sidi</option>
            </select>
          </FilterField>
          <FilterField id="filter-status" label="Status keanggotaan">
            <select
              id="filter-status"
              value={filters.status}
              onChange={(event) => update({ status: event.target.value })}
              className={controlClass}
            >
              <option value="">Aktif</option>
              <option value="MOVED">Pindah</option>
              <option value="DECEASED">Meninggal</option>
              <option value="ALL">Semua status</option>
            </select>
          </FilterField>
        </div>
      </section>

      <div className="rounded-lg border bg-card">
        <table className="w-full table-fixed text-sm" aria-busy={members.loading}>
          <caption className="sr-only">Anggota jemaat, {statusLabel}, urut nama</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th
                scope="col"
                className="sticky top-0 z-10 h-10 rounded-tl-lg bg-card pr-4 pl-4 font-normal"
              >
                Nama
              </th>
              {showRayon && (
                <th
                  scope="col"
                  className="sticky top-0 z-10 hidden w-32 bg-card pr-4 font-normal sm:table-cell"
                >
                  Rayon
                </th>
              )}
              <th
                scope="col"
                className="sticky top-0 z-10 hidden w-28 bg-card pr-4 font-normal md:table-cell"
              >
                Kategori
              </th>
              <th
                scope="col"
                className="sticky top-0 z-10 hidden w-16 bg-card pr-4 text-right font-normal md:table-cell"
              >
                Umur
              </th>
              <th
                scope="col"
                className="sticky top-0 z-10 hidden w-40 bg-card pr-4 font-normal xl:table-cell"
              >
                Sakramen
              </th>
              <th scope="col" className="sticky top-0 z-10 w-14 rounded-tr-lg bg-card pr-2">
                <span className="sr-only">Tindakan</span>
              </th>
            </tr>
          </thead>
          <tbody className={cn('transition-opacity', members.loading && result && 'opacity-60')}>
            {members.error && (
              <MessageRow colSpan={columns}>
                Data jemaat tidak dapat dimuat: {members.error}{' '}
                <button type="button" onClick={members.reload} className="font-medium underline">
                  Coba lagi
                </button>
              </MessageRow>
            )}
            {!result &&
              !members.error &&
              Array.from({ length: 8 }, (_, index) => (
                <SkeletonRow key={index} showRayon={showRayon} />
              ))}
            {result && !members.error && items.length === 0 && (
              <MessageRow colSpan={columns}>
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
              </MessageRow>
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
          </tbody>
        </table>

        {result && total > 0 && (
          <nav
            aria-label="Halaman daftar jemaat"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-3"
          >
            <p className="text-sm text-muted-foreground tabular-nums">
              {first.toLocaleString('id-ID')}–{last.toLocaleString('id-ID')} dari{' '}
              {total.toLocaleString('id-ID')} jiwa
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
    <tr className="border-t border-rule align-top">
      <td className="py-3 pr-4 pl-4">
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
            <span className="flex-none rounded-full bg-secondary px-2 py-0.5 text-xs font-medium whitespace-nowrap text-secondary-foreground">
              {MEMBER_STATUS_LABELS[member.status]}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground md:truncate">
          <span className="md:hidden">{phoneLine}</span>
          <span className="hidden md:inline">
            <span className="xl:hidden">{sacramentSummary(member)} · </span>
            {FAMILY_RELATION_LABELS[member.family_relation]} · KK {familyName(member)}
          </span>
        </p>
      </td>
      {showRayon && (
        <td className="hidden py-3 pr-4 text-muted-foreground sm:table-cell">
          {member.rayon_name}
        </td>
      )}
      <td className="hidden py-3 pr-4 text-muted-foreground md:table-cell">{category ?? '—'}</td>
      <td className="hidden py-3 pr-4 text-right tabular-nums md:table-cell">
        {age ?? <span className="text-muted-foreground">—</span>}
      </td>
      <td className="hidden py-3 pr-4 text-muted-foreground xl:table-cell">
        {sacramentSummary(member)}
      </td>
      <td className="py-2 pr-2 text-right">{menu}</td>
    </tr>
  )
}

function FilterField({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function MessageRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr className="border-t border-rule">
      <td colSpan={colSpan} className="px-4 py-6 text-muted-foreground">
        {children}
      </td>
    </tr>
  )
}

function SkeletonRow({ showRayon }: { showRayon: boolean }) {
  return (
    <tr className="border-t border-rule" aria-hidden="true">
      <td className="py-3 pr-4 pl-4">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-1.5 h-4 w-60 max-w-full" />
      </td>
      {showRayon && (
        <td className="hidden py-3 pr-4 sm:table-cell">
          <Skeleton className="h-5 w-20" />
        </td>
      )}
      <td className="hidden py-3 pr-4 md:table-cell">
        <Skeleton className="h-5 w-16" />
      </td>
      <td className="hidden py-3 pr-4 md:table-cell">
        <Skeleton className="ml-auto h-5 w-6" />
      </td>
      <td className="hidden py-3 pr-4 xl:table-cell">
        <Skeleton className="h-5 w-28" />
      </td>
      <td />
    </tr>
  )
}
