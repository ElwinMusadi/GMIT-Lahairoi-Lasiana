import { useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Share2 } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import type {
  ApiList,
  ApiPage,
  PublicContent,
  PublicHome,
  PublicWorshipItem,
  RayonListItem,
  WorshipCategory,
} from '@shared/types'
import { CopyBar } from '@/components/portal/kage/copy-bar'
import { FaqAccordion } from '@/components/portal/kage/faq-accordion'
import { HeroPanel } from '@/components/portal/kage/hero-panel'
import { PhotoBand } from '@/components/portal/kage/photo-band'
import { PillButton, PillLink } from '@/components/portal/kage/pill'
import { RayonTable } from '@/components/portal/kage/rayon-table'
import { Reveal } from '@/components/portal/kage/reveal'
import { ScheduleBoard } from '@/components/portal/kage/schedule-board'
import { LoadError, SectionIntro, SiteSection } from '@/components/portal/kage/site-section'
import { AccentLine, TwoToneHeading } from '@/components/portal/kage/two-tone-heading'
import { WindowPanel } from '@/components/portal/kage/window-panel'
import { splitPaymentTitle } from '@/lib/contents'
import {
  accountDigits,
  addDays,
  compactPublishedDate,
  copyText,
  mediaCover,
  paragraphs,
  publishedDate,
  worshipWhen,
} from '@/lib/portal'
import { useFloat } from '@/lib/portal-motion'
import { SACRAMENT_FAQ } from '@/lib/sacrament-faq'
import { useApiQuery } from '@/lib/use-api-query'
import { cn } from '@/lib/utils'

// Beranda Portal Publik rancangan kage dengan isi Beranda 08: hero foto, papan jadwal
// terdekat, renungan hari ini, warta dan berita, layanan jemaat, lima rayon, galeri,
// persembahan, dan tanya-jawab sakramen. Isi utama dari GET /api/public/home.
export default function HomePage() {
  const home = useApiQuery<PublicHome>('/public/home')
  const today = home.data?.today
  // Kebaktian Minggu terdekat, juga di pertengahan minggu saat enam jadwal terdekat
  // berisi ibadah rayon dan kategorial.
  const sunday = useApiQuery<ApiPage<PublicWorshipItem>>('/public/worships', {
    category: 'SUNDAY_SERVICE',
    per_page: 1,
  })
  const rayons = useApiQuery<ApiList<RayonListItem>>('/rayons')
  const week = useApiQuery<ApiPage<PublicWorshipItem>>(today ? '/public/worships' : null, {
    to: today ? addDays(today, 6) : '',
    per_page: 1,
  })

  return (
    <>
      <HomeHero
        home={home.data}
        sunday={sunday.data?.data[0]}
        loading={!home.data && !home.error}
      />
      <Agenda home={home.data} error={home.error} onRetry={home.reload} />
      <Devotional home={home.data} error={home.error} onRetry={home.reload} />
      <Publications home={home.data} error={home.error} onRetry={home.reload} />
      <ServicesBand />
      <Rayons rayons={rayons.data?.data} error={rayons.error} onRetry={rayons.reload} />
      <Gallery />
      <Offering
        home={home.data}
        error={home.error}
        onRetry={home.reload}
        rayonCount={rayons.data?.data.length}
        weekCount={week.data?.meta.total}
      />
      <Questions />
    </>
  )
}

// ---------- Hero

