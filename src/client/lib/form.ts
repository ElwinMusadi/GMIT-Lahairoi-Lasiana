import { cn } from './utils'

// Kelas dan atribut field form dashboard (dialog jemaat, rayon, keuangan, dan konten).

export const inputClass = 'h-10 rounded-lg bg-card px-3 text-base md:text-sm'

export const selectClass = cn(
  inputClass,
  'w-full border border-input outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive',
)

// aria-describedby dari petunjuk dan pesan error sebuah field.
export function describedBy(errors: Record<string, string[]>, field: string, hint?: string) {
  return [hint, errors[field] ? `${field}-error` : null].filter(Boolean).join(' ') || undefined
}

export const textareaClass =
  'w-full rounded-lg border border-input bg-card px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm'
