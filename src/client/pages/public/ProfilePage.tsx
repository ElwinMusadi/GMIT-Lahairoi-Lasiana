import { useEffect, useRef, type ReactNode } from 'react'
import { Download } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import type { ApiList, ApiPage, PublicContent, RayonListItem } from '@shared/types'
import { HeroPanel } from '@/components/portal/kage/hero-panel'
import { PillLink } from '@/components/portal/kage/pill'
import { RayonTable } from '@/components/portal/kage/rayon-table'
import { Reveal } from '@/components/portal/kage/reveal'
import { LoadError, SiteSection } from '@/components/portal/kage/site-section'
import { TwoToneHeading } from '@/components/portal/kage/two-tone-heading'
import { initials, paragraphs, parseRoster, profileSlot, type ProfileSlot } from '@/lib/portal'
import { isPdf } from '@/lib/upload'
import { useApiQuery } from '@/lib/use-api-query'
import { cn } from '@/lib/utils'

// Profil & Sejarah jemaat (PRD: sejarah, visi misi, 5 rayon pelayanan, Pendeta dan
// Majelis periode berjalan). Isinya dari konten Profil di CMS (/dashboard/contents, tab
// Profil) dan daftar rayon. Konten Profil masuk ke bagiannya menurut judul: "Sejarah",
// "Visi"/"Misi", atau "Majelis"/"Pendeta"; lainnya tampil di bagian akhir.

const SECTIONS = [
  ['#sejarah', 'Sejarah'],
  ['#visi-misi', 'Visi & Misi'],
  ['#rayon', '5 Rayon Pelayanan'],
  ['#majelis', 'Pendeta & Majelis'],
] as const

