import { Hono, type Context } from 'hono'
import type { FieldErrors } from '../../shared/accounts'
import { parseAssetInput, type AssetFields } from '../../shared/assets'
import { witaToday } from '../../shared/dates'
import {
  ASSET_CONDITIONS,
  type ApiErrorBody,
  type Asset,
  type AssetLoan,
  type AssetPage,
  type AssetResponse,
} from '../../shared/types'
import {
  ASSET_SELECT,
  assetFields,
  assetLabel,
  findAsset,
  loanSelect,
  markOverdue,
  nextAssetCode,
} from '../lib/assets'
import { LAST_INSERT_ID, auditStatement, diffChanges } from '../lib/audit'
import {
  containsPattern,
  invalid,
  positiveInt,
  readJsonObject,
  readPaging,
  runBatch,
  searchWords,
  whereBuilder,
} from '../lib/request'
import { requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

// Katalog aset & inventaris gereja (PRD: Manajemen Aset & Inventaris). Admin dan
// Majelis dapat melihat; menambah, mengubah, dan menghapus aset khusus Admin (PRD).
// Peminjaman di /api/asset-loans.
//
// available_quantity tidak pernah dikirim klien: saat dibuat sama dengan quantity, lalu
// berubah lewat peminjaman dan pengembalian. Mengubah quantity menggeser
// available_quantity dengan selisih yang sama, dan ditolak bila kurang dari unit yang
// sedang dipinjam.
//
// GET / query opsional: category, location, condition, q (kode, nama, catatan),
// available (true = masih ada unit tersedia), page, per_page.
const assets = new Hono<AppEnv>()

assets.use(requireRole('ADMIN', 'ELDER'))

type Ctx = Context<AppEnv>

const NOT_FOUND = 'Aset tidak ditemukan.'
const DUPLICATE_CODE = 'Kode inventaris sudah dipakai.'

assets.get('/', async (c) => {
  const query = c.req.query()
  const details: FieldErrors = {}
  const where = whereBuilder()
  const { page, perPage } = readPaging(query, details)

  if (query.category !== undefined && query.category.trim()) {
    where.add('a.category = ? COLLATE NOCASE', query.category.trim())
  }
  if (query.location !== undefined && query.location.trim()) {
    where.add('a.location = ? COLLATE NOCASE', query.location.trim())
  }
  if (query.condition !== undefined) {
    const condition = query.condition.trim().toUpperCase()
    if (!(ASSET_CONDITIONS as string[]).includes(condition)) {
      details.condition = [`Pilih salah satu: ${ASSET_CONDITIONS.join(', ')}.`]
    } else where.add('a.condition = ?', condition)
  }
  if (query.available !== undefined) {
    if (query.available === 'true') where.addClause('a.available_quantity > 0')
    else if (query.available === 'false') where.addClause('a.available_quantity = 0')
    else details.available = ['Isi true (masih ada unit tersedia) atau false.']
  }
  if (query.q !== undefined) {
    const words = searchWords(query.q)
    if (words === null) details.q = ['Kata pencarian maksimal 100 karakter.']
    for (const word of words ?? []) {
      where.add(
        `(a.asset_code LIKE ? ESCAPE '\\' OR a.name LIKE ? ESCAPE '\\' OR a.notes LIKE ? ESCAPE '\\')`,
        containsPattern(word),
      )
    }
  }
  if (Object.keys(details).length > 0) return invalid(c, 'Filter aset tidak valid.', details)

  const db = c.env.DB
  const count = where.params.length
  const [total, list, categories, locations] = await db.batch([
    db.prepare(`SELECT COUNT(*) AS n FROM assets a ${where.sql}`).bind(...where.params),
    db
      .prepare(
        `${ASSET_SELECT} ${where.sql}
         ORDER BY a.asset_code COLLATE NOCASE, a.id
         LIMIT ?${count + 1} OFFSET ?${count + 2}`,
      )
      .bind(...where.params, perPage, (page - 1) * perPage),
    db.prepare(
      `SELECT DISTINCT category AS value FROM assets WHERE category IS NOT NULL
       ORDER BY category COLLATE NOCASE`,
    ),
    db.prepare(
      `SELECT DISTINCT location AS value FROM assets WHERE location IS NOT NULL
       ORDER BY location COLLATE NOCASE`,
    ),
  ])
  const values = (rows: unknown[]) => (rows as { value: string }[]).map((row) => row.value)
  return c.json<AssetPage>({
    data: list.results as Asset[],
    meta: { page, per_page: perPage, total: (total.results[0] as { n: number }).n },
    categories: values(categories.results),
    locations: values(locations.results),
  })
})

assets.get('/:id', async (c) => {
  const id = positiveInt(c.req.param('id'))
  const db = c.env.DB
  const today = witaToday()
  if (!id) return c.json<ApiErrorBody>({ error: NOT_FOUND }, 404)
  const [, asset, loans] = await db.batch([
    markOverdue(db, today),
    db.prepare(`${ASSET_SELECT} WHERE a.id = ?1`).bind(id),
    db
      .prepare(
        `${loanSelect(today)} WHERE l.asset_id = ?1
         ORDER BY l.borrow_date DESC, l.id DESC LIMIT 20`,
      )
      .bind(id),
  ])
  const found = asset.results[0] as Asset | undefined
  if (!found) return c.json<ApiErrorBody>({ error: NOT_FOUND }, 404)
  return c.json<AssetResponse>({ asset: found, loans: loans.results as AssetLoan[] })
})

assets.post('/', requireRole('ADMIN'), async (c) => {
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data aset tidak valid.' }, 400)

  const currentYear = Number(witaToday().slice(0, 4))
  const { input, details } = parseAssetInput(body, 'create', currentYear)
  if (Object.keys(details).length > 0) return invalid(c, 'Data aset belum benar.', details)

  const db = c.env.DB
  const next: AssetFields = {
    asset_code: input.asset_code ?? (await nextAssetCode(db)),
    name: input.name ?? '',
    category: input.category ?? null,
    quantity: input.quantity ?? 1,
    location: input.location ?? null,
    acquisition_source: input.acquisition_source ?? null,
    acquisition_year: input.acquisition_year ?? null,
    estimated_value: input.estimated_value ?? null,
    condition: input.condition ?? 'GOOD',
    notes: input.notes ?? null,
  }
  const taken = await codeTaken(c, next.asset_code, null)
  if (taken) return taken

  const result = await runBatch(
    c,
    [
      db
        .prepare(
          `INSERT INTO assets (asset_code, name, category, quantity, available_quantity,
             location, acquisition_source, acquisition_year, estimated_value, condition, notes)
           VALUES (?1, ?2, ?3, ?4, ?4, ?5, ?6, ?7, ?8, ?9, ?10) RETURNING id`,
        )
        .bind(...columnValues(next)),
      auditStatement(c, {
        action: 'CREATE',
        entityType: 'assets',
        entityId: LAST_INSERT_ID,
        label: assetLabel(next),
        after: next,
      }),
    ],
    DUPLICATE_CODE,
  )
  if (result instanceof Response) return result
  const id = (result[0].results[0] as { id: number }).id
  return c.json<AssetResponse>({ asset: await mustFind(c, id), loans: [] }, 201)
})

// PRD menyebut PUT; PATCH diterima dengan arti yang sama. Field yang tidak dikirim tidak
// diubah.
assets.on(['PUT', 'PATCH'], '/:id', requireRole('ADMIN'), async (c) => {
  const id = positiveInt(c.req.param('id'))
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data aset tidak valid.' }, 400)

  const currentYear = Number(witaToday().slice(0, 4))
  const { input, details } = parseAssetInput(body, 'update', currentYear)
  if (Object.keys(details).length > 0) return invalid(c, 'Data aset belum benar.', details)
  if (Object.keys(input).length === 0) {
    return c.json<ApiErrorBody>({ error: 'Tidak ada data yang diubah.' }, 400)
  }

  const db = c.env.DB
  const current = id ? await findAsset(db, id) : null
  if (!id || !current) return c.json<ApiErrorBody>({ error: NOT_FOUND }, 404)

  const before = assetFields(current)
  const next: AssetFields = { ...before, ...input }
  if (next.asset_code !== before.asset_code) {
    const taken = await codeTaken(c, next.asset_code, id)
    if (taken) return taken
  }
  const lent = current.quantity - current.available_quantity
  if (next.quantity < lent) {
    return invalid(c, 'Data aset belum benar.', {
      quantity: [
        `${lent.toLocaleString('id-ID')} unit sedang dipinjam; jumlah unit minimal ${lent.toLocaleString('id-ID')}.`,
      ],
    })
  }
  if (Object.keys(diffChanges(before, next)).length === 0) {
    return c.json<AssetResponse>({ asset: current, loans: [] })
  }

  const result = await runBatch(
    c,
    [
      db
        .prepare(
          `UPDATE assets
           SET asset_code = ?2, name = ?3, category = ?4,
               available_quantity = available_quantity + (?5 - quantity), quantity = ?5,
               location = ?6, acquisition_source = ?7, acquisition_year = ?8,
               estimated_value = ?9, condition = ?10, notes = ?11, updated_at = datetime('now')
           WHERE id = ?1`,
        )
        .bind(id, ...columnValues(next)),
      auditStatement(c, {
        action: 'UPDATE',
        entityType: 'assets',
        entityId: id,
        label: assetLabel(next),
        before,
        after: next,
      }),
    ],
    DUPLICATE_CODE,
  )
  if (result instanceof Response) return result
  return c.json<AssetResponse>({ asset: await mustFind(c, id), loans: [] })
})

// Aset yang punya riwayat peminjaman tidak dihapus agar log peminjamannya tetap utuh.
assets.delete('/:id', requireRole('ADMIN'), async (c) => {
  const id = positiveInt(c.req.param('id'))
  const db = c.env.DB
  const current = id ? await findAsset(db, id) : null
  if (!id || !current) return c.json<ApiErrorBody>({ error: NOT_FOUND }, 404)

  const loans = await db
    .prepare('SELECT COUNT(*) AS n FROM asset_loans WHERE asset_id = ?1')
    .bind(id)
    .first<{ n: number }>()
  if (loans && loans.n > 0) {
    return c.json<ApiErrorBody>(
      {
        error: `Aset ini punya ${loans.n.toLocaleString('id-ID')} catatan peminjaman sehingga tidak dapat dihapus. Ubah kondisinya atau tambahkan catatan bila barang sudah tidak dipakai.`,
      },
      409,
    )
  }

  await db.batch([
    db.prepare('DELETE FROM assets WHERE id = ?1').bind(id),
    auditStatement(c, {
      action: 'DELETE',
      entityType: 'assets',
      entityId: id,
      label: assetLabel(current),
      before: assetFields(current),
    }),
  ])
  return c.body(null, 204)
})

// asset_code, name, category, quantity, location, acquisition_source, acquisition_year,
// estimated_value, condition, notes
function columnValues(next: AssetFields) {
  return [
    next.asset_code,
    next.name,
    next.category,
    next.quantity,
    next.location,
    next.acquisition_source,
    next.acquisition_year,
    next.estimated_value,
    next.condition,
    next.notes,
  ]
}

async function codeTaken(c: Ctx, code: string, excludeId: number | null) {
  const row = await c.env.DB.prepare(
    'SELECT name FROM assets WHERE asset_code = ?1 COLLATE NOCASE AND id IS NOT ?2',
  )
    .bind(code, excludeId)
    .first<{ name: string }>()
  if (!row) return null
  return c.json<ApiErrorBody>(
    {
      error: DUPLICATE_CODE,
      details: { asset_code: [`Kode ${code} sudah dipakai “${row.name}”.`] },
    },
    409,
  )
}

async function mustFind(c: Ctx, id: number) {
  const asset = await findAsset(c.env.DB, id)
  if (!asset) throw new Error(`Aset ${id} tidak ditemukan setelah disimpan`)
  return asset
}

export default assets
