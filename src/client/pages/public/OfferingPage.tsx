import type { ReactNode } from 'react'
import { Download } from 'lucide-react'
import type { ApiPage, PublicContent } from '@shared/types'
import { CopyBar } from '@/components/portal/kage/copy-bar'
import { HeroPanel } from '@/components/portal/kage/hero-panel'
import { PillLink } from '@/components/portal/kage/pill'
import { Reveal } from '@/components/portal/kage/reveal'
import { LoadError, SiteSection } from '@/components/portal/kage/site-section'
import { TwoToneHeading } from '@/components/portal/kage/two-tone-heading'
import { splitPaymentTitle } from '@/lib/contents'
import { accountDigits } from '@/lib/portal'
import { useApiQuery } from '@/lib/use-api-query'

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
  // Satu konten boleh tampil di kedua kolom: QRIS-nya di kiri, nomor rekeningnya di kanan.
  const qris = items.filter((item) => item.thumbnail_url)
  const accounts = items.filter((item) => item.summary)

  let body: ReactNode
  if (info.error && !info.data) {
    body = <LoadError message="Informasi persembahan tidak dapat dimuat." onRetry={info.reload} />
  } else if (!info.data) {
    body = (
      <div aria-hidden="true" className="grid gap-8 lg:grid-cols-12">
        <div className="h-[32rem] animate-pulse rounded-[32px] bg-site-paper lg:col-span-5" />
        <div className="grid content-start gap-4 lg:col-span-7">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-3xl bg-site-paper" />
          ))}
        </div>
      </div>
    )
  } else if (items.length === 0) {
    body = (
      <p className="max-w-[60ch] text-lg text-site-muted">
        Rekening dan QRIS persembahan belum diumumkan. Persembahan tetap dapat diserahkan langsung
        saat ibadah.
      </p>
    )
  } else {
    body = (
      <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
        <section aria-labelledby="judul-qris" className="grid gap-6 lg:col-span-5">
          <h2 id="judul-qris" className="font-site-display text-2xl font-bold">
            QRIS
          </h2>
          {qris.length === 0 ? (
            <p className="text-base text-site-muted">
              Kode QRIS belum tersedia. Gunakan transfer bank di samping.
            </p>
          ) : (
            <Reveal className="grid gap-4 rounded-[32px] bg-site-panel p-4 shadow-site-panel md:p-6 dark:border dark:border-white/10">
              {qris.map((item) => (
                <QrisCard key={item.id} item={item} />
              ))}
            </Reveal>
          )}
        </section>

        <section aria-labelledby="judul-rekening" className="grid gap-6 lg:col-span-7">
          <h2 id="judul-rekening" className="font-site-display text-2xl font-bold">
            Transfer bank
          </h2>
          {accounts.length === 0 ? (
            <p className="text-base text-site-muted">
              Nomor rekening belum diumumkan. Gunakan QRIS.
            </p>
          ) : (
            <ul className="grid gap-4">
              {accounts.map((item) => (
                <Reveal as="li" key={item.id}>
                  <AccountCard item={item} />
                </Reveal>
              ))}
            </ul>
          )}
          <div className="grid gap-1 rounded-3xl bg-site-paper p-6">
            <p className="font-site-display text-lg font-bold">Simpan bukti transfer Anda</p>
            <p className="text-base text-site-ink/80">
              Tuliskan keperluan persembahan pada berita transfer. Bendahara Jemaat mencatat setiap
              persembahan ke pos kas yang dituju.
            </p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <>
      <HeroPanel
        labelledBy="judul-persembahan"
        display={
          <div className="grid max-w-[760px] gap-5">
            <TwoToneHeading
              as="h1"
              id="judul-persembahan"
              size="page"
              onDark
              lead="Persembahan"
              accent="dengan sukacita."
            />
            <p className="max-w-[60ch] text-base leading-relaxed text-white/85 md:text-lg">
              “Allah mengasihi orang yang memberi dengan sukacita.”{' '}
              <span className="whitespace-nowrap">(2 Korintus 9:7)</span>
            </p>
          </div>
        }
      />
      <SiteSection className="pt-12 lg:pt-16">{body}</SiteSection>
    </>
  )
}

