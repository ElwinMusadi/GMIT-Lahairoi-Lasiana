import { Hono, type Context } from 'hono'
import type { FieldErrors } from '../../shared/accounts'
import { parseFamilyInput, type FamilyFields } from '../../shared/congregation'
import type { ApiErrorBody, ApiPage, Family, FamilyResponse } from '../../shared/types'
import { LAST_INSERT_ID, auditStatement, diffChanges } from '../lib/audit'
import {
  FAMILY_SELECT,
  familyAuditView,
  familyLabel,
  findFamilyDetail,
  inScope,
  outsideRayon,
  rayonScope,
} from '../lib/congregation'
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

// Kartu Keluarga gereja (PRD, Database Jemaat & KK). Admin, Pendeta, dan Majelis
// dapat melihat; Admin dan Majelis mengelola; menghapus KK kosong khusus Admin.
// Majelis hanya mencakup KK di rayonnya sendiri.
//
// GET / query opsional: q (nomor KK, nama kepala keluarga, atau nama anggota),
// rayon_id, page, per_page (maks. 100).
const families = new Hono<AppEnv>()

families.use(requireRole('ADMIN', 'PASTOR', 'ELDER'))

type Ctx = Context<AppEnv>
type StoredFamily = FamilyFields & { rayon_name: string }

const CONFLICT = 'Nomor KK ini baru saja dipakai KK lain. Muat ulang lalu coba lagi.'

families.get('/', async (c) => {
  const query = c.req.query()
  const details: FieldErrors = {}
  const where = whereBuilder()
  const scope = rayonScope(c.get('user'))
  const { page, perPage } = readPaging(query, details)

  if (query.rayon_id !== undefined) {
    const rayonId = positiveInt(query.rayon_id)
    if (rayonId === null) details.rayon_id = ['Rayon tidak valid.']
    else if (!inScope(scope, rayonId)) return outsideRayon(c)
    else where.add('f.rayon_id = ?', rayonId)
  }
  if (scope !== null) where.add('f.rayon_id = ?', scope)

  if (query.q !== undefined) {
    const words = searchWords(query.q)
    if (words === null) details.q = ['Kata pencarian maksimal 100 karakter.']
    for (const word of words ?? []) {
      where.add(
        `(f.kk_number LIKE ? ESCAPE '\\' OR f.family_head_name LIKE ? ESCAPE '\\'
          OR EXISTS (SELECT 1 FROM members m WHERE m.family_id = f.id
                     AND m.full_name LIKE ? ESCAPE '\\'))`,
        containsPattern(word),
      )
    }
  }

  if (Object.keys(details).length > 0)
    return invalid(c, 'Filter Kartu Keluarga tidak valid.', details)

  const db = c.env.DB
  const count = where.params.length
  const [total, list] = await db.batch([
    db.prepare(`SELECT COUNT(*) AS total FROM families f ${where.sql}`).bind(...where.params),
    db
      .prepare(
        `${FAMILY_SELECT} ${where.sql}
         ORDER BY f.family_head_name COLLATE NOCASE, f.id
         LIMIT ?${count + 1} OFFSET ?${count + 2}`,
      )
      .bind(...where.params, perPage, (page - 1) * perPage),
  ])

  return c.json<ApiPage<Family>>({
    data: list.results as Family[],
    meta: { page, per_page: perPage, total: (total.results[0] as { total: number }).total },
  })
})

families.get('/:id', async (c) => {
  const id = positiveInt(c.req.param('id'))
  const family = id ? await findFamilyDetail(c.env.DB, id) : null
  if (!family) return c.json<ApiErrorBody>({ error: 'Kartu Keluarga tidak ditemukan.' }, 404)
  if (!inScope(rayonScope(c.get('user')), family.rayon_id)) {
    return outsideRayon(c, 'Kartu Keluarga ini')
  }
  return c.json<FamilyResponse>({ family })
})

