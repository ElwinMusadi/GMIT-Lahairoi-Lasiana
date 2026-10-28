import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import type { FieldErrors } from '@shared/accounts'
import {
  CONTENT_BODY_MAX,
  parseContentInput,
  publishProblems,
  type ContentFields,
} from '@shared/contents'
import { witaToday } from '@shared/dates'
import {
  CONTENT_CATEGORY_LABELS,
  type ApiList,
  type ContentCategory,
  type ContentItem,
  type ContentResponse,
  type FinanceFund,
} from '@shared/types'
import { ConfirmDialog, type Confirmation } from '@/components/confirm-dialog'
import { FieldError, FieldHint } from '@/components/form-parts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { UploadField } from '@/components/upload-field'
import { ApiError, api } from '@/lib/api'
import {
  CATEGORY_CONFIG,
  CATEGORY_ORDER,
  STATUS_LABELS,
  STATUS_PILL,
  apiFailure,
  contentsBase,
  fromWitaInputs,
  joinPaymentTitle,
  nextSunday,
  splitPaymentTitle,
  toWitaInputs,
} from '@/lib/contents'
import { formatLongDate } from '@/lib/finance'
import { formatDate, formatTime } from '@/lib/format'
import { describedBy, inputClass, selectClass, textareaClass } from '@/lib/form'
import { useCurrentUser } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'
import { cn } from '@/lib/utils'

// Tambah dan ubah konten Portal Publik: /dashboard/contents/new?category=…,
// /dashboard/contents/:id (Admin) dan /dashboard/renungan/… (Pendeta, hanya Renungan).
export default function ContentEditorPage() {
  const me = useCurrentUser()
  const { id } = useParams()
  const [params] = useSearchParams()
  const base = contentsBase(me.role)
  const existing = useApiQuery<ContentResponse>(id ? `/contents/${id}` : null)
  // Setelah draf disimpan, form dimuat ulang dari data terbaru.
  const [saved, setSaved] = useState<ContentItem | null>(null)

  const requested = (params.get('category') ?? '').toUpperCase() as ContentCategory
  const newCategory: ContentCategory =
    me.role === 'PASTOR' ? 'DEVOTIONAL' : CATEGORY_ORDER.includes(requested) ? requested : 'NEWS'

  if (id && !existing.data && !saved) {
    return (
      <div className="grid gap-4">
        <BackLink base={base} category={newCategory} pastor={me.role === 'PASTOR'} />
        {existing.error ? (
          <p className="text-sm text-muted-foreground">
            Konten tidak dapat dimuat: {existing.error}{' '}
            <button type="button" onClick={existing.reload} className="font-medium underline">
              Coba lagi
            </button>
          </p>
        ) : (
          <div className="grid gap-3" aria-hidden="true">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-96 w-full max-w-4xl" />
          </div>
        )}
      </div>
    )
  }

  const content = saved ?? existing.data?.content ?? null
  return (
    <ContentForm
      key={content ? `${content.id}-${content.updated_at}` : 'new'}
      content={content}
      initialCategory={content?.category ?? newCategory}
      base={base}
      onSavedDraft={setSaved}
    />
  )
}

function BackLink({
  base,
  category,
  pastor,
}: {
  base: string
  category: ContentCategory
  pastor: boolean
}) {
  return (
    <Link
      to={pastor ? base : `${base}?category=${category}`}
      className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {pastor ? 'Renungan Saya' : `Warta & Konten · ${CATEGORY_CONFIG[category].tab}`}
    </Link>
  )
}

type FormState = {
  category: ContentCategory
  title: string
  bank: string
  purpose: string
  slug: string
  summary: string
  content_body: string
  attachment_url: string | null
  link: string
  thumbnail_url: string | null
  is_published: boolean
  date: string
  time: string
}