// Kartu QRIS tetap putih di kedua tema agar mudah dipindai.
function QrisCard({ item }: { item: PublicContent }) {
  const { bank, purpose } = splitPaymentTitle(item.title)
  const fileName = `qris-${item.slug}.${item.thumbnail_url?.split('.').pop() ?? 'png'}`
  return (
    <article
      aria-labelledby={`qris-${item.id}`}
      className="grid justify-items-center gap-4 rounded-3xl bg-white p-5 text-center text-site-panel md:p-6"
    >
      <div className="grid justify-items-center gap-1">
        <span className="rounded-full bg-site-panel px-3 py-1 text-[13px] font-bold text-white">
          QRIS
        </span>
        <h3 id={`qris-${item.id}`} className="font-site-display text-xl leading-snug font-bold">
          {purpose ? `${bank} · ${purpose}` : bank}
        </h3>
        <p className="text-sm text-site-panel/70">
          Pindai dengan aplikasi bank atau dompet digital yang mendukung QRIS
        </p>
      </div>
      <img
        src={item.thumbnail_url ?? ''}
        alt={`Kode QRIS ${item.title}`}
        className="aspect-square w-full max-w-80 object-contain"
      />
      {item.content_body && (
        <p className="text-sm whitespace-pre-line text-site-panel/70">{item.content_body}</p>
      )}
      {/* Warna tombol dikunci: kartu QRIS tetap putih di tema gelap. */}
      <PillLink
        to={item.thumbnail_url ?? ''}
        download={fileName}
        tone="dark"
        size="sm"
        className="bg-site-panel text-white"
      >
        <Download aria-hidden="true" />
        Simpan gambar QRIS
      </PillLink>
    </article>
  )
}

// Singkatan bank untuk lencana: "Bank NTT" → "NTT", "BRI" → "BRI".
function bankBadge(bank: string) {
  const words = bank
    .replace(/^bank\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
  const acronym = words.find((word) => /^[A-Z]{2,5}$/.test(word))
  return (acronym ?? words.map((word) => word[0]).join('')).slice(0, 4).toUpperCase() || 'BANK'
}

function AccountCard({ item }: { item: PublicContent }) {
  const { bank, purpose } = splitPaymentTitle(item.title)
  const number = item.summary ?? ''
  const holder = item.content_body?.split('\n')[0]?.trim()
  const notes = item.content_body?.split('\n').slice(1).join('\n').trim()
  return (
    <article
      aria-labelledby={`rekening-${item.id}`}
      className="grid gap-4 rounded-3xl bg-site-paper p-5 md:p-6"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-11 flex-none items-center justify-center rounded-xl bg-site-ink text-[13px] font-bold text-site-canvas"
        >
          {bankBadge(bank)}
        </span>
        <div className="grid min-w-0">
          <h3
            id={`rekening-${item.id}`}
            className="font-site-display text-lg leading-snug font-bold"
          >
            {purpose || bank}
          </h3>
          {purpose && <p className="text-sm text-site-muted">{bank}</p>}
        </div>
      </div>
      <CopyBar
        display={number}
        value={accountDigits(number)}
        buttonLabel="Salin No. Rek"
        ariaLabel={`Salin nomor rekening ${bank} ${number}`}
        successTitle={`Nomor rekening ${bank} disalin`}
        successDescription={number}
        errorMessage="Nomor rekening tidak dapat disalin. Salin secara manual."
      />
      {holder && <p className="text-base font-medium">{holder}</p>}
      {notes && <p className="text-sm whitespace-pre-line text-site-muted">{notes}</p>}
    </article>
  )
}
