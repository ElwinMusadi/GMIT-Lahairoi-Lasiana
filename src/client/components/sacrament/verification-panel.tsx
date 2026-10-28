import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { FieldErrors } from '@shared/accounts'
import { witaToday } from '@shared/dates'
import {
  SACRAMENT_PREFIX,
  parseStatusInput,
  statusProblems,
  type StatusFields,
} from '@shared/sacraments'
import {
  SACRAMENT_STATUSES,
  SACRAMENT_STATUS_LABELS,
  type SacramentDetail,
  type SacramentResponse,
  type SacramentStatus,
} from '@shared/types'
import { ConfirmDialog, type Confirmation } from '@/components/confirm-dialog'
import { FieldError, FieldHint } from '@/components/form-parts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, api, errorMessage } from '@/lib/api'
import { describedBy, inputClass, textareaClass } from '@/lib/form'
import { STATUS_HINTS } from '@/lib/sacrament-admin'
import { cn } from '@/lib/utils'
import { MemberPicker, type PickedMember } from './member-picker'

type FormState = {
  status: SacramentStatus
  notes: string
  counseling_date: string
  counseling_time: string
  scheduled_date: string
  scheduled_time: string
  officiating_pastor: string
  certificate_number: string
  member: PickedMember | null
  partner: PickedMember | null
}

function initialState(application: SacramentDetail): FormState {
  return {
    status: application.status,
    notes: application.notes ?? '',
    counseling_date: application.counseling_date ?? '',
    counseling_time: application.counseling_time ?? '',
    scheduled_date: application.scheduled_date ?? '',
    scheduled_time: application.scheduled_time ?? '',
    officiating_pastor: application.officiating_pastor ?? '',
    certificate_number: application.certificate_number ?? '',
    member:
      application.member_id !== null
        ? { id: application.member_id, name: application.member_name ?? 'Anggota terhapus' }
        : null,
    partner:
      application.partner_member_id !== null
        ? {
            id: application.partner_member_id,
            name: application.partner_name ?? 'Anggota terhapus',
          }
        : null,
  }
}

function toBody(state: FormState) {
  return {
    status: state.status,
    notes: state.notes,
    counseling_date: state.counseling_date || null,
    counseling_time: state.counseling_time || null,
    scheduled_date: state.scheduled_date || null,
    scheduled_time: state.scheduled_time || null,
    officiating_pastor: state.officiating_pastor,
    certificate_number: state.status === 'COMPLETED' ? state.certificate_number : null,
    member_id: state.member?.id ?? null,
    partner_member_id: state.partner?.id ?? null,
  }
}

