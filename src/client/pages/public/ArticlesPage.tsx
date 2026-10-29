import { useEffect, type ReactNode } from 'react'
import { ArrowLeft, Download, Share2 } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { toast } from 'sonner'
import type { ApiPage, ContentCategory, PublicContent } from '@shared/types'
import { HeroPanel } from '@/components/portal/kage/hero-panel'
import { SearchField, SitePager } from '@/components/portal/kage/list-controls'
import { PillButton, PillLink } from '@/components/portal/kage/pill'
import { Reveal } from '@/components/portal/kage/reveal'
import { LoadError, SiteSection } from '@/components/portal/kage/site-section'
import { AccentLine, TwoToneHeading } from '@/components/portal/kage/two-tone-heading'
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
    // Judul dua nada di hero: baris pertama sans, baris kedua serif miring.
    lead: string
    accent: string
    title: string
    intro: string
    noun: string
    empty: string
    more: string
  }
> = {
  DEVOTIONAL: {
    base: '/renungan',
    lead: 'Renungan',
    accent: 'harian.',
    title: 'Renungan',
    intro: 'Renungan harian dan artikel pembinaan iman dari Pendeta dan Majelis Jemaat.',
    noun: 'renungan',
    empty: 'Belum ada renungan yang terbit.',
    more: 'Renungan lainnya',
  },
  NEWS: {
    base: '/berita',
    lead: 'Berita &',
    accent: 'pengumuman.',
    title: 'Berita & Pengumuman',
    intro:
      'Berita kegiatan jemaat, pengumuman dukacita, dan informasi pelayanan klasis dan sinode.',
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

const SITE_NAME = 'GMIT Lahairoi Tuak Sabu Lasiana'
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

// ---------- Daftar

function ArticleList({ kind }: { kind: ArticleKind }) {
  const config = KINDS[kind]
  const { params, update } = useUrlFilters()
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)

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

  let body: ReactNode
  if (list.error && !list.data) {
    body = <LoadError message={`Daftar ${config.noun} tidak dapat dimuat.`} onRetry={list.reload} />
  } else if (!list.data) {
    body = (
      <div aria-hidden="true" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-80 animate-pulse rounded-3xl bg-site-paper" />
        ))}
      </div>
    )
  } else if (items.length === 0) {
    body = (
      <p className="text-lg text-site-muted">
        {q ? `Tidak ada ${config.noun} yang cocok dengan “${q}”.` : config.empty}
      </p>
    )
  } else {
    body = (
      <div
        aria-busy={list.loading}
        className={cn('grid gap-10 transition-opacity', list.loading && 'opacity-60')}
      >
        {featured && <FeaturedArticle item={featured} base={config.base} />}
        {rest.length > 0 && (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((item) => (
              <Reveal as="li" key={item.id}>
                <ArticleCard item={item} base={config.base} />
              </Reveal>
            ))}
          </ul>
        )}
        <SitePager
          page={page}
          perPage={PER_PAGE}
          total={total}
          noun={config.noun}
          onPage={(next) => update({ page: String(next) })}
        />
      </div>
    )
  }

  return (
    <>
      <HeroPanel
        labelledBy="judul-artikel"
        display={
          <div className="grid max-w-[760px] gap-5">
            <TwoToneHeading
              as="h1"
              id="judul-artikel"
              size="page"
              onDark
              lead={config.lead}
              accent={config.accent}
            />
            <p className="max-w-[60ch] text-base leading-relaxed text-white/85 md:text-lg">
              {config.intro}
            </p>
          </div>
        }
      >
        <div className="mt-auto pt-10">
          <SearchField
            value={q}
            onSearch={(value) => update({ q: value }, { keepScroll: true })}
            label={`Cari ${config.noun}`}
            placeholder={`Cari ${config.noun}`}
            onPhoto
          />
        </div>
      </HeroPanel>
      <SiteSection className="pt-12 lg:pt-16">{body}</SiteSection>
    </>
  )
}

