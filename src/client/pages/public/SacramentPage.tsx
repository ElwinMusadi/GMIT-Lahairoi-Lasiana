import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  Check,
  CircleAlert,
  CircleCheck,
  Copy,
  FileCheck2,
  FileUp,
  Info,
  Search,
  Send,
  Share2,
} from 'lucide-react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import type { FieldErrors } from '@shared/accounts'
import { witaToday } from '@shared/dates'
import {
  SACRAMENT_FORMS,
  documentProblems,
  normalizeCode,
  parseApplicationInput,
  type DocumentKind,
} from '@shared/sacraments'
import {
  GENDERS,
  GENDER_LABELS,
  SACRAMENT_STATUS_LABELS,
  SACRAMENT_TYPE_LABELS,
  type ApiList,
  type PublicSacramentStatus,
  type RayonListItem,
  type SacramentApplyResponse,
  type SacramentType,
} from '@shared/types'
import { Eyebrow, PageIntro, PortalCard, PortalSection } from '@/components/portal/parts'
import { ApiError, errorMessage } from '@/lib/api'
import { formatDate, formatTime } from '@/lib/format'
import { copyText } from '@/lib/portal'
import {
  NOTES_FIELD,
  SERVICES,
  SERVICE_ORDER,
  STATUS_STEP,
  TRACK_STEPS,
  formSections,
  rememberCode,
  savedCodes,
  scheduleText,
  submitApplication,
  trackApplication,
  type FieldView,
  type SavedCode,
} from '@/lib/sacraments'
import { SACRAMENT_FAQ } from '@/lib/sacrament-faq'
import { formatBytes, validateUpload } from '@/lib/upload'
import { useApiQuery } from '@/lib/use-api-query'
import { cn } from '@/lib/utils'

const LETTERS = 'ABCDE'

const inputClass =
  'h-11 w-full rounded-lg border border-portal-highest bg-portal-surface px-3 text-base text-portal-ink outline-none placeholder:text-portal-muted/70 focus-visible:border-portal-indigo focus-visible:ring-3 focus-visible:ring-portal-blue-light/60 aria-invalid:border-destructive'

// Layanan Sakramen (PRD: Formulir Pendaftaran Online Baptis, Sidi, Nikah dengan kode
// lacak), tanpa login. Struktur mengikuti rancangan design/stitch/05: Cek Status di
// atas, formulir bertab per layanan, lalu pedoman.
export default function SacramentPage() {
  const tracker = useTracker()

  function checkFromSuccess(code: string) {
    void tracker.check(code)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document
      .getElementById('cek-status')
      ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <>
      <PageIntro
        id="judul-sakramen"
        eyebrow="Layanan gerejawi"
        title="Layanan Sakramen & Pelacakan Berkas"
        lead="Daftarkan Baptisan Kudus, Katekisasi/Sidi, atau Pemberkatan Nikah tanpa perlu akun. Simpan kode registrasi yang Anda terima untuk memantau verifikasi berkas dan jadwal penggembalaan."
      >
        <div className="flex flex-wrap gap-2">
          <a
            href="#formulir"
            className="inline-flex items-center gap-1.5 rounded-lg bg-portal-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-portal-indigo"
          >
            <Send className="size-4" aria-hidden="true" />
            Daftar sekarang
          </a>
          <a
            href="#cek-status"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-portal-navy shadow-sm hover:bg-portal-high"
          >
            <Search className="size-4" aria-hidden="true" />
            Cek status pendaftaran
          </a>
        </div>
      </PageIntro>
      <TrackSection tracker={tracker} />
      <FormSection onCheck={checkFromSuccess} />
      <GuideSection />
    </>
  )
}

// ---------- Cek status

