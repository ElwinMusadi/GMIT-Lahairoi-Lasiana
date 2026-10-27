import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { errorMessage } from '@/lib/api'

export type Confirmation = {
  title: string
  description: ReactNode
  confirmLabel: string
  destructive?: boolean
  // Dialog tertutup setelah aksi berhasil; bila gagal, pesan tampil di notifikasi
  // dan dialog tetap terbuka.
  onConfirm: () => Promise<void>
}

export function ConfirmDialog({
  confirmation,
  onClose,
}: {
  confirmation: Confirmation | null
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)

  async function run() {
    if (!confirmation) return
    setBusy(true)
    try {
      await confirmation.onConfirm()
      onClose()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={confirmation !== null} onOpenChange={(open) => !open && !busy && onClose()}>
      <AlertDialogContent>
        {confirmation && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmation.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmation.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
              <AlertDialogAction
                variant={confirmation.destructive ? 'destructive' : 'default'}
                disabled={busy}
                onClick={(event) => {
                  event.preventDefault()
                  void run()
                }}
              >
                {busy ? 'Memproses…' : confirmation.confirmLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
