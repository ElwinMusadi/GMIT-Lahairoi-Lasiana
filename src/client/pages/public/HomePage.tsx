import { useState, type ReactNode } from 'react'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Download,
  FileText,
  HandHeart,
  Landmark,
  Megaphone,
  Newspaper,
  QrCode,
  Share2,
  Users,
} from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import type { PublicContent, PublicHome, PublicWorship, WorshipCategory } from '@shared/types'
import { WellMark } from '@/components/brand/well'
import {
  EmptyNote,
  Eyebrow,
  PortalCard,
  PortalSection,
  SectionHeading,
} from '@/components/portal/parts'
import { WorshipCard } from '@/components/portal/worship-card'
import { Skeleton } from '@/components/ui/skeleton'
import { copyText, paragraphs, publishedDate, worshipWhen } from '@/lib/portal'
import { useApiQuery } from '@/lib/use-api-query'
import { cn } from '@/lib/utils'

// Beranda Portal Publik (rancangan design/stitch/08): pengumuman terkini, sambutan dan
// tautan cepat, jadwal ibadah terdekat, renungan hari ini, warta PDF terbaru, berita,
// dan ajakan persembahan. Semua isi dari GET /api/public/home.
export default function HomePage() {
  const home = useApiQuery<PublicHome>('/public/home')
  const data = home.data

  return (
    <>
      <NoticeBar news={data?.latest_news[0]} warta={data?.latest_warta} />
      <Hero home={data} loading={!data && !home.error} />
      <Agenda home={data} error={home.error} onRetry={home.reload} />
      <Publications home={data} />
      <OfferingStrip />
    </>
  )
}

// Pita biru tua di atas hero: pengumuman terbaru.
function NoticeBar({
  news,
  warta,
}: {
  news: PublicContent | undefined
  warta: PublicContent | null | undefined
}) {
  const item = news ?? warta
  if (!item) return null
  return (
    <div className="bg-portal-navy px-4 py-2 text-xs font-semibold text-white lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2">
          <span className="flex size-5 flex-none items-center justify-center rounded-full bg-portal-amber-light text-portal-amber-ink">
            <Megaphone className="size-3" aria-hidden="true" />
          </span>
          <span className="flex-none text-portal-amber-soft">
            {news ? 'Pengumuman terkini:' : 'Warta terbaru:'}
          </span>
          <span className="truncate font-medium text-white/90">{item.title}</span>
        </p>
        <span className="hidden flex-none text-portal-blue-light sm:inline">
          Zona waktu: WITA (UTC+8)
        </span>
      </div>
    </div>
  )
}

