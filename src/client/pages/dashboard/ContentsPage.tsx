import { useRef, useState, type ReactNode } from 'react'
import { EllipsisVertical, FileText, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { witaToday } from '@shared/dates'
import type { ApiPage, ContentCategory, ContentListItem, ContentResponse } from '@shared/types'
import { ConfirmDialog, type Confirmation } from '@/components/confirm-dialog'
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
} from '@/components/zenith/data-table'
import { PageHeader } from '@/components/zenith/page-header'
import { Segmented } from '@/components/zenith/segmented'
import { StatusBadge } from '@/components/zenith/status-badge'
import { api } from '@/lib/api'
import {
  CATEGORY_CONFIG,
  CATEGORY_ORDER,
  STATUS_LABELS,
  STATUS_TONE,
  apiFailure,
  contentsBase,
  toWitaInputs,
} from '@/lib/contents'
import { formatDate, formatTime } from '@/lib/format'
import { useCurrentUser } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const PER_PAGE = 30

// Saringan status di URL (huruf kecil); "ALL" hanya nilai segmen, di URL berarti kosong.
const STATUS_FILTERS = [
  { value: 'ALL', label: 'Semua' },
  { value: 'draft', label: STATUS_LABELS.DRAFT },
  { value: 'scheduled', label: STATUS_LABELS.SCHEDULED },
  { value: 'published', label: STATUS_LABELS.PUBLISHED },
]

