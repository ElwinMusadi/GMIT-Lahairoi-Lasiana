import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { WellMark, Wordmark } from '@/components/brand/well'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { portalAction, portalLinks } from '@/lib/navigation'
import { cn } from '@/lib/utils'

export const portalButton = 'h-12 rounded-full px-6 text-base font-medium'

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-6 px-4 py-5 sm:px-6 lg:px-8">
      <Wordmark className="rise-in" />

      <nav
        aria-label="Navigasi utama"
        className="rise-in hidden items-center gap-10 [--rise-delay:80ms] lg:flex"
      >
        <ul className="flex items-center gap-8">
          {portalLinks.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className="group/link inline-flex items-center gap-2 py-2 text-step-body underline-offset-8 hover:underline"
              >
                {({ isActive }) => (
                  <>
                    <WellMark
                      className={cn(
                        'size-2.5 text-brand transition-opacity',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span>{link.title}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
        <Button asChild className={portalButton}>
          <Link to={portalAction.to}>{portalAction.title}</Link>
        </Button>
      </nav>

      <MobileMenu />
    </header>
  )
}

function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="rise-in h-11 rounded-full px-4 text-base [--rise-delay:80ms] lg:hidden"
        >
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent
        side="top"
        showCloseButton={false}
        className="gap-0 border-0 bg-background p-0 shadow-none data-[side=top]:h-svh"
      >
        <div className="flex items-center justify-between px-4 py-5 sm:px-6">
          <Wordmark />
          <SheetClose asChild>
            <Button variant="ghost" className="h-11 rounded-full px-4 text-base">
              Tutup
            </Button>
          </SheetClose>
        </div>
        <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
        <nav aria-label="Navigasi utama" className="flex flex-1 flex-col px-4 pt-6 pb-8 sm:px-6">
          <ul className="grid gap-1">
            {portalLinks.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 py-2 text-step-head leading-tight font-medium tracking-[-0.025em]"
                >
                  {({ isActive }) => (
                    <>
                      <WellMark
                        className={cn('size-5 shrink-0 text-brand', isActive ? '' : 'opacity-0')}
                      />
                      {link.title}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-auto grid gap-4">
            <Button asChild className={cn(portalButton, 'w-full')}>
              <Link to={portalAction.to} onClick={() => setOpen(false)}>
                {portalAction.title}
              </Link>
            </Button>
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="py-2 text-center text-step-body text-muted-foreground underline-offset-4 hover:underline"
            >
              Masuk pengurus
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
