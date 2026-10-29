import { Plus, Search } from 'lucide-react'
import { Link } from 'react-router'
import { DashboardThemeToggle } from '@/components/dashboard/theme-toggle'
import { UserMenu } from '@/components/dashboard/user-menu'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Kbd } from '@/components/zenith/kbd'
import { quickActionsForRole } from '@/lib/navigation'
import { useCurrentUser } from '@/lib/session'

const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)

// Topbar dashboard bergaya Zenith: lengket dan buram, tombol menu (di bawah 1024 px),
// kolom pencarian yang membuka palet Ctrl+K, tombol "Buat" sesuai peran, tema, dan avatar.
export function DashboardTopbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const user = useCurrentUser()
  const actions = quickActionsForRole(user.role)

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur sm:px-6 print:hidden">
      <SidebarTrigger className="-ml-1.5 size-9 lg:hidden" />
      <button
        type="button"
        onClick={onOpenSearch}
        aria-label={`Cari (${MAC ? '⌘K' : 'Ctrl K'})`}
        aria-keyshortcuts={MAC ? 'Meta+K' : 'Control+K'}
        className="flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground shadow-xs transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 max-md:w-9 max-md:justify-center max-md:px-0"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate text-left max-md:hidden">Cari halaman atau jemaat…</span>
        <Kbd className="max-md:hidden">{MAC ? '⌘K' : 'Ctrl K'}</Kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        {actions.length > 0 && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="max-sm:size-9 max-sm:px-0" aria-label="Buat">
                  <Plus aria-hidden="true" />
                  <span className="max-sm:hidden">Buat</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Buat
                </DropdownMenuLabel>
                {actions.map((action) => (
                  <DropdownMenuItem key={action.to} asChild>
                    <Link to={action.to}>
                      <action.icon />
                      {action.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div aria-hidden="true" className="mx-2 h-6 w-px bg-border max-sm:hidden" />
          </>
        )}
        <DashboardThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
