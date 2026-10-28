import { useRef, useState } from 'react'
import { ExternalLink, FileText, Paperclip, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api'
import { isPdf } from '@/lib/finance'
import { UPLOAD_ACCEPT, uploadFile } from '@/lib/upload'
import { cn } from '@/lib/utils'

// Bukti kuitansi transaksi: unggah ke R2 (folder kuitansi) dan tampilkan kembali.
// Berkas kuitansi hanya bisa dibuka pengurus yang sudah masuk.

export function ReceiptPreview({ url, compact = false }: { url: string; compact?: boolean }) {
  if (isPdf(url)) {
    return (
      <div className="grid gap-2">
        {!compact && (
          <iframe
            src={url}
            title="Kuitansi PDF"
            className="h-96 w-full rounded-lg border bg-muted"
          />
        )}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
        >
          <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
          Buka kuitansi PDF
          <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">(tab baru)</span>
        </a>
      </div>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block w-fit overflow-hidden rounded-lg border bg-muted"
      title="Buka foto kuitansi ukuran penuh"
    >
      <img
        src={url}
        alt="Foto kuitansi"
        className={cn('object-contain', compact ? 'h-20 w-28' : 'max-h-96 w-full')}
      />
      <span className="sr-only">(buka di tab baru)</span>
    </a>
  )
}

// Field unggah kuitansi di form transaksi. Berkas diunggah begitu dipilih; form
// menyimpan URL-nya (receipt_url).
export function ReceiptField({
  value,
  onChange,
  onBusyChange,
  error,
}: {
  value: string | null
  onChange: (url: string | null) => void
  onBusyChange: (busy: boolean) => void
  error?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function upload(file: File) {
    setUploadError(null)
    setProgress(0)
    onBusyChange(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const uploaded = await uploadFile(file, {
        folder: 'kuitansi',
        onProgress: setProgress,
        signal: controller.signal,
      })
      onChange(uploaded.url)
    } catch (err) {
      if (!controller.signal.aborted) setUploadError(errorMessage(err))
    } finally {
      setProgress(null)
      onBusyChange(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const message = uploadError ?? error
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium" id="receipt-label">
        Bukti kuitansi
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        className="sr-only"
        aria-labelledby="receipt-label"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
        }}
      />
      {progress !== null ? (
        <div className="grid gap-2 rounded-lg border border-dashed px-4 py-3" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span>Mengunggah kuitansi… {progress}%</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => abortRef.current?.abort()}
            >
              Batal
            </Button>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : value ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2">
          <ReceiptPreview url={value} compact />
          <div className="ml-auto flex gap-1">
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              Ganti
            </Button>
            <Button type="button" variant="ghost" onClick={() => onChange(null)}>
              <X data-icon="inline-start" />
              Lepas
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3">
          <p className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
            <Paperclip className="size-4 flex-none" aria-hidden="true" />
            Foto (JPG, PNG, WebP) atau PDF, maksimal 10 MB.
          </p>
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload data-icon="inline-start" />
            Pilih berkas
          </Button>
        </div>
      )}
      {message && (
        <p id="receipt_url-error" className="text-[0.8125rem] text-destructive">
          {message}
        </p>
      )}
    </div>
  )
}