function initialState(content: ContentItem | null, category: ContentCategory): FormState {
  const today = witaToday()
  const payment = splitPaymentTitle(content?.title ?? '')
  const { date, time } = toWitaInputs(content?.published_at ?? null)
  const isLink = content?.attachment_url?.startsWith('https://') ?? false
  return {
    category,
    title:
      content?.title ??
      (category === 'WARTA' ? `Warta Jemaat Minggu, ${formatLongDate(nextSunday(today))}` : ''),
    bank: payment.bank,
    purpose: payment.purpose,
    slug: content?.slug ?? '',
    summary: content?.summary ?? '',
    content_body: content?.content_body ?? '',
    attachment_url: isLink ? null : (content?.attachment_url ?? null),
    link: isLink ? (content?.attachment_url ?? '') : '',
    thumbnail_url: content?.thumbnail_url ?? null,
    is_published: content?.is_published ?? false,
    date,
    time,
  }
}

// Body untuk API. Field yang tidak dipakai kategori ini dikosongkan.
function toRequest(state: FormState, content: ContentItem | null) {
  const config = CATEGORY_CONFIG[state.category]
  const attachment =
    config.attachment?.type === 'link'
      ? state.link.trim() || null
      : config.attachment
        ? state.attachment_url
        : null
  const body: Record<string, unknown> = {
    category: state.category,
    title:
      state.category === 'PAYMENT_INFO' ? joinPaymentTitle(state.bank, state.purpose) : state.title,
    summary: state.summary,
    content_body: config.body === 'hidden' ? null : state.content_body,
    attachment_url: attachment,
    thumbnail_url: config.thumbnail ? state.thumbnail_url : null,
    is_published: state.is_published,
    published_at: fromWitaInputs(state.date, state.time),
  }
  // Alamat hanya dikirim bila diubah; dikosongkan berarti dibuat ulang dari judul.
  const slug = state.slug.trim().toLowerCase()
  if (content ? slug !== content.slug : slug) body.slug = slug || null
  return body
}

