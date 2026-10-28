import type { ReactNode } from 'react'
import { Reveal } from '@/components/portal/kage/reveal'
import { TwoToneHeading } from '@/components/portal/kage/two-tone-heading'
import { cn } from '@/lib/utils'

// Seksi halaman rancangan kage: ritme vertikal lapang (120 px di desktop), lebar isi
// 1180 px, dan latar kanvas atau putih tulang yang berselang-seling.

export function SiteSection({
  id,
  labelledBy,
  tone = 'canvas',
  className,
  children,
}: {
  id?: string
  labelledBy?: string
  tone?: 'canvas' | 'paper'
  className?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        'scroll-mt-24 px-6 py-20 lg:py-[120px]',
        tone === 'paper' ? 'bg-site-paper' : 'bg-site-canvas',
        className,
      )}
    >
      <div className="mx-auto max-w-[1180px]">{children}</div>
    </section>
  )
}

// Pembuka seksi: judul dua nada di tengah dan satu kalimat pengantar.
export function SectionIntro({
  id,
  lead,
  accent,
  intro,
  inline,
}: {
  id: string
  lead: ReactNode
  accent?: ReactNode
  intro?: ReactNode
  inline?: boolean
}) {
  return (
    <div className="mx-auto grid max-w-[760px] justify-items-center gap-6 text-center">
      <Reveal>
        <TwoToneHeading id={id} lead={lead} accent={accent} inline={inline} />
      </Reveal>
      {intro && (
        <p className="max-w-[60ch] text-base leading-relaxed text-site-ink/80 md:text-lg">
          {intro}
        </p>
      )}
    </div>
  )
}

// Pesan saat data gagal dimuat, dengan tombol "Coba lagi".
export function LoadError({
  message,
  onRetry,
  onDark = false,
  className,
}: {
  message: string
  onRetry: () => void
  onDark?: boolean
  className?: string
}) {
  return (
    <p
      role="alert"
      className={cn('text-base', onDark ? 'text-white/80' : 'text-site-muted', className)}
    >
      {message}{' '}
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          'rounded-sm font-semibold underline underline-offset-4 outline-none focus-visible:ring-3',
          onDark
            ? 'text-white focus-visible:ring-site-accent'
            : 'text-site-ink focus-visible:ring-ring',
        )}
      >
        Coba lagi
      </button>
    </p>
  )
}
