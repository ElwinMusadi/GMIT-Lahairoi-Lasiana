import { useState, type FormEvent } from 'react'
import type { FieldErrors } from '@shared/accounts'
import { parseFundInput } from '@shared/finance'
import type { FinanceFund, FinanceFundResponse } from '@shared/types'
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
import { describedBy, inputClass } from '@/lib/form'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Kosong berarti menambah Pos Kas baru.
  fund?: FinanceFund
  onSaved: (result: FinanceFundResponse, created: boolean) => void
}

export function FundFormDialog({ open, onOpenChange, fund, onSaved }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{fund ? `Ubah Pos Kas ${fund.code}` : 'Tambah Pos Kas'}</DialogTitle>
          <DialogDescription>
            Saldo Pos Kas hanya berubah lewat transaksi. Catat saldo awal sebagai kas masuk.
          </DialogDescription>
        </DialogHeader>
        <FundForm fund={fund} onCancel={() => onOpenChange(false)} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  )
}

function FundForm({
  fund,
  onCancel,
  onSaved,
}: Pick<Props, 'fund' | 'onSaved'> & { onCancel: () => void }) {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const body: Record<string, unknown> = {
      code: String(form.get('code') ?? ''),
      name: String(form.get('name') ?? ''),
      description: String(form.get('description') ?? ''),
    }
    if (fund) body.is_active = form.get('is_active') === 'on'
    const { details } = parseFundInput(body, 'create')
    setErrors(details)
    setFormError(null)
    if (Object.keys(details).length > 0) {
      document.getElementById(details.code ? 'code' : 'name')?.focus()
      return
    }

    setSubmitting(true)
    try {
      const result = fund
        ? await api.put<FinanceFundResponse>(`/finance/funds/${fund.id}`, body)
        : await api.post<FinanceFundResponse>('/finance/funds', body)
      onSaved(result, !fund)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.details).length > 0) setErrors(err.details)
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-x-3 gap-y-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="grid content-start gap-2">
          <Label htmlFor="code">Kode</Label>
          <Input
            id="code"
            name="code"
            defaultValue={fund?.code}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.code)}
            aria-describedby={describedBy(errors, 'code', 'code-hint')}
            className={cn(inputClass, 'uppercase')}
          />
          <FieldHint id="code-hint">Mis. UMUM, DIAKONIA.</FieldHint>
          <FieldError id="code-error" messages={errors.code} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="name">Nama Pos Kas</Label>
          <Input
            id="name"
            name="name"
            defaultValue={fund?.name}
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy(errors, 'name')}
            className={inputClass}
          />
          <FieldError id="name-error" messages={errors.name} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Keterangan</Label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={fund?.description ?? ''}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={describedBy(errors, 'description')}
          className="rounded-lg border border-input bg-card px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
        />
        <FieldError id="description-error" messages={errors.description} />
      </div>
      {fund && (
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={fund.is_active}
            className="mt-0.5 size-4 accent-primary"
          />
          <span className="grid gap-0.5">
            Aktif
            <span className="text-[0.8125rem] text-muted-foreground">
              Pos Kas nonaktif tetap tampil beserta saldonya, tetapi tidak bisa dipakai untuk
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
          {submitting ? 'Menyimpan…' : fund ? 'Simpan perubahan' : 'Tambah Pos Kas'}
        </Button>
      </DialogFooter>
    </form>
  )
}