function Hero({ home, loading }: { home: PublicHome | undefined; loading: boolean }) {
  // Tema kebaktian Minggu terdekat yang sudah diumumkan.
  const sunday = home?.upcoming_worships.find(
    (worship) => worship.category === 'SUNDAY_SERVICE' && worship.theme,
  )
  const warta = home?.latest_warta
  return (
    <section
      aria-labelledby="judul-beranda"
      className="relative overflow-hidden bg-portal-low px-4 py-10 lg:px-8"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-portal-high px-4 py-1">
            <span className="size-2 rounded-full bg-portal-amber" aria-hidden="true" />
            <span className="text-xs font-semibold tracking-widest text-portal-amber uppercase">
              Selamat datang di portal jemaat
            </span>
          </span>
          <div className="grid gap-3">
            <h1
              id="judul-beranda"
              className="font-portal-heading text-3xl leading-tight font-bold tracking-tight text-balance text-portal-navy sm:text-[2.5rem] sm:leading-[3rem]"
            >
              GMIT Jemaat Lahairoi Tuak Sabu Lasiana
            </h1>
            <p className="max-w-2xl text-lg leading-7 text-pretty text-portal-muted">
              Wadah persekutuan, informasi ibadah, dan pelayanan bagi seluruh jemaat dan keluarga di
              lima rayon pelayanan Lasiana, Kota Kupang.
            </p>
          </div>

          {loading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : (
            sunday && home && <ThemeCard worship={sunday} today={home.today} />
          )}

          <div className="grid gap-2 pt-1 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href={warta?.attachment_url ?? '/warta'}
              external={Boolean(warta?.attachment_url)}
              icon={<Download className="size-5" aria-hidden="true" />}
              title="Unduh Warta Jemaat"
              note={warta ? `PDF · ${publishedDate(warta.published_at)}` : 'Belum terbit'}
              className="bg-portal-amber text-white"
              noteClass="text-white/80"
            />
            <QuickAction
              href="#jadwal"
              icon={<CalendarDays className="size-5" aria-hidden="true" />}
              title="Jadwal Ibadah"
              note="Minggu, rayon, kategorial"
              className="bg-portal-indigo text-white"
              noteClass="text-portal-blue-soft"
            />
            <QuickAction
              href="/persembahan"
              icon={<QrCode className="size-5 text-portal-navy" aria-hidden="true" />}
              title="Beri Persembahan"
              note="QRIS & transfer bank"
              className="bg-portal-highest text-portal-ink hover:bg-portal-blue-soft"
              noteClass="text-portal-muted"
            />
            <QuickAction
              href="/profil"
              icon={<Users className="size-5 text-portal-amber" aria-hidden="true" />}
              title="Profil & 5 Rayon"
              note="Sejarah, majelis, rayon"
              className="bg-portal-highest text-portal-ink hover:bg-portal-blue-soft"
              noteClass="text-portal-muted"
            />
          </div>
        </div>

        <div className="flex w-full flex-none flex-col gap-3 lg:w-96">
          <HeroVisual media={home?.latest_media ?? null} loading={loading} />
          <div className="flex items-center justify-between gap-3 rounded-xl bg-portal-high p-4">
            <div className="flex items-center gap-3">
              <Landmark className="size-5 flex-none text-portal-amber" aria-hidden="true" />
              <div className="grid">
                <span className="text-sm font-bold text-portal-ink">Baru di Lahairoi?</span>
                <span className="text-sm text-portal-muted">
                  Kenali sejarah, majelis, dan rayon Anda.
                </span>
              </div>
            </div>
            <Link
              to="/profil"
              className="flex-none rounded-md bg-portal-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-portal-indigo"
            >
              Profil
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function ThemeCard({ worship, today }: { worship: PublicWorship; today: string }) {
  return (
    <PortalCard className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-start gap-4">
        <span className="flex size-12 flex-none items-center justify-center rounded-xl bg-portal-indigo text-white">
          <BookOpen className="size-6" aria-hidden="true" />
        </span>
        <div className="grid min-w-0">
          <Eyebrow className="text-xs">Tema kebaktian minggu ini</Eyebrow>
          <p className="font-portal-heading text-xl leading-7 font-semibold text-portal-ink">
            “{worship.theme}”
          </p>
          <p className="text-xs font-medium text-portal-muted">
            {[worship.bible_reading, worship.preacher && `Pelayan Firman ${worship.preacher}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>
      <span className="flex-none rounded-full bg-portal-mid px-3 py-1 text-xs font-semibold text-portal-navy">
        {worshipWhen(worship.worship_date, worship.worship_time, today)}
      </span>
    </PortalCard>
  )
}

function QuickAction({
  href,
  external = false,
  icon,
  title,
  note,
  className,
  noteClass,
}: {
  href: string
  external?: boolean
  icon: ReactNode
  title: string
  note: string
  className: string
  noteClass: string
}) {
  const body = (
    <>
      {icon}
      <span className="grid min-w-0 text-left">
        <span className="truncate text-sm font-bold">{title}</span>
        <span className={cn('truncate text-xs', noteClass)}>{note}</span>
      </span>
    </>
  )
  const classes = cn(
    'flex min-h-14 items-center gap-3 rounded-lg px-4 py-2 shadow-sm transition-opacity hover:opacity-95',
    className,
  )
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {body}
      </a>
    )
  }
  return href.startsWith('#') ? (
    <a href={href} className={classes}>
      {body}
    </a>
  ) : (
    <Link to={href} className={classes}>
      {body}
    </Link>
  )
}

// Foto dokumentasi terbaru dari Galeri; tanpa foto, makna nama Lahai-roi.
function HeroVisual({ media, loading }: { media: PublicContent | null; loading: boolean }) {
  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />
  if (media?.thumbnail_url) {
    return (
      <Link
        to="/media"
        aria-label={`Galeri kegiatan: ${media.title}`}
        className="relative block overflow-hidden rounded-xl bg-white shadow-md"
      >
        <img
          src={media.thumbnail_url}
          alt={media.summary ?? media.title}
          className="h-64 w-full object-cover"
        />
        <span className="absolute inset-0 flex flex-col justify-end gap-0.5 bg-gradient-to-t from-portal-navy/90 via-portal-navy/30 to-transparent p-4 text-white">
          <span className="text-xs font-bold tracking-wider text-portal-amber-soft uppercase">
            Dokumentasi terbaru
          </span>
          <span className="font-portal-heading text-xl leading-7 font-semibold">{media.title}</span>
          {media.summary && (
            <span className="line-clamp-2 text-sm text-white/80">{media.summary}</span>
          )}
        </span>
      </Link>
    )
  }
  return (
    <div className="relative flex h-64 flex-col justify-end overflow-hidden rounded-xl bg-portal-navy p-5 text-white shadow-md">
      <WellMark className="absolute -top-10 -right-10 size-56 text-portal-indigo" />
      <span className="relative text-xs font-bold tracking-wider text-portal-amber-soft uppercase">
        Makna nama Lahai-roi
      </span>
      <p className="relative font-portal-heading text-xl leading-7 font-semibold">
        Sumur Dia yang hidup, yang melihat aku.
      </p>
      <p className="relative text-sm text-white/80">Kejadian 16:13–14</p>
    </div>
  )
}

type AgendaFilter = 'ALL' | 'SUNDAY_SERVICE' | 'RAYON' | 'OTHER'

const FILTERS: { value: AgendaFilter; label: string }[] = [
  { value: 'ALL', label: 'Semua jadwal' },
  { value: 'SUNDAY_SERVICE', label: 'Kebaktian Minggu' },
  { value: 'RAYON', label: 'Ibadah rayon' },
  { value: 'OTHER', label: 'Kategorial & khusus' },
]

function matches(filter: AgendaFilter, category: WorshipCategory) {
  if (filter === 'ALL') return true
  if (filter === 'OTHER') return category === 'CATEGORICAL' || category === 'SPECIAL'
  return category === filter
}

function Agenda({
  home,
  error,
  onRetry,
}: {
  home: PublicHome | undefined
  error: string | null
  onRetry: () => void
}) {
  const [filter, setFilter] = useState<AgendaFilter>('ALL')
  const worships = home?.upcoming_worships ?? []
  const shown = worships.filter((worship) => matches(filter, worship.category))
  return (
    <PortalSection id="jadwal" labelledBy="judul-jadwal">
      <SectionHeading
        id="judul-jadwal"
        eyebrow="Jadwal persekutuan & pelayanan"
        title="Jadwal Ibadah Terdekat"
        lead="Terbuka untuk jemaat, keluarga, dan tamu. Semua waktu dalam WITA."
        action={
          <Link
            to="/jadwal"
            className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-portal-high px-4 py-2 text-xs font-semibold text-portal-ink hover:bg-portal-highest"
          >
            <CalendarDays className="size-4 text-portal-navy" aria-hidden="true" />
            Semua jadwal ibadah
          </Link>
        }
      />
      {worships.length > 0 && (
        <div
          role="group"
          aria-label="Saring jenis ibadah"
          className="flex gap-1.5 overflow-x-auto border-b border-portal-high pb-2"
        >
          {FILTERS.map((option) => {
            const count = worships.filter((worship) =>
              matches(option.value, worship.category),
            ).length
            const active = option.value === filter
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(option.value)}
                className={cn(
                  'flex-none rounded-lg px-4 py-2 text-xs font-semibold transition-colors',
                  active
                    ? 'bg-portal-indigo font-bold text-white'
                    : 'bg-portal-low text-portal-muted hover:bg-portal-mid',
                )}
              >
                {option.label} ({count})
              </button>
            )
          })}
        </div>
      )}
      {error && !home ? (
        <EmptyNote>
          Jadwal tidak dapat dimuat.{' '}
          <button
            type="button"
            onClick={onRetry}
            className="font-semibold text-portal-navy underline"
          >
            Coba lagi
          </button>
        </EmptyNote>
      ) : !home ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : worships.length === 0 ? (
        <EmptyNote>Jadwal ibadah terdekat belum diumumkan pengurus jemaat.</EmptyNote>
      ) : shown.length === 0 ? (
        <EmptyNote>Belum ada jadwal jenis ini dalam waktu dekat.</EmptyNote>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((worship) => (
            <WorshipCard key={worship.id} worship={worship} today={home.today} />
          ))}
        </div>
      )}
    </PortalSection>
  )
}

function Publications({ home }: { home: PublicHome | undefined }) {
  return (
    <PortalSection id="warta" tone="low" labelledBy="judul-publikasi">
      <SectionHeading
        id="judul-publikasi"
        eyebrow="Publikasi mingguan"
        title="Renungan Harian & Warta Jemaat"
        lead="Firman untuk hari ini, warta lengkap dalam PDF, serta berita dan pengumuman jemaat."
      />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-7">
          {home ? (
            <DevotionalCard devotional={home.devotional} />
          ) : (
            <Skeleton className="h-80 rounded-xl" />
          )}
          {home ? <WartaBox warta={home.latest_warta} /> : <Skeleton className="h-24 rounded-xl" />}
        </div>
        <div className="lg:col-span-5">
          {home ? <NewsCard news={home.latest_news} /> : <Skeleton className="h-80 rounded-xl" />}
        </div>
      </div>
    </PortalSection>
  )
}

const DEVOTIONAL_PREVIEW = 3

function DevotionalCard({ devotional }: { devotional: PublicHome['devotional'] }) {
  const [expanded, setExpanded] = useState(false)
  if (!devotional) {
    return (
      <PortalCard className="p-6">
        <p className="flex items-center gap-2 text-sm font-bold text-portal-navy">
          <BookOpen className="size-5 text-portal-amber" aria-hidden="true" />
          Renungan Hari Ini
        </p>
        <p className="mt-3 text-portal-muted">Renungan hari ini belum tersedia.</p>
      </PortalCard>
    )
  }
  const parts = paragraphs(devotional.content_body)
  const shown = expanded ? parts : parts.slice(0, DEVOTIONAL_PREVIEW)

  async function share() {
    if (!devotional) return
    const text = `${devotional.title}${devotional.summary ? ` (${devotional.summary})` : ''}`
    const url = `${window.location.origin}/renungan/${devotional.slug}`
    if (navigator.share) {
      try {
        await navigator.share({ title: devotional.title, text, url })
        return
      } catch {
        // Dibatalkan pengguna; jatuh ke salin tautan.
      }
    }
    if (await copyText(`${text}\n${url}`)) toast.success('Judul dan tautan renungan disalin.')
  }

  return (
    <PortalCard as="article" className="grid gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-portal-high pb-3">
        <p className="flex items-center gap-2 text-sm font-bold text-portal-navy">
          <BookOpen className="size-5 text-portal-amber" aria-hidden="true" />
          {devotional.is_today ? 'Renungan Hari Ini' : 'Renungan Terbaru'}
        </p>
        <span className="rounded-full bg-portal-low px-3 py-1 text-xs text-portal-muted">
          {publishedDate(devotional.published_at)}
        </span>
      </header>
      <div id="renungan" className="grid gap-1 rounded-lg bg-portal-low p-4">
        {devotional.summary && (
          <span className="text-xs font-bold tracking-wider text-portal-amber uppercase">
            {devotional.summary}
          </span>
        )}
        <h3 className="font-portal-heading text-xl leading-7 font-semibold text-portal-ink">
          <Link to={`/renungan/${devotional.slug}`} className="hover:underline">
            {devotional.title}
          </Link>
        </h3>
      </div>
      {devotional.thumbnail_url && (
        <img
          src={devotional.thumbnail_url}
          alt=""
          className="max-h-56 w-full rounded-lg object-cover"
          loading="lazy"
        />
      )}
      <div className="grid gap-3 text-portal-muted">
        {shown.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
        {parts.length > DEVOTIONAL_PREVIEW && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="w-fit text-sm font-semibold text-portal-navy underline underline-offset-4"
          >
            {expanded ? 'Tampilkan lebih sedikit' : 'Baca selengkapnya'}
          </button>
        )}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-portal-high pt-3">
        <span className="grid">
          <span className="text-sm font-bold text-portal-ink">
            {devotional.author_name ?? 'Majelis Jemaat'}
          </span>
          <span className="text-xs text-portal-muted">Penulis renungan</span>
        </span>
        <Link
          to="/renungan"
          className="ml-auto text-sm font-semibold text-portal-navy hover:underline"
        >
          Renungan lainnya
        </Link>
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-portal-navy hover:underline"
        >
          <Share2 className="size-4" aria-hidden="true" />
          Bagikan
        </button>
      </footer>
    </PortalCard>
  )
}

function WartaBox({ warta }: { warta: PublicContent | null }) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-xl bg-portal-navy p-5 text-white shadow-sm sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <span className="flex size-12 flex-none items-center justify-center rounded-lg bg-white/10 text-portal-amber-soft">
          <Newspaper className="size-7" aria-hidden="true" />
        </span>
        <div className="grid">
          <span className="text-sm font-bold">{warta ? warta.title : 'Warta Jemaat'}</span>
          <span className="text-sm text-white/80">
            {warta
              ? (warta.summary ?? `Terbit ${publishedDate(warta.published_at)}`)
              : 'Warta minggu ini belum diterbitkan.'}
          </span>
        </div>
      </div>
      <div className="flex flex-none flex-wrap items-center gap-3">
        <Link to="/warta" className="text-sm font-semibold text-white underline underline-offset-4">
          Arsip warta
        </Link>
        {warta?.attachment_url && (
          <a
            href={warta.attachment_url}
            download={`${warta.slug}.pdf`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-portal-amber px-4 py-2 text-sm font-bold text-white transition-colors hover:opacity-90"
          >
            <Download className="size-4" aria-hidden="true" />
            Unduh PDF
          </a>
        )}
      </div>
    </div>
  )
}

function NewsCard({ news }: { news: PublicContent[] }) {
  return (
    <PortalCard className="grid h-full content-start gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-portal-navy">
          <FileText className="size-5 text-portal-amber" aria-hidden="true" />
          Berita & Pengumuman
        </p>
        <Link to="/berita" className="text-sm font-semibold text-portal-navy hover:underline">
          Semua berita
        </Link>
      </div>
      {news.length === 0 ? (
        <p className="text-sm text-portal-muted">Belum ada berita atau pengumuman.</p>
      ) : (
        <ul className="grid gap-3">
          {news.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border-l-4 border-portal-amber bg-portal-low p-3"
            >
              <p className="text-xs font-semibold text-portal-amber">
                {publishedDate(item.published_at)}
              </p>
              <p className="mt-0.5 font-bold text-portal-ink">
                <Link to={`/berita/${item.slug}`} className="hover:underline">
                  {item.title}
                </Link>
              </p>
              {item.summary && (
                <p className="mt-1 line-clamp-3 text-sm text-portal-muted">{item.summary}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </PortalCard>
  )
}

function OfferingStrip() {
  return (
    <PortalSection labelledBy="judul-persembahan" className="py-8">
      <div className="flex flex-col items-start justify-between gap-5 rounded-xl border border-portal-high bg-portal-low p-6 md:flex-row md:items-center">
        <div className="flex items-start gap-4">
          <span className="flex size-12 flex-none items-center justify-center rounded-full bg-portal-indigo text-white">
            <HandHeart className="size-6" aria-hidden="true" />
          </span>
          <div className="grid gap-1">
            <Eyebrow>Persembahan</Eyebrow>
            <h2
              id="judul-persembahan"
              className="font-portal-heading text-xl leading-7 font-semibold text-portal-navy sm:text-2xl"
            >
              Persembahan lewat QRIS atau transfer bank
            </h2>
            <p className="text-sm text-portal-muted">
              Nomor rekening tiap pos kas dan kode QRIS resmi jemaat, dengan tombol salin.
            </p>
          </div>
        </div>
        <Link
          to="/persembahan"
          className="inline-flex flex-none items-center gap-1.5 rounded-lg bg-portal-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-portal-indigo"
        >
          Lihat rekening & QRIS
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </PortalSection>
  )
}
