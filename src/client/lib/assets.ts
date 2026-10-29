import type { Asset, AssetLoan } from '@shared/types'
import { UNLENDABLE_CONDITIONS } from '@shared/assets'

// Tampilan bersama halaman Inventaris (/dashboard/assets): alasan barang tidak bisa
// dipinjamkan dan keterangan batas kembali peminjaman.

// Alasan barang tidak bisa dipinjamkan sekarang, atau null bila bisa.
export function unlendableReason(asset: Asset): string | null {
  if (UNLENDABLE_CONDITIONS.includes(asset.condition)) {
    return asset.condition === 'MAINTENANCE' ? 'Dalam perbaikan' : 'Rusak berat'
  }
  if (asset.available_quantity === 0) return 'Semua unit sedang dipinjam'
  return null
}

const DAY = 86_400_000

// Selisih hari kalender antara dua tanggal YYYY-MM-DD.
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY)
}

// Keterangan batas kembali peminjaman yang belum kembali dan belum terlambat.
export function dueHint(loan: AssetLoan, today: string) {
  const days = daysBetween(today, loan.due_date)
  if (days <= 0) return 'hari ini'
  if (days === 1) return 'besok'
  return `${days} hari lagi`
}

// "Kursi plastik × 20"
export function loanTitle(loan: Pick<AssetLoan, 'asset_name' | 'quantity_borrowed'>) {
  return `${loan.asset_name} × ${loan.quantity_borrowed.toLocaleString('id-ID')}`
}

// "40 dari 60 unit"
export function stockText(asset: Pick<Asset, 'available_quantity' | 'quantity'>) {
  return `${asset.available_quantity.toLocaleString('id-ID')} dari ${asset.quantity.toLocaleString('id-ID')} unit`
}
