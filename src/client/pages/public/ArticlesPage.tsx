import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Download, Search, Share2 } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { toast } from 'sonner'
import type { ApiPage, ContentCategory, PublicContent } from '@shared/types'
import { EmptyNote, PageIntro, Pager, PortalCard, PortalSection } from '@/components/portal/parts'
import { Skeleton } from '@/components/ui/skeleton'
import { copyText, excerpt, paragraphs, publishedDate } from '@/lib/portal'
import { isPdf } from '@/lib/upload'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

// Renungan (/renungan) dan Berita & Pengumuman (/berita): daftar artikel dan halaman
// bacanya (/renungan/:slug, /berita/:slug). Isinya dari CMS, kategori DEVOTIONAL dan NEWS.

type ArticleKind = 'DEVOTIONAL' | 'NEWS'

const KINDS: Record<
  ArticleKind,
  {
    base: string
    eyebrow: string
    title: string
    lead: string
    noun: string
    empty: string
    more: string
  }
> = {
  DEVOTIONAL: {
    base: '/renungan',
    eyebrow: 'Renungan harian',
    title: 'Renungan',
    lead: 'Renungan harian dan artikel pembinaan iman dari Pendeta dan Majelis Jemaat.',
    noun: 'renungan',
    empty: 'Belum ada renungan yang terbit.',
    more: 'Renungan lainnya',
  },
  NEWS: {
    base: '/berita',
    eyebrow: 'Kabar jemaat',
    title: 'Berita & Pengumuman',
    lead: 'Berita kegiatan jemaat, pengumuman dukacita, dan informasi pelayanan klasis dan sinode.',
    noun: 'berita',
    empty: 'Belum ada berita atau pengumuman.',
    more: 'Berita lainnya',
  },
}

// Alamat portal untuk setiap kategori konten, mis. bila /renungan/:slug ternyata berita.
const CATEGORY_PATHS: Record<ContentCategory, (slug: string) => string> = {
  DEVOTIONAL: (slug) => `/renungan/${slug}`,
  NEWS: (slug) => `/berita/${slug}`,
  WARTA: () => '/warta',
  MEDIA: () => '/media',
  PROFILE: () => '/profil',
  PAYMENT_INFO: () => '/persembahan',
}

const PER_PAGE = 12

// Ringkasan renungan berisi ayat bacaan (CMS: "Ayat bacaan").
function verseOf(item: PublicContent) {
  return item.category === 'DEVOTIONAL' ? item.summary : null
}

// Teks pendek di kartu: ringkasan berita, atau awal isi.
function teaserOf(item: PublicContent) {
  return (item.category === 'NEWS' ? item.summary : null) ?? excerpt(item.content_body)
}

export function DevotionalListPage() {
  return <ArticleList kind="DEVOTIONAL" />
}

export function NewsListPage() {
  return <ArticleList kind="NEWS" />
}

export function DevotionalPage() {
  return <ArticleDetail kind="DEVOTIONAL" />
}

export function NewsPage() {
  return <ArticleDetail kind="NEWS" />
}

function ArticleList({ kind }: { kind: ArticleKind }) {
  const config = KINDS[kind]
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

  // Dengan isi lengkap, ringkasan tetap apa adanya: ayat renungan tidak tertukar dengan
  // cuplikan isi.
  const list = useApiQuery<ApiPage<PublicContent>>('/public/contents', {
    category: kind,
    q,
    page,
    per_page: PER_PAGE,
    with_body: 'true',
  })
  const items = list.data?.data ?? []
  const total = list.data?.meta.total ?? 0
  const featured = page === 1 && !q ? items[0] : undefined
  const rest = featured ? items.slice(1) : items

  return (
    <>
      <PageIntro
        id="judul-artikel"
        eyebrow={config.eyebrow}
        title={config.title}
        lead={config.lead}
      >
        <div className="relative w-full sm:w-80">
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
            placeholder={`Cari ${config.noun}`}
            aria-label={`Cari ${config.noun}`}
            className="h-10 w-full rounded-lg border-0 bg-white pr-3 pl-9 text-sm text-portal-ink shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-portal-blue-light"
          />
        </div>
      </PageIntro>

      <PortalSection labelledBy="judul-artikel">
        {list.error && !list.data ? (
          <EmptyNote>
            Daftar {config.noun} tidak dapat dimuat.{' '}
            <button
              type="button"
              onClick={list.reload}
              className="font-semibold text-portal-navy underline"
            >
              Coba lagi
            </button>
          </EmptyNote>
        ) : !list.data ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyNote>
            {q ? `Tidak ada ${config.noun} yang cocok dengan “${q}”.` : config.empty}
          </EmptyNote>
        ) : (
          <>
            {featured && <FeaturedArticle item={featured} base={config.base} />}
            {rest.length > 0 && (
              <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((item) => (
                  <li key={item.id}>
                    <ArticleCard item={item} base={config.base} />
                  </li>
                ))}
              </ul>
            )}
            <Pager
              page={page}
              perPage={PER_PAGE}
              total={total}
              noun={config.noun}
              onPage={(next) => update({ page: String(next) })}
            />
          </>
        )}
      </PortalSection>
    </>
  )
}

