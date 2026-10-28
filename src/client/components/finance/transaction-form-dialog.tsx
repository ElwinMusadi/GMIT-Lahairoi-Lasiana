import { useState, type FormEvent } from 'react'
import type { FieldErrors } from '@shared/accounts'
import { witaToday } from '@shared/dates'
import { parseTransactionInput } from '@shared/finance'
import {
  TRANSACTION_TYPE_LABELS,
  type FinanceBudget,
  type FinanceFund,
  type FinanceTransaction,
  type FinanceTransactionResponse,
  type FinanceType,
} from '@shared/types'
import { FieldError, FieldHint } from '@/components/form-parts'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, api, errorMessage } from '@/lib/api'
import { describedBy, inputClass, selectClass } from '@/lib/form'
import { RupiahInput, SegmentedChoice } from './money-fields'
import { ReceiptField } from './receipt'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Kosong berarti mencatat transaksi baru.
  transaction?: FinanceTransaction
  funds: FinanceFund[]
  budgets: FinanceBudget[]
  // Pos Kas yang sedang disaring di halaman, sebagai isian awal.
  defaultFundId?: number
  onSaved: (result: FinanceTransactionResponse, created: boolean) => void
}

const TYPE_OPTIONS = (['INCOME', 'EXPENSE'] as const).map((value) => ({
  value,
  label: TRANSACTION_TYPE_LABELS[value],
}))

const FIELD_ORDER = ['type', 'transaction_date', 'fund_id', 'budget_id', 'amount', 'description']

export function TransactionFormDialog({ open, onOpenChange, transaction, ...props }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Ubah transaksi' : 'Catat transaksi'}</DialogTitle>
          <DialogDescription>
            Saldo Pos Kas dan realisasi mata anggaran ikut diperbarui saat transaksi disimpan.
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          transaction={transaction}
          onCancel={() => onOpenChange(false)}
          {...props}
        />
      </DialogContent>
    </Dialog>
  )
}

