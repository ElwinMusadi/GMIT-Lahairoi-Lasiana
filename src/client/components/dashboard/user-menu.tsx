import { ChevronsUpDown, Globe, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { ROLE_LABELS, USER_ROLES, type UserRole } from '@shared/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCurrentUser, useSession } from '@/lib/session'

// Warna identitas pucat per orang (bukan data): hue stabil dari nama, tanpa ungu/nila.
const PERSON_HUES = [12, 35, 95, 150, 190, 205]

function personTint(name: string) {
  const hash = [...name].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7)
  const hue = PERSON_HUES[hash % PERSON_HUES.length]
  return { backgroundColor: `hsl(${hue} 55% 90%)`, color: `hsl(${hue} 45% 24%)` }
}

function initials(name: string) {
  const words = name.replace(/^(Pdt|Pnt|Dkn)\.\s*/i, '').split(/\s+/).filter(Boolean)
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase()
}

export function UserMenu() {
  const user = useCurrentUser()
  const { signOut, previewAs } = useSession()
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2.5 px-1.5 sm:pr-2.5">
          <Avatar className="size-8">
            <AvatarFallback style={personTint(user.name)} className="text-xs font-semibold">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 text-left leading-tight sm:grid">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
          </span>
          <ChevronsUpDown className="hidden size-4 text-muted-foreground sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="grid gap-0.5 font-normal">
          <span className="text-sm font-medium text-foreground">{user.name}</span>
          <span className="text-xs text-muted-foreground">
            {ROLE_LABELS[user.role]} · {user.email ?? user.username}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {previewAs && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Pratinjau peran (dev)</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={user.role}
                onValueChange={(role) => previewAs(role as UserRole)}
              >
                {USER_ROLES.map((role) => (
                  <DropdownMenuRadioItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuItem asChild>
          <Link to="/">
            <Globe />
            Lihat portal publik
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            signOut()
            navigate('/login', { replace: true })
          }}
        >
          <LogOut />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