// Artikel terbaru: kartu lebar. Judul dan "Baca selengkapnya" sama-sama tautan (tanpa
// lapisan yang menutupi seluruh kartu, agar baris ayat tidak tertutup); sampul dan tautan
// kedua tidak masuk urutan Tab.
function FeaturedArticle({ item, base }: { item: PublicContent; base: string }) {
  const verse = verseOf(item)
  const teaser = teaserOf(item)
  const to = `${base}/${item.slug}`
  return (
    <Reveal
      as="article"
      aria-labelledby={`judul-${item.id}`}
      className="group grid overflow-hidden rounded-3xl bg-site-paper lg:grid-cols-2"
    >
      {item.thumbnail_url && (
        <Link to={to} tabIndex={-1} aria-hidden="true">
          <img
            src={item.thumbnail_url}
            alt=""
            decoding="async"
            className="aspect-[16/10] w-full object-cover lg:aspect-auto lg:h-full lg:max-h-[30rem]"
          />
        </Link>
      )}
      <div
        className={cn(
          'grid content-center gap-5 p-6 md:p-10',
          !item.thumbnail_url && 'lg:col-span-2 lg:max-w-[860px]',
        )}
      >
        <TwoToneHeading
          as="h2"
          id={`judul-${item.id}`}
          size="card"
          className="text-2xl"
          lead={
            <Link
              to={to}
              className="rounded-sm decoration-2 underline-offset-8 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring"
            >
              {item.title}
            </Link>
          }
        />
        {verse && (
          <AccentLine size="card" className="text-2xl">
            {verse}
          </AccentLine>
        )}
        <p className="inline-flex items-center gap-2 text-sm font-medium text-site-muted">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-site-accent" />
          Terbaru · {publishedDate(item.published_at)}
        </p>
        {teaser && (
          <p className="line-clamp-3 max-w-[65ch] text-lg leading-relaxed text-site-ink/80">
            {teaser}
          </p>
        )}
        <Link
          to={to}
          tabIndex={-1}
          aria-hidden="true"
          className="w-fit text-base font-semibold hover:underline"
        >
          Baca selengkapnya <span>→</span>
        </Link>
      </div>
    </Reveal>
  )
}

// `className` mengganti latar kartu, mis. kanvas di atas seksi putih tulang.
function ArticleCard({
  item,
  base,
  className,
}: {
  item: PublicContent
  base: string
  className?: string
}) {
  const verse = verseOf(item)
  const teaser = teaserOf(item)
  return (
    <article
      className={cn(
        'group relative flex h-full flex-col gap-4 rounded-3xl bg-site-paper p-4 md:p-5',
        className,
      )}
    >
      {item.thumbnail_url && (
        <img
          src={item.thumbnail_url}
          alt=""
          loading="lazy"
          decoding="async"
          className="aspect-[16/10] w-full rounded-2xl object-cover"
        />
      )}
      <div className="flex flex-1 flex-col gap-2 px-1 pb-1">
        <h3 className="font-site-display text-xl leading-snug font-bold">
          <Link
            to={`${base}/${item.slug}`}
            className="rounded-sm underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0 after:rounded-3xl focus-visible:ring-3 focus-visible:ring-ring"
          >
            {item.title}
          </Link>
        </h3>
        <p className="text-sm font-medium text-site-muted">
          {publishedDate(item.published_at)}
          {verse && ` · ${verse}`}
        </p>
        {teaser && <p className="line-clamp-3 text-base text-site-ink/80">{teaser}</p>}
        <span className="mt-auto pt-2 text-base font-semibold">
          Baca <span aria-hidden="true">→</span>
        </span>
      </div>
    </article>
  )
}

