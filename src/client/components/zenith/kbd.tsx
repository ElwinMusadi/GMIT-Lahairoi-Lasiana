import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Tombol keyboard kecil, mis. "Ctrl K" di kolom pencarian dan petunjuk palet perintah.
export function Kbd({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-sans text-xs font-medium text-muted-foreground',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
