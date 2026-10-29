import { useCallback, useState, type ReactNode } from 'react'
import {
  CircleCheck,
  CircleSlash,
  EllipsisVertical,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { witaToday } from '@shared/dates'
import { formatRupiah } from '@shared/finance'
import {
  BUDGET_TYPE_LABELS,
  type ApiList,
  type FinanceBudget,
  type FinanceBudgetResponse,
  type FinanceFund,
  type FinanceFundResponse,
  type FinanceType,
} from '@shared/types'
import { ConfirmDialog, type Confirmation } from '@/components/confirm-dialog'
import { BudgetFormDialog } from '@/components/finance/budget-form-dialog'
import { FundFormDialog } from '@/components/finance/fund-form-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SkeletonRows, TableCard, TableMessage, selectClass } from '@/components/zenith/data-table'
import { PageHeader } from '@/components/zenith/page-header'
import { StatusBadge } from '@/components/zenith/status-badge'
import { api, errorMessage } from '@/lib/api'
import { FINANCE_WRITERS, formatPercent, overBudget, realization, yearElapsed } from '@/lib/finance'
import { formatTime } from '@/lib/format'
import { useCan } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'
import { useLiveReload } from '@/lib/use-live-reload'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

type Totals = { target_amount: number; realized_amount: number; type: FinanceType }

// Pos Kas dan RAPBJ: target tiap mata anggaran setahun dan realisasinya, dihitung dari
// transaksi yang tercatat. Bendahara dan Admin mengubah; Pendeta dan Majelis membaca.
// Pos Kas tampil sebagai deret kartu saldo di atas, tabel RAPBJ selebar halaman di bawahnya
// (sebelumnya panel samping menyempitkan kolom nama mata anggaran di 1280 px).
export default function FinanceBudgetsPage() {
  const canEdit = useCan(FINANCE_WRITERS)
  const { params, update } = useUrlFilters()
  const [today] = useState(witaToday)
  const currentYear = Number(today.slice(0, 4))
  const yearParam = Number(params.get('year'))
  const year = yearParam >= 2000 && yearParam <= 2100 ? yearParam : currentYear
  const fundId = params.get('fund_id') ?? ''

  const funds = useApiQuery<ApiList<FinanceFund>>('/finance/funds')
  const budgets = useApiQuery<ApiList<FinanceBudget>>('/finance/budgets')
  const { reload: reloadFunds } = funds
  const { reload: reloadBudgets } = budgets
  const reloadAll = useCallback(() => {
    reloadFunds()
    reloadBudgets()
  }, [reloadFunds, reloadBudgets])
  // Realisasi ikut berubah saat Bendahara lain mencatat transaksi.
  useLiveReload(reloadAll)

  const [fundForm, setFundForm] = useState<{ fund?: FinanceFund } | null>(null)
  const [budgetForm, setBudgetForm] = useState<{
    budget?: FinanceBudget
    type?: FinanceType
  } | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  const fundList = funds.data?.data ?? []
  const allBudgets = budgets.data?.data ?? []
  const selectedFund = fundList.find((fund) => String(fund.id) === fundId)
  const hasActiveFund = fundList.some((fund) => fund.is_active)
  const years = [
    ...new Set([currentYear + 1, currentYear, year, ...allBudgets.map((b) => b.fiscal_year)]),
  ].sort((a, b) => b - a)
  const rows = allBudgets.filter(
    (budget) => budget.fiscal_year === year && (!fundId || String(budget.fund_id) === fundId),
  )
  const groups = (['INCOME', 'EXPENSE'] as const).map((type) => ({
    type,
    rows: rows.filter((budget) => budget.type === type),
  }))
  const overCount = rows.filter(overBudget).length
  const elapsed = yearElapsed(year, today)
  const loading = !budgets.data || !funds.data
  const colSpan = canEdit ? 5 : 4

  function openBudgetForm(type?: FinanceType) {
    if (hasActiveFund) setBudgetForm({ type })
    else setFundForm({})
  }

  function handleFundSaved(result: FinanceFundResponse, created: boolean) {
    setFundForm(null)
    reloadFunds()
    toast.success(
      created
        ? `Pos Kas ${result.fund.code} dibuat. Susun mata anggarannya.`
        : `Pos Kas ${result.fund.code} disimpan.`,
    )
  }

  function handleBudgetSaved(result: FinanceBudgetResponse, created: boolean) {
    const saved = result.budget
    setBudgetForm(null)
    reloadAll()
    toast.success(
      created
        ? `Mata anggaran ${saved.account_code} ditambahkan ke RAPBJ ${saved.fiscal_year}.`
        : `Mata anggaran ${saved.account_code} disimpan.`,
    )
    // Tampilkan tahun dan Pos Kas tempat mata anggaran itu berada.
    const hidden = saved.fiscal_year !== year || (fundId && String(saved.fund_id) !== fundId)
    if (hidden) {
      update({
        year: saved.fiscal_year === currentYear ? '' : String(saved.fiscal_year),
        fund_id: '',
      })
    }
  }

  async function toggleFund(fund: FinanceFund) {
    try {
      await api.patch(`/finance/funds/${fund.id}`, { is_active: !fund.is_active })
      reloadFunds()
      toast.success(`Pos Kas ${fund.code} ${fund.is_active ? 'dinonaktifkan' : 'diaktifkan'}.`)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function toggleBudget(budget: FinanceBudget) {
    try {
      await api.patch(`/finance/budgets/${budget.id}`, { is_active: !budget.is_active })
      reloadBudgets()
      toast.success(
        `Mata anggaran ${budget.account_code} ${budget.is_active ? 'dinonaktifkan' : 'diaktifkan'}.`,
      )
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  function confirmDeleteFund(fund: FinanceFund) {
    setConfirmation({
      title: `Hapus Pos Kas ${fund.code}?`,
      description: `${fund.name} belum punya mata anggaran maupun transaksi, jadi aman dihapus.`,
      confirmLabel: 'Hapus Pos Kas',
      destructive: true,
      onConfirm: async () => {
        await api.delete(`/finance/funds/${fund.id}`)
        if (String(fund.id) === fundId) update({ fund_id: '' })
        reloadFunds()
        toast.success(`Pos Kas ${fund.code} dihapus.`)
      },
    })
  }

  function confirmDeleteBudget(budget: FinanceBudget) {
    setConfirmation({
      title: `Hapus mata anggaran ${budget.account_code}?`,
      description: `${budget.account_name} (RAPBJ ${budget.fiscal_year}) belum dipakai transaksi. Targetnya ${formatRupiah(budget.target_amount)} ikut terhapus.`,
      confirmLabel: 'Hapus mata anggaran',
      destructive: true,
      onConfirm: async () => {
        await api.delete(`/finance/budgets/${budget.id}`)
        reloadAll()
        toast.success(`Mata anggaran ${budget.account_code} dihapus.`)
      },
    })
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Pos Kas & RAPBJ"
        description={
          loading ? (
            <span className="inline-block h-4 w-80 max-w-full animate-pulse rounded-md bg-muted align-middle" />
          ) : (
            <Finding
              year={year}
              fund={selectedFund}
              groups={groups}
              overCount={overCount}
              elapsed={year === currentYear ? elapsed : null}
            />
          )
        }
        actions={
          canEdit &&
          funds.data && (
            <Button size="lg" onClick={() => openBudgetForm()}>
              <Plus data-icon="inline-start" />
              {hasActiveFund ? 'Tambah mata anggaran' : 'Tambah Pos Kas'}
            </Button>
          )
        }
      />

      <FundCards
        funds={fundList}
        loading={!funds.data}
        error={funds.data ? null : funds.error}
        onRetry={reloadFunds}
        canEdit={canEdit}
        onAdd={() => setFundForm({})}
        onEdit={(fund) => setFundForm({ fund })}
        onToggle={toggleFund}
        onDelete={confirmDeleteFund}
      />

      <div className="grid gap-3">
        <TableCard
          aria-labelledby="rapbj-heading"
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="rapbj-heading" className="mr-2 text-base font-semibold">
                RAPBJ {year}
              </h2>
              <select
                aria-label="Tahun anggaran"
                value={year}
                onChange={(event) =>
                  update({
                    year: event.target.value === String(currentYear) ? '' : event.target.value,
                  })
                }
                className={cn(selectClass, 'w-28 tabular-nums')}
              >
                {years.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                aria-label="Pos Kas"
                value={fundId}
                disabled={!funds.data}
                onChange={(event) => update({ fund_id: event.target.value })}
                className={cn(selectClass, 'min-w-0 flex-1 sm:max-w-64 sm:flex-none')}
              >
                <option value="">Semua Pos Kas</option>
                {fundList.map((fund) => (
                  <option key={fund.id} value={fund.id}>
                    {fund.code} · {fund.name}
                  </option>
                ))}
              </select>
              <p className="ml-auto hidden text-sm text-muted-foreground tabular-nums sm:block">
                {budgets.data ? `${rows.length} mata anggaran` : ''}
              </p>
            </div>
          }
        >
          <Table className="table-fixed">
            <caption className="sr-only">
              Target dan realisasi mata anggaran RAPBJ {year}
              {selectedFund ? `, ${selectedFund.name}` : ''}
            </caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Mata anggaran</TableHead>
                <TableHead className="hidden w-36 text-right md:table-cell">Target</TableHead>
                <TableHead className="hidden w-36 text-right md:table-cell">Realisasi</TableHead>
                <TableHead className="w-36 sm:w-52">Capaian</TableHead>
                {canEdit && (
                  <TableHead className="w-12">
                    <span className="sr-only">Tindakan</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            {budgets.error && !budgets.data ? (
              <TableBody>
                <TableMessage colSpan={colSpan}>
                  RAPBJ tidak dapat dimuat: {budgets.error}{' '}
                  <button type="button" onClick={reloadAll} className="font-medium underline">
                    Coba lagi
                  </button>
                </TableMessage>
              </TableBody>
            ) : loading ? (
              <TableBody>
                <SkeletonRows
                  cells={[
                    '',
                    'hidden md:table-cell',
                    'hidden md:table-cell',
                    '',
                    ...(canEdit ? [''] : []),
                  ]}
                />
              </TableBody>
            ) : rows.length === 0 ? (
              <TableBody>
                <TableMessage colSpan={colSpan}>
                  {fundList.length === 0
                    ? 'Belum ada Pos Kas. Buat Pos Kas dulu, lalu susun mata anggaran RAPBJ-nya.'
                    : `Belum ada mata anggaran RAPBJ ${year}${selectedFund ? ` di ${selectedFund.name}` : ''}.`}
                  {canEdit && (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="font-medium text-foreground underline"
                        onClick={() => openBudgetForm()}
                      >
                        {hasActiveFund ? 'Tambah mata anggaran' : 'Tambah Pos Kas'}
                      </button>
                    </>
                  )}
                </TableMessage>
              </TableBody>
            ) : (
              groups.map((group) => (
                <BudgetGroup
                  key={group.type}
                  type={group.type}
                  rows={group.rows}
                  showFund={!fundId}
                  elapsed={elapsed}
                  canEdit={canEdit}
                  onAdd={() => openBudgetForm(group.type)}
                  onEdit={(budget) => setBudgetForm({ budget })}
                  onToggle={toggleBudget}
                  onDelete={confirmDeleteBudget}
                />
              ))
            )}
          </Table>
        </TableCard>
        {budgets.data && rows.length > 0 && (
          <p className="text-[0.8125rem] text-muted-foreground">
            Realisasi dihitung otomatis dari kas masuk dan kas keluar yang dicatat pada tiap mata
            anggaran
            {budgets.updatedAt &&
              `, diperbarui pukul ${formatTime(new Date(budgets.updatedAt).toISOString())}`}
            .
            {year === currentYear &&
              ` Garis tegak pada bar menandai ${formatPercent(elapsed)} tahun yang sudah berjalan.`}
          </p>
        )}
      </div>

      {canEdit && (
        <>
          <FundFormDialog
            open={fundForm !== null}
            onOpenChange={(open) => !open && setFundForm(null)}
            fund={fundForm?.fund}
            onSaved={handleFundSaved}
          />
          <BudgetFormDialog
            open={budgetForm !== null}
            onOpenChange={(open) => !open && setBudgetForm(null)}
            budget={budgetForm?.budget}
            funds={fundList}
            defaults={{
              fiscal_year: year,
              fund_id: selectedFund?.is_active ? selectedFund.id : undefined,
              type: budgetForm?.type,
            }}
            onSaved={handleBudgetSaved}
          />
          <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
        </>
      )}
    </div>
  )
}

function sum(rows: FinanceBudget[], type: FinanceType): Totals {
  return {
    type,
    target_amount: rows.reduce((total, budget) => total + budget.target_amount, 0),
    realized_amount: rows.reduce((total, budget) => total + budget.realized_amount, 0),
  }
}

// Kalimat temuan di bawah judul: capaian penerimaan, serapan pengeluaran, dan berapa
// mata anggaran pengeluaran yang melewati batas.
function Finding({
  year,
  fund,
  groups,
  overCount,
  elapsed,
}: {
  year: number
  fund?: FinanceFund
  groups: { type: FinanceType; rows: FinanceBudget[] }[]
  overCount: number
  elapsed: number | null
}) {
  const parts: ReactNode[] = []
  for (const group of groups) {
    const ratio = realization(sum(group.rows, group.type))
    if (ratio === null) continue
    parts.push(
      group.type === 'INCOME'
        ? `penerimaan tercapai ${formatPercent(ratio)}`
        : `pengeluaran terserap ${formatPercent(ratio)}`,
    )
  }
  if (elapsed !== null && parts.length > 0) parts.push(`${formatPercent(elapsed)} tahun berjalan`)
  if (overCount > 0) {
    parts.push(
      <span key="over" className="font-medium text-negative-ink">
        {overCount} mata anggaran pengeluaran melewati batas
      </span>,
    )
  }

  return (
    <span className="tabular-nums">
      RAPBJ {year}
      {fund && ` · ${fund.name}`}
      {parts.length === 0
        ? ': belum ada target yang diisi.'
        : parts.map((part, index) => (
            <span key={index}>
              {index === 0 ? ': ' : ' · '}
              {part}
            </span>
          ))}
    </span>
  )
}

function BudgetGroup({
  type,
  rows,
  showFund,
  elapsed,
  canEdit,
  onAdd,
  onEdit,
  onToggle,
  onDelete,
}: {
  type: FinanceType
  rows: FinanceBudget[]
  showFund: boolean
  elapsed: number
  canEdit: boolean
  onAdd: () => void
  onEdit: (budget: FinanceBudget) => void
  onToggle: (budget: FinanceBudget) => void
  onDelete: (budget: FinanceBudget) => void
}) {
  const totals = sum(rows, type)
  const label = BUDGET_TYPE_LABELS[type]
  const empty = rows.length === 0
  // Kelompok tanpa mata anggaran tidak punya jumlah; tanda pisah, bukan Rp0.
  const figure = (amount: number) => (empty ? '—' : formatRupiah(amount))
  return (
    <TableBody>
      <TableRow className="bg-muted/50 hover:bg-muted/50 [&>*]:align-top">
        <th scope="rowgroup" className="px-4 py-2.5 text-left font-semibold">
          {label}
          {!empty && (
            <span className="block text-[0.8125rem] font-normal text-muted-foreground tabular-nums md:hidden">
              {formatRupiah(totals.realized_amount)} dari {formatRupiah(totals.target_amount)}
            </span>
          )}
        </th>
        <TableCell
          className={cn(
            'hidden py-2.5 text-right font-semibold tabular-nums md:table-cell',
            empty && 'font-normal text-muted-foreground',
          )}
        >
          {figure(totals.target_amount)}
        </TableCell>
        <TableCell
          className={cn(
            'hidden py-2.5 text-right font-semibold tabular-nums md:table-cell',
            empty && 'font-normal text-muted-foreground',
          )}
        >
          {figure(totals.realized_amount)}
        </TableCell>
        <TableCell className="py-2.5 text-right">
          {rows.length > 0 && <Meter totals={totals} elapsed={elapsed} strong />}
        </TableCell>
        {canEdit && <TableCell />}
      </TableRow>
      {rows.length === 0 ? (
        <TableMessage colSpan={canEdit ? 5 : 4}>
          Belum ada mata anggaran {label.toLowerCase()}.
          {canEdit && (
            <>
              {' '}
              <button
                type="button"
                className="font-medium text-foreground underline"
                onClick={onAdd}
              >
                Tambah
              </button>
            </>
          )}
        </TableMessage>
      ) : (
        rows.map((budget) => (
          <BudgetRow
            key={budget.id}
            budget={budget}
            showFund={showFund}
            elapsed={elapsed}
            canEdit={canEdit}
            onEdit={() => onEdit(budget)}
            onToggle={() => onToggle(budget)}
            onDelete={() => onDelete(budget)}
          />
        ))
      )}
    </TableBody>
  )
}

function BudgetRow({
  budget,
  showFund,
  elapsed,
  canEdit,
  onEdit,
  onToggle,
  onDelete,
}: {
  budget: FinanceBudget
  showFund: boolean
  elapsed: number
  canEdit: boolean
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const over = overBudget(budget)
  const transactionsLink = `/dashboard/finance/transactions?budget_id=${budget.id}&month=all`
  const details = [showFund && budget.fund_code, !budget.is_active && 'Nonaktif'].filter(Boolean)

  return (
    <TableRow className={cn('[&>td]:align-top', !budget.is_active && 'text-muted-foreground')}>
      <TableCell className="whitespace-normal">
        {/* Nama mata anggaran boleh membungkus; kolom ini kini selebar sisa tabel. */}
        <p className="break-words">
          <span className="text-muted-foreground tabular-nums">{budget.account_code}</span>{' '}
          <Link to={transactionsLink} className="font-medium underline-offset-4 hover:underline">
            {budget.account_name}
          </Link>
        </p>
        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground tabular-nums">
          <span className="md:hidden">
            {formatRupiah(budget.realized_amount)} dari {formatRupiah(budget.target_amount)}
            {details.length > 0 && ' · '}
          </span>
          {details.join(' · ')}
          {over && (
            <StatusBadge
              tone="danger"
              className={cn('ml-1.5 align-middle', details.length === 0 && 'md:ml-0')}
            >
              Lewat {formatRupiah(budget.realized_amount - budget.target_amount)}
            </StatusBadge>
          )}
        </p>
      </TableCell>
      <TableCell className="hidden text-right tabular-nums md:table-cell">
        {formatRupiah(budget.target_amount)}
      </TableCell>
      <TableCell
        className={cn(
          'hidden text-right tabular-nums md:table-cell',
          budget.realized_amount === 0 && 'text-muted-foreground',
        )}
      >
        {formatRupiah(budget.realized_amount)}
      </TableCell>
      <TableCell className="text-right">
        <Meter totals={budget} elapsed={elapsed} />
      </TableCell>
      {canEdit && (
        <TableCell className="py-1.5 pr-2 pl-0 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-10 sm:size-8">
                <EllipsisVertical />
                <span className="sr-only">Tindakan untuk {budget.account_name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil />
                Ubah mata anggaran
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={transactionsLink}>
                  <ReceiptText />
                  Lihat transaksinya
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onToggle}>
                {budget.is_active ? <CircleSlash /> : <CircleCheck />}
                {budget.is_active ? 'Nonaktifkan' : 'Aktifkan kembali'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {budget.realized_amount > 0 ? (
                <DropdownMenuItem disabled className="items-start">
                  <Trash2 className="mt-0.5" />
                  <span className="grid">
                    Hapus mata anggaran
                    <span className="text-xs text-muted-foreground">
                      Sudah dipakai transaksi; nonaktifkan saja
                    </span>
                  </span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2 />
                  Hapus mata anggaran
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  )
}

// Bar capaian: panjang lintasan = target. Pengeluaran yang melewati target memendekkan
// lintasan dan menampilkan kelebihannya dengan warna negatif di ujungnya. Garis tegak
// menandai bagian tahun yang sudah berjalan.
function Meter({
  totals,
  elapsed,
  strong = false,
}: {
  totals: Totals
  elapsed: number
  strong?: boolean
}) {
  const ratio = realization(totals)
  if (ratio === null) {
    return (
      <p className="text-right text-muted-foreground">
        —<span className="sr-only">Target belum diisi</span>
      </p>
    )
  }
  const overrun = totals.type === 'EXPENSE' && ratio > 1
  const track = overrun ? 100 / Math.min(ratio, 4) : 100
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-2 flex-1" aria-hidden="true">
        <div
          className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-muted"
          style={{ width: `${track}%` }}
        >
          <div
            className="h-full rounded-full bg-chart-5"
            style={{ width: `${Math.min(ratio, 1) * 100}%` }}
          />
        </div>
        {overrun && (
          <div
            className="absolute inset-y-0 right-0 rounded-r-full bg-destructive"
            style={{ left: `calc(${track}% + 2px)` }}
          />
        )}
        {elapsed > 0 && elapsed < 1 && (
          <div
            className="absolute -inset-y-1 w-px bg-foreground"
            style={{ left: `${elapsed * track}%` }}
          />
        )}
      </div>
      <p
        className={cn(
          'w-14 flex-none text-right tabular-nums',
          strong && 'font-medium',
          overrun && 'font-medium text-negative-ink',
        )}
      >
        {formatPercent(ratio)}
      </p>
    </div>
  )
}

// Pos Kas sebagai deret kartu saldo (Zenith): nama, saldo, kode dan pemakaiannya, menu.
function FundCards({
  funds,
  loading,
  error,
  onRetry,
  canEdit,
  onAdd,
  onEdit,
  onToggle,
  onDelete,
}: {
  funds: FinanceFund[]
  loading: boolean
  error: string | null
  onRetry: () => void
  canEdit: boolean
  onAdd: () => void
  onEdit: (fund: FinanceFund) => void
  onToggle: (fund: FinanceFund) => void
  onDelete: (fund: FinanceFund) => void
}) {
  const total = funds.reduce((sum, fund) => sum + fund.current_balance, 0)
  return (
    <section aria-labelledby="funds-heading" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="funds-heading" className="text-base font-semibold">
          Pos Kas
          {!loading && !error && funds.length > 0 && (
            <span className="ml-2 font-normal text-muted-foreground tabular-nums">
              Total saldo{' '}
              <span className="font-semibold text-foreground">{formatRupiah(total)}</span>
            </span>
          )}
        </h2>
        {canEdit && (
          <Button variant="outline" onClick={onAdd}>
            <Plus data-icon="inline-start" />
            Tambah Pos Kas
          </Button>
        )}
      </div>
      {error ? (
        <p className="rounded-xl px-4 py-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
          Pos Kas tidak dapat dimuat: {error}{' '}
          <button type="button" onClick={onRetry} className="font-medium underline">
            Coba lagi
          </button>
        </p>
      ) : loading ? (
        <ul
          aria-hidden="true"
          className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index} className="grid gap-2 rounded-xl p-4 ring-1 ring-foreground/10">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-3.5 w-36" />
            </li>
          ))}
        </ul>
      ) : funds.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
          Belum ada Pos Kas. Contohnya Kas Umum, Kas Pembangunan, dan Kas Diakonia.
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
          {funds.map((fund) => (
            <FundItem
              key={fund.id}
              fund={fund}
              canEdit={canEdit}
              onEdit={() => onEdit(fund)}
              onToggle={() => onToggle(fund)}
              onDelete={() => onDelete(fund)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function FundItem({
  fund,
  canEdit,
  onEdit,
  onToggle,
  onDelete,
}: {
  fund: FinanceFund
  canEdit: boolean
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const transactionsLink = `/dashboard/finance/transactions?fund_id=${fund.id}`
  const usage = [
    fund.budget_count > 0 && `${fund.budget_count} mata anggaran`,
    fund.transaction_count > 0 && `${fund.transaction_count} transaksi`,
  ].filter(Boolean)
  const details = [fund.code, ...usage, !fund.is_active && 'Nonaktif'].filter(Boolean)

  return (
    <li
      className={cn(
        'flex items-start gap-2 rounded-xl bg-card py-4 pl-4 ring-1 ring-foreground/10',
        canEdit ? 'pr-2' : 'pr-4',
        !fund.is_active && 'bg-muted/40',
      )}
    >
      <div className="min-w-0 flex-1">
        <Link
          to={transactionsLink}
          className={cn(
            'text-sm break-words underline-offset-4 hover:underline',
            fund.is_active ? 'text-muted-foreground' : 'text-muted-foreground/80',
          )}
        >
          {fund.name}
        </Link>
        <p
          className={cn(
            'mt-1 text-xl font-bold tracking-tight tabular-nums',
            fund.current_balance < 0 && 'text-negative-ink',
            !fund.is_active && 'text-muted-foreground',
          )}
        >
          {formatRupiah(fund.current_balance)}
        </p>
        <p className="mt-1 text-[0.8125rem] text-muted-foreground">{details.join(' · ')}</p>
      </div>
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mt-2 size-10 flex-none sm:size-8">
              <EllipsisVertical />
              <span className="sr-only">Tindakan untuk Pos Kas {fund.code}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil />
              Ubah Pos Kas
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={transactionsLink}>
                <ReceiptText />
                Lihat transaksinya
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onToggle}>
              {fund.is_active ? <CircleSlash /> : <CircleCheck />}
              {fund.is_active ? 'Nonaktifkan' : 'Aktifkan kembali'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {usage.length > 0 ? (
              <DropdownMenuItem disabled className="items-start">
                <Trash2 className="mt-0.5" />
                <span className="grid">
                  Hapus Pos Kas
                  <span className="text-xs text-muted-foreground">
                    Dipakai {usage.join(' dan ')}
                  </span>
                </span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 />
                Hapus Pos Kas
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  )
}