function useTracker() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<PublicSacramentStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const pending = useRef<AbortController | null>(null)

  async function check(code: string) {
    const normalized = normalizeCode(code)
    setInput(normalized ?? code)
    if (!normalized) {
      setResult(null)
      setError('Kode registrasi berbentuk BPT-XXXX-XXXX, SDI-XXXX-XXXX, atau NKH-XXXX-XXXX.')
      return
    }
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setLoading(true)
    setError(null)
    try {
      setResult(await trackApplication(normalized, controller.signal))
    } catch (err) {
      if (controller.signal.aborted) return
      setResult(null)
      setError(
        err instanceof ApiError && err.status === 404
          ? 'Kode registrasi tidak ditemukan. Periksa kembali huruf dan angkanya.'
          : errorMessage(err),
      )
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  return { input, setInput, result, error, loading, check }
}

type Tracker = ReturnType<typeof useTracker>

function TrackSection({ tracker }: { tracker: Tracker }) {
  const [saved] = useState<SavedCode[]>(savedCodes)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void tracker.check(tracker.input)
  }

  return (
    <PortalSection id="cek-status" labelledBy="judul-cek-status">
      <PortalCard as="div" className="grid gap-6 border-t-4 border-portal-amber p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-start">
          <div className="grid gap-1">
            <h2
              id="judul-cek-status"
              className="flex items-center gap-2 font-portal-heading text-xl font-bold text-portal-navy sm:text-2xl"
            >
              <Search className="size-5 text-portal-amber" aria-hidden="true" />
              Cek Status Pendaftaran
            </h2>
            <p className="text-portal-muted">
              Masukkan kode registrasi yang Anda terima setelah mendaftar untuk melihat tahap
              verifikasi berkas, jadwal penggembalaan, dan tanggal pelaksanaan.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-2" noValidate>
            <label htmlFor="kode-registrasi" className="text-sm font-semibold text-portal-ink">
              Kode registrasi
            </label>
            <div className="flex gap-2">
              <input
                id="kode-registrasi"
                value={tracker.input}
                onChange={(event) => tracker.setInput(event.target.value)}
                placeholder="BPT-XXXX-XXXX"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={Boolean(tracker.error)}
                aria-describedby={tracker.error ? 'kode-error' : undefined}
                className={cn(inputClass, 'min-w-0 font-mono tracking-wider uppercase')}
              />
              <button
                type="submit"
                disabled={tracker.loading}
                className="inline-flex h-11 flex-none items-center gap-1.5 rounded-lg bg-portal-navy px-4 text-sm font-semibold text-white hover:bg-portal-indigo disabled:opacity-60"
              >
                {tracker.loading ? 'Memeriksa…' : 'Lacak status'}
              </button>
            </div>
            {tracker.error && (
              <p id="kode-error" role="alert" className="text-sm text-destructive">
                {tracker.error}
              </p>
            )}
            {saved.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-portal-muted">
                <span>Tersimpan di perangkat ini:</span>
                {saved.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => void tracker.check(item.code)}
                    className="rounded-md bg-portal-low px-2 py-1 font-mono text-xs font-semibold text-portal-navy hover:bg-portal-high"
                    title={SACRAMENT_TYPE_LABELS[item.type]}
                  >
                    {item.code}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
        <div aria-live="polite" className="empty:hidden">
          {tracker.result && <TrackResult status={tracker.result} />}
        </div>
      </PortalCard>
    </PortalSection>
  )
}

function TrackResult({ status }: { status: PublicSacramentStatus }) {
  const current = STATUS_STEP[status.status]
  const revision = status.status === 'REVISION'
  const counseling = scheduleText(status.counseling_date, status.counseling_time)
  const scheduled = scheduleText(status.scheduled_date, status.scheduled_time)

  // Keterangan di bawah tiap langkah.
  const details: ReactNode[] = [
    `${formatDate(status.submitted_at)}, ${formatTime(status.submitted_at)} WITA`,
    revision
      ? 'Perlu perbaikan berkas'
      : current === 1
        ? 'Sedang diperiksa Majelis'
        : 'Berkas lengkap',
    counseling ?? (current > 2 ? 'Tanpa jadwal terpisah' : 'Dijadwalkan setelah verifikasi'),
    scheduled ? (
      <>
        {scheduled}
        {status.officiating_pastor && <span className="block">{status.officiating_pastor}</span>}
      </>
    ) : (
      'Menunggu persetujuan'
    ),
    status.status === 'COMPLETED' ? 'Tercatat di buku induk' : 'Setelah pelaksanaan',
  ]

  return (
    <div className="grid gap-4 rounded-xl bg-portal-low p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-full bg-portal-amber-soft px-3 py-0.5 text-xs font-bold text-portal-amber-ink">
          {SACRAMENT_TYPE_LABELS[status.type]}
        </span>
        <span className="font-mono font-semibold text-portal-navy">{status.registration_code}</span>
        <span className="text-sm text-portal-muted">· {status.applicant_name}</span>
        <span className="text-sm text-portal-muted sm:ml-auto">
          Diperbarui {formatDate(status.updated_at)}, {formatTime(status.updated_at)} WITA
        </span>
      </div>

      <p className="font-portal-heading text-lg font-bold text-portal-navy">
        Status: {SACRAMENT_STATUS_LABELS[status.status]}
      </p>

      <ol className="grid gap-2 md:grid-cols-5">
        {TRACK_STEPS.map((title, index) => {
          const done = index < current
          const active = index === current
          return (
            <li
              key={title}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'grid content-start gap-1 rounded-lg bg-white p-3 text-sm',
                active && !revision && 'ring-2 ring-portal-amber',
                active && revision && 'ring-2 ring-destructive',
                !done && !active && 'opacity-70',
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex size-6 flex-none items-center justify-center rounded-full text-xs font-bold',
                    done
                      ? 'bg-portal-green-soft text-portal-green'
                      : active
                        ? revision
                          ? 'bg-destructive text-white'
                          : 'bg-portal-amber text-white'
                        : 'bg-portal-mid text-portal-muted',
                  )}
                >
                  {done ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                </span>
                <span className="font-semibold text-portal-ink">{title}</span>
                <span className="sr-only">
                  {done ? '(selesai)' : active ? '(tahap sekarang)' : '(belum)'}
                </span>
              </span>
              <span className="pl-8 text-portal-muted">{details[index]}</span>
            </li>
          )
        })}
      </ol>

      {status.notes && (
        <div
          className={cn(
            'flex items-start gap-3 rounded-lg p-4 text-sm',
            revision ? 'bg-white ring-2 ring-destructive/40' : 'bg-white',
          )}
        >
          <CircleAlert
            className={cn(
              'mt-0.5 size-5 flex-none',
              revision ? 'text-destructive' : 'text-portal-amber',
            )}
            aria-hidden="true"
          />
          <div className="grid gap-1">
            <span className="font-semibold text-portal-ink">Catatan dari Majelis</span>
            <p className="whitespace-pre-line text-portal-muted">{status.notes}</p>
            {revision && (
              <p className="text-portal-muted">
                Serahkan perbaikan berkas ke kantor jemaat atau ikuti petunjuk di atas, dengan
                menyebutkan kode registrasi Anda.
              </p>
            )}
          </div>
        </div>
      )}

      <p className="text-sm text-portal-muted">
        Berkas diterima:{' '}
        {status.documents.length > 0
          ? status.documents.map((document) => document.label).join(', ')
          : 'belum ada'}
        .
      </p>
    </div>
  )
}

