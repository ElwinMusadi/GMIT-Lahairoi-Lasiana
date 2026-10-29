import type { ReactNode } from 'react'
import { Download, ExternalLink } from 'lucide-react'
import type { ApiPage, PublicContent } from '@shared/types'
import { HeroPanel } from '@/components/portal/kage/hero-panel'
import { SearchField, SitePager } from '@/components/portal/kage/list-controls'
import { PillLink } from '@/components/portal/kage/pill'
import { Reveal } from '@/components/portal/kage/reveal'
import { LoadError, SiteSection } from '@/components/portal/kage/site-section'
import { TwoToneHeading } from '@/components/portal/kage/two-tone-heading'
import { WindowPanel } from '@/components/portal/kage/window-panel'
import { publishedDate } from '@/lib/portal'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const PER_PAGE = 12

// Warta Jemaat (PRD: unduh dokumen Warta Jemaat lengkap dalam PDF). Warta terbaru tampil
// dengan pratinjau PDF; warta sebelumnya menjadi arsip yang bisa dicari dan diunduh.
export default function WartaPage() {
  const { params, update } = useUrlFilters()
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)

  const list = useApiQuery<ApiPage<PublicContent>>('/public/contents', {
    category: 'WARTA',
    q,
    page,
    per_page: PER_PAGE,
  })
  const items = list.data?.data ?? []
  const total = list.data?.meta.total ?? 0
  // Halaman pertama tanpa pencarian: warta terbaru ditonjolkan.
  const featured = page === 1 && !q ? items[0] : undefined
  const archive = featured ? items.slice(1) : items

  let body: ReactNode
  if (list.error && !list.data) {
    body = (
      <SiteSection className="pt-12 lg:pt-16">
        <LoadError message="Warta tidak dapat dimuat." onRetry={list.reload} />
      </SiteSection>
    )
  } else if (!list.data) {
    body = (
      <SiteSection className="pt-12 lg:pt-16">
        <div aria-hidden="true" className="h-[28rem] animate-pulse rounded-3xl bg-site-paper" />
      </SiteSection>
    )
  } else if (total === 0 && !q) {
    body = (
      <SiteSection className="pt-12 lg:pt-16">
        <p className="text-lg text-site-muted">Warta Jemaat belum diterbitkan.</p>
      </SiteSection>
    )
  } else {
    body = (
      <>
        {featured && (
          <SiteSection labelledBy="judul-warta-terbaru" className="pt-12 pb-0 lg:pt-16 lg:pb-0">
            <FeaturedWarta warta={featured} />
          </SiteSection>
        )}
        <SiteSection labelledBy="judul-arsip-warta" className={cn(!featured && 'pt-12 lg:pt-16')}>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Reveal>
              <TwoToneHeading
                id="judul-arsip-warta"
                size="card"
                lead={featured ? 'Arsip warta' : 'Warta Jemaat'}
              />
            </Reveal>
            <SearchField
              value={q}
              onSearch={(value) => update({ q: value }, { keepScroll: true })}
              label="Cari warta"
              placeholder="Cari judul warta"
            />
          </div>
          {archive.length === 0 ? (
            <p className="mt-10 text-lg text-site-muted">
              {q ? `Tidak ada warta yang cocok dengan “${q}”.` : 'Belum ada warta sebelumnya.'}
            </p>
          ) : (
            <ul
              aria-busy={list.loading}
              className={cn('mt-10 grid gap-3 transition-opacity', list.loading && 'opacity-60')}
            >
              {archive.map((warta) => (
                <Reveal
                  as="li"
                  key={warta.id}
                  className="grid gap-4 rounded-2xl bg-site-paper p-5 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-center md:gap-6 md:p-6"
                >
                  <div className="grid min-w-0 gap-1">
                    <h3 className="font-site-display text-lg leading-snug font-bold">
                      {warta.title}
                    </h3>
                    {warta.summary && (
                      <p className="line-clamp-2 text-base text-site-ink/80">{warta.summary}</p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-site-muted md:order-first">
                    {publishedDate(warta.published_at)}
                  </p>
                  <PdfActions warta={warta} compact />
                </Reveal>
              ))}
            </ul>
          )}
          <SitePager
            page={page}
            perPage={PER_PAGE}
            total={total}
            noun="warta"
            onPage={(next) => update({ page: String(next) })}
            className="mt-10"
          />
        </SiteSection>
      </>
    )
  }

  return (
    <>
      <HeroPanel
        labelledBy="judul-warta"
        display={
          <div className="grid max-w-[760px] gap-5">
            <TwoToneHeading
              as="h1"
              id="judul-warta"
              size="page"
              onDark
              lead="Warta Jemaat"
              accent="tiap Minggu."
            />
            <p className="max-w-[60ch] text-base leading-relaxed text-white/85 md:text-lg">
              Warta mingguan lengkap dalam PDF: pengumuman, jadwal pelayan, dan kabar jemaat. Baca
              langsung atau unduh untuk disimpan.
            </p>
          </div>
        }
      />
      {body}
    </>
  )
}

function PdfActions({
  warta,
  onDark = false,
  compact = false,
}: {
  warta: PublicContent
  onDark?: boolean
  // Baris arsip: tombol teks saja, tanpa ikon.
  compact?: boolean
}) {
  if (!warta.attachment_url) return null
  return (
    <div className="flex flex-wrap gap-2">
      <PillLink
        to={warta.attachment_url}
        download={`${warta.slug}.pdf`}
        tone={onDark ? 'light' : 'dark'}
        size="sm"
      >
        {!compact && <Download aria-hidden="true" />}
        Unduh PDF
      </PillLink>
      <PillLink
        to={warta.attachment_url}
        target="_blank"
        rel="noreferrer"
        tone={onDark ? 'glass' : 'outline'}
        size="sm"
      >
        {!compact && <ExternalLink aria-hidden="true" />}
        Baca di tab baru
      </PillLink>
    </div>
  )
}

// Warta terbaru dalam panel jendela, dengan pratinjau PDF di layar lebar. Peramban ponsel
// umumnya tidak menampilkan PDF dalam bingkai, jadi di sana cukup tombol baca dan unduh.
function FeaturedWarta({ warta }: { warta: PublicContent }) {
  return (
    <Reveal>
      <WindowPanel
        bodyClassName="p-0 md:p-0"
        footer={
          warta.attachment_url ? (
            <>
              <span className="min-w-0 truncate font-site-mono text-[13px] text-white/70">
                {warta.slug}.pdf
              </span>
              <PdfActions warta={warta} onDark />
            </>
          ) : undefined
        }
      >
        <article aria-labelledby="judul-warta-terbaru" className="grid lg:grid-cols-12">
          <div className="grid content-start gap-5 p-6 md:p-8 lg:col-span-5">
            <h2
              id="judul-warta-terbaru"
              className="font-site-display text-[28px] leading-tight font-bold tracking-tight md:text-[32px]"
            >
              {warta.title}
            </h2>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-white/75">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-site-accent" />
              Warta terbaru · {publishedDate(warta.published_at)}
            </p>
            {warta.summary && (
              <p className="text-base leading-relaxed text-white/85">{warta.summary}</p>
            )}
          </div>
          {warta.attachment_url && (
            <div className="hidden p-4 lg:col-span-7 lg:block lg:pl-0">
              <iframe
                src={warta.attachment_url}
                title={`Pratinjau ${warta.title}`}
                className="h-[36rem] w-full rounded-xl border-0 bg-white"
              />
            </div>
          )}
        </article>
      </WindowPanel>
    </Reveal>
  )
}