export default function ProfilePage() {
  const profile = useApiQuery<ApiPage<PublicContent>>('/public/contents', {
    category: 'PROFILE',
    with_body: 'true',
    per_page: 50,
  })
  const rayons = useApiQuery<ApiList<RayonListItem>>('/rayons')

  const contents = profile.data?.data ?? []
  const bySlot = (slot: ProfileSlot) => contents.filter((item) => profileSlot(item) === slot)
  const loading = !profile.data && !profile.error

  // Datang dari halaman lain lewat /profil#rayon: ScrollRestoration sudah melompat ke
  // jangkar sebelum isi di atasnya dimuat, lalu posisinya bergeser saat isi tiba. Begitu
  // semua data siap, lompat sekali lagi. Hanya sekali, agar jangkar yang diklik di halaman
  // ini tetap meluncur halus lewat Lenis.
  const { hash } = useLocation()
  const ready = Boolean(profile.data || profile.error) && Boolean(rayons.data || rayons.error)
  const settled = useRef(false)
  useEffect(() => {
    if (!ready || settled.current) return
    settled.current = true
    if (!hash) return
    const jump = () => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
    requestAnimationFrame(jump)
    // Font web yang selesai dimuat sesudahnya ikut mengubah tinggi isi di atas jangkar
    // (cache kosong: jangkar meleset ±30 px). Lompat sekali lagi setelah semua font siap,
    // kecuali pengunjung sudah mulai menggulir atau berpindah jangkar.
    let moved = false
    const stop = () => {
      moved = true
    }
    const events = ['wheel', 'touchstart', 'keydown'] as const
    events.forEach((name) => window.addEventListener(name, stop, { once: true, passive: true }))
    void document.fonts.ready.then(() => {
      if (!moved) requestAnimationFrame(jump)
    })
    return () => {
      moved = true
      events.forEach((name) => window.removeEventListener(name, stop))
    }
  }, [ready, hash])

  const history = bySlot('history')
  const vision = bySlot('vision')
  const leaders = bySlot('leaders')
  const other = bySlot('other')

  return (
    <>
      <HeroPanel
        labelledBy="judul-profil"
        display={
          <div className="grid max-w-[760px] gap-5">
            <TwoToneHeading
              as="h1"
              id="judul-profil"
              size="page"
              onDark
              lead="Profil & Sejarah"
              accent="Jemaat Lahairoi."
            />
            <p className="max-w-[60ch] text-base leading-relaxed text-white/85 md:text-lg">
              Perjalanan jemaat, visi dan misi pelayanan, lima rayon di Lasiana, serta Pendeta dan
              Majelis Jemaat periode berjalan.
            </p>
          </div>
        }
      >
        <nav aria-label="Bagian halaman" className="mt-auto flex flex-wrap gap-2 pt-10">
          {SECTIONS.map(([href, label]) => (
            <Link
              key={href}
              to={href}
              className="inline-flex h-11 items-center rounded-full bg-white/[0.12] px-4 text-sm font-semibold text-white transition-colors outline-none hover:bg-white/20 focus-visible:ring-3 focus-visible:ring-site-accent"
            >
              {label}
            </Link>
          ))}
        </nav>
      </HeroPanel>

      {profile.error && !profile.data && (
        <SiteSection className="pt-12 pb-0 lg:pt-16 lg:pb-0">
          <LoadError message="Profil jemaat tidak dapat dimuat." onRetry={profile.reload} />
        </SiteSection>
      )}

      <SiteSection id="sejarah" labelledBy="judul-sejarah">
        <SlotHeading id="judul-sejarah" lead={singleTitle(history) ?? 'Sejarah Jemaat Lahairoi'} />
        <div className="mt-12">
          {loading ? (
            <Skeleton className="h-80" />
          ) : history.length === 0 ? (
            <Empty>Sejarah jemaat sedang disusun pengurus.</Empty>
          ) : (
            <div className="grid gap-16">
              {history.map((item) => (
                <ArticleBlock key={item.id} item={item} showTitle={history.length > 1} />
              ))}
            </div>
          )}
        </div>
      </SiteSection>

      <SiteSection id="visi-misi" tone="paper" labelledBy="judul-visi">
        <SlotHeading id="judul-visi" lead={singleTitle(vision) ?? 'Visi & Misi'} />
        <div className="mt-12">
          {loading ? (
            <Skeleton className="h-64" />
          ) : vision.length === 0 ? (
            <Empty>Visi dan misi jemaat sedang disusun pengurus.</Empty>
          ) : (
            <div className={cn('grid gap-6', vision.length > 1 && 'md:grid-cols-2')}>
              {vision.map((item, index) => (
                <VisionCard
                  key={item.id}
                  item={item}
                  showTitle={vision.length > 1}
                  dark={vision.length > 1 && index % 2 === 1}
                />
              ))}
            </div>
          )}
        </div>
      </SiteSection>

      <SiteSection id="rayon" labelledBy="judul-rayon">
        <SlotHeading
          id="judul-rayon"
          lead="Lima rayon"
          accent="pelayanan."
          intro="Setiap keluarga jemaat tergabung dalam satu rayon, tempat ibadah rumah tangga dan pelayanan majelis berlangsung."
        />
        <div className="mt-12 max-w-[960px]">
          <RayonTable rayons={rayons.data?.data} error={rayons.error} onRetry={rayons.reload} />
        </div>
      </SiteSection>

      <SiteSection id="majelis" tone="paper" labelledBy="judul-majelis">
        <SlotHeading id="judul-majelis" lead="Pendeta & Majelis" accent="periode berjalan." />
        <div className="mt-12">
          {loading ? (
            <Skeleton className="h-48" />
          ) : leaders.length === 0 ? (
            <Empty>Daftar Pendeta dan Majelis Jemaat sedang disusun pengurus.</Empty>
          ) : (
            <div className="grid gap-16">
              {leaders.map((item) => (
                <Roster key={item.id} content={item} />
              ))}
            </div>
          )}
        </div>
      </SiteSection>

      {other.length > 0 && (
        <SiteSection labelledBy="judul-lainnya">
          <SlotHeading id="judul-lainnya" lead="Informasi lainnya" />
          <div className="mt-12 grid gap-16">
            {other.map((item) => (
              <ArticleBlock key={item.id} item={item} showTitle />
            ))}
          </div>
        </SiteSection>
      )}
    </>
  )
}

// Satu konten di bagiannya: judul kontennya menjadi judul bagian, bukan judul kedua.
function singleTitle(items: PublicContent[]) {
  return items.length === 1 ? items[0].title : null
}

function SlotHeading({
  id,
  lead,
  accent,
  intro,
}: {
  id: string
  lead: string
  accent?: string
  intro?: string
}) {
  return (
    <div className="grid max-w-[760px] gap-6">
      <Reveal>
        <TwoToneHeading id={id} lead={lead} accent={accent} />
      </Reveal>
      {intro && <p className="max-w-[60ch] text-lg leading-relaxed text-site-ink/80">{intro}</p>}
    </div>
  )
}

