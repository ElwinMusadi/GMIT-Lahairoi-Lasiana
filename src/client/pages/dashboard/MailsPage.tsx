import { useRef, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  EllipsisVertical,
  ExternalLink,
  Paperclip,
  Plus,
  Trash2,
  X,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  SearchField,
  SkeletonRows,
  TableCard,
  TableMessage,
  TablePagination,
  selectClass,
} from '@/components/zenith/data-table'
import { PageHeader } from '@/components/zenith/page-header'
import { Segmented } from '@/components/zenith/segmented'
import { StatusBadge } from '@/components/zenith/status-badge'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const PER_PAGE = 50
const YEARS_SHOWN = 6

// Nama berkas unduhan: nomor surat (atau perihal) dan tanggal, mis.
// "2026-10-25-012-mj-lhr-x-2026.pdf".
function downloadName(mail: MailArchive) {
  const extension = mail.file_url?.split('.').pop() ?? 'pdf'
  return `${mail.mail_date}-${slugify(mail.reference_number ?? mail.subject)}.${extension}`
}

// Buku Agenda Surat Masuk & Keluar (PRD: Arsip Persuratan), khusus Admin. Filter arah,
// tahun, kategori, dan pencarian disimpan di URL; tanpa `year` yang ditampilkan tahun
// berjalan. Tabel bergaya Zenith: arah bersegmen, pencarian dan filter di bilah alat.
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
      <PageHeader
        title="Buku Agenda Surat"
        description={
          counts ? (
            <span className="tabular-nums">
              {period}
              {filtered && ' (sesuai filter)'}: {counts.INCOMING.toLocaleString('id-ID')} surat
              masuk · {counts.OUTGOING.toLocaleString('id-ID')} surat keluar
            </span>
          ) : (
            <span className="inline-block h-4 w-72 max-w-full animate-pulse rounded-md bg-muted align-middle" />
          )
        }
        actions={
          <Button size="lg" onClick={() => setFormOpen(true)}>
            <Plus data-icon="inline-start" />
            Catat surat
          </Button>
        }
      />

      <TableCard
        aria-label="Buku Agenda Surat"
        toolbar={
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented
                label="Arah surat"
                value={direction || 'ALL'}
                onChange={(value) =>
                  update({ direction: value === 'ALL' ? '' : value.toLowerCase() })
                }
                options={[
                  {
                    value: 'ALL',
                    label: 'Semua',
                    count: counts ? counts.INCOMING + counts.OUTGOING : undefined,
                  },
                  ...MAIL_DIRECTIONS.map((value) => ({
                    value,
                    label: MAIL_DIRECTION_LABELS[value],
                    count: counts?.[value],
                  })),
                ]}
              />
              <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
                {result ? `${total.toLocaleString('id-ID')} surat` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SearchField
                value={search}
                onChange={handleSearch}
                label="Cari surat"
                placeholder="Cari nomor, pengirim/penerima, perihal"
              />
              <div
                role="group"
                aria-label="Filter"
                className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap"
              >
                <select
                  aria-label="Tahun surat"
                  value={year || 'all'}
                  onChange={(event) =>
                    update({ year: event.target.value === thisYear ? '' : event.target.value })
                  }
                  className={cn(selectClass, 'tabular-nums')}
                >
                  {years.map((option) => (
                    <option key={option} value={option}>
                      Tahun {option}
                    </option>
                  ))}
                  <option value="all">Semua tahun</option>
                </select>
                <select
                  aria-label="Kategori"
                  value={category}
                  onChange={(event) => update({ category: event.target.value.toLowerCase() })}
                  className={selectClass}
                >
                  <option value="">Semua kategori</option>
                  {MAIL_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {MAIL_CATEGORY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
              {(filtered || direction || yearParam) && (
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => clearSearch({ direction: '', category: '', year: '' })}
                >
                  <X data-icon="inline-start" />
                  Hapus filter
                </Button>
              )}
            </div>
          </>
        }
        footer={
          result && (
            <TablePagination
              label="Halaman Buku Agenda"
              page={page}
              perPage={PER_PAGE}
              total={total}
              unit="surat"
              onPage={(next) => update({ page: String(next) })}
            />
          )
        }
      >
        <Table className="table-fixed" aria-busy={mails.loading}>
          <caption className="sr-only">Buku Agenda Surat, {period.toLowerCase()}</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="hidden w-32 sm:table-cell">Tanggal</TableHead>
              <TableHead>Perihal</TableHead>
              <TableHead className="hidden w-36 md:table-cell">Arah & kategori</TableHead>
              <TableHead className="hidden w-52 xl:table-cell">Nomor surat</TableHead>
              <TableHead className="hidden w-32 sm:table-cell">Salinan</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Tindakan</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={cn('transition-opacity', mails.loading && result && 'opacity-60')}>
            {mails.error && (
              <TableMessage colSpan={6}>
                Buku Agenda tidak dapat dimuat: {mails.error}{' '}
                <button type="button" onClick={mails.reload} className="font-medium underline">
                  Coba lagi
                </button>
              </TableMessage>
            )}
            {!result && !mails.error && (
              <SkeletonRows
                avatar={false}
                cells={[
                  'hidden sm:table-cell',
                  '',
                  'hidden md:table-cell',
                  'hidden xl:table-cell',
                  'hidden sm:table-cell',
                  '',
                ]}
              />
            )}
            {result && !mails.error && items.length === 0 && (
              <TableMessage colSpan={6}>
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
              </TableMessage>
            )}
            {!mails.error &&
              items.map((mail) => (
                <MailRow key={mail.id} mail={mail} onDelete={() => confirmDelete(mail)} />
              ))}
          </TableBody>
        </Table>
      </TableCard>

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

function DirectionBadge({ direction }: { direction: MailDirection }) {
  const incoming = direction === 'INCOMING'
  const Icon = incoming ? ArrowDownLeft : ArrowUpRight
  return (
    <StatusBadge tone={incoming ? 'info' : 'neutral'}>
      <Icon className="size-3.5" aria-hidden="true" />
      {incoming ? 'Masuk' : 'Keluar'}
    </StatusBadge>
  )
}

function MailRow({ mail, onDelete }: { mail: MailArchive; onDelete: () => void }) {
  const incoming = mail.direction === 'INCOMING'
  const party = `${incoming ? 'Dari' : 'Kepada'} ${mail.sender_or_recipient}`
  return (
    <TableRow className="[&>td]:align-top">
      <TableCell className="hidden whitespace-nowrap tabular-nums sm:table-cell">
        {formatDate(mail.mail_date)}
      </TableCell>
      <TableCell>
        <p className="font-medium break-words">{mail.subject}</p>
        {/* Kolom yang tersembunyi di layar sempit pindah ke baris ini. */}
        <p className="mt-0.5 text-[0.8125rem] break-words text-muted-foreground">
          <span className="tabular-nums sm:hidden">
            {mail.file_url && (
              <>
                <Paperclip
                  className="mr-1 inline size-3.5 align-[-0.125em] text-foreground"
                  aria-hidden="true"
                />
                <span className="sr-only">Ada salinan, </span>
              </>
            )}
            {formatDate(mail.mail_date)} ·{' '}
          </span>
          <span className="md:hidden">{incoming ? 'Masuk' : 'Keluar'} · </span>
          {party}
          <span className="md:hidden"> · {MAIL_CATEGORY_LABELS[mail.category]}</span>
          {mail.reference_number && (
            <span className="font-mono xl:hidden"> · {mail.reference_number}</span>
          )}
        </p>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <DirectionBadge direction={mail.direction} />
        <p className="mt-1 text-[0.8125rem] text-muted-foreground">
          {MAIL_CATEGORY_LABELS[mail.category]}
        </p>
      </TableCell>
      <TableCell className="hidden font-mono text-[0.8125rem] break-all xl:table-cell">
        {mail.reference_number ?? (
          <span className="font-sans text-muted-foreground">Tanpa nomor</span>
        )}
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {mail.file_url ? (
          <span className="-my-1 inline-flex items-center gap-1">
            <a
              href={mail.file_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium underline-offset-4 hover:underline"
            >
              <Paperclip className="size-3.5" aria-hidden="true" />
              Buka
              <span className="sr-only">salinan “{mail.subject}” (tab baru)</span>
            </a>
            <Button asChild variant="ghost" size="icon-sm" className="text-muted-foreground">
              <a href={mail.file_url} download={downloadName(mail)} title="Unduh salinan">
                <Download />
                <span className="sr-only">Unduh salinan “{mail.subject}”</span>
              </a>
            </Button>
          </span>
        ) : (
          <StatusBadge>Tidak ada</StatusBadge>
        )}
      </TableCell>
      <TableCell className="py-1.5 pr-2 pl-0 text-right">
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
      </TableCell>
    </TableRow>
  )
}
