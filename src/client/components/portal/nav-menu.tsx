import { ChevronDown } from 'lucide-react'
import { NavigationMenu as Nav } from 'radix-ui'
import { Link, useLocation } from 'react-router'
import { activePortalLink, portalNav } from '@/lib/navigation'
import { cn } from '@/lib/utils'

// Pil navigasi desktop rancangan kage. Menu induk bersubmenu memakai Radix
// NavigationMenu: terbuka saat kursor diarahkan (dengan jeda tutup agar kursor sempat
// pindah ke panel), saat fokus keyboard, dan saat diketuk; Esc menutup dan panah
// kiri/kanan berpindah menu induk.

const item =
  'inline-flex h-[34px] items-center gap-1 rounded-full px-2.5 text-sm font-medium text-site-ink transition-colors outline-none hover:bg-site-paper focus-visible:ring-3 focus-visible:ring-ring data-open:bg-site-paper'
// Menu induk yang memuat halaman yang sedang dibuka.
const current = 'bg-site-ink text-site-canvas hover:bg-site-ink data-open:bg-site-ink'

export function PortalNavMenu({ className }: { className?: string }) {
  const { pathname, hash } = useLocation()
  const active = activePortalLink(pathname, hash)
  const lastIndex = portalNav.length - 1

  return (
    <Nav.Root
      aria-label="Navigasi utama"
      delayDuration={120}
      className={cn(
        'relative h-11 flex-none rounded-full border border-site-rule bg-site-glass p-1 shadow-sm backdrop-blur-md',
        className,
      )}
    >
      <Nav.List className="flex items-center">
        {portalNav.map((entry, index) => {
          if (!('links' in entry)) {
            return (
              <Nav.Item key={entry.to}>
                <Nav.Link asChild active={entry.to === active}>
                  <Link to={entry.to} className={cn(item, entry.to === active && current)}>
                    {entry.title}
                  </Link>
                </Nav.Link>
              </Nav.Item>
            )
          }
          const holdsActive = entry.links.some((link) => link.to === active)
          return (
            <Nav.Item key={entry.title} className="relative">
              <Nav.Trigger
                aria-current={holdsActive ? 'true' : undefined}
                className={cn('group', item, holdsActive && current)}
              >
                {entry.title}
                <ChevronDown
                  aria-hidden="true"
                  className="size-3.5 transition-transform duration-200 group-data-open:rotate-180"
                />
              </Nav.Trigger>
              <Nav.Content
                className={cn(
                  'absolute top-full mt-2.5 w-80 rounded-2xl border border-site-rule bg-site-canvas p-2 text-site-ink shadow-site-broad duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
                  // Panel menu terakhir dirapatkan ke kanan agar tidak keluar layar.
                  index === lastIndex ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
                )}
              >
                <ul className="grid gap-0.5">
                  {entry.links.map((link) => (
                    <li key={link.to}>
                      <Nav.Link asChild active={link.to === active}>
                        <Link
                          to={link.to}
                          className="group/link grid gap-0.5 rounded-xl px-3.5 py-3 transition-colors outline-none hover:bg-site-paper focus-visible:bg-site-paper focus-visible:ring-3 focus-visible:ring-ring data-active:bg-site-paper"
                        >
                          <span className="flex items-center gap-2 font-site-display text-[15px] font-bold">
                            {link.title}
                            <span
                              aria-hidden="true"
                              className="hidden size-1.5 rounded-full bg-site-accent group-data-active/link:block"
                            />
                          </span>
                          <span className="text-sm leading-snug text-site-muted">
                            {link.description}
                          </span>
                        </Link>
                      </Nav.Link>
                    </li>
                  ))}
                </ul>
              </Nav.Content>
            </Nav.Item>
          )
        })}
      </Nav.List>
    </Nav.Root>
  )
}
