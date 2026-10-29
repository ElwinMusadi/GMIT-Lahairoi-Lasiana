import type { ReactNode } from 'react'
import { Clock } from 'lucide-react'
import { ASSET_CONDITION_LABELS, type AssetLoan } from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SkeletonRows, TableMessage } from '@/components/zenith/data-table'
import { StatusBadge } from '@/components/zenith/status-badge'
import { dueHint } from '@/lib/assets'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

type Props = {
  // undefined: data pertama belum dimuat (baris kerangka).
  items: AssetLoan[] | undefined
  loading: boolean
  // Pesan galat atau daftar kosong, menggantikan baris data.
  message?: ReactNode
  today: string
  onReturn: (loan: AssetLoan) => void
}

// Kolom yang tampil untuk kerangka baris, sama dengan kepala tabel (tanpa kolom tombol).
const SKELETON_CELLS = [
  '',
  'hidden xl:table-cell',
  'hidden sm:table-cell',
  'hidden xl:table-cell',
  'hidden sm:table-cell',
]

// Log peminjaman. Peminjaman yang melewati batas kembali diberi tanda "Terlambat N hari";
// yang belum kembali punya tombol Kembalikan di kolom terakhir. Peminjam dan tanggal pinjam
// baru mendapat kolom sendiri mulai lebar xl, agar kolom barang tidak terhimpit di samping
// sidebar.
export function LoanTable({ items, loading, message, today, onReturn }: Props) {
  const anyOpen = Boolean(items?.some((loan) => loan.status !== 'RETURNED'))
  return (
    <Table className="table-fixed" aria-busy={loading}>
      <caption className="sr-only">Peminjaman barang</caption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Barang</TableHead>
          <TableHead className="hidden w-56 xl:table-cell">Peminjam</TableHead>
          <TableHead className="hidden w-20 text-right sm:table-cell">Jumlah</TableHead>
          <TableHead className="hidden w-32 xl:table-cell">Dipinjam</TableHead>
          <TableHead className="hidden w-44 sm:table-cell">Batas kembali</TableHead>
          {anyOpen && (
            <TableHead className="w-28 sm:w-32">
              <span className="sr-only">Pengembalian</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody className={cn('transition-opacity', loading && items && 'opacity-60')}>
        {message ? (
          <TableMessage colSpan={anyOpen ? 6 : 5}>{message}</TableMessage>
        ) : !items ? (
          <SkeletonRows avatar={false} cells={SKELETON_CELLS} />
        ) : (
          items.map((loan) => (
            <LoanRow
              key={loan.id}
              loan={loan}
              today={today}
              actionColumn={anyOpen}
              onReturn={() => onReturn(loan)}
            />
          ))
        )}
      </TableBody>
    </Table>
  )
}

function LoanRow({
  loan,
  today,
  actionColumn,
  onReturn,
}: {
  loan: AssetLoan
  today: string
  actionColumn: boolean
  onReturn: () => void
}) {
  const borrower = (
    <>
      {loan.borrower_name}
      <span className="text-muted-foreground">
        {loan.rayon_name ? ` · Rayon ${loan.rayon_name}` : ''}
      </span>
    </>
  )
  return (
    <TableRow className="[&>td]:align-top">
      <TableCell>
        <p className="font-medium break-words">
          {loan.asset_name}{' '}
          <span className="font-normal whitespace-nowrap text-muted-foreground tabular-nums sm:hidden">
            × {loan.quantity_borrowed.toLocaleString('id-ID')}
          </span>
        </p>
        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
          <span className="font-mono">{loan.asset_code}</span>
          <span className="xl:hidden"> · dipinjam {formatDate(loan.borrow_date)}</span>
        </p>
        <p className="mt-1 text-[0.8125rem] break-words xl:hidden">{borrower}</p>
        <div className="mt-1.5 text-[0.8125rem] sm:hidden">
          <DueCell loan={loan} today={today} inline />
        </div>
      </TableCell>
      <TableCell className="hidden break-words xl:table-cell">
        <p>{loan.borrower_name}</p>
        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
          {loan.rayon_name ? `Rayon ${loan.rayon_name}` : 'Bukan atas nama rayon'}
        </p>
      </TableCell>
      <TableCell className="hidden text-right font-medium tabular-nums sm:table-cell">
        {loan.quantity_borrowed.toLocaleString('id-ID')}
      </TableCell>
      <TableCell className="hidden whitespace-nowrap tabular-nums xl:table-cell">
        {formatDate(loan.borrow_date)}
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <DueCell loan={loan} today={today} />
      </TableCell>
      {actionColumn && (
        <TableCell className="py-1.5 pr-2 pl-0 text-right">
          {loan.status !== 'RETURNED' && (
            <Button variant="outline" className="h-10 sm:h-8" onClick={onReturn}>
              Kembalikan
              <span className="sr-only">
                {' '}
                {loan.asset_name} dari {loan.borrower_name}
              </span>
            </Button>
          )}
        </TableCell>
      )}
    </TableRow>
  )
}

// Batas kembali dan statusnya: sisa hari, tanda terlambat, atau tanggal kembali. `inline`
// menaruh keduanya dalam satu baris (baris ringkas di layar sempit).
function DueCell({ loan, today, inline }: { loan: AssetLoan; today: string; inline?: boolean }) {
  let main: ReactNode
  let note: string
  if (loan.status === 'RETURNED') {
    main = `Kembali ${formatDate(loan.return_date ?? loan.due_date)}`
    note =
      loan.return_condition && loan.return_condition !== 'GOOD'
        ? ASSET_CONDITION_LABELS[loan.return_condition]
        : `batas ${formatDate(loan.due_date)}`
  } else if (loan.status === 'OVERDUE') {
    main = (
      <StatusBadge tone="danger" className="tabular-nums">
        <Clock className="size-3" aria-hidden="true" />
        Terlambat {loan.days_overdue.toLocaleString('id-ID')} hari
      </StatusBadge>
    )
    note = `batas ${formatDate(loan.due_date)}`
  } else {
    main = inline ? `Batas ${formatDate(loan.due_date)}` : formatDate(loan.due_date)
    note = dueHint(loan, today)
  }
  if (inline && loan.status === 'OVERDUE') {
    // Label terlambat sudah memisahkan keduanya; tanpa titik agar baris kedua tidak
    // diawali "·" saat terlipat.
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
        {main}
        <span className="text-muted-foreground">Batas {formatDate(loan.due_date)}</span>
      </p>
    )
  }
  if (inline) {
    return (
      <p className="tabular-nums">
        {main} <span className="whitespace-nowrap text-muted-foreground">· {note}</span>
      </p>
    )
  }
  return (
    <>
      <p className="whitespace-nowrap tabular-nums">{main}</p>
      <p className="mt-1 text-[0.8125rem] whitespace-nowrap text-muted-foreground tabular-nums">
        {note.charAt(0).toUpperCase() + note.slice(1)}
      </p>
    </>
  )
}
