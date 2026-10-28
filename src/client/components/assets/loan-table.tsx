import type { ReactNode } from 'react'
import { Clock } from 'lucide-react'
import { ASSET_CONDITION_LABELS, type AssetLoan } from '@shared/types'
import { Button } from '@/components/ui/button'
import { dueHint } from '@/lib/assets'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

type Props = {
  items: AssetLoan[]
  loading: boolean
  today: string
  onReturn: (loan: AssetLoan) => void
}

// Log peminjaman. Peminjaman yang melewati batas kembali diberi tanda "Terlambat N hari";
// yang belum kembali punya tombol Kembalikan di kolom terakhir.
export function LoanTable({ items, loading, today, onReturn }: Props) {
  const anyOpen = items.some((loan) => loan.status !== 'RETURNED')
  return (
    <table className={cn('w-full table-fixed text-sm', loading && 'opacity-60')}>
      <caption className="sr-only">Peminjaman barang</caption>
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          <th scope="col" className="h-10 pr-4 pl-4 font-normal">
            Barang
          </th>
          <th scope="col" className="hidden pr-4 font-normal md:table-cell md:w-[30%]">
            Peminjam
          </th>
          <th scope="col" className="hidden w-16 pr-4 text-right font-normal sm:table-cell">
            Jumlah
          </th>
          <th scope="col" className="hidden w-28 pr-4 font-normal lg:table-cell">
            Dipinjam
          </th>
          <th scope="col" className="hidden w-44 pr-4 font-normal sm:table-cell">
            Batas kembali
          </th>
          {anyOpen && (
            <th scope="col" className="w-28 pr-3 sm:w-32">
              <span className="sr-only">Pengembalian</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {items.map((loan) => (
          <LoanRow
            key={loan.id}
            loan={loan}
            today={today}
            actionColumn={anyOpen}
            onReturn={() => onReturn(loan)}
          />
        ))}
      </tbody>
    </table>
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
    <tr className="border-t border-rule align-top">
      <td className="py-3 pr-4 pl-4">
        <p className="font-medium break-words">
          {loan.asset_name}{' '}
          <span className="font-normal whitespace-nowrap text-muted-foreground tabular-nums sm:hidden">
            × {loan.quantity_borrowed.toLocaleString('id-ID')}
          </span>
        </p>
        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
          <span className="font-mono">{loan.asset_code}</span>
          <span className="lg:hidden"> · dipinjam {formatDate(loan.borrow_date)}</span>
        </p>
        <p className="mt-1 text-[0.8125rem] break-words md:hidden">{borrower}</p>
        <div className="mt-1.5 text-[0.8125rem] sm:hidden">
          <DueCell loan={loan} today={today} inline />
        </div>
      </td>
      <td className="hidden py-3 pr-4 break-words md:table-cell">
        <p>{loan.borrower_name}</p>
        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
          {loan.rayon_name ? `Rayon ${loan.rayon_name}` : 'Bukan atas nama rayon'}
        </p>
      </td>
      <td className="hidden py-3 pr-4 text-right font-medium tabular-nums sm:table-cell">
        {loan.quantity_borrowed.toLocaleString('id-ID')}
      </td>
      <td className="hidden py-3 pr-4 whitespace-nowrap tabular-nums lg:table-cell">
        {formatDate(loan.borrow_date)}
      </td>
      <td className="hidden py-3 pr-4 sm:table-cell">
        <DueCell loan={loan} today={today} />
      </td>
      {actionColumn && (
        <td className="py-2 pr-3 text-right">
          {loan.status !== 'RETURNED' && (
            <Button variant="outline" className="h-10 sm:h-8" onClick={onReturn}>
              Kembalikan
              <span className="sr-only">
                {' '}
                {loan.asset_name} dari {loan.borrower_name}
              </span>
            </Button>
          )}
        </td>
      )}
    </tr>
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
      <span className="inline-flex flex-none items-center gap-1 rounded-full bg-negative-soft px-2 py-0.5 text-xs font-medium whitespace-nowrap text-negative-ink">
        <Clock className="size-3" aria-hidden="true" />
        Terlambat {loan.days_overdue.toLocaleString('id-ID')} hari
      </span>
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
