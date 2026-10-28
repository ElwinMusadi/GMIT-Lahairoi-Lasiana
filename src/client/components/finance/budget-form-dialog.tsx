import { useState, type FormEvent } from 'react'
import type { FieldErrors } from '@shared/accounts'
import { parseBudgetInput } from '@shared/finance'
import {
  BUDGET_TYPE_LABELS,
  type FinanceBudget,
  type FinanceBudgetResponse,
  type FinanceFund,
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
import { cn } from '@/lib/utils'
import { RupiahInput, SegmentedChoice } from './money-fields'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Kosong berarti menambah mata anggaran baru.
  budget?: FinanceBudget
  funds: FinanceFund[]
  // Isian awal mata anggaran baru: tahun dan Pos Kas yang sedang dilihat.
  defaults: { fiscal_year: number; fund_id?: number; type?: FinanceType }
  onSaved: (result: FinanceBudgetResponse, created: boolean) => void
}

const TYPE_OPTIONS = (['INCOME', 'EXPENSE'] as const).map((value) => ({
  value,
  label: BUDGET_TYPE_LABELS[value],
}))

export function BudgetFormDialog({ open, onOpenChange, budget, ...props }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {budget ? `Ubah mata anggaran ${budget.account_code}` : 'Tambah mata anggaran'}
          </DialogTitle>
          <DialogDescription>
            Kode bebas ditentukan Bendahara, unik dalam satu tahun anggaran.
          </DialogDescription>
        </DialogHeader>
        <BudgetForm budget={budget} onCancel={() => onOpenChange(false)} {...props} />
      </DialogContent>
    </Dialog>
  )
}

function BudgetForm({
  budget,
  funds,
  defaults,
  onCancel,
  onSaved,
}: Omit<Props, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const [type, setType] = useState<FinanceType | ''>(budget?.type ?? defaults.type ?? '')
  const [target, setTarget] = useState<number | null>(budget?.target_amount ?? null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Pos Kas, jenis, dan tahun terkunci setelah mata anggaran dipakai transaksi.
  const locked = Boolean(budget && budget.realized_amount > 0)
  const fundOptions = funds.filter((fund) => fund.is_active || fund.id === budget?.fund_id)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const text = (name: string) => String(form.get(name) ?? '')
    const body: Record<string, unknown> = {
      account_code: text('account_code'),
      account_name: text('account_name'),
      target_amount: target ?? 0,
    }
    if (!locked) {
      body.fund_id = Number(text('fund_id')) || null
      body.fiscal_year = text('fiscal_year')
      body.type = type
    }
    if (budget) body.is_active = form.get('is_active') === 'on'

    const { details } = parseBudgetInput(
      locked
        ? {
            ...body,
            fund_id: budget?.fund_id,
            fiscal_year: budget?.fiscal_year,
            type: budget?.type,
          }
        : body,
      'create',
    )
    setErrors(details)
    setFormError(null)
    if (Object.keys(details).length > 0) {
      const first = [
        'fund_id',
        'fiscal_year',
        'type',
        'account_code',
        'account_name',
        'target_amount',
      ].find((key) => details[key])
      if (first) document.getElementById(first)?.focus()
      return
    }

    setSubmitting(true)
    try {
      const result = budget
        ? await api.put<FinanceBudgetResponse>(`/finance/budgets/${budget.id}`, body)
        : await api.post<FinanceBudgetResponse>('/finance/budgets', body)
      onSaved(result, !budget)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.details).length > 0) setErrors(err.details)
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-x-3 gap-y-5 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-2">
          <Label htmlFor="fund_id">Pos Kas</Label>
          <select
            id="fund_id"
            name="fund_id"
            defaultValue={budget?.fund_id ?? defaults.fund_id ?? ''}
            disabled={locked}
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
        <div className="grid content-start gap-2">
          <Label htmlFor="fiscal_year">Tahun anggaran</Label>
          <Input
            id="fiscal_year"
            name="fiscal_year"
            inputMode="numeric"
            defaultValue={budget?.fiscal_year ?? defaults.fiscal_year}
            disabled={locked}
            aria-invalid={Boolean(errors.fiscal_year)}
            aria-describedby={describedBy(errors, 'fiscal_year')}
            className={cn(inputClass, 'tabular-nums')}
          />
          <FieldError id="fiscal_year-error" messages={errors.fiscal_year} />
        </div>
      </div>
      <SegmentedChoice
        name="type"
        legend="Jenis"
        options={TYPE_OPTIONS}
        value={type}
        onChange={setType}
        disabled={locked}
        invalid={Boolean(errors.type)}
        hint={
          locked && (
            <FieldHint id="locked-hint">
              Pos Kas, tahun, dan jenis terkunci karena mata anggaran ini sudah dipakai transaksi.
            </FieldHint>
          )
        }
        error={<FieldError id="type-error" messages={errors.type} />}
      />
      <div className="grid gap-x-3 gap-y-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="grid content-start gap-2">
          <Label htmlFor="account_code">Kode</Label>
          <Input
            id="account_code"
            name="account_code"
            defaultValue={budget?.account_code}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.account_code)}
            aria-describedby={describedBy(errors, 'account_code', 'account_code-hint')}
            className={cn(inputClass, 'uppercase tabular-nums')}
          />
          <FieldHint id="account_code-hint">Mis. 4.1.01</FieldHint>
          <FieldError id="account_code-error" messages={errors.account_code} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="account_name">Nama mata anggaran</Label>
          <Input
            id="account_name"
            name="account_name"
            defaultValue={budget?.account_name}
            autoComplete="off"
            aria-invalid={Boolean(errors.account_name)}
            aria-describedby={describedBy(errors, 'account_name')}
            className={inputClass}
          />
          <FieldError id="account_name-error" messages={errors.account_name} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="target_amount">Target setahun</Label>
        <RupiahInput
          id="target_amount"
          value={target}
          onChange={setTarget}
          invalid={Boolean(errors.target_amount)}
          describedBy={describedBy(errors, 'target_amount', 'target_amount-hint')}
        />
        <FieldHint id="target_amount-hint">
          {type === 'EXPENSE'
            ? 'Batas pengeluaran setahun; realisasinya dihitung dari kas keluar pada mata anggaran ini.'
            : 'Target penerimaan setahun; realisasinya dihitung dari kas masuk pada mata anggaran ini.'}
        </FieldHint>
        <FieldError id="target_amount-error" messages={errors.target_amount} />
      </div>
      {budget && (
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={budget.is_active}
            className="mt-0.5 size-4 accent-primary"
          />
          <span className="grid gap-0.5">
            Aktif
            <span className="text-[0.8125rem] text-muted-foreground">
              Mata anggaran nonaktif tetap terhitung realisasinya, tetapi tidak bisa dipilih untuk
              transaksi baru.
            </span>
          </span>
        </label>
      )}

      <div role="alert" aria-live="assertive">
        {formError && <p className="text-sm text-destructive">{formError}</p>}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Menyimpan…' : budget ? 'Simpan perubahan' : 'Tambah mata anggaran'}
        </Button>
      </DialogFooter>
    </form>
  )
}