families.post('/', requireRole('ADMIN', 'ELDER'), async (c) => {
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data Kartu Keluarga tidak valid.' }, 400)

  // Majelis yang tidak memilih rayon membuat KK di rayonnya sendiri.
  const scope = rayonScope(c.get('user'))
  if (scope !== null && body.rayon_id === undefined) body.rayon_id = scope

  const { input, details } = parseFamilyInput(body, 'create')
  if (Object.keys(details).length > 0) {
    return invalid(c, 'Data Kartu Keluarga belum benar.', details)
  }
  const next: FamilyFields = {
    kk_number: input.kk_number ?? null,
    family_head_name: input.family_head_name ?? '',
    rayon_id: input.rayon_id ?? 0,
    address: input.address ?? null,
    phone: input.phone ?? null,
  }

  const checked = await checkAgainstDatabase(c, next, null)
  if (checked instanceof Response) return checked

  const db = c.env.DB
  const result = await runBatch(
    c,
    [
      db
        .prepare(
          `INSERT INTO families (kk_number, family_head_name, rayon_id, address, phone)
           VALUES (?1, ?2, ?3, ?4, ?5) RETURNING id`,
        )
        .bind(next.kk_number, next.family_head_name, next.rayon_id, next.address, next.phone),
      auditStatement(c, {
        action: 'CREATE',
        entityType: 'families',
        entityId: LAST_INSERT_ID,
        label: familyLabel(next.kk_number, next.family_head_name),
        after: familyAuditView(next, checked.rayonName),
      }),
    ],
    CONFLICT,
  )
  if (result instanceof Response) return result

  const id = (result[0].results[0] as { id: number }).id
  return c.json<FamilyResponse>({ family: await mustFind(c, id) }, 201)
})

// PRD menyebut PUT; PATCH diterima dengan arti yang sama. Field yang tidak dikirim
// tidak diubah. Mengganti rayon KK ikut memindahkan seluruh anggotanya.
families.on(['PUT', 'PATCH'], '/:id', requireRole('ADMIN', 'ELDER'), async (c) => {
  const id = positiveInt(c.req.param('id'))
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data Kartu Keluarga tidak valid.' }, 400)

  const { input, details } = parseFamilyInput(body, 'update')
  if (Object.keys(details).length > 0) {
    return invalid(c, 'Data Kartu Keluarga belum benar.', details)
  }
  if (Object.keys(input).length === 0) {
    return c.json<ApiErrorBody>({ error: 'Tidak ada data yang diubah.' }, 400)
  }

  const db = c.env.DB
  const current = id
    ? await db
        .prepare(
          `SELECT f.kk_number, f.family_head_name, f.rayon_id, r.name AS rayon_name,
                  f.address, f.phone
           FROM families f JOIN rayons r ON r.id = f.rayon_id WHERE f.id = ?1`,
        )
        .bind(id)
        .first<StoredFamily>()
    : null
  if (!id || !current)
    return c.json<ApiErrorBody>({ error: 'Kartu Keluarga tidak ditemukan.' }, 404)
  if (!inScope(rayonScope(c.get('user')), current.rayon_id)) {
    return outsideRayon(c, 'Kartu Keluarga ini')
  }

  const next: FamilyFields = {
    kk_number: current.kk_number,
    family_head_name: current.family_head_name,
    rayon_id: current.rayon_id,
    address: current.address,
    phone: current.phone,
    ...input,
  }
  const checked = await checkAgainstDatabase(c, next, id, current)
  if (checked instanceof Response) return checked

  const before = familyAuditView(current, current.rayon_name)
  const after = familyAuditView(next, checked.rayonName)
  if (Object.keys(diffChanges(before, after)).length === 0) {
    return c.json<FamilyResponse>({ family: await mustFind(c, id) })
  }

  const result = await runBatch(
    c,
    [
      db
        .prepare(
          `UPDATE families
           SET kk_number = ?2, family_head_name = ?3, rayon_id = ?4, address = ?5, phone = ?6,
               updated_at = datetime('now')
           WHERE id = ?1`,
        )
        .bind(id, next.kk_number, next.family_head_name, next.rayon_id, next.address, next.phone),
      auditStatement(c, {
        action: 'UPDATE',
        entityType: 'families',
        entityId: id,
        label: familyLabel(next.kk_number, next.family_head_name),
        before,
        after,
      }),
    ],
    CONFLICT,
  )
  if (result instanceof Response) return result

  return c.json<FamilyResponse>({ family: await mustFind(c, id) })
})

