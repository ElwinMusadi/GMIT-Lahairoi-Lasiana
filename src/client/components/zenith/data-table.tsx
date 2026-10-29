import type { ComponentProps, ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

// Potongan tabel data bergaya Zenith yang dipakai bersama modul dashboard: kartu tabel
// (bilah alat, tabel, paginasi), kolom pencarian, baris pesan, dan baris kerangka.

export function TableCard({
  toolbar,
  footer,
  className,
  children,
  ...props
}: {
  toolbar?: ReactNode
  footer?: ReactNode
  className?: string
  children: ReactNode
} & Omit<ComponentProps<'section'>, 'children'>) {
  return (
    <section
      className={cn(
        'min-w-0 overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10',
        className,
      )}
      {...props}
    >
      {toolbar && <div className="grid gap-3 border-b px-4 py-3">{toolbar}</div>}
      {children}
      {footer}
    </section>
  )
}

export function SearchField({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder: string
  className?: string
}) {
  return (
    <div className={cn('relative w-full sm:w-80', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-9 pl-9"
      />
    </div>
  )
}

// Kelas pilihan (select) bawaan di bilah alat tabel dan filter.
export const selectClass =
  'h-9 min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

// Paginasi di kaki kartu tabel: rentang baris, nomor halaman, dan tombol sebelumnya/berikutnya.
export function TablePagination({
  label,
  page,
  perPage,
  total,
  unit,
  onPage,
}: {
  label: string
  page: number
  perPage: number
  total: number
  unit: string
  onPage: (page: number) => void
}) {
  if (total === 0) return null
  const pages = Math.max(1, Math.ceil(total / perPage))
  const first = (page - 1) * perPage + 1
  const last = Math.min(page * perPage, total)
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3"
    >
      <p className="text-sm text-muted-foreground tabular-nums">
        {first.toLocaleString('id-ID')}–{last.toLocaleString('id-ID')} dari{' '}
        {total.toLocaleString('id-ID')} {unit}
      </p>
      <div className="flex items-center gap-2">
        <span className="mr-1 text-sm text-muted-foreground tabular-nums">
          Halaman {page.toLocaleString('id-ID')} dari {pages.toLocaleString('id-ID')}
        </span>
        <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft />
          <span className="sr-only">Halaman sebelumnya</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight />
          <span className="sr-only">Halaman berikutnya</span>
        </Button>
      </div>
    </nav>
  )
}

// Satu baris selebar tabel untuk pesan galat, kosong, atau tanpa hasil.
export function TableMessage({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        className="py-10 text-center whitespace-normal text-muted-foreground"
      >
        {children}
      </TableCell>
    </TableRow>
  )
}

// Baris kerangka: kolom pertama dua baris (nama + keterangan), sisanya satu batang.
export function SkeletonRows({
  rows = 6,
  cells,
}: {
  rows?: number
  // Kelas tiap sel (mis. 'hidden md:table-cell') agar kerangka mengikuti kolom yang tampil.
  cells: string[]
}) {
  return Array.from({ length: rows }, (_, row) => (
    <TableRow key={row} aria-hidden="true" className="hover:bg-transparent">
      {cells.map((cell, index) => (
        <TableCell key={index} className={cell}>
          {index === 0 ? (
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="grid flex-1 gap-1.5">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3.5 w-56 max-w-full" />
              </div>
            </div>
          ) : (
            <Skeleton className="h-4 w-16" />
          )}
        </TableCell>
      ))}
    </TableRow>
  ))
}
