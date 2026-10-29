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
import { FaqAccordion } from '@/components/portal/kage/faq-accordion'
import { siteInput } from '@/components/portal/kage/field'
import { HeroPanel } from '@/components/portal/kage/hero-panel'
import { PillButton, PillLink } from '@/components/portal/kage/pill'
import { Reveal } from '@/components/portal/kage/reveal'
import { SectionIntro, SiteSection } from '@/components/portal/kage/site-section'
import { TwoToneHeading } from '@/components/portal/kage/two-tone-heading'
import { WindowPanel } from '@/components/portal/kage/window-panel'
import { ApiError, errorMessage } from '@/lib/api'
import { formatDate, formatTime } from '@/lib/format'
import { copyText } from '@/lib/portal'
import { scrollToElement } from '@/lib/portal-motion'
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

// Pesan eror di atas panel gelap: merah muda terang agar terbaca (destructive tema terang
// terlalu gelap di atas panel).
const darkError = 'text-[#ff8a80]'

// Layanan Sakramen (PRD: Formulir Pendaftaran Online Baptis, Sidi, Nikah dengan kode
// lacak), tanpa login: Cek Status di atas, formulir bertab per layanan, lalu tanya-jawab.
export default function SacramentPage() {
  const tracker = useTracker()
  // Kode yang tersimpan di perangkat ini; diperbarui begitu pendaftaran baru terkirim.
  const [saved, setSaved] = useState<SavedCode[]>(savedCodes)

  function checkFromSuccess(code: string) {
    void tracker.check(code)
    const section = document.getElementById('cek-status')
    if (section) scrollToElement(section)
  }

  return (
    <>
      <HeroPanel
        labelledBy="judul-sakramen"
        display={
          <div className="grid max-w-[760px] gap-5">
            <TwoToneHeading
              as="h1"
              id="judul-sakramen"
              size="page"
              onDark
              lead="Layanan Sakramen"
              accent="& pelacakan berkas."
            />
            <p className="max-w-[60ch] text-base leading-relaxed text-white/85 md:text-lg">
              Daftarkan Baptisan Kudus, Katekisasi/Sidi, atau Pemberkatan Nikah tanpa perlu akun.
              Simpan kode registrasi yang Anda terima untuk memantau verifikasi berkas dan jadwal
              penggembalaan.
            </p>
          </div>
        }
      >
        <div className="mt-auto flex flex-wrap gap-2 pt-10">
          <PillLink to="#formulir" tone="light">
            <Send aria-hidden="true" />
            Daftar sekarang
          </PillLink>
          <PillLink to="#cek-status" tone="glass">
            <Search aria-hidden="true" />
            Cek status pendaftaran
          </PillLink>
        </div>
      </HeroPanel>
      <TrackSection tracker={tracker} saved={saved} />
      <FormSection onCheck={checkFromSuccess} onSaved={() => setSaved(savedCodes())} />
      <SiteSection labelledBy="judul-tanya">
        <SectionIntro id="judul-tanya" lead="Pertanyaan seputar" accent="pendaftaran sakramen." />
        <FaqAccordion items={SACRAMENT_FAQ} className="mx-auto mt-12 max-w-[760px] text-left" />
      </SiteSection>
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

// Cek status dalam panel jendela gelap bermotif terminal.
function TrackSection({ tracker, saved }: { tracker: Tracker; saved: SavedCode[] }) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void tracker.check(tracker.input)
  }

  return (
    <SiteSection id="cek-status" labelledBy="judul-cek-status" className="pt-12 lg:pt-16">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="grid content-start gap-6 lg:col-span-5">
          <Reveal>
            <TwoToneHeading id="judul-cek-status" lead="Cek status" accent="pendaftaran." />
          </Reveal>
          <p className="max-w-[52ch] text-lg leading-relaxed text-site-ink/80">
            Masukkan kode registrasi yang Anda terima setelah mendaftar untuk melihat tahap
            verifikasi berkas, jadwal penggembalaan, dan tanggal pelaksanaan.
          </p>
        </div>
        <Reveal className="lg:col-span-7">
          <WindowPanel title="cek-status" badge="WITA">
            <form onSubmit={handleSubmit} className="grid gap-3" noValidate>
              <label htmlFor="kode-registrasi" className="text-sm font-semibold text-white/85">
                Kode registrasi
              </label>
              <div className="flex min-w-0 items-center gap-2 rounded-full bg-site-panel-2 p-1.5 pl-5 shadow-inner focus-within:ring-3 focus-within:ring-site-accent">
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
                  className="h-10 min-w-0 flex-1 bg-transparent font-site-mono text-base tracking-wider text-white uppercase outline-none placeholder:text-white/45"
                />
                <button
                  type="submit"
                  disabled={tracker.loading}
                  className="inline-flex h-10 flex-none items-center rounded-full bg-white px-4 text-sm font-semibold text-site-panel transition-colors outline-none hover:bg-site-paper focus-visible:ring-3 focus-visible:ring-site-accent disabled:opacity-70"
                >
                  {tracker.loading ? 'Memeriksa…' : 'Lacak status'}
                </button>
              </div>
              {tracker.error && (
                <p id="kode-error" role="alert" className={cn('text-sm', darkError)}>
                  {tracker.error}
                </p>
              )}
              {saved.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-white/70">
                  <span>Tersimpan di perangkat ini:</span>
                  {saved.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => void tracker.check(item.code)}
                      title={SACRAMENT_TYPE_LABELS[item.type]}
                      className="rounded-full bg-white/10 px-3 py-1.5 font-site-mono text-(length:--site-text-xs) text-white transition-colors outline-none hover:bg-white/20 focus-visible:ring-3 focus-visible:ring-site-accent"
                    >
                      {item.code}
                    </button>
                  ))}
                </div>
              )}
            </form>
            <div aria-live="polite" className="empty:hidden">
              {tracker.result && <TrackResult status={tracker.result} />}
            </div>
          </WindowPanel>
        </Reveal>
      </div>
    </SiteSection>
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
    <div className="mt-8 grid gap-6 rounded-2xl bg-white/[0.05] p-5 md:p-6">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/75">
          <span className="rounded-full bg-site-accent px-3 py-1 text-(length:--site-text-xs) font-bold text-site-panel">
            {SACRAMENT_TYPE_LABELS[status.type]}
          </span>
          <span className="font-site-mono text-base text-white">{status.registration_code}</span>
          <span>· {status.applicant_name}</span>
        </div>
        <p className="font-site-display text-2xl font-bold text-white">
          Status: {SACRAMENT_STATUS_LABELS[status.status]}
        </p>
        <p className="text-sm text-white/70">
          Diperbarui {formatDate(status.updated_at)}, {formatTime(status.updated_at)} WITA
        </p>
      </div>

      <ol className="grid gap-4">
        {TRACK_STEPS.map((title, index) => {
          const done = index < current
          const active = index === current
          return (
            <li
              key={title}
              aria-current={active ? 'step' : undefined}
              className={cn('grid grid-cols-[auto_1fr] gap-x-4', !done && !active && 'opacity-60')}
            >
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full font-site-mono text-(length:--site-text-xs) font-semibold',
                  done
                    ? 'bg-site-green text-white'
                    : active
                      ? revision
                        ? 'bg-[#ff8a80] text-site-panel'
                        : 'bg-site-accent text-site-panel'
                      : 'bg-white/10 text-white/70',
                )}
              >
                {done ? <Check className="size-4" aria-hidden="true" /> : index + 1}
              </span>
              <span className="grid gap-0.5 pt-1">
                <span className="text-base font-semibold text-white">
                  {title}
                  <span className="sr-only">
                    {done ? ' (selesai)' : active ? ' (tahap sekarang)' : ' (belum)'}
                  </span>
                </span>
                <span className="text-sm text-white/70">{details[index]}</span>
              </span>
            </li>
          )
        })}
      </ol>

      {status.notes && (
        <div
          className={cn(
            'flex items-start gap-3 rounded-2xl p-4 text-sm',
            revision ? 'bg-[#ff8a80]/15 ring-1 ring-[#ff8a80]/50' : 'bg-white/[0.06]',
          )}
        >
          <CircleAlert
            className={cn('mt-0.5 size-5 flex-none', revision ? darkError : 'text-site-accent')}
            aria-hidden="true"
          />
          <div className="grid gap-1">
            <span className="font-semibold text-white">Catatan dari Majelis</span>
            <p className="whitespace-pre-line text-white/80">{status.notes}</p>
            {revision && (
              <p className="text-white/80">
                Serahkan perbaikan berkas ke kantor jemaat atau ikuti petunjuk di atas, dengan
                menyebutkan kode registrasi Anda.
              </p>
            )}
          </div>
        </div>
      )}

      <p className="text-sm text-white/70">
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

