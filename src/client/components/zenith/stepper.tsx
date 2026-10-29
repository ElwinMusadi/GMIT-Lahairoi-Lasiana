import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// Penunjuk langkah wizard Zenith: lingkaran bernomor (centang untuk langkah yang selesai)
// disambung garis. Hanya penanda posisi; perpindahan langkah diatur halaman.
export function Stepper({
  label,
  steps,
  current,
}: {
  label: string
  steps: string[]
  // Indeks langkah yang sedang dikerjakan (mulai 0).
  current: number
}) {
  return (
    <ol aria-label={label} className="flex items-center gap-2 sm:gap-3">
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <li
            key={step}
            aria-current={active ? 'step' : undefined}
            className="flex min-w-0 items-center gap-2 sm:gap-3 [&:not(:last-child)]:flex-1"
          >
            <span
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums',
                done && 'bg-primary text-primary-foreground',
                active && 'bg-primary text-primary-foreground ring-4 ring-primary/15',
                !done && !active && 'bg-muted text-muted-foreground',
              )}
            >
              {done ? <Check className="size-4" aria-hidden="true" /> : index + 1}
            </span>
            <span
              className={cn(
                'truncate text-sm',
                active ? 'font-medium' : 'text-muted-foreground',
                !active && 'hidden sm:inline',
              )}
            >
              {step}
              {done && <span className="sr-only"> (selesai)</span>}
            </span>
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn('h-px min-w-4 flex-1', done ? 'bg-primary' : 'bg-border')}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
