import { useRef, useState } from 'react'
import { ChevronRight, Plus, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { ApiList, ApiPage, Family, FamilyResponse, RayonListItem } from '@shared/types'
import { FamilyFormDialog } from '@/components/congregation/family-form-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
} from '@/components/zenith/data-table'
import { PageHeader } from '@/components/zenith/page-header'
import { PersonAvatar } from '@/components/zenith/person-avatar'
import { useCan, useCurrentUser } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const PER_PAGE = 50

// Daftar Kartu Keluarga. Admin dan Pendeta melihat kelima rayon; Majelis hanya
// rayonnya (dibatasi API). Rayon, pencarian, dan halaman disimpan di URL. Rayon tampil
// sebagai deret kartu angka (pilihan cakupan), daftarnya tabel data Zenith.
export default function FamiliesPage() {
  const me = useCurrentUser()
  const canEdit = useCan(['ADMIN', 'ELDER'])
  const isElder = me.role === 'ELDER'
  const navigate = useNavigate()
  const { params, update } = useUrlFilters()
  const rayonId = params.get('rayon_id') ?? ''
  const q = params.get('q') ?? ''
  const emptyOnly = params.get('empty') === 'true'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [search, setSearch] = useState(q)
  // Kotak pencarian mengikuti URL bila q berubah dari luar (tombol Kembali, Hapus filter).
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    if (q !== search.trim()) setSearch(q)
  }
  const searchTimer = useRef<number | undefined>(undefined)
  const [formOpen, setFormOpen] = useState(false)

  const families = useApiQuery<ApiPage<Family>>('/families', {
    rayon_id: rayonId,
    q,
    empty: emptyOnly ? 'true' : '',
    page,
    per_page: PER_PAGE,
  })
  const rayons = useApiQuery<ApiList<RayonListItem>>('/rayons')
  // Temuan di bawah judul: KK yang sudah dibuat tetapi anggotanya belum diinput.
  const emptyFamilies = useApiQuery<ApiPage<Family>>('/families', { empty: 'true', per_page: 1 })

  // Pencarian dikirim setelah pengguna berhenti mengetik sebentar.
  function handleSearch(value: string) {
    setSearch(value)
    window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => update({ q: value.trim() }), 300)
  }

  // Mengosongkan pencarian (termasuk yang masih tertunda) bersama perubahan lain.
  function clearSearch(changes: Record<string, string> = {}) {
    window.clearTimeout(searchTimer.current)
    setSearch('')
    update({ ...changes, q: '' })
  }

  function handleSaved(result: FamilyResponse) {
    setFormOpen(false)
    emptyFamilies.reload()
    toast.success(`KK ${result.family.family_head_name} tersimpan. Tambahkan anggotanya.`)
    navigate(`/dashboard/families/${result.family.id}`)
  }

  const rayonList = rayons.data?.data ?? []
  const myRayon = isElder ? rayonList.find((rayon) => rayon.id === me.rayon_id) : undefined
  const emptyCount = emptyFamilies.data?.meta.total

  const result = families.data
  const items = result?.data ?? []
  const total = result?.meta.total ?? 0
  const filtered = Boolean(q || rayonId || emptyOnly)
  const showRayonColumn = !isElder && !rayonId

  const columns = showRayonColumn ? 4 : 3

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Kartu Keluarga"
        description={
          rayons.data && emptyCount !== undefined ? (
            <span className="tabular-nums">
              {myRayon &&
                `Rayon ${myRayon.name} · ${(myRayon.family_count ?? 0).toLocaleString('id-ID')} KK · ${(myRayon.member_count ?? 0).toLocaleString('id-ID')} jiwa aktif · `}
              {emptyCount > 0 ? (
                <>
                  <span className="font-medium text-foreground">
                    {emptyCount.toLocaleString('id-ID')} KK belum punya anggota tercatat
                  </span>
                  {!emptyOnly && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        className="font-medium text-foreground underline underline-offset-4"
                        onClick={() => clearSearch({ empty: 'true', rayon_id: '' })}
                      >
                        Tampilkan
                      </button>
                    </>
                  )}
                </>
              ) : (
                'Semua KK sudah punya anggota tercatat.'
              )}
            </span>
          ) : (
            <span className="inline-block h-4 w-72 max-w-full animate-pulse rounded-md bg-muted align-middle" />
          )
        }
        actions={
          canEdit && (
            <Button size="lg" onClick={() => setFormOpen(true)}>
              <Plus data-icon="inline-start" />
              Tambah KK
            </Button>
          )
        }
      />

      {!isElder && (
        <RayonStrip
          rayons={rayonList}
          loading={!rayons.data}
          selected={rayonId}
          onSelect={(id) => update({ rayon_id: id })}
        />
      )}

      <TableCard
        aria-label="Daftar Kartu Keluarga"
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <SearchField
              value={search}
              onChange={handleSearch}
              label="Cari Kartu Keluarga"
              placeholder="Cari No. KK, kepala keluarga, anggota"
            />
            {emptyOnly && (
              <p className="flex items-center gap-1 text-sm">
                Hanya KK tanpa anggota
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => update({ empty: '' })}
                  className="text-muted-foreground"
                >
                  <X />
                  <span className="sr-only">Tampilkan semua KK</span>
                </Button>
              </p>
            )}
            <p className="ml-auto text-sm text-muted-foreground tabular-nums" aria-live="polite">
              {result ? `${total.toLocaleString('id-ID')} KK` : ''}
            </p>
          </div>
        }
        footer={
          result && (
            <TablePagination
              label="Halaman daftar KK"
              page={page}
              perPage={PER_PAGE}
              total={total}
              unit="KK"
              onPage={(next) => update({ page: String(next) })}
            />
          )
        }
      >
        <Table className="table-fixed" aria-busy={families.loading}>
          <caption className="sr-only">Daftar Kartu Keluarga</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Kepala keluarga</TableHead>
              {showRayonColumn && (
                <TableHead className="hidden w-36 sm:table-cell">Rayon</TableHead>
              )}
              <TableHead className="w-24 text-right">Jiwa aktif</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Buka</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody
            className={cn('transition-opacity', families.loading && result && 'opacity-60')}
          >
            {families.error && (
              <TableMessage colSpan={columns}>
                Daftar KK tidak dapat dimuat: {families.error}{' '}
                <button type="button" onClick={families.reload} className="font-medium underline">
                  Coba lagi
                </button>
              </TableMessage>
            )}
            {!result && !families.error && (
              <SkeletonRows
                cells={['', ...(showRayonColumn ? ['hidden sm:table-cell'] : []), '', '']}
              />
            )}
            {result && !families.error && items.length === 0 && (
              <TableMessage colSpan={columns}>
                {q ? (
                  <>
                    Tidak ada KK yang cocok dengan “{q}”.{' '}
                    <button
                      type="button"
                      className="font-medium underline"
                      onClick={() => clearSearch()}
                    >
                      Hapus pencarian
                    </button>
                  </>
                ) : filtered ? (
                  'Belum ada KK di rayon ini.'
                ) : (
                  'Belum ada Kartu Keluarga yang tercatat.'
                )}
                {canEdit && !q && (
                  <>
                    {' '}
                    <button
                      type="button"
                      className="font-medium text-foreground underline"
                      onClick={() => setFormOpen(true)}
                    >
                      Tambah KK
                    </button>
                  </>
                )}
              </TableMessage>
            )}
            {!families.error &&
              items.map((family) => (
                <FamilyRow key={family.id} family={family} showRayon={showRayonColumn} />
              ))}
          </TableBody>
        </Table>
      </TableCard>

      {canEdit && (
        <FamilyFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          rayons={rayonList}
          fixedRayonId={isElder ? me.rayon_id : undefined}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

// Lima rayon pelayanan sebagai pilihan cakupan daftar, lengkap dengan jumlah KK dan
// jiwa aktif tiap rayon. Di ponsel menjadi satu pilihan Rayon.
function RayonStrip({
  rayons,
  loading,
  selected,
  onSelect,
}: {
  rayons: RayonListItem[]
  loading: boolean
  selected: string
  onSelect: (rayonId: string) => void
}) {
  const sum = (key: 'family_count' | 'member_count') =>
    rayons.reduce((total, rayon) => total + (rayon[key] ?? 0), 0)
  const options = [
    { id: '', name: 'Semua rayon', families: sum('family_count'), members: sum('member_count') },
    ...rayons.map((rayon) => ({
      id: String(rayon.id),
      name: rayon.name,
      families: rayon.family_count,
      members: rayon.member_count,
    })),
  ]
  return (
    <>
      <div className="grid gap-1.5 md:hidden">
        <label htmlFor="pilih-rayon" className="text-sm text-muted-foreground">
          Rayon
        </label>
        <select
          id="pilih-rayon"
          value={selected}
          disabled={loading}
          onChange={(event) => onSelect(event.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-base tabular-nums shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {options.map((option) => (
            <option key={option.id || 'all'} value={option.id}>
              {option.name} · {(option.families ?? 0).toLocaleString('id-ID')} KK ·{' '}
              {(option.members ?? 0).toLocaleString('id-ID')} jiwa
            </option>
          ))}
        </select>
      </div>
      <nav aria-label="Rayon" className="hidden md:block">
        <ul className="grid auto-cols-fr grid-flow-col gap-3">
          {loading
            ? Array.from({ length: 6 }, (_, index) => (
                <li
                  key={index}
                  className="grid gap-2 rounded-xl px-4 py-3 ring-1 ring-foreground/10"
                >
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-14" />
                </li>
              ))
            : options.map((option) => {
                const active = option.id === selected
                return (
                  <li key={option.id || 'all'}>
                    {/* Kartu angka yang juga pilihan: terpilih bergaris tebal warna teks. */}
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => onSelect(option.id)}
                      className={cn(
                        'grid h-full w-full content-start gap-1 rounded-xl bg-card px-4 py-3 text-left ring-1 ring-foreground/10 transition-shadow outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50',
                        active && 'ring-2 ring-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'truncate text-sm',
                          active ? 'font-medium' : 'text-muted-foreground',
                        )}
                      >
                        {option.name}
                      </span>
                      <span className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                        <span className="text-2xl font-bold tracking-tight text-foreground">
                          {(option.families ?? 0).toLocaleString('id-ID')}
                        </span>{' '}
                        KK · {(option.members ?? 0).toLocaleString('id-ID')} jiwa
                      </span>
                    </button>
                  </li>
                )
              })}
        </ul>
      </nav>
    </>
  )
}

function FamilyRow({ family, showRayon }: { family: Family; showRayon: boolean }) {
  const details = [family.kk_number ?? 'Tanpa nomor KK', family.address].filter(Boolean).join(' · ')
  const to = `/dashboard/families/${family.id}`
  return (
    <TableRow>
      <TableCell className="py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <PersonAvatar name={family.family_head_name} />
          <div className="min-w-0">
            <Link to={to} className="block truncate font-medium underline-offset-4 hover:underline">
              {family.family_head_name}
            </Link>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground lg:truncate">
              {showRayon && <span className="sm:hidden">{family.rayon_name} · </span>}
              {details}
            </p>
          </div>
        </div>
      </TableCell>
      {showRayon && (
        <TableCell className="hidden truncate text-muted-foreground sm:table-cell">
          {family.rayon_name}
        </TableCell>
      )}
      <TableCell
        className={cn(
          'text-right tabular-nums',
          family.member_count === 0 && 'text-muted-foreground',
        )}
      >
        {family.member_count}
      </TableCell>
      <TableCell className="py-1.5 pr-2 pl-0 text-right">
        {/* Penanda arah untuk tetikus; tautan yang sebenarnya ada di nama. */}
        <Link
          to={to}
          tabIndex={-1}
          aria-hidden="true"
          className="inline-grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </Link>
      </TableCell>
    </TableRow>
  )
}