function HomeHero({
  home,
  sunday,
  loading,
}: {
  home: PublicHome | undefined
  sunday: PublicWorshipItem | undefined
  loading: boolean
}) {
  const warta = home?.latest_warta
  return (
    <HeroPanel
      size="full"
      labelledBy="judul-beranda"
      display={
        <div className="grid justify-items-center gap-6 pt-2 text-center md:pt-6">
          {/* Makna nama Lahai-roi: "Engkaulah El-Roi", Allah yang melihat. */}
          <TwoToneHeading
            as="p"
            size="hero"
            onDark
            lead="Allah yang hidup"
            accent="melihat kita."
          />
          <p className="text-sm font-medium text-white/80">Kejadian 16:13–14</p>
        </div>
      }
    >
      <div className="mt-auto grid gap-8 pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-end">
        <div className="grid gap-6">
          <div className="grid max-w-[54ch] gap-3">
            <h1
              id="judul-beranda"
              className="font-site-display text-2xl leading-tight font-bold tracking-tight text-balance md:text-[28px]"
            >
              GMIT Jemaat Lahairoi Tuak Sabu Lasiana
            </h1>
            <p className="text-base leading-relaxed text-white/85 md:text-lg">
              Wadah persekutuan, informasi ibadah, dan pelayanan bagi seluruh jemaat dan keluarga di
              lima rayon pelayanan Lasiana, Kota Kupang.
            </p>
          </div>
          <Notice news={home?.latest_news[0]} warta={warta} />
          <nav aria-label="Akses cepat" className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <QuickAction
              primary
              to={warta?.attachment_url ?? '/warta'}
              external={Boolean(warta?.attachment_url)}
              title="Unduh Warta Jemaat"
              note={warta ? `PDF · ${compactPublishedDate(warta.published_at)}` : 'Belum terbit'}
            />
            <QuickAction to="#jadwal" title="Jadwal Ibadah" note="Minggu, rayon, kategorial" />
            <QuickAction to="/persembahan" title="Beri Persembahan" note="QRIS & transfer bank" />
            <QuickAction to="/profil" title="Profil & 5 Rayon" note="Sejarah, majelis, rayon" />
          </nav>
        </div>
        {loading ? (
          <div className="h-44 animate-pulse rounded-3xl bg-white/10" />
        ) : (
          sunday?.theme && home && <ThemeCard worship={sunday} today={home.today} />
        )}
      </div>
    </HeroPanel>
  )
}

// Pengumuman terkini (berita terbaru, atau warta terbaru bila belum ada berita).
function Notice({
  news,
  warta,
}: {
  news: PublicContent | undefined
  warta: PublicContent | null | undefined
}) {
  const item = news ?? warta
  if (!item) return null
  return (
    <PillLink
      to={news ? `/berita/${news.slug}` : '/warta'}
      tone="glass"
      size="sm"
      arrow
      className="h-auto min-h-11 max-w-full justify-self-start py-2 text-sm whitespace-normal"
    >
      <span className="min-w-0 text-left">
        <span className="font-semibold text-site-accent">
          {news ? 'Pengumuman terkini:' : 'Warta terbaru:'}
        </span>{' '}
        <span className="font-medium">{item.title}</span>
      </span>
    </PillLink>
  )
}

function QuickAction({
  to,
  title,
  note,
  primary = false,
  external = false,
}: {
  to: string
  title: string
  note: string
  primary?: boolean
  external?: boolean
}) {
  const classes = cn(
    'grid min-h-16 content-center gap-0.5 rounded-2xl px-3.5 py-3 text-left md:px-4 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-site-accent',
    primary
      ? 'bg-white text-site-panel hover:bg-site-paper'
      : 'bg-white/[0.12] text-white hover:bg-white/20',
  )
  const body = (
    <>
      <span className="text-sm font-semibold md:text-base">{title}</span>
      <span
        className={cn(
          'text-(length:--site-text-xs)',
          primary ? 'text-site-panel/70' : 'text-white/75',
        )}
      >
        {note}
      </span>
    </>
  )
  if (external) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className={classes}>
        {body}
        <span className="sr-only"> (membuka tab baru)</span>
      </a>
    )
  }
  // Jangkar di halaman ini juga lewat Link: tautan "#…" biasa membuat entri riwayat tanpa
  // state, dan ScrollRestoration lalu memulihkan posisi lama (kembali ke atas).
  return (
    <Link to={to} className={classes}>
      {body}
    </Link>
  )
}

