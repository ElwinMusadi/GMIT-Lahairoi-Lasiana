import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Potongan form yang dipakai bersama oleh dialog KK, anggota jemaat, dan rayon.

export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.[0]) return null
  return (
    <p id={id} className="text-[0.8125rem] text-destructive">
      {messages[0]}
    </p>
  )
}

export function FieldHint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-[0.8125rem] text-muted-foreground">
      {children}
    </p>
  )
}

// Kelompok field dengan judul kecil, mis. "Identitas" atau "Sakramen".
export function FormSection({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <fieldset className={cn('grid gap-x-3 gap-y-5 border-t border-rule pt-5', className)}>
      <legend className="float-left col-span-full w-full text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  )
}
