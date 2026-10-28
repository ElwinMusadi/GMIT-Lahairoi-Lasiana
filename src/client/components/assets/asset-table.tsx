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
import { CONDITION_PILL, unlendableReason } from '@/lib/assets'
import { cn } from '@/lib/utils'

type Props = {
  items: Asset[]
  loading: boolean
  canDelete: boolean
  onEdit: (asset: Asset) => void
  onLend: (asset: Asset) => void
  onHistory: (asset: Asset) => void
  onDelete: (asset: Asset) => void
}

// Katalog inventaris. Di layar sempit kode, kategori, lokasi, dan kondisi pindah ke
// baris kedua nama barang; sisa unit tersedia selalu tampil di kanan.
export function AssetTable({ items, loading, canDelete, ...actions }: Props) {
  return (
    <table className={cn('w-full table-fixed text-sm', loading && 'opacity-60')}>
      <caption className="sr-only">Katalog inventaris</caption>
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          <th scope="col" className="hidden h-10 w-28 pl-4 font-normal sm:table-cell">
            Kode
          </th>
          <th scope="col" className="h-10 pr-4 pl-4 font-normal sm:pl-0">
            Barang
          </th>
          <th scope="col" className="hidden w-52 pr-4 font-normal lg:table-cell">
            Lokasi
          </th>
          <th scope="col" className="hidden w-36 pr-4 font-normal md:table-cell">
            Kondisi
          </th>
          <th scope="col" className="w-24 pr-2 text-right font-normal sm:w-28 sm:pr-4">
            Tersedia
          </th>
          <th scope="col" className="w-12 pr-2">
            <span className="sr-only">Tindakan</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((asset) => (
          <AssetRow key={asset.id} asset={asset} canDelete={canDelete} {...actions} />
        ))}
      </tbody>
    </table>
  )
}

export function ConditionMark({ condition }: { condition: AssetCondition }) {
  const pill = CONDITION_PILL[condition]
  if (!pill)
    return <span className="text-muted-foreground">{ASSET_CONDITION_LABELS[condition]}</span>
  return (
    <span
      className={cn(
        'inline-flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        pill,
      )}
    >
      {condition === 'MAINTENANCE' && <Wrench className="size-3" aria-hidden="true" />}
      {ASSET_CONDITION_LABELS[condition]}
    </span>
  )
}

function AssetRow({
  asset,
  canDelete,
  onEdit,
  onLend,
  onHistory,
  onDelete,
}: Omit<Props, 'items' | 'loading'> & { asset: Asset }) {
  const lent = asset.quantity - asset.available_quantity
  const blocked = unlendableReason(asset)
  const details = [asset.category, asset.location].filter(Boolean)
  return (
    <tr className="border-t border-rule align-top">
      <td className="hidden py-3 pl-4 font-mono text-[0.8125rem] break-all sm:table-cell">
        {asset.asset_code}
      </td>
      <td className="py-3 pr-4 pl-4 sm:pl-0">
        <button
          type="button"
          onClick={() => onEdit(asset)}
          className="text-left font-medium break-words hover:underline"
        >
          {asset.name}
        </button>
        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
          <span className="font-mono sm:hidden">{asset.asset_code}</span>
          {details.length > 0 && <span className="sm:hidden"> · </span>}
          {/* Lokasi punya kolom sendiri mulai lebar lg. */}
          <span className="lg:hidden">{details.join(' · ')}</span>
          <span className="hidden lg:inline">{asset.category ?? ''}</span>
        </p>
        {asset.condition !== 'GOOD' && (
          <p className="mt-1.5 md:hidden">
            <ConditionMark condition={asset.condition} />
          </p>
        )}
      </td>
      <td className="hidden py-3 pr-4 break-words lg:table-cell">
        {asset.location ?? <span className="text-muted-foreground">—</span>}
      </td>
      <td className="hidden py-3 pr-4 md:table-cell">
        <ConditionMark condition={asset.condition} />
      </td>
      <td className="py-3 pr-2 text-right tabular-nums sm:pr-4">
        <p>
          <span className="font-medium">{asset.available_quantity.toLocaleString('id-ID')}</span>
          <span className="text-muted-foreground"> / {asset.quantity.toLocaleString('id-ID')}</span>
        </p>
        {lent > 0 && (
          <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
            {lent.toLocaleString('id-ID')} dipinjam
          </p>
        )}
      </td>
      <td className="py-2 pr-2 text-right">
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
      </td>
    </tr>
  )
}
