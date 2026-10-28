import { useRef, useState, type ReactNode } from 'react'
import { EllipsisVertical, FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import {
  CATEGORY_CONFIG,
  CATEGORY_ORDER,
  STATUS_LABELS,
  STATUS_PILL,
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

const controlClass =
  'h-9 rounded-lg border border-input bg-card text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

// CMS konten Portal Publik. Admin mengelola keenam kategori; Pendeta memakai halaman
// yang sama sebagai "Renungan Saya" (hanya renungan miliknya, dibatasi API).
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
  const first = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const last = Math.min(page * PER_PAGE, total)
  const filtered = Boolean(status || q)
  const addHref = `${base}/new${isPastor ? '' : `?category=${category}`}`

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            {isPastor ? 'Renungan Saya' : 'Warta & Konten'}
          </h1>
          <Finding
            today={today}
            lastWarta={isPastor ? undefined : (lastWarta.data?.data[0] ?? null)}
            lastDevotional={lastDevotional.data?.data[0]}
            ownDevotionals={isPastor}
            drafts={drafts.data?.meta.total}
            loading={!lastDevotional.data || !drafts.data || (!isPastor && !lastWarta.data)}
            onShowDrafts={() => clearSearch({ status: 'draft' })}
          />
        </div>
        <Button asChild size="lg">
          <Link to={addHref}>
            <Plus data-icon="inline-start" />
            {config.addLabel}
          </Link>
        </Button>
      </header>

      {!isPastor && (
        <CategoryTabs
          selected={category}
          onSelect={(next) => clearSearch({ category: next, status: '' })}
        />
      )}

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Cari judul atau ringkasan"
              aria-label={`Cari ${config.noun}`}
              className={cn(controlClass, 'pl-9')}
            />
          </div>
          <select
            value={status}
            onChange={(event) => update({ status: event.target.value })}
            aria-label="Status"
            className={cn(controlClass, 'px-3')}
          >
            <option value="">Semua status</option>
            <option value="draft">Draf</option>
            <option value="scheduled">Terjadwal</option>
            <option value="published">Terbit</option>
          </select>
          <p className="ml-auto text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {result ? `${total.toLocaleString('id-ID')} ${config.noun}` : ''}
          </p>
        </div>

        <div className="rounded-lg border bg-card">
          <table className="w-full table-fixed text-sm" aria-busy={list.loading}>
            <caption className="sr-only">{config.tab}</caption>
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="h-10 w-16 pl-4 font-normal">
                  <span className="sr-only">Gambar atau berkas</span>
                </th>
                <th scope="col" className="pr-4 font-normal">
                  Judul
                </th>
                <th scope="col" className="hidden w-44 pr-4 font-normal md:table-cell">
                  Status
                </th>
                <th scope="col" className="w-20 pr-2 text-center font-normal">
                  Terbit
                </th>
                <th scope="col" className="w-12 pr-2">
                  <span className="sr-only">Tindakan</span>
                </th>
              </tr>
            </thead>
            <tbody className={cn('transition-opacity', list.loading && result && 'opacity-60')}>
              {list.error && (
                <MessageRow>
                  Konten tidak dapat dimuat: {list.error}{' '}
                  <button type="button" onClick={list.reload} className="font-medium underline">
                    Coba lagi
                  </button>
                </MessageRow>
              )}
              {!result &&
                !list.error &&
                Array.from({ length: 6 }, (_, index) => <SkeletonRow key={index} />)}
              {result && !list.error && items.length === 0 && (
                <MessageRow>
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
                </MessageRow>
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
            </tbody>
          </table>

          {result && total > PER_PAGE && (
            <nav
              aria-label="Halaman daftar konten"
              className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-3"
            >
              <p className="text-sm text-muted-foreground tabular-nums">
                {first.toLocaleString('id-ID')}–{last.toLocaleString('id-ID')} dari{' '}
                {total.toLocaleString('id-ID')}
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
      </div>

      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  )
}

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
  if (loading) return <Skeleton className="h-5 w-80 max-w-full" />
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
    <p className="text-sm text-muted-foreground tabular-nums">
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && ' · '}
          {part}
        </span>
      ))}
    </p>
  )
}

