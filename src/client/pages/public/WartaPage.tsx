import { useRef, useState } from 'react'
import { Download, ExternalLink, FileText, Search } from 'lucide-react'
import type { ApiPage, PublicContent } from '@shared/types'
import { EmptyNote, PageIntro, Pager, PortalCard, PortalSection } from '@/components/portal/parts'
import { Skeleton } from '@/components/ui/skeleton'
import { publishedDate } from '@/lib/portal'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'

const PER_PAGE = 12

// Warta Jemaat (PRD: unduh dokumen Warta Jemaat lengkap dalam PDF). Warta terbaru tampil
// dengan pratinjau PDF; warta sebelumnya menjadi arsip yang bisa dicari dan diunduh.
export default function WartaPage() {
  const { params, update } = useUrlFilters()
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [search, setSearch] = useState(q)
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    if (q !== search.trim()) setSearch(q)
  }
  const timer = useRef<number | undefined>(undefined)

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

  return (
    <>
      <PageIntro
        id="judul-warta"
        eyebrow="Publikasi mingguan"
        title="Warta Jemaat"
        lead="Warta mingguan lengkap dalam PDF: pengumuman, jadwal pelayan, dan kabar jemaat. Baca langsung atau unduh untuk disimpan."
      />

      <PortalSection labelledBy="judul-warta-terbaru">
        {list.error && !list.data ? (
          <EmptyNote>
            Warta tidak dapat dimuat.{' '}
            <button
              type="button"
              onClick={list.reload}
              className="font-semibold text-portal-navy underline"
            >
              Coba lagi
            </button>
          </EmptyNote>
        ) : !list.data ? (
          <Skeleton className="h-80 rounded-xl" />
        ) : total === 0 && !q ? (
          <EmptyNote>Warta Jemaat belum diterbitkan.</EmptyNote>
        ) : (
          <>
            {featured && <FeaturedWarta warta={featured} />}

            <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
              <h2
                id="judul-warta-terbaru"
                className="font-portal-heading text-2xl font-bold text-portal-navy"
              >
                {featured ? 'Arsip warta' : 'Warta Jemaat'}
              </h2>
              <div className="relative w-full sm:w-72">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-portal-muted"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    const value = event.target.value
                    setSearch(value)
                    window.clearTimeout(timer.current)
                    timer.current = window.setTimeout(() => update({ q: value.trim() }), 300)
                  }}
                  placeholder="Cari judul warta"
                  aria-label="Cari warta"
                  className="h-10 w-full rounded-lg border-0 bg-white pr-3 pl-9 text-sm text-portal-ink shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-portal-blue-light"
                />
              </div>
            </div>

            {archive.length === 0 ? (
              <EmptyNote>
                {q ? `Tidak ada warta yang cocok dengan “${q}”.` : 'Belum ada warta sebelumnya.'}
              </EmptyNote>
            ) : (
              <ul className="grid gap-3">
                {archive.map((warta) => (
                  <li key={warta.id}>
                    <WartaRow warta={warta} />
                  </li>
                ))}
              </ul>
            )}
            <Pager
              page={page}
              perPage={PER_PAGE}
              total={total}
              noun="warta"
              onPage={(next) => update({ page: String(next) })}
            />
          </>
        )}
      </PortalSection>
    </>
  )
}

function PdfButtons({ warta }: { warta: PublicContent }) {
  if (!warta.attachment_url) return null
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={warta.attachment_url}
        download={`${warta.slug}.pdf`}
        className="inline-flex items-center gap-1.5 rounded-lg bg-portal-amber px-4 py-2 text-sm font-bold text-white hover:opacity-90"
      >
        <Download className="size-4" aria-hidden="true" />
        Unduh PDF
      </a>
      <a
        href={warta.attachment_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-portal-mid px-4 py-2 text-sm font-semibold text-portal-navy hover:bg-portal-high"
      >
        <ExternalLink className="size-4" aria-hidden="true" />
        Baca di tab baru
      </a>
    </div>
  )
}

function FeaturedWarta({ warta }: { warta: PublicContent }) {
  return (
    <PortalCard as="article" className="grid overflow-hidden lg:grid-cols-12">
      <div className="grid content-start gap-4 bg-portal-navy p-6 text-white lg:col-span-4">
        <span className="flex size-12 items-center justify-center rounded-lg bg-white/10 text-portal-amber-soft">
          <FileText className="size-7" aria-hidden="true" />
        </span>
        <div className="grid gap-1">
          <span className="text-xs font-bold tracking-wider text-portal-amber-soft uppercase">
            Warta terbaru · {publishedDate(warta.published_at)}
          </span>
          <h2 className="font-portal-heading text-2xl leading-8 font-bold">{warta.title}</h2>
          {warta.summary && <p className="text-white/80">{warta.summary}</p>}
        </div>
        <PdfButtons warta={warta} />
      </div>
      {warta.attachment_url && (
        // Pratinjau di layar lebar; peramban ponsel umumnya tidak menampilkan PDF dalam
        // bingkai, jadi di sana cukup tombol baca dan unduh.
        <iframe
          src={warta.attachment_url}
          title={`Pratinjau ${warta.title}`}
          className="hidden h-[36rem] w-full border-0 bg-portal-low lg:col-span-8 lg:block"
        />
      )}
    </PortalCard>
  )
}

function WartaRow({ warta }: { warta: PublicContent }) {
  return (
    <PortalCard className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 flex-none items-center justify-center rounded-lg bg-portal-blue-soft text-portal-navy">
          <FileText className="size-5" aria-hidden="true" />
        </span>
        <div className="grid min-w-0">
          <span className="text-xs font-semibold text-portal-amber">
            {publishedDate(warta.published_at)}
          </span>
          <h3 className="font-bold text-portal-ink">{warta.title}</h3>
          {warta.summary && (
            <p className="line-clamp-2 text-sm text-portal-muted">{warta.summary}</p>
          )}
        </div>
      </div>
      <PdfButtons warta={warta} />
    </PortalCard>
  )
}
