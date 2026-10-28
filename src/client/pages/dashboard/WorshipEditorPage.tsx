import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowLeft,
  ClipboardList,
  ExternalLink,
  FileText,
  Plus,
  TriangleAlert,
  X,
} from 'lucide-react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import type { FieldErrors } from '@shared/accounts'
import { isCalendarDate, witaToday } from '@shared/dates'
import {
  SERVANT_ROLES,
  SERVANT_ROLE_LABELS,
  type ApiList,
  type ApiPage,
  type RayonListItem,
  type ServantRole,
  type WorshipCategory,
  type WorshipItem,
  type WorshipResponse,
} from '@shared/types'
import {
  parseServantsInput,
  parseWorshipInput,
  worshipProblems,
  type WorshipFields,
} from '@shared/worship'
import { SegmentedChoice } from '@/components/finance/money-fields'
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
import { AttendanceDialog } from '@/components/worship/attendance-dialog'
import { ApiError, api, errorMessage } from '@/lib/api'
import { nextSunday } from '@/lib/contents'
import { addDays, formatLongDate } from '@/lib/finance'
import { formatDate, formatTime } from '@/lib/format'
import { describedBy, inputClass, selectClass } from '@/lib/form'
import { useApiQuery } from '@/lib/use-api-query'
import { cn } from '@/lib/utils'
import {
  CATEGORY_ORDER,
  CATEGORY_SHORT,
  attendanceBreakdown,
  conflictPhrase,
  liveConflicts,
  suggestedTitle,
  worshipKind,
  worshipTime,
  type LiveConflict,
} from '@/lib/worship'

const LIST_HREF = '/dashboard/worships'

// Tugas di tata ibadah GMIT yang dicakup tiap peran (PRD: Penugasan Pelayan, Majelis &
// Pemusik).
const ROLE_HINTS: Record<ServantRole, string> = {
  PREACHER: 'Pengkhotbah',
  LITURGIST: 'Pemimpin liturgi',
  ELDER_ON_DUTY: 'Penatua/Diaken: pembaca warta, kolektan',
  SINGER: 'Kantoria, prokantor',
  MUSICIAN: 'Organis, pemain musik',
  MULTIMEDIA: 'Operator proyektor dan suara',
}

