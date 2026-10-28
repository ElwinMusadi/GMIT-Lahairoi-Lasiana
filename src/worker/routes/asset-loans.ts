import { Hono } from 'hono'
import type { FieldErrors } from '../../shared/accounts'
import {
  UNLENDABLE_CONDITIONS,
  parseLoanInput,
  parseReturnInput,
  type LoanFields,
} from '../../shared/assets'
import { isCalendarDate, witaToday } from '../../shared/dates'
import {
  ASSET_CONDITION_LABELS,
  LOAN_STATUSES,
  type ApiErrorBody,
  type AssetLoan,
  type AssetLoanPage,
  type AssetLoanResponse,
  type LoanStatus,
} from '../../shared/types'
import {
  findAsset,
  findLoan,
  loanLabel,
  loanSelect,
  loanStatusSql,
  markOverdue,
} from '../lib/assets'
import { LAST_INSERT_ID, auditStatement } from '../lib/audit'
import {
  containsPattern,
  invalid,
  positiveInt,
  readJsonObject,
  readPaging,
  searchWords,
  whereBuilder,
} from '../lib/request'
import { requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

// Log peminjaman inventaris (PRD: Pencatatan Peminjaman Inventaris) oleh pengurus rayon
// atau warga jemaat. Admin dan Majelis mencatat dan menerima pengembalian.
//
// Stok: membuat peminjaman mengurangi available_quantity aset dalam batch yang sama;
// CHECK di tabel assets (0 ≤ available_quantity ≤ quantity) menolak batch bila stok tidak
// cukup, termasuk saat dua peminjaman disimpan bersamaan. Pengembalian menambahkannya
// kembali, hanya sekali per peminjaman.
//
// Terlambat: peminjaman yang belum kembali dan batas kembalinya sudah lewat (hari ini
// WITA) berstatus OVERDUE. Status dihitung setiap kali dibaca dan ditandai di database
// (BORROWED → OVERDUE) sebelum setiap pembacaan.
//
// GET / query opsional: status (BORROWED, OVERDUE, RETURNED, atau active = belum
// kembali), asset_id, rayon_id, q (peminjam, kode/nama barang), from, to (tanggal
// pinjam), page, per_page. Peminjaman aktif urut batas kembali terdekat; lainnya tanggal
// pinjam terbaru dulu. Respons menyertakan counts per status untuk filter lain yang sama.
const loans = new Hono<AppEnv>()

loans.use(requireRole('ADMIN', 'ELDER'))

const NOT_FOUND = 'Peminjaman tidak ditemukan.'

loans.get('/', async (c) => {
  const query = c.req.query()
  const today = witaToday()
  const details: FieldErrors = {}
  const where = whereBuilder()
  const { page, perPage } = readPaging(query, details)

  if (query.asset_id !== undefined) {
    const assetId = positiveInt(query.asset_id)
    if (assetId === null) details.asset_id = ['Barang tidak valid.']
    else where.add('l.asset_id = ?', assetId)
  }
  if (query.rayon_id !== undefined) {
    const rayonId = positiveInt(query.rayon_id)
    if (rayonId === null) details.rayon_id = ['Rayon tidak valid.']
    else where.add('l.rayon_id = ?', rayonId)
  }
  const { from, to } = query
  if (from !== undefined && !isCalendarDate(from)) details.from = ['Tanggal awal harus YYYY-MM-DD.']
  if (to !== undefined && !isCalendarDate(to)) details.to = ['Tanggal akhir harus YYYY-MM-DD.']
  if (!details.from && !details.to && from && to && from > to) {
    details.to = ['Tanggal akhir tidak boleh sebelum tanggal awal.']
  }
  if (from && !details.from) where.add('l.borrow_date >= ?', from)
  if (to && !details.to) where.add('l.borrow_date <= ?', to)
  if (query.q !== undefined) {
    const words = searchWords(query.q)
    if (words === null) details.q = ['Kata pencarian maksimal 100 karakter.']
    for (const word of words ?? []) {
      where.add(
        `(l.borrower_name LIKE ? ESCAPE '\\' OR a.name LIKE ? ESCAPE '\\'
          OR a.asset_code LIKE ? ESCAPE '\\')`,
        containsPattern(word),
      )
    }
  }
  // Hitungan per status mengikuti filter lain, bukan filter status.
  const countWhere = { sql: where.sql, params: [...where.params] }
  const status = loanStatusSql(today)
  let statusFilter: LoanStatus | 'ACTIVE' | null = null
  if (query.status !== undefined) {
    const value = query.status.trim().toUpperCase()
    if (value === 'ACTIVE') {
      statusFilter = 'ACTIVE'
      where.addClause(`(${status}) <> 'RETURNED'`)
    } else if ((LOAN_STATUSES as string[]).includes(value)) {
      statusFilter = value as LoanStatus
      where.add(`(${status}) = ?`, value)
    } else {
      details.status = [`Pilih salah satu: ${LOAN_STATUSES.join(', ')}, atau ACTIVE.`]
    }
  }
  if (Object.keys(details).length > 0) {
    return invalid(c, 'Filter peminjaman tidak valid.', details)
  }

  const active = statusFilter && statusFilter !== 'RETURNED'
  const order = active ? 'l.due_date, l.borrow_date, l.id' : 'l.borrow_date DESC, l.id DESC'
  const db = c.env.DB
  const count = where.params.length
  const [, counts, list] = await db.batch([
    markOverdue(db, today),
    db
      .prepare(
        `SELECT ${status} AS status, COUNT(*) AS n
         FROM asset_loans l JOIN assets a ON a.id = l.asset_id ${countWhere.sql}
         GROUP BY 1`,
      )
      .bind(...countWhere.params),
    db
      .prepare(
        `${loanSelect(today)} ${where.sql}
         ORDER BY ${order}
         LIMIT ?${count + 1} OFFSET ?${count + 2}`,
      )
      .bind(...where.params, perPage, (page - 1) * perPage),
  ])
  const byStatus: Record<LoanStatus, number> = { BORROWED: 0, OVERDUE: 0, RETURNED: 0 }
  for (const row of counts.results as { status: LoanStatus; n: number }[]) {
    byStatus[row.status] = row.n
  }
  const total =
    statusFilter === 'ACTIVE'
      ? byStatus.BORROWED + byStatus.OVERDUE
      : statusFilter
        ? byStatus[statusFilter]
        : byStatus.BORROWED + byStatus.OVERDUE + byStatus.RETURNED
  return c.json<AssetLoanPage>({
    data: list.results as AssetLoan[],
    meta: { page, per_page: perPage, total },
    counts: byStatus,
  })
})

loans.post('/', async (c) => {
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data peminjaman tidak valid.' }, 400)

  const today = witaToday()
  const { input, details } = parseLoanInput(body, today)
  if (Object.keys(details).length > 0) return invalid(c, 'Data peminjaman belum benar.', details)
  const loan: LoanFields = {
    asset_id: input.asset_id ?? 0,
    borrower_name: input.borrower_name ?? '',
    rayon_id: input.rayon_id ?? null,
    quantity_borrowed: input.quantity_borrowed ?? 1,
    borrow_date: input.borrow_date ?? today,
    due_date: input.due_date ?? today,
    notes: input.notes ?? null,
  }

  const db = c.env.DB
  const asset = await findAsset(db, loan.asset_id)
  if (!asset)
    return invalid(c, 'Data peminjaman belum benar.', { asset_id: ['Barang tidak ditemukan.'] })
  if (UNLENDABLE_CONDITIONS.includes(asset.condition)) {
    return c.json<ApiErrorBody>(
      {
        error: `${asset.name} sedang ${ASSET_CONDITION_LABELS[asset.condition].toLowerCase()} sehingga tidak dapat dipinjamkan.`,
      },
      409,
    )
  }
  const stockError = () =>
    c.json<ApiErrorBody>(
      {
        error: 'Stok tersedia tidak mencukupi.',
        details: {
          quantity_borrowed: [
            `Tersedia ${asset.available_quantity.toLocaleString('id-ID')} dari ${asset.quantity.toLocaleString('id-ID')} unit ${asset.name}.`,
          ],
        },
      },
      409,
    )
  if (loan.quantity_borrowed > asset.available_quantity) return stockError()

  let rayonName: string | null = null
  if (loan.rayon_id !== null) {
    const rayon = await db
      .prepare('SELECT name FROM rayons WHERE id = ?1')
      .bind(loan.rayon_id)
      .first<{ name: string }>()
    if (!rayon)
      return invalid(c, 'Data peminjaman belum benar.', { rayon_id: ['Rayon tidak ditemukan.'] })
    rayonName = rayon.name
  }

  // Catatan peminjaman lama yang dimasukkan belakangan bisa langsung terlambat.
  const initialStatus = loan.due_date < today ? 'OVERDUE' : 'BORROWED'
  let result: D1Result[]
  try {
    result = await db.batch([
      db
        .prepare(
          `UPDATE assets SET available_quantity = available_quantity - ?2,
             updated_at = datetime('now')
           WHERE id = ?1`,
        )
        .bind(loan.asset_id, loan.quantity_borrowed),
      db
        .prepare(
          `INSERT INTO asset_loans (asset_id, borrower_name, rayon_id, quantity_borrowed,
             borrow_date, due_date, status, notes)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) RETURNING id`,
        )
        .bind(
          loan.asset_id,
          loan.borrower_name,
          loan.rayon_id,
          loan.quantity_borrowed,
          loan.borrow_date,
          loan.due_date,
          initialStatus,
          loan.notes,
        ),
      auditStatement(c, {
        action: 'CREATE',
        entityType: 'asset_loans',
        entityId: LAST_INSERT_ID,
        label: loanLabel({ ...loan, asset_name: asset.name }),
        after: {
          asset: `${asset.asset_code} ${asset.name}`,
          borrower_name: loan.borrower_name,
          rayon: rayonName,
          quantity_borrowed: loan.quantity_borrowed,
          borrow_date: loan.borrow_date,
          due_date: loan.due_date,
          notes: loan.notes,
        },
      }),
    ])
  } catch (err) {
    // Stok berubah sejak diperiksa (peminjaman lain disimpan bersamaan).
    if (err instanceof Error && err.message.includes('CHECK constraint failed')) {
      const fresh = await findAsset(db, loan.asset_id)
      if (fresh) Object.assign(asset, fresh)
      return stockError()
    }
    throw err
  }

  const id = (result[1].results[0] as { id: number }).id
  return c.json<AssetLoanResponse>(await loanResponse(db, id, loan.asset_id, today), 201)
})

// Pengembalian: status RETURNED, tanggal dan kondisi saat kembali, dan unit kembali
// tersedia. Kondisi kembali dicatat di peminjaman; kondisi aset diubah Admin lewat
// PUT /api/assets/:id bila perlu.
loans.patch('/:id/return', async (c) => {
  const id = positiveInt(c.req.param('id'))
  const body = (await readJsonObject(c)) ?? {}
  const today = witaToday()
  const { input, details } = parseReturnInput(body, today)
  if (Object.keys(details).length > 0) return invalid(c, 'Data pengembalian belum benar.', details)

  const db = c.env.DB
  const current = id ? await findLoan(db, id, today) : null
  if (!id || !current) return c.json<ApiErrorBody>({ error: NOT_FOUND }, 404)
  if (current.status === 'RETURNED') {
    return c.json<ApiErrorBody>(
      { error: `Peminjaman ini sudah dikembalikan pada ${current.return_date}.` },
      409,
    )
  }
  const returnDate = input.return_date ?? today
  if (returnDate < current.borrow_date) {
    return invalid(c, 'Data pengembalian belum benar.', {
      return_date: ['Tanggal kembali tidak boleh sebelum tanggal pinjam.'],
    })
  }
  const returnCondition = input.return_condition ?? null
  const notes = input.notes !== undefined ? input.notes : current.notes

  const [restock, update] = await db.batch([
    // Unit dikembalikan ke stok hanya bila peminjaman ini belum dikembalikan, sehingga
    // dua permintaan pengembalian bersamaan tidak menambah stok dua kali.
    db
      .prepare(
        `UPDATE assets SET available_quantity = available_quantity + ?2,
           updated_at = datetime('now')
         WHERE id = ?1
           AND EXISTS (SELECT 1 FROM asset_loans WHERE id = ?3 AND status <> 'RETURNED')`,
      )
      .bind(current.asset_id, current.quantity_borrowed, id),
    db
      .prepare(
        `UPDATE asset_loans
         SET status = 'RETURNED', return_date = ?2, return_condition = ?3, notes = ?4,
             updated_at = datetime('now')
         WHERE id = ?1 AND status <> 'RETURNED'`,
      )
      .bind(id, returnDate, returnCondition, notes),
    auditStatement(c, {
      action: 'UPDATE',
      entityType: 'asset_loans',
      entityId: id,
      label: loanLabel(current),
      before: { status: current.status, return_date: null, return_condition: null },
      after: { status: 'RETURNED', return_date: returnDate, return_condition: returnCondition },
    }),
  ])
  if (update.meta.changes === 0 || restock.meta.changes === 0) {
    return c.json<ApiErrorBody>({ error: 'Peminjaman ini baru saja dikembalikan.' }, 409)
  }
  return c.json<AssetLoanResponse>(await loanResponse(db, id, current.asset_id, today))
})

async function loanResponse(
  db: D1Database,
  loanId: number,
  assetId: number,
  today: string,
): Promise<AssetLoanResponse> {
  const [loan, asset] = await Promise.all([findLoan(db, loanId, today), findAsset(db, assetId)])
  if (!loan || !asset) throw new Error(`Peminjaman ${loanId} tidak ditemukan setelah disimpan`)
  return { loan, asset }
}

export default loans
