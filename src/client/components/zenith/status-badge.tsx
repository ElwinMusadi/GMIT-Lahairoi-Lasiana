import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Lencana status berwarna solid seperti pil status Zenith. Teks putih memakai nada -700/-600
// agar kontrasnya ≥4,5:1 pada teks 12 px; kuning memakai teks gelap.
const TONES = {
  success: 'bg-emerald-700 text-white',
  warning: 'bg-amber-400 text-neutral-950',
  danger: 'bg-red-600 text-white',
  // "Diproses": hitam di tema terang, terang di tema gelap (Zenith "Processing").
  info: 'bg-primary text-primary-foreground',
  brand: 'bg-brand text-brand-foreground',
  neutral: 'bg-muted text-foreground ring-1 ring-border ring-inset',
} as const

export type StatusTone = keyof typeof TONES

export function StatusBadge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: StatusTone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
