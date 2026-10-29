import { Globe, LogOut } from 'lucide-react'
import { Link } from 'react-router'
import { ROLE_LABELS } from '@shared/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/zenith/status-badge'
import { useCurrentUser, useLogout } from '@/lib/session'
import { cn } from '@/lib/utils'

// Warna identitas pucat per orang (bukan data): hue stabil dari nama, tanpa ungu/nila.
const PERSON_HUES = [12, 35, 95, 150, 190, 205]

function personTint(name: string) {
  const hash = [...name].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7)
  const hue = PERSON_HUES[hash % PERSON_HUES.length]
  return { backgroundColor: `hsl(${hue} 55% 90%)`, color: `hsl(${hue} 45% 24%)` }
}

function initials(name: string) {
  const words = name
    .replace(/^(Pdt|Pnt|Dkn)\.\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase()
}

// Avatar inisial pengurus yang sedang masuk (topbar dan kartu pengguna di sidebar).
export function UserAvatar({ className }: { className?: string }) {
  const user = useCurrentUser()
  return (
    <Avatar className={cn('size-8', className)}>
      <AvatarFallback style={personTint(user.name)} className="text-xs font-semibold">
        {initials(user.name)}
      </AvatarFallback>
    </Avatar>
  )
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
