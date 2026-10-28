import type { ReactNode } from 'react'
import { group } from '@shared/form-reader'
import { Input } from '@/components/ui/input'
import { inputClass } from '@/lib/form'
import { cn } from '@/lib/utils'

// Field form keuangan: nominal Rupiah dan pilihan pendek (jenis transaksi/anggaran).

// Nominal Rupiah dengan titik ribuan saat diketik ("1.500.000"); nilainya bilangan
// bulat atau null bila kosong.
export function RupiahInput({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string
  value: number | null
  onChange: (value: number | null) => void
  invalid?: boolean
  describedBy?: string
}) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground"
      >
        Rp
      </span>
      <Input
        id={id}
        name={id}
        inputMode="numeric"
        autoComplete="off"
        value={value === null ? '' : group(value)}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '').slice(0, 13)
          onChange(digits ? Number(digits) : null)
        }}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={cn(inputClass, 'pl-9 tabular-nums')}
      />
    </div>
  )
}

// Radio berbentuk tombol bersebelahan, mis. Kas masuk / Kas keluar.
export function SegmentedChoice<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  disabled,
  invalid,
  hint,
  error,
}: {
  name: string
  legend: string
  options: { value: T; label: string }[]
  value: T | ''
  onChange: (value: T) => void
  disabled?: boolean
  invalid?: boolean
  hint?: ReactNode
  error?: ReactNode
}) {
  return (
    <fieldset className="grid content-start gap-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex h-10 cursor-pointer items-center justify-center rounded-lg border border-input bg-card px-3 text-sm',
              'has-checked:border-primary has-checked:font-medium has-checked:ring-1 has-checked:ring-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
              'has-disabled:cursor-not-allowed has-disabled:opacity-60',
              invalid && 'border-destructive',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      {hint}
      {error}
    </fieldset>
  )
}
