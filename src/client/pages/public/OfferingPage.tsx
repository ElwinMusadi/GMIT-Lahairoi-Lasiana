import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Download, MessageSquareText } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiPage, PublicContent } from '@shared/types'
import { EmptyNote, PortalCard, PortalSection, SectionHeading } from '@/components/portal/parts'
import { Skeleton } from '@/components/ui/skeleton'
import { splitPaymentTitle } from '@/lib/contents'
import { accountDigits, copyText } from '@/lib/portal'
import { useApiQuery } from '@/lib/use-api-query'
import { cn } from '@/lib/utils'

// Persembahan (PRD: rekening bank resmi per pos kas dan gambar QRIS dengan tombol
// salin). Isinya konten "Rekening & QRIS" di CMS: judul "Bank · Keperluan", ringkasan
// = nomor rekening, isi = atas nama dan catatan, gambar = QRIS.
export default function OfferingPage() {
  const info = useApiQuery<ApiPage<PublicContent>>('/public/contents', {
    category: 'PAYMENT_INFO',
    with_body: 'true',
    per_page: 50,
  })
  const items = info.data?.data ?? []
  const qris = items.filter((item) => item.thumbnail_url)
  const accounts = items.filter((item) => item.summary)

  return (
    <PortalSection tone="low" labelledBy="judul-persembahan" className="py-12">
      <SectionHeading
        id="judul-persembahan"
        level={1}
        center
        eyebrow="Akuntabilitas & partisipasi iman"
        title="Persembahan Kasih & QRIS"
        lead={
          <>
            “Allah mengasihi orang yang memberi dengan sukacita.”{' '}
            <span className="whitespace-nowrap">(2 Korintus 9:7)</span>
          </>
        }
      />

      {info.error && !info.data ? (
        <EmptyNote>
          Informasi persembahan tidak dapat dimuat.{' '}
          <button
            type="button"
            onClick={info.reload}
            className="font-semibold text-portal-navy underline"
          >
            Coba lagi
          </button>
        </EmptyNote>
      ) : !info.data ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-96 rounded-2xl lg:col-span-5" />
          <div className="grid gap-4 lg:col-span-7">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <EmptyNote>
          Rekening dan QRIS persembahan belum diumumkan. Persembahan tetap dapat diserahkan langsung
          saat ibadah.
        </EmptyNote>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-12">
          <div className="grid justify-items-center gap-6 lg:col-span-5">
            {qris.length === 0 ? (
              <EmptyNote>Kode QRIS belum tersedia. Gunakan transfer bank di samping.</EmptyNote>
            ) : (
              qris.map((item) => <QrisCard key={item.id} item={item} />)
            )}
          </div>
          <div className="grid gap-4 lg:col-span-7">
            {accounts.length === 0 ? (
              <EmptyNote>Nomor rekening belum diumumkan. Gunakan QRIS.</EmptyNote>
            ) : (
              accounts.map((item, index) => <AccountCard key={item.id} item={item} index={index} />)
            )}
            <div className="flex items-start gap-3 rounded-xl bg-portal-high p-4">
              <MessageSquareText
                className="mt-0.5 size-6 flex-none text-portal-amber"
                aria-hidden="true"
              />
              <div className="grid">
                <span className="text-sm font-bold text-portal-ink">
                  Simpan bukti transfer Anda
                </span>
                <span className="text-sm text-portal-muted">
                  Tuliskan keperluan persembahan pada berita transfer. Bendahara Jemaat mencatat
                  setiap persembahan ke pos kas yang dituju.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </PortalSection>
  )
}

function QrisCard({ item }: { item: PublicContent }) {
  const { bank, purpose } = splitPaymentTitle(item.title)
  const fileName = `qris-${item.slug}.${item.thumbnail_url?.split('.').pop() ?? 'png'}`
  return (
    <PortalCard
      as="article"
      className="grid w-full max-w-sm justify-items-center gap-4 rounded-2xl border-t-4 border-portal-amber p-6 text-center shadow-md"
    >
      <div className="grid justify-items-center gap-1">
        <span className="rounded-full bg-portal-amber-soft px-3 py-0.5 text-xs font-bold tracking-wider text-portal-amber-ink uppercase">
          QRIS
        </span>
        <h2 className="font-portal-heading text-xl leading-7 font-semibold text-portal-navy">
          {purpose ? `${bank} · ${purpose}` : bank}
        </h2>
        <span className="text-xs text-portal-muted">
          Pindai dengan aplikasi bank atau dompet digital yang mendukung QRIS
        </span>
      </div>
      <div className="w-full rounded-xl bg-white p-3 shadow-inner ring-1 ring-portal-high">
        <img
          src={item.thumbnail_url ?? ''}
          alt={`Kode QRIS ${item.title}`}
          className="mx-auto aspect-square w-full max-w-72 object-contain"
        />
      </div>
      {item.content_body && (
        <p className="text-sm whitespace-pre-line text-portal-muted">{item.content_body}</p>
      )}
      <a
        href={item.thumbnail_url ?? ''}
        download={fileName}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-portal-mid px-4 py-2.5 text-sm font-semibold text-portal-navy transition-colors hover:bg-portal-high"
      >
        <Download className="size-4" aria-hidden="true" />
        Simpan gambar QRIS
      </a>
    </PortalCard>
  )
}

const BADGE_TONES = [
  'bg-portal-blue-soft text-portal-navy',
  'bg-portal-amber-soft text-portal-amber',
  'bg-portal-highest text-portal-navy',
]

// Singkatan bank untuk lencana: "Bank NTT" → "NTT", "BRI" → "BRI".
function bankBadge(bank: string) {
  const words = bank
    .replace(/^bank\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
  const acronym = words.find((word) => /^[A-Z]{2,5}$/.test(word))
  return (acronym ?? words.map((word) => word[0]).join('')).slice(0, 4).toUpperCase() || 'BANK'
}

function AccountCard({ item, index }: { item: PublicContent; index: number }) {
  const { bank, purpose } = splitPaymentTitle(item.title)
  const number = item.summary ?? ''
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const holder = item.content_body?.split('\n')[0]?.trim()
  const notes = item.content_body?.split('\n').slice(1).join('\n').trim()

  async function copy() {
    const ok = await copyText(accountDigits(number))
    if (!ok) {
      toast.error('Nomor rekening tidak dapat disalin. Salin secara manual.')
      return
    }
    toast.success(`Nomor rekening ${bank} disalin`, { description: number })
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 2500)
  }

  return (
    <PortalCard
      as="article"
      className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-10 flex-none items-center justify-center rounded-lg text-xs font-bold',
            BADGE_TONES[index % BADGE_TONES.length],
          )}
        >
          {bankBadge(bank)}
        </span>
        <div className="grid min-w-0">
          {purpose && (
            <span className="text-xs font-bold tracking-wide text-portal-amber uppercase">
              {purpose}
            </span>
          )}
          <h2 className="text-sm font-bold text-portal-navy">{bank}</h2>
          <p className="mt-1 text-lg font-bold tracking-wider text-portal-ink tabular-nums">
            {number}
          </p>
          {holder && <p className="text-xs text-portal-muted">{holder}</p>}
          {notes && <p className="mt-1 text-xs whitespace-pre-line text-portal-muted">{notes}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={`Salin nomor rekening ${bank} ${number}`}
        className={cn(
          'inline-flex min-h-11 flex-none items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-colors',
          copied
            ? 'bg-portal-green-soft text-portal-green'
            : 'bg-portal-low text-portal-navy hover:bg-portal-high',
        )}
      >
        {copied ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
        {copied ? 'Tersalin' : 'Salin No. Rek'}
      </button>
    </PortalCard>
  )
}