function TransactionForm({
  transaction,
  funds,
  budgets,
  defaultFundId,
  onCancel,
  onSaved,
}: Omit<Props, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const [today] = useState(witaToday)
  const [type, setType] = useState<FinanceType>(transaction?.type ?? 'INCOME')
  const [date, setDate] = useState(transaction?.transaction_date ?? today)
  const [fundId, setFundId] = useState(String(transaction?.fund_id ?? defaultFundId ?? ''))
  const [budgetId, setBudgetId] = useState(String(transaction?.budget_id ?? ''))
  const [amount, setAmount] = useState<number | null>(transaction?.amount ?? null)
  const [receipt, setReceipt] = useState<string | null>(transaction?.receipt_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fundOptions = funds.filter((fund) => fund.is_active || fund.id === transaction?.fund_id)
  // Mata anggaran yang cocok: Pos Kas, jenis, dan tahun anggaran yang sama.
  const year = Number(date.slice(0, 4))
  const budgetOptions = budgets.filter(
    (budget) =>
      budget.fund_id === Number(fundId) &&
      budget.type === type &&
      budget.fiscal_year === year &&
      (budget.is_active || budget.id === transaction?.budget_id),
  )
  const budgetValue = budgetOptions.some((budget) => String(budget.id) === budgetId) ? budgetId : ''

  function clearError(...fields: string[]) {
    if (!fields.some((field) => errors[field])) return
    const next = { ...errors }
    for (const field of fields) delete next[field]
    setErrors(next)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const body = {
      type,
      transaction_date: date,
      fund_id: Number(fundId) || null,
      budget_id: budgetValue ? Number(budgetValue) : null,
      amount,
      description: String(form.get('description') ?? ''),
      receipt_url: receipt,
    }
    const { details } = parseTransactionInput(body, 'create', today)
    setErrors(details)
    setFormError(null)
    if (Object.keys(details).length > 0) {
      const first = FIELD_ORDER.find((key) => details[key])
      if (first) document.getElementById(first)?.focus()
      return
    }

    setSubmitting(true)
    try {
      const result = transaction
        ? await api.put<FinanceTransactionResponse>(`/finance/transactions/${transaction.id}`, body)
        : await api.post<FinanceTransactionResponse>('/finance/transactions', body)
      onSaved(result, !transaction)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.details).length > 0) setErrors(err.details)
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-5">
      <SegmentedChoice
        name="type"
        legend="Jenis"
        options={TYPE_OPTIONS}
        value={type}
        onChange={(next) => {
          setType(next)
          clearError('type', 'budget_id')
        }}
        error={<FieldError id="type-error" messages={errors.type} />}
      />
      <div className="grid gap-x-3 gap-y-5 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <Label htmlFor="transaction_date">Tanggal</Label>
          <Input
            id="transaction_date"
            type="date"
            max={today}
            value={date}
            onChange={(event) => {
              setDate(event.target.value)
              clearError('transaction_date', 'budget_id')
            }}
            aria-invalid={Boolean(errors.transaction_date)}
            aria-describedby={describedBy(errors, 'transaction_date')}
            className={inputClass}
          />
          <FieldError id="transaction_date-error" messages={errors.transaction_date} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="amount">Nominal</Label>
          <RupiahInput
            id="amount"
            value={amount}
            onChange={(next) => {
              setAmount(next)
              clearError('amount')
            }}
            invalid={Boolean(errors.amount)}
            describedBy={describedBy(errors, 'amount')}
          />
          <FieldError id="amount-error" messages={errors.amount} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="fund_id">Pos Kas</Label>
        <select
          id="fund_id"
          value={fundId}
          onChange={(event) => {
            setFundId(event.target.value)
            clearError('fund_id', 'budget_id')
          }}
          aria-invalid={Boolean(errors.fund_id)}
          aria-describedby={describedBy(errors, 'fund_id')}
          className={selectClass}
        >
          <option value="">Pilih Pos Kas</option>
          {fundOptions.map((fund) => (
            <option key={fund.id} value={fund.id}>
              {fund.code} · {fund.name}
            </option>
          ))}
        </select>
        <FieldError id="fund_id-error" messages={errors.fund_id} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="budget_id">Mata anggaran {year > 1999 ? year : ''}</Label>
        <select
          id="budget_id"
          value={budgetValue}
          onChange={(event) => {
            setBudgetId(event.target.value)
            clearError('budget_id')
          }}
          disabled={!fundId}
          aria-invalid={Boolean(errors.budget_id)}
          aria-describedby={describedBy(errors, 'budget_id', 'budget_id-hint')}
          className={selectClass}
        >
          <option value="">Tanpa mata anggaran</option>
          {budgetOptions.map((budget) => (
            <option key={budget.id} value={budget.id}>
              {budget.account_code} · {budget.account_name}
            </option>
          ))}
        </select>
        <FieldHint id="budget_id-hint">
          {fundId && budgetOptions.length === 0
            ? `Belum ada mata anggaran ${type === 'INCOME' ? 'penerimaan' : 'pengeluaran'} ${year} di Pos Kas ini.`
            : 'Hanya mata anggaran dengan Pos Kas, jenis, dan tahun yang sama.'}
        </FieldHint>
        <FieldError id="budget_id-error" messages={errors.budget_id} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Keterangan</Label>
        <Input
          id="description"
          name="description"
          defaultValue={transaction?.description ?? ''}
          placeholder="mis. Kolekte Ibadah Minggu pagi"
          autoComplete="off"
          aria-invalid={Boolean(errors.description)}
          aria-describedby={describedBy(errors, 'description')}
          className={inputClass}
        />
        <FieldError id="description-error" messages={errors.description} />
      </div>
      <ReceiptField
        value={receipt}
        onChange={(url) => {
          setReceipt(url)
          clearError('receipt_url')
        }}
        onBusyChange={setUploading}
        error={errors.receipt_url?.[0]}
      />

      <div role="alert" aria-live="assertive">
        {formError && <p className="text-sm text-destructive">{formError}</p>}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" size="lg" disabled={submitting || uploading}>
          {submitting
            ? 'Menyimpan…'
            : uploading
              ? 'Menunggu unggahan…'
              : transaction
                ? 'Simpan perubahan'
                : `Simpan ${TRANSACTION_TYPE_LABELS[type].toLowerCase()}`}
        </Button>
      </DialogFooter>
    </form>
  )
}
