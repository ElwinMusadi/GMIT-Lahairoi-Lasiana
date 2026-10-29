import { useRef, type ReactNode } from 'react'
import { CHURCH_PHOTO } from '@/lib/portal'
import { useHeroParallax } from '@/lib/portal-motion'
import { cn } from '@/lib/utils'

// Panel hero rancangan kage: panel membulat 24 px berjarak 12–16 px dari tepi layar,
// foto di belakang scrim gelap, dan header yang melayang di atasnya. Saat hero digulir
// keluar, foto turun dan membesar sedangkan `display` turun dan memudar (manifest).
// Elemen pembungkus memasang `data-hero`, sehingga PublicLayout tidak lagi memberi ruang
// atas untuk header.

type Photo = { src: string; srcSet?: string; sizes?: string; position?: string }

type Props = {
  // full: hero Beranda setinggi ±92 % layar. page: hero ringkas halaman dalam. compact:
  // setinggi isinya saja, untuk halaman alat seperti kalender Jadwal Ibadah.
  size?: 'full' | 'page' | 'compact'
  labelledBy: string
  // null: panel gelap tanpa foto, mis. selama foto halaman masih ditentukan.
  photo?: Photo | null
  // Bagian yang ikut turun dan memudar saat digulir (judul besar).
  display: ReactNode
  // Isi lain di bawahnya (pengantar, aksi, saringan); tidak ikut memudar.
  children?: ReactNode
  className?: string
}

export function HeroPanel({
  size = 'page',
  labelledBy,
  photo = CHURCH_PHOTO,
  display,
  children,
  className,
}: Props) {
  const hero = useRef<HTMLElement>(null)
  const media = useRef<HTMLDivElement>(null)
  const copy = useRef<HTMLDivElement>(null)
  useHeroParallax(hero, media, copy)

  return (
    <div data-hero className="p-(--site-hero-gap)">
      <section
        ref={hero}
        aria-labelledby={labelledBy}
        className={cn(
          'site-hero-pad relative isolate flex flex-col overflow-hidden rounded-3xl bg-site-night text-white shadow-site-panel',
          // Dibagi --site-zoom: tinggi di layar tetap sama saat portal di-zoom 90%.
          size === 'full'
            ? 'min-h-[calc(min(92svh,880px)/var(--site-zoom,1))]'
            : size === 'page' && 'min-h-[calc(min(48svh,440px)/var(--site-zoom,1))]',
          className,
        )}
      >
        <div ref={media} aria-hidden="true" className="absolute inset-0 -z-10 scale-[1.02]">
          {photo && (
            <img
              src={photo.src}
              srcSet={photo.srcSet}
              sizes={photo.sizes}
              alt=""
              fetchPriority="high"
              decoding="async"
              className="size-full object-cover"
              style={{ objectPosition: photo.position ?? 'center 0%' }}
            />
          )}
          <div className="site-hero-scrim absolute inset-0" />
        </div>
        {size !== 'page' ? (
          // Beranda dan halaman alat: isi sejajar dengan pil header, selebar panel.
          <>
            <div ref={copy}>{display}</div>
            {children}
          </>
        ) : (
          // Halaman dalam: isi hero sejajar dengan kolom isi (1180 px) di bawahnya.
          <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col">
            <div ref={copy}>{display}</div>
            {children}
          </div>
        )}
      </section>
    </div>
  )
}