// ---------- Formulir

function FormSection({ onCheck }: { onCheck: (code: string) => void }) {
  const [params, setParams] = useSearchParams()
  const selected =
    SERVICE_ORDER.find((type) => SERVICES[type].slug === params.get('layanan')) ?? 'BAPTISM'
  const rayons = useApiQuery<ApiList<RayonListItem>>('/rayons')

  function select(type: SacramentType) {
    const next = new URLSearchParams(window.location.search)
    next.set('layanan', SERVICES[type].slug)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  // Panah kiri/kanan berpindah tab (pola WAI-ARIA tabs).
  function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    const step = event.key === 'ArrowRight' ? 1 : -1
    const index = SERVICE_ORDER.indexOf(selected)
    const next = SERVICE_ORDER[(index + step + SERVICE_ORDER.length) % SERVICE_ORDER.length]
    select(next)
    document.getElementById(`tab-${SERVICES[next].slug}`)?.focus()
  }

  return (
    <PortalSection id="formulir" tone="low" labelledBy="judul-formulir">
      {/* min-w-0: baris tab yang bisa digeser tidak boleh melebarkan kolom section. */}
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-1">
          <Eyebrow>Pendaftaran online</Eyebrow>
          <h2
            id="judul-formulir"
            className="font-portal-heading text-2xl font-bold text-portal-navy sm:text-[2rem] sm:leading-10"
          >
            Formulir Pendaftaran Sakramen
          </h2>
        </div>
        <div
          role="tablist"
          aria-label="Jenis layanan"
          className="flex max-w-full gap-2 overflow-x-auto rounded-xl bg-white p-1 shadow-sm [scrollbar-width:none]"
        >
          {SERVICE_ORDER.map((type, index) => {
            const active = type === selected
            return (
              <button
                key={type}
                id={`tab-${SERVICES[type].slug}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`panel-${SERVICES[type].slug}`}
                tabIndex={active ? 0 : -1}
                onClick={() => select(type)}
                onKeyDown={handleKey}
                className={cn(
                  'flex-none rounded-lg px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors',
                  active
                    ? 'bg-portal-indigo text-white'
                    : 'text-portal-muted hover:bg-portal-high hover:text-portal-ink',
                )}
              >
                {index + 1}. {SERVICES[type].tab}
              </button>
            )
          })}
        </div>
      </div>

      {/* Ketiga formulir tetap terpasang agar isian tidak hilang saat berpindah tab. */}
      {SERVICE_ORDER.map((type) => (
        <div
          key={type}
          id={`panel-${SERVICES[type].slug}`}
          role="tabpanel"
          aria-labelledby={`tab-${SERVICES[type].slug}`}
          hidden={type !== selected}
          className="min-w-0"
        >
          <PortalCard className="grid gap-6 p-5 sm:p-8">
            <ApplicationForm type={type} rayons={rayons.data?.data ?? []} onCheck={onCheck} />
          </PortalCard>
        </div>
      ))}
    </PortalSection>
  )
}

type Values = Record<string, string>

function ApplicationForm({
  type,
  rayons,
  onCheck,
}: {
  type: SacramentType
  rayons: RayonListItem[]
  onCheck: (code: string) => void
}) {
  const [today] = useState(witaToday)
  const [values, setValues] = useState<Values>({})
  const [files, setFiles] = useState<Record<string, File>>({})
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [done, setDone] = useState<{ result: SacramentApplyResponse; phone: string } | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  const sections = formSections(type)
  const notes = NOTES_FIELD(type)
  const documents = SACRAMENT_FORMS[type].documents
  const fieldKeys = [...sections.flatMap((section) => section.fields), notes].map(
    (field) => field.key,
  )
  const errorCount = Object.keys(errors).length

  function setValue(key: string, value: string) {
    setValues((previous) => ({ ...previous, [key]: value }))
    clearError(key)
  }

  function clearError(key: string) {
    if (!errors[key]) return
    setErrors((previous) => {
      const next = { ...previous }
      delete next[key]
      return next
    })
  }

  function setFile(kind: string, file: File | null) {
    const problem = file ? validateUpload(file) : null
    setFiles((previous) => {
      const next = { ...previous }
      if (file && !problem) next[kind] = file
      else delete next[kind]
      return next
    })
    setErrors((previous) => {
      const next = { ...previous }
      if (problem) next[kind] = [problem]
      else delete next[kind]
      return next
    })
  }

  function reset() {
    setValues({})
    setFiles({})
    setErrors({})
    setFormError(null)
    setDone(null)
  }

  function focusFirst(details: FieldErrors) {
    const key =
      fieldKeys.find((field) => details[field]) ??
      documents.map((document) => document.kind).find((kind) => details[kind])
    const element = key ? document.getElementById(`${type}-${key}`) : null
    element?.focus()
    if (!element) summaryRef.current?.focus()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (progress !== null) return
    const fields: Values = { type }
    for (const key of fieldKeys) fields[key] = values[key] ?? ''
    // Pemeriksaan yang sama dengan API, sebelum berkas dikirim.
    const { details } = parseApplicationInput(fields, today)
    Object.assign(details, documentProblems(type, Object.keys(files)))
    // Berkas yang ditolak saat dipilih tidak disimpan, jadi tidak menahan pengiriman; dokumen
    // wajib yang belum ada tetap ditandai documentProblems.
    setErrors(details)
    setFormError(null)
    if (Object.keys(details).length > 0) {
      focusFirst(details)
      return
    }

    const form = new FormData()
    for (const [key, value] of Object.entries(fields)) form.append(key, value)
    for (const [kind, file] of Object.entries(files)) form.append(kind, file)
    setProgress(0)
    try {
      const result = await submitApplication(form, setProgress)
      rememberCode({ code: result.registration_code, type, saved_at: result.submitted_at })
      setDone({ result, phone: fields.phone })
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.details).length > 0) {
        setErrors(err.details)
        focusFirst(err.details)
      }
      setFormError(errorMessage(err))
    } finally {
      setProgress(null)
    }
  }

  if (done) {
    return (
      <SuccessPanel
        result={done.result}
        phone={done.phone}
        onCheck={() => onCheck(done.result.registration_code)}
        onAnother={reset}
      />
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-8">
      <p className="flex items-start gap-3 rounded-xl bg-portal-blue-soft/60 p-4 text-sm text-portal-blue-ink">
        <Info className="mt-0.5 size-5 flex-none text-portal-navy" aria-hidden="true" />
        <span>
          <span className="block font-semibold">{SACRAMENT_TYPE_LABELS[type]}</span>
          {SERVICES[type].intro} Kolom bertanda <span className="text-portal-amber">*</span> wajib
          diisi.
        </span>
      </p>

      <div
        ref={summaryRef}
        tabIndex={-1}
        role="alert"
        aria-live="assertive"
        className="empty:hidden focus:outline-none"
      >
        {(errorCount > 0 || formError) && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-destructive ring-1 ring-destructive/30">
            {formError ?? `Periksa ${errorCount} isian yang ditandai.`}
          </p>
        )}
      </div>

      <div className={cn('grid gap-8', type === 'MARRIAGE' && 'lg:grid-cols-2 lg:gap-x-10')}>
        {sections.map((section, index) => (
          <FormBlock
            key={section.title}
            letter={LETTERS[index]}
            title={section.title}
            className={cn(type === 'MARRIAGE' && index === 2 && 'lg:col-span-2')}
          >
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              {section.fields.map((field) => (
                <Field
                  key={field.key}
                  type={type}
                  field={field}
                  value={values[field.key] ?? ''}
                  error={errors[field.key]?.[0]}
                  today={today}
                  rayons={rayons}
                  onChange={(value) => setValue(field.key, value)}
                />
              ))}
            </div>
          </FormBlock>
        ))}
      </div>

      <FormBlock letter={LETTERS[sections.length]} title="Berkas persyaratan">
        <p className="-mt-2 text-sm text-portal-muted">
          Foto atau pindaian yang jelas, format PDF, JPG, PNG, atau WebP, maksimal 10 MB per berkas.
          Berkas hanya dapat dibuka Pendeta dan pengurus jemaat.
        </p>
        <div
          className={cn(
            'grid gap-4 sm:grid-cols-2',
            documents.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
          )}
        >
          {documents.map((document, index) => (
            <DocumentTile
              key={document.kind}
              id={`${type}-${document.kind}`}
              number={index + 1}
              document={document}
              file={files[document.kind] ?? null}
              error={errors[document.kind]?.[0]}
              onChange={(file) => setFile(document.kind, file)}
            />
          ))}
        </div>
        {/* Kisi sendiri: isian lebar (col-span-2) tidak boleh menambah kolom di fieldset. */}
        <div className="grid sm:grid-cols-2">
          <Field
            type={type}
            field={notes}
            value={values[notes.key] ?? ''}
            error={errors[notes.key]?.[0]}
            today={today}
            rayons={rayons}
            onChange={(value) => setValue(notes.key, value)}
          />
        </div>
      </FormBlock>

      <div className="flex flex-col gap-4 border-t border-portal-high pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-portal-muted">
          Setelah terkirim Anda menerima kode registrasi untuk mengecek status di halaman ini.
        </p>
        <div className="flex flex-none gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={progress !== null}
            className="rounded-lg bg-portal-mid px-5 py-3 text-sm font-semibold text-portal-navy hover:bg-portal-high disabled:opacity-60"
          >
            Kosongkan
          </button>
          <button
            type="submit"
            disabled={progress !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-portal-navy px-5 py-3 text-sm font-semibold text-white hover:bg-portal-indigo disabled:opacity-80"
          >
            <Send className="size-4" aria-hidden="true" />
            {progress === null
              ? 'Kirim pendaftaran'
              : progress < 100
                ? `Mengirim berkas… ${progress}%`
                : 'Menyimpan…'}
          </button>
        </div>
      </div>
    </form>
  )
}

function FormBlock({
  letter,
  title,
  className,
  children,
}: {
  letter: string
  title: string
  className?: string
  children: ReactNode
}) {
  return (
    <fieldset className={cn('grid min-w-0 gap-5', className)}>
      <legend className="mb-5 flex items-center gap-3 font-portal-heading text-lg font-bold text-portal-navy">
        <span
          className="flex size-7 flex-none items-center justify-center rounded-full bg-portal-navy text-sm text-white"
          aria-hidden="true"
        >
          {letter}
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

function Field({
  type,
  field,
  value,
  error,
  today,
  rayons,
  onChange,
}: {
  type: SacramentType
  field: FieldView
  value: string
  error?: string
  today: string
  rayons: RayonListItem[]
  onChange: (value: string) => void
}) {
  const id = `${type}-${field.key}`
  const describedBy =
    [field.hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') ||
    undefined
  const common = {
    id,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy,
    'aria-required': field.required,
  }
  const label = (
    <>
      {field.label}
      {field.required && (
        <span className="text-portal-amber" aria-hidden="true">
          {' '}
          *
        </span>
      )}
    </>
  )

  let control: ReactNode
  if (field.kind === 'gender') {
    return (
      <fieldset className="grid content-start gap-2" aria-describedby={describedBy}>
        <legend className="mb-2 text-sm font-semibold text-portal-ink">{label}</legend>
        <div className="grid grid-cols-2 gap-2">
          {GENDERS.map((gender, index) => (
            <label
              key={gender}
              className={cn(
                'flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-portal-highest bg-portal-surface px-3 text-base has-checked:border-portal-indigo has-checked:bg-portal-blue-soft/60 has-checked:font-semibold has-focus-visible:ring-3 has-focus-visible:ring-portal-blue-light/60',
                error && 'border-destructive',
              )}
            >
              <input
                type="radio"
                id={index === 0 ? id : undefined}
                name={id}
                value={gender}
                checked={value === gender}
                onChange={() => onChange(gender)}
                className="size-4 accent-portal-indigo"
              />
              {GENDER_LABELS[gender]}
            </label>
          ))}
        </div>
        {error && (
          <p id={`${id}-error`} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </fieldset>
    )
  }
  if (field.input === 'rayon') {
    control = (
      <select
        {...common}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        <option value="">Bukan warga Jemaat Lahairoi / belum tahu</option>
        {rayons.map((rayon) => (
          <option key={rayon.id} value={rayon.id}>
            Rayon {rayon.name}
          </option>
        ))}
      </select>
    )
  } else if (field.input === 'textarea') {
    control = (
      <textarea
        {...common}
        rows={3}
        value={value}
        maxLength={field.max}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClass, 'h-auto py-2.5')}
      />
    )
  } else {
    const date = field.kind === 'past-date' || field.kind === 'future-date'
    control = (
      <input
        {...common}
        type={date ? 'date' : field.input === 'tel' ? 'tel' : 'text'}
        inputMode={field.input === 'tel' ? 'tel' : undefined}
        autoComplete={
          field.input === 'tel' ? 'tel' : field.key === 'address' ? 'street-address' : 'off'
        }
        max={field.kind === 'past-date' ? today : undefined}
        min={field.kind === 'future-date' ? today : undefined}
        maxLength={date ? undefined : field.max}
        placeholder={field.placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    )
  }

  return (
    <div className={cn('grid content-start gap-2', field.wide && 'sm:col-span-2')}>
      <label htmlFor={id} className="text-sm font-semibold text-portal-ink">
        {label}
      </label>
      {control}
      {field.hint && (
        <p id={`${id}-hint`} className="text-sm text-portal-muted">
          {field.hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function DocumentTile({
  id,
  number,
  document,
  file,
  error,
  onChange,
}: {
  id: string
  number: number
  document: DocumentKind
  file: File | null
  error?: string
  onChange: (file: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files[0]
    if (dropped) onChange(dropped)
  }

  return (
    <div className="grid content-start gap-2">
      <span className="text-sm font-semibold text-portal-ink" id={`${id}-label`}>
        {number}. {document.label}
        {document.required ? (
          <span className="text-portal-amber" aria-hidden="true">
            {' '}
            *
          </span>
        ) : (
          <span className="font-normal text-portal-muted"> (opsional)</span>
        )}
      </span>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        aria-required={document.required}
        onChange={(event) => {
          onChange(event.target.files?.[0] ?? null)
          event.target.value = ''
        }}
      />
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'grid min-h-32 place-items-center gap-2 rounded-xl border-2 border-dashed p-4 text-center text-sm transition-colors',
          file
            ? 'border-portal-green/40 bg-portal-green-soft/30'
            : 'border-portal-highest bg-portal-low',
          dragging && 'border-portal-indigo bg-portal-blue-soft/50',
          error && 'border-destructive/60',
        )}
      >
        {file ? (
          <>
            <FileCheck2 className="size-6 text-portal-green" aria-hidden="true" />
            <span className="grid gap-0.5">
              <span className="font-semibold break-all text-portal-ink">{file.name}</span>
              <span className="text-portal-muted">{formatBytes(file.size)} · siap dikirim</span>
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-md bg-white px-3 py-1.5 font-semibold text-portal-navy shadow-sm hover:bg-portal-high"
              >
                Ganti
                <span className="sr-only"> {document.label}</span>
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="rounded-md px-3 py-1.5 font-semibold text-portal-muted hover:bg-white hover:text-portal-ink"
              >
                Hapus
                <span className="sr-only"> {document.label}</span>
              </button>
            </span>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid w-full place-items-center gap-2 rounded-lg py-2 text-portal-muted outline-none focus-visible:ring-3 focus-visible:ring-portal-blue-light/60"
          >
            <FileUp className="size-6 text-portal-navy" aria-hidden="true" />
            <span className="font-semibold text-portal-navy">Pilih berkas</span>
            <span className="sr-only"> untuk {document.label}</span>
            <span className="hidden sm:block">atau seret ke sini</span>
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function SuccessPanel({
  result,
  phone,
  onCheck,
  onAnother,
}: {
  result: SacramentApplyResponse
  phone: string
  onCheck: () => void
  onAnother: () => void
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Pembaca layar dan pengguna papan ketik langsung tiba di hasil pendaftaran.
  useEffect(() => {
    headingRef.current?.focus()
    headingRef.current?.scrollIntoView({ block: 'center' })
  }, [])
  const label = SACRAMENT_TYPE_LABELS[result.type]
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function copy() {
    const ok = await copyText(result.registration_code)
    if (!ok) {
      toast.error('Kode tidak dapat disalin. Catat kode secara manual.')
      return
    }
    toast.success('Kode registrasi disalin', { description: result.registration_code })
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 2500)
  }

  async function share() {
    try {
      await navigator.share({
        title: `Kode registrasi ${label}`,
        text: `Kode registrasi ${label} GMIT Lahairoi: ${result.registration_code}. Cek status di ${window.location.origin}/layanan-sakramen#cek-status`,
      })
    } catch {
      // Dibatalkan pengguna.
    }
  }

  return (
    <div className="grid justify-items-center gap-5 py-4 text-center" role="status">
      <CircleCheck className="size-12 text-portal-green" aria-hidden="true" />
      <div className="grid gap-1">
        <h3
          className="font-portal-heading text-2xl font-bold text-portal-navy focus:outline-none"
          tabIndex={-1}
          ref={headingRef}
        >
          Pendaftaran {label} terkirim
        </h3>
        <p className="max-w-xl text-portal-muted">
          Simpan kode registrasi di bawah. Gunakan kode ini di bagian Cek Status untuk melihat
          verifikasi berkas dan jadwal penggembalaan.
        </p>
      </div>
      <div className="grid w-full max-w-md gap-2 rounded-2xl border-t-4 border-portal-amber bg-portal-low p-5">
        <span className="text-xs font-bold tracking-wider text-portal-amber uppercase">
          Kode registrasi
        </span>
        <output
          aria-label={`Kode registrasi ${result.registration_code.split('').join(' ')}`}
          className="font-mono text-3xl font-bold tracking-[0.12em] break-all text-portal-navy select-all sm:text-4xl"
        >
          {result.registration_code}
        </output>
        <span className="text-sm text-portal-muted">
          Dikirim {formatDate(result.submitted_at)}, {formatTime(result.submitted_at)} WITA
        </span>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-2 rounded-lg bg-portal-navy px-5 py-3 text-sm font-semibold text-white hover:bg-portal-indigo"
        >
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? 'Tersalin' : 'Salin kode'}
        </button>
        {canShare && (
          <button
            type="button"
            onClick={() => void share()}
            className="inline-flex items-center gap-2 rounded-lg bg-portal-mid px-5 py-3 text-sm font-semibold text-portal-navy hover:bg-portal-high"
          >
            <Share2 className="size-4" aria-hidden="true" />
            Kirim ke WhatsApp/aplikasi lain
          </button>
        )}
        <button
          type="button"
          onClick={onCheck}
          className="inline-flex items-center gap-2 rounded-lg bg-portal-mid px-5 py-3 text-sm font-semibold text-portal-navy hover:bg-portal-high"
        >
          <Search className="size-4" aria-hidden="true" />
          Cek status sekarang
        </button>
      </div>
      <p className="max-w-xl text-sm text-portal-muted">
        Kode juga tersimpan di peramban ini. Majelis akan menghubungi {phone} untuk langkah
        berikutnya.
      </p>
      <button
        type="button"
        onClick={onAnother}
        className="text-sm font-semibold text-portal-navy underline underline-offset-4"
      >
        Daftarkan layanan lain
      </button>
    </div>
  )
}

// ---------- Pedoman

function GuideSection() {
  return (
    <PortalSection labelledBy="judul-pedoman">
      <div className="grid gap-1">
        <Eyebrow>Pedoman</Eyebrow>
        <h2 id="judul-pedoman" className="font-portal-heading text-2xl font-bold text-portal-navy">
          Pertanyaan seputar pendaftaran
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {SACRAMENT_FAQ.map((item) => (
          <PortalCard key={item.question} as="article" className="grid content-start gap-2 p-5">
            <h3 className="font-semibold text-portal-ink">{item.question}</h3>
            <p className="text-sm text-portal-muted">{item.answer}</p>
          </PortalCard>
        ))}
      </div>
    </PortalSection>
  )
}