// Panel verifikasi pastoral: status, catatan untuk pendaftar, jadwal konseling dan
// pelaksanaan, tautan anggota jemaat, dan nomor register saat Selesai. Aturannya sama
// dengan PATCH /api/sacraments/:id/status.
export function VerificationPanel({
  application,
  onSaved,
}: {
  application: SacramentDetail
  onSaved: (result: SacramentResponse) => void
}) {
  const [today] = useState(witaToday)
  const [state, setState] = useState(() => initialState(application))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const marriage = application.type === 'MARRIAGE'

  const status = state.status
  const showCounseling = status === 'COUNSELING' || Boolean(state.counseling_date)
  const showSchedule =
    status === 'APPROVED' || status === 'COMPLETED' || Boolean(state.scheduled_date)
  const completing = status === 'COMPLETED'
  const showMembers = completing || state.member !== null || state.partner !== null

  function set<K extends keyof FormState>(key: K, value: FormState[K], field: string = key) {
    setState((previous) => ({ ...previous, [key]: value }))
    if (errors[field]) {
      setErrors((previous) => {
        const next = { ...previous }
        delete next[field]
        return next
      })
    }
  }

  async function save() {
    setSubmitting(true)
    setFormError(null)
    try {
      const result = await api.patch<SacramentResponse>(
        `/sacraments/${application.id}/status`,
        toBody(state),
      )
      const saved = result.application
      if (saved.status === 'COMPLETED') {
        toast.success(`Tercatat di buku induk: ${saved.certificate_number}`, {
          description:
            result.member_updates.length > 0
              ? result.member_updates
                  .map((update) => `${update.full_name} — ${update.change}`)
                  .join('\n')
              : 'Tidak ada anggota jemaat yang ditautkan.',
          duration: 10_000,
        })
      } else {
        toast.success(`Status diperbarui: ${SACRAMENT_STATUS_LABELS[saved.status]}`)
      }
      onSaved(result)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.details).length > 0) setErrors(err.details)
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = toBody(state)
    // Pemeriksaan yang sama dengan API, sebelum dikirim.
    const { input, details } = parseStatusInput(body)
    if (Object.keys(details).length === 0) {
      Object.assign(details, statusProblems(application.type, input as StatusFields, today))
    }
    setErrors(details)
    if (Object.keys(details).length > 0) {
      setFormError('Periksa kembali isian yang ditandai.')
      const first = Object.keys(details)[0]
      document.getElementById(`verifikasi-${first}`)?.focus()
      return
    }
    if (!completing) {
      void save()
      return
    }
    const linked = [state.member?.name, state.partner?.name].filter(Boolean)
    setConfirmation({
      title: 'Selesaikan dan catat di buku induk?',
      description: (
        <>
          Pendaftaran tercatat dengan nomor register{' '}
          <strong>{state.certificate_number.trim() || 'otomatis'}</strong>
          {linked.length > 0
            ? `, dan data jemaat ${linked.join(' & ')} diperbarui.`
            : '. Tidak ada anggota jemaat yang ditautkan, jadi data jemaat tidak berubah.'}{' '}
          Setelah Selesai, pendaftaran ini tidak dapat diubah lagi.
        </>
      ),
      confirmLabel: 'Selesaikan',
      onConfirm: save,
    })
  }

  const required = {
    notes: status === 'REVISION',
    counseling_date: status === 'COUNSELING',
    scheduled_date: status === 'APPROVED' || completing,
    officiating_pastor: completing,
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-5">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Status</legend>
        {SACRAMENT_STATUSES.map((value) => (
          <label
            key={value}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5',
              'has-checked:border-foreground has-checked:ring-1 has-checked:ring-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
            )}
          >
            <input
              type="radio"
              id={value === SACRAMENT_STATUSES[0] ? 'verifikasi-status' : undefined}
              name="status"
              value={value}
              checked={status === value}
              onChange={() => set('status', value)}
              className="mt-1 size-4 accent-foreground"
            />
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">{SACRAMENT_STATUS_LABELS[value]}</span>
              <span className="text-[0.8125rem] text-muted-foreground">{STATUS_HINTS[value]}</span>
            </span>
          </label>
        ))}
        <FieldError id="status-error" messages={errors.status} />
      </fieldset>

      <Field id="notes" label="Catatan untuk pendaftar" required={required.notes} errors={errors}>
        <textarea
          id="verifikasi-notes"
          rows={3}
          value={state.notes}
          onChange={(event) => set('notes', event.target.value)}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={describedBy(errors, 'notes', 'notes-hint')}
          className={textareaClass}
        />
        <FieldHint id="notes-hint">Tampil di halaman Cek Status pendaftar.</FieldHint>
      </Field>

      {showCounseling && (
        <DateTime
          prefix="counseling"
          label="Jadwal konseling/penggembalaan"
          required={required.counseling_date}
          date={state.counseling_date}
          time={state.counseling_time}
          errors={errors}
          onDate={(value) => set('counseling_date', value)}
          onTime={(value) => set('counseling_time', value)}
        />
      )}

      {showSchedule && (
        <>
          <DateTime
            prefix="scheduled"
            label="Jadwal pelaksanaan"
            required={required.scheduled_date}
            date={state.scheduled_date}
            time={state.scheduled_time}
            errors={errors}
            onDate={(value) => set('scheduled_date', value)}
            onTime={(value) => set('scheduled_time', value)}
            max={completing ? today : undefined}
          />
          <Field
            id="officiating_pastor"
            label="Pendeta yang melayani"
            required={required.officiating_pastor}
            errors={errors}
          >
            <Input
              id="verifikasi-officiating_pastor"
              value={state.officiating_pastor}
              onChange={(event) => set('officiating_pastor', event.target.value)}
              placeholder="mis. Pdt. Agustina Riwu Kaho, S.Th."
              autoComplete="off"
              aria-invalid={Boolean(errors.officiating_pastor)}
              aria-describedby={describedBy(errors, 'officiating_pastor')}
              className={inputClass}
            />
          </Field>
        </>
      )}

      {showMembers && (
        <div className="grid gap-4 border-t border-rule pt-5">
          <p className="text-[0.8125rem] text-muted-foreground">
            Tautkan ke data jemaat agar status{' '}
            {marriage ? 'nikah kedua mempelai' : application.type === 'SIDI' ? 'sidi' : 'baptis'}{' '}
            diperbarui otomatis saat Selesai. Boleh dikosongkan untuk pendaftar dari jemaat lain.
          </p>
          <MemberPicker
            id="verifikasi-member_id"
            label={marriage ? 'Mempelai pria (data jemaat)' : 'Anggota jemaat'}
            type={application.type}
            value={state.member}
            initialQuery={String(
              application.form_data[marriage ? 'groom_name' : 'full_name'] ?? '',
            )}
            onChange={(member) => set('member', member, 'member_id')}
            error={errors.member_id?.[0]}
          />
          {marriage && (
            <MemberPicker
              id="verifikasi-partner_member_id"
              label="Mempelai wanita (data jemaat)"
              type={application.type}
              value={state.partner}
              initialQuery={String(application.form_data.bride_name ?? '')}
              onChange={(member) => set('partner', member, 'partner_member_id')}
              error={errors.partner_member_id?.[0]}
            />
          )}
        </div>
      )}

      {completing && (
        <Field id="certificate_number" label="Nomor register" errors={errors}>
          <Input
            id="verifikasi-certificate_number"
            value={state.certificate_number}
            onChange={(event) => set('certificate_number', event.target.value)}
            placeholder={`Otomatis, mis. ${SACRAMENT_PREFIX[application.type]}-${(state.scheduled_date || today).slice(0, 4)}-001`}
            autoComplete="off"
            aria-invalid={Boolean(errors.certificate_number)}
            aria-describedby={describedBy(errors, 'certificate_number', 'certificate_number-hint')}
            className={cn(inputClass, 'font-mono')}
          />
          <FieldHint id="certificate_number-hint">
            Kosongkan untuk nomor berurutan otomatis, atau isi sesuai buku induk lama.
          </FieldHint>
        </Field>
      )}

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <Button type="submit" size="lg" disabled={submitting}>
        {submitting
          ? 'Menyimpan…'
          : completing
            ? 'Selesaikan & catat di buku induk'
            : 'Simpan status'}
      </Button>
      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </form>
  )
}

