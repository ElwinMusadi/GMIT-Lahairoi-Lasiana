import { useRef } from 'react'
import { MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { WellMark } from '@/components/brand/well'
import { portalNavLinks } from '@/lib/navigation'
import { CHURCH_PHOTO } from '@/lib/portal'
import { useBackgroundParallax } from '@/lib/portal-motion'

const YEAR = new Date().getFullYear()

const title = (to: string) => portalNavLinks.find((link) => link.to === to)?.title ?? to

// Kolom tautan footer: kesembilan halaman portal, jangkar yang sering dicari, dan
// tautan pengurus. Kontak baru ditambahkan bila pengurus memberikan datanya.
const COLUMNS = [
  { title: 'Jemaat', links: ['/', '/jadwal', '/warta', '/renungan', '/berita', '/media'] },
  {
    title: 'Pelayanan',
    links: ['/layanan-sakramen', '/layanan-sakramen#cek-status', '/persembahan'],
  },
  { title: 'Gereja', links: ['/profil', '/profil#rayon', '/profil#majelis', '/login'] },
].map((column) => ({
  title: column.title,
  links: column.links.map((to) => ({
    to,
    title: to === '/login' ? 'Masuk Pengurus' : title(to),
  })),
}))

// Footer Portal Publik rancangan kage: foto gedung gereja di belakang scrim teal gelap,
// bergeser pelan mengikuti gulir (±420 px), dengan tepi gerigi di atasnya. Di tema
// Glassmorphism footer menjadi panel membulat yang berjarak dari tepi, menutup halaman
// seperti panel hero membukanya.
export function SiteFooter() {
  const photo = useRef<HTMLImageElement>(null)
  useBackgroundParallax(photo, 420)

  return (
    <footer className="relative mt-24 overflow-hidden bg-site-night text-white glass:mx-(--site-hero-gap) glass:mb-(--site-hero-gap) glass:rounded-3xl">
      <img
        ref={photo}
        data-parallax-bg
        src={CHURCH_PHOTO.src}
        srcSet={CHURCH_PHOTO.srcSet}
        sizes={CHURCH_PHOTO.sizes}
        alt=""
        loading="lazy"
        decoding="async"
      />
      <div aria-hidden="true" className="site-footer-scrim absolute inset-0" />
      <div
        aria-hidden="true"
        className="site-sawtooth absolute inset-x-0 top-0 h-4 bg-site-canvas glass:hidden"
      />

      <div className="relative mx-auto flex min-h-[520px] max-w-[1180px] flex-col justify-between gap-16 px-6 pt-24 pb-10">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="grid content-start justify-items-start gap-5 lg:col-span-5">
            <p className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 font-site-display text-sm font-bold tracking-tight text-site-panel shadow-sm">
              <WellMark className="size-4 text-site-accent" />
              GMIT Lahairoi Tuak Sabu
            </p>
            <p className="max-w-[40ch] text-base leading-relaxed text-white/90">
              Gereja Masehi Injili di Timor, Jemaat Lahairoi Tuak Sabu. Bersekutu, bersaksi, dan
              melayani bersama jemaat di lima rayon pelayanan Lasiana.
            </p>
            <p className="flex items-start gap-2 text-sm text-white/85">
              <MapPin className="mt-0.5 size-4 flex-none" aria-hidden="true" />
              Lasiana, Kota Kupang, Nusa Tenggara Timur
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-7 lg:justify-items-end">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={`Tautan ${column.title.toLowerCase()}`}>
                <h2 className="font-site-display text-sm font-bold">{column.title}</h2>
                <ul className="mt-3 grid gap-0.5 text-sm text-white/85">
                  {column.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="inline-block rounded-sm py-1.5 transition-colors outline-none hover:text-white focus-visible:text-white focus-visible:ring-2 focus-visible:ring-site-accent"
                      >
                        {link.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 text-(length:--site-text-xs) text-white/70 sm:flex-row sm:justify-between">
          <p>© {YEAR} Majelis Jemaat GMIT Lahairoi Tuak Sabu Lasiana</p>
          <p>Waktu di portal ini dalam WITA (UTC+8)</p>
        </div>
      </div>
    </footer>
  )
}
