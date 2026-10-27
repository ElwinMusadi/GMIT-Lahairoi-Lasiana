import { useState, type ReactNode } from 'react'
import { EllipsisVertical, House, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import type { ApiList, RayonListItem, RayonResponse } from '@shared/types'
import { RayonFormDialog } from '@/components/congregation/rayon-form-dialog'
import { ConfirmDialog, type Confirmation } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { useApiQuery } from '@/lib/use-api-query'
import { cn } from '@/lib/utils'

// Rayon pelayanan (khusus Admin): lima rayon bawaan dan rayon tambahan, dengan jumlah
// KK dan jiwa aktif masing-masing.
export default function RayonsPage() {
  const rayons = useApiQuery<ApiList<RayonListItem>>('/rayons')
  const [form, setForm] = useState<{ rayon?: RayonListItem } | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  const rows = rayons.data?.data ?? []
  const totalFamilies = rows.reduce((sum, rayon) => sum + (rayon.family_count ?? 0), 0)
  const totalMembers = rows.reduce((sum, rayon) => sum + (rayon.member_count ?? 0), 0)

  function handleSaved(result: RayonResponse, created: boolean) {
    setForm(null)
    rayons.reload()
    toast.success(
      created ? `Rayon ${result.rayon.name} ditambahkan.` : `Rayon ${result.rayon.name} disimpan.`,
    )
  }

  function confirmDelete(rayon: RayonListItem) {
    setConfirmation({
      title: `Hapus Rayon ${rayon.name}?`,
      description:
        'Rayon ini belum dipakai KK mana pun. Bila masih dipakai akun Majelis, jadwal ibadah, atau peminjaman aset, penghapusan akan ditolak.',
      confirmLabel: 'Hapus rayon',
      destructive: true,
      onConfirm: async () => {
        await api.delete(`/rayons/${rayon.id}`)
        rayons.reload()
        toast.success(`Rayon ${rayon.name} dihapus.`)
      },
    })
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Rayon</h1>
          {rayons.data ? (
            <p className="text-sm text-muted-foreground tabular-nums">
              {rows.length} rayon pelayanan · {totalFamilies.toLocaleString('id-ID')} KK ·{' '}
              {totalMembers.toLocaleString('id-ID')} jiwa aktif
            </p>
          ) : (
            <Skeleton className="h-5 w-64" />
          )}
        </div>
        <Button size="lg" onClick={() => setForm({})}>
          <Plus data-icon="inline-start" />
          Tambah rayon
        </Button>
      </header>

      <div className="rounded-lg border bg-card">
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">Rayon pelayanan</caption>
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="h-10 pr-4 pl-4 font-normal">
                Rayon
              </th>
              <th scope="col" className="w-20 pr-4 text-right font-normal sm:w-24">
                KK
              </th>
              <th scope="col" className="w-20 pr-4 text-right font-normal sm:w-28">
                Jiwa aktif
              </th>
              <th scope="col" className="w-14 pr-2">
                <span className="sr-only">Tindakan</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rayons.error && !rayons.data && (
              <MessageRow>
                Data rayon tidak dapat dimuat: {rayons.error}{' '}
                <button type="button" onClick={rayons.reload} className="font-medium underline">
                  Coba lagi
                </button>
              </MessageRow>
            )}
            {!rayons.data &&
              !rayons.error &&
              Array.from({ length: 5 }, (_, index) => <SkeletonRow key={index} />)}
            {rows.map((rayon) => (
              <RayonRow
                key={rayon.id}
                rayon={rayon}
                onEdit={() => setForm({ rayon })}
                onDelete={() => confirmDelete(rayon)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <RayonFormDialog
        open={form !== null}
        onOpenChange={(open) => !open && setForm(null)}
        rayon={form?.rayon}
        onSaved={handleSaved}
      />
      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  )
}

function RayonRow({
  rayon,
  onEdit,
  onDelete,
}: {
  rayon: RayonListItem
  onEdit: () => void
  onDelete: () => void
}) {
  const families = rayon.family_count ?? 0
  const members = rayon.member_count ?? 0
  const details = [
    rayon.coordinator_name ? `Koordinator ${rayon.coordinator_name}` : 'Koordinator belum diisi',
    rayon.description,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <tr className="border-t border-rule align-top">
      <td className="py-3 pr-4 pl-4">
        <Link
          to={`/dashboard/families?rayon_id=${rayon.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {rayon.name}
        </Link>
        <p className="mt-0.5 truncate text-[0.8125rem] text-muted-foreground">{details}</p>
      </td>
      <td
        className={cn(
          'py-3 pr-4 text-right tabular-nums',
          families === 0 && 'text-muted-foreground',
        )}
      >
        {families.toLocaleString('id-ID')}
      </td>
      <td
        className={cn(
          'py-3 pr-4 text-right tabular-nums',
          members === 0 && 'text-muted-foreground',
        )}
      >
        {members.toLocaleString('id-ID')}
      </td>
      <td className="py-2 pr-2 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-10 sm:size-8">
              <EllipsisVertical />
              <span className="sr-only">Tindakan untuk Rayon {rayon.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil />
              Ubah rayon
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/dashboard/families?rayon_id=${rayon.id}`}>
                <House />
                Lihat KK di rayon ini
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/dashboard/members?rayon_id=${rayon.id}`}>
                <Users />
                Lihat jemaat di rayon ini
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {families > 0 ? (
              <DropdownMenuItem disabled className="items-start">
                <Trash2 className="mt-0.5" />
                <span className="grid">
                  Hapus rayon
                  <span className="text-xs text-muted-foreground">
                    Masih berisi {families.toLocaleString('id-ID')} KK
                  </span>
                </span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 />
                Hapus rayon
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}

function MessageRow({ children }: { children: ReactNode }) {
  return (
    <tr className="border-t border-rule">
      <td colSpan={4} className="px-4 py-6 text-muted-foreground">
        {children}
      </td>
    </tr>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-t border-rule" aria-hidden="true">
      <td className="py-3 pr-4 pl-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="mt-1.5 h-4 w-48" />
      </td>
      <td className="py-3 pr-4">
        <Skeleton className="ml-auto h-5 w-8" />
      </td>
      <td className="py-3 pr-4">
        <Skeleton className="ml-auto h-5 w-10" />
      </td>
      <td />
    </tr>
  )
}
