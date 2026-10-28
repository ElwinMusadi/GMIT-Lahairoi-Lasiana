import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { FieldErrors } from '@shared/accounts'
import type { WorshipItem, WorshipResponse } from '@shared/types'
import {
  ATTENDANCE_FIELDS,
  ATTENDANCE_LABELS,
  parseAttendanceInput,
  type AttendanceField,
} from '@shared/worship'
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
import { formatLongDate } from '@/lib/finance'
import { describedBy, inputClass } from '@/lib/form'
import { cn } from '@/lib/utils'
import { worshipTime } from '@/lib/worship'

// Absensi setelah ibadah berlangsung: jumlah Pria, Wanita, dan Anak/Pemuda. Totalnya
// tampil langsung saat diketik; database menghitungnya lagi saat disimpan.
export function AttendanceDialog({
  worship,
  onClose,
  onSaved,
}: {
  worship: WorshipItem | null
  onClose: () => void
  onSaved: (worship: WorshipItem) => void
}) {
  return (
    <Dialog open={worship !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {worship && (
          <AttendanceForm key={worship.id} worship={worship} onCancel={onClose} onSaved={onSaved} />
        )}
      </DialogContent>
    </Dialog>
  )
}

type Values = Record<AttendanceField, string>

function AttendanceForm({
  worship,
  onCancel,
  onSaved,
}: {
  worship: WorshipItem
  onCancel: () => void
  onSaved: (worship: WorshipItem) => void
}) {
  const [values, setValues] = useState<Values>(
    () =>
      Object.fromEntries(
        ATTENDANCE_FIELDS.map((field) => [field, worship[field]?.toString() ?? '']),
      ) as Values,
  )
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const filled = ATTENDANCE_FIELDS.filter((field) => values[field] !== '')
  const total = filled.reduce((sum, field) => sum + Number(values[field]), 0)
  const recorded = worship.attendance_total !== null
  const time = worshipTime(worship.worship_time)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Kotak kosong berarti belum dihitung (null), bukan nol.
    const body = Object.fromEntries(
      ATTENDANCE_FIELDS.map((field) => [field, values[field] === '' ? null : values[field]]),
    )
    const { details } = parseAttendanceInput(body)
    setErrors(details)
    setFormError(null)
    if (Object.keys(details).length > 0) {
      document.getElementById(ATTENDANCE_FIELDS.find((field) => details[field]) ?? '')?.focus()
      return
    }

    setSubmitting(true)
    try {
      const result = await api.patch<WorshipResponse>(`/worships/${worship.id}/attendance`, body)
      const saved = result.worship
      toast.success(
        saved.attendance_total === null
          ? `Kehadiran “${saved.title}” dikosongkan.`
          : `Kehadiran “${saved.title}” tersimpan: ${saved.attendance_total.toLocaleString('id-ID')} orang.`,
      )
      onSaved(saved)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.details).length > 0) setErrors(err.details)
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>{recorded ? 'Ubah kehadiran' : 'Catat kehadiran'}</DialogTitle>
        <DialogDescription>
          {worship.title} · {formatLongDate(worship.worship_date, true)}
          {time && `, ${time} WITA`}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-3 gap-3">
        {ATTENDANCE_FIELDS.map((field) => (
          <div key={field} className="grid content-start gap-2">
            <Label htmlFor={field}>{ATTENDANCE_LABELS[field]}</Label>
            <Input
              id={field}
              inputMode="numeric"
              autoComplete="off"
              value={values[field]}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, '').slice(0, 5)
                setValues((previous) => ({ ...previous, [field]: digits }))
                if (errors[field]) {
                  setErrors((previous) => {
                    const next = { ...previous }
                    delete next[field]
                    return next
                  })
                }
              }}
              aria-invalid={Boolean(errors[field])}
              aria-describedby={describedBy(errors, field)}
              className={cn(inputClass, 'text-right tabular-nums')}
            />
          </div>
        ))}
        {ATTENDANCE_FIELDS.some((field) => errors[field]) && (
          <div className="col-span-full grid gap-1">
            {ATTENDANCE_FIELDS.map((field) => (
              <FieldError key={field} id={`${field}-error`} messages={errors[field]} />
            ))}
          </div>
        )}
      </div>

      <div
        className="flex items-baseline justify-between gap-3 border-t border-rule pt-4"
        aria-live="polite"
      >
        <span className="text-sm text-muted-foreground">Total kehadiran</span>
        <span className="text-2xl font-semibold tabular-nums">
          {filled.length > 0 ? total.toLocaleString('id-ID') : '—'}
        </span>
      </div>
      <p className="-mt-3 text-[0.8125rem] text-muted-foreground">
        Kotak yang dikosongkan berarti belum dihitung, bukan nol.
      </p>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Menyimpan…' : 'Simpan kehadiran'}
        </Button>
      </DialogFooter>
    </form>
  )
}
