import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { PillButton } from '@/components/portal/kage/pill'
import { cn } from '@/lib/utils'

// Kontrol daftar Portal Publik bergaya kage: pil saringan di atas foto hero, kolom cari
// berbentuk pil, dan pager. Dipakai Jadwal, Warta, Renungan, Berita, dan Galeri.

// Pil saringan di atas foto: yang aktif putih, yang lain kaca.
export function PhotoFilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 flex-none items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-site-accent',
        active ? 'bg-white text-site-panel' : 'bg-white/[0.12] text-white hover:bg-white/20',
      )}
    >
      {children}
      {active && <span aria-hidden="true" className="size-1.5 rounded-full bg-site-accent" />}
    </button>
  )
}

// Kolom cari berbentuk pil. Teks diketik langsung, pencarian dikirim 300 ms setelah
// berhenti mengetik; bila nilai di URL berubah dari luar (mis. tombol Kembali), kolom
// ikut berubah. `onPhoto`: kaca di atas foto hero.
export function SearchField({
  value,
  onSearch,
  label,
  placeholder,
  onPhoto = false,
  className,
}: {
  value: string
  onSearch: (value: string) => void
  label: string
  placeholder: string
  onPhoto?: boolean
  className?: string
}) {
  const [text, setText] = useState(value)
  const [synced, setSynced] = useState(value)
  if (value !== synced) {
    setSynced(value)
    if (value !== text.trim()) setText(value)
  }
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <div className={cn('relative w-full sm:w-80', className)}>
      <Search
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2',
          onPhoto ? 'text-white/75' : 'text-site-muted',
        )}
      />
      <input
        type="search"
        value={text}
        onChange={(event) => {
          const next = event.target.value
          setText(next)
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => onSearch(next.trim()), 300)
        }}
        placeholder={placeholder}
        aria-label={label}
        className={cn(
          'h-11 w-full rounded-full border pr-4 pl-11 text-base outline-none focus-visible:ring-3',
          onPhoto
            ? 'border-white/50 bg-white/[0.12] text-white [color-scheme:dark] placeholder:text-white/75 focus-visible:ring-site-accent'
            : 'border-site-muted bg-site-canvas text-site-ink placeholder:text-site-muted focus-visible:ring-ring',
        )}
      />
    </div>
  )
}

// Halaman sebelum/berikutnya: "1–12 dari 40 warta".
export function SitePager({
  page,
  perPage,
  total,
  noun,
  onPage,
  onDark = false,
  className,
}: {
  page: number
  perPage: number
  total: number
  noun: string
  onPage: (page: number) => void
  onDark?: boolean
  className?: string
}) {
  if (total <= perPage) return null
  const first = (page - 1) * perPage + 1
  const last = Math.min(page * perPage, total)
  const tone = onDark ? 'glass' : 'outline'
  return (
    <nav
      aria-label={`Halaman ${noun}`}
      className={cn('flex w-full flex-wrap items-center justify-between gap-3', className)}
    >
      <p className={cn('text-sm tabular-nums', onDark ? 'text-white/75' : 'text-site-muted')}>
        {first.toLocaleString('id-ID')}–{last.toLocaleString('id-ID')} dari{' '}
        {total.toLocaleString('id-ID')} {noun}
      </p>
      <div className="flex gap-2">
        <PillButton tone={tone} size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Sebelumnya
        </PillButton>
        <PillButton tone={tone} size="sm" disabled={last >= total} onClick={() => onPage(page + 1)}>
          Berikutnya
        </PillButton>
      </div>
    </nav>
  )
}
