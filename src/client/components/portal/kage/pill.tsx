import type { ComponentProps, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

// Tombol dan tautan berbentuk pil, bahasa tombol rancangan kage. Panah "→" hanya hiasan
// dan disembunyikan dari pembaca layar.

const pillVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-site-body font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow] outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        // Putih di atas foto atau panel gelap (CTA utama hero).
        light: 'bg-white text-site-panel shadow-lg hover:bg-site-paper hover:shadow-xl',
        // Hitam pekat (tombol utama di kanvas terang; terang di tema gelap).
        dark: 'bg-site-ink text-site-canvas hover:opacity-90',
        // Kaca di atas foto.
        glass:
          'border border-white/30 bg-white/12 text-white hover:border-white/50 hover:bg-white/20',
        // Bertepi tipis di kanvas.
        outline: 'border border-site-rule bg-site-canvas text-site-ink hover:border-site-ink',
        // Di dalam panel gelap.
        panel:
          'border border-white/20 bg-white/10 font-site-mono font-medium text-white hover:bg-white/20',
      },
      size: {
        sm: 'h-9 px-4 text-[13px]',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-[15px]',
      },
    },
    defaultVariants: { tone: 'dark', size: 'md' },
  },
)

type PillStyle = VariantProps<typeof pillVariants> & { arrow?: boolean; className?: string }

function Arrow() {
  return <span aria-hidden="true">→</span>
}

export function PillLink({
  to,
  tone,
  size,
  arrow,
  className,
  children,
  ...props
}: PillStyle & Omit<ComponentProps<'a'>, 'href'> & { to: string; children: ReactNode }) {
  const classes = cn(pillVariants({ tone, size }), className)
  // Tautan luar, berkas, dan jangkar di halaman yang sama memakai <a> biasa.
  const plain = /^(https?:|mailto:|tel:|#|\/api\/)/.test(to)
  const content = (
    <>
      {children}
      {arrow && <Arrow />}
    </>
  )
  return plain ? (
    <a href={to} className={classes} {...props}>
      {content}
    </a>
  ) : (
    <Link to={to} className={classes} {...props}>
      {content}
    </Link>
  )
}

export function PillButton({
  tone,
  size,
  arrow,
  className,
  children,
  type = 'button',
  ...props
}: PillStyle & ComponentProps<'button'>) {
  return (
    <button type={type} className={cn(pillVariants({ tone, size }), className)} {...props}>
      {children}
      {arrow && <Arrow />}
    </button>
  )
}
