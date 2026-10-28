import { useRef, useState, type ReactNode } from 'react'
import {
  EllipsisVertical,
  Eye,
  FileText,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { witaToday } from '@shared/dates'
import { formatRupiah } from '@shared/finance'
import {
  TRANSACTION_TYPE_LABELS,
  type ApiList,
  type FinanceBudget,
  type FinanceFund,
  type FinanceTransaction,
  type FinanceTransactionPage,
  type FinanceTransactionResponse,
} from '@shared/types'
import { ConfirmDialog, type Confirmation } from '@/components/confirm-dialog'
import { TransactionDetailSheet } from '@/components/finance/transaction-detail-sheet'
import { TransactionFormDialog } from '@/components/finance/transaction-form-dialog'
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
import { api } from '@/lib/api'
import { FINANCE_WRITERS, monthLabel, monthRange, recentMonths, signedAmount } from '@/lib/finance'
import { formatDate } from '@/lib/format'
import { useCan, useCurrentUser } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const PER_PAGE = 50

const controlClass =
  'h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

// Transaksi kas masuk dan keluar per bulan, dengan bukti kuitansinya. Bendahara dan
// Admin mencatat, mengubah, dan menghapus; Pendeta dan Majelis hanya melihat.
// Filter disimpan di URL; tanpa `month` yang ditampilkan bulan berjalan.
export default function FinanceTransactionsPage() {
  const me = useCurrentUser()
  const canEdit = useCan(FINANCE_WRITERS)
  const { params, update } = useUrlFilters()
  const [today] = useState(witaToday)
  const thisMonth = today.slice(0, 7)
  const monthParam = params.get('month') ?? ''
  const month = monthParam === 'all' ? '' : MONTH_PATTERN.test(monthParam) ? monthParam : thisMonth
  const fundId = params.get('fund_id') ?? ''
  const budgetId = params.get('budget_id') ?? ''
  const typeParam = params.get('type') ?? ''
  const type = typeParam === 'INCOME' || typeParam === 'EXPENSE' ? typeParam : ''
  const receiptParam = params.get('receipt') ?? ''
  const receipt = receiptParam === 'with' || receiptParam === 'without' ? receiptParam : ''
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

  const [form, setForm] = useState<{ transaction?: FinanceTransaction } | null>(null)
  const [detail, setDetail] = useState<FinanceTransaction | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  const range = month ? monthRange(month) : null
  const scope = {
    fund_id: fundId,
    budget_id: budgetId,
    from: range?.from ?? '',
    to: range?.to ?? '',
  }
  const transactions = useApiQuery<FinanceTransactionPage>('/finance/transactions', {
    ...scope,
    type,
    receipt,
    q,
    page,
    per_page: PER_PAGE,
  })
  // Temuan di bawah judul: transaksi pada periode ini yang belum dilampiri kuitansi.
  const missing = useApiQuery<FinanceTransactionPage>('/finance/transactions', {
    ...scope,
    receipt: 'without',
    per_page: 1,
  })
  const funds = useApiQuery<ApiList<FinanceFund>>('/finance/funds')
  const budgets = useApiQuery<ApiList<FinanceBudget>>('/finance/budgets')

  const fundList = funds.data?.data ?? []
  const budgetList = budgets.data?.data ?? []
  const hasActiveFund = fundList.some((fund) => fund.is_active)
  const selectedFund = fundList.find((fund) => String(fund.id) === fundId)
  const selectedBudget = budgetList.find((budget) => String(budget.id) === budgetId)
  const period = month ? monthLabel(month) : 'Semua bulan'
  // Untuk di tengah kalimat: nama bulan tetap berhuruf kapital.
  const periodPhrase = month ? monthLabel(month) : 'semua bulan'
  const months = recentMonths(today, 24)
  if (month && !months.includes(month)) months.push(month)

  const result = transactions.data
  const items = result?.data ?? []
  const total = result?.meta.total ?? 0
  const first = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const last = Math.min(page * PER_PAGE, total)
  const filtered = Boolean(fundId || budgetId || type || receipt || q)
  const missingCount = missing.data?.meta.total
  const colSpan = canEdit ? 5 : 4

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

  function reloadAll() {
    transactions.reload()
    missing.reload()
    funds.reload()
    budgets.reload()
  }

  function balanceLine(fund: FinanceFund) {
    return `Saldo ${fund.code} kini ${formatRupiah(fund.current_balance)}.`
  }

  function handleSaved(saved: FinanceTransactionResponse, created: boolean) {
    setForm(null)
    reloadAll()
    const transaction = saved.transaction
    if (!transaction) return
    const label = `${TRANSACTION_TYPE_LABELS[transaction.type]} ${formatRupiah(transaction.amount)}`
    const savedMonth = transaction.transaction_date.slice(0, 7)
    const visible = !month || savedMonth === month
    toast.success(
      `${label} ${created ? 'tercatat' : 'disimpan'}. ${balanceLine(saved.fund)}`,
      visible
        ? undefined
        : {
            action: {
              label: `Buka ${monthLabel(savedMonth)}`,
              onClick: () => update({ month: savedMonth === thisMonth ? '' : savedMonth }),
            },
          },
    )
  }

  function confirmDelete(transaction: FinanceTransaction) {
    const fund = fundList.find((item) => item.id === transaction.fund_id)
    const after =
      fund &&
      fund.current_balance +
        (transaction.type === 'INCOME' ? -transaction.amount : transaction.amount)
    setConfirmation({
      title: `Hapus ${TRANSACTION_TYPE_LABELS[transaction.type].toLowerCase()} ${formatRupiah(transaction.amount)}?`,
      description: (
        <>
          {transaction.description ?? 'Transaksi tanpa keterangan'} ·{' '}
          {formatDate(transaction.transaction_date)}.{' '}
          {fund && after !== undefined
            ? `Saldo ${fund.name} berubah dari ${formatRupiah(fund.current_balance)} menjadi ${formatRupiah(after)}.`
            : 'Saldo Pos Kas ikut disesuaikan.'}{' '}
          Penghapusan tercatat di Log Aktivitas.
        </>
      ),
      confirmLabel: 'Hapus transaksi',
      destructive: true,
      onConfirm: async () => {
        const removed = await api.delete<FinanceTransactionResponse>(
          `/finance/transactions/${transaction.id}`,
        )
        setDetail(null)
        reloadAll()
        toast.success(`Transaksi dihapus. ${balanceLine(removed.fund)}`)
      },
    })
  }

  function openEdit(transaction: FinanceTransaction) {
    setDetail(null)
    setForm({ transaction })
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Transaksi Kas</h1>
          {missingCount !== undefined && result ? (
            <p className="text-sm text-muted-foreground tabular-nums">
              {period}
              {selectedFund && ` · ${selectedFund.name}`}
              {': '}
              {missingCount > 0 ? (
                <>
                  <span className="font-medium text-foreground">
                    {missingCount.toLocaleString('id-ID')} transaksi belum berkuitansi
                  </span>
                  {receipt !== 'without' && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        className="font-medium text-foreground underline underline-offset-4"
                        onClick={() => clearSearch({ receipt: 'without', type: '' })}
                      >
                        Tampilkan
                      </button>
                    </>
                  )}
                </>
              ) : total > 0 || type || receipt || q ? (
                'semua transaksi sudah berkuitansi.'
              ) : (
                'belum ada transaksi.'
              )}
            </p>
          ) : (
            <Skeleton className="h-5 w-72" />
          )}
        </div>
        {canEdit &&
          funds.data &&
          (hasActiveFund ? (
            <Button size="lg" onClick={() => setForm({})}>
              <Plus data-icon="inline-start" />
              Catat transaksi
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link to="/dashboard/finance/budgets">
                <Plus data-icon="inline-start" />
                Buat Pos Kas dulu
              </Link>
            </Button>
          ))}
      </header>

      <div className="grid gap-3">
        <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-4">
          <FilterField id="filter-bulan" label="Bulan">
            <select
              id="filter-bulan"
              value={month || 'all'}
              onChange={(event) =>
                update({ month: event.target.value === thisMonth ? '' : event.target.value })
              }
              className={controlClass}
            >
              {months.map((option) => (
                <option key={option} value={option}>
                  {monthLabel(option)}
                </option>
              ))}
              <option value="all">Semua bulan</option>
            </select>
          </FilterField>
          <FilterField id="filter-pos" label="Pos Kas">
            <select
              id="filter-pos"
              value={fundId}
              disabled={!funds.data}
              onChange={(event) => update({ fund_id: event.target.value, budget_id: '' })}
              className={controlClass}
            >
              <option value="">Semua Pos Kas</option>
              {fundList.map((fund) => (
                <option key={fund.id} value={fund.id}>
                  {fund.code} · {fund.name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField id="filter-jenis" label="Jenis">
            <select
              id="filter-jenis"
              value={type}
              onChange={(event) => update({ type: event.target.value })}
              className={controlClass}
            >
              <option value="">Semua jenis</option>
              <option value="INCOME">{TRANSACTION_TYPE_LABELS.INCOME}</option>
              <option value="EXPENSE">{TRANSACTION_TYPE_LABELS.EXPENSE}</option>
            </select>
          </FilterField>
          <FilterField id="filter-kuitansi" label="Kuitansi">
            <select
              id="filter-kuitansi"
              value={receipt}
              onChange={(event) => update({ receipt: event.target.value })}
              className={controlClass}
            >
              <option value="">Semua</option>
              <option value="with">Sudah berkuitansi</option>
              <option value="without">Belum berkuitansi</option>
            </select>
          </FilterField>
        </div>
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
              placeholder="Cari keterangan transaksi"
              aria-label="Cari transaksi"
              className={cn(controlClass, 'pl-9')}
            />
          </div>
          {budgetId && (
            <p className="flex min-w-0 items-center gap-1 text-sm">
              <span className="truncate">
                Mata anggaran{' '}
                {selectedBudget
                  ? `${selectedBudget.account_code} · ${selectedBudget.account_name} (${selectedBudget.fiscal_year})`
                  : 'terpilih'}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => update({ budget_id: '' })}
                className="text-muted-foreground"
              >
                <X />
                <span className="sr-only">Tampilkan semua mata anggaran</span>
              </Button>
            </p>
          )}
          <div className="ml-auto flex items-center gap-2">
            {(filtered || monthParam) && (
              <Button
                variant="ghost"
                onClick={() =>
                  clearSearch({ month: '', fund_id: '', budget_id: '', type: '', receipt: '' })
                }
              >
                Hapus filter
              </Button>
            )}
            <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
              {result ? `${total.toLocaleString('id-ID')} transaksi` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Totals result={result} />
        <table className="w-full table-fixed border-t text-sm" aria-busy={transactions.loading}>
          <caption className="sr-only">
            Transaksi kas {periodPhrase}
            {selectedFund ? `, ${selectedFund.name}` : ''}
          </caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="hidden h-10 w-32 pl-4 font-normal sm:table-cell">
                Tanggal
              </th>
              <th scope="col" className="h-10 pr-4 pl-4 font-normal sm:pl-0">
                Uraian
              </th>
              <th scope="col" className="hidden w-10 font-normal sm:table-cell">
                <Paperclip className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Kuitansi</span>
              </th>
              <th scope="col" className="w-32 pr-4 text-right font-normal sm:w-40">
                Nominal
              </th>
              {canEdit && (
                <th scope="col" className="w-12 pr-2">
                  <span className="sr-only">Tindakan</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody
            className={cn('transition-opacity', transactions.loading && result && 'opacity-60')}
          >
            {transactions.error && (
              <MessageRow colSpan={colSpan}>
                Transaksi tidak dapat dimuat: {transactions.error}{' '}
                <button
                  type="button"
                  onClick={transactions.reload}
                  className="font-medium underline"
                >
                  Coba lagi
                </button>
              </MessageRow>
            )}
            {!result &&
              !transactions.error &&
              Array.from({ length: 8 }, (_, index) => (
                <SkeletonRow key={index} withMenu={canEdit} />
              ))}
            {result && !transactions.error && items.length === 0 && (
              <MessageRow colSpan={colSpan}>
                {funds.data && fundList.length === 0 ? (
                  canEdit ? (
                    <>
                      Belum ada Pos Kas.{' '}
                      <Link
                        to="/dashboard/finance/budgets"
                        className="font-medium text-foreground underline"
                      >
                        Buat Pos Kas di halaman Pos Kas & RAPBJ
                      </Link>
                    </>
                  ) : (
                    'Bendahara belum membuat Pos Kas.'
                  )
                ) : q ? (
                  <>
                    Tidak ada transaksi yang keterangannya cocok dengan “{q}”.{' '}
                    <button
                      type="button"
                      className="font-medium underline"
                      onClick={() => clearSearch()}
                    >
                      Hapus pencarian
                    </button>
                  </>
                ) : filtered ? (
                  `Tidak ada transaksi pada ${periodPhrase} yang cocok dengan filter ini.`
                ) : (
                  <>
                    Belum ada transaksi pada {month ? period : 'periode mana pun'}.
                    {canEdit && hasActiveFund && (
                      <>
                        {' '}
                        <button
                          type="button"
                          className="font-medium text-foreground underline"
                          onClick={() => setForm({})}
                        >
                          Catat transaksi
                        </button>
                      </>
                    )}
                  </>
                )}
              </MessageRow>
            )}
            {!transactions.error &&
              items.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  canEdit={canEdit}
                  showFund={!fundId}
                  onView={() => setDetail(transaction)}
                  onEdit={() => openEdit(transaction)}
                  onDelete={() => confirmDelete(transaction)}
                />
              ))}
          </tbody>
        </table>

        {result && total > 0 && (
          <nav
            aria-label="Halaman daftar transaksi"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-3"
          >
            <p className="text-sm text-muted-foreground tabular-nums">
              {first.toLocaleString('id-ID')}–{last.toLocaleString('id-ID')} dari{' '}
              {total.toLocaleString('id-ID')} transaksi
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

      <TransactionDetailSheet
        transaction={detail}
        onClose={() => setDetail(null)}
        onEdit={openEdit}
        onDelete={confirmDelete}
        canEdit={canEdit}
        showHistory={me.role === 'ADMIN'}
      />
      {canEdit && (
        <>
          <TransactionFormDialog
            open={form !== null}
            onOpenChange={(open) => !open && setForm(null)}
            transaction={form?.transaction}
            funds={fundList}
            budgets={budgetList}
            defaultFundId={selectedFund?.is_active ? selectedFund.id : undefined}
            onSaved={handleSaved}
          />
          <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
        </>
      )}
    </div>
  )
}

// Jumlah kas masuk, kas keluar, dan selisihnya untuk seluruh hasil filter (bukan hanya
// halaman ini), sebagai kepala tabel.
function Totals({ result }: { result: FinanceTransactionPage | undefined }) {
  const income = result?.totals.income ?? 0
  const expense = result?.totals.expense ?? 0
  const net = income - expense
  const cells = [
    { label: 'Kas masuk', value: income > 0 ? `+${formatRupiah(income)}` : formatRupiah(0) },
    { label: 'Kas keluar', value: expense > 0 ? `−${formatRupiah(expense)}` : formatRupiah(0) },
    {
      label: 'Selisih',
      value: `${net > 0 ? '+' : net < 0 ? '−' : ''}${formatRupiah(Math.abs(net))}`,
    },
  ]
  return (
    <dl className="grid divide-y divide-rule sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {cells.map((cell, index) => (
        <div
          key={cell.label}
          className="flex items-baseline justify-between gap-3 px-4 py-3 sm:grid sm:gap-1"
        >
          <dt className="text-sm text-muted-foreground">{cell.label}</dt>
          <dd
            className={cn(
              'text-lg font-semibold tabular-nums sm:text-2xl',
              index === 0 && income > 0 && 'text-positive',
            )}
          >
            {result ? cell.value : <Skeleton className="h-7 w-32" />}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function TransactionRow({
  transaction,
  canEdit,
  showFund,
  onView,
  onEdit,
  onDelete,
}: {
  transaction: FinanceTransaction
  canEdit: boolean
  showFund: boolean
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const income = transaction.type === 'INCOME'
  const details = [
    showFund && transaction.fund_code,
    transaction.budget_code && `${transaction.budget_code} ${transaction.budget_name}`,
    transaction.created_by_name,
  ].filter(Boolean)

  return (
    <tr className="border-t border-rule align-top">
      <td className="hidden py-3 pl-4 whitespace-nowrap tabular-nums sm:table-cell">
        {formatDate(transaction.transaction_date)}
      </td>
      <td className="py-3 pr-4 pl-4 sm:pl-0">
        <button
          type="button"
          onClick={onView}
          className={cn(
            'block max-w-full text-left font-medium underline-offset-4 hover:underline sm:truncate',
            !transaction.description && 'text-muted-foreground',
          )}
        >
          {transaction.description ??
            `${TRANSACTION_TYPE_LABELS[transaction.type]} tanpa keterangan`}
        </button>
        <p className="mt-0.5 truncate text-[0.8125rem] text-muted-foreground">
          <span className="tabular-nums sm:hidden">
            {transaction.receipt_url && (
              <>
                <Paperclip
                  className="mr-1 inline size-3.5 align-[-0.125em] text-foreground"
                  aria-hidden="true"
                />
                <span className="sr-only">Berkuitansi, </span>
              </>
            )}
            {formatDate(transaction.transaction_date)}
            {details.length > 0 && ' · '}
          </span>
          {details.join(' · ')}
        </p>
      </td>
      <td className="hidden py-3 sm:table-cell">
        {transaction.receipt_url ? (
          <a
            href={transaction.receipt_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex size-6 items-center justify-center rounded-md text-foreground hover:bg-muted"
            title="Buka kuitansi"
          >
            <Paperclip className="size-4" aria-hidden="true" />
            <span className="sr-only">Buka kuitansi (tab baru)</span>
          </a>
        ) : (
          <span className="text-muted-foreground">
            —<span className="sr-only">Belum ada kuitansi</span>
          </span>
        )}
      </td>
      <td
        className={cn(
          'py-3 pr-4 text-right font-medium whitespace-nowrap tabular-nums',
          income && 'text-positive',
        )}
      >
        {signedAmount(transaction.type, transaction.amount)}
      </td>
      {canEdit && (
        <td className="py-2 pr-2 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-10 sm:size-8">
                <EllipsisVertical />
                <span className="sr-only">
                  Tindakan untuk {TRANSACTION_TYPE_LABELS[transaction.type].toLowerCase()}{' '}
                  {formatRupiah(transaction.amount)}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={onView}>
                <Eye />
                Lihat rincian
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil />
                Ubah transaksi
              </DropdownMenuItem>
              {transaction.receipt_url && (
                <DropdownMenuItem asChild>
                  <a href={transaction.receipt_url} target="_blank" rel="noreferrer">
                    <FileText />
                    Buka kuitansi
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 />
                Hapus transaksi
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      )}
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
      <td className="hidden py-3 pl-4 sm:table-cell">
        <Skeleton className="h-5 w-24" />
      </td>
      <td className="py-3 pr-4 pl-4 sm:pl-0">
        <Skeleton className="h-5 w-56 max-w-full" />
        <Skeleton className="mt-1.5 h-4 w-40 max-w-full" />
      </td>
      <td className="hidden py-3 sm:table-cell">
        <Skeleton className="size-5" />
      </td>
      <td className="py-3 pr-4">
        <Skeleton className="ml-auto h-5 w-24" />
      </td>
      {withMenu && <td />}
    </tr>
  )
}
