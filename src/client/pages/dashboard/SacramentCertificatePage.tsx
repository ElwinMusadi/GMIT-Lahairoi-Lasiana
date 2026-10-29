import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Printer, RotateCcw } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router'
import { SACRAMENT_TYPE_LABELS, type SacramentDetail, type SacramentResponse } from '@shared/types'
import { Certificate, type CertificateMode } from '@/components/sacrament/certificate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/zenith/page-header'
import { Panel } from '@/components/zenith/panel'
import { Segmented } from '@/components/zenith/segmented'
import { certificateContent, loadMargins, saveMargins, type Margins } from '@/lib/sacrament-admin'
import { useApiQuery } from '@/lib/use-api-query'
import { cn } from '@/lib/utils'

const LIST_HREF = '/dashboard/sacraments'

// 210 mm dalam piksel CSS (96 dpi), untuk menskalakan pratinjau.
const SHEET_PX = (210 / 25.4) * 96

// Format cetak sebagai kontrol bersegmen; keterangan format terpilih tampil di bawahnya.
const MODES: { value: CertificateMode; label: string; description: string }[] = [
  {
    value: 'lengkap',
    label: 'Desain lengkap',
    description:
      'Untuk kertas A4 kosong: kop GMIT, bingkai, judul, label, ayat, dan seluruh isian.',
  },
  {
    value: 'blangko',
    label: 'Blangko',
    description:
      'Untuk blangko sertifikat gereja: hanya isian yang tercetak, tanpa kop dan bingkai.',
  },
]

// Cetak sertifikat Baptis/Sidi/Nikah dari buku induk (PRD: Register & Cetak Surat
// Sakramen, 2 mode). Pilihan format disimpan di URL (?format=blangko); kalibrasi margin
// blangko disimpan per jenis sertifikat di peramban ini.
export default function SacramentCertificatePage() {
  const { id } = useParams()
  const detail = useApiQuery<SacramentResponse>(`/sacraments/${id}`)
  const application = detail.data?.application

  if (!application) {
    return (
      <div className="grid gap-6">
        {detail.error ? (
          <PageHeader
            className="print:hidden"
            back={backTo(id)}
            title="Pendaftaran tidak dapat dimuat"
            description={
              <>
                {detail.error}{' '}
                <button type="button" onClick={detail.reload} className="font-medium underline">
                  Coba lagi
                </button>
              </>
            }
          />
        ) : (
          <div className="grid gap-6 print:hidden" aria-busy="true">
            <div className="grid gap-2">
              <Skeleton className="h-8 w-72 max-w-full" />
              <Skeleton className="h-5 w-96 max-w-full" />
            </div>
            <Skeleton className="h-[40rem] w-full max-w-3xl rounded-xl" />
          </div>
        )}
      </div>
    )
  }
  if (application.status !== 'COMPLETED') {
    return (
      <PageHeader
        className="print:hidden"
        back={backTo(id)}
        title="Cetak sertifikat"
        description={
          <span className="block max-w-xl">
            Sertifikat {application.applicant_name} baru bisa dicetak setelah pendaftarannya Selesai
            dan tercatat di buku induk dengan nomor register.
          </span>
        }
      />
    )
  }
  return <CertificateEditor application={application} />
}

// Tujuan tombol kembali: rincian pendaftaran, atau daftar bila id tidak ada.
function backTo(id?: string) {
  return { to: id ? `${LIST_HREF}/${id}` : LIST_HREF, label: 'Rincian pendaftaran' }
}

