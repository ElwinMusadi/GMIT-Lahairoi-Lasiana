import { Globe, LogOut } from 'lucide-react'
import { Link } from 'react-router'
import { ROLE_LABELS } from '@shared/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PersonAvatar } from '@/components/zenith/person-avatar'
import { StatusBadge } from '@/components/zenith/status-badge'
import { useCurrentUser, useLogout } from '@/lib/session'

// Avatar inisial pengurus yang sedang masuk (topbar dan kartu pengguna di sidebar).
export function UserAvatar({ className }: { className?: string }) {
  const user = useCurrentUser()
  return <PersonAvatar name={user.name} className={className} />
}

// Menu pengguna di topbar (gaya Zenith: hanya avatar); nama dan peran ada di dalamnya.
export function UserMenu() {
  const user = useCurrentUser()
  const logout = useLogout()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Menu pengguna: ${user.name}`}
        className="ml-1 grid place-items-center rounded-full ring-offset-2 ring-offset-background outline-none hover:ring-2 hover:ring-border focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <UserAvatar />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="grid gap-1 font-normal">
          <span className="text-sm font-medium text-foreground">{user.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {user.email ?? user.username}
          </span>
          <StatusBadge className="mt-1 w-fit">{ROLE_LABELS[user.role]}</StatusBadge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/">
            <Globe />
            Lihat portal publik
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={logout}>
          <LogOut />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
