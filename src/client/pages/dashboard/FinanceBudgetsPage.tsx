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
import { api, errorMessage } from '@/lib/api'
import { FINANCE_WRITERS, formatPercent, overBudget, realization, yearElapsed } from '@/lib/finance'
import { formatTime } from '@/lib/format'
import { useCan } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'
import { useLiveReload } from '@/lib/use-live-reload'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const selectClass =
  'h-9 rounded-lg border border-input bg-card px-2.5 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

type Totals = { target_amount: number; realized_amount: number; type: FinanceType }

// Pos Kas dan RAPBJ: target tiap mata anggaran setahun dan realisasinya, dihitung dari
// transaksi yang tercatat. Bendahara dan Admin mengubah; Pendeta dan Majelis membaca.
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
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Pos Kas & RAPBJ</h1>
          {loading ? (
            <Skeleton className="h-5 w-80 max-w-full" />
          ) : (
            <Finding
              year={year}
              fund={selectedFund}
              groups={groups}
              overCount={overCount}
              elapsed={year === currentYear ? elapsed : null}
            />
          )}
        </div>
        {canEdit && funds.data && (
          <Button size="lg" onClick={() => openBudgetForm()}>
            <Plus data-icon="inline-start" />
            {hasActiveFund ? 'Tambah mata anggaran' : 'Tambah Pos Kas'}
          </Button>
        )}
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="rapbj-heading" className="grid min-w-0 gap-3">
          <h2 id="rapbj-heading" className="sr-only">
            Mata anggaran RAPBJ {year}
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1.5">
              <span className="text-xs text-muted-foreground">Tahun anggaran</span>
              <select
                value={year}
                onChange={(event) =>
                  update({
                    year: event.target.value === String(currentYear) ? '' : event.target.value,
                  })
                }
                className={cn(selectClass, 'w-28')}
              >
                {years.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid min-w-0 flex-1 gap-1.5 sm:max-w-64">
              <span className="text-xs text-muted-foreground">Pos Kas</span>
              <select
                value={fundId}
                disabled={!funds.data}
                onChange={(event) => update({ fund_id: event.target.value })}
                className={cn(selectClass, 'w-full')}
              >
                <option value="">Semua Pos Kas</option>
                {fundList.map((fund) => (
                  <option key={fund.id} value={fund.id}>
                    {fund.code} · {fund.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="ml-auto hidden pb-2 text-sm text-muted-foreground tabular-nums sm:block">
              {budgets.data ? `${rows.length} mata anggaran` : ''}
            </p>
          </div>

          <div className="rounded-lg border bg-card">
            <table className="w-full table-fixed text-sm">
              <caption className="sr-only">
                Target dan realisasi mata anggaran RAPBJ {year}
                {selectedFund ? `, ${selectedFund.name}` : ''}
              </caption>
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th scope="col" className="h-10 pr-4 pl-4 font-normal">
                    Mata anggaran
                  </th>
                  <th scope="col" className="hidden w-32 pr-4 text-right font-normal md:table-cell">
                    Target
                  </th>
                  <th scope="col" className="hidden w-32 pr-4 text-right font-normal md:table-cell">
                    Realisasi
                  </th>
                  <th scope="col" className="w-32 pr-4 font-normal sm:w-44">
                    Capaian
                  </th>
                  {canEdit && (
                    <th scope="col" className="w-12 pr-2">
                      <span className="sr-only">Tindakan</span>
                    </th>
                  )}
                </tr>
              </thead>
              {budgets.error && !budgets.data ? (
                <tbody>
                  <MessageRow colSpan={colSpan}>
                    RAPBJ tidak dapat dimuat: {budgets.error}{' '}
                    <button type="button" onClick={reloadAll} className="font-medium underline">
                      Coba lagi
                    </button>
                  </MessageRow>
                </tbody>
              ) : loading ? (
                <tbody>
                  {Array.from({ length: 6 }, (_, index) => (
                    <SkeletonRow key={index} withMenu={canEdit} />
                  ))}
                </tbody>
              ) : rows.length === 0 ? (
                <tbody>
                  <MessageRow colSpan={colSpan}>
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
                  </MessageRow>
                </tbody>
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
            </table>
          </div>
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
        </section>

        <FundPanel
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
    <p className="text-sm text-muted-foreground tabular-nums">
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
    </p>
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
    <tbody>
      <tr className="border-t border-rule bg-muted/50 align-top">
        <th scope="rowgroup" className="py-2.5 pr-4 pl-4 text-left font-medium">
          {label}
          {!empty && (
            <span className="block text-[0.8125rem] font-normal text-muted-foreground tabular-nums md:hidden">
              {formatRupiah(totals.realized_amount)} dari {formatRupiah(totals.target_amount)}
            </span>
          )}
        </th>
        <td
          className={cn(
            'hidden py-2.5 pr-4 text-right font-medium tabular-nums md:table-cell',
            empty && 'font-normal text-muted-foreground',
          )}
        >
          {figure(totals.target_amount)}
        </td>
        <td
          className={cn(
            'hidden py-2.5 pr-4 text-right font-medium tabular-nums md:table-cell',
            empty && 'font-normal text-muted-foreground',
          )}
        >
          {figure(totals.realized_amount)}
        </td>
        <td className="py-2.5 pr-4">
          {rows.length > 0 && <Meter totals={totals} elapsed={elapsed} strong />}
        </td>
        {canEdit && <td />}
      </tr>
      {rows.length === 0 ? (
        <MessageRow colSpan={canEdit ? 5 : 4}>
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
        </MessageRow>
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
    </tbody>
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
    <tr
      className={cn('border-t border-rule align-top', !budget.is_active && 'text-muted-foreground')}
    >
      <td className="py-3 pr-4 pl-4">
        <p className="md:truncate" title={`${budget.account_code} ${budget.account_name}`}>
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
            <span
              className={cn(
                'ml-1.5 inline-block rounded-full bg-negative-soft px-2 py-0.5 text-xs font-medium whitespace-nowrap text-negative-ink',
                details.length === 0 && 'md:ml-0',
              )}
            >
              Lewat {formatRupiah(budget.realized_amount - budget.target_amount)}
            </span>
          )}
        </p>
      </td>
      <td className="hidden py-3 pr-4 text-right tabular-nums md:table-cell">
        {formatRupiah(budget.target_amount)}
      </td>
      <td
        className={cn(
          'hidden py-3 pr-4 text-right tabular-nums md:table-cell',
          budget.realized_amount === 0 && 'text-muted-foreground',
        )}
      >
        {formatRupiah(budget.realized_amount)}
      </td>
      <td className="py-3 pr-4">
        <Meter totals={budget} elapsed={elapsed} />
      </td>
      {canEdit && (
        <td className="py-2 pr-2 text-right">
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
        </td>
      )}
    </tr>
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

function FundPanel({
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
    <section aria-labelledby="funds-heading" className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
        <h2 id="funds-heading" className="text-sm font-semibold">
          Pos Kas
        </h2>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus data-icon="inline-start" />
            Tambah Pos Kas
          </Button>
        )}
      </div>
      {error ? (
        <p className="border-t border-rule px-4 py-6 text-sm text-muted-foreground">
          Pos Kas tidak dapat dimuat: {error}{' '}
          <button type="button" onClick={onRetry} className="font-medium underline">
            Coba lagi
          </button>
        </p>
      ) : loading ? (
        <ul aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="grid gap-1.5 border-t border-rule px-4 py-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
            </li>
          ))}
        </ul>
      ) : funds.length === 0 ? (
        <p className="border-t border-rule px-4 py-6 text-sm text-muted-foreground">
          Belum ada Pos Kas. Contohnya Kas Umum, Kas Pembangunan, dan Kas Diakonia.
        </p>
      ) : (
        <>
          <ul>
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
          <div
            className={cn(
              'flex items-baseline justify-between gap-3 border-t px-4 py-3',
              canEdit && 'pr-14',
            )}
          >
            <p className="text-sm text-muted-foreground">Total saldo</p>
            <p className="text-base font-semibold tabular-nums">{formatRupiah(total)}</p>
          </div>
        </>
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
        'flex items-start gap-2 border-t border-rule py-3 pl-4',
        canEdit ? 'pr-2' : 'pr-4',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <Link
            to={transactionsLink}
            className={cn(
              'min-w-0 font-medium break-words underline-offset-4 hover:underline',
              !fund.is_active && 'text-muted-foreground',
            )}
          >
            {fund.name}
          </Link>
          <p
            className={cn(
              'flex-none tabular-nums',
              fund.current_balance < 0 && 'font-medium text-negative-ink',
            )}
          >
            {formatRupiah(fund.current_balance)}
          </p>
        </div>
        <p className="mt-0.5 truncate text-[0.8125rem] text-muted-foreground">
          {details.join(' · ')}
        </p>
      </div>
      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-my-1 size-10 flex-none sm:size-8">
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

function MessageRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr className="border-t border-rule">
      <td colSpan={colSpan} className="px-4 py-6 text-muted-foreground">
        {children}
      </td>
    </tr>
  )
}

function SkeletonRow({ withMenu }: { withMenu: boolean }) {
  return (
    <tr className="border-t border-rule" aria-hidden="true">
      <td className="py-3 pr-4 pl-4">
        <Skeleton className="h-5 w-48 max-w-full" />
        <Skeleton className="mt-1.5 h-4 w-20" />
      </td>
      <td className="hidden py-3 pr-4 md:table-cell">
        <Skeleton className="ml-auto h-5 w-24" />
      </td>
      <td className="hidden py-3 pr-4 md:table-cell">
        <Skeleton className="ml-auto h-5 w-24" />
      </td>
      <td className="py-3 pr-4">
        <Skeleton className="h-5 w-full" />
      </td>
      {withMenu && <td />}
    </tr>
  )
}