function CertificateEditor({ application }: { application: SacramentDetail }) {
  const [params, setParams] = useSearchParams()
  const mode: CertificateMode = params.get('format') === 'blangko' ? 'blangko' : 'lengkap'
  const [margins, setMargins] = useState<Margins>(() => loadMargins(application.type))
  const [showGuide, setShowGuide] = useState(true)
  const content = certificateContent(application)
  const label = SACRAMENT_TYPE_LABELS[application.type]

  // Nama berkas PDF saat "Simpan sebagai PDF".
  useEffect(() => {
    const original = document.title
    const printTitle = `${content.title} ${application.applicant_name} ${content.number}`
    const before = () => {
      document.title = printTitle
    }
    const after = () => {
      document.title = original
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [content.title, content.number, application.applicant_name])

  function setMode(next: CertificateMode) {
    const search = new URLSearchParams(window.location.search)
    if (next === 'blangko') search.set('format', 'blangko')
    else search.delete('format')
    setParams(search, { replace: true, preventScrollReset: true })
  }

  function updateMargin(key: keyof Margins, raw: string) {
    const value = Math.max(-30, Math.min(30, Number(raw.replace(',', '.')) || 0))
    const next = { ...margins, [key]: value }
    setMargins(next)
    saveMargins(application.type, next)
  }

  function resetMargins() {
    const next = { top: 0, left: 0 }
    setMargins(next)
    saveMargins(application.type, next)
  }

  return (
    <div className="grid gap-6 print:block">
      {/* Kertas A4 tanpa margin printer bawaan; posisi sertifikat diatur dalam mm. */}
      <style>{'@page { size: A4 portrait; margin: 0; }'}</style>

      <PageHeader
        className="print:hidden"
        back={backTo(String(application.id))}
        title={`Cetak ${content.title}`}
        description={
          <>
            {application.applicant_name} · {label} ·{' '}
            <span className="font-mono">{content.number}</span>
          </>
        }
        actions={
          <Button size="lg" onClick={() => window.print()}>
            <Printer data-icon="inline-start" />
            Cetak
          </Button>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)] print:block">
        {/* Lengket di bawah topbar, agar format bisa diganti sambil melihat pratinjau. */}
        <Panel
          title="Pengaturan cetak"
          className="xl:sticky xl:top-24 print:hidden"
          contentClassName="grid gap-5"
        >
          <div className="grid gap-2">
            <span className="text-sm font-medium" aria-hidden="true">
              Format cetak
            </span>
            <Segmented
              label="Format cetak"
              value={mode}
              onChange={setMode}
              options={MODES}
              className="w-full [&>button]:flex-1"
            />
            <p className="text-[0.8125rem] text-muted-foreground">
              {MODES.find((option) => option.value === mode)?.description}
            </p>
          </div>

          {mode === 'blangko' && (
            <fieldset className="grid gap-3 border-t pt-5">
              <legend className="float-left mb-3 w-full text-sm font-medium">
                Kalibrasi printer
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <MarginInput
                  id="margin-atas"
                  label="Margin atas"
                  hint="+ geser ke bawah"
                  value={margins.top}
                  onChange={(value) => updateMargin('top', value)}
                />
                <MarginInput
                  id="margin-kiri"
                  label="Margin kiri"
                  hint="+ geser ke kanan"
                  value={margins.left}
                  onChange={(value) => updateMargin('left', value)}
                />
              </div>
              <p className="text-[0.8125rem] text-muted-foreground">
                Cetak sekali di kertas biasa, tumpuk dengan blangko di depan cahaya, lalu ukur
                selisihnya. Pengaturan disimpan di peramban ini untuk sertifikat {label}.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showGuide}
                    onChange={(event) => setShowGuide(event.target.checked)}
                    className="size-4 accent-foreground"
                  />
                  Tampilkan panduan di layar
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetMargins}
                  disabled={margins.top === 0 && margins.left === 0}
                >
                  <RotateCcw data-icon="inline-start" />
                  Atur ulang
                </Button>
              </div>
            </fieldset>
          )}

          <p className="border-t pt-5 text-[0.8125rem] text-muted-foreground">
            Di dialog cetak pilih kertas A4, skala 100% (ukuran sebenarnya), dan matikan header dan
            footer peramban.
          </p>
        </Panel>

        <Preview>
          <Certificate content={content} mode={mode} margins={margins} showGuide={showGuide} />
        </Preview>
      </div>
    </div>
  )
}

function MarginInput({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string
  label: string
  hint: string
  value: number
  onChange: (value: string) => void
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={0.5}
          min={-30}
          max={30}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={`${id}-hint`}
          className="h-10 pr-10 text-right tabular-nums"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
          mm
        </span>
      </div>
      <span id={`${id}-hint`} className="text-[0.8125rem] text-muted-foreground">
        {hint}
      </span>
    </div>
  )
}

// Pratinjau A4 diperkecil agar muat di layar; saat dicetak kembali ke ukuran sebenarnya.
function Preview({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const element = frame.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / SHEET_PX))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={frame}
      className="min-w-0 rounded-lg bg-muted p-3 sm:p-6 print:rounded-none print:bg-transparent print:p-0"
      aria-label="Pratinjau sertifikat"
    >
      <div
        className="mx-auto print:h-auto! print:w-auto!"
        style={{ width: SHEET_PX * scale, height: SHEET_PX * (297 / 210) * scale }}
      >
        <div
          className={cn('origin-top-left shadow-md print:shadow-none print:transform-none!')}
          style={{ transform: `scale(${scale})`, width: SHEET_PX }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