function FeaturedArticle({ item, base }: { item: PublicContent; base: string }) {
  const verse = verseOf(item)
  return (
    <PortalCard
      as="article"
      className="relative grid overflow-hidden transition-shadow hover:shadow-md lg:grid-cols-2"
    >
      {item.thumbnail_url && (
        <img
          src={item.thumbnail_url}
          alt=""
          className="h-56 w-full object-cover lg:h-full lg:max-h-[22rem]"
        />
      )}
      <div
        className={cn(
          'grid content-center gap-3 p-6 lg:p-8',
          !item.thumbnail_url && 'lg:col-span-2',
        )}
      >
        <span className="text-xs font-bold tracking-wider text-portal-amber uppercase">
          Terbaru · {publishedDate(item.published_at)}
        </span>
        <h2 className="font-portal-heading text-2xl leading-8 font-bold text-portal-navy sm:text-[2rem] sm:leading-10">
          <Link
            to={`${base}/${item.slug}`}
            className="after:absolute after:inset-0 hover:underline"
          >
            {item.title}
          </Link>
        </h2>
        {verse && <p className="font-semibold text-portal-ink">{verse}</p>}
        {teaserOf(item) && (
          <p className="line-clamp-3 max-w-[70ch] text-portal-muted">{teaserOf(item)}</p>
        )}
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-portal-navy">
          Baca selengkapnya
          <ArrowRight className="size-4" aria-hidden="true" />
        </span>
      </div>
    </PortalCard>
  )
}

