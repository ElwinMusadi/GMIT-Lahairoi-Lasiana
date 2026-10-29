import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { copyText } from '@/lib/portal'
import { cn } from '@/lib/utils'

// Bilah mono gelap berisi satu nilai dan tombol salin (rancangan kage, panel
// persembahan). Dipakai untuk nomor rekening dan kode registrasi sakramen. Setelah
// tersalin, tombol berbunyi "Tersalin" selama 2,5 detik.

type Props = {
  // Teks yang tampil di bilah, mis. "Bank NTT · 001.01.02.012345-7".
  display: string
  // Nilai yang disalin, mis. angka nomor rekening saja.
  value: string
  buttonLabel: string
  ariaLabel: string
  successTitle: string
  successDescription?: string
  errorMessage: string
  className?: string
}

export function CopyBar({
  display,
  value,
  buttonLabel,
  ariaLabel,
  successTitle,
  successDescription,
  errorMessage,
  className,
}: Props) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    if (!(await copyText(value))) {
      toast.error(errorMessage)
      return
    }
    toast.success(successTitle, { description: successDescription })
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div
      className={cn(
        'flex min-w-0 items-center justify-between gap-3 rounded-full bg-site-panel-2 p-1.5 pl-5 shadow-inner',
        className,
      )}
    >
      <span className="min-w-0 truncate font-site-mono text-sm text-white/90 tabular-nums">
        {display}
      </span>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex h-10 flex-none items-center gap-1.5 rounded-full px-4 font-site-mono text-[13px] font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring',
          copied ? 'bg-site-green text-white' : 'bg-white text-site-panel hover:bg-site-paper',
        )}
      >
        {copied ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
        {copied ? 'Tersalin' : buttonLabel}
      </button>
    </div>
  )
}
