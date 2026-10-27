import { useEffect } from 'react'
import { Globe } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'
import { WellMark } from '@/components/brand/well'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { dashboardPath, modulesForRole } from '@/lib/navigation'
import { useCurrentUser } from '@/lib/session'

export function AppSidebar() {
  const user = useCurrentUser()
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()

  // Sheet navigasi di ponsel/tablet ditutup setiap kali halaman berganti.
  useEffect(() => {
    setOpenMobile(false)
  }, [pathname, setOpenMobile])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="GMIT Jemaat Lahairoi">
              <Link to="/dashboard">
                <span className="flex size-8 shrink-0 items-center justify-center">
                  <WellMark className="size-6 text-brand" />
                </span>
                <span className="grid leading-tight">
                  <span className="font-semibold">Lahairoi</span>
                  <span className="text-xs text-muted-foreground">Sistem Informasi Gereja</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {modulesForRole(user.role).map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const to = dashboardPath(item)
                const isActive = item.path === '' ? pathname === to : pathname.startsWith(to)
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
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
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Lihat portal publik">
              <Link to="/">
                <Globe />
                <span>Lihat portal publik</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
