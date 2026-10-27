import { Outlet } from 'react-router'
import { SiteFooter } from '@/components/portal/site-footer'
import { SiteHeader } from '@/components/portal/site-header'
import { usePortalTheme } from '@/lib/portal-theme'

export default function PublicLayout() {
  usePortalTheme()

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#konten"
        className="sr-only z-50 rounded-full bg-foreground px-4 py-2 text-background focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Lewati ke konten
      </a>
      <SiteHeader />
      <main id="konten" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
