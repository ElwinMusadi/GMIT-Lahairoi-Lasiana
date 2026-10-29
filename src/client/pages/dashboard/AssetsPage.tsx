import { useRef, useState } from 'react'
import { ArrowUpRight, Plus, X } from 'lucide-react'
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
import {
  SearchField,
  TableCard,
  TablePagination,
  selectClass,
} from '@/components/zenith/data-table'
import { PageHeader } from '@/components/zenith/page-header'
import { Segmented } from '@/components/zenith/segmented'
import { StatusBadge } from '@/components/zenith/status-badge'
import { api } from '@/lib/api'
import { loanTitle, stockText } from '@/lib/assets'
import { useCan } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const PER_PAGE = 50

// Saringan status tab Peminjaman. Tanpa `status` yang tampil peminjaman aktif.
const LOAN_FILTERS = [
  { value: '', api: 'active', label: 'Belum kembali' },
  { value: 'overdue', api: 'OVERDUE', label: 'Terlambat' },
  { value: 'returned', api: 'RETURNED', label: 'Sudah dikembalikan' },
  { value: 'all', api: '', label: 'Semua' },
] as const

type LoanFilter = (typeof LOAN_FILTERS)[number]

// Nilai segmen untuk saringan bawaan (status kosong di URL).
const DEFAULT_LOAN_SEGMENT = 'active'

function loanCount(filter: LoanFilter, counts: Record<LoanStatus, number>) {
  if (filter.api === 'active') return counts.BORROWED + counts.OVERDUE
  if (filter.api === '') return counts.BORROWED + counts.OVERDUE + counts.RETURNED
  return counts[filter.api]
}

