import { Outlet } from 'react-router'
import { SiteFooter } from '@/components/portal/site-footer'
import { SiteHeader } from '@/components/portal/site-header'
import { Toaster } from '@/components/ui/sonner'
import { usePortalMotion } from '@/lib/portal-motion'
import { usePortalTheme } from '@/lib/portal-theme'

export default function PublicLayout() {
  usePortalTheme()
  usePortalMotion()

  return (
    <div className="flex min-h-svh flex-col bg-portal-surface text-portal-ink">
      <a
        href="#konten"
        className="sr-only z-50 rounded-lg bg-portal-navy px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Lewati ke konten
      </a>
      <SiteHeader />
      <main id="konten" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      {/* Notifikasi portal, mis. nomor rekening tersalin. */}
      <Toaster position="bottom-center" />
    </div>
  )
}
