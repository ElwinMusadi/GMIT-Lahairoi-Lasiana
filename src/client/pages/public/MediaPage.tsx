import { useRef, useState, type ReactNode } from 'react'
import { ExternalLink, Images, Play, X } from 'lucide-react'
import type { ApiPage, PublicContent } from '@shared/types'
import { HeroPanel } from '@/components/portal/kage/hero-panel'
import { SitePager } from '@/components/portal/kage/list-controls'
import { PillButton, PillLink } from '@/components/portal/kage/pill'
import { Reveal } from '@/components/portal/kage/reveal'
import { LoadError, SiteSection } from '@/components/portal/kage/site-section'
import { TwoToneHeading } from '@/components/portal/kage/two-tone-heading'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { CHURCH_PHOTO, mediaCover, paragraphs, publishedDate, youTubeId } from '@/lib/portal'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const PER_PAGE = 24

// Galeri Media (PRD: galeri foto dan tautan video dokumentasi kegiatan). Setiap konten
// Media di CMS berisi foto (folder media) dan/atau tautan video; video YouTube diputar
// langsung di jendela galeri, tautan lain dibuka di tab baru.
export default function MediaPage() {
  const { params, update } = useUrlFilters()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const media = useApiQuery<ApiPage<PublicContent>>('/public/contents', {
    category: 'MEDIA',
    with_body: 'true',
    page,
    per_page: PER_PAGE,
  })
  const [open, setOpen] = useState<PublicContent | null>(null)
  // Ubin yang membuka jendela galeri, untuk mengembalikan fokus saat jendela ditutup.
  const opener = useRef<HTMLButtonElement | null>(null)
  const items = media.data?.data ?? []

  // Hero berlatar foto dokumentasi terbaru; foto gereja bila belum ada atau gagal dimuat.
  // Selama memuat panel tetap gelap, agar foto gereja tidak sempat tampil lalu berganti.
  const latestPhoto = items.find((item) => item.thumbnail_url)?.thumbnail_url
  const heroPhoto = latestPhoto
    ? { src: latestPhoto, position: 'center' }
    : media.data || media.error
      ? CHURCH_PHOTO
      : null

  let body: ReactNode
  if (media.error && !media.data) {
    body = <LoadError message="Galeri tidak dapat dimuat." onRetry={media.reload} />
  } else if (!media.data) {
    body = (
      <div aria-hidden="true" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="aspect-[4/3] animate-pulse rounded-[20px] bg-site-paper" />
        ))}
      </div>
    )
  } else if (items.length === 0) {
    body = <p className="text-lg text-site-muted">Belum ada foto atau video dokumentasi.</p>
  } else {
    body = (
      <div
        aria-busy={media.loading}
        className={cn('grid gap-10 transition-opacity', media.loading && 'opacity-60')}
      >
        <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Reveal as="li" key={item.id}>
              <MediaTile
                item={item}
                onOpen={(button) => {
                  opener.current = button
                  setOpen(item)
                }}
              />
            </Reveal>
          ))}
        </ul>
        <SitePager
          page={page}
          perPage={PER_PAGE}
          total={media.data.meta.total}
          noun="dokumentasi"
          onPage={(next) => update({ page: String(next) })}
        />
      </div>
    )
  }

  return (
    <>
      <HeroPanel
        labelledBy="judul-media"
        photo={heroPhoto}
        display={
          <div className="grid max-w-[760px] gap-5">
            <TwoToneHeading
              as="h1"
              id="judul-media"
              size="page"
              onDark
              lead="Galeri Kegiatan"
              accent="foto dan video."
            />
            <p className="max-w-[60ch] text-base leading-relaxed text-white/85 md:text-lg">
              Foto dan video dokumentasi ibadah, hari raya gerejawi, dan kegiatan pelayanan jemaat.
            </p>
          </div>
        }
      />
      <SiteSection className="pt-12 lg:pt-16">{body}</SiteSection>
      <MediaViewer
        item={open}
        onClose={() => setOpen(null)}
        returnFocus={() => opener.current?.focus({ preventScroll: true })}
      />
    </>
  )
}

