import { MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { WellMark } from '@/components/brand/well'
import { portalLinks } from '@/lib/navigation'

const YEAR = new Date().getFullYear()

// Footer Portal Publik (rancangan design/stitch/08): identitas jemaat, tautan portal,
// dan tautan pengurus. Hanya data yang benar; kontak ditambahkan bila sudah tersedia.
export function SiteFooter() {
  return (
    <footer className="mt-10 bg-white shadow-[0_-1px_8px_rgba(0,0,0,0.03)]">
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="grid gap-8 md:grid-cols-12">
          <div className="grid content-start gap-3 md:col-span-6">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-portal-navy text-white">
                <WellMark className="size-4" />
              </span>
              <span className="font-portal-heading text-xl font-semibold text-portal-navy">
                GMIT Lahairoi Tuak Sabu
              </span>
            </div>
            <p className="max-w-prose text-sm text-portal-muted">
              Gereja Masehi Injili di Timor, Jemaat Lahairoi Tuak Sabu. Bersekutu, bersaksi, dan
              melayani bersama jemaat di lima rayon pelayanan Lasiana.
            </p>
            <p className="flex items-start gap-1.5 text-xs text-portal-muted">
              <MapPin className="mt-0.5 size-3.5 flex-none" aria-hidden="true" />
              Lasiana, Kota Kupang, Nusa Tenggara Timur
            </p>
          </div>
          <nav aria-label="Tautan portal" className="grid content-start gap-3 md:col-span-3">
            <h2 className="text-sm font-semibold tracking-wider text-portal-navy uppercase">
              Portal
            </h2>
            <ul className="grid gap-2 text-sm text-portal-muted">
              {portalLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-portal-navy hover:underline">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Tautan jemaat" className="grid content-start gap-3 md:col-span-3">
            <h2 className="text-sm font-semibold tracking-wider text-portal-navy uppercase">
              Jemaat
            </h2>
            <ul className="grid gap-2 text-sm text-portal-muted">
              <li>
                <Link to="/profil#rayon" className="hover:text-portal-navy hover:underline">
                  Lima rayon pelayanan
                </Link>
              </li>
              <li>
                <Link to="/profil#majelis" className="hover:text-portal-navy hover:underline">
                  Pendeta & Majelis
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-portal-navy hover:underline">
                  Masuk pengurus
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-2 rounded-xl bg-portal-low p-4 text-xs text-portal-muted sm:flex-row">
          <p>© {YEAR} Majelis Jemaat GMIT Lahairoi Tuak Sabu Lasiana</p>
          <p>Waktu di portal ini dalam WITA (UTC+8)</p>
        </div>
      </div>
    </footer>
  )
}
