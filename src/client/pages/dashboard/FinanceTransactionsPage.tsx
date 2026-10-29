import { useRef, useState } from 'react'
import { EllipsisVertical, Eye, FileText, Paperclip, Pencil, Plus, Trash2, X } from 'lucide-react'
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
import { Segmented } from '@/components/zenith/segmented'
import { StatStrip } from '@/components/zenith/stat-strip'
import { StatusBadge } from '@/components/zenith/status-badge'
import { api } from '@/lib/api'
import { FINANCE_WRITERS, monthLabel, monthRange, recentMonths, signedAmount } from '@/lib/finance'
import { formatDate } from '@/lib/format'
import { useCan, useCurrentUser } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const PER_PAGE = 50

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

// Transaksi kas masuk dan keluar per bulan, dengan bukti kuitansinya. Bendahara dan
// Admin mencatat, mengubah, dan menghapus; Pendeta dan Majelis hanya melihat.
// Filter disimpan di URL; tanpa `month` yang ditampilkan bulan berjalan. Pola Zenith
// Orders: deret jumlah di atas, jenis bersegmen dan filter di bilah alat tabel.
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
      <PageHeader
        title="Transaksi Kas"
        description={
          missingCount !== undefined && result ? (
            <span className="tabular-nums">
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
            </span>
          ) : (
            <span className="inline-block h-4 w-72 max-w-full animate-pulse rounded-md bg-muted align-middle" />
          )
        }
        actions={
          canEdit &&
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
          ))
        }
      />

      <Totals result={result} label={`Jumlah transaksi ${periodPhrase}`} />

      <TableCard
        aria-label="Daftar transaksi kas"
        toolbar={
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented
                label="Jenis transaksi"
                value={type || 'ALL'}
                onChange={(value) => update({ type: value === 'ALL' ? '' : value })}
                options={[
                  { value: 'ALL', label: 'Semua' },
                  { value: 'INCOME', label: TRANSACTION_TYPE_LABELS.INCOME },
                  { value: 'EXPENSE', label: TRANSACTION_TYPE_LABELS.EXPENSE },
                ]}
              />
              <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
                {result ? `${total.toLocaleString('id-ID')} transaksi` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SearchField
                value={search}
                onChange={handleSearch}
                label="Cari transaksi"
                placeholder="Cari keterangan transaksi"
              />
              <div
                role="group"
                aria-label="Filter"
                className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap"
              >
                <select
                  aria-label="Bulan"
                  value={month || 'all'}
                  onChange={(event) =>
                    update({ month: event.target.value === thisMonth ? '' : event.target.value })
                  }
                  className={cn(selectClass, 'col-span-2 sm:col-span-1')}
                >
                  {months.map((option) => (
                    <option key={option} value={option}>
                      {monthLabel(option)}
                    </option>
                  ))}
                  <option value="all">Semua bulan</option>
                </select>
                <select
                  aria-label="Pos Kas"
                  value={fundId}
                  disabled={!funds.data}
                  onChange={(event) => update({ fund_id: event.target.value, budget_id: '' })}
                  className={cn(selectClass, 'sm:max-w-56')}
                >
                  <option value="">Semua Pos Kas</option>
                  {fundList.map((fund) => (
                    <option key={fund.id} value={fund.id}>
                      {fund.code} · {fund.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Kuitansi"
                  value={receipt}
                  onChange={(event) => update({ receipt: event.target.value })}
                  className={selectClass}
                >
                  <option value="">Kuitansi: semua</option>
                  <option value="with">Sudah berkuitansi</option>
                  <option value="without">Belum berkuitansi</option>
                </select>
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
              {(filtered || monthParam) && (
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() =>
                    clearSearch({ month: '', fund_id: '', budget_id: '', type: '', receipt: '' })
                  }
                >
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
              label="Halaman daftar transaksi"
              page={page}
              perPage={PER_PAGE}
              total={total}
              unit="transaksi"
              onPage={(next) => update({ page: String(next) })}
            />
          )
        }
      >
        <Table className="table-fixed" aria-busy={transactions.loading}>
          <caption className="sr-only">
            Transaksi kas {periodPhrase}
            {selectedFund ? `, ${selectedFund.name}` : ''}
          </caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="hidden w-32 sm:table-cell">Tanggal</TableHead>
              <TableHead>Uraian</TableHead>
              <TableHead className="hidden w-28 md:table-cell">Kuitansi</TableHead>
              <TableHead className="w-32 pl-2 text-right sm:w-40 sm:pl-4">Nominal</TableHead>
              {canEdit && (
                <TableHead className="w-12">
                  <span className="sr-only">Tindakan</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody
            className={cn('transition-opacity', transactions.loading && result && 'opacity-60')}
          >
            {transactions.error && (
              <TableMessage colSpan={colSpan}>
                Transaksi tidak dapat dimuat: {transactions.error}{' '}
                <button
                  type="button"
                  onClick={transactions.reload}
                  className="font-medium underline"
                >
                  Coba lagi
                </button>
              </TableMessage>
            )}
            {!result && !transactions.error && (
              <SkeletonRows
                rows={8}
                cells={[
                  'hidden sm:table-cell',
                  '',
                  'hidden md:table-cell',
                  '',
                  ...(canEdit ? [''] : []),
                ]}
              />
            )}
            {result && !transactions.error && items.length === 0 && (
              <TableMessage colSpan={colSpan}>
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
              </TableMessage>
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
          </TableBody>
        </Table>
      </TableCard>

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
// halaman ini), sebagai deret angka di atas tabel.
function Totals({ result, label }: { result: FinanceTransactionPage | undefined; label: string }) {
  const income = result?.totals.income ?? 0
  const expense = result?.totals.expense ?? 0
  const net = income - expense
  const loading = (
    <span className="inline-block h-6 w-32 animate-pulse rounded-md bg-muted align-middle" />
  )
  return (
    <StatStrip
      label={label}
      stats={[
        {
          label: 'Kas masuk',
          value: result ? (income > 0 ? `+${formatRupiah(income)}` : formatRupiah(0)) : loading,
          className: income > 0 ? 'text-positive' : undefined,
        },
        {
          label: 'Kas keluar',
          value: result ? (expense > 0 ? `−${formatRupiah(expense)}` : formatRupiah(0)) : loading,
        },
        {
          label: 'Selisih',
          value: result
            ? `${net > 0 ? '+' : net < 0 ? '−' : ''}${formatRupiah(Math.abs(net))}`
            : loading,
        },
      ]}
    />
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
    <TableRow className="[&>td]:align-top">
      <TableCell className="hidden whitespace-nowrap tabular-nums sm:table-cell">
        {formatDate(transaction.transaction_date)}
      </TableCell>
      <TableCell className="pr-2 sm:pr-4">
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
        {/* Di bawah 1024 px baris ini boleh membungkus agar Pos Kas dan mata anggaran terbaca utuh. */}
        <p className="mt-0.5 text-[0.8125rem] break-words whitespace-normal text-muted-foreground lg:truncate">
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
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {transaction.receipt_url ? (
          <a
            href={transaction.receipt_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium underline-offset-4 hover:underline"
          >
            <Paperclip className="size-3.5" aria-hidden="true" />
            Buka
            <span className="sr-only">kuitansi (tab baru)</span>
          </a>
        ) : (
          <StatusBadge>Belum ada</StatusBadge>
        )}
      </TableCell>
      <TableCell
        className={cn(
          'pl-2 text-right font-medium whitespace-nowrap tabular-nums sm:pl-4',
          income && 'text-positive',
        )}
      >
        {signedAmount(transaction.type, transaction.amount)}
      </TableCell>
      {canEdit && (
        <TableCell className="py-1.5 pr-2 pl-0 text-right">
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
        </TableCell>
      )}
    </TableRow>
  )
}
