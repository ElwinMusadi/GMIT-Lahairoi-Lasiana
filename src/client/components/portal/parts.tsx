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