function ContentForm({
  content,
  initialCategory,
  base,
  onSavedDraft,
}: {
  content: ContentItem | null
  initialCategory: ContentCategory
  base: string
  onSavedDraft: (content: ContentItem) => void
}) {
  const me = useCurrentUser()
  const isPastor = me.role === 'PASTOR'
  const navigate = useNavigate()
  const [initial] = useState(() => initialState(content, initialCategory))
  const [state, setState] = useState(initial)
  const [busy, setBusy] = useState({ attachment: false, thumbnail: false })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const funds = useApiQuery<ApiList<FinanceFund>>(
    state.category === 'PAYMENT_INFO' && !isPastor ? '/finance/funds' : null,
  )

  const config = CATEGORY_CONFIG[state.category]
  const dirty = JSON.stringify(state) !== JSON.stringify(initial)
  const uploading = busy.attachment || busy.thumbnail
  const leaving = useRef(false)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !leaving.current && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const listHref = isPastor ? base : `${base}?category=${state.category}`
  // Waktu halaman dibuka, pembanding "waktu terbit di masa depan" untuk label tombol.
  const [openedAt] = useState(() => Date.now())
  const future =
    state.date !== '' && Date.parse(fromWitaInputs(state.date, state.time) ?? '') > openedAt
  const submitLabel = !state.is_published
    ? 'Simpan draf'
    : future
      ? 'Simpan & jadwalkan'
      : content?.status === 'PUBLISHED'
        ? 'Simpan perubahan'
        : 'Simpan & terbitkan'

  function set<K extends keyof FormState>(key: K, value: FormState[K], ...clear: string[]) {
    setState((previous) => ({ ...previous, [key]: value }))
    const fields = [String(key), ...clear]
    if (fields.some((field) => errors[field])) {
      setErrors((previous) => {
        const next = { ...previous }
        for (const field of fields) delete next[field]
        return next
      })
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = toRequest(state, content)
    // Pemeriksaan yang sama dengan API, sebelum dikirim.
    const { input, details } = parseContentInput(body, 'create')
    if (Object.keys(details).length === 0) {
      const next = {
        summary: null,
        content_body: null,
        attachment_url: null,
        thumbnail_url: null,
        published_at: null,
        is_published: false,
        ...input,
        slug: '',
      } as ContentFields
      Object.assign(details, publishProblems(next))
    }
    const mapped = mapErrors(details, state.category)
    setErrors(mapped)
    setFormError(null)
    if (Object.keys(mapped).length > 0) {
      focusFirst(mapped)
      return
    }

    setSubmitting(true)
    try {
      const { content: savedContent } = content
        ? await api.put<ContentResponse>(`/contents/${content.id}`, body)
        : await api.post<ContentResponse>('/contents', body)
      const noun = CATEGORY_CONFIG[savedContent.category].noun
      leaving.current = true
      if (savedContent.status === 'DRAFT') {
        toast.success(`Draf ${noun} tersimpan. Belum tampil di portal.`)
        onSavedDraft(savedContent)
        if (!content) navigate(`${base}/${savedContent.id}`, { replace: true })
        leaving.current = false
      } else {
        toast.success(
          savedContent.status === 'SCHEDULED'
            ? `“${savedContent.title}” terjadwal terbit ${formatDate(savedContent.published_at ?? '')} pukul ${formatTime(savedContent.published_at ?? '')}.`
            : content?.status === 'PUBLISHED'
              ? `Perubahan pada “${savedContent.title}” disimpan dan tampil di portal.`
              : `“${savedContent.title}” terbit di portal.`,
        )
        navigate(isPastor ? base : `${base}?category=${savedContent.category}`)
      }
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.details).length > 0) {
        const fieldErrors = mapErrors(err.details, state.category)
        setErrors(fieldErrors)
        focusFirst(fieldErrors)
      }
      setFormError(apiFailure(err).message)
    } finally {
      setSubmitting(false)
    }
  }

  function confirmDelete() {
    if (!content) return
    setConfirmation({
      title: `Hapus “${content.title}”?`,
      description:
        content.status === 'DRAFT'
          ? 'Draf ini akan dihapus. Berkas yang sudah diunggah tetap tersimpan.'
          : 'Konten ini langsung hilang dari portal dan tautannya tidak berlaku lagi. Untuk menyembunyikan sementara, matikan "Terbit di portal" lalu simpan.',
      confirmLabel: 'Hapus konten',
      destructive: true,
      onConfirm: async () => {
        await api.delete(`/contents/${content.id}`)
        leaving.current = true
        toast.success(`“${content.title}” dihapus.`)
        navigate(listHref)
      },
    })
  }

  const heading = content
    ? `Ubah ${config.noun}`
    : `${config.addLabel.charAt(0).toUpperCase()}${config.addLabel.slice(1)}`

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid gap-1.5">
          <BackLink base={base} category={state.category} pastor={isPastor} />
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">{heading}</h1>
          <StatusLine content={content} dirty={dirty} />
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="lg">
            <Link to={listHref}>Batal</Link>
          </Button>
          <Button type="submit" size="lg" disabled={submitting || uploading}>
            {submitting ? 'Menyimpan…' : uploading ? 'Menunggu unggahan…' : submitLabel}
          </Button>
        </div>
      </header>

      <div role="alert" aria-live="assertive" className="empty:hidden">
        {formError && (
          <p className="rounded-lg border border-destructive/40 bg-negative-soft px-4 py-3 text-sm text-negative-ink">
            {formError}
          </p>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section
          aria-label={`Rincian ${config.noun}`}
          className="grid min-w-0 gap-5 rounded-lg border bg-card p-5 sm:p-6"
        >
          {state.category === 'PAYMENT_INFO' ? (
            <PaymentFields
              state={state}
              errors={errors}
              set={set}
              funds={funds.data?.data ?? []}
              onBusy={(value) => setBusy((previous) => ({ ...previous, thumbnail: value }))}
            />
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="title">Judul</Label>
                <Input
                  id="title"
                  value={state.title}
                  onChange={(event) => set('title', event.target.value)}
                  autoComplete="off"
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={describedBy(errors, 'title')}
                  className={cn(inputClass, 'text-base font-medium md:text-base')}
                />
                <FieldError id="title-error" messages={errors.title} />
              </div>

              {/* Media dan Warta dimulai dari berkasnya: foto atau PDF. */}
              {state.category === 'MEDIA' && config.thumbnail && (
                <UploadField
                  id="thumbnail_url"
                  label={config.thumbnail.label}
                  folder={config.thumbnail.folder}
                  kind="image"
                  value={state.thumbnail_url}
                  onChange={(url) => set('thumbnail_url', url)}
                  onBusyChange={(value) =>
                    setBusy((previous) => ({ ...previous, thumbnail: value }))
                  }
                  emptyText="Foto JPG, PNG, atau WebP, maksimal 10 MB."
                  error={errors.thumbnail_url?.[0]}
                />
              )}
              {config.attachment?.type === 'file' && config.attachment.required && (
                <AttachmentField state={state} errors={errors} set={set} setBusy={setBusy} />
              )}

              <div className="grid gap-2">
                <Label htmlFor="summary">{config.summaryLabel}</Label>
                {state.category === 'DEVOTIONAL' ? (
                  <Input
                    id="summary"
                    value={state.summary}
                    onChange={(event) => set('summary', event.target.value)}
                    autoComplete="off"
                    aria-invalid={Boolean(errors.summary)}
                    aria-describedby={describedBy(errors, 'summary', 'summary-hint')}
                    className={inputClass}
                  />
                ) : (
                  <textarea
                    id="summary"
                    rows={2}
                    value={state.summary}
                    onChange={(event) => set('summary', event.target.value)}
                    aria-invalid={Boolean(errors.summary)}
                    aria-describedby={describedBy(errors, 'summary', 'summary-hint')}
                    className={textareaClass}
                  />
                )}
                {config.summaryHint && (
                  <FieldHint id="summary-hint">{config.summaryHint}</FieldHint>
                )}
                <FieldError id="summary-error" messages={errors.summary} />
              </div>

              {config.body !== 'hidden' && (
                <BodyEditor
                  label={config.bodyLabel}
                  required={config.body === 'required'}
                  value={state.content_body}
                  onChange={(value) => set('content_body', value)}
                  error={errors.content_body}
                />
              )}

              {state.category === 'MEDIA' && (
                <div className="grid gap-2">
                  <Label htmlFor="link">Tautan video (opsional)</Label>
                  <Input
                    id="link"
                    type="url"
                    inputMode="url"
                    placeholder="https://youtube.com/watch?v=…"
                    value={state.link}
                    onChange={(event) => set('link', event.target.value, 'attachment_url')}
                    aria-invalid={Boolean(errors.attachment_url)}
                    aria-describedby={describedBy(errors, 'attachment_url', 'link-hint')}
                    className={inputClass}
                  />
                  <FieldHint id="link-hint">
                    Video dokumentasi di YouTube atau layanan lain, diawali https://.
                  </FieldHint>
                  <FieldError id="attachment_url-error" messages={errors.attachment_url} />
                </div>
              )}

              {state.category !== 'MEDIA' && config.thumbnail && (
                <UploadField
                  id="thumbnail_url"
                  label={config.thumbnail.label}
                  folder={config.thumbnail.folder}
                  kind="image"
                  value={state.thumbnail_url}
                  onChange={(url) => set('thumbnail_url', url)}
                  onBusyChange={(value) =>
                    setBusy((previous) => ({ ...previous, thumbnail: value }))
                  }
                  emptyText="Foto JPG, PNG, atau WebP, maksimal 10 MB. Opsional."
                  error={errors.thumbnail_url?.[0]}
                />
              )}
              {config.attachment?.type === 'file' && !config.attachment.required && (
                <AttachmentField state={state} errors={errors} set={set} setBusy={setBusy} />
              )}
            </>
          )}
        </section>

        <aside className="grid gap-5 rounded-lg border bg-card p-5">
          <PublishFields state={state} errors={errors} set={set} future={future} />
          {!isPastor && (
            <div className="grid gap-2 border-t border-rule pt-5">
              <Label htmlFor="category">Kategori</Label>
              <select
                id="category"
                value={state.category}
                onChange={(event) => set('category', event.target.value as ContentCategory)}
                className={selectClass}
              >
                {CATEGORY_ORDER.map((category) => (
                  <option key={category} value={category}>
                    {CONTENT_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid gap-2 border-t border-rule pt-5">
            <Label htmlFor="slug">Alamat</Label>
            <Input
              id="slug"
              value={state.slug}
              onChange={(event) => set('slug', event.target.value)}
              placeholder="Dibuat dari judul"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(errors.slug)}
              aria-describedby={describedBy(errors, 'slug', 'slug-hint')}
              className={inputClass}
            />
            <FieldHint id="slug-hint">
              {content
                ? 'Mengubah alamat membuat tautan lama tidak berlaku. Kosongkan untuk membuat ulang dari judul.'
                : 'Huruf kecil, angka, dan tanda hubung. Kosong: dibuat dari judul.'}
            </FieldHint>
            <FieldError id="slug-error" messages={errors.slug} />
          </div>
          {content && (
            <div className="grid gap-3 border-t border-rule pt-5 text-[0.8125rem] text-muted-foreground">
              <p>
                Ditulis {content.author_name ?? 'akun terhapus'} · dibuat{' '}
                {formatDate(content.created_at)}, diubah {formatDate(content.updated_at)}{' '}
                {formatTime(content.updated_at)}
              </p>
              <Button
                type="button"
                variant="ghost"
                className="w-fit text-destructive"
                onClick={confirmDelete}
              >
                <Trash2 data-icon="inline-start" />
                Hapus {config.noun}
              </Button>
            </div>
          )}
        </aside>
      </div>

      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
      <AlertDialog open={blocker.state === 'blocked'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tinggalkan tanpa menyimpan?</AlertDialogTitle>
            <AlertDialogDescription>
              Perubahan pada {config.noun} ini belum disimpan dan akan hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>Tetap di sini</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => blocker.proceed?.()}>
              Tinggalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}

// Info Persembahan: judul tersusun dari bank dan keperluannya (mis. Pos Kas), nomor
// rekening di ringkasan, atas nama di isi, gambar QRIS sebagai gambar.
function PaymentFields({
  state,
  errors,
  set,
  funds,
  onBusy,
}: {
  state: FormState
  errors: FieldErrors
  set: <K extends keyof FormState>(key: K, value: FormState[K], ...clear: string[]) => void
  funds: FinanceFund[]
  onBusy: (busy: boolean) => void
}) {
  return (
    <>
      <div className="grid gap-x-3 gap-y-5 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <Label htmlFor="bank">Bank</Label>
          <Input
            id="bank"
            value={state.bank}
            onChange={(event) => set('bank', event.target.value, 'title')}
            placeholder="mis. Bank NTT"
            autoComplete="off"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={describedBy(errors, 'title')}
            className={inputClass}
          />
          <FieldError id="title-error" messages={errors.title} />
        </div>
        <div className="grid content-start gap-2">
          <Label htmlFor="purpose">Untuk</Label>
          <Input
            id="purpose"
            list="pilihan-pos-kas"
            value={state.purpose}
            onChange={(event) => set('purpose', event.target.value, 'title')}
            placeholder="mis. Kas Pembangunan"
            autoComplete="off"
            aria-describedby="purpose-hint"
            className={inputClass}
          />
          <datalist id="pilihan-pos-kas">
            <option value="Persembahan umum" />
            {funds
              .filter((fund) => fund.is_active)
              .map((fund) => (
                <option key={fund.id} value={fund.name} />
              ))}
          </datalist>
          <FieldHint id="purpose-hint">Pos Kas atau keperluan persembahan.</FieldHint>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="summary">Nomor rekening</Label>
        <Input
          id="summary"
          value={state.summary}
          onChange={(event) => set('summary', event.target.value)}
          placeholder="mis. 001.01.02.012345-6"
          autoComplete="off"
          aria-invalid={Boolean(errors.summary)}
          aria-describedby={describedBy(errors, 'summary', 'summary-hint')}
          className={cn(inputClass, 'tabular-nums')}
        />
        <FieldHint id="summary-hint">{CATEGORY_CONFIG.PAYMENT_INFO.summaryHint}</FieldHint>
        <FieldError id="summary-error" messages={errors.summary} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="content_body">Atas nama dan catatan</Label>
        <textarea
          id="content_body"
          rows={3}
          value={state.content_body}
          onChange={(event) => set('content_body', event.target.value)}
          placeholder="mis. a.n. GMIT Jemaat Lahairoi Tuak Sabu Lasiana"
          aria-invalid={Boolean(errors.content_body)}
          aria-describedby={describedBy(errors, 'content_body')}
          className={textareaClass}
        />
        <FieldError id="content_body-error" messages={errors.content_body} />
      </div>
      <UploadField
        id="thumbnail_url"
        label="Gambar QRIS"
        folder="konten"
        kind="image"
        value={state.thumbnail_url}
        onChange={(url) => set('thumbnail_url', url, 'summary')}
        onBusyChange={onBusy}
        emptyText="Gambar kode QRIS resmi (PNG atau JPG), maksimal 10 MB. Opsional bila nomor rekening diisi."
        error={errors.thumbnail_url?.[0]}
      />
    </>
  )
}

function AttachmentField({
  state,
  errors,
  set,
  setBusy,
}: {
  state: FormState
  errors: FieldErrors
  set: <K extends keyof FormState>(key: K, value: FormState[K], ...clear: string[]) => void
  setBusy: (
    update: (previous: { attachment: boolean; thumbnail: boolean }) => {
      attachment: boolean
      thumbnail: boolean
    },
  ) => void
}) {
  const attachment = CATEGORY_CONFIG[state.category].attachment
  if (attachment?.type !== 'file') return null
  return (
    <UploadField
      id="attachment_url"
      label={attachment.label}
      folder={attachment.folder}
      kind={attachment.kind}
      value={state.attachment_url}
      onChange={(url) => set('attachment_url', url)}
      onBusyChange={(value) => setBusy((previous) => ({ ...previous, attachment: value }))}
      emptyText={
        attachment.kind === 'pdf'
          ? 'PDF Warta Jemaat, maksimal 10 MB. Wajib sebelum diterbitkan.'
          : 'PDF atau gambar, maksimal 10 MB.'
      }
      error={errors.attachment_url?.[0]}
    />
  )
}

function PublishFields({
  state,
  errors,
  set,
  future,
}: {
  state: FormState
  errors: FieldErrors
  set: <K extends keyof FormState>(key: K, value: FormState[K], ...clear: string[]) => void
  future: boolean
}) {
  return (
    <div className="grid gap-4">
      <label className="flex items-start justify-between gap-4">
        <span className="grid gap-0.5">
          <span className="text-sm font-medium">Terbit di portal</span>
          <span className="text-[0.8125rem] text-muted-foreground">
            {state.is_published
              ? future
                ? 'Terjadwal: tampil mulai waktu terbit.'
                : 'Tampil di portal setelah disimpan.'
              : 'Draf: hanya terlihat di dashboard.'}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={state.is_published}
          onChange={(event) => set('is_published', event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            'relative mt-0.5 inline-flex h-6 w-10 flex-none rounded-full border-2 border-transparent transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50',
            state.is_published ? 'bg-primary' : 'bg-input',
          )}
        >
          <span
            className={cn(
              'block size-5 rounded-full bg-card transition-transform',
              state.is_published ? 'translate-x-4' : 'translate-x-0',
            )}
          />
        </span>
      </label>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Waktu terbit (WITA)</legend>
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2">
          <Input
            id="published_at"
            type="date"
            aria-label="Tanggal terbit"
            value={state.date}
            onChange={(event) => set('date', event.target.value, 'published_at')}
            aria-invalid={Boolean(errors.published_at)}
            aria-describedby={describedBy(errors, 'published_at', 'published_at-hint')}
            className={inputClass}
          />
          <Input
            type="time"
            aria-label="Jam terbit"
            value={state.time}
            disabled={!state.date}
            onChange={(event) => set('time', event.target.value, 'published_at')}
            className={inputClass}
          />
        </div>
        <FieldHint id="published_at-hint">
          Kosong: saat disimpan. Tanggal yang akan datang menjadwalkan konten, mis. renungan untuk
          esok hari.
        </FieldHint>
        <FieldError id="published_at-error" messages={errors.published_at} />
      </fieldset>
    </div>
  )
}

// Editor teks biasa dengan pratinjau seperti di portal: paragraf dipisah baris kosong.
function BodyEditor({
  label,
  required,
  value,
  onChange,
  error,
}: {
  label: string
  required: boolean
  value: string
  onChange: (value: string) => void
  error?: string[]
}) {
  const [preview, setPreview] = useState(false)
  const paragraphs = value
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  return (
    <div className="grid gap-2">
      <div className="flex items-end justify-between gap-3">
        <Label htmlFor="content_body">
          {label}
          {!required && <span className="font-normal text-muted-foreground"> (opsional)</span>}
        </Label>
        <div role="group" aria-label="Mode editor" className="flex rounded-md border p-0.5 text-xs">
          {[
            { value: false, label: 'Tulis' },
            { value: true, label: 'Pratinjau' },
          ].map((mode) => (
            <button
              key={mode.label}
              type="button"
              aria-pressed={preview === mode.value}
              onClick={() => setPreview(mode.value)}
              className={cn(
                'rounded px-2.5 py-1',
                preview === mode.value
                  ? 'bg-primary font-medium text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
      {preview ? (
        <div className="min-h-64 rounded-lg border bg-background px-4 py-3 text-[0.9375rem] leading-relaxed">
          {paragraphs.length === 0 ? (
            <p className="text-muted-foreground">Belum ada isi.</p>
          ) : (
            paragraphs.map((paragraph, index) => (
              <p key={index} className="mb-3 whitespace-pre-line last:mb-0">
                {paragraph}
              </p>
            ))
          )}
        </div>
      ) : (
        <textarea
          id="content_body"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={['content_body-hint', error ? 'content_body-error' : null]
            .filter(Boolean)
            .join(' ')}
          className={cn(textareaClass, 'min-h-64 leading-relaxed [field-sizing:content]')}
        />
      )}
      <FieldHint id="content_body-hint">
        Pisahkan paragraf dengan satu baris kosong. {value.length.toLocaleString('id-ID')} /{' '}
        {CONTENT_BODY_MAX.toLocaleString('id-ID')} karakter.
      </FieldHint>
      <FieldError id="content_body-error" messages={error} />
    </div>
  )
}

function StatusLine({ content, dirty }: { content: ContentItem | null; dirty: boolean }) {
  const parts: ReactNode[] = []
  if (content) {
    parts.push(
      <span
        key="status"
        className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_PILL[content.status])}
      >
        {STATUS_LABELS[content.status]}
      </span>,
    )
    if (content.published_at && content.status !== 'DRAFT') {
      parts.push(
        `${content.status === 'SCHEDULED' ? 'Terbit' : 'Terbit sejak'} ${formatDate(content.published_at)}, ${formatTime(content.published_at)}`,
      )
    }
  } else {
    parts.push('Belum disimpan')
  }
  if (dirty && content) parts.push('Ada perubahan yang belum disimpan')
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground tabular-nums">
      {parts.map((part, index) => (
        <span key={index} className="inline-flex items-center gap-2">
          {index > 0 && <span aria-hidden="true">·</span>}
          {part}
        </span>
      ))}
    </p>
  )
}

// Kesalahan judul pada Info Persembahan ditampilkan di field Bank; tautan video Media
// memakai attachment_url.
function mapErrors(details: FieldErrors, category: ContentCategory): FieldErrors {
  if (category !== 'PAYMENT_INFO' || !details.title) return details
  return {
    ...details,
    title: details.title.map((message) => message.replace('Judul', 'Nama bank')),
  }
}

const FOCUS_ORDER = [
  'title',
  'attachment_url',
  'summary',
  'content_body',
  'thumbnail_url',
  'published_at',
  'slug',
]

function focusFirst(errors: FieldErrors) {
  const first = FOCUS_ORDER.find((key) => errors[key])
  if (!first) return
  const target =
    first === 'title'
      ? (document.getElementById('title') ?? document.getElementById('bank'))
      : first === 'attachment_url'
        ? (document.getElementById('link') ??
          document.querySelector<HTMLElement>('[aria-labelledby="attachment_url-label"]'))
        : first === 'thumbnail_url'
          ? document.querySelector<HTMLElement>('[aria-labelledby="thumbnail_url-label"]')
          : document.getElementById(first)
  target?.focus()
  if (target?.classList.contains('sr-only')) {
    target.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}
