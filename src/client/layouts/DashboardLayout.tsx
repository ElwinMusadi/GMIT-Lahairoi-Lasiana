import { Fragment } from 'react'
import { Link, Outlet, useMatches } from 'react-router'
import { AppSidebar } from '@/components/dashboard/app-sidebar'
import { UserMenu } from '@/components/dashboard/user-menu'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { RequireAuth } from '@/components/session-provider'
import type { RouteHandle } from '@/router'

export default function DashboardLayout() {
  return (
    <RequireAuth>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="print:bg-transparent">
          <DashboardTopbar />
          <div className="flex-1 px-4 pt-4 pb-12 sm:px-6 lg:px-8 lg:pt-6 print:p-0">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
      <Toaster position="bottom-right" closeButton />
    </RequireAuth>
  )
}

function DashboardTopbar() {
  const crumbs = useMatches()
    .filter((match) => (match.handle as RouteHandle | undefined)?.title)
    .map((match) => ({ path: match.pathname, title: (match.handle as RouteHandle).title }))

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-4 sm:px-6 lg:px-8 print:hidden">
      <SidebarTrigger className="-ml-1.5 size-9" />
      <Breadcrumb className="ml-1 min-w-0">
        <BreadcrumbList>
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1
            return (
              <Fragment key={crumb.path}>
                {index > 0 && <BreadcrumbSeparator className="hidden sm:block" />}
                <BreadcrumbItem className={isLast ? 'min-w-0' : 'hidden sm:inline-flex'}>
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
      <div className="ml-auto">
        <UserMenu />
      </div>
    </header>
  )
}