function ThemeCard({ worship, today }: { worship: PublicWorshipItem; today: string }) {
  const meta = [worship.bible_reading, worship.preacher && `Pelayan Firman ${worship.preacher}`]
    .filter(Boolean)
    .join(' · ')
  return (
    <article
      aria-labelledby="judul-tema"
      aria-describedby="label-tema"
      className="grid gap-3 rounded-3xl bg-white/[0.12] p-5 md:p-6"
    >
      <h2 id="judul-tema" className="font-site-serif text-[28px] leading-tight font-normal italic">
        “{worship.theme}”
      </h2>
      <p id="label-tema" className="text-sm font-medium text-white/80">
        Tema kebaktian minggu ini{meta && ` · ${meta}`}
      </p>
      <p className="font-site-mono text-(length:--site-text-xs) text-site-accent">
        {worshipWhen(worship.worship_date, worship.worship_time, today)}
      </p>
    </article>
  )
}

// ---------- Jadwal ibadah terdekat

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

  const status =
    error && !home ? (
      <LoadError message="Jadwal tidak dapat dimuat." onRetry={onRetry} onDark />
    ) : !home ? (
      <div aria-hidden="true" className="grid gap-6">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-xl bg-white/[0.06]" />
        ))}
      </div>
    ) : worships.length === 0 ? (
      <p className="text-base text-white/80">
        Jadwal ibadah terdekat belum diumumkan pengurus jemaat.
      </p>
    ) : shown.length === 0 ? (
      <p className="text-base text-white/80">Belum ada jadwal jenis ini dalam waktu dekat.</p>
    ) : undefined

  return (
    <SiteSection id="jadwal" labelledBy="judul-jadwal">
      <SectionIntro
        id="judul-jadwal"
        lead="Jadwal ibadah"
        accent="terdekat."
        intro="Terbuka untuk jemaat, keluarga, dan tamu. Semua waktu dalam WITA."
      />
      {worships.length > 0 && (
        <div
          role="group"
          aria-label="Saring jenis ibadah"
          className="mt-12 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center"
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
                  'grid gap-1 rounded-2xl border p-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring sm:w-[200px]',
                  active
                    ? 'border-site-ink bg-site-ink text-site-canvas'
                    : 'border-transparent bg-site-paper text-site-ink hover:border-site-ink',
                )}
              >
                <span className="flex items-center justify-between gap-2 font-site-display text-sm font-bold">
                  {option.label}
                  {active && (
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-site-accent" />
                  )}
                </span>
                <span
                  className={cn(
                    'text-(length:--site-text-xs)',
                    active ? 'opacity-75' : 'text-site-muted',
                  )}
                >
                  {count} jadwal
                </span>
              </button>
            )
          })}
        </div>
      )}
      <Reveal className="mx-auto mt-12 max-w-[1040px]">
        <ScheduleBoard
          worships={shown}
          today={home?.today ?? ''}
          status={status}
          footer={
            <>
              <span>
                {home && worships.length > 0
                  ? `${shown.length} dari ${worships.length} jadwal terdekat`
                  : 'Jadwal ibadah publik jemaat'}
              </span>
              <PillLink to="/jadwal" tone="panel" size="sm" arrow>
                Semua jadwal ibadah
              </PillLink>
            </>
          }
        />
      </Reveal>
    </SiteSection>
  )
}

// ---------- Renungan hari ini

const DEVOTIONAL_PREVIEW = 3

function Devotional({
  home,
  error,
  onRetry,
}: {
  home: PublicHome | undefined
  error: string | null
  onRetry: () => void
}) {
  const devotional = home?.devotional
  return (
    <SiteSection id="renungan" tone="paper" labelledBy="judul-renungan">
      {devotional ? (
        <DevotionalArticle devotional={devotional} />
      ) : (
        <div className="mx-auto grid max-w-[760px] justify-items-center gap-6 text-center">
          <TwoToneHeading id="judul-renungan" lead="Renungan" accent="hari ini." />
          {error && !home ? (
            <LoadError message="Renungan tidak dapat dimuat." onRetry={onRetry} />
          ) : !home ? (
            <div
              aria-hidden="true"
              className="h-40 w-full animate-pulse rounded-3xl bg-site-rule/60"
            />
          ) : (
            <p className="text-lg text-site-muted">Renungan hari ini belum tersedia.</p>
          )}
        </div>
      )}
    </SiteSection>
  )
}

