import { EllipsisVertical, Eye, History, House, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import type { MemberWithFamily } from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { MemberActions } from './use-member-actions'

// Menu baris anggota jemaat. Ubah untuk Admin dan Majelis; riwayat dan hapus khusus Admin.
export function MemberMenu({
  member,
  actions,
  showFamilyLink = true,
}: {
  member: MemberWithFamily
  actions: MemberActions
  showFamilyLink?: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-10 sm:size-8">
          <EllipsisVertical />
          <span className="sr-only">Tindakan untuk {member.full_name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => actions.view(member)}>
          <Eye />
          Lihat profil
        </DropdownMenuItem>
        {actions.canEdit && (
          <DropdownMenuItem onSelect={() => actions.edit(member)}>
            <Pencil />
            Ubah profil
          </DropdownMenuItem>
        )}
        {showFamilyLink && (
          <DropdownMenuItem asChild>
            <Link to={`/dashboard/families/${member.family_id}`}>
              <House />
              Buka Kartu Keluarga
            </Link>
          </DropdownMenuItem>
        )}
        {actions.isAdmin && (
          <>
            <DropdownMenuItem asChild>
              <Link to={`/dashboard/audit-logs?entity_type=members&entity_id=${member.id}`}>
                <History />
                Riwayat perubahan
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => actions.remove(member)}>
              <Trash2 />
              Hapus data
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
