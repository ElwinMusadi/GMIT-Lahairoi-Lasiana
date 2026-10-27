import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { ArrowLeft, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { IMPORT_COLUMNS, IMPORT_MAX_ROWS } from '@shared/member-import'
import {
  FAMILY_RELATION_LABELS,
  type ImportRowStatus,
  type MemberImportResult,
  type MemberImportRow,
} from '@shared/types'
import { Button } from '@/components/ui/button'
import { api, errorMessage } from '@/lib/api'
import {
  downloadSkippedRows,
  downloadTemplate,
  toImportRows,
  type ImportRows,
} from '@/lib/member-files'
import { readSpreadsheet } from '@/lib/read-spreadsheet'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 100

type Loaded = { fileName: string; rows: ImportRows; ignored: string[] }
type View = 'all' | ImportRowStatus

const STATUS_PILL: Record<ImportRowStatus, { label: string; className: string }> = {
  new: { label: 'Siap', className: 'bg-positive-soft text-positive-ink' },
  duplicate: { label: 'Sudah ada', className: 'bg-secondary text-secondary-foreground' },
  error: { label: 'Perlu diperbaiki', className: 'bg-negative-soft text-negative-ink' },
}

// Impor data jemaat dari Excel/CSV (khusus Admin). Berkas dibaca di browser, diperiksa
// API tanpa menyimpan (pratinjau), lalu baris yang siap disimpan sekaligus.
export default function MemberImportPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [preview, setPreview] = useState<MemberImportResult | null>(null)
  const [saved, setSaved] = useState<MemberImportResult | null>(null)
  const [busy, setBusy] = useState<'reading' | 'checking' | 'saving' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [view, setView] = useState<View>('all')
  const [page, setPage] = useState(1)

  async function check(next: Loaded) {
    setBusy('checking')
    try {
      const result = await api.post<MemberImportResult>('/members/import', {
        file_name: next.fileName,
        dry_run: true,
        rows: next.rows,
      })
      setLoaded(next)
      setPreview(result)
      setView(result.summary.errors > 0 ? 'error' : 'all')
      setPage(1)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function handleFile(file: File) {
    setError(null)
    setPreview(null)
    setSaved(null)
    setLoaded(null)
    setBusy('reading')
    try {
      const { rows, ignored } = toImportRows(await readSpreadsheet(file))
      await check({ fileName: file.name, rows, ignored })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(null)
    }
  }

  async function save() {
    if (!loaded) return
    setBusy('saving')
    setError(null)
    try {
      const result = await api.post<MemberImportResult>('/members/import', {
        file_name: loaded.fileName,
        dry_run: false,
        rows: loaded.rows,
      })
      setSaved(result)
      setPreview(result)
      toast.success(`${result.summary.new_members.toLocaleString('id-ID')} jemaat tersimpan.`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  function reset() {
    setLoaded(null)
    setPreview(null)
    setSaved(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  const result = saved ?? preview
  const summary = result?.summary

  return (
    <div className="grid gap-6">
      <Link
        to="/dashboard/members"
        className="-mb-2 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Anggota Jemaat
      </Link>
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Impor Data Jemaat</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Pindahkan data dari Excel lama. KK yang belum ada dibuat otomatis, nama rayon dicocokkan
          tanpa membedakan huruf besar/kecil, dan Nomor Induk yang sudah terdaftar dilewati.
        </p>
      </header>

      {!result ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section
            aria-labelledby="judul-unggah"
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'grid min-h-72 place-content-center justify-items-center gap-3 rounded-lg border border-dashed bg-card px-6 py-10 text-center',
              dragging && 'border-primary bg-accent',
            )}
          >
            <FileSpreadsheet className="size-8 text-muted-foreground" aria-hidden="true" />
            <h2 id="judul-unggah" className="text-base font-semibold">
              {busy === 'reading'
                ? 'Membaca berkas…'
                : busy === 'checking'
                  ? 'Memeriksa data…'
                  : 'Tarik berkas ke sini'}
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Excel (.xlsx) atau CSV, maksimal {IMPORT_MAX_ROWS.toLocaleString('id-ID')} baris. Data
              belum disimpan sebelum Anda memeriksa pratinjaunya.
            </p>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleFile(file)
              }}
            />
            <Button size="lg" disabled={busy !== null} onClick={() => inputRef.current?.click()}>
              <Upload data-icon="inline-start" />
              Pilih berkas
            </Button>
            <div role="alert" aria-live="assertive" className="max-w-md">
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </section>

          <TemplateGuide />
        </div>
      ) : (
        <>
          <section
            aria-label="Berkas"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <FileSpreadsheet
                className="size-5 flex-none text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{loaded?.fileName}</p>
                <p className="text-[0.8125rem] text-muted-foreground tabular-nums">
                  {summary?.rows.toLocaleString('id-ID')} baris data dibaca
                  {loaded &&
                    loaded.ignored.length > 0 &&
                    ` · kolom diabaikan: ${loaded.ignored.join(', ')}`}
                </p>
              </div>
            </div>
            {!saved && (
              <Button variant="outline" disabled={busy !== null} onClick={reset}>
                Pilih berkas lain
              </Button>
            )}
          </section>

          {saved && summary ? (
            <SavedPanel
              summary={summary}
              onAnother={reset}
              onDownloadSkipped={
                summary.duplicates + summary.errors > 0 && loaded
                  ? () => void downloadSkippedRows(loaded.fileName, loaded.rows, saved.rows)
                  : undefined
              }
            />
          ) : (
            summary && (
              <p className="text-sm text-muted-foreground tabular-nums">
                {summary.errors > 0 ? (
                  <>
                    <span className="font-medium text-foreground">
                      {summary.errors.toLocaleString('id-ID')} baris perlu diperbaiki
                    </span>{' '}
                    dan tidak ikut disimpan; baris lain tetap bisa disimpan sekarang.
                  </>
                ) : (
                  'Semua baris terbaca dengan benar.'
                )}
              </p>
            )
          )}

          {result && summary && (
            <PreviewTable
              result={result}
              view={view}
              page={page}
              onView={(next) => {
                setView(next)
                setPage(1)
              }}
              onPage={setPage}
              saved={Boolean(saved)}
            />
          )}

          {!saved && summary && (
            <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <div role="alert" aria-live="assertive" className="min-w-0 text-sm">
                {error ? (
                  <span className="text-destructive">{error}</span>
                ) : (
                  <span className="text-muted-foreground tabular-nums">
                    {summary.new_members.toLocaleString('id-ID')} jemaat ·{' '}
                    {summary.new_families.toLocaleString('id-ID')} KK baru akan disimpan
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {summary.duplicates + summary.errors > 0 && loaded && (
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() =>
                      void downloadSkippedRows(loaded.fileName, loaded.rows, result.rows)
                    }
                  >
                    <Download data-icon="inline-start" />
                    Unduh baris yang dilewati
                  </Button>
                )}
                <Button
                  size="lg"
                  disabled={busy !== null || summary.new_members === 0}
                  onClick={() => void save()}
                >
                  {busy === 'saving'
                    ? 'Menyimpan…'
                    : summary.new_members === 0
                      ? 'Tidak ada yang bisa disimpan'
                      : `Simpan ${summary.new_members.toLocaleString('id-ID')} jemaat`}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Ringkasan sebagai pilihan tampilan tabel: semua, siap, sudah ada, perlu diperbaiki.
function PreviewTable({
  result,
  view,
  page,
  onView,
  onPage,
  saved,
}: {
  result: MemberImportResult
  view: View
  page: number
  onView: (view: View) => void
  onPage: (page: number) => void
  saved: boolean
}) {
  const { summary } = result
  const rows = view === 'all' ? result.rows : result.rows.filter((row) => row.status === view)
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const views: { id: View; label: string; count: number; note: string }[] = [
    { id: 'all', label: 'Semua baris', count: summary.rows, note: 'di berkas' },
    {
      id: 'new',
      label: saved ? 'Tersimpan' : 'Siap disimpan',
      count: summary.new_members,
      note: `${summary.new_families.toLocaleString('id-ID')} KK baru · ${summary.existing_families.toLocaleString('id-ID')} KK terdaftar`,
    },
    {
      id: 'duplicate',
      label: 'Sudah ada',
      count: summary.duplicates,
      note: 'dilewati, tidak dobel',
    },
    { id: 'error', label: 'Perlu diperbaiki', count: summary.errors, note: 'dilewati' },
  ]

  return (
    <section aria-label="Pratinjau impor" className="grid gap-3">
      <div className="grid grid-cols-2 divide-rule overflow-hidden rounded-lg border bg-card md:grid-cols-4 md:divide-x">
        {views.map((option) => {
          const active = option.id === view
          return (
            <div key={option.id} className="p-1">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onView(option.id)}
                className={cn(
                  'grid h-full w-full content-start gap-0.5 rounded-md px-3 py-2 text-left outline-offset-[-2px] hover:bg-muted/60',
                  active && 'bg-accent hover:bg-accent',
                )}
              >
                <span className={cn('text-sm', active ? 'font-medium' : 'text-muted-foreground')}>
                  {option.label}
                </span>
                <span
                  className={cn(
                    'text-xl font-medium tabular-nums',
                    option.id === 'error' && option.count > 0 && 'text-negative-ink',
                  )}
                >
                  {option.count.toLocaleString('id-ID')}
                </span>
                <span
                  className={cn(
                    'text-[0.8125rem]',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {option.note}
                </span>
              </button>
            </div>
          )
        })}
      </div>

      <div className="rounded-lg border bg-card">
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">Pratinjau baris berkas impor</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="h-10 w-16 pr-4 pl-4 text-right font-normal">
                Baris
              </th>
              <th scope="col" className="pr-4 font-normal">
                Jemaat
              </th>
              <th scope="col" className="hidden w-[26%] pr-4 font-normal xl:table-cell">
                KK dan rayon
              </th>
              <th scope="col" className="hidden w-[34%] pr-4 font-normal sm:table-cell">
                Keterangan
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr className="border-t border-rule">
                <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                  Tidak ada baris di kelompok ini.
                </td>
              </tr>
            )}
            {shown.map((row) => (
              <PreviewRow key={row.row} row={row} />
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <nav
            aria-label="Halaman pratinjau"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-3"
          >
            <p className="text-sm text-muted-foreground tabular-nums">
              {((page - 1) * PAGE_SIZE + 1).toLocaleString('id-ID')}–
              {Math.min(page * PAGE_SIZE, rows.length).toLocaleString('id-ID')} dari{' '}
              {rows.length.toLocaleString('id-ID')} baris
            </p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
                Sebelumnya
              </Button>
              <Button variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>
                Berikutnya
              </Button>
            </div>
          </nav>
        )}
      </div>
    </section>
  )
}

function PreviewRow({ row }: { row: MemberImportRow }) {
  const pill = STATUS_PILL[row.status]
  const identity = [
    row.family_relation && FAMILY_RELATION_LABELS[row.family_relation],
    row.church_member_number && `No. Induk ${row.church_member_number}`,
    row.nik && `NIK ${row.nik}`,
  ]
    .filter(Boolean)
    .join(' · ')
  const family = row.family
  const familyLine = family
    ? [
        family.rayon_name
          ? `Rayon ${family.rayon_name}${family.rayon_input ? ` (ditulis “${family.rayon_input}”)` : ''}`
          : family.rayon_input
            ? `Rayon “${family.rayon_input}”`
            : null,
        family.is_new ? 'KK baru' : 'KK terdaftar',
      ]
        .filter(Boolean)
        .join(' · ')
    : null
  const notes = (
    <>
      <span
        className={cn(
          'inline-flex flex-none rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
          pill.className,
        )}
      >
        {pill.label}
      </span>
      {row.messages.length > 0 && (
        <ul className="mt-1 grid gap-0.5 text-[0.8125rem] text-muted-foreground">
          {row.messages.map((message) => (
            <li key={message} className={row.status === 'error' ? 'text-foreground' : undefined}>
              {message}
            </li>
          ))}
        </ul>
      )}
    </>
  )

  return (
    <tr className="border-t border-rule align-top">
      <td className="py-3 pr-4 pl-4 text-right text-muted-foreground tabular-nums">{row.row}</td>
      <td className="py-3 pr-4">
        <p className={cn('font-medium break-words', !row.full_name && 'text-muted-foreground')}>
          {row.full_name || 'Nama kosong'}
        </p>
        {identity && <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{identity}</p>}
        {/* Kolom KK (di bawah xl) dan keterangan (di ponsel) pindah ke bawah nama. */}
        <div className="mt-1.5 sm:hidden">{notes}</div>
        {family && (
          <p className="mt-0.5 text-[0.8125rem] text-muted-foreground xl:hidden">
            KK {family.kk_number ?? family.head_name} · {familyLine}
          </p>
        )}
      </td>
      <td className="hidden py-3 pr-4 xl:table-cell">
        {family ? (
          <>
            <p className="break-words">
              {family.kk_number ?? 'Tanpa nomor'}
              {family.head_name && (
                <span className="text-muted-foreground"> · {family.head_name}</span>
              )}
            </p>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{familyLine}</p>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="hidden py-3 pr-4 sm:table-cell">{notes}</td>
    </tr>
  )
}

function SavedPanel({
  summary,
  onAnother,
  onDownloadSkipped,
}: {
  summary: MemberImportResult['summary']
  onAnother: () => void
  onDownloadSkipped?: () => void
}) {
  const skipped = summary.duplicates + summary.errors
  return (
    <section
      aria-labelledby="judul-tersimpan"
      className="grid gap-3 rounded-lg border bg-card px-5 py-4"
    >
      <h2 id="judul-tersimpan" className="text-lg font-semibold tabular-nums">
        {summary.new_members.toLocaleString('id-ID')} jemaat tersimpan
      </h2>
      <p className="text-sm text-muted-foreground tabular-nums">
        {summary.new_families.toLocaleString('id-ID')} KK baru dibuat
        {summary.existing_families > 0 &&
          `, ${summary.existing_families.toLocaleString('id-ID')} KK yang sudah terdaftar ditambah anggotanya`}
        .{' '}
        {skipped > 0
          ? `${skipped.toLocaleString('id-ID')} baris tidak ikut disimpan: ${summary.duplicates.toLocaleString('id-ID')} sudah ada, ${summary.errors.toLocaleString('id-ID')} perlu diperbaiki.`
          : 'Semua baris masuk.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="lg">
          <Link to="/dashboard/members">Lihat Anggota Jemaat</Link>
        </Button>
        {onDownloadSkipped && (
          <Button variant="outline" size="lg" onClick={onDownloadSkipped}>
            <Download data-icon="inline-start" />
            Unduh baris yang belum masuk
          </Button>
        )}
        <Button variant="ghost" size="lg" onClick={onAnother}>
          Impor berkas lain
        </Button>
      </div>
    </section>
  )
}

// Template dan penjelasan isian setiap kolom.
function TemplateGuide() {
  return (
    <section
      aria-labelledby="judul-template"
      className="grid content-start gap-3 rounded-lg border bg-card p-4"
    >
      <div className="grid gap-1">
        <h2 id="judul-template" className="text-base font-semibold">
          Template berkas
        </h2>
        <p className="text-sm text-muted-foreground">
          Satu baris untuk satu jemaat. Baris dengan Nomor KK yang sama menjadi satu keluarga.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void downloadTemplate('xlsx')}>
          <Download data-icon="inline-start" />
          Template Excel
        </Button>
        <Button variant="outline" onClick={() => void downloadTemplate('csv')}>
          <Download data-icon="inline-start" />
          Template CSV
        </Button>
      </div>
      <div className="grid gap-1 border-t border-rule pt-3 text-sm">
        <p className="font-medium">Wajib diisi di setiap baris</p>
        <ul className="grid gap-0.5 text-[0.8125rem] text-muted-foreground">
          <li>Nama Lengkap, Jenis Kelamin (L/P), Hubungan Keluarga</li>
          <li>Nomor KK, atau Nama Kepala Keluarga bila nomornya belum ada</li>
          <li>Rayon, untuk KK yang belum terdaftar</li>
        </ul>
      </div>
      <details className="group text-sm">
        <summary className="cursor-pointer font-medium underline-offset-4 hover:underline">
          Isi setiap kolom ({IMPORT_COLUMNS.length} kolom)
        </summary>
        <dl className="mt-2 grid">
          {IMPORT_COLUMNS.map((column) => (
            <GuideRow key={column.key} title={column.header} required={'required' in column}>
              {column.help}
            </GuideRow>
          ))}
        </dl>
      </details>
    </section>
  )
}

function GuideRow({
  title,
  required,
  children,
}: {
  title: string
  required: boolean
  children: ReactNode
}) {
  return (
    <div className="grid gap-0.5 border-t border-rule py-2 first:border-t-0">
      <dt className="font-medium">
        {title}
        {required && <span className="font-normal text-muted-foreground"> · wajib</span>}
      </dt>
      <dd className="text-[0.8125rem] text-muted-foreground">{children}</dd>
    </div>
  )
}
