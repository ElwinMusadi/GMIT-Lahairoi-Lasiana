import { useRef, useState, type ReactNode } from 'react'
import { ExternalLink, FileText, Paperclip, Upload, X } from 'lucide-react'
import type { UploadFolder } from '@shared/uploads'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api'
import { UPLOAD_ACCEPT, isPdf, uploadFile } from '@/lib/upload'

// Field unggah berkas di form dashboard (kuitansi, PDF warta, gambar sampul, QRIS).
// Berkas diunggah ke R2 begitu dipilih; form hanya menyimpan URL-nya.

export type UploadKind = 'image' | 'pdf' | 'any'

const ACCEPT: Record<UploadKind, string> = {
  image: 'image/jpeg,image/png,image/webp',
  pdf: 'application/pdf',
  any: UPLOAD_ACCEPT,
}

const KIND_ERROR: Record<Exclude<UploadKind, 'any'>, string> = {
  image: 'Pilih foto JPG, PNG, atau WebP.',
  pdf: 'Pilih berkas PDF.',
}

function matchesKind(file: File, kind: UploadKind) {
  if (kind === 'any') return true
  const name = file.name.toLowerCase()
  if (kind === 'pdf') return file.type === 'application/pdf' || name.endsWith('.pdf')
  return /^image\/(jpeg|png|webp)$/.test(file.type) || /\.(jpe?g|png|webp)$/.test(name)
}

// Pratinjau bawaan: foto kecil, atau tautan untuk PDF.
export function UploadPreview({ url }: { url: string }) {
  if (isPdf(url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
      >
        <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
        Buka PDF
        <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">(tab baru)</span>
      </a>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block w-fit overflow-hidden rounded-md border bg-muted"
      title="Buka gambar ukuran penuh"
    >
      <img src={url} alt="" className="h-20 w-28 object-cover" />
      <span className="sr-only">Buka gambar (tab baru)</span>
    </a>
  )
}

export function UploadField({
  id,
  label,
  folder,
  kind,
  value,
  onChange,
  onBusyChange,
  emptyText,
  hint,
  error,
  preview,
}: {
  // Dipakai untuk id label (`${id}-label`) dan pesan kesalahan (`${id}-error`).
  id: string
  label: string
  folder: UploadFolder
  kind: UploadKind
  value: string | null
  onChange: (url: string | null) => void
  onBusyChange: (busy: boolean) => void
  // Keterangan di kotak kosong, mis. jenis dan ukuran berkas yang diterima.
  emptyText: string
  hint?: ReactNode
  error?: string
  preview?: (url: string) => ReactNode
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function upload(file: File) {
    setUploadError(null)
    if (kind !== 'any' && !matchesKind(file, kind)) {
      setUploadError(KIND_ERROR[kind])
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setProgress(0)
    onBusyChange(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const uploaded = await uploadFile(file, {
        folder,
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
      <p className="text-sm font-medium" id={`${id}-label`}>
        {label}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        className="sr-only"
        aria-labelledby={`${id}-label`}
        aria-describedby={message ? `${id}-error` : undefined}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
        }}
      />
      {progress !== null ? (
        <div className="grid gap-2 rounded-lg border border-dashed px-4 py-3" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span>Mengunggah… {progress}%</span>
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
          {preview ? preview(value) : <UploadPreview url={value} />}
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
            {emptyText}
          </p>
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload data-icon="inline-start" />
            Pilih berkas
          </Button>
        </div>
      )}
      {hint}
      {message && (
        <p id={`${id}-error`} className="text-[0.8125rem] text-destructive">
          {message}
        </p>
      )}
    </div>
  )
}
