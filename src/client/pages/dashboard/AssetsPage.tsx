import { useRef, useState, type ReactNode } from 'react'
import { ArrowUpRight, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { witaToday } from '@shared/dates'
import {
  ASSET_CONDITIONS,
  ASSET_CONDITION_LABELS,
  type ApiList,
  type Asset,
  type AssetCondition,
  type AssetLoan,
  type AssetLoanPage,
  type AssetLoanResponse,
  type AssetPage,
  type AssetResponse,
  type LoanStatus,
  type RayonListItem,
} from '@shared/types'
import { AssetFormDialog } from '@/components/assets/asset-form-dialog'
import { AssetTable } from '@/components/assets/asset-table'
import { LoanFormDialog } from '@/components/assets/loan-form-dialog'
import { LoanTable } from '@/components/assets/loan-table'
import { ReturnDialog } from '@/components/assets/return-dialog'
import { ConfirmDialog, type Confirmation } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { loanTitle, stockText } from '@/lib/assets'
import { useCan } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const PER_PAGE = 50

const controlClass =
  'h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

// Saringan status tab Peminjaman. Tanpa `status` yang tampil peminjaman aktif.
const LOAN_FILTERS = [
  { value: '', api: 'active', label: 'Belum kembali' },
  { value: 'overdue', api: 'OVERDUE', label: 'Terlambat' },
  { value: 'returned', api: 'RETURNED', label: 'Sudah dikembalikan' },
  { value: 'all', api: '', label: 'Semua' },
] as const

type LoanFilter = (typeof LOAN_FILTERS)[number]

function loanCount(filter: LoanFilter, counts: Record<LoanStatus, number>) {
  if (filter.api === 'active') return counts.BORROWED + counts.OVERDUE
  if (filter.api === '') return counts.BORROWED + counts.OVERDUE + counts.RETURNED
  return counts[filter.api]
}

// Manajemen Aset & Inventaris (PRD Fase 3) untuk Admin dan Majelis: tab Katalog
// Inventaris dan Peminjaman Barang. Tab dan filter disimpan di URL (`view=loans`).
export default function AssetsPage() {
  const { params, update } = useUrlFilters()
  const canDelete = useCan(['ADMIN'])
  const [today] = useState(witaToday)
  const view = params.get('view') === 'loans' ? 'loans' : 'catalog'

  const category = params.get('category') ?? ''
  const location = params.get('location') ?? ''
  const conditionParam = (params.get('condition') ?? '').toUpperCase()
  const condition = (ASSET_CONDITIONS as string[]).includes(conditionParam)
    ? (conditionParam as AssetCondition)
    : ''
  const loanFilter =
    LOAN_FILTERS.find((filter) => filter.value === (params.get('status') ?? '').toLowerCase()) ??
    LOAN_FILTERS[0]
  const assetParam = Number(params.get('asset'))
  const assetFilter = Number.isInteger(assetParam) && assetParam > 0 ? assetParam : null
  const rayon = /^\d+$/.test(params.get('rayon') ?? '') ? (params.get('rayon') as string) : ''
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)

  const [search, setSearch] = useState(q)
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    if (q !== search.trim()) setSearch(q)
  }
  const searchTimer = useRef<number | undefined>(undefined)

  // Ringkasan seluruh inventaris dan peminjaman, tanpa filter.
  const overallAssets = useApiQuery<AssetPage>('/assets', { per_page: 1 })
  const overallLoans = useApiQuery<AssetLoanPage>('/asset-loans', { per_page: 1 })
  const catalog = useApiQuery<AssetPage>(view === 'catalog' ? '/assets' : null, {
    category,
    location,
    condition,
    q,
    page,
    per_page: PER_PAGE,
  })
  const loans = useApiQuery<AssetLoanPage>(view === 'loans' ? '/asset-loans' : null, {
    status: loanFilter.api,
    asset_id: assetFilter ?? '',
    rayon_id: rayon,
    q,
    page,
    per_page: PER_PAGE,
  })
  const filteredAsset = useApiQuery<AssetResponse>(
    view === 'loans' && assetFilter ? `/assets/${assetFilter}` : null,
  )
  const rayons = useApiQuery<ApiList<RayonListItem>>(view === 'loans' ? '/rayons' : null)

  const [assetForm, setAssetForm] = useState<{
    open: boolean
    asset?: Asset
    condition?: AssetCondition
  }>({ open: false })
  const [loanForm, setLoanForm] = useState<{ open: boolean; assetId?: number }>({ open: false })
  const [returning, setReturning] = useState<AssetLoan | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  const overallCounts = overallLoans.data?.counts
  const activeLoans = overallCounts ? overallCounts.BORROWED + overallCounts.OVERDUE : undefined
  const result = view === 'catalog' ? catalog.data : loans.data
  const total = result?.meta.total ?? 0
  const first = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const last = Math.min(page * PER_PAGE, total)
  const catalogFiltered = Boolean(category || location || condition || q)
  const loansFiltered = Boolean(assetFilter || rayon || q)

  function reloadAll() {
    overallAssets.reload()
    overallLoans.reload()
    catalog.reload()
    loans.reload()
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

  function switchView(next: 'catalog' | 'loans', changes: Record<string, string> = {}) {
    clearSearch({
      view: next === 'loans' ? 'loans' : '',
      category: '',
      location: '',
      condition: '',
      status: '',
      asset: '',
      rayon: '',
      ...changes,
    })
  }

  function handleAssetSaved({ asset }: AssetResponse, created: boolean) {
    setAssetForm({ open: false })
    reloadAll()
    toast.success(
      created
        ? `${asset.name} ditambahkan dengan kode ${asset.asset_code}.`
        : `${asset.name} diperbarui.`,
    )
  }

  function handleLoanSaved({ loan, asset }: AssetLoanResponse) {
    setLoanForm({ open: false })
    reloadAll()
    toast.success(`${loanTitle(loan)} dipinjam ${loan.borrower_name}.`, {
      description: `Tersedia kini ${stockText(asset)}.`,
    })
  }

  function handleReturned({ loan, asset }: AssetLoanResponse) {
    setReturning(null)
    reloadAll()
    const damaged = loan.return_condition && loan.return_condition !== 'GOOD'
    toast.success(`${loanTitle(loan)} sudah dikembalikan.`, {
      description: `Tersedia kini ${stockText(asset)}.`,
      // Barang kembali rusak: tawarkan memperbarui kondisi di Katalog.
      action:
        damaged && asset.condition !== loan.return_condition
          ? {
              label: 'Perbarui kondisi',
              onClick: () =>
                setAssetForm({ open: true, asset, condition: loan.return_condition ?? undefined }),
            }
          : undefined,
    })
  }

  function confirmDelete(asset: Asset) {
    setConfirmation({
      title: `Hapus ${asset.name}?`,
      description: (
        <>
          Kode {asset.asset_code}, {asset.quantity.toLocaleString('id-ID')} unit. Aset yang pernah
          dipinjam tidak dapat dihapus agar log peminjamannya tetap utuh; penghapusan tercatat di
          Log Aktivitas.
        </>
      ),
      confirmLabel: 'Hapus aset',
      destructive: true,
      onConfirm: async () => {
        await api.delete(`/assets/${asset.id}`)
        reloadAll()
        toast.success(`${asset.name} dihapus dari katalog.`)
      },
    })
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Inventaris</h1>
          {overallAssets.data ? (
            <p className="text-sm text-muted-foreground tabular-nums">
              {overallAssets.data.meta.total.toLocaleString('id-ID')} barang ·{' '}
              {overallAssets.data.units.toLocaleString('id-ID')} unit,{' '}
              {(overallAssets.data.units - overallAssets.data.available).toLocaleString('id-ID')}{' '}
              sedang dipinjam
            </p>
          ) : (
            <Skeleton className="h-5 w-80 max-w-full" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {view === 'catalog' && (
            <Button variant="outline" size="lg" onClick={() => setAssetForm({ open: true })}>
              <Plus data-icon="inline-start" />
              Tambah aset
            </Button>
          )}
          <Button size="lg" onClick={() => setLoanForm({ open: true })}>
            <ArrowUpRight data-icon="inline-start" />
            Catat peminjaman
          </Button>
        </div>
      </header>

      {/* Garis bawah tab sebagai bayangan dalam, agar baris tab bisa digulir sendiri di
          layar sempit tanpa memotong garis tab aktif. */}
      <nav aria-label="Tampilan">
        <ul className="flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-border)] [scrollbar-width:none]">
          <ViewTab active={view === 'catalog'} onClick={() => switchView('catalog')}>
            Katalog<span className="hidden sm:inline">&nbsp;Inventaris</span>
          </ViewTab>
          <ViewTab active={view === 'loans'} onClick={() => switchView('loans')}>
            Peminjaman<span className="hidden sm:inline">&nbsp;Barang</span>
            {activeLoans !== undefined && activeLoans > 0 && (
              <span className="ml-1.5 text-muted-foreground tabular-nums">
                {activeLoans.toLocaleString('id-ID')}
              </span>
            )}
            {overallCounts && overallCounts.OVERDUE > 0 && (
              <span className="ml-2 rounded-full bg-negative-soft px-1.5 py-0.5 text-xs font-medium text-negative-ink tabular-nums">
                {overallCounts.OVERDUE.toLocaleString('id-ID')} terlambat
              </span>
            )}
          </ViewTab>
        </ul>
      </nav>

      {view === 'catalog' ? (
        <div className="grid gap-3">
          <div className="grid grid-cols-3 items-end gap-3 md:grid-cols-[repeat(3,minmax(0,11rem))_minmax(0,20rem)]">
            <FilterField id="filter-kategori" label="Kategori">
              <select
                id="filter-kategori"
                value={category}
                onChange={(event) => update({ category: event.target.value })}
                className={controlClass}
              >
                <option value="">Semua</option>
                {withCurrent(overallAssets.data?.categories, category).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField id="filter-lokasi" label="Lokasi">
              <select
                id="filter-lokasi"
                value={location}
                onChange={(event) => update({ location: event.target.value })}
                className={controlClass}
              >
                <option value="">Semua</option>
                {withCurrent(overallAssets.data?.locations, location).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField id="filter-kondisi" label="Kondisi">
              <select
                id="filter-kondisi"
                value={condition}
                onChange={(event) => update({ condition: event.target.value.toLowerCase() })}
                className={controlClass}
              >
                <option value="">Semua</option>
                {ASSET_CONDITIONS.map((value) => (
                  <option key={value} value={value}>
                    {ASSET_CONDITION_LABELS[value]}
                  </option>
                ))}
              </select>
            </FilterField>
            <SearchField
              className="col-span-3 md:col-span-1"
              value={search}
              onChange={handleSearch}
              placeholder="Cari kode, nama, catatan"
              label="Cari aset"
            />
          </div>
          <ResultLine
            showClear={catalogFiltered}
            onClear={() => clearSearch({ category: '', location: '', condition: '' })}
          >
            {catalog.data &&
              `${total.toLocaleString('id-ID')} barang · ${catalog.data.available.toLocaleString('id-ID')} dari ${catalog.data.units.toLocaleString('id-ID')} unit tersedia`}
          </ResultLine>
        </div>
      ) : (
        <div className="grid gap-3">
          <div
            role="group"
            aria-label="Status peminjaman"
            className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
          >
            {LOAN_FILTERS.map((filter) => (
              <StatusChip
                key={filter.value || 'active'}
                active={loanFilter.value === filter.value}
                label={filter.label}
                count={loans.data ? loanCount(filter, loans.data.counts) : undefined}
                onClick={() => update({ status: filter.value })}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <FilterField id="filter-rayon" label="Rayon" className="w-full sm:w-48">
              <select
                id="filter-rayon"
                value={rayon}
                onChange={(event) => update({ rayon: event.target.value })}
                className={controlClass}
              >
                <option value="">Semua rayon</option>
                {(rayons.data?.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </FilterField>
            <SearchField
              className="w-full sm:w-80"
              value={search}
              onChange={handleSearch}
              placeholder="Cari peminjam, kode, atau nama barang"
              label="Cari peminjaman"
            />
            {assetFilter && (
              <span className="inline-flex h-9 max-w-full items-center gap-1 rounded-lg border border-input bg-card pr-1 pl-3 text-sm">
                <span className="truncate">
                  Barang:{' '}
                  {filteredAsset.data ? (
                    <span className="font-medium">{filteredAsset.data.asset.name}</span>
                  ) : (
                    `#${assetFilter}`
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 flex-none"
                  onClick={() => update({ asset: '' })}
                >
                  <X />
                  <span className="sr-only">Hapus filter barang</span>
                </Button>
              </span>
            )}
          </div>
          <ResultLine
            showClear={loansFiltered || loanFilter.value !== ''}
            onClear={() => clearSearch({ status: '', asset: '', rayon: '' })}
          >
            {loans.data && `${total.toLocaleString('id-ID')} peminjaman`}
          </ResultLine>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        {view === 'catalog' ? (
          catalog.error ? (
            <Message>
              Katalog tidak dapat dimuat: {catalog.error} <RetryButton onClick={catalog.reload} />
            </Message>
          ) : !catalog.data ? (
            <LoadingRows />
          ) : catalog.data.data.length === 0 ? (
            <Message>
              {q ? (
                <>
                  Tidak ada aset yang cocok dengan “{q}”.{' '}
                  <button
                    type="button"
                    className="font-medium underline"
                    onClick={() => clearSearch()}
                  >
                    Hapus pencarian
                  </button>
                </>
              ) : catalogFiltered ? (
                'Tidak ada aset yang cocok dengan filter ini.'
              ) : (
                <>
                  Katalog masih kosong. Catat barang milik gereja, mulai dari alat musik, sound
                  system, kursi, sampai tenda.{' '}
                  <button
                    type="button"
                    className="font-medium text-foreground underline"
                    onClick={() => setAssetForm({ open: true })}
                  >
                    Tambah aset
                  </button>
                </>
              )}
            </Message>
          ) : (
            <AssetTable
              items={catalog.data.data}
              loading={catalog.loading}
              canDelete={canDelete}
              onEdit={(asset) => setAssetForm({ open: true, asset })}
              onLend={(asset) => setLoanForm({ open: true, assetId: asset.id })}
              onHistory={(asset) => switchView('loans', { asset: String(asset.id), status: 'all' })}
              onDelete={confirmDelete}
            />
          )
        ) : loans.error ? (
          <Message>
            Peminjaman tidak dapat dimuat: {loans.error} <RetryButton onClick={loans.reload} />
          </Message>
        ) : !loans.data ? (
          <LoadingRows />
        ) : loans.data.data.length === 0 ? (
          <Message>
            {q
              ? `Tidak ada peminjaman yang cocok dengan “${q}”.`
              : loanFilter.value === ''
                ? loansFiltered
                  ? 'Tidak ada barang yang sedang dipinjam untuk filter ini.'
                  : 'Semua barang sudah kembali. Peminjaman baru dicatat lewat tombol Catat peminjaman.'
                : loanFilter.value === 'overdue'
                  ? 'Tidak ada peminjaman yang terlambat.'
                  : 'Belum ada peminjaman yang cocok.'}
          </Message>
        ) : (
          <LoanTable
            items={loans.data.data}
            loading={loans.loading}
            today={today}
            onReturn={setReturning}
          />
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

      <AssetFormDialog
        open={assetForm.open}
        onOpenChange={(open) => setAssetForm((current) => ({ ...current, open }))}
        asset={assetForm.asset}
        suggestedCondition={assetForm.condition}
        categories={overallAssets.data?.categories ?? []}
        locations={overallAssets.data?.locations ?? []}
        onSaved={handleAssetSaved}
      />
      <LoanFormDialog
        open={loanForm.open}
        onOpenChange={(open) => setLoanForm((current) => ({ ...current, open }))}
        assetId={loanForm.assetId}
        onSaved={handleLoanSaved}
      />
      <ReturnDialog
        loan={returning}
        onClose={() => setReturning(null)}
        onReturned={handleReturned}
      />
      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  )
}

// Pilihan filter dari data, ditambah nilai di URL yang (belum) ada di daftar.
function withCurrent(values: string[] | undefined, current: string) {
  const list = values ?? []
  return current && !list.some((value) => value.toLowerCase() === current.toLowerCase())
    ? [...list, current]
    : list
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <li className="flex-none">
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          'inline-flex items-center border-b-2 px-3 pt-1 pb-2.5 text-sm whitespace-nowrap outline-offset-[-2px]',
          active
            ? 'border-foreground font-medium text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground',
        )}
      >
        {children}
      </button>
    </li>
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

function FilterField({
  id,
  label,
  className,
  children,
}: {
  id: string
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('grid min-w-0 gap-1.5', className)}>
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={cn(controlClass, 'pl-9')}
      />
    </div>
  )
}

function ResultLine({
  showClear,
  onClear,
  children,
}: {
  showClear: boolean
  onClear: () => void
  children: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {showClear && (
        <Button variant="ghost" onClick={onClear}>
          Hapus filter
        </Button>
      )}
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {children}
      </p>
    </div>
  )
}

function Message({ children }: { children: ReactNode }) {
  return <p className="px-4 py-6 text-sm text-muted-foreground">{children}</p>
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="font-medium underline">
      Coba lagi
    </button>
  )
}

function LoadingRows() {
  return (
    <div className="grid gap-3 p-4" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  )
}