// Manajemen Aset & Inventaris (PRD Fase 3) untuk Admin dan Majelis: tampilan Katalog
// Inventaris dan Peminjaman Barang. Tampilan dan filter disimpan di URL (`view=loans`).
// Pola Zenith: tampilan bersegmen di atas kartu tabel; kondisi/status bersegmen,
// pencarian, dan filter di bilah alat tabel.
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

  const catalogMessage = catalog.error ? (
    <>
      Katalog tidak dapat dimuat: {catalog.error} <RetryButton onClick={catalog.reload} />
    </>
  ) : catalog.data && catalog.data.data.length === 0 ? (
    q ? (
      <>
        Tidak ada aset yang cocok dengan “{q}”.{' '}
        <button type="button" className="font-medium underline" onClick={() => clearSearch()}>
          Hapus pencarian
        </button>
      </>
    ) : catalogFiltered ? (
      'Tidak ada aset yang cocok dengan filter ini.'
    ) : (
      <>
        Katalog masih kosong. Catat barang milik gereja, mulai dari alat musik, sound system, kursi,
        sampai tenda.{' '}
        <button
          type="button"
          className="font-medium text-foreground underline"
          onClick={() => setAssetForm({ open: true })}
        >
          Tambah aset
        </button>
      </>
    )
  ) : null

  const loansMessage = loans.error ? (
    <>
      Peminjaman tidak dapat dimuat: {loans.error} <RetryButton onClick={loans.reload} />
    </>
  ) : loans.data && loans.data.data.length === 0 ? (
    q ? (
      `Tidak ada peminjaman yang cocok dengan “${q}”.`
    ) : loanFilter.value === '' ? (
      loansFiltered ? (
        'Tidak ada barang yang sedang dipinjam untuk filter ini.'
      ) : (
        'Semua barang sudah kembali. Peminjaman baru dicatat lewat tombol Catat peminjaman.'
      )
    ) : loanFilter.value === 'overdue' ? (
      'Tidak ada peminjaman yang terlambat.'
    ) : (
      'Belum ada peminjaman yang cocok.'
    )
  ) : null

  const catalogToolbar = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Kondisi barang"
          value={condition || 'ALL'}
          onChange={(value) => update({ condition: value === 'ALL' ? '' : value.toLowerCase() })}
          options={[
            { value: 'ALL', label: 'Semua' },
            ...ASSET_CONDITIONS.map((value) => ({ value, label: ASSET_CONDITION_LABELS[value] })),
          ]}
        />
        <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {catalog.data &&
            `${total.toLocaleString('id-ID')} barang · ${catalog.data.available.toLocaleString('id-ID')} dari ${catalog.data.units.toLocaleString('id-ID')} unit tersedia`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={search}
          onChange={handleSearch}
          label="Cari aset"
          placeholder="Cari kode, nama, catatan"
        />
        <div
          role="group"
          aria-label="Filter"
          className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap"
        >
          <select
            aria-label="Kategori"
            value={category}
            onChange={(event) => update({ category: event.target.value })}
            className={cn(selectClass, 'sm:max-w-56')}
          >
            <option value="">Semua kategori</option>
            {withCurrent(overallAssets.data?.categories, category).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            aria-label="Lokasi"
            value={location}
            onChange={(event) => update({ location: event.target.value })}
            className={cn(selectClass, 'sm:max-w-56')}
          >
            <option value="">Semua lokasi</option>
            {withCurrent(overallAssets.data?.locations, location).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        {catalogFiltered && (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => clearSearch({ category: '', location: '', condition: '' })}
          >
            <X data-icon="inline-start" />
            Hapus filter
          </Button>
        )}
      </div>
    </>
  )

  const loansToolbar = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Status peminjaman"
          value={loanFilter.value || DEFAULT_LOAN_SEGMENT}
          onChange={(value) => update({ status: value === DEFAULT_LOAN_SEGMENT ? '' : value })}
          options={LOAN_FILTERS.map((filter) => ({
            value: filter.value || DEFAULT_LOAN_SEGMENT,
            label: filter.label,
            count: loans.data ? loanCount(filter, loans.data.counts) : undefined,
          }))}
        />
        <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {loans.data && `${total.toLocaleString('id-ID')} peminjaman`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={search}
          onChange={handleSearch}
          label="Cari peminjaman"
          placeholder="Cari peminjam, kode, atau nama barang"
        />
        <select
          aria-label="Rayon"
          value={rayon}
          onChange={(event) => update({ rayon: event.target.value })}
          className={cn(selectClass, 'w-full sm:w-auto')}
        >
          <option value="">Semua rayon</option>
          {(rayons.data?.data ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              Rayon {item.name}
            </option>
          ))}
        </select>
        {assetFilter && (
          <p className="flex min-w-0 items-center gap-1 text-sm">
            <span className="min-w-0 break-words">
              Barang{' '}
              {filteredAsset.data ? (
                <span className="font-medium">{filteredAsset.data.asset.name}</span>
              ) : (
                `#${assetFilter}`
              )}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => update({ asset: '' })}
              className="text-muted-foreground"
            >
              <X />
              <span className="sr-only">Hapus filter barang</span>
            </Button>
          </p>
        )}
        {(loansFiltered || loanFilter.value !== '') && (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => clearSearch({ status: '', asset: '', rayon: '' })}
          >
            <X data-icon="inline-start" />
            Hapus filter
          </Button>
        )}
      </div>
    </>
  )

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Inventaris"
        description={
          overallAssets.data ? (
            <span className="tabular-nums">
              {overallAssets.data.meta.total.toLocaleString('id-ID')} barang ·{' '}
              {overallAssets.data.units.toLocaleString('id-ID')} unit,{' '}
              {(overallAssets.data.units - overallAssets.data.available).toLocaleString('id-ID')}{' '}
              sedang dipinjam
            </span>
          ) : (
            <span className="inline-block h-4 w-80 max-w-full animate-pulse rounded-md bg-muted align-middle" />
          )
        }
        actions={
          <>
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
          </>
        }
      />

      <div className="grid gap-3">
        {/* Pilihan tampilan; segmen yang aktif ikut mengosongkan filter, seperti sebelumnya. */}
        <Segmented
          label="Tampilan"
          className="justify-self-start"
          value={view}
          onChange={(next) => switchView(next)}
          options={[
            {
              value: 'catalog',
              label: (
                <span>
                  Katalog<span className="hidden sm:inline"> Inventaris</span>
                </span>
              ),
            },
            {
              value: 'loans',
              label: (
                <>
                  <span>
                    Peminjaman<span className="hidden sm:inline"> Barang</span>
                  </span>
                  {activeLoans !== undefined && activeLoans > 0 && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {activeLoans.toLocaleString('id-ID')}
                    </span>
                  )}
                  {overallCounts && overallCounts.OVERDUE > 0 && (
                    <StatusBadge tone="danger" className="tabular-nums">
                      {overallCounts.OVERDUE.toLocaleString('id-ID')} terlambat
                    </StatusBadge>
                  )}
                </>
              ),
            },
          ]}
        />

        <TableCard
          aria-label={view === 'catalog' ? 'Katalog inventaris' : 'Peminjaman barang'}
          toolbar={view === 'catalog' ? catalogToolbar : loansToolbar}
          footer={
            result && (
              <TablePagination
                label={view === 'catalog' ? 'Halaman katalog' : 'Halaman peminjaman'}
                page={page}
                perPage={PER_PAGE}
                total={total}
                unit={view === 'catalog' ? 'barang' : 'peminjaman'}
                onPage={(next) => update({ page: String(next) })}
              />
            )
          }
        >
          {view === 'catalog' ? (
            <AssetTable
              items={catalog.data?.data}
              loading={catalog.loading}
              message={catalogMessage}
              canDelete={canDelete}
              onEdit={(asset) => setAssetForm({ open: true, asset })}
              onLend={(asset) => setLoanForm({ open: true, assetId: asset.id })}
              onHistory={(asset) => switchView('loans', { asset: String(asset.id), status: 'all' })}
              onDelete={confirmDelete}
            />
          ) : (
            <LoanTable
              items={loans.data?.data}
              loading={loans.loading}
              message={loansMessage}
              today={today}
              onReturn={setReturning}
            />
          )}
        </TableCard>
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

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="font-medium underline">
      Coba lagi
    </button>
  )
}
