import { Outlet } from 'react-router'
import { SiteFooter } from '@/components/portal/site-footer'
import { SiteHeader } from '@/components/portal/site-header'
import { Toaster } from '@/components/ui/sonner'
import { usePortalMotion } from '@/lib/portal-motion'
import { usePortalTheme, usePortalThemeValue } from '@/lib/portal-theme'

export default function PublicLayout() {
  usePortalTheme()
  usePortalMotion()
  const theme = usePortalThemeValue()

  return (
    <div className="flex min-h-svh flex-col bg-site-canvas font-site-body text-site-ink">
      <a
        href="#konten"
        className="sr-only z-50 rounded-full bg-site-ink px-5 py-3 text-sm font-semibold text-site-canvas focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Lewati ke konten
      </a>
      <SiteHeader />
      {/* Header melayang di atas hero. Halaman yang belum punya hero ([data-hero]) diberi
          ruang di atas agar isinya tidak tertutup header. */}
      <main
        id="konten"
        className="flex-1 [&:not(:has([data-hero]))]:pt-[calc(var(--site-inset)_+_68px)]"
      >
        <Outlet />
      </main>
      <SiteFooter />
      {/* Notifikasi portal, mis. nomor rekening tersalin. */}
      <Toaster position="bottom-center" theme={theme} />
    </div>
  )
}
