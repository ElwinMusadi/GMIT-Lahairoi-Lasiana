import { useRef, type ReactNode } from 'react'
import { CHURCH_PHOTO } from '@/lib/portal'
import { useBackgroundParallax } from '@/lib/portal-motion'

// Band selebar layar di atas foto rancangan kage: foto di-pan setinggi aslinya (±340 px)
// di belakang scrim 60 %, isinya kartu tembus pandang.
export function PhotoBand({ labelledBy, children }: { labelledBy: string; children: ReactNode }) {
  const photo = useRef<HTMLImageElement>(null)
  useBackgroundParallax(photo, 340)

  return (
    <section
      aria-labelledby={labelledBy}
      className="relative isolate overflow-hidden bg-site-night px-6 py-24 text-white md:py-[100px]"
    >
      <img
        ref={photo}
        data-parallax-bg
        src={CHURCH_PHOTO.src}
        srcSet={CHURCH_PHOTO.srcSet}
        sizes={CHURCH_PHOTO.sizes}
        alt=""
        loading="lazy"
        decoding="async"
        className="-z-10"
      />
      <div aria-hidden="true" className="site-band-scrim absolute inset-0 -z-10" />
      <div className="mx-auto flex max-w-[1180px] flex-col justify-center md:min-h-[560px]">
        {children}
      </div>
    </section>
  )
}