function Field({
  id,
  label,
  required = false,
  errors,
  children,
}: {
  id: string
  label: string
  required?: boolean
  errors: FieldErrors
  children: ReactNode
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={`verifikasi-${id}`}>
        {label}
        {required && <span className="text-muted-foreground"> (wajib)</span>}
      </Label>
      {children}
      <FieldError id={`${id}-error`} messages={errors[id]} />
    </div>
  )
}

function DateTime({
  prefix,
  label,
  required,
  date,
  time,
  errors,
  onDate,
  onTime,
  max,
}: {
  prefix: 'counseling' | 'scheduled'
  label: string
  required: boolean
  date: string
  time: string
  errors: FieldErrors
  onDate: (value: string) => void
  onTime: (value: string) => void
  max?: string
}) {
  const dateKey = `${prefix}_date`
  const timeKey = `${prefix}_time`
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">
        {label}
        {required && <span className="text-muted-foreground"> (wajib)</span>}
      </legend>
      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2">
        <Input
          id={`verifikasi-${dateKey}`}
          type="date"
          aria-label={`Tanggal ${label.toLowerCase()}`}
          value={date}
          max={max}
          onChange={(event) => onDate(event.target.value)}
          aria-invalid={Boolean(errors[dateKey])}
          aria-describedby={describedBy(errors, dateKey)}
          className={inputClass}
        />
        <Input
          id={`verifikasi-${timeKey}`}
          type="time"
          aria-label={`Jam ${label.toLowerCase()}`}
          value={time}
          onChange={(event) => onTime(event.target.value)}
          aria-invalid={Boolean(errors[timeKey])}
          aria-describedby={describedBy(errors, timeKey)}
          className={inputClass}
        />
      </div>
      <FieldError id={`${dateKey}-error`} messages={errors[dateKey]} />
      <FieldError id={`${timeKey}-error`} messages={errors[timeKey]} />
    </fieldset>
  )
}
