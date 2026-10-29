import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SegmentedOption<T extends string> = { value: T; label: ReactNode; count?: number }

// Kontrol bersegmen Zenith ("Semua | Selesai | Diproses"): saringan status dan pilihan seri
// grafik. Tiap segmen tombol dengan aria-pressed, dibungkus grup berlabel.
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-muted p-1 text-sm',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md px-3 py-1 font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs"
        >
          {option.label}
          {option.count !== undefined && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {option.count.toLocaleString('id-ID')}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