// Hanya KK tanpa anggota, mis. KK yang salah dibuat. Anggota yang pindah atau
// meninggal tetap tercatat di KK-nya, sehingga KK seperti itu tidak bisa dihapus.
families.delete('/:id', requireRole('ADMIN'), async (c) => {
  const id = positiveInt(c.req.param('id'))
  const db = c.env.DB
  const family = id
    ? await db
        .prepare(
          `SELECT f.kk_number, f.family_head_name, f.rayon_id, r.name AS rayon_name,
                  f.address, f.phone,
                  (SELECT COUNT(*) FROM members m WHERE m.family_id = f.id) AS members
           FROM families f JOIN rayons r ON r.id = f.rayon_id WHERE f.id = ?1`,
        )
        .bind(id)
        .first<StoredFamily & { members: number }>()
    : null
  if (!id || !family) return c.json<ApiErrorBody>({ error: 'Kartu Keluarga tidak ditemukan.' }, 404)
  if (family.members > 0) {
    return c.json<ApiErrorBody>(
      {
        error: `Kartu Keluarga ini masih memiliki ${family.members} anggota. Pindahkan atau hapus anggotanya terlebih dahulu.`,
      },
      409,
    )
  }

  await db.batch([
    db.prepare('DELETE FROM families WHERE id = ?1').bind(id),
    auditStatement(c, {
      action: 'DELETE',
      entityType: 'families',
      entityId: id,
      label: familyLabel(family.kk_number, family.family_head_name),
      before: familyAuditView(family, family.rayon_name),
    }),
  ])
  return c.body(null, 204)
})

// Rayon harus ada dan dalam cakupan Majelis, nomor KK belum dipakai KK lain, dan
// nama kepala keluarga tidak bertentangan dengan anggota berperan Kepala Keluarga.
// Mengembalikan nama rayon untuk Log Aktivitas, atau respons error.
async function checkAgainstDatabase(
  c: Ctx,
  next: FamilyFields,
  excludeId: number | null,
  current?: StoredFamily,
) {
  const db = c.env.DB
  const [rayon, taken, head] = await db.batch([
    db.prepare('SELECT name FROM rayons WHERE id = ?1').bind(next.rayon_id),
    db
      .prepare(
        `SELECT family_head_name, rayon_id FROM families
         WHERE ?1 IS NOT NULL AND kk_number = ?1 AND id IS NOT ?2`,
      )
      .bind(next.kk_number, excludeId),
    db
      .prepare(
        `SELECT full_name FROM members
         WHERE family_id = ?1 AND family_relation = 'HEAD' AND status = 'ACTIVE'`,
      )
      .bind(excludeId),
  ])

  const rayonName = (rayon.results[0] as { name: string } | undefined)?.name
  if (!rayonName) {
    return invalid(c, 'Data Kartu Keluarga belum benar.', { rayon_id: ['Rayon tidak ditemukan.'] })
  }
  const scope = rayonScope(c.get('user'))
  if (!inScope(scope, next.rayon_id)) return outsideRayon(c, `Rayon ${rayonName}`)

  const duplicate = taken.results[0] as { family_head_name: string; rayon_id: number } | undefined
  if (duplicate) {
    const owner = inScope(scope, duplicate.rayon_id)
      ? `keluarga ${duplicate.family_head_name}`
      : 'keluarga di rayon lain'
    return c.json<ApiErrorBody>(
      {
        error: 'Nomor KK sudah dipakai.',
        details: { kk_number: [`Nomor KK ini sudah terdaftar untuk ${owner}.`] },
      },
      409,
    )
  }

  // Nama kepala keluarga mengikuti data anggotanya; ubah lewat data anggota tersebut.
  const headName = (head.results[0] as { full_name: string } | undefined)?.full_name
  if (
    current &&
    headName &&
    next.family_head_name !== current.family_head_name &&
    next.family_head_name !== headName
  ) {
    return c.json<ApiErrorBody>(
      {
        error: 'Nama kepala keluarga mengikuti data anggota.',
        details: {
          family_head_name: [
            `Kepala Keluarga KK ini adalah ${headName}. Ubah namanya lewat data anggota tersebut.`,
          ],
        },
      },
      409,
    )
  }

  return { rayonName }
}

async function mustFind(c: Ctx, id: number) {
  const family = await findFamilyDetail(c.env.DB, id)
  if (!family) throw new Error(`Kartu Keluarga ${id} tidak ditemukan setelah disimpan`)
  return family
}

export default families
