import { useState } from 'react'
import { ExternalLink, Images, Play } from 'lucide-react'
import type { ApiPage, PublicContent } from '@shared/types'
import { EmptyNote, PageIntro, Pager, PortalSection } from '@/components/portal/parts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { paragraphs, publishedDate, youTubeId } from '@/lib/portal'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'

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
  const items = media.data?.data ?? []

  return (
    <>
      <PageIntro
        id="judul-media"
        eyebrow="Media & dokumentasi"
        title="Galeri Kegiatan"
        lead="Foto dan video dokumentasi ibadah, hari raya gerejawi, dan kegiatan pelayanan jemaat."
      />
      <PortalSection labelledBy="judul-media">
        {media.error && !media.data ? (
          <EmptyNote>
            Galeri tidak dapat dimuat.{' '}
            <button
              type="button"
              onClick={media.reload}
              className="font-semibold text-portal-navy underline"
            >
              Coba lagi
            </button>
          </EmptyNote>
        ) : !media.data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="aspect-[4/3] rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyNote>Belum ada foto atau video dokumentasi.</EmptyNote>
        ) : (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <li key={item.id}>
                  <MediaTile item={item} onOpen={() => setOpen(item)} />
                </li>
              ))}
            </ul>
            <Pager
              page={page}
              perPage={PER_PAGE}
              total={media.data.meta.total}
              noun="dokumentasi"
              onPage={(next) => update({ page: String(next) })}
            />
          </>
        )}
      </PortalSection>
      <MediaViewer item={open} onClose={() => setOpen(null)} />
    </>
  )
}

// Gambar sampul: foto yang diunggah, atau gambar pratinjau YouTube untuk video saja.
function coverOf(item: PublicContent) {
  if (item.thumbnail_url) return item.thumbnail_url
  const video = youTubeId(item.attachment_url)
  return video ? `https://i.ytimg.com/vi/${video}/hqdefault.jpg` : null
}

function MediaTile({ item, onOpen }: { item: PublicContent; onOpen: () => void }) {
  const cover = coverOf(item)
  const hasVideo = Boolean(item.attachment_url)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group grid w-full overflow-hidden rounded-xl bg-white text-left shadow-sm transition-shadow outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-portal-blue-light"
    >
      <span className="relative block aspect-[4/3] overflow-hidden bg-portal-mid">
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <Images
            className="absolute top-1/2 left-1/2 size-10 -translate-1/2 text-portal-navy"
            aria-hidden="true"
          />
        )}
        {hasVideo && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-portal-navy/90 px-2.5 py-1 text-xs font-bold text-white">
            <Play className="size-3.5 fill-current" aria-hidden="true" />
            Video
          </span>
        )}
      </span>
      <span className="grid gap-0.5 p-4">
        <span className="text-xs font-semibold text-portal-amber">
          {publishedDate(item.published_at)}
        </span>
        <span className="font-portal-heading text-lg leading-6 font-semibold text-portal-navy">
          {item.title}
        </span>
        {item.summary && (
          <span className="line-clamp-2 text-sm text-portal-muted">{item.summary}</span>
        )}
      </span>
    </button>
  )
}

function MediaViewer({ item, onClose }: { item: PublicContent | null; onClose: () => void }) {
  const video = youTubeId(item?.attachment_url)
  return (
    <Dialog open={item !== null} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-4 overflow-y-auto bg-white p-0 sm:max-w-4xl">
        {item && (
          <>
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
                  className="max-h-[70svh] w-full bg-portal-ink object-contain"
                />
              )
            )}
            <div className="grid gap-3 px-6 pb-6">
              <DialogHeader className="gap-1 text-left">
                <span className="text-xs font-semibold text-portal-amber">
                  {publishedDate(item.published_at)}
                </span>
                <DialogTitle className="font-portal-heading text-2xl font-bold text-portal-navy">
                  {item.title}
                </DialogTitle>
                <DialogDescription className={item.summary ? 'text-portal-muted' : 'sr-only'}>
                  {item.summary ?? 'Dokumentasi kegiatan jemaat'}
                </DialogDescription>
              </DialogHeader>
              {video && item.thumbnail_url && (
                <img
                  src={item.thumbnail_url}
                  alt=""
                  className="max-h-72 w-full rounded-lg object-cover"
                />
              )}
              {paragraphs(item.content_body).map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line text-portal-ink">
                  {paragraph}
                </p>
              ))}
              {item.attachment_url && !video && (
                <a
                  href={item.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-portal-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-portal-indigo"
                >
                  <Play className="size-4" aria-hidden="true" />
                  Tonton video
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
