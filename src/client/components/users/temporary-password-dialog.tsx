import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import type { UserListItem } from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Kata sandi dibacakan Admin ke pemilik akun; huruf monospace memisahkan tiap karakter.
const secretClass = 'font-mono text-xl tracking-wider' // taste-skill-ignore: mono untuk kunci (app-screens §13)

export type IssuedPassword = {
  user: UserListItem
  password: string
  reason: 'created' | 'reset'
}

// Kata sandi sementara hanya dikembalikan API sekali. Dialog ini menampilkannya
// beserta pesan siap kirim (mis. lewat WhatsApp) untuk pemilik akun.
export function TemporaryPasswordDialog({
  issued,
  onClose,
}: {
  issued: IssuedPassword | null
  onClose: () => void
}) {
  return (
    <Dialog open={issued !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        // Klik di luar tidak menutup: kata sandi tidak bisa ditampilkan lagi.
        onInteractOutside={(event) => event.preventDefault()}
      >
        {issued && <IssuedPasswordBody issued={issued} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function IssuedPasswordBody({ issued, onClose }: { issued: IssuedPassword; onClose: () => void }) {
  const { user, password, reason } = issued
  const identity = user.username ?? user.email ?? ''
  const [copied, setCopied] = useState<'password' | 'message' | null>(null)

  const message = [
    `Shalom, ${user.name}.`,
    reason === 'created'
      ? 'Akun Sistem Informasi GMIT Lahairoi Anda sudah dibuat.'
      : 'Kata sandi akun Sistem Informasi GMIT Lahairoi Anda sudah diatur ulang.',
    `Alamat: ${window.location.origin}/login`,
    `Masuk dengan: ${identity}`,
    `Kata sandi sementara: ${password}`,
  ].join('\n')

  async function copy(kind: 'password' | 'message') {
    try {
      await navigator.clipboard.writeText(kind === 'password' ? password : message)
      setCopied(kind)
    } catch {
      setCopied(null)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {reason === 'created'
            ? `Akun ${user.name} sudah dibuat`
            : `Kata sandi ${user.name} sudah diatur ulang`}
        </DialogTitle>
        <DialogDescription>
          Serahkan kata sandi sementara ini kepada {user.name}. Kata sandi hanya tampil sekali;
          setelah jendela ini ditutup, aturlah ulang bila hilang.
        </DialogDescription>
      </DialogHeader>

      <dl className="grid gap-3 rounded-lg border bg-background px-4 py-3">
        <div className="grid gap-0.5">
          <dt className="text-[0.8125rem] text-muted-foreground">Masuk dengan</dt>
          <dd className="font-medium">{identity}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="text-[0.8125rem] text-muted-foreground">Kata sandi sementara</dt>
          <dd className="flex items-center justify-between gap-3">
            <span className={secretClass}>{password}</span>
            <Button variant="ghost" size="sm" onClick={() => void copy('password')}>
              {copied === 'password' ? (
                <Check data-icon="inline-start" />
              ) : (
                <Copy data-icon="inline-start" />
              )}
              {copied === 'password' ? 'Tersalin' : 'Salin'}
              <span className="sr-only"> kata sandi</span>
            </Button>
          </dd>
        </div>
      </dl>

      <div className="grid gap-2">
        <p className="text-[0.8125rem] text-muted-foreground">Pesan untuk {user.name}</p>
        <pre className="rounded-lg bg-muted px-4 py-3 font-sans text-[0.8125rem] leading-relaxed whitespace-pre-wrap">
          {message}
        </pre>
      </div>

      <p aria-live="polite" className="sr-only">
        {copied === 'password'
          ? 'Kata sandi tersalin'
          : copied === 'message'
            ? 'Pesan tersalin'
            : ''}
      </p>

      <DialogFooter>
        <Button variant="outline" size="lg" onClick={() => void copy('message')}>
          {copied === 'message' ? (
            <Check data-icon="inline-start" />
          ) : (
            <Copy data-icon="inline-start" />
          )}
          {copied === 'message' ? 'Pesan tersalin' : 'Salin pesan'}
        </Button>
        <Button size="lg" onClick={onClose}>
          Selesai
        </Button>
      </DialogFooter>
    </>
  )
}
