import type { ReactNode } from 'react'
import { ArrowUpRight, EllipsisVertical, History, Pencil, Trash2, Wrench } from 'lucide-react'
import { ASSET_CONDITION_LABELS, type Asset, type AssetCondition } from '@shared/types'
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
import { SkeletonRows, TableMessage } from '@/components/zenith/data-table'
import { StatusBadge, type StatusTone } from '@/components/zenith/status-badge'
import { unlendableReason } from '@/lib/assets'
import { cn } from '@/lib/utils'

type Props = {
  // undefined: data pertama belum dimuat (baris kerangka).
  items: Asset[] | undefined
  loading: boolean
  // Pesan galat atau daftar kosong, menggantikan baris data.
  message?: ReactNode
  canDelete: boolean
  onEdit: (asset: Asset) => void
  onLend: (asset: Asset) => void
  onHistory: (asset: Asset) => void
  onDelete: (asset: Asset) => void
}

const COLUMNS = 6
// Kolom yang tampil untuk kerangka baris, sama dengan kepala tabel.
const SKELETON_CELLS = [
  'hidden sm:table-cell',
  '',
  'hidden xl:table-cell',
  'hidden md:table-cell',
  '',
  '',
]

// Hanya kondisi yang perlu perhatian yang berlencana: rusak ringan kuning, rusak berat merah,
// dalam perbaikan nada "sedang diproses" Zenith. Baik cukup teks biasa, agar pengecualian
// menonjol di katalog yang sebagian besar baik.
const CONDITION_TONES: Record<Exclude<AssetCondition, 'GOOD'>, StatusTone> = {
  MINOR_DAMAGE: 'warning',
  MAJOR_DAMAGE: 'danger',
  MAINTENANCE: 'info',
}

// Katalog inventaris. Di layar sempit kode, kategori, lokasi, dan kondisi pindah ke
// baris kedua nama barang; sisa unit tersedia selalu tampil di kanan.
export function AssetTable({ items, loading, message, canDelete, ...actions }: Props) {
  return (
    <Table className="table-fixed" aria-busy={loading}>
      <caption className="sr-only">Katalog inventaris</caption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="hidden w-32 sm:table-cell">Kode</TableHead>
          <TableHead>Barang</TableHead>
          <TableHead className="hidden w-52 xl:table-cell">Lokasi</TableHead>
          <TableHead className="hidden w-40 md:table-cell">Kondisi</TableHead>
          <TableHead className="w-24 pr-2 pl-2 text-right sm:w-28 sm:pr-4">Tersedia</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Tindakan</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className={cn('transition-opacity', loading && items && 'opacity-60')}>
        {message ? (
          <TableMessage colSpan={COLUMNS}>{message}</TableMessage>
        ) : !items ? (
          <SkeletonRows avatar={false} cells={SKELETON_CELLS} />
        ) : (
          items.map((asset) => (
            <AssetRow key={asset.id} asset={asset} canDelete={canDelete} {...actions} />
          ))
        )}
      </TableBody>
    </Table>
  )
}

export function ConditionMark({ condition }: { condition: AssetCondition }) {
  if (condition === 'GOOD') {
    return <span className="text-muted-foreground">{ASSET_CONDITION_LABELS[condition]}</span>
  }
  return (
    <StatusBadge tone={CONDITION_TONES[condition]}>
      {condition === 'MAINTENANCE' && <Wrench className="size-3" aria-hidden="true" />}
      {ASSET_CONDITION_LABELS[condition]}
    </StatusBadge>
  )
}

function AssetRow({
  asset,
  canDelete,
  onEdit,
  onLend,
  onHistory,
  onDelete,
}: Omit<Props, 'items' | 'loading' | 'message'> & { asset: Asset }) {
  const lent = asset.quantity - asset.available_quantity
  const blocked = unlendableReason(asset)
  const details = [asset.category, asset.location].filter(Boolean)
  return (
    <TableRow className="[&>td]:align-top">
      <TableCell className="hidden font-mono text-[0.8125rem] break-all sm:table-cell">
        {asset.asset_code}
      </TableCell>
      <TableCell>
        <button
          type="button"
          onClick={() => onEdit(asset)}
          className="text-left font-medium break-words underline-offset-4 hover:underline"
        >
          {asset.name}
        </button>
        <p className="mt-0.5 text-[0.8125rem] break-words text-muted-foreground">
          <span className="font-mono sm:hidden">{asset.asset_code}</span>
          {details.length > 0 && <span className="sm:hidden"> · </span>}
          {/* Lokasi punya kolom sendiri mulai lebar xl; di bawahnya kolom nama barang
              terlalu sempit bila ditambah kolom lokasi (sidebar tampil mulai lg). */}
          <span className="xl:hidden">{details.join(' · ')}</span>
          <span className="hidden xl:inline">{asset.category ?? ''}</span>
        </p>
        {asset.condition !== 'GOOD' && (
          <p className="mt-1.5 md:hidden">
            <ConditionMark condition={asset.condition} />
          </p>
        )}
      </TableCell>
      <TableCell className="hidden break-words xl:table-cell">
        {asset.location ?? <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <ConditionMark condition={asset.condition} />
      </TableCell>
      <TableCell className="pr-2 pl-2 text-right tabular-nums sm:pr-4">
        <p>
          <span className="font-medium">{asset.available_quantity.toLocaleString('id-ID')}</span>
          <span className="text-muted-foreground"> / {asset.quantity.toLocaleString('id-ID')}</span>
        </p>
        {lent > 0 && (
          <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
            {lent.toLocaleString('id-ID')} dipinjam
          </p>
        )}
      </TableCell>
      <TableCell className="py-1.5 pr-2 pl-0 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-10 sm:size-8">
              <EllipsisVertical />
              <span className="sr-only">Tindakan untuk {asset.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem disabled={blocked !== null} onSelect={() => onLend(asset)}>
              <ArrowUpRight />
              <span className="grid">
                Pinjamkan
                {blocked && <span className="text-xs text-muted-foreground">{blocked}</span>}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(asset)}>
              <Pencil />
              Ubah data aset
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onHistory(asset)}>
              <History />
              Riwayat peminjaman
            </DropdownMenuItem>
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => onDelete(asset)}>
                  <Trash2 />
                  Hapus aset
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
