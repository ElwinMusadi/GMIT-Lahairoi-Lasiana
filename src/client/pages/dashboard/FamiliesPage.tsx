import { useRef, useState, type ReactNode } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { ApiList, ApiPage, Family, FamilyResponse, RayonListItem } from '@shared/types'
import { FamilyFormDialog } from '@/components/congregation/family-form-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCan, useCurrentUser } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const PER_PAGE = 50

const controlClass =
  'h-9 rounded-lg border border-input bg-card text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

// Daftar Kartu Keluarga. Admin dan Pendeta melihat kelima rayon; Majelis hanya
// rayonnya (dibatasi API). Rayon, pencarian, dan halaman disimpan di URL.
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
  const first = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const last = Math.min(page * PER_PAGE, total)
  const filtered = Boolean(q || rayonId || emptyOnly)
  const showRayonColumn = !isElder && !rayonId

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Kartu Keluarga</h1>
          {rayons.data && emptyCount !== undefined ? (
            <p className="text-sm text-muted-foreground tabular-nums">
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
            </p>
          ) : (
            <Skeleton className="h-5 w-72" />
          )}
        </div>
        {canEdit && (
          <Button size="lg" onClick={() => setFormOpen(true)}>
            <Plus data-icon="inline-start" />
            Tambah KK
          </Button>
        )}
      </header>

      {!isElder && (
        <RayonStrip
          rayons={rayonList}
          loading={!rayons.data}
          selected={rayonId}
          onSelect={(id) => update({ rayon_id: id })}
        />
      )}

      <div className="grid gap-3">
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
              placeholder="Cari nomor KK, kepala keluarga, anggota"
              aria-label="Cari Kartu Keluarga"
              className={`${controlClass} pl-9`}
            />
          </div>
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

        <div className="rounded-lg border bg-card">
          <table className="w-full table-fixed text-sm" aria-busy={families.loading}>
            <caption className="sr-only">Daftar Kartu Keluarga</caption>
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="h-10 pr-4 pl-4 font-normal">
                  Kepala keluarga
                </th>
                {showRayonColumn && (
                  <th scope="col" className="hidden w-36 pr-4 font-normal sm:table-cell">
                    Rayon
                  </th>
                )}
                <th scope="col" className="w-24 pr-4 text-right font-normal">
                  Jiwa aktif
                </th>
              </tr>
            </thead>
            <tbody className={cn('transition-opacity', families.loading && result && 'opacity-60')}>
              {families.error && (
                <MessageRow colSpan={showRayonColumn ? 3 : 2}>
                  Daftar KK tidak dapat dimuat: {families.error}{' '}
                  <button type="button" onClick={families.reload} className="font-medium underline">
                    Coba lagi
                  </button>
                </MessageRow>
              )}
              {!result &&
                !families.error &&
                Array.from({ length: 6 }, (_, index) => (
                  <SkeletonRow key={index} withRayon={showRayonColumn} />
                ))}
              {result && !families.error && items.length === 0 && (
                <MessageRow colSpan={showRayonColumn ? 3 : 2}>
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
                </MessageRow>
              )}
              {!families.error &&
                items.map((family) => (
                  <FamilyRow key={family.id} family={family} showRayon={showRayonColumn} />
                ))}
            </tbody>
          </table>

          {result && total > 0 && (
            <nav
              aria-label="Halaman daftar KK"
              className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-3"
            >
              <p className="text-sm text-muted-foreground tabular-nums">
                {first.toLocaleString('id-ID')}–{last.toLocaleString('id-ID')} dari{' '}
                {total.toLocaleString('id-ID')} KK
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
        <label htmlFor="pilih-rayon" className="text-xs text-muted-foreground">
          Rayon
        </label>
        <select
          id="pilih-rayon"
          value={selected}
          disabled={loading}
          onChange={(event) => onSelect(event.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-card px-3 text-base tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
        <ul className="grid auto-cols-fr grid-flow-col divide-x divide-rule rounded-lg border bg-card">
          {loading
            ? Array.from({ length: 6 }, (_, index) => (
                <li key={index} className="grid gap-1.5 px-4 py-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-14" />
                </li>
              ))
            : options.map((option) => {
                const active = option.id === selected
                return (
                  <li key={option.id || 'all'} className="p-1">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => onSelect(option.id)}
                      className={cn(
                        'grid h-full w-full content-start gap-0.5 rounded-md px-3 py-2 text-left outline-offset-[-2px] hover:bg-muted/60',
                        active && 'bg-accent hover:bg-accent',
                      )}
                    >
                      <span
                        className={cn('text-sm', active ? 'font-medium' : 'text-muted-foreground')}
                      >
                        {option.name}
                      </span>
                      <span
                        className={cn(
                          'text-[0.8125rem] whitespace-nowrap tabular-nums',
                          active ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        <span className="text-xl font-medium text-foreground">
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
  return (
    <tr className="border-t border-rule align-top">
      <td className="py-3 pr-4 pl-4">
        <Link
          to={`/dashboard/families/${family.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {family.family_head_name}
        </Link>
        <p className="mt-0.5 truncate text-[0.8125rem] text-muted-foreground">
          {showRayon && <span className="sm:hidden">{family.rayon_name} · </span>}
          {details}
        </p>
      </td>
      {showRayon && (
        <td className="hidden py-3 pr-4 text-muted-foreground sm:table-cell">
          {family.rayon_name}
        </td>
      )}
      <td
        className={cn(
          'py-3 pr-4 text-right tabular-nums',
          family.member_count === 0 && 'text-muted-foreground',
        )}
      >
        {family.member_count}
      </td>
    </tr>
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

function SkeletonRow({ withRayon }: { withRayon: boolean }) {
  return (
    <tr className="border-t border-rule" aria-hidden="true">
      <td className="py-3 pr-4 pl-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-1.5 h-4 w-64 max-w-full" />
      </td>
      {withRayon && (
        <td className="hidden py-3 pr-4 sm:table-cell">
          <Skeleton className="h-5 w-24" />
        </td>
      )}
      <td className="py-3 pr-4">
        <Skeleton className="ml-auto h-5 w-8" />
      </td>
    </tr>
  )
}
