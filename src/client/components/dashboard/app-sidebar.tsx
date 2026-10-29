import { useEffect, useId, useState } from 'react'
import { ChevronDown, ChevronLeft, Globe, LogOut } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'
import { ROLE_LABELS } from '@shared/types'
import { WellMark } from '@/components/brand/well'
import { UserAvatar } from '@/components/dashboard/user-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { dashboardPath, modulesForRole, type ModuleGroup } from '@/lib/navigation'
import { useCurrentUser, useLogout } from '@/lib/session'
import { cn } from '@/lib/utils'

// Sidebar dashboard bergaya Zenith: merek di kotak gelap, grup berlabel kecil yang bisa
// dilipat, kartu pengguna di bawah, dan tombol ciut di tepi. Saat diciutkan hanya ikon
// yang tampil (dengan tooltip); di bawah 1024 px sidebar menjadi sheet.
export function AppSidebar() {
  const user = useCurrentUser()
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()
  const logout = useLogout()

  // Sheet navigasi di ponsel/tablet ditutup setiap kali halaman berganti.
  useEffect(() => {
    setOpenMobile(false)
  }, [pathname, setOpenMobile])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="GMIT Jemaat Lahairoi">
              <Link to="/dashboard">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <WellMark className="size-4" />
                </span>
                <span className="grid leading-tight">
                  <span className="font-semibold">Lahairoi</span>
                  <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                    Sistem gereja
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0 py-2">
        {modulesForRole(user.role).map((group) => (
          <NavGroup key={group.label} group={group} pathname={pathname} />
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-1 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Lihat portal publik" className="h-9">
              <Link to="/">
                <Globe />
                <span>Lihat portal publik</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-2.5 rounded-lg p-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
          <UserAvatar className="shrink-0" />
          <span className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
          </span>
          <button
            type="button"
            onClick={logout}
            aria-label="Keluar"
            title="Keluar"
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:hidden"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </div>
      </SidebarFooter>
      <CollapseButton />
      <SidebarRail />
    </Sidebar>
  )
}

// Satu grup menu: label kecil kapital yang melipat isinya. Saat sidebar diciutkan label
// diganti garis pemisah dan isinya selalu tampil.
function NavGroup({ group, pathname }: { group: ModuleGroup; pathname: string }) {
  const [open, setOpen] = useState(true)
  const listId = useId()
  const { state, isMobile } = useSidebar()
  const rail = state === 'collapsed' && !isMobile

  return (
    <SidebarGroup className="py-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-7 w-full items-center justify-between rounded-md px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:hidden"
      >
        {group.label}
        <ChevronDown
          className={cn('size-3.5 transition-transform', !open && '-rotate-90')}
          aria-hidden="true"
        />
      </button>
      <div
        aria-hidden="true"
        className="mx-2 mb-1 hidden border-t border-sidebar-border group-data-[collapsible=icon]:block"
      />
      <SidebarMenu id={listId} hidden={!open && !rail}>
        {group.items.map((item) => {
          const to = dashboardPath(item)
          const isActive = item.path === '' ? pathname === to : pathname.startsWith(to)
          return (
            <SidebarMenuItem key={to}>
              <SidebarMenuButton asChild isActive={isActive} tooltip={item.title} className="h-9">
                <NavLink to={to} end={item.path === ''}>
                  <item.icon />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

// Tombol bulat di tepi sidebar (Zenith/HRIS) untuk menciutkan ke ikon; hanya di desktop.
function CollapseButton() {
  const { state, toggleSidebar } = useSidebar()
  const collapsed = state === 'collapsed'
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={collapsed ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
      title={collapsed ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
      className="absolute top-[3.25rem] -right-3 z-20 hidden size-6 place-items-center rounded-full border border-sidebar-border bg-background text-muted-foreground shadow-xs transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 lg:grid print:hidden"
    >
      <ChevronLeft
        className={cn('size-3.5 transition-transform', collapsed && 'rotate-180')}
        aria-hidden="true"
      />
    </button>
  )
}
