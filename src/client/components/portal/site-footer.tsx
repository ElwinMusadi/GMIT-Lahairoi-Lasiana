import { Link } from 'react-router'
import { BuiltWell } from '@/components/brand/well'
import { Button } from '@/components/ui/button'
import { portalAction, portalLinks } from '@/lib/navigation'

const footerColumns = [
  { title: 'Portal', links: portalLinks.slice(0, 3) },
  {
    title: 'Jemaat',
    links: [portalLinks[3], { title: 'Lima rayon', to: '/tentang#rayon' }, portalAction],
  },
  { title: 'Pengurus', links: [{ title: 'Masuk pengurus', to: '/login' }] },
] as const

const YEAR = new Date().getFullYear()

export function SiteFooter() {
  return (
    <footer className="bg-field text-field-foreground">
      <div className="px-4 pt-16 pb-8 sm:px-6 lg:px-8 lg:pt-24">
        {/* Tanda membentang selebar konten: "Lahairoi" di Roundo selebar ±3,55em, jadi
            ukuran hurufnya = (lebar konten − cincin − celah) / 3,6 dalam unit container. */}
        <div className="@container scroll-rise" aria-hidden="true">
          <div className="flex items-end justify-between [--ring:min(26cqw,34svh)] lg:[--ring:34svh]">
            <BuiltWell className="size-(--ring) shrink-0 text-brand" />
            <span className="pb-[0.04em] text-[calc((100cqw-var(--ring)-3cqw)/3.6)] leading-[0.75] font-medium tracking-[-0.045em]">
              Lahairoi
            </span>
          </div>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-12">
          <nav
            aria-label="Tautan footer"
            className="scroll-rise grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8"
          >
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h2 className="text-step-body font-semibold">{column.title}</h2>
                <ul className="mt-3 grid gap-2">
                  {column.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-step-body underline-offset-4 hover:underline"
                      >
                        {link.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <address className="scroll-rise grid content-start gap-1 text-step-body not-italic lg:col-span-4">
            <span className="font-semibold">GMIT Jemaat Lahairoi Tuak Sabu</span>
            <span>Lasiana, Kota Kupang</span>
            <span>Nusa Tenggara Timur</span>
          </address>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4">
          <p className="text-step-body">
            © {YEAR} GMIT Jemaat Lahairoi Tuak Sabu Lasiana
          </p>
          <Button
            type="button"
            className="h-11 rounded-full bg-field-foreground px-5 text-base text-field hover:bg-field-foreground/85"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Kembali ke atas
          </Button>
        </div>
      </div>
    </footer>
  )
}