function DevotionalArticle({ devotional }: { devotional: NonNullable<PublicHome['devotional']> }) {
  const [expanded, setExpanded] = useState(false)
  const bodyId = useId()
  const parts = paragraphs(devotional.content_body)
  const shown = expanded ? parts : parts.slice(0, DEVOTIONAL_PREVIEW)

  async function share() {
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
    else toast.error('Tautan tidak dapat disalin. Salin secara manual dari bilah alamat.')
  }

  return (
    <article className="grid gap-10">
      <header className="mx-auto grid max-w-[860px] justify-items-center gap-6 text-center">
        <Reveal>
          <TwoToneHeading
            id="judul-renungan"
            size="card"
            lead={
              <Link
                to={`/renungan/${devotional.slug}`}
                className="rounded-sm decoration-2 underline-offset-8 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring"
              >
                {devotional.title}
              </Link>
            }
          />
          {devotional.summary && (
            <AccentLine size="card" className="mt-3">
              {devotional.summary}
            </AccentLine>
          )}
        </Reveal>
        <p className="inline-flex items-center gap-2 text-base font-medium text-site-muted">
          <span aria-hidden="true" className="size-2 rounded-full bg-site-accent" />
          {devotional.is_today ? 'Renungan hari ini' : 'Renungan terbaru'} ·{' '}
          {publishedDate(devotional.published_at)}
        </p>
      </header>
      {devotional.thumbnail_url && (
        <Reveal>
          <img
            src={devotional.thumbnail_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="mx-auto aspect-[16/9] max-h-[460px] w-full max-w-[960px] rounded-3xl object-cover"
          />
        </Reveal>
      )}
      <div className="mx-auto grid w-full max-w-[62ch] gap-6">
        <div id={bodyId} className="grid gap-5 text-lg leading-relaxed text-site-ink">
          {shown.map((paragraph, index) => (
            <p key={index} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>
        {parts.length > DEVOTIONAL_PREVIEW && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={() => setExpanded((value) => !value)}
            className="w-fit rounded-sm text-base font-semibold text-site-ink underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            {expanded ? 'Tampilkan lebih sedikit' : 'Baca selengkapnya'}
          </button>
        )}
        <footer className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-4">
          <p className="grid">
            <span className="font-site-display text-base font-bold">
              {devotional.author_name ?? 'Majelis Jemaat'}
            </span>
            <span className="text-sm text-site-muted">Penulis renungan</span>
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <PillLink to="/renungan" tone="outline" size="sm" arrow>
              Renungan lainnya
            </PillLink>
            <PillButton tone="dark" size="sm" onClick={() => void share()}>
              <Share2 aria-hidden="true" />
              Bagikan
            </PillButton>
          </div>
        </footer>
      </div>
    </article>
  )
}

// ---------- Warta dan berita

function Publications({
  home,
  error,
  onRetry,
}: {
  home: PublicHome | undefined
  error: string | null
  onRetry: () => void
}) {
  const scope = useRef<HTMLDivElement>(null)
  return (
    <SiteSection id="warta" labelledBy="judul-publikasi">
      <SectionIntro
        id="judul-publikasi"
        lead="Warta & berita"
        accent="untuk jemaat."
        intro="Warta lengkap dalam PDF, serta berita dan pengumuman jemaat."
      />
      {error && !home ? (
        <LoadError
          message="Warta dan berita tidak dapat dimuat."
          onRetry={onRetry}
          className="mt-12 text-center"
        />
      ) : (
        <div ref={scope} className="mt-14 grid items-stretch gap-6 md:grid-cols-2 md:gap-8">
          {home ? (
            <>
              <NewsCard news={home.latest_news} />
              <WartaCard warta={home.latest_warta} scope={scope} />
            </>
          ) : (
            <>
              <div
                aria-hidden="true"
                className="h-[420px] animate-pulse rounded-3xl bg-site-paper"
              />
              <div
                aria-hidden="true"
                className="h-[420px] animate-pulse rounded-3xl bg-site-paper"
              />
            </>
          )}
        </div>
      )}
    </SiteSection>
  )
}

function NewsCard({ news }: { news: PublicContent[] }) {
  return (
    <Reveal
      as="article"
      aria-labelledby="judul-berita"
      className="flex flex-col gap-7 rounded-3xl bg-site-paper p-8 md:p-10"
    >
      <div className="grid gap-1">
        <h3 id="judul-berita" className="font-site-display text-2xl font-bold">
          Berita & pengumuman
        </h3>
        <p className="text-base text-site-muted">Kegiatan, dukacita, dan informasi pelayanan.</p>
      </div>
      {news.length === 0 ? (
        <p className="text-base text-site-muted">Belum ada berita atau pengumuman.</p>
      ) : (
        <ul className="grid gap-6">
          {news.map((item) => (
            <li key={item.id} className="grid gap-1">
              <p className="text-(length:--site-text-xs) font-medium text-site-muted">
                {publishedDate(item.published_at)}
              </p>
              <h4 className="font-site-display text-lg leading-snug font-bold">
                <Link
                  to={`/berita/${item.slug}`}
                  className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring"
                >
                  {item.title}
                </Link>
              </h4>
              {item.summary && (
                <p className="line-clamp-3 text-base text-site-ink/80">{item.summary}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <PillLink to="/berita" tone="outline" size="sm" arrow className="mt-auto self-start">
        Semua berita
      </PillLink>
    </Reveal>
  )
}

function WartaCard({
  warta,
  scope,
}: {
  warta: PublicContent | null
  scope: RefObject<HTMLDivElement | null>
}) {
  const panel = useRef<HTMLDivElement>(null)
  useFloat(panel, 24, -24, scope)
  return (
    <Reveal
      as="article"
      aria-labelledby="judul-warta"
      className="flex flex-col gap-7 rounded-3xl bg-site-night p-8 text-white shadow-site-broad md:p-10 dark:border dark:border-white/10"
    >
      <div className="grid gap-1">
        <h3 id="judul-warta" className="font-site-display text-2xl font-bold">
          Warta Jemaat
        </h3>
        <p className="text-base text-white/75">
          {warta
            ? `Terbit ${publishedDate(warta.published_at)}`
            : 'Warta minggu ini belum diterbitkan.'}
        </p>
      </div>
      {warta && (
        <div ref={panel}>
          <WindowPanel compact title={`${warta.slug}.pdf`}>
            <p className="font-site-display text-lg leading-snug font-bold">{warta.title}</p>
            {warta.summary && (
              <p className="mt-2 line-clamp-3 text-base text-white/75">{warta.summary}</p>
            )}
            {warta.attachment_url && (
              <a
                href={warta.attachment_url}
                download={`${warta.slug}.pdf`}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-site-panel transition-colors outline-none hover:bg-site-paper focus-visible:ring-3 focus-visible:ring-site-accent"
              >
                Unduh PDF
              </a>
            )}
          </WindowPanel>
        </div>
      )}
      <PillLink to="/warta" tone="glass" size="sm" arrow className="mt-auto self-start">
        Arsip warta
      </PillLink>
    </Reveal>
  )
}

// ---------- Layanan jemaat

const SERVICES: { title: string; text: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Warta Jemaat',
    text: 'Warta mingguan lengkap dalam PDF: pengumuman, jadwal pelayan, dan kabar jemaat. Baca langsung atau unduh untuk disimpan.',
    links: [{ to: '/warta', label: 'Buka warta' }],
  },
  {
    title: 'Layanan Sakramen',
    text: 'Daftarkan Baptisan Kudus, Katekisasi/Sidi, atau Pemberkatan Nikah tanpa perlu akun, lalu pantau berkasnya dengan kode registrasi.',
    links: [
      { to: '/layanan-sakramen', label: 'Daftar' },
      { to: '/layanan-sakramen#cek-status', label: 'Lacak status' },
    ],
  },
  {
    title: 'Persembahan',
    text: 'Nomor rekening tiap pos kas dan kode QRIS resmi jemaat, dengan tombol salin.',
    links: [{ to: '/persembahan', label: 'Lihat rekening & QRIS' }],
  },
]

function ServicesBand() {
  return (
    <PhotoBand labelledBy="judul-layanan">
      <Reveal>
        <TwoToneHeading
          id="judul-layanan"
          onDark
          lead="Layanan jemaat."
          accent="Dalam satu tempat."
          className="text-4xl md:text-5xl"
        />
      </Reveal>
      <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
        {SERVICES.map((service, index) => (
          <Reveal
            as="li"
            key={service.title}
            className="flex flex-col rounded-3xl bg-site-night/75 p-8 md:min-h-[340px]"
          >
            <span
              aria-hidden="true"
              className="-mt-3 mb-4 hidden font-site-serif text-[84px] leading-none text-white/30 italic select-none md:block"
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="font-site-display text-2xl font-bold">{service.title}</h3>
            <p className="mt-3 text-base leading-relaxed text-white/80">{service.text}</p>
            <div className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-6">
              {service.links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="rounded-sm text-base font-semibold text-site-accent outline-none hover:underline focus-visible:ring-3 focus-visible:ring-site-accent"
                >
                  {link.label} <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </Reveal>
        ))}
      </ol>
    </PhotoBand>
  )
}

// ---------- Lima rayon

function Rayons({
  rayons,
  error,
  onRetry,
}: {
  rayons: RayonListItem[] | undefined
  error: string | null
  onRetry: () => void
}) {
  return (
    <SiteSection labelledBy="judul-rayon">
      <SectionIntro
        id="judul-rayon"
        lead="Lima rayon,"
        accent="satu jemaat."
        intro="Wilayah pelayanan jemaat di Lasiana beserta koordinatornya."
      />
      <div className="mx-auto mt-14 max-w-[960px]">
        <RayonTable rayons={rayons} error={error} onRetry={onRetry} />
        <div className="mt-14 flex flex-col items-start justify-between gap-4 rounded-3xl bg-site-paper p-6 sm:flex-row sm:items-center md:p-8">
          <p className="grid gap-1">
            <span className="font-site-display text-lg font-bold">Baru di Lahairoi?</span>
            <span className="text-base text-site-muted">
              Kenali sejarah, majelis, dan rayon Anda.
            </span>
          </p>
          <PillLink to="/profil" tone="dark" arrow>
            Profil & sejarah
          </PillLink>
        </div>
      </div>
    </SiteSection>
  )
}

// ---------- Galeri kegiatan

function Gallery() {
  const media = useApiQuery<ApiPage<PublicContent>>('/public/contents', {
    category: 'MEDIA',
    per_page: 3,
  })
  const items = (media.data?.data ?? []).filter((item) => mediaCover(item))
  // Seksi ini disembunyikan bila dokumentasi gagal dimuat atau belum ada.
  if (media.data && items.length === 0) return null
  if (media.error && !media.data) return null

  return (
    <SiteSection tone="paper" labelledBy="judul-galeri">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Reveal>
          <TwoToneHeading id="judul-galeri" lead="Galeri kegiatan." accent="Dokumentasi terbaru." />
        </Reveal>
        <PillLink to="/media" tone="outline" arrow>
          Semua dokumentasi
        </PillLink>
      </div>
      <ul className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {!media.data
          ? Array.from({ length: 3 }, (_, index) => (
              <li
                key={index}
                aria-hidden="true"
                className="aspect-[4/3] animate-pulse rounded-3xl bg-site-rule/60"
              />
            ))
          : items.map((item, index) => (
              <Reveal
                as="li"
                key={item.id}
                className={cn(index === 0 && 'md:col-span-2 lg:col-span-1')}
              >
                <Link
                  to="/media"
                  className="group grid gap-4 rounded-3xl outline-none focus-visible:ring-3 focus-visible:ring-ring"
                >
                  <img
                    src={mediaCover(item) ?? ''}
                    alt={item.summary ?? item.title}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3] w-full rounded-3xl bg-site-rule object-cover"
                  />
                  <span className="grid gap-1 px-1">
                    <span className="text-(length:--site-text-xs) font-medium text-site-muted">
                      {publishedDate(item.published_at)}
                    </span>
                    <span className="font-site-display text-lg leading-snug font-bold group-hover:underline">
                      {item.title}
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
      </ul>
    </SiteSection>
  )
}

// ---------- Persembahan

function Offering({
  home,
  error,
  onRetry,
  rayonCount,
  weekCount,
}: {
  home: PublicHome | undefined
  error: string | null
  onRetry: () => void
  rayonCount: number | undefined
  weekCount: number | undefined
}) {
  const accounts = (home?.payment_info ?? []).filter((item) => item.summary)
  // Hanya angka yang dihitung dari data jemaat.
  const metrics = [
    rayonCount ? { value: rayonCount, label: 'Rayon pelayanan' } : null,
    weekCount ? { value: weekCount, label: 'Ibadah publik dalam 7 hari' } : null,
  ].filter((metric) => metric !== null)

  let body: ReactNode
  if (error && !home) {
    body = <LoadError message="Rekening persembahan tidak dapat dimuat." onRetry={onRetry} onDark />
  } else if (!home) {
    body = (
      <div
        aria-hidden="true"
        className="mx-auto h-14 max-w-[640px] animate-pulse rounded-full bg-white/10"
      />
    )
  } else if (accounts.length === 0) {
    body = (
      <p className="mx-auto max-w-[52ch] text-base text-white/80">
        Rekening dan QRIS persembahan belum diumumkan. Persembahan tetap dapat diserahkan langsung
        saat ibadah.
      </p>
    )
  } else {
    body = (
      <ul className="mx-auto grid max-w-[640px] gap-5 text-left">
        {accounts.map((item) => {
          const { bank, purpose } = splitPaymentTitle(item.title)
          const number = item.summary ?? ''
          return (
            <li key={item.id} className="grid gap-2">
              <p className="pl-5 text-sm text-white/75">
                {purpose ? `${bank} · ${purpose}` : bank}
              </p>
              <CopyBar
                display={number}
                value={accountDigits(number)}
                buttonLabel="Salin No. Rek"
                ariaLabel={`Salin nomor rekening ${bank} ${number}`}
                successTitle={`Nomor rekening ${bank} disalin`}
                successDescription={number}
                errorMessage="Nomor rekening tidak dapat disalin. Salin secara manual."
              />
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <SiteSection labelledBy="judul-persembahan">
      <Reveal className="rounded-[32px] bg-site-panel px-6 py-12 text-center text-white shadow-site-panel dark:border dark:border-white/10 md:p-16">
        {metrics.length > 0 && (
          <ul className="mx-auto mb-12 grid max-w-[640px] gap-8 sm:grid-cols-2">
            {metrics.map((metric) => (
              <li key={metric.label} className="grid justify-items-center gap-2">
                <span className="font-site-display text-5xl font-extrabold tabular-nums md:text-6xl">
                  {metric.value}
                </span>
                <span className="text-sm text-white/70">{metric.label}</span>
              </li>
            ))}
          </ul>
        )}
        <TwoToneHeading
          id="judul-persembahan"
          onDark
          size="card"
          lead="Persembahan kasih."
          accent="Lewat QRIS atau transfer bank."
        />
        <div className="mt-10">{body}</div>
        <div className="mt-10 flex justify-center">
          <PillLink to="/persembahan" tone="light" arrow>
            Lihat rekening & QRIS
          </PillLink>
        </div>
        <p className="mx-auto mt-8 max-w-[58ch] text-sm leading-relaxed text-white/70">
          Simpan bukti transfer Anda dan tuliskan keperluan persembahan pada berita transfer.
          Bendahara Jemaat mencatat setiap persembahan ke pos kas yang dituju.
        </p>
      </Reveal>
    </SiteSection>
  )
}

// ---------- Tanya-jawab

function Questions() {
  return (
    <SiteSection labelledBy="judul-tanya">
      <SectionIntro id="judul-tanya" lead="Pertanyaan seputar" accent="pendaftaran sakramen." />
      <FaqAccordion items={SACRAMENT_FAQ} className="mx-auto mt-12 max-w-[760px] text-left" />
      <div className="mt-10 flex justify-center">
        <PillLink to="/layanan-sakramen" tone="dark" arrow>
          Buka Layanan Sakramen
        </PillLink>
      </div>
    </SiteSection>
  )
}
