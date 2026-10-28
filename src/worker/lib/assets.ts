import { AUTO_CODE_PREFIX, type AssetFields } from '../../shared/assets'
import type { Asset, AssetLoan } from '../../shared/types'

// Bagian bersama rute /api/assets dan /api/asset-loans: kolom SQL, status peminjaman
// yang dihitung dari tanggal hari ini, dan kode inventaris otomatis.

const ISO = (column: string) => `strftime('%Y-%m-%dT%H:%M:%SZ', ${column})`

export const ASSET_SELECT = `
  SELECT a.id, a.asset_code, a.name, a.category, a.quantity, a.available_quantity,
         a.location, a.acquisition_source, a.acquisition_year, a.estimated_value,
         a.condition, a.notes,
         (SELECT COUNT(*) FROM asset_loans l
          WHERE l.asset_id = a.id AND l.status <> 'RETURNED') AS active_loans,
         ${ISO('a.created_at')} AS created_at, ${ISO('a.updated_at')} AS updated_at
  FROM assets a`

// today berformat YYYY-MM-DD dari witaToday() (bukan masukan pengguna), sehingga aman
// disisipkan langsung.
export function loanStatusSql(today: string) {
  return `CASE WHEN l.status = 'RETURNED' THEN 'RETURNED'
               WHEN l.due_date < '${today}' THEN 'OVERDUE'
               ELSE 'BORROWED' END`
}

// Status terlambat dihitung saat dibaca (hari ini WITA melewati due_date dan barang
// belum kembali), sehingga selalu tepat walau penandaan di database belum berjalan.
export function loanSelect(today: string) {
  return `
  SELECT l.id, l.asset_id, a.asset_code, a.name AS asset_name, l.borrower_name, l.rayon_id,
         r.name AS rayon_name, l.quantity_borrowed, l.borrow_date, l.due_date, l.return_date,
         l.return_condition, ${loanStatusSql(today)} AS status,
         CASE WHEN l.status <> 'RETURNED' AND l.due_date < '${today}'
              THEN CAST(julianday('${today}') - julianday(l.due_date) AS INTEGER)
              ELSE 0 END AS days_overdue,
         l.notes, ${ISO('l.created_at')} AS created_at, ${ISO('l.updated_at')} AS updated_at
  FROM asset_loans l
  JOIN assets a ON a.id = l.asset_id
  LEFT JOIN rayons r ON r.id = l.rayon_id`
}

// Menandai di database peminjaman yang melewati batas kembali (BORROWED → OVERDUE).
// Dijalankan sebelum setiap pembacaan peminjaman.
export function markOverdue(db: D1Database, today: string) {
  return db
    .prepare(
      `UPDATE asset_loans SET status = 'OVERDUE', updated_at = datetime('now')
       WHERE status = 'BORROWED' AND due_date < ?1`,
    )
    .bind(today)
}

export async function findAsset(db: D1Database, id: number) {
  return db.prepare(`${ASSET_SELECT} WHERE a.id = ?1`).bind(id).first<Asset>()
}

export async function findLoan(db: D1Database, id: number, today: string) {
  return db
    .prepare(`${loanSelect(today)} WHERE l.id = ?1`)
    .bind(id)
    .first<AssetLoan>()
}

// Kode berikutnya setelah kode otomatis terbesar, mis. INV-0007 → INV-0008. Kode yang
// diisi manual dengan format lain tidak dihitung.
export async function nextAssetCode(db: D1Database) {
  const { results } = await db
    .prepare('SELECT asset_code FROM assets WHERE asset_code LIKE ?1')
    .bind(`${AUTO_CODE_PREFIX}%`)
    .all<{ asset_code: string }>()
  const last = results.reduce((max, row) => {
    const n = Number(row.asset_code.slice(AUTO_CODE_PREFIX.length))
    return Number.isInteger(n) && n > max ? n : max
  }, 0)
  return `${AUTO_CODE_PREFIX}${String(last + 1).padStart(4, '0')}`
}

export function assetFields(asset: Asset): AssetFields {
  return {
    asset_code: asset.asset_code,
    name: asset.name,
    category: asset.category,
    quantity: asset.quantity,
    location: asset.location,
    acquisition_source: asset.acquisition_source,
    acquisition_year: asset.acquisition_year,
    estimated_value: asset.estimated_value,
    condition: asset.condition,
    notes: asset.notes,
  }
}

export function assetLabel(asset: { asset_code: string; name: string }) {
  return `${asset.asset_code} ${asset.name}`
}

export function loanLabel(loan: {
  asset_name: string
  quantity_borrowed: number
  borrower_name: string
}) {
  return `${loan.asset_name} × ${loan.quantity_borrowed} oleh ${loan.borrower_name}`
}
