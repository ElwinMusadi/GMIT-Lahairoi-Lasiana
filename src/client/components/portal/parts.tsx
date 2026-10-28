import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Potongan tata letak Portal Publik (rancangan design/stitch/08): pita section selebar
// layar dengan isi maksimal 80rem, label kecil amber di atas judul biru tua.

export function PortalSection({
  id,
  tone = 'surface',
  className,
  children,
  labelledBy,
}: {
  id?: string
  tone?: 'surface' | 'low'
  className?: string
  children: ReactNode
  labelledBy?: string
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        'scroll-mt-24 px-4 py-10 lg:px-8',
        tone === 'low' ? 'bg-portal-low' : 'bg-portal-surface',
        className,
      )}
    >
      <div className="mx-auto grid max-w-7xl gap-6">{children}</div>
    </section>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('text-xs font-bold tracking-wider text-portal-amber uppercase', className)}>
      {children}
    </span>
  )
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  action,
  center = false,
  level = 2,
}: {
  id: string
  eyebrow: string
  title: ReactNode
  lead?: ReactNode
  action?: ReactNode
  center?: boolean
  level?: 1 | 2
}) {
  const Heading = level === 1 ? 'h1' : 'h2'
  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        center
          ? 'mx-auto max-w-3xl items-center text-center'
          : 'sm:flex-row sm:items-end sm:justify-between',
      )}
    >
      <div className={cn('grid gap-1', center && 'justify-items-center')}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading
          id={id}
          className={cn(
            'font-portal-heading font-bold tracking-tight text-balance text-portal-navy',
            level === 1
              ? 'text-3xl sm:text-[2.5rem] sm:leading-[3rem]'
              : 'text-2xl sm:text-[2rem] sm:leading-10',
          )}
        >
          {title}
        </Heading>
        {lead && <p className="max-w-2xl text-pretty text-portal-muted">{lead}</p>}
      </div>
      {action}
    </div>
  )
}

// Kartu putih dengan bayangan halus, unit dasar rancangan portal.
export function PortalCard({
  className,
  children,
  as: Tag = 'div',
}: {
  className?: string
  children: ReactNode
  as?: 'div' | 'article' | 'section'
}) {
  return <Tag className={cn('rounded-xl bg-white shadow-sm', className)}>{children}</Tag>
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-portal-highest bg-white/60 px-5 py-6 text-sm text-portal-muted">
      {children}
    </p>
  )
}

// Pembuka halaman portal: pita terang berisi label, judul halaman, dan kalimat pengantar,
// dengan tempat untuk saringan di bawahnya.
export function PageIntro({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id: string
  eyebrow: string
  title: ReactNode
  lead: ReactNode
  children?: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="bg-portal-low px-4 py-10 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <SectionHeading id={id} level={1} eyebrow={eyebrow} title={title} lead={lead} />
        {children}
      </div>
    </section>
  )
}

// Halaman sebelum/berikutnya untuk daftar portal.
export function Pager({
  page,
  perPage,
  total,
  noun,
  onPage,
}: {
  page: number
  perPage: number
  total: number
  noun: string
  onPage: (page: number) => void
}) {
  if (total <= perPage) return null
  const first = (page - 1) * perPage + 1
  const last = Math.min(page * perPage, total)
  const button =
    'rounded-lg bg-white px-4 py-2 text-sm font-semibold text-portal-navy shadow-sm hover:bg-portal-high disabled:opacity-40 disabled:hover:bg-white'
  return (
    <nav
      aria-label={`Halaman ${noun}`}
      className="flex flex-wrap items-center justify-between gap-3 pt-2"
    >
      <p className="text-sm text-portal-muted tabular-nums">
        {first.toLocaleString('id-ID')}–{last.toLocaleString('id-ID')} dari{' '}
        {total.toLocaleString('id-ID')} {noun}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className={button}
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Sebelumnya
        </button>
        <button
          type="button"
          className={button}
          disabled={last >= total}
          onClick={() => onPage(page + 1)}
        >
          Berikutnya
        </button>
      </div>
    </nav>
  )
}

// Tombol pil saringan (jenis ibadah, rayon).
export function FilterPill({
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
        'flex-none rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
        active
          ? 'bg-portal-indigo text-white'
          : 'bg-white text-portal-muted shadow-sm hover:bg-portal-high hover:text-portal-ink',
      )}
    >
      {children}
    </button>
  )
}
