import { Hono, type Context } from 'hono'
import { parseRayonInput, type RayonFields } from '../../shared/congregation'
import type {
  ApiErrorBody,
  ApiList,
  Rayon,
  RayonListItem,
  RayonResponse,
  RayonStats,
} from '../../shared/types'
import { LAST_INSERT_ID, auditStatement, diffChanges } from '../lib/audit'
import { invalid, positiveInt, readJsonObject, runBatch } from '../lib/request'
import { authenticate, requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

// Rayon pelayanan (PRD: 5 rayon bawaan, dapat ditambah atau diubah). Daftarnya
// publik karena ditampilkan di portal; menambah, mengubah, dan menghapus khusus Admin.
const rayons = new Hono<AppEnv>()

type Ctx = Context<AppEnv>

const STATS_COLUMNS = `
  (SELECT COUNT(*) FROM families f WHERE f.rayon_id = r.id) AS family_count,
  (SELECT COUNT(*) FROM members m JOIN families f ON f.id = m.family_id
   WHERE f.rayon_id = r.id AND m.status = 'ACTIVE') AS member_count`

const DUPLICATE_NAME = 'Nama rayon sudah dipakai.'

rayons.get('/', async (c) => {
  // Jumlah KK dan jiwa per rayon hanya untuk pengurus yang sedang masuk.
  const signedIn = (await authenticate(c)).ok
  const { results } = await c.env.DB.prepare(
    `SELECT r.id, r.name, r.description, r.coordinator_name${signedIn ? `, ${STATS_COLUMNS}` : ''}
     FROM rayons r ORDER BY r.id`,
  ).all<RayonListItem>()
  return c.json<ApiList<RayonListItem>>({ data: results })
})

rayons.post('/', requireRole('ADMIN'), async (c) => {
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data rayon tidak valid.' }, 400)

  const { input, details } = parseRayonInput(body, 'create')
  if (Object.keys(details).length > 0) return invalid(c, 'Data rayon belum benar.', details)
  const next: RayonFields = {
    name: input.name ?? '',
    description: input.description ?? null,
    coordinator_name: input.coordinator_name ?? null,
  }

  const taken = await nameTaken(c, next.name, null)
  if (taken) return taken

  const db = c.env.DB
  const result = await runBatch(
    c,
    [
      db
        .prepare(
          `INSERT INTO rayons (name, description, coordinator_name)
           VALUES (?1, ?2, ?3) RETURNING id`,
        )
        .bind(next.name, next.description, next.coordinator_name),
      auditStatement(c, {
        action: 'CREATE',
        entityType: 'rayons',
        entityId: LAST_INSERT_ID,
        label: next.name,
        after: next,
      }),
    ],
    DUPLICATE_NAME,
  )
  if (result instanceof Response) return result

  const id = (result[0].results[0] as { id: number }).id
  return c.json<RayonResponse>({ rayon: await findRayon(db, id) }, 201)
})

// PRD menyebut PUT; PATCH diterima dengan arti yang sama. Field yang tidak dikirim
// tidak diubah.
rayons.on(['PUT', 'PATCH'], '/:id', requireRole('ADMIN'), async (c) => {
  const id = positiveInt(c.req.param('id'))
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data rayon tidak valid.' }, 400)

  const { input, details } = parseRayonInput(body, 'update')
  if (Object.keys(details).length > 0) return invalid(c, 'Data rayon belum benar.', details)
  if (Object.keys(input).length === 0) {
    return c.json<ApiErrorBody>({ error: 'Tidak ada data yang diubah.' }, 400)
  }

  const db = c.env.DB
  const current = id
    ? await db
        .prepare('SELECT name, description, coordinator_name FROM rayons WHERE id = ?1')
        .bind(id)
        .first<RayonFields>()
    : null
  if (!id || !current) return c.json<ApiErrorBody>({ error: 'Rayon tidak ditemukan.' }, 404)

  const next: RayonFields = { ...current, ...input }
  if (Object.keys(diffChanges(current, next)).length === 0) {
    return c.json<RayonResponse>({ rayon: await findRayon(db, id) })
  }

  const taken = await nameTaken(c, next.name, id)
  if (taken) return taken

  const result = await runBatch(
    c,
    [
      db
        .prepare(
          `UPDATE rayons SET name = ?2, description = ?3, coordinator_name = ?4 WHERE id = ?1`,
        )
        .bind(id, next.name, next.description, next.coordinator_name),
      auditStatement(c, {
        action: 'UPDATE',
        entityType: 'rayons',
        entityId: id,
        label: next.name,
        before: current,
        after: next,
      }),
    ],
    DUPLICATE_NAME,
  )
  if (result instanceof Response) return result

  return c.json<RayonResponse>({ rayon: await findRayon(db, id) })
})

// Hanya rayon yang belum dipakai data apa pun, mis. rayon yang salah dibuat.
// Rayon yang masih berisi KK, Majelis, jadwal ibadah, atau peminjaman aset ditolak.
rayons.delete('/:id', requireRole('ADMIN'), async (c) => {
  const id = positiveInt(c.req.param('id'))
  const db = c.env.DB
  const rayon = id
    ? await db
        .prepare(
          `SELECT r.name, r.description, r.coordinator_name,
                  (SELECT COUNT(*) FROM families WHERE rayon_id = r.id) AS families,
                  (SELECT COUNT(*) FROM users WHERE rayon_id = r.id) AS users,
                  (SELECT COUNT(*) FROM worship_schedules WHERE rayon_id = r.id) AS worships,
                  (SELECT COUNT(*) FROM asset_loans WHERE rayon_id = r.id) AS loans
           FROM rayons r WHERE r.id = ?1`,
        )
        .bind(id)
        .first<RayonFields & { families: number; users: number; worships: number; loans: number }>()
    : null
  if (!id || !rayon) return c.json<ApiErrorBody>({ error: 'Rayon tidak ditemukan.' }, 404)

  const usage = [
    [rayon.families, 'Kartu Keluarga'],
    [rayon.users, 'akun pengurus'],
    [rayon.worships, 'jadwal ibadah'],
    [rayon.loans, 'catatan peminjaman aset'],
  ]
    .filter(([count]) => Number(count) > 0)
    .map(([count, what]) => `${count} ${what}`)
  if (usage.length > 0) {
    return c.json<ApiErrorBody>(
      {
        error: `Rayon ${rayon.name} masih dipakai oleh ${usage.join(', ')}. Pindahkan datanya ke rayon lain terlebih dahulu.`,
      },
      409,
    )
  }

  const before: RayonFields = {
    name: rayon.name,
    description: rayon.description,
    coordinator_name: rayon.coordinator_name,
  }
  await db.batch([
    db.prepare('DELETE FROM rayons WHERE id = ?1').bind(id),
    auditStatement(c, {
      action: 'DELETE',
      entityType: 'rayons',
      entityId: id,
      label: rayon.name,
      before,
    }),
  ])
  return c.body(null, 204)
})

// Nama rayon unik tanpa membedakan huruf besar/kecil (kolom COLLATE NOCASE).
async function nameTaken(c: Ctx, name: string, excludeId: number | null) {
  const row = await c.env.DB.prepare('SELECT name FROM rayons WHERE name = ?1 AND id IS NOT ?2')
    .bind(name, excludeId)
    .first<{ name: string }>()
  if (!row) return null
  return c.json<ApiErrorBody>(
    { error: DUPLICATE_NAME, details: { name: [`Rayon ${row.name} sudah ada.`] } },
    409,
  )
}

async function findRayon(db: D1Database, id: number): Promise<Rayon & RayonStats> {
  const row = await db
    .prepare(
      `SELECT r.id, r.name, r.description, r.coordinator_name, ${STATS_COLUMNS}
       FROM rayons r WHERE r.id = ?1`,
    )
    .bind(id)
    .first<Rayon & RayonStats>()
  if (!row) throw new Error(`Rayon ${id} tidak ditemukan setelah disimpan`)
  return row
}

export default rayons
