import { useState } from 'react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SkeletonRows, TableCard, TableMessage } from '@/components/zenith/data-table'
import { PageHeader } from '@/components/zenith/page-header'
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
      <PageHeader
        title="Rayon"
        description={
          rayons.data ? (
            <span className="tabular-nums">
              {rows.length} rayon pelayanan · {totalFamilies.toLocaleString('id-ID')} KK ·{' '}
              {totalMembers.toLocaleString('id-ID')} jiwa aktif
            </span>
          ) : (
            <span className="inline-block h-4 w-64 max-w-full animate-pulse rounded-md bg-muted align-middle" />
          )
        }
        actions={
          <Button size="lg" onClick={() => setForm({})}>
            <Plus data-icon="inline-start" />
            Tambah rayon
          </Button>
        }
      />

      <TableCard aria-label="Rayon pelayanan">
        <Table className="table-fixed">
          <caption className="sr-only">Rayon pelayanan</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {/* Di ponsel kolom angka dipersempit agar keterangan rayon tidak terjepit. */}
              <TableHead>Rayon</TableHead>
              <TableHead className="w-14 text-right sm:w-24">KK</TableHead>
              <TableHead className="w-16 text-right sm:w-28">
                Jiwa<span className="max-sm:sr-only"> aktif</span>
              </TableHead>
              <TableHead className="w-12 sm:w-14">
                <span className="sr-only">Tindakan</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rayons.error && !rayons.data && (
              <TableMessage colSpan={4}>
                Data rayon tidak dapat dimuat: {rayons.error}{' '}
                <button type="button" onClick={rayons.reload} className="font-medium underline">
                  Coba lagi
                </button>
              </TableMessage>
            )}
            {!rayons.data && !rayons.error && (
              <SkeletonRows rows={5} avatar={false} cells={['', '', '', '']} />
            )}
            {rows.map((rayon) => (
              <RayonRow
                key={rayon.id}
                rayon={rayon}
                share={totalMembers > 0 ? (rayon.member_count ?? 0) / totalMembers : 0}
                onEdit={() => setForm({ rayon })}
                onDelete={() => confirmDelete(rayon)}
              />
            ))}
          </TableBody>
        </Table>
      </TableCard>

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
  share,
  onEdit,
  onDelete,
}: {
  rayon: RayonListItem
  // Porsi jiwa aktif rayon ini dari seluruh jemaat (0–1), untuk garis porsi di bawah nama.
  share: number
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
    <TableRow>
      <TableCell className="py-2.5">
        <Link
          to={`/dashboard/families?rayon_id=${rayon.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {rayon.name}
        </Link>
        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground lg:truncate">{details}</p>
        {/* Porsi jiwa: garis tipis abu-abu, tanpa lintasan (sama dengan saldo per Pos Kas). */}
        <div aria-hidden="true" className="mt-1.5 h-0.5 max-w-64">
          {share > 0 && (
            <div className="h-0.5 rounded-full bg-chart-2" style={{ width: `${share * 100}%` }} />
          )}
        </div>
      </TableCell>
      <TableCell
        className={cn('text-right tabular-nums', families === 0 && 'text-muted-foreground')}
      >
        {families.toLocaleString('id-ID')}
      </TableCell>
      <TableCell
        className={cn('text-right tabular-nums', members === 0 && 'text-muted-foreground')}
      >
        {members.toLocaleString('id-ID')}
      </TableCell>
      <TableCell className="py-1.5 pr-2 pl-0 text-right">
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
      </TableCell>
    </TableRow>
  )
}
