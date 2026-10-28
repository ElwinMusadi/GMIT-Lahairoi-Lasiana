import { useState, type FormEvent } from 'react'
import type { FieldErrors } from '@shared/accounts'
import { parseReturnInput } from '@shared/assets'
import { witaToday } from '@shared/dates'
import {
  ASSET_CONDITIONS,
  ASSET_CONDITION_LABELS,
  type AssetCondition,
  type AssetLoan,
  type AssetLoanResponse,
} from '@shared/types'
import { FieldError } from '@/components/form-parts'
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
import { loanTitle } from '@/lib/assets'
import { describedBy, inputClass, selectClass, textareaClass } from '@/lib/form'
import { formatDate } from '@/lib/format'

type Props = {
  // Peminjaman yang dikembalikan; null berarti dialog tertutup.
  loan: AssetLoan | null
  onClose: () => void
  onReturned: (result: AssetLoanResponse) => void
}

// Konfirmasi pengembalian barang: status menjadi Sudah dikembalikan dan unitnya kembali
// tersedia untuk dipinjam.
export function ReturnDialog({ loan, onClose, onReturned }: Props) {
  return (
    <Dialog open={loan !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        {loan && (
          <>
            <DialogHeader>
              <DialogTitle>Konfirmasi pengembalian</DialogTitle>
              <DialogDescription>
                {loanTitle(loan)} oleh {loan.borrower_name}
                {loan.rayon_name && ` (Rayon ${loan.rayon_name})`}, dipinjam{' '}
                {formatDate(loan.borrow_date)}.{' '}
                {loan.status === 'OVERDUE' ? (
                  <span className="font-medium text-negative-ink">
                    Terlambat {loan.days_overdue} hari dari batas {formatDate(loan.due_date)}.
                  </span>
                ) : (
                  `Batas kembali ${formatDate(loan.due_date)}.`
                )}
              </DialogDescription>
            </DialogHeader>
            <ReturnForm key={loan.id} loan={loan} onCancel={onClose} onReturned={onReturned} />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ReturnForm({
  loan,
  onCancel,
  onReturned,
}: {
  loan: AssetLoan
  onCancel: () => void
  onReturned: Props['onReturned']
}) {
  const [today] = useState(witaToday)
  const [date, setDate] = useState(today)
  const [condition, setCondition] = useState<AssetCondition>('GOOD')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body: Record<string, unknown> = { return_date: date, return_condition: condition }
    // Catatan pengembalian ditambahkan di bawah keperluan peminjaman, bukan menggantinya.
    const trimmed = note.trim()
    if (trimmed) body.notes = loan.notes ? `${loan.notes}\nSaat kembali: ${trimmed}` : trimmed
    const { details } = parseReturnInput(body, today)
    if (!details.return_date && date < loan.borrow_date) {
      details.return_date = ['Tanggal kembali tidak boleh sebelum tanggal pinjam.']
    }
    setErrors(details)
    setFormError(null)
    if (Object.keys(details).length > 0) {
      document.getElementById(details.return_date ? 'return_date' : 'return_note')?.focus()
      return
    }

    setSubmitting(true)
    try {
      onReturned(await api.patch<AssetLoanResponse>(`/asset-loans/${loan.id}/return`, body))
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.details).length > 0) setErrors(err.details)
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-x-3 gap-y-5 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <Label htmlFor="return_date">Tanggal kembali</Label>
          <Input
            id="return_date"
            type="date"
            min={loan.borrow_date}
            max={today}
            value={date}
            onChange={(event) => {
              setDate(event.target.value)
              setErrors({})
            }}
            aria-invalid={Boolean(errors.return_date)}
            aria-describedby={describedBy(errors, 'return_date')}
            className={inputClass}
          />
          <FieldError id="return_date-error" messages={errors.return_date} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="return_condition">Kondisi saat kembali</Label>
          <select
            id="return_condition"
            value={condition}
            onChange={(event) => setCondition(event.target.value as AssetCondition)}
            aria-invalid={Boolean(errors.return_condition)}
            aria-describedby={describedBy(errors, 'return_condition')}
            className={selectClass}
          >
            {ASSET_CONDITIONS.map((option) => (
              <option key={option} value={option}>
                {ASSET_CONDITION_LABELS[option]}
              </option>
            ))}
          </select>
          <FieldError id="return_condition-error" messages={errors.return_condition} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="return_note">Catatan pengembalian</Label>
        <textarea
          id="return_note"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={
            condition === 'GOOD' ? 'Opsional' : 'mis. 2 kursi retak di kaki, sudah dipisahkan'
          }
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={describedBy(errors, 'notes')}
          className={textareaClass}
        />
        <FieldError id="notes-error" messages={errors.notes} />
      </div>

      <div role="alert" aria-live="assertive">
        {formError && <p className="text-sm text-destructive">{formError}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting
            ? 'Menyimpan…'
            : `Terima ${loan.quantity_borrowed.toLocaleString('id-ID')} unit kembali`}
        </Button>
      </DialogFooter>
    </form>
  )
}