// ---------- Baca

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

  // Judul tab mengikuti judul artikel, lalu kembali ke judul halaman saat artikel
  // ditinggalkan (judul rute /renungan dan /renungan/:slug sama, jadi RootLayout tidak
  // memasangnya ulang).
  useEffect(() => {
    if (!content) return
    const previous = document.title
    document.title = `${content.title} · ${SITE_NAME}`
    return () => {
      document.title = previous
    }
  }, [content])

  if (content && content.category !== kind) {
    return <Navigate to={CATEGORY_PATHS[content.category](content.slug)} replace />
  }

  const back = (
    <PillLink to={config.base} tone="outline" size="sm">
      <ArrowLeft aria-hidden="true" />
      Semua {config.noun}
    </PillLink>
  )

  if (article.error && !content) {
    return (
      <SiteSection labelledBy="judul-baca" className="pt-8 lg:pt-12">
        <div className="mx-auto grid max-w-[1040px] justify-items-start gap-6">
          <h1
            id="judul-baca"
            className="font-site-display text-[32px] leading-tight font-extrabold tracking-tight md:text-5xl"
          >
            {config.noun.charAt(0).toUpperCase() + config.noun.slice(1)} tidak ditemukan
          </h1>
          <p className="text-lg text-site-ink/80">
            Tautan ini mungkin salah, atau {config.noun} ini belum atau tidak lagi diterbitkan.
          </p>
          {back}
        </div>
      </SiteSection>
    )
  }

  if (!content) {
    return (
      <SiteSection className="pt-8 lg:pt-12">
        <div aria-hidden="true" className="mx-auto grid max-w-[1040px] gap-6">
          <div className="h-9 w-40 animate-pulse rounded-full bg-site-paper" />
          <div className="h-14 w-2/3 animate-pulse rounded-2xl bg-site-paper" />
          <div className="h-80 animate-pulse rounded-3xl bg-site-paper" />
        </div>
      </SiteSection>
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
    else toast.error('Tautan tidak dapat disalin. Salin secara manual dari bilah alamat.')
  }

  return (
    <>
      <article aria-labelledby="judul-baca" className="px-6 pt-8 pb-20 lg:pt-12 lg:pb-[120px]">
        <div className="mx-auto grid max-w-[1040px] gap-8">
          <header className="grid gap-6">
            <h1
              id="judul-baca"
              className="font-site-display text-[28px] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance sm:text-5xl lg:text-[68px]"
            >
              {content.title}
            </h1>
            {verse && (
              <AccentLine size="card" className="text-[26px] sm:text-4xl lg:text-5xl">
                {verse}
              </AccentLine>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <p className="text-base text-site-muted">
                {config.title} · {publishedDate(content.published_at)} · Oleh{' '}
                <span className="font-semibold text-site-ink">
                  {content.author_name ?? 'Majelis Jemaat'}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {back}
                <PillButton tone="dark" size="sm" onClick={() => void share()}>
                  <Share2 aria-hidden="true" />
                  Bagikan
                </PillButton>
              </div>
            </div>
          </header>
          {content.thumbnail_url && (
            <img
              src={content.thumbnail_url}
              alt=""
              decoding="async"
              className="max-h-[28rem] w-full rounded-3xl object-cover"
            />
          )}
          {!verse && content.summary && (
            <p className="max-w-[60ch] text-xl leading-relaxed font-medium">{content.summary}</p>
          )}
          <div className="grid max-w-[65ch] gap-6 text-lg leading-relaxed">
            {paragraphs(content.content_body).map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
          {content.attachment_url && (
            <PillLink
              to={content.attachment_url}
              target="_blank"
              rel="noreferrer"
              tone="outline"
              className="w-fit"
            >
              <Download aria-hidden="true" />
              {isPdf(content.attachment_url) ? 'Buka lampiran PDF' : 'Buka lampiran'}
            </PillLink>
          )}
        </div>
      </article>

      {moreItems.length > 0 && (
        <SiteSection tone="paper" labelledBy="judul-lainnya">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Reveal>
              <TwoToneHeading id="judul-lainnya" size="card" lead={config.more} />
            </Reveal>
            <PillLink to={config.base} tone="outline" size="sm" arrow>
              Semua {config.noun}
            </PillLink>
          </div>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {moreItems.map((item) => (
              <Reveal as="li" key={item.id}>
                <ArticleCard item={item} base={config.base} className="bg-site-canvas" />
              </Reveal>
            ))}
          </ul>
        </SiteSection>
      )}
    </>
  )
}