// CMS konten Portal Publik. Admin mengelola keenam kategori; Pendeta memakai halaman
// yang sama sebagai "Renungan Saya" (hanya renungan miliknya, dibatasi API). Tabel
// bergaya Zenith: kategori bersegmen (Admin), status, dan pencarian di bilah alat.
export default function ContentsPage() {
  const me = useCurrentUser()
  const isPastor = me.role === 'PASTOR'
  const base = contentsBase(me.role)
  const { params, update } = useUrlFilters()
  const [today] = useState(witaToday)
  const categoryParam = (params.get('category') ?? '').toUpperCase() as ContentCategory
  const category: ContentCategory = isPastor
    ? 'DEVOTIONAL'
    : CATEGORY_ORDER.includes(categoryParam)
      ? categoryParam
      : 'WARTA'
  const config = CATEGORY_CONFIG[category]
  const status = params.get('status') ?? ''
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [search, setSearch] = useState(q)
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    if (q !== search.trim()) setSearch(q)
  }
  const searchTimer = useRef<number | undefined>(undefined)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [pending, setPending] = useState<number | null>(null)

  const list = useApiQuery<ApiPage<ContentListItem>>('/contents', {
    category,
    status,
    q,
    page,
    per_page: PER_PAGE,
  })
  // Temuan di bawah judul: warta terakhir, renungan hari ini, dan draf yang tertunda.
  const lastWarta = useApiQuery<ApiPage<ContentListItem>>(isPastor ? null : '/contents', {
    category: 'WARTA',
    status: 'published',
    per_page: 1,
  })
  const lastDevotional = useApiQuery<ApiPage<ContentListItem>>('/contents', {
    category: 'DEVOTIONAL',
    status: 'published',
    per_page: 1,
  })
  const drafts = useApiQuery<ApiPage<ContentListItem>>('/contents', {
    status: 'draft',
    per_page: 1,
  })

  function reloadAll() {
    list.reload()
    lastWarta.reload()
    lastDevotional.reload()
    drafts.reload()
  }

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

  async function togglePublished(item: ContentListItem) {
    setPending(item.id)
    try {
      const { content } = await api.patch<ContentResponse>(`/contents/${item.id}`, {
        is_published: !item.is_published,
      })
      reloadAll()
      toast.success(
        content.status === 'PUBLISHED'
          ? `“${content.title}” terbit di portal.`
          : content.status === 'SCHEDULED'
            ? `“${content.title}” terjadwal terbit ${formatDate(content.published_at ?? '')}.`
            : `“${content.title}” dijadikan draf dan tidak tampil di portal.`,
      )
    } catch (err) {
      const failure = apiFailure(err)
      toast.error(failure.message, { description: failure.description })
    } finally {
      setPending(null)
    }
  }

  function confirmDelete(item: ContentListItem) {
    setConfirmation({
      title: `Hapus “${item.title}”?`,
      description:
        item.status === 'DRAFT'
          ? 'Draf ini akan dihapus. Berkas yang sudah diunggah tetap tersimpan.'
          : 'Konten ini langsung hilang dari portal dan tautannya tidak berlaku lagi. Untuk menyembunyikan sementara, jadikan draf saja.',
      confirmLabel: 'Hapus konten',
      destructive: true,
      onConfirm: async () => {
        await api.delete(`/contents/${item.id}`)
        reloadAll()
        toast.success(`“${item.title}” dihapus.`)
      },
    })
  }

  const result = list.data
  const items = result?.data ?? []
  const total = result?.meta.total ?? 0
  const filtered = Boolean(status || q)
  const addHref = `${base}/new${isPastor ? '' : `?category=${category}`}`

  const count = (
    <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
      {result ? `${total.toLocaleString('id-ID')} ${config.noun}` : ''}
    </p>
  )
  const statusControl = (
    <Segmented
      label="Status konten"
      value={status || 'ALL'}
      onChange={(value) => update({ status: value === 'ALL' ? '' : value })}
      options={STATUS_FILTERS}
    />
  )

  return (
    <div className="grid gap-6">
      <PageHeader
        title={isPastor ? 'Renungan Saya' : 'Warta & Konten'}
        description={
          <Finding
            today={today}
            lastWarta={isPastor ? undefined : (lastWarta.data?.data[0] ?? null)}
            lastDevotional={lastDevotional.data?.data[0]}
            ownDevotionals={isPastor}
            drafts={drafts.data?.meta.total}
            loading={!lastDevotional.data || !drafts.data || (!isPastor && !lastWarta.data)}
            onShowDrafts={() => clearSearch({ status: 'draft' })}
          />
        }
        actions={
          <Button asChild size="lg">
            <Link to={addHref}>
              <Plus data-icon="inline-start" />
              {config.addLabel}
            </Link>
          </Button>
        }
      />

      <TableCard
        aria-label={isPastor ? 'Daftar renungan saya' : 'Daftar konten portal'}
        toolbar={
          <>
            {/* Admin: kategori menjadi segmen utama (bergulir di tempat bila sempit), status
                pindah ke samping pencarian. Pendeta hanya punya Renungan, jadi status di atas. */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {isPastor ? (
                statusControl
              ) : (
                <Segmented
                  label="Kategori konten"
                  value={category}
                  onChange={(next) => clearSearch({ category: next, status: '' })}
                  options={CATEGORY_ORDER.map((value) => ({
                    value,
                    label: CATEGORY_CONFIG[value].tab,
                  }))}
                />
              )}
              {count}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SearchField
                value={search}
                onChange={handleSearch}
                label={`Cari ${config.noun}`}
                placeholder="Cari judul atau ringkasan"
              />
              {!isPastor && statusControl}
              {filtered && (
                <Button variant="ghost" size="lg" onClick={() => clearSearch({ status: '' })}>
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
              label="Halaman daftar konten"
              page={page}
              perPage={PER_PAGE}
              total={total}
              unit={config.noun}
              onPage={(next) => update({ page: String(next) })}
            />
          )
        }
      >
        <Table className="table-fixed" aria-busy={list.loading}>
          <caption className="sr-only">{config.tab}</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Judul</TableHead>
              <TableHead className="hidden w-44 md:table-cell">Status</TableHead>
              <TableHead className="w-20 text-center">Terbit</TableHead>
              <TableHead className="w-14">
                <span className="sr-only">Tindakan</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={cn('transition-opacity', list.loading && result && 'opacity-60')}>
            {list.error && (
              <TableMessage colSpan={4}>
                Konten tidak dapat dimuat: {list.error}{' '}
                <button type="button" onClick={list.reload} className="font-medium underline">
                  Coba lagi
                </button>
              </TableMessage>
            )}
            {!result && !list.error && (
              <SkeletonRows cells={['', 'hidden md:table-cell', '', '']} />
            )}
            {result && !list.error && items.length === 0 && (
              <TableMessage colSpan={4}>
                {q ? (
                  <>
                    Tidak ada {config.noun} yang cocok dengan “{q}”.{' '}
                    <button
                      type="button"
                      className="font-medium underline"
                      onClick={() => clearSearch()}
                    >
                      Hapus pencarian
                    </button>
                  </>
                ) : filtered ? (
                  `Tidak ada ${config.noun} dengan status ini.`
                ) : (
                  <>
                    {config.empty}{' '}
                    <Link to={addHref} className="font-medium text-foreground underline">
                      {config.addLabel}
                    </Link>
                  </>
                )}
              </TableMessage>
            )}
            {!list.error &&
              items.map((item) => (
                <ContentRow
                  key={item.id}
                  item={item}
                  href={`${base}/${item.id}`}
                  pending={pending === item.id}
                  onToggle={() => void togglePublished(item)}
                  onDelete={() => confirmDelete(item)}
                />
              ))}
          </TableBody>
        </Table>
      </TableCard>

      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  )
}

// Temuan di bawah judul. Isinya frasa (span/tombol) karena dirender di dalam <p> PageHeader.
function Finding({
  today,
  lastWarta,
  lastDevotional,
  ownDevotionals,
  drafts,
  loading,
  onShowDrafts,
}: {
  today: string
  // undefined: tidak ditampilkan (Pendeta).
  lastWarta?: ContentListItem | null
  lastDevotional: ContentListItem | undefined
  // Pendeta hanya melihat renungannya sendiri, jadi kalimatnya tentang renungannya.
  ownDevotionals: boolean
  drafts: number | undefined
  loading: boolean
  onShowDrafts: () => void
}) {
  if (loading) {
    return (
      <span className="inline-block h-4 w-72 max-w-full animate-pulse rounded-md bg-muted align-middle" />
    )
  }
  const devotionalToday =
    lastDevotional?.published_at && toWitaInputs(lastDevotional.published_at).date === today
  const parts: ReactNode[] = []
  if (lastWarta !== undefined) {
    parts.push(
      lastWarta?.published_at
        ? `Warta terakhir terbit ${formatDate(lastWarta.published_at)}`
        : 'Belum ada warta yang terbit',
    )
  }
  if (ownDevotionals) {
    parts.push(
      lastDevotional?.published_at
        ? `Renungan Anda terakhir terbit ${devotionalToday ? 'hari ini' : formatDate(lastDevotional.published_at)}`
        : 'Anda belum menerbitkan renungan',
    )
  } else {
    parts.push(
      devotionalToday ? (
        'Renungan hari ini sudah terbit'
      ) : (
        <span key="devotional" className="font-medium text-foreground">
          Renungan hari ini belum terbit
        </span>
      ),
    )
  }
  if (drafts) {
    parts.push(
      <button
        key="drafts"
        type="button"
        onClick={onShowDrafts}
        className="font-medium text-foreground underline underline-offset-4"
      >
        {drafts.toLocaleString('id-ID')} draf
      </button>,
    )
  }
  return (
    <span className="tabular-nums">
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && ' · '}
          {part}
        </span>
      ))}
    </span>
  )
}