function ArticleCard({ item, base }: { item: PublicContent; base: string }) {
  const verse = verseOf(item)
  return (
    <PortalCard
      as="article"
      className="relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md"
    >
      {item.thumbnail_url && (
        <img src={item.thumbnail_url} alt="" loading="lazy" className="h-44 w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <span className="text-xs font-semibold text-portal-amber">
          {publishedDate(item.published_at)}
          {verse && ` · ${verse}`}
        </span>
        <h3 className="font-portal-heading text-xl leading-7 font-semibold text-portal-navy">
          <Link
            to={`${base}/${item.slug}`}
            className="after:absolute after:inset-0 hover:underline"
          >
            {item.title}
          </Link>
        </h3>
        {teaserOf(item) && (
          <p className="line-clamp-3 text-sm text-portal-muted">{teaserOf(item)}</p>
        )}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-portal-navy">
          Baca
          <ArrowRight className="size-4" aria-hidden="true" />
        </span>
      </div>
    </PortalCard>
  )
}

function ArticleDetail({ kind }: { kind: ArticleKind }) {
  const config = KINDS[kind]
  const { slug = '' } = useParams()
  const article = useApiQuery<{ content: PublicContent }>(`/public/contents/${slug}`)
  const others = useApiQuery<ApiPage<PublicContent>>('/public/contents', {
    category: kind,
    per_page: 4,
    with_body: 'true',
  })
  // Data artikel sebelumnya tetap tersedia selama memuat; pakai hanya bila alamatnya sama.
  const loaded = article.data?.content
  const content = loaded && loaded.slug === slug.toLowerCase() ? loaded : undefined

  // Judul tab mengikuti judul artikel.
  useEffect(() => {
    if (content) document.title = `${content.title} · GMIT Lahairoi Tuak Sabu Lasiana`
  }, [content])

  if (content && content.category !== kind) {
    return <Navigate to={CATEGORY_PATHS[content.category](content.slug)} replace />
  }

  const back = (
    <Link
      to={config.base}
      className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-portal-navy hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Semua {config.noun}
    </Link>
  )

  if (article.error && !content) {
    return (
      <PortalSection tone="low" className="py-16">
        {back}
        <h1 className="font-portal-heading text-3xl font-bold text-portal-navy">
          {config.noun.charAt(0).toUpperCase() + config.noun.slice(1)} tidak ditemukan
        </h1>
        <p className="text-portal-muted">
          Tautan ini mungkin salah, atau {config.noun} ini belum atau tidak lagi diterbitkan.
        </p>
      </PortalSection>
    )
  }

  if (!content) {
    return (
      <PortalSection tone="low" className="py-12">
        {back}
        <Skeleton className="h-12 w-2/3 rounded-lg" />
        <Skeleton className="h-80 rounded-xl" />
      </PortalSection>
    )
  }

  const verse = verseOf(content)
  const moreItems = (others.data?.data ?? []).filter((item) => item.id !== content.id).slice(0, 3)

  async function share() {
    if (!content) return
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: content.title, url })
        return
      } catch {
        // Dibatalkan pengguna; jatuh ke salin tautan.
      }
    }
    if (await copyText(url)) toast.success('Tautan disalin.')
  }

  return (
    <article aria-labelledby="judul-baca">
      <header className="bg-portal-low px-4 py-10 lg:px-8">
        <div className="mx-auto grid max-w-3xl gap-4">
          {back}
          <span className="text-xs font-bold tracking-wider text-portal-amber uppercase">
            {config.title} · {publishedDate(content.published_at)}
          </span>
          <h1
            id="judul-baca"
            className="font-portal-heading text-3xl leading-tight font-bold text-balance text-portal-navy sm:text-[2.5rem] sm:leading-[3rem]"
          >
            {content.title}
          </h1>
          {verse && (
            <p className="w-fit rounded-lg bg-white px-4 py-2 font-semibold text-portal-ink shadow-sm">
              {verse}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-portal-muted">
              Oleh{' '}
              <span className="font-semibold text-portal-ink">
                {content.author_name ?? 'Majelis Jemaat'}
              </span>
            </p>
            <button
              type="button"
              onClick={() => void share()}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-portal-navy hover:underline"
            >
              <Share2 className="size-4" aria-hidden="true" />
              Bagikan
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-10 lg:px-8">
        <div className="mx-auto grid max-w-3xl gap-6">
          {content.thumbnail_url && (
            <img
              src={content.thumbnail_url}
              alt=""
              className="max-h-[28rem] w-full rounded-xl object-cover"
            />
          )}
          {!verse && content.summary && (
            <p className="text-xl leading-8 font-medium text-portal-ink">{content.summary}</p>
          )}
          <div className="grid gap-5 text-lg leading-8 text-portal-ink">
            {paragraphs(content.content_body).map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
          {content.attachment_url && (
            <a
              href={content.attachment_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-portal-mid px-4 py-2.5 text-sm font-semibold text-portal-navy hover:bg-portal-high"
            >
              <Download className="size-4" aria-hidden="true" />
              {isPdf(content.attachment_url) ? 'Buka lampiran PDF' : 'Buka lampiran'}
            </a>
          )}
        </div>
      </div>

      {moreItems.length > 0 && (
        <PortalSection tone="low" labelledBy="judul-lainnya">
          <div className="flex items-end justify-between gap-3">
            <h2
              id="judul-lainnya"
              className="font-portal-heading text-2xl font-bold text-portal-navy"
            >
              {config.more}
            </h2>
            <Link
              to={config.base}
              className="text-sm font-semibold text-portal-navy underline underline-offset-4"
            >
              Semua {config.noun}
            </Link>
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {moreItems.map((item) => (
              <li key={item.id}>
                <ArticleCard item={item} base={config.base} />
              </li>
            ))}
          </ul>
        </PortalSection>
      )}
    </article>
  )
}
