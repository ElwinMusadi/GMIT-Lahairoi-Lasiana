import { useRef, useState, type ReactNode } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  EllipsisVertical,
  ExternalLink,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { slugify } from '@shared/contents'
import { witaToday } from '@shared/dates'
import {
  MAIL_CATEGORIES,
  MAIL_CATEGORY_LABELS,
  MAIL_DIRECTIONS,
  MAIL_DIRECTION_LABELS,
  type MailArchive,
  type MailCategory,
  type MailDirection,
  type MailPage,
  type MailResponse,
} from '@shared/types'
import { ConfirmDialog, type Confirmation } from '@/components/confirm-dialog'
import { MailFormDialog } from '@/components/mails/mail-form-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const PER_PAGE = 50
const YEARS_SHOWN = 6

const controlClass =
  'h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

// Nama berkas unduhan: nomor surat (atau perihal) dan tanggal, mis.
// "2026-10-25-012-mj-lhr-x-2026.pdf".
function downloadName(mail: MailArchive) {
  const extension = mail.file_url?.split('.').pop() ?? 'pdf'
  return `${mail.mail_date}-${slugify(mail.reference_number ?? mail.subject)}.${extension}`
}

// Buku Agenda Surat Masuk & Keluar (PRD: Arsip Persuratan), khusus Admin. Filter arah,
// tahun, kategori, dan pencarian disimpan di URL; tanpa `year` yang ditampilkan tahun
// berjalan.
export default function MailsPage() {
  const { params, update } = useUrlFilters()
  const [today] = useState(witaToday)
  const thisYear = today.slice(0, 4)
  const yearParam = params.get('year') ?? ''
  const year = yearParam === 'all' ? '' : /^\d{4}$/.test(yearParam) ? yearParam : thisYear
  const directionParam = (params.get('direction') ?? '').toUpperCase()
  const direction = (MAIL_DIRECTIONS as string[]).includes(directionParam)
    ? (directionParam as MailDirection)
    : ''
  const categoryParam = (params.get('category') ?? '').toUpperCase()
  const category = (MAIL_CATEGORIES as string[]).includes(categoryParam)
    ? (categoryParam as MailCategory)
    : ''
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)

  const [search, setSearch] = useState(q)
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    if (q !== search.trim()) setSearch(q)
  }
  const searchTimer = useRef<number | undefined>(undefined)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  const mails = useApiQuery<MailPage>('/mails', {
    direction,
    category,
    q,
    from: year ? `${year}-01-01` : '',
    to: year ? `${year}-12-31` : '',
    page,
    per_page: PER_PAGE,
  })
  const result = mails.data
  const items = result?.data ?? []
  const total = result?.meta.total ?? 0
  const counts = result?.counts
  const first = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const last = Math.min(page * PER_PAGE, total)
  const filtered = Boolean(category || q)
  const years = Array.from({ length: YEARS_SHOWN }, (_, index) => String(Number(thisYear) - index))
  if (year && !years.includes(year)) years.push(year)
  const period = year ? `Tahun ${year}` : 'Semua tahun'

  function handleSearch(value: string) {
    setSearch(value)
    window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => update({ q: value.trim() }), 300)
  }

  function clearSearch(changes: Record<string, string> = {}) {
    window.clearTimeout(searchTimer.current)
    setSearch('')
    update({ ...changes, q: '' })
  }

  function handleSaved({ mail }: MailResponse) {
    setFormOpen(false)
    mails.reload()
    const savedYear = mail.mail_date.slice(0, 4)
    const label = `${MAIL_DIRECTION_LABELS[mail.direction]} “${mail.subject}” dicatat.`
    toast.success(
      label,
      year && savedYear !== year
        ? {
            action: {
              label: `Buka ${savedYear}`,
              onClick: () => update({ year: savedYear === thisYear ? '' : savedYear }),
            },
          }
        : undefined,
    )
  }

  function confirmDelete(mail: MailArchive) {
    setConfirmation({
      title: 'Hapus catatan surat ini?',
      description: (
        <>
          {MAIL_DIRECTION_LABELS[mail.direction]} “{mail.subject}”
          {mail.reference_number && ` (${mail.reference_number})`}, {formatDate(mail.mail_date)}.
          Catatan hilang dari Buku Agenda; penghapusan tercatat di Log Aktivitas.
        </>
      ),
      confirmLabel: 'Hapus catatan',
      destructive: true,
      onConfirm: async () => {
        await api.delete(`/mails/${mail.id}`)
        mails.reload()
        toast.success('Catatan surat dihapus.')
      },
    })
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Buku Agenda Surat</h1>
          {counts ? (
            <p className="text-sm text-muted-foreground tabular-nums">
              {period}
              {filtered && ' (sesuai filter)'}: {counts.INCOMING.toLocaleString('id-ID')} surat
              masuk · {counts.OUTGOING.toLocaleString('id-ID')} surat keluar
            </p>
          ) : (
            <Skeleton className="h-5 w-72" />
          )}
        </div>
        <Button size="lg" onClick={() => setFormOpen(true)}>
          <Plus data-icon="inline-start" />
          Catat surat
        </Button>
      </header>

      <nav aria-label="Arah surat" className="border-b">
        <ul className="flex gap-1">
          {(
            [
              ['', 'Semua'],
              ...MAIL_DIRECTIONS.map((value) => [value, MAIL_DIRECTION_LABELS[value]]),
            ] as const
          ).map(([value, label]) => {
            const active = direction === value
            const count = counts
              ? value
                ? counts[value as MailDirection]
                : counts.INCOMING + counts.OUTGOING
              : undefined
            return (
              <li key={value || 'all'}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ direction: value.toLowerCase() })}
                  className={cn(
                    '-mb-px border-b-2 px-3 pt-1 pb-2.5 text-sm outline-offset-[-2px]',
                    active
                      ? 'border-foreground font-medium text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                  {count !== undefined && (
                    <span className="ml-1.5 text-muted-foreground tabular-nums">
                      {count.toLocaleString('id-ID')}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="grid gap-3">
        <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-[10rem_12rem_minmax(0,20rem)]">
          <FilterField id="filter-tahun" label="Tahun surat">
            <select
              id="filter-tahun"
              value={year || 'all'}
              onChange={(event) =>
                update({ year: event.target.value === thisYear ? '' : event.target.value })
              }
              className={controlClass}
            >
              {years.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <option value="all">Semua tahun</option>
            </select>
          </FilterField>
          <FilterField id="filter-kategori" label="Kategori">
            <select
              id="filter-kategori"
              value={category}
              onChange={(event) => update({ category: event.target.value.toLowerCase() })}
              className={controlClass}
            >
              <option value="">Semua kategori</option>
              {MAIL_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {MAIL_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </FilterField>
          <div className="relative col-span-2 md:col-span-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Cari nomor, pengirim/penerima, perihal"
              aria-label="Cari surat"
              className={cn(controlClass, 'pl-9')}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {(filtered || direction || yearParam) && (
            <Button
              variant="ghost"
              onClick={() => clearSearch({ direction: '', category: '', year: '' })}
            >
              Hapus filter
            </Button>
          )}
          <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {result ? `${total.toLocaleString('id-ID')} surat` : ''}
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <table className="w-full table-fixed text-sm" aria-busy={mails.loading}>
          <caption className="sr-only">Buku Agenda Surat, {period.toLowerCase()}</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="hidden h-10 w-28 pl-4 font-normal sm:table-cell">
                Tanggal
              </th>
              <th scope="col" className="h-10 pr-4 pl-4 font-normal sm:pl-0">
                Perihal
              </th>
              <th scope="col" className="hidden w-40 pr-4 font-normal md:table-cell">
                Arah & kategori
              </th>
              <th scope="col" className="hidden w-52 pr-4 font-normal lg:table-cell">
                Nomor surat
              </th>
              <th scope="col" className="w-24 pr-2 text-right font-normal sm:w-28">
                Salinan
              </th>
              <th scope="col" className="w-12 pr-2">
                <span className="sr-only">Tindakan</span>
              </th>
            </tr>
          </thead>
          <tbody className={cn('transition-opacity', mails.loading && result && 'opacity-60')}>
            {mails.error && (
              <MessageRow>
                Buku Agenda tidak dapat dimuat: {mails.error}{' '}
                <button type="button" onClick={mails.reload} className="font-medium underline">
                  Coba lagi
                </button>
              </MessageRow>
            )}
            {!result &&
              !mails.error &&
              Array.from({ length: 6 }, (_, index) => <SkeletonRow key={index} />)}
            {result && !mails.error && items.length === 0 && (
              <MessageRow>
                {q ? (
                  <>
                    Tidak ada surat yang cocok dengan “{q}”.{' '}
                    <button
                      type="button"
                      className="font-medium underline"
                      onClick={() => clearSearch()}
                    >
                      Hapus pencarian
                    </button>
                  </>
                ) : filtered || direction ? (
                  `Tidak ada surat ${period.toLowerCase()} yang cocok dengan filter ini.`
                ) : (
                  <>
                    Belum ada surat tercatat {year ? `pada ${period.toLowerCase()}` : ''}.{' '}
                    <button
                      type="button"
                      className="font-medium text-foreground underline"
                      onClick={() => setFormOpen(true)}
                    >
                      Catat surat
                    </button>
                  </>
                )}
              </MessageRow>
            )}
            {!mails.error &&
              items.map((mail) => (
                <MailRow key={mail.id} mail={mail} onDelete={() => confirmDelete(mail)} />
              ))}
          </tbody>
        </table>

        {result && total > PER_PAGE && (
          <nav
            aria-label="Halaman Buku Agenda"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-3"
          >
            <p className="text-sm text-muted-foreground tabular-nums">
              {first.toLocaleString('id-ID')}–{last.toLocaleString('id-ID')} dari{' '}
              {total.toLocaleString('id-ID')} surat
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => update({ page: String(page - 1) })}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                disabled={last >= total}
                onClick={() => update({ page: String(page + 1) })}
              >
                Berikutnya
              </Button>
            </div>
          </nav>
        )}
      </div>

      <MailFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultDirection={direction || undefined}
        onSaved={handleSaved}
      />
      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  )
}

function DirectionMark({ direction }: { direction: MailDirection }) {
  const incoming = direction === 'INCOMING'
  const Icon = incoming ? ArrowDownLeft : ArrowUpRight
  return (
    <span className="inline-flex flex-none items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium whitespace-nowrap text-secondary-foreground">
      <Icon className="size-3.5" aria-hidden="true" />
      {incoming ? 'Masuk' : 'Keluar'}
    </span>
  )
}

function MailRow({ mail, onDelete }: { mail: MailArchive; onDelete: () => void }) {
  const incoming = mail.direction === 'INCOMING'
  const party = `${incoming ? 'Dari' : 'Kepada'} ${mail.sender_or_recipient}`
  return (
    <tr className="border-t border-rule align-top">
      <td className="hidden py-3 pl-4 whitespace-nowrap tabular-nums sm:table-cell">
        {formatDate(mail.mail_date)}
      </td>
      <td className="py-3 pr-4 pl-4 sm:pl-0">
        <p className="font-medium break-words">{mail.subject}</p>
        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
          <span className="sm:hidden">
            {formatDate(mail.mail_date)} · {incoming ? 'Masuk' : 'Keluar'} ·{' '}
          </span>
          {party}
          <span className="md:hidden"> · {MAIL_CATEGORY_LABELS[mail.category]}</span>
          {mail.reference_number && (
            <span className="font-mono lg:hidden"> · {mail.reference_number}</span>
          )}
        </p>
      </td>
      <td className="hidden py-3 pr-4 md:table-cell">
        <DirectionMark direction={mail.direction} />
        <p className="mt-1 text-[0.8125rem] text-muted-foreground">
          {MAIL_CATEGORY_LABELS[mail.category]}
        </p>
      </td>
      <td className="hidden py-3 pr-4 font-mono text-[0.8125rem] break-all lg:table-cell">
        {mail.reference_number ?? (
          <span className="font-sans text-muted-foreground">Tanpa nomor</span>
        )}
      </td>
      <td className="py-2 pr-2 text-right">
        {mail.file_url ? (
          <span className="inline-flex gap-1">
            <Button asChild variant="ghost" size="icon" className="size-10 sm:size-8">
              <a href={mail.file_url} target="_blank" rel="noreferrer" title="Buka salinan">
                <ExternalLink />
                <span className="sr-only">Buka salinan “{mail.subject}” (tab baru)</span>
              </a>
            </Button>
            <Button asChild variant="ghost" size="icon" className="size-10 sm:size-8">
              <a href={mail.file_url} download={downloadName(mail)} title="Unduh salinan">
                <Download />
                <span className="sr-only">Unduh salinan “{mail.subject}”</span>
              </a>
            </Button>
          </span>
        ) : (
          <span className="pr-2 text-muted-foreground">
            —<span className="sr-only">Tanpa salinan</span>
          </span>
        )}
      </td>
      <td className="py-2 pr-2 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-10 sm:size-8">
              <EllipsisVertical />
              <span className="sr-only">Tindakan untuk “{mail.subject}”</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {mail.file_url && (
              <>
                <DropdownMenuItem asChild>
                  <a href={mail.file_url} target="_blank" rel="noreferrer">
                    <ExternalLink />
                    Buka salinan
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={mail.file_url} download={downloadName(mail)}>
                    <Download />
                    Unduh salinan
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 />
              Hapus catatan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}

function FilterField({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function MessageRow({ children }: { children: ReactNode }) {
  return (
    <tr className="border-t border-rule">
      <td colSpan={6} className="px-4 py-6 text-muted-foreground">
        {children}
      </td>
    </tr>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-t border-rule" aria-hidden="true">
      <td className="hidden py-3 pl-4 sm:table-cell">
        <Skeleton className="h-5 w-20" />
      </td>
      <td className="py-3 pr-4 pl-4 sm:pl-0">
        <Skeleton className="h-5 w-64 max-w-full" />
        <Skeleton className="mt-1.5 h-4 w-40 max-w-full" />
      </td>
      <td className="hidden py-3 pr-4 md:table-cell">
        <Skeleton className="h-5 w-16" />
      </td>
      <td className="hidden py-3 pr-4 lg:table-cell">
        <Skeleton className="h-5 w-32" />
      </td>
      <td className="py-3 pr-2">
        <Skeleton className="ml-auto h-5 w-12" />
      </td>
      <td />
    </tr>
  )
}
