import { Fragment, useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useMatches } from 'react-router'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { CommandPalette } from '@/components/dashboard/command-palette'
import { DashboardTopbar } from '@/components/dashboard/topbar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { RequireAuth } from '@/components/session-provider'
import { useDashboardTheme, useDashboardThemeValue } from '@/lib/dashboard-theme'
import type { RouteHandle } from '@/router'

// Status sidebar (lebar/ciut ke ikon) diingat di perangkat ini.
const SIDEBAR_KEY = 'gmit-lahairoi:sidebar'

function readSidebarOpen() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== 'collapsed'
  } catch {
    return true
  }
}

function saveSidebarOpen(open: boolean) {
  try {
    if (open) localStorage.removeItem(SIDEBAR_KEY)
    else localStorage.setItem(SIDEBAR_KEY, 'collapsed')
  } catch {
    // Pilihan tetap berlaku sampai halaman dimuat ulang.
  }
}

// Kerangka dashboard pengurus bergaya Zenith (docs/rencana-redesign-dashboard-zenith.md):
// sidebar berkelompok, topbar dengan pencarian Ctrl+K, dan tema terang/gelap.
export default function DashboardLayout() {
  useDashboardTheme()
  const theme = useDashboardThemeValue()
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <RequireAuth>
      <SidebarProvider
        open={sidebarOpen}
        onOpenChange={(open) => {
          setSidebarOpen(open)
          saveSidebarOpen(open)
        }}
      >
        <AppSidebar />
        <SidebarInset className="print:bg-transparent">
          <DashboardTopbar onOpenSearch={() => setSearchOpen(true)} />
          <div className="flex-1 px-4 pt-4 pb-12 sm:px-6 lg:px-8 lg:pt-6 print:p-0">
            <DashboardBreadcrumb />
            <Outlet />
          </div>
        </SidebarInset>
        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      </SidebarProvider>
      <Toaster position="bottom-right" closeButton theme={theme} />
    </RequireAuth>
  )
}

// Breadcrumb kecil di atas judul halaman (Zenith: "Dashboard › Orders"). Tidak tampil di
// Ringkasan, karena halaman itu sendiri adalah Dashboard.
function DashboardBreadcrumb() {
  const { pathname } = useLocation()
  const crumbs = useMatches()
    .filter((match) => (match.handle as RouteHandle | undefined)?.title)
    .map((match) => ({ path: match.pathname, title: (match.handle as RouteHandle).title }))
  if (pathname.replace(/\/$/, '') === '/dashboard' || crumbs.length < 2) return null

  return (
    <Breadcrumb className="mb-3 print:hidden">
      <BreadcrumbList className="text-xs">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <Fragment key={crumb.path}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem className={isLast ? 'min-w-0' : undefined}>
                {isLast ? (
                  <BreadcrumbPage className="truncate">{crumb.title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.path}>{crumb.title}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