// Tambah dan ubah jadwal ibadah beserta petugasnya: /dashboard/worships/new dan
// /dashboard/worships/:id (Admin dan Pendeta).
export default function WorshipEditorPage() {
  const { id } = useParams()
  const existing = useApiQuery<WorshipResponse>(id ? `/worships/${id}` : null)

  if (id && !existing.data) {
    return (
      <div className="grid gap-4">
        <BackLink />
        {existing.error ? (
          <p className="text-sm text-muted-foreground">
            Jadwal tidak dapat dimuat: {existing.error}{' '}
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

  const worship = existing.data?.worship ?? null
  return <WorshipForm key={worship ? worship.id : 'new'} worship={worship} />
}

function BackLink() {
  return (
    <Link
      to={LIST_HREF}
      className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Jadwal Ibadah
    </Link>
  )
}

type ServantRow = {
  key: number
  role: ServantRole
  name: string
  // Tautan ke data jemaat dari API; dilepas bila namanya diubah di sini.
  member_id: number | null
  original: string | null
}

type FormState = {
  category: WorshipCategory
  rayon_id: string
  title: string
  worship_date: string
  worship_time: string
  location: string
  theme: string
  bible_reading: string
  liturgy_file_url: string | null
  is_public: boolean
  servants: ServantRow[]
}

// Setiap tugas tampil dengan minimal satu kotak nama, urut seperti tata ibadah.
function initialState(worship: WorshipItem | null): FormState {
  const rows: ServantRow[] = []
  let key = 0
  for (const role of SERVANT_ROLES) {
    const assigned = worship?.servants.filter((servant) => servant.role === role) ?? []
    for (const servant of assigned) {
      rows.push({
        key: key++,
        role,
        name: servant.servant_name,
        member_id: servant.member_id,
        original: servant.servant_name,
      })
    }
    if (assigned.length === 0) {
      rows.push({ key: key++, role, name: '', member_id: null, original: null })
    }
  }
  return {
    category: worship?.category ?? 'SUNDAY_SERVICE',
    rayon_id: worship?.rayon_id ? String(worship.rayon_id) : '',
    title: worship?.title ?? '',
    worship_date: worship?.worship_date ?? nextSunday(witaToday()),
    worship_time: worship?.worship_time ?? '',
    location: worship?.location ?? '',
    theme: worship?.theme ?? '',
    bible_reading: worship?.bible_reading ?? '',
    liturgy_file_url: worship?.liturgy_file_url ?? null,
    is_public: worship?.is_public ?? false,
    servants: rows,
  }
}

// Petugas yang diisi, dalam bentuk body POST /api/worships/:id/servants.
function servantsBody(rows: ServantRow[]) {
  return rows
    .filter((row) => row.name.trim())
    .map((row) => ({
      row,
      body: {
        role: row.role,
        servant_name: row.name.trim(),
        member_id: row.name.trim() === row.original ? row.member_id : null,
      },
    }))
}

// Kolom yang diperiksa di halaman, urut dari atas untuk fokus ke kesalahan pertama.
const FIELD_ORDER = [
  'category',
  'rayon_id',
  'title',
  'worship_date',
  'worship_time',
  'location',
  'theme',
  'bible_reading',
]

function WorshipForm({ worship }: { worship: WorshipItem | null }) {
  const navigate = useNavigate()
  const [today] = useState(witaToday)
  const [initial] = useState(() => initialState(worship))
  const [state, setState] = useState(initial)
  const nextKey = useRef(initial.servants.length)
  // Bila jadwal baru tersimpan tetapi petugasnya gagal, simpan berikutnya mengubah jadwal itu.
  const [savedId, setSavedId] = useState<number | null>(worship?.id ?? null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [attendanceOf, setAttendanceOf] = useState<WorshipItem | null>(worship)
  const [recording, setRecording] = useState(false)

  const rayons = useApiQuery<ApiList<RayonListItem>>('/rayons')
  const rayonList = rayons.data?.data ?? []
  const rayonName = rayonList.find((rayon) => String(rayon.id) === state.rayon_id)?.name ?? null

  // Jadwal lain pada tanggal yang sama, untuk memeriksa bentrok selagi mengetik.
  const dateValid = isCalendarDate(state.worship_date)
  const sameDay = useApiQuery<ApiPage<WorshipItem>>(dateValid ? '/worships' : null, {
    from: state.worship_date,
    to: state.worship_date,
    per_page: 100,
  })
  const others = state.worship_time
    ? (sameDay.data?.data ?? []).filter(
        (item) =>
          item.id !== savedId &&
          item.worship_date === state.worship_date &&
          item.worship_time === state.worship_time,
      )
    : []
  // Saran nama per tugas dari jadwal sekitar tiga bulan terakhir, agar penulisan nama
  // seragam.
  const recent = useApiQuery<ApiPage<WorshipItem>>('/worships', {
    to: addDays(today, 60),
    sort: 'desc',
    per_page: 100,
  })
  const suggestions = new Map<ServantRole, Set<string>>(
    SERVANT_ROLES.map((role) => [role, new Set<string>()]),
  )
  for (const item of recent.data?.data ?? []) {
    for (const servant of item.servants) suggestions.get(servant.role)?.add(servant.servant_name)
  }

  const conflicts = new Map<number, LiveConflict[]>(
    state.servants.map((row) => [
      row.key,
      liveConflicts({ servant_name: row.name, member_id: row.member_id }, others),
    ]),
  )
  const conflictCount = [...conflicts.values()].filter((list) => list.length > 0).length

  const dirty = JSON.stringify(state) !== JSON.stringify(initial)
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

  const placeholderTitle = suggestedTitle(state.category, rayonName, state.worship_time)

  function set<K extends keyof FormState>(key: K, value: FormState[K], ...clear: string[]) {
    setState((previous) => ({ ...previous, [key]: value }))
    clearErrors(String(key), ...clear)
  }

  function clearErrors(...fields: string[]) {
    if (!fields.some((field) => errors[field])) return
    setErrors((previous) => {
      const next = { ...previous }
      for (const field of fields) delete next[field]
      return next
    })
  }

  function updateServant(key: number, name: string) {
    setState((previous) => ({
      ...previous,
      servants: previous.servants.map((row) => (row.key === key ? { ...row, name } : row)),
    }))
    clearErrors(`servant-${key}`)
  }

  function addServant(role: ServantRole) {
    const key = nextKey.current++
    setState((previous) => {
      // Baris baru ditaruh setelah baris terakhir tugas yang sama.
      const index = previous.servants.findLastIndex((row) => row.role === role)
      const servants = [...previous.servants]
      servants.splice(index + 1, 0, { key, role, name: '', member_id: null, original: null })
      return { ...previous, servants }
    })
    requestAnimationFrame(() => document.getElementById(`servant-${key}`)?.focus())
  }

  function removeServant(row: ServantRow) {
    const siblings = state.servants.filter((item) => item.role === row.role)
    if (siblings.length === 1) {
      updateServant(row.key, '')
      return
    }
    setState((previous) => ({
      ...previous,
      servants: previous.servants.filter((item) => item.key !== row.key),
    }))
    clearErrors(`servant-${row.key}`)
  }

  function scheduleBody() {
    return {
      title: state.title.trim() || placeholderTitle,
      category: state.category,
      rayon_id: state.category === 'RAYON' ? Number(state.rayon_id) || null : null,
      worship_date: state.worship_date,
      worship_time: state.worship_time || null,
      location: state.location,
      theme: state.theme,
      bible_reading: state.bible_reading,
      liturgy_file_url: state.liturgy_file_url,
      is_public: state.is_public,
    }
  }

  // Kesalahan baris petugas dari API (servants.N.field) → kotak namanya.
  function servantErrors(details: FieldErrors, submitted: { row: ServantRow }[]) {
    const mapped: FieldErrors = {}
    for (const [key, messages] of Object.entries(details)) {
      const match = /^servants\.(\d+)/.exec(key)
      const row = match ? submitted[Number(match[1])]?.row : undefined
      if (row) mapped[`servant-${row.key}`] = messages
      else mapped[key] = messages
    }
    return mapped
  }

  function focusFirst(details: FieldErrors) {
    const field =
      FIELD_ORDER.find((key) => details[key]) ??
      state.servants.map((row) => `servant-${row.key}`).find((key) => details[key])
    if (field) document.getElementById(field)?.focus()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = scheduleBody()
    const submitted = servantsBody(state.servants)
    // Pemeriksaan yang sama dengan API, sebelum dikirim.
    const { input, details } = parseWorshipInput(body, 'create')
    if (Object.keys(details).length === 0) {
      Object.assign(details, worshipProblems(input as WorshipFields))
    }
    const servantCheck = parseServantsInput({ servants: submitted.map((item) => item.body) })
    const found = { ...details, ...servantErrors(servantCheck.details, submitted) }
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) {
      setFormError('Periksa kembali isian yang ditandai.')
      focusFirst(found)
      return
    }

    setSubmitting(true)
    let scheduleId = savedId
    try {
      let saved = scheduleId
        ? await api.put<WorshipResponse>(`/worships/${scheduleId}`, body)
        : await api.post<WorshipResponse>('/worships', body)
      scheduleId = saved.worship.id
      setSavedId(scheduleId)

      const before = JSON.stringify(servantsBody(initial.servants).map((item) => item.body))
      const after = JSON.stringify(submitted.map((item) => item.body))
      if (before !== after) {
        try {
          saved = await api.post<WorshipResponse>(`/worships/${scheduleId}/servants`, {
            servants: submitted.map((item) => item.body),
          })
        } catch (err) {
          if (err instanceof ApiError) {
            const mapped = servantErrors(err.details, submitted)
            setErrors(mapped)
            focusFirst(mapped)
          }
          setFormError(
            `Jadwal tersimpan, tetapi petugas belum: ${errorMessage(err)} Perbaiki lalu simpan lagi.`,
          )
          return
        }
      }

      leaving.current = true
      const final = saved.worship
      const where = final.is_public ? ' Tampil di Papan Jadwal portal.' : ''
      if (saved.warnings.length > 0) {
        toast.warning(
          `“${final.title}” tersimpan, tetapi ${saved.warnings.length} tugas petugas bentrok.`,
          { description: saved.warnings.join(' '), duration: 10_000 },
        )
      } else {
        toast.success(`“${final.title}” tersimpan.${where}`)
      }
      navigate(final.worship_date < today ? `${LIST_HREF}?view=past` : LIST_HREF)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.details).length > 0) {
        setErrors(err.details)
        focusFirst(err.details)
      }
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const time = worshipTime(state.worship_time || null)
  const heading = worship ? 'Ubah jadwal ibadah' : 'Jadwal ibadah baru'
  // Kehadiran mengikuti tanggal yang tersimpan, bukan yang sedang diketik.
  const held = attendanceOf !== null && attendanceOf.worship_date <= today

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid gap-1.5">
          <BackLink />
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">{heading}</h1>
          <p className="text-sm text-muted-foreground">
            {dateValid ? formatLongDate(state.worship_date, true) : 'Tanggal belum diisi'}
            {time ? `, ${time} WITA` : ', jam menyusul'}
            {dirty && ' · Perubahan belum disimpan'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="lg">
            <Link to={LIST_HREF}>Batal</Link>
          </Button>
          <Button type="submit" size="lg" disabled={submitting || uploading}>
            {submitting ? 'Menyimpan…' : uploading ? 'Menunggu unggahan…' : 'Simpan jadwal'}
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
        <div className="grid min-w-0 gap-6">
          <section
            aria-labelledby="judul-rincian"
            className="grid gap-5 rounded-lg border bg-card p-5 sm:p-6"
          >
            <h2 id="judul-rincian" className="text-base font-semibold">
              Rincian ibadah
            </h2>
            <SegmentedChoice
              name="category"
              legend="Jenis ibadah"
              options={CATEGORY_ORDER.map((value) => ({ value, label: CATEGORY_SHORT[value] }))}
              value={state.category}
              onChange={(value) => set('category', value, 'rayon_id')}
              error={<FieldError id="category-error" messages={errors.category} />}
            />

            <div
              className={cn(
                'grid gap-x-3 gap-y-5',
                state.category === 'RAYON' && 'sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]',
              )}
            >
              {state.category === 'RAYON' && (
                <div className="grid content-start gap-2">
                  <Label htmlFor="rayon_id">Rayon</Label>
                  <select
                    id="rayon_id"
                    value={state.rayon_id}
                    disabled={!rayons.data}
                    onChange={(event) => set('rayon_id', event.target.value)}
                    aria-invalid={Boolean(errors.rayon_id)}
                    aria-describedby={describedBy(errors, 'rayon_id')}
                    className={selectClass}
                  >
                    <option value="">Pilih rayon</option>
                    {rayonList.map((rayon) => (
                      <option key={rayon.id} value={rayon.id}>
                        {rayon.name}
                      </option>
                    ))}
                  </select>
                  <FieldError id="rayon_id-error" messages={errors.rayon_id} />
                </div>
              )}
              <div className="grid content-start gap-2">
                <Label htmlFor="title">Nama ibadah</Label>
                <Input
                  id="title"
                  value={state.title}
                  onChange={(event) => set('title', event.target.value)}
                  placeholder={placeholderTitle}
                  autoComplete="off"
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={describedBy(errors, 'title', 'title-hint')}
                  className={cn(inputClass, 'font-medium')}
                />
                <FieldHint id="title-hint">Kosong: “{placeholderTitle}”.</FieldHint>
                <FieldError id="title-error" messages={errors.title} />
              </div>
            </div>

            <div className="grid gap-x-3 gap-y-5 sm:grid-cols-[minmax(0,10rem)_minmax(0,8rem)_minmax(0,1fr)]">
              <div className="grid content-start gap-2">
                <Label htmlFor="worship_date">Tanggal</Label>
                <Input
                  id="worship_date"
                  type="date"
                  value={state.worship_date}
                  onChange={(event) => set('worship_date', event.target.value)}
                  aria-invalid={Boolean(errors.worship_date)}
                  aria-describedby={describedBy(errors, 'worship_date')}
                  className={inputClass}
                />
                <FieldError id="worship_date-error" messages={errors.worship_date} />
              </div>
              <div className="grid content-start gap-2">
                <Label htmlFor="worship_time">Jam (WITA)</Label>
                <Input
                  id="worship_time"
                  type="time"
                  value={state.worship_time}
                  onChange={(event) => set('worship_time', event.target.value)}
                  aria-invalid={Boolean(errors.worship_time)}
                  aria-describedby={describedBy(errors, 'worship_time', 'worship_time-hint')}
                  className={inputClass}
                />
                <FieldHint id="worship_time-hint">Kosong: jam menyusul.</FieldHint>
                <FieldError id="worship_time-error" messages={errors.worship_time} />
              </div>
              <div className="grid content-start gap-2">
                <Label htmlFor="location">Lokasi</Label>
                <Input
                  id="location"
                  value={state.location}
                  onChange={(event) => set('location', event.target.value)}
                  placeholder={
                    state.category === 'RAYON'
                      ? 'mis. Rumah Kel. Ndun'
                      : 'mis. Gedung Kebaktian Lahairoi'
                  }
                  autoComplete="off"
                  aria-invalid={Boolean(errors.location)}
                  aria-describedby={describedBy(errors, 'location')}
                  className={inputClass}
                />
                <FieldError id="location-error" messages={errors.location} />
              </div>
            </div>

            <div className="grid gap-x-3 gap-y-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="grid content-start gap-2">
                <Label htmlFor="theme">Tema khotbah</Label>
                <Input
                  id="theme"
                  value={state.theme}
                  onChange={(event) => set('theme', event.target.value)}
                  autoComplete="off"
                  aria-invalid={Boolean(errors.theme)}
                  aria-describedby={describedBy(errors, 'theme')}
                  className={inputClass}
                />
                <FieldError id="theme-error" messages={errors.theme} />
              </div>
              <div className="grid content-start gap-2">
                <Label htmlFor="bible_reading">Bacaan Alkitab</Label>
                <Input
                  id="bible_reading"
                  value={state.bible_reading}
                  onChange={(event) => set('bible_reading', event.target.value)}
                  placeholder="mis. Kolose 3:12–17"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.bible_reading)}
                  aria-describedby={describedBy(errors, 'bible_reading')}
                  className={inputClass}
                />
                <FieldError id="bible_reading-error" messages={errors.bible_reading} />
              </div>
            </div>
          </section>

          <section
            aria-labelledby="judul-petugas"
            aria-describedby="petugas-hint"
            className="grid gap-4 rounded-lg border bg-card p-5 sm:p-6"
          >
            <div className="grid gap-1">
              <h2 id="judul-petugas" className="text-base font-semibold">
                Petugas pelayanan
              </h2>
              <p id="petugas-hint" className="text-[0.8125rem] text-muted-foreground">
                {state.worship_time
                  ? 'Nama diperiksa terhadap ibadah lain pada tanggal dan jam yang sama.'
                  : 'Isi jam ibadah agar bentrok jadwal petugas bisa diperiksa.'}
              </p>
            </div>
            <div aria-live="polite" className="empty:hidden">
              {conflictCount > 0 && (
                <p className="flex items-start gap-2 rounded-lg border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning-ink">
                  <TriangleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
                  <span>
                    <span className="font-medium">
                      {conflictCount} petugas bentrok dengan ibadah lain
                    </span>{' '}
                    pada {formatLongDate(state.worship_date)} pukul {time} WITA. Jadwal tetap bisa
                    disimpan; ganti petugasnya bila perlu.
                  </span>
                </p>
              )}
            </div>

            <div className="grid">
              {SERVANT_ROLES.map((role) => {
                const rows = state.servants.filter((row) => row.role === role)
                const label = SERVANT_ROLE_LABELS[role]
                return (
                  <fieldset
                    key={role}
                    className="grid gap-2 border-t border-rule py-4 first:border-t-0 first:pt-0 last:pb-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4"
                  >
                    <legend className="float-left grid gap-0.5 sm:pt-2">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-[0.8125rem] text-muted-foreground">
                        {ROLE_HINTS[role]}
                      </span>
                    </legend>
                    <div className="grid gap-2">
                      {rows.map((row, index) => (
                        <ServantInput
                          key={row.key}
                          row={row}
                          label={rows.length > 1 ? `${label} ${index + 1}` : label}
                          listId={`saran-${role}`}
                          conflicts={conflicts.get(row.key) ?? []}
                          error={errors[`servant-${row.key}`]}
                          removable={rows.length > 1 || row.name !== ''}
                          onChange={(name) => updateServant(row.key, name)}
                          onRemove={() => removeServant(row)}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => addServant(role)}
                        className="inline-flex w-fit items-center gap-1 text-[0.8125rem] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                        Tambah {label.toLowerCase()}
                      </button>
                    </div>
                    <datalist id={`saran-${role}`}>
                      {[...(suggestions.get(role) ?? [])].map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </fieldset>
                )
              })}
            </div>
          </section>
        </div>

        <aside className="grid gap-5 rounded-lg border bg-card p-5">
          <label className="flex items-start justify-between gap-4">
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">Tampil di portal</span>
              <span className="text-[0.8125rem] text-muted-foreground">
                {state.is_public
                  ? 'Muncul di Papan Jadwal Ibadah portal publik setelah disimpan.'
                  : 'Internal: hanya terlihat di dashboard.'}
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={state.is_public}
              onChange={(event) => set('is_public', event.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                'relative mt-0.5 inline-flex h-6 w-10 flex-none rounded-full border-2 border-transparent transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50',
                state.is_public ? 'bg-primary' : 'bg-input',
              )}
            >
              <span
                className={cn(
                  'block size-5 rounded-full bg-card transition-transform',
                  state.is_public ? 'translate-x-4' : 'translate-x-0',
                )}
              />
            </span>
          </label>

          <div className="grid gap-2 border-t border-rule pt-5">
            <UploadField
              id="liturgy_file_url"
              label="Tata ibadah (liturgi)"
              folder="liturgi"
              kind="pdf"
              value={state.liturgy_file_url}
              onChange={(url) => set('liturgy_file_url', url)}
              onBusyChange={setUploading}
              emptyText="PDF, maksimal 10 MB."
              preview={(url) => <LiturgyLink url={url} />}
              error={errors.liturgy_file_url?.[0]}
              hint={
                <FieldHint id="liturgy-hint">
                  {state.is_public
                    ? 'Tampil sebagai tautan unduh di Papan Jadwal portal.'
                    : 'Tautan unduh muncul di portal bila jadwal ditampilkan di portal.'}
                </FieldHint>
              }
            />
            {state.is_public && worship?.is_public && (
              <Link
                to="/jadwal"
                target="_blank"
                className="inline-flex w-fit items-center gap-1 text-[0.8125rem] font-medium underline-offset-4 hover:underline"
              >
                Lihat Papan Jadwal
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span className="sr-only">(tab baru)</span>
              </Link>
            )}
          </div>

          {attendanceOf && (
            <div className="grid gap-2 border-t border-rule pt-5">
              <p className="text-sm font-medium">Kehadiran</p>
              {attendanceOf.attendance_total !== null ? (
                <>
                  <p className="text-2xl font-semibold tabular-nums">
                    {attendanceOf.attendance_total.toLocaleString('id-ID')}
                    <span className="ml-1.5 text-sm font-normal text-muted-foreground">orang</span>
                  </p>
                  <p className="text-[0.8125rem] text-muted-foreground tabular-nums">
                    {attendanceBreakdown(attendanceOf)}
                  </p>
                </>
              ) : (
                <p className="text-[0.8125rem] text-muted-foreground">
                  {held ? 'Belum dicatat.' : 'Dapat dicatat setelah ibadah berlangsung.'}
                </p>
              )}
              {held && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit"
                  onClick={() => setRecording(true)}
                >
                  <ClipboardList data-icon="inline-start" />
                  {attendanceOf.attendance_total !== null ? 'Ubah kehadiran' : 'Catat kehadiran'}
                </Button>
              )}
            </div>
          )}

          {worship && (
            <p className="border-t border-rule pt-5 text-[0.8125rem] text-muted-foreground">
              {worshipKind(worship)} · dibuat {formatDate(worship.created_at)}, diubah{' '}
              {formatDate(worship.updated_at)} {formatTime(worship.updated_at)}
            </p>
          )}
        </aside>
      </div>

      <AttendanceDialog
        worship={recording ? attendanceOf : null}
        onClose={() => setRecording(false)}
        onSaved={(saved) => {
          setRecording(false)
          setAttendanceOf(saved)
        }}
      />
      <AlertDialog open={blocker.state === 'blocked'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tinggalkan tanpa menyimpan?</AlertDialogTitle>
            <AlertDialogDescription>
              Perubahan pada jadwal ibadah ini belum disimpan dan akan hilang.
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

function ServantInput({
  row,
  label,
  listId,
  conflicts,
  error,
  removable,
  onChange,
  onRemove,
}: {
  row: ServantRow
  label: string
  listId: string
  conflicts: LiveConflict[]
  error?: string[]
  removable: boolean
  onChange: (name: string) => void
  onRemove: () => void
}) {
  const id = `servant-${row.key}`
  const warningId = `${id}-conflict`
  const clashing = conflicts.length > 0
  return (
    <div className="grid gap-1.5">
      <div className="flex gap-2">
        <Input
          id={id}
          list={listId}
          value={row.name}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Nama petugas"
          autoComplete="off"
          aria-label={label}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [clashing ? warningId : null, error ? `${id}-error` : null].filter(Boolean).join(' ') ||
            undefined
          }
          className={cn(inputClass, clashing && 'border-warning-border ring-1 ring-warning-border')}
        />
        {removable && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 flex-none text-muted-foreground"
            onClick={onRemove}
          >
            <X />
            <span className="sr-only">
              Hapus {label}
              {row.name ? ` ${row.name}` : ''}
            </span>
          </Button>
        )}
      </div>
      {clashing && (
        <p id={warningId} className="flex items-start gap-1.5 text-[0.8125rem] text-warning-ink">
          <TriangleAlert className="mt-0.5 size-3.5 flex-none" aria-hidden="true" />
          <span>
            Bentrok: juga bertugas sebagai{' '}
            {conflicts.map((conflict, index) => (
              <span key={`${conflict.worship_id}-${conflict.role}`}>
                {index > 0 && ' dan '}
                {conflictPhrase(conflict)} ({conflict.kind})
              </span>
            ))}{' '}
            pada jam yang sama.
          </span>
        </p>
      )}
      <FieldError id={`${id}-error`} messages={error} />
    </div>
  )
}

function LiturgyLink({ url }: { url: string }): ReactNode {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-w-0 items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
    >
      <FileText className="size-4 flex-none text-muted-foreground" aria-hidden="true" />
      <span className="truncate">Buka tata ibadah</span>
      <ExternalLink className="size-3.5 flex-none text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">(tab baru)</span>
    </a>
  )
}