function FormSection({
  onCheck,
  onSaved,
}: {
  onCheck: (code: string) => void
  onSaved: () => void
}) {
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
    <SiteSection id="formulir" tone="paper" labelledBy="judul-formulir">
      <div className="grid gap-8">
        <Reveal>
          <TwoToneHeading id="judul-formulir" lead="Formulir" accent="pendaftaran sakramen." />
        </Reveal>
        {/* Tiga kolom tetap; label tab membungkus di ponsel, jadi tidak ada yang terpotong. */}
        <div
          role="tablist"
          aria-label="Jenis layanan"
          className="grid max-w-[720px] grid-cols-3 gap-1 rounded-[22px] bg-site-canvas p-1.5 glass:glass-card"
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
                  'min-h-12 rounded-2xl px-2 py-2.5 text-center text-sm leading-tight font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring sm:px-4',
                  active ? 'bg-site-ink text-site-canvas' : 'text-site-ink/80 hover:bg-site-paper',
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
          className="mt-8 min-w-0 rounded-3xl bg-site-canvas p-5 sm:p-8 lg:p-10 glass:glass-card"
        >
          <ApplicationForm
            type={type}
            rayons={rayons.data?.data ?? []}
            onCheck={onCheck}
            onSaved={onSaved}
          />
        </div>
      ))}
    </SiteSection>
  )
}