function MediaTile({
  item,
  onOpen,
}: {
  item: PublicContent
  onOpen: (button: HTMLButtonElement) => void
}) {
  const cover = mediaCover(item)
  const hasVideo = Boolean(item.attachment_url)
  return (
    <button
      type="button"
      onClick={(event) => onOpen(event.currentTarget)}
      className="group grid w-full gap-4 rounded-[20px] text-left outline-none focus-visible:ring-3 focus-visible:ring-ring"
    >
      <span className="relative block aspect-[4/3] overflow-hidden rounded-[20px] bg-site-paper">
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
          />
        ) : (
          <Images
            className="absolute top-1/2 left-1/2 size-10 -translate-1/2 text-site-muted"
            aria-hidden="true"
          />
        )}
        {hasVideo && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-site-night/75 px-3 py-1.5 text-(length:--site-text-xs) font-semibold text-white">
            <Play className="size-3.5 fill-current" aria-hidden="true" />
            Video
          </span>
        )}
      </span>
      <span className="grid gap-1 px-1">
        <span className="font-site-display text-lg leading-snug font-bold group-hover:underline">
          {item.title}
        </span>
        <span className="text-sm font-medium text-site-muted">
          {publishedDate(item.published_at)}
        </span>
        {item.summary && (
          <span className="line-clamp-2 text-base text-site-ink/80">{item.summary}</span>
        )}
      </span>
    </button>
  )
}

// Jendela galeri bergaya panel jendela kage: bilah atas (tanggal, Tutup) tetap terlihat
// saat isinya digulir. Isi dialog digulir sendiri, bukan oleh Lenis.
// Jendela dibuka dari state, bukan DialogTrigger, sehingga Radix tidak tahu ke mana fokus
// dikembalikan; `returnFocus` mengembalikannya ke ubin pembuka.
function MediaViewer({
  item,
  onClose,
  returnFocus,
}: {
  item: PublicContent | null
  onClose: () => void
  returnFocus: () => void
}) {
  const video = youTubeId(item?.attachment_url)
  return (
    <Dialog open={item !== null} onOpenChange={(value) => !value && onClose()}>
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocus()
        }}
        data-lenis-prevent
        className="max-h-[calc((100svh_-_2rem)/var(--site-zoom,1))] gap-0 overflow-y-auto overscroll-contain rounded-3xl bg-site-panel p-0 text-white ring-0 sm:max-w-4xl dark:ring-1 dark:ring-white/10"
      >
        {item && (
          <>
            <div className="sticky top-0 z-10 flex items-center gap-3 bg-site-panel/95 px-4 py-3 md:px-5">
              <span aria-hidden="true" className="flex flex-none items-center gap-1.5">
                {[0, 1, 2].map((dot) => (
                  <span key={dot} className="size-3 rounded-full bg-white/20" />
                ))}
              </span>
              <span className="w-0 flex-1 truncate text-center font-site-mono text-(length:--site-text-xs) text-white/70">
                dokumentasi — {publishedDate(item.published_at)}
              </span>
              <DialogClose asChild>
                <PillButton tone="glass" size="sm">
                  <X aria-hidden="true" />
                  Tutup
                </PillButton>
              </DialogClose>
            </div>
            {video ? (
              <div className="aspect-video w-full bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${video}`}
                  title={item.title}
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="size-full border-0"
                />
              </div>
            ) : (
              item.thumbnail_url && (
                <img
                  src={item.thumbnail_url}
                  alt={item.summary ?? item.title}
                  className="max-h-[calc(70svh/var(--site-zoom,1))] w-full bg-black object-contain"
                />
              )
            )}
            <div className="grid gap-4 p-6 md:p-8">
              <DialogTitle className="font-site-display text-2xl leading-tight font-bold md:text-[28px]">
                {item.title}
              </DialogTitle>
              <DialogDescription className={item.summary ? 'text-base text-white/80' : 'sr-only'}>
                {item.summary ?? 'Dokumentasi kegiatan jemaat'}
              </DialogDescription>
              {video && item.thumbnail_url && (
                <img
                  src={item.thumbnail_url}
                  alt=""
                  className="max-h-72 w-full rounded-2xl object-cover"
                />
              )}
              {paragraphs(item.content_body).map((paragraph, index) => (
                <p key={index} className="max-w-[65ch] text-base whitespace-pre-line text-white/90">
                  {paragraph}
                </p>
              ))}
              {item.attachment_url && !video && (
                <PillLink
                  to={item.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  tone="light"
                  className="w-fit"
                >
                  <Play aria-hidden="true" />
                  Tonton video
                  <ExternalLink aria-hidden="true" />
                </PillLink>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
