import { useState, useSyncExternalStore } from 'react'
import { Menu, X } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { WellMark } from '@/components/brand/well'
import { PillLink } from '@/components/portal/kage/pill'
import { PortalNavMenu } from '@/components/portal/nav-menu'
import { ThemeToggle } from '@/components/portal/theme-toggle'
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { activePortalLink, portalNav, type PortalLink } from '@/lib/navigation'
import { cn } from '@/lib/utils'

// Pil kaca bahasa kage: putih tembus pandang di tema terang, gelap di tema gelap; di tema
// Glassmorphism lebih bening dan buram.
const glassPill =
  'inline-flex h-11 flex-none items-center gap-2 rounded-full border border-site-rule bg-site-glass px-4 text-sm font-semibold text-site-ink shadow-sm transition-colors outline-none hover:border-site-ink/40 focus-visible:ring-3 focus-visible:ring-ring glass:glass-bar'

function subscribeScroll(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true })
  return () => window.removeEventListener('scroll', onChange)
}

// Header Portal Publik rancangan kage: pil-pil yang melayang di atas hero (merek,
// navigasi, tema, Masuk Pengurus). Header selalu menempel; begitu halaman digulir, pil
// naik merapat ke tepi atas agar tidak menutupi isi. Di bawah 1024 px navigasi pindah ke
// menu layar penuh.
export function SiteHeader() {
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 8,
    () => false,
  )

  return (
    <header
      data-scrolled={scrolled || undefined}
      className="pointer-events-none fixed inset-x-0 top-0 z-40 px-(--site-inset) pt-(--site-header-top) transition-transform duration-300 ease-out data-scrolled:-translate-y-[calc(var(--site-header-top)_-_12px)] motion-reduce:transition-none"
    >
      <div className="flex items-center justify-between gap-2 *:pointer-events-auto">
        <BrandPill />
        <PortalNavMenu className="hidden lg:block" />
        <div className="flex flex-none items-center gap-2">
          <ThemeToggle />
          <PillLink
            to="/login"
            tone="dark"
            arrow
            aria-label="Masuk Pengurus"
            className="hidden lg:inline-flex"
          >
            Masuk<span className="hidden xl:inline"> Pengurus</span>
          </PillLink>
          <MobileMenu scrolled={scrolled} />
        </div>
      </div>
    </header>
  )
}

// Pil merek ke beranda; dipakai juga di halaman masuk pengurus.
export function BrandPill({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      aria-label="GMIT Lahairoi Tuak Sabu Lasiana: beranda"
      className={glassPill}
    >
      <WellMark className="size-4 text-site-accent" />
      <span className="font-site-display font-bold tracking-tight">GMIT Lahairoi</span>
    </Link>
  )
}

// Menu layar penuh untuk ponsel dan tablet, dikelompokkan seperti navigasi desktop.
function MobileMenu({ scrolled }: { scrolled: boolean }) {
  const [open, setOpen] = useState(false)
  const { pathname, hash } = useLocation()
  const active = activePortalLink(pathname, hash)
  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className={cn(glassPill, 'lg:hidden')}>
          <Menu className="size-4" aria-hidden="true" />
          Menu
        </button>
      </SheetTrigger>
      <SheetContent
        side="top"
        showCloseButton={false}
        aria-describedby={undefined}
        className="gap-0 border-0 bg-site-canvas p-0 text-site-ink shadow-none data-[side=top]:h-svh glass:site-aurora"
      >
        {/* Bilah atas di posisi yang sama dengan header agar menu terasa terbuka di tempat. */}
        <div
          className={cn(
            'flex items-center justify-between gap-3 px-(--site-inset)',
            scrolled ? 'pt-3' : 'pt-(--site-header-top)',
          )}
        >
          <BrandPill onClick={close} />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SheetClose asChild>
              <button type="button" className={glassPill}>
                <X className="size-4" aria-hidden="true" />
                Tutup
              </button>
            </SheetClose>
          </div>
        </div>
        <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
        <nav
          aria-label="Navigasi utama"
          data-lenis-prevent
          className="flex flex-1 flex-col gap-8 overflow-y-auto overscroll-contain px-(--site-inset) pt-8 pb-10"
        >
          <ul className="grid gap-1 sm:grid-cols-2 sm:gap-x-6">
            {portalNav.map(
              (entry) =>
                !('links' in entry) && (
                  <li key={entry.to}>
                    <MenuLink link={entry} active={entry.to === active} onClick={close} />
                  </li>
                ),
            )}
          </ul>
          <div className="grid gap-8 sm:grid-cols-2 sm:gap-x-6">
            {portalNav.map(
              (entry) =>
                'links' in entry && (
                  <div key={entry.title}>
                    <h2 className="px-4 font-site-display text-sm font-bold text-site-muted">
                      {entry.title}
                    </h2>
                    <ul className="mt-2 grid gap-1">
                      {entry.links.map((link) => (
                        <li key={link.to}>
                          <MenuLink link={link} active={link.to === active} onClick={close} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
            )}
          </div>
          <PillLink
            to="/login"
            tone="dark"
            size="lg"
            arrow
            onClick={close}
            className="mt-auto w-full sm:w-auto sm:self-start"
          >
            Masuk Pengurus
          </PillLink>
        </nav>
      </SheetContent>
    </Sheet>
  )
}

function MenuLink({
  link,
  active,
  onClick,
}: {
  link: PortalLink
  active: boolean
  onClick: () => void
}) {
  return (
    <Link
      to={link.to}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'grid gap-0.5 rounded-2xl px-4 py-3 transition-colors outline-none hover:bg-site-paper focus-visible:ring-3 focus-visible:ring-ring',
        active && 'bg-site-paper',
      )}
    >
      <span className="flex items-center gap-2 font-site-display text-lg font-bold">
        {link.title}
        {active && <span aria-hidden="true" className="size-2 rounded-full bg-site-accent" />}
      </span>
      {link.description && (
        <span className="text-sm leading-snug text-site-muted">{link.description}</span>
      )}
    </Link>
  )
}