type Values = Record<string, string>

function ApplicationForm({
  type,
  rayons,
  onCheck,
  onSaved,
}: {
  type: SacramentType
  rayons: RayonListItem[]
  onCheck: (code: string) => void
  onSaved: () => void
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
      // Kode baru langsung tampil di Cek Status, tanpa muat ulang (perbaikan 08).
      onSaved()
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
    <form noValidate onSubmit={handleSubmit} className="grid gap-10">
      <p className="flex items-start gap-3 rounded-2xl bg-site-paper p-4 text-base md:p-5">
        <Info className="mt-0.5 size-5 flex-none" aria-hidden="true" />
        <span>
          <span className="block font-site-display font-bold">{SACRAMENT_TYPE_LABELS[type]}</span>
          <span className="text-site-ink/80">
            {SERVICES[type].intro} Kolom bertanda <span className="text-ring">*</span> wajib diisi.
          </span>
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
          <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-base text-destructive ring-1 ring-destructive/30">
            {formError ?? `Periksa ${errorCount} isian yang ditandai.`}
          </p>
        )}
      </div>

      <div className={cn('grid gap-10', type === 'MARRIAGE' && 'lg:grid-cols-2 lg:gap-x-10')}>
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
        <p className="-mt-2 max-w-[65ch] text-base text-site-muted">
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[48ch] text-base text-site-muted">
          Setelah terkirim Anda menerima kode registrasi untuk mengecek status di halaman ini.
        </p>
        <div className="flex flex-none flex-wrap gap-2">
          <PillButton tone="outline" onClick={reset} disabled={progress !== null}>
            Kosongkan
          </PillButton>
          <PillButton type="submit" tone="dark" disabled={progress !== null}>
            <Send aria-hidden="true" />
            {progress === null
              ? 'Kirim pendaftaran'
              : progress < 100
                ? `Mengirim berkas… ${progress}%`
                : 'Menyimpan…'}
          </PillButton>
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
      <legend className="mb-5 flex items-center gap-3 font-site-display text-xl font-bold">
        <span
          className="flex size-8 flex-none items-center justify-center rounded-full bg-site-ink font-site-mono text-sm text-site-canvas"
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
        <span className="text-ring" aria-hidden="true">
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
        <legend className="mb-2 text-sm font-semibold">{label}</legend>
        <div className="grid grid-cols-2 gap-2">
          {GENDERS.map((gender, index) => (
            <label
              key={gender}
              className={cn(
                'flex h-12 cursor-pointer items-center gap-2 rounded-xl border border-site-muted bg-site-canvas px-4 text-base has-checked:border-site-ink has-checked:bg-site-paper has-checked:font-semibold has-focus-visible:ring-3 has-focus-visible:ring-ring',
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
                className="size-4 accent-site-ink"
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
        className={siteInput}
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
        className={cn(siteInput, 'h-auto py-3')}
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
        className={siteInput}
      />
    )
  }

  return (
    <div className={cn('grid content-start gap-2', field.wide && 'sm:col-span-2')}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {control}
      {field.hint && (
        <p id={`${id}-hint`} className="text-sm text-site-muted">
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

// Ubin unggah: zona seret-lepas sungguhan, jadi tetap bergaris putus-putus.
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
  const pickRef = useRef<HTMLButtonElement>(null)
  const [dragging, setDragging] = useState(false)

  // Tombol Hapus ikut hilang bersama berkasnya; fokus dipindah ke "Pilih berkas" yang
  // menggantikannya agar pengguna keyboard tidak kehilangan posisi.
  function remove() {
    onChange(null)
    requestAnimationFrame(() => pickRef.current?.focus())
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const dropped = event.dataTransfer.files[0]
    if (dropped) onChange(dropped)
  }

  return (
    <div className="grid content-start gap-2">
      <span className="text-sm font-semibold" id={`${id}-label`}>
        {number}. {document.label}
        {document.required ? (
          <span className="text-ring" aria-hidden="true">
            {' '}
            *
          </span>
        ) : (
          <span className="font-normal text-site-muted"> (opsional)</span>
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
        // Garis 2 px dibagi --site-zoom: di bawah zoom 90% Chrome membulatkan 1,8 px ke 1 px.
        className={cn(
          'grid min-h-36 place-items-center gap-2 rounded-2xl border-[length:calc(2px/var(--site-zoom,1))] border-dashed p-4 text-center text-sm transition-colors',
          file ? 'border-site-green/60 bg-site-green/10' : 'border-site-muted/50 bg-site-paper',
          dragging && 'border-site-ink',
          error && 'border-destructive/70',
        )}
      >
        {file ? (
          <>
            <FileCheck2 className="size-6 text-site-green" aria-hidden="true" />
            <span className="grid gap-0.5">
              <span className="font-semibold break-all">{file.name}</span>
              <span className="text-site-muted">{formatBytes(file.size)} · siap dikirim</span>
            </span>
            <span className="flex gap-2">
              <PillButton tone="outline" size="sm" onClick={() => inputRef.current?.click()}>
                Ganti
                <span className="sr-only"> {document.label}</span>
              </PillButton>
              <PillButton tone="outline" size="sm" onClick={remove}>
                Hapus
                <span className="sr-only"> {document.label}</span>
              </PillButton>
            </span>
          </>
        ) : (
          <button
            ref={pickRef}
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid w-full place-items-center gap-2 rounded-xl py-2 text-site-muted outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            <FileUp className="size-6 text-site-ink" aria-hidden="true" />
            <span className="font-semibold text-site-ink">Pilih berkas</span>
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

// Panel sukses: jendela gelap dengan kode registrasi besar. Fokus dan gulir langsung ke
// sini, agar pembaca layar dan pengguna papan ketik tiba di hasil pendaftaran.
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
  useEffect(() => {
    headingRef.current?.focus()
    headingRef.current?.scrollIntoView({ block: 'center' })
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])
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
    <WindowPanel title="pendaftaran-terkirim" badge="WITA">
      <div className="grid justify-items-center gap-6 py-2 text-center" role="status">
        <span className="flex size-12 items-center justify-center rounded-full bg-site-green text-white">
          <Check className="size-6" aria-hidden="true" />
        </span>
        <div className="grid gap-2">
          <h3
            className="font-site-display text-2xl font-bold focus:outline-none md:text-[28px]"
            tabIndex={-1}
            ref={headingRef}
          >
            Pendaftaran {label} terkirim
          </h3>
          <p className="mx-auto max-w-[52ch] text-base text-white/80">
            Simpan kode registrasi di bawah. Gunakan kode ini di bagian Cek Status untuk melihat
            verifikasi berkas dan jadwal penggembalaan.
          </p>
        </div>
        <div className="grid w-full max-w-md gap-2 rounded-2xl bg-site-panel-2 p-5">
          <span className="text-(length:--site-text-xs) font-medium text-white/70">
            Kode registrasi
          </span>
          <output
            aria-label={`Kode registrasi ${result.registration_code.split('').join(' ')}`}
            className="font-site-mono text-3xl font-medium tracking-[0.12em] break-all text-white select-all sm:text-4xl"
          >
            {result.registration_code}
          </output>
          <span className="text-sm text-white/70">
            Dikirim {formatDate(result.submitted_at)}, {formatTime(result.submitted_at)} WITA
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <PillButton tone="light" onClick={() => void copy()}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? 'Tersalin' : 'Salin kode'}
          </PillButton>
          {canShare && (
            <PillButton tone="glass" onClick={() => void share()}>
              <Share2 aria-hidden="true" />
              Kirim ke WhatsApp/aplikasi lain
            </PillButton>
          )}
          <PillButton tone="glass" onClick={onCheck}>
            <Search aria-hidden="true" />
            Cek status sekarang
          </PillButton>
        </div>
        <p className="mx-auto max-w-[52ch] text-sm text-white/75">
          Kode juga tersimpan di peramban ini. Majelis akan menghubungi {phone} untuk langkah
          berikutnya.
        </p>
        <button
          type="button"
          onClick={onAnother}
          className="rounded-sm text-sm font-semibold text-white underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-site-accent"
        >
          Daftarkan layanan lain
        </button>
      </div>
    </WindowPanel>
  )
}
