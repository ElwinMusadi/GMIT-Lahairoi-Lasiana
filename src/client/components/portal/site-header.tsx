import { useState } from 'react'
import { LayoutDashboard, Menu, X } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { WellMark } from '@/components/brand/well'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { portalLinks } from '@/lib/navigation'
import { cn } from '@/lib/utils'

// Tombol besar membulat, dipakai halaman masuk pengurus.
export const portalButton = 'h-12 rounded-full px-6 text-base font-medium'

// Header Portal Publik (rancangan design/stitch/08): putih tembus pandang, menempel di
// atas, tautan berbentuk pil dalam satu wadah. Di bawah xl menjadi menu lembar.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white/95 shadow-[0_1px_8px_rgba(0,0,0,0.06)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 lg:px-8">
        <Brand />
        <nav
          aria-label="Navigasi utama"
          className="hidden items-center gap-1 rounded-xl bg-portal-low p-1 xl:flex"
        >
          {portalLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-portal-indigo text-white'
                    : 'text-portal-muted hover:bg-portal-high hover:text-portal-ink',
                )
              }
            >
              {link.short}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-none items-center gap-2">
          <Link
            to="/login"
            className="hidden items-center gap-1.5 rounded-lg bg-portal-high px-4 py-2 text-xs font-semibold text-portal-ink transition-colors hover:bg-portal-highest md:inline-flex"
          >
            <LayoutDashboard className="size-4" aria-hidden="true" />
            Masuk Pengurus
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}

function Brand() {
  return (
    <Link
      to="/"
      aria-label="GMIT Lahairoi Tuak Sabu Lasiana: beranda"
      className="flex min-w-0 items-center gap-3 rounded-lg outline-offset-4"
    >
      <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-portal-navy text-white">
        <WellMark className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-portal-heading text-lg leading-tight font-semibold tracking-tight text-portal-navy sm:text-xl">
          GMIT Lahairoi Tuak Sabu
        </span>
        <span className="truncate text-xs font-medium text-portal-muted">
          Portal Informasi Jemaat
          <span className="hidden sm:inline"> · Lasiana, Kupang</span>
        </span>
      </span>
    </Link>
  )
}

function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="h-11 gap-2 rounded-lg px-3 text-sm font-semibold text-portal-navy xl:hidden"
        >
          <Menu className="size-5" aria-hidden="true" />
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent
        side="top"
        showCloseButton={false}
        className="gap-0 border-0 bg-portal-surface p-0 shadow-none data-[side=top]:h-svh"
      >
        <div className="flex h-16 items-center justify-between gap-4 bg-white px-4 shadow-[0_1px_8px_rgba(0,0,0,0.06)] sm:h-20">
          <Brand />
          <SheetClose asChild>
            <Button
              variant="ghost"
              className="h-11 gap-2 rounded-lg px-3 text-sm font-semibold text-portal-navy"
            >
              <X className="size-5" aria-hidden="true" />
              Tutup
            </Button>
          </SheetClose>
        </div>
        <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
        <nav aria-label="Navigasi utama" className="flex flex-1 flex-col gap-6 px-4 pt-6 pb-8">
          <ul className="grid gap-1.5">
            {portalLinks.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex rounded-xl px-4 py-3 font-portal-heading text-lg font-semibold',
                      isActive
                        ? 'bg-portal-indigo text-white'
                        : 'bg-white text-portal-navy hover:bg-portal-high',
                    )
                  }
                >
                  {link.title}
                </NavLink>
              </li>
            ))}
          </ul>
          <Link
            to="/login"
            onClick={() => setOpen(false)}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-portal-high px-4 py-3 text-sm font-semibold text-portal-ink"
          >
            <LayoutDashboard className="size-4" aria-hidden="true" />
            Masuk Pengurus
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