function Skeleton({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-3xl bg-site-rule/60', className)}
    />
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-lg text-site-muted">{children}</p>
}

// Lampiran konten Profil (perbaikan 08: sebelumnya diambil tetapi tidak ditampilkan).
function Attachment({ item, onDark = false }: { item: PublicContent; onDark?: boolean }) {
  if (!item.attachment_url) return null
  return (
    <PillLink
      to={item.attachment_url}
      target="_blank"
      rel="noreferrer"
      tone={onDark ? 'glass' : 'outline'}
      className="w-fit"
    >
      <Download aria-hidden="true" />
      {isPdf(item.attachment_url) ? 'Buka lampiran PDF' : 'Buka lampiran'}
    </PillLink>
  )
}

// Tulisan editorial dua kolom: teks di kiri, foto besar di kanan.
function ArticleBlock({ item, showTitle }: { item: PublicContent; showTitle: boolean }) {
  const photo = item.thumbnail_url
  return (
    <article
      aria-label={showTitle ? undefined : item.title}
      className={cn('grid gap-10', photo && 'lg:grid-cols-12 lg:gap-14')}
    >
      <div className={cn('grid content-start gap-6', photo && 'lg:col-span-7')}>
        {showTitle && (
          <h3 className="font-site-display text-2xl leading-snug font-bold md:text-[28px]">
            {item.title}
          </h3>
        )}
        {item.summary && (
          <p className="max-w-[60ch] text-xl leading-relaxed font-medium">{item.summary}</p>
        )}
        <div className="grid max-w-[65ch] gap-5 text-lg leading-relaxed">
          {paragraphs(item.content_body).map((paragraph, index) => (
            <p key={index} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>
        <Attachment item={item} />
      </div>
      {photo && (
        <Reveal className="lg:col-span-5">
          <img
            src={photo}
            alt={item.summary ?? item.title}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full rounded-3xl object-cover lg:aspect-[4/5]"
          />
        </Reveal>
      )}
    </article>
  )
}

// Visi dan Misi: kartu terang dan gelap berdampingan (motif kartu kage).
function VisionCard({
  item,
  showTitle,
  dark,
}: {
  item: PublicContent
  showTitle: boolean
  dark: boolean
}) {
  return (
    <Reveal
      as="article"
      aria-label={showTitle ? undefined : item.title}
      className={cn(
        'grid content-start gap-5 rounded-3xl p-8 md:p-10',
        dark
          ? 'bg-site-night text-white shadow-site-broad dark:border dark:border-white/10 glass:glass-panel'
          : 'bg-site-canvas glass:glass-card',
      )}
    >
      {showTitle && (
        <h3 className="font-site-display text-2xl leading-snug font-bold md:text-[28px]">
          {item.title}
        </h3>
      )}
      {item.summary && <p className="text-xl leading-relaxed font-medium">{item.summary}</p>}
      <div
        className={cn(
          'grid max-w-[65ch] gap-4 text-lg leading-relaxed',
          dark ? 'text-white/85' : 'text-site-ink/90',
        )}
      >
        {paragraphs(item.content_body).map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
      <Attachment item={item} onDark={dark} />
    </Reveal>
  )
}

// Konten "Pendeta & Majelis": satu baris per orang ("Jabatan: Nama") menjadi kisi orang
// dengan inisial; orang pertama (biasanya Ketua Majelis) ditonjolkan gelap.
function Roster({ content }: { content: PublicContent }) {
  const { entries, notes } = parseRoster(content.content_body)
  return (
    <div className="grid gap-10">
      {content.thumbnail_url && (
        <Reveal as="figure" className="grid gap-3">
          <img
            src={content.thumbnail_url}
            alt={content.summary ?? content.title}
            loading="lazy"
            decoding="async"
            className="max-h-[32rem] w-full rounded-3xl object-cover"
          />
          {content.summary && (
            <figcaption className="text-base text-site-muted">{content.summary}</figcaption>
          )}
        </Reveal>
      )}
      {entries.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry, index) => (
            <Reveal
              as="li"
              key={`${entry.name}-${index}`}
              className="flex h-full items-center gap-4 rounded-2xl bg-site-canvas p-4 glass:glass-card"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-12 flex-none items-center justify-center rounded-full font-site-display text-base font-bold',
                  index === 0 ? 'bg-site-ink text-site-canvas' : 'bg-site-paper text-site-ink',
                )}
              >
                {initials(entry.name)}
              </span>
              <span className="grid min-w-0">
                <span className="font-site-display text-base font-bold">{entry.name}</span>
                <span className="text-sm text-site-muted">{entry.role}</span>
              </span>
            </Reveal>
          ))}
        </ul>
      )}
      {notes.length > 0 && (
        <div className="grid max-w-[65ch] gap-2 text-base text-site-ink/80">
          {notes.map((note, index) => (
            <p key={index}>{note}</p>
          ))}
        </div>
      )}
    </div>
  )
}