function ContentRow({
  item,
  href,
  pending,
  onToggle,
  onDelete,
}: {
  item: ContentListItem
  href: string
  pending: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const details = rowDetails(item)
  const when = item.published_at ?? item.updated_at
  return (
    <TableRow className="[&>td]:align-top">
      <TableCell>
        <div className="flex min-w-0 items-start gap-3">
          <RowVisual item={item} />
          <div className="min-w-0 flex-1">
            {/* Judul membungkus di layar sempit; baru dipotong satu baris di layar lebar. */}
            <Link
              to={href}
              className="block font-medium break-words underline-offset-4 hover:underline lg:truncate"
            >
              {item.title}
            </Link>
            <p className="mt-0.5 line-clamp-2 text-[0.8125rem] break-words text-muted-foreground lg:line-clamp-1">
              {/* Kolom Status tersembunyi di layar sempit; isinya pindah ke baris ini. */}
              <span className="md:hidden">
                {STATUS_LABELS[item.status]}
                {item.status !== 'DRAFT' &&
                  item.published_at &&
                  ` ${formatDate(item.published_at)}`}
                {details && ' · '}
              </span>
              {details}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <StatusBadge tone={STATUS_TONE[item.status]}>{STATUS_LABELS[item.status]}</StatusBadge>
        <p className="mt-1 text-[0.8125rem] text-muted-foreground tabular-nums">
          {item.status === 'DRAFT' ? 'Diubah ' : ''}
          {formatDate(when)}, {formatTime(when)}
        </p>
      </TableCell>
      <TableCell className="text-center">
        <PublishSwitch
          checked={item.is_published}
          disabled={pending}
          label={`Terbitkan “${item.title}”`}
          onToggle={onToggle}
        />
      </TableCell>
      <TableCell className="py-1.5 pr-2 pl-0 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-10 sm:size-8">
              <EllipsisVertical />
              <span className="sr-only">Tindakan untuk “{item.title}”</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem asChild>
              <Link to={href}>
                <Pencil />
                Ubah
              </Link>
            </DropdownMenuItem>
            {item.attachment_url && (
              <DropdownMenuItem asChild>
                <a href={item.attachment_url} target="_blank" rel="noreferrer">
                  <FileText />
                  {item.attachment_url.startsWith('https://') ? 'Buka tautan' : 'Buka lampiran'}
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

// Baris kedua: hal terpenting tiap kategori (nomor rekening, ayat, ada/tidaknya PDF).
function rowDetails(item: ContentListItem): ReactNode {
  switch (item.category) {
    case 'WARTA':
      return item.attachment_url ? (
        'PDF terlampir'
      ) : (
        <span className="text-warning-ink">PDF belum diunggah</span>
      )
    case 'PAYMENT_INFO':
      return (
        <span className="tabular-nums">
          {item.summary ?? (item.thumbnail_url ? 'Hanya QRIS' : 'Nomor rekening belum diisi')}
        </span>
      )
    case 'DEVOTIONAL':
      return [item.summary, item.author_name].filter(Boolean).join(' · ')
    default:
      return item.summary ?? `/${item.slug}`
  }
}

function RowVisual({ item }: { item: ContentListItem }) {
  if (item.thumbnail_url) {
    return (
      <img
        src={item.thumbnail_url}
        alt=""
        loading="lazy"
        className="size-10 flex-none rounded-md border bg-muted object-cover"
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-10 flex-none items-center justify-center rounded-md border border-dashed text-muted-foreground"
    >
      <FileText className="size-4" />
    </span>
  )
}

// Sakelar terbit/draf langsung di daftar.
function PublishSwitch({
  checked,
  disabled,
  label,
  onToggle,
}: {
  checked: boolean
  disabled: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-6 w-10 flex-none items-center rounded-full border-2 border-transparent transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-input',
      )}
    >
      <span
        className={cn(
          'block size-5 rounded-full bg-card transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}
