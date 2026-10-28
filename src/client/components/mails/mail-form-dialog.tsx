import { useState, type FormEvent } from 'react'
import type { FieldErrors } from '@shared/accounts'
import { witaToday } from '@shared/dates'
import { parseMailInput } from '@shared/mails'
import {
  MAIL_CATEGORIES,
  MAIL_CATEGORY_LABELS,
  MAIL_DIRECTION_LABELS,
  type MailCategory,
  type MailDirection,
  type MailResponse,
} from '@shared/types'
import { SegmentedChoice } from '@/components/finance/money-fields'
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
import { UploadField } from '@/components/upload-field'
import { ApiError, api, errorMessage } from '@/lib/api'
import { describedBy, inputClass, selectClass } from '@/lib/form'

const DIRECTION_OPTIONS = (['INCOMING', 'OUTGOING'] as const).map((value) => ({
  value,
  label: MAIL_DIRECTION_LABELS[value],
}))

const FIELD_ORDER = [
  'direction',
  'mail_date',
  'category',
  'reference_number',
  'sender_or_recipient',
  'subject',
]

// Mencatat surat masuk atau keluar di Buku Agenda beserta salinan digitalnya (folder
// unggahan `surat`, khusus pengurus).
export function MailFormDialog({
  open,
  onOpenChange,
  defaultDirection,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Tab arah yang sedang dibuka, sebagai isian awal.
  defaultDirection?: MailDirection
  onSaved: (result: MailResponse) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catat surat</DialogTitle>
          <DialogDescription>
            Surat masuk atau keluar dicatat di Buku Agenda beserta salinan digitalnya.
          </DialogDescription>
        </DialogHeader>
        <MailForm
          defaultDirection={defaultDirection}
          onCancel={() => onOpenChange(false)}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  )
}

function MailForm({
  defaultDirection,
  onCancel,
  onSaved,
}: {
  defaultDirection?: MailDirection
  onCancel: () => void
  onSaved: (result: MailResponse) => void
}) {
  const [today] = useState(witaToday)
  const [direction, setDirection] = useState<MailDirection>(defaultDirection ?? 'INCOMING')
  const [date, setDate] = useState(today)
  const [category, setCategory] = useState<MailCategory>('UMUM')
  const [reference, setReference] = useState('')
  const [party, setParty] = useState('')
  const [subject, setSubject] = useState('')
  const [file, setFile] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const incoming = direction === 'INCOMING'

  function clearError(...fields: string[]) {
    if (!fields.some((field) => errors[field])) return
    const next = { ...errors }
    for (const field of fields) delete next[field]
    setErrors(next)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = {
      direction,
      mail_date: date,
      category,
      reference_number: reference,
      sender_or_recipient: party,
      subject,
      file_url: file,
    }
    const { details } = parseMailInput(body, today)
    setErrors(details)
    setFormError(null)
    if (Object.keys(details).length > 0) {
      const first = FIELD_ORDER.find((key) => details[key])
      if (first) document.getElementById(first)?.focus()
      return
    }

    setSubmitting(true)
    try {
      onSaved(await api.post<MailResponse>('/mails', body))
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
        name="direction"
        legend="Arah surat"
        options={DIRECTION_OPTIONS}
        value={direction}
        onChange={(next) => {
          setDirection(next)
          clearError('direction', 'sender_or_recipient')
        }}
        error={<FieldError id="direction-error" messages={errors.direction} />}
      />
      <div className="grid gap-x-3 gap-y-5 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <Label htmlFor="mail_date">Tanggal surat</Label>
          <Input
            id="mail_date"
            type="date"
            max={today}
            value={date}
            onChange={(event) => {
              setDate(event.target.value)
              clearError('mail_date')
            }}
            aria-invalid={Boolean(errors.mail_date)}
            aria-describedby={describedBy(errors, 'mail_date')}
            className={inputClass}
          />
          <FieldError id="mail_date-error" messages={errors.mail_date} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="category">Kategori</Label>
          <select
            id="category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as MailCategory)
              clearError('category')
            }}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={describedBy(errors, 'category')}
            className={selectClass}
          >
            {MAIL_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {MAIL_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
          <FieldError id="category-error" messages={errors.category} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="reference_number">Nomor surat</Label>
        <Input
          id="reference_number"
          value={reference}
          onChange={(event) => {
            setReference(event.target.value)
            clearError('reference_number')
          }}
          placeholder="mis. 012/MJ-LHR/X/2026"
          autoComplete="off"
          aria-invalid={Boolean(errors.reference_number)}
          aria-describedby={describedBy(errors, 'reference_number', 'reference_number-hint')}
          className={inputClass}
        />
        <FieldHint id="reference_number-hint">Kosongkan bila surat tidak bernomor.</FieldHint>
        <FieldError id="reference_number-error" messages={errors.reference_number} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sender_or_recipient">{incoming ? 'Pengirim' : 'Penerima/tujuan'}</Label>
        <Input
          id="sender_or_recipient"
          value={party}
          onChange={(event) => {
            setParty(event.target.value)
            clearError('sender_or_recipient')
          }}
          placeholder={
            incoming ? 'mis. Majelis Klasis Kota Kupang' : 'mis. Majelis Jemaat GMIT Kaisarea'
          }
          autoComplete="off"
          aria-invalid={Boolean(errors.sender_or_recipient)}
          aria-describedby={describedBy(errors, 'sender_or_recipient')}
          className={inputClass}
        />
        <FieldError id="sender_or_recipient-error" messages={errors.sender_or_recipient} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="subject">Perihal</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(event) => {
            setSubject(event.target.value)
            clearError('subject')
          }}
          placeholder={
            category === 'ATESTASI'
              ? 'mis. Atestasi pindah Kel. Ndun (4 jiwa)'
              : 'mis. Undangan rapat koordinasi bendahara'
          }
          autoComplete="off"
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={describedBy(errors, 'subject')}
          className={inputClass}
        />
        <FieldError id="subject-error" messages={errors.subject} />
      </div>
      <UploadField
        id="file_url"
        label="Salinan surat"
        folder="surat"
        kind="any"
        value={file}
        onChange={(url) => {
          setFile(url)
          clearError('file_url')
        }}
        onBusyChange={setUploading}
        emptyText="Pindaian PDF atau foto JPG/PNG/WebP, maksimal 10 MB."
        error={errors.file_url?.[0]}
      />
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={submitting || uploading}>
          {submitting ? 'Menyimpan…' : uploading ? 'Menunggu unggahan…' : 'Simpan di Buku Agenda'}
        </Button>
      </DialogFooter>
    </form>
  )
}
