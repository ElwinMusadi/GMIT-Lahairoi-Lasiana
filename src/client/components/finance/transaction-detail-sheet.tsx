import type { ReactNode } from 'react'
import { History, Paperclip, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { TRANSACTION_TYPE_LABELS, type FinanceTransaction } from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { signedAmount } from '@/lib/finance'
import { formatDate, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ReceiptPreview } from './receipt'

// Rincian satu transaksi beserta bukti kuitansinya. Pendeta dan Majelis hanya
// membaca; Bendahara dan Admin mengubah atau menghapus dari sini.
export function TransactionDetailSheet({
  transaction,
  onClose,
  onEdit,
  onDelete,
  canEdit,
  showHistory,
}: {
  transaction: FinanceTransaction | null
  onClose: () => void
  onEdit: (transaction: FinanceTransaction) => void
  onDelete: (transaction: FinanceTransaction) => void
  canEdit: boolean
  showHistory: boolean
}) {
  return (
    <Sheet open={transaction !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        {transaction && (
          <Detail
            transaction={transaction}
            onEdit={onEdit}
            onDelete={onDelete}
            canEdit={canEdit}
            showHistory={showHistory}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function Detail({
  transaction,
  onEdit,
  onDelete,
  canEdit,
  showHistory,
}: {
  transaction: FinanceTransaction
  onEdit: (transaction: FinanceTransaction) => void
  onDelete: (transaction: FinanceTransaction) => void
  canEdit: boolean
  showHistory: boolean
}) {
  const income = transaction.type === 'INCOME'
  const edited = transaction.updated_at !== transaction.created_at

  return (
    <>
      <SheetHeader className="border-b px-5 pt-5 pb-4">
        <p className="text-sm text-muted-foreground">
          {TRANSACTION_TYPE_LABELS[transaction.type]} · {formatDate(transaction.transaction_date)}
        </p>
        <SheetTitle
          className={cn('pr-8 text-2xl font-semibold tabular-nums', income && 'text-positive')}
        >
          {signedAmount(transaction.type, transaction.amount)}
        </SheetTitle>
        <SheetDescription className={cn(!transaction.description && 'sr-only')}>
          {transaction.description ?? 'Tanpa keterangan'}
        </SheetDescription>
      </SheetHeader>

      <div className="grid flex-1 content-start gap-6 overflow-y-auto px-5 py-5">
        <dl className="grid">
          <Row label="Pos Kas">
            {transaction.fund_code} · {transaction.fund_name}
          </Row>
          <Row label="Mata anggaran">
            {transaction.budget_code && `${transaction.budget_code} · ${transaction.budget_name}`}
          </Row>
          <Row label="Dicatat oleh">
            {[
              transaction.created_by_name ?? 'Akun terhapus',
              `${formatDate(transaction.created_at)}, ${formatTime(transaction.created_at)}`,
            ].join(' · ')}
          </Row>
          {edited && (
            <Row label="Terakhir diubah">
              {formatDate(transaction.updated_at)}, {formatTime(transaction.updated_at)}
            </Row>
          )}
        </dl>

        <section className="grid gap-2" aria-labelledby="receipt-heading">
          <h3 id="receipt-heading" className="text-sm font-semibold">
            Bukti kuitansi
          </h3>
          {transaction.receipt_url ? (
            <ReceiptPreview url={transaction.receipt_url} />
          ) : (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
              <Paperclip className="size-4 flex-none" aria-hidden="true" />
              Belum ada kuitansi terlampir.
              {canEdit && (
                <button
                  type="button"
                  className="font-medium text-foreground underline underline-offset-4"
                  onClick={() => onEdit(transaction)}
                >
                  Lampirkan
                </button>
              )}
            </p>
          )}
        </section>
      </div>

      {(canEdit || showHistory) && (
        <SheetFooter className="border-t px-5 py-4 sm:flex-row sm:flex-wrap">
          {canEdit && (
            <>
              <Button size="lg" onClick={() => onEdit(transaction)}>
                <Pencil data-icon="inline-start" />
                Ubah transaksi
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-destructive"
                onClick={() => onDelete(transaction)}
              >
                <Trash2 data-icon="inline-start" />
                Hapus
              </Button>
            </>
          )}
          {showHistory && (
            <Button asChild variant="ghost" size="lg">
              <Link
                to={`/dashboard/audit-logs?entity_type=finance_transactions&entity_id=${transaction.id}`}
              >
                <History data-icon="inline-start" />
                Riwayat
              </Link>
            </Button>
          )}
        </SheetFooter>
      )}
    </>
  )
}

// Nilai kosong ditampilkan sebagai tanda pisah abu-abu.
function Row({ label, children }: { label: string; children: ReactNode }) {
  const empty = children === null || children === undefined || children === '' || children === false
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 border-t border-rule py-2 text-sm first:border-t-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={empty ? 'text-muted-foreground' : undefined}>{empty ? '—' : children}</dd>
    </div>
  )
}
