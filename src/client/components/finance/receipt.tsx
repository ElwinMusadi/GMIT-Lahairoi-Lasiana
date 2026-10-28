import { ExternalLink, FileText } from 'lucide-react'
import { UploadField } from '@/components/upload-field'
import { isPdf } from '@/lib/upload'
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
  return (
    <UploadField
      id="receipt_url"
      label="Bukti kuitansi"
      folder="kuitansi"
      kind="any"
      value={value}
      onChange={onChange}
      onBusyChange={onBusyChange}
      emptyText="Foto (JPG, PNG, WebP) atau PDF, maksimal 10 MB."
      error={error}
      preview={(url) => <ReceiptPreview url={url} compact />}
    />
  )
}