// Enam kategori sebagai tab; di ponsel menjadi satu pilihan.
function CategoryTabs({
  selected,
  onSelect,
}: {
  selected: ContentCategory
  onSelect: (category: ContentCategory) => void
}) {
  return (
    <>
      <div className="grid gap-1.5 md:hidden">
        <label htmlFor="pilih-kategori" className="text-xs text-muted-foreground">
          Kategori
        </label>
        <select
          id="pilih-kategori"
          value={selected}
          onChange={(event) => onSelect(event.target.value as ContentCategory)}
          className="h-10 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {CATEGORY_ORDER.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_CONFIG[category].tab}
            </option>
          ))}
        </select>
      </div>
      <nav aria-label="Kategori konten" className="hidden border-b md:block">
        <ul className="flex gap-1">
          {CATEGORY_ORDER.map((category) => {
            const active = category === selected
            return (
              <li key={category}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(category)}
                  className={cn(
                    '-mb-px border-b-2 px-3 pt-1 pb-2.5 text-sm outline-offset-[-2px]',
                    active
                      ? 'border-foreground font-medium text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {CATEGORY_CONFIG[category].tab}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
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
    <tr className="border-t border-rule align-top">
      <td className="py-3 pl-4">
        <RowVisual item={item} />
      </td>
      <td className="py-3 pr-4">
        <Link
          to={href}
          className="line-clamp-2 font-medium underline-offset-4 hover:underline sm:line-clamp-1"
        >
          {item.title}
        </Link>
        <p className="mt-0.5 truncate text-[0.8125rem] text-muted-foreground">
          <span className="md:hidden">
            {STATUS_LABELS[item.status]}
            {item.status !== 'DRAFT' && item.published_at && ` ${formatDate(item.published_at)}`}
            {details && ' · '}
          </span>
          {details}
        </p>
      </td>
      <td className="hidden py-3 pr-4 md:table-cell">
        <span
          className={cn(
            'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
            STATUS_PILL[item.status],
          )}
        >
          {STATUS_LABELS[item.status]}
        </span>
        <p className="mt-1 text-[0.8125rem] text-muted-foreground tabular-nums">
          {item.status === 'DRAFT' ? 'Diubah ' : ''}
          {formatDate(when)}, {formatTime(when)}
        </p>
      </td>
      <td className="py-2.5 pr-2 text-center">
        <PublishSwitch
          checked={item.is_published}
          disabled={pending}
          label={`Terbitkan “${item.title}”`}
          onToggle={onToggle}
        />
      </td>
      <td className="py-2 pr-2 text-right">
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
      </td>
    </tr>
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
        className="size-10 rounded-md border bg-muted object-cover"
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-10 items-center justify-center rounded-md border border-dashed text-muted-foreground"
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

function MessageRow({ children }: { children: ReactNode }) {
  return (
    <tr className="border-t border-rule">
      <td colSpan={5} className="px-4 py-6 text-muted-foreground">
        {children}
      </td>
    </tr>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-t border-rule" aria-hidden="true">
      <td className="py-3 pl-4">
        <Skeleton className="size-10" />
      </td>
      <td className="py-3 pr-4">
        <Skeleton className="h-5 w-64 max-w-full" />
        <Skeleton className="mt-1.5 h-4 w-40 max-w-full" />
      </td>
      <td className="hidden py-3 pr-4 md:table-cell">
        <Skeleton className="h-5 w-20" />
      </td>
      <td className="py-3 pr-2">
        <Skeleton className="mx-auto h-6 w-10 rounded-full" />
      </td>
      <td />
    </tr>
  )
}
