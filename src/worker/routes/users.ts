import { Hono, type Context } from 'hono'
import {
  parseAccountInput,
  validateAccount,
  type AccountFields,
  type FieldErrors,
} from '../../shared/accounts'
import type { ApiErrorBody, ApiList, UserListItem, UserMutationResponse } from '../../shared/types'
import { LAST_INSERT_ID, auditStatement, diffChanges } from '../lib/audit'
import { generateTemporaryPassword, hashPassword } from '../lib/password'
import { readJsonObject, runBatch } from '../lib/request'
import { requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

// Manajemen Akun Pengurus: hanya Admin (PRD, Autentikasi & Hak Akses). Akun tidak
// pernah dihapus, hanya dinonaktifkan, agar riwayatnya di audit_logs tetap utuh.
const users = new Hono<AppEnv>()

users.use(requireRole('ADMIN'))

type Ctx = Context<AppEnv>
type UserListRow = Omit<UserListItem, 'is_active'> & { is_active: number }

const USER_SELECT = `
  SELECT u.id, u.name, u.email, u.username, u.role, u.rayon_id, r.name AS rayon_name,
         u.is_active, strftime('%Y-%m-%dT%H:%M:%SZ', u.created_at) AS created_at,
         (SELECT strftime('%Y-%m-%dT%H:%M:%SZ', MAX(a.created_at)) FROM audit_logs a
          WHERE a.user_id = u.id AND a.action = 'LOGIN') AS last_login_at
  FROM users u
  LEFT JOIN rayons r ON r.id = u.rayon_id`

// Dua Admin menyimpan email/username yang sama bersamaan.
const TAKEN = 'Email atau username sudah dipakai akun lain.'

users.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `${USER_SELECT} ORDER BY u.is_active DESC, u.name`,
  ).all<UserListRow>()
  return c.json<ApiList<UserListItem>>({ data: results.map(toListItem) })
})

users.post('/', async (c) => {
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data akun tidak valid.' }, 400)

  const { input, details } = parseAccountInput(body, 'create')
  const next: AccountFields = {
    name: input.name ?? '',
    email: input.email ?? null,
    username: input.username ?? null,
    role: input.role ?? 'ELDER',
    rayon_id: input.rayon_id ?? null,
  }
  validateAccount(next, details)
  if (Object.keys(details).length > 0) return invalid(c, details)

  const checked = await checkAgainstDatabase(c, next, null)
  if (checked instanceof Response) return checked

  const temporaryPassword = input.password === undefined ? generateTemporaryPassword() : undefined
  const passwordHash = await hashPassword(input.password ?? temporaryPassword ?? '')

  const db = c.env.DB
  const result = await runBatch(
    c,
    [
      db
        .prepare(
          `INSERT INTO users (name, email, username, password_hash, role, rayon_id)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6) RETURNING id`,
        )
        .bind(next.name, next.email, next.username, passwordHash, next.role, next.rayon_id),
      auditStatement(c, {
        action: 'CREATE',
        entityType: 'users',
        entityId: LAST_INSERT_ID,
        label: next.name,
        after: auditView(next, checked.rayonName, true),
      }),
    ],
    TAKEN,
  )
  if (result instanceof Response) return result

  const user = await findUser(db, (result[0].results[0] as { id: number }).id)
  return c.json<UserMutationResponse>(
    { user, ...(temporaryPassword && { temporary_password: temporaryPassword }) },
    201,
  )
})

users.patch('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data akun tidak valid.' }, 400)

  const { input, details } = parseAccountInput(body, 'update')
  if (Object.keys(details).length > 0) return invalid(c, details)
  if (Object.keys(input).length === 0) {
    return c.json<ApiErrorBody>({ error: 'Tidak ada data yang diubah.' }, 400)
  }

  const db = c.env.DB
  const current = Number.isInteger(id)
    ? await db
        .prepare(
          `SELECT u.name, u.email, u.username, u.role, u.rayon_id, r.name AS rayon_name,
                  u.is_active, u.password_hash
           FROM users u LEFT JOIN rayons r ON r.id = u.rayon_id
           WHERE u.id = ?1`,
        )
        .bind(id)
        .first<
          AccountFields & { rayon_name: string | null; is_active: number; password_hash: string }
        >()
    : null
  if (!current) return c.json<ApiErrorBody>({ error: 'Akun tidak ditemukan.' }, 404)

  const next: AccountFields = {
    name: input.name ?? current.name,
    email: input.email !== undefined ? input.email : current.email,
    username: input.username !== undefined ? input.username : current.username,
    role: input.role ?? current.role,
    rayon_id: input.rayon_id !== undefined ? input.rayon_id : current.rayon_id,
  }
  const nextActive = input.is_active ?? current.is_active === 1
  validateAccount(next, details)
  if (Object.keys(details).length > 0) return invalid(c, details)

  // Admin tidak bisa mengunci dirinya sendiri. Karena pelakunya selalu Admin aktif,
  // aturan ini juga menjamin selalu tersisa minimal satu Admin aktif.
  if (id === c.get('user').id) {
    if (!nextActive) {
      return c.json<ApiErrorBody>(
        { error: 'Anda tidak dapat menonaktifkan akun Anda sendiri.' },
        409,
      )
    }
    if (next.role !== 'ADMIN') {
      return c.json<ApiErrorBody>(
        {
          error: 'Anda tidak dapat mengubah peran akun Anda sendiri. Minta Admin lain bila perlu.',
        },
        409,
      )
    }
  }

  const checked = await checkAgainstDatabase(c, next, id)
  if (checked instanceof Response) return checked

  const temporaryPassword = input.reset_password ? generateTemporaryPassword() : undefined
  const newPassword = input.password ?? temporaryPassword
  const passwordHash = newPassword ? await hashPassword(newPassword) : current.password_hash

  const before = auditView(
    current,
    current.rayon_name,
    current.is_active === 1,
    current.password_hash,
  )
  const after = auditView(next, checked.rayonName, nextActive, passwordHash)
  // Data yang dikirim sama dengan yang tersimpan: tidak ada yang disimpan maupun dicatat.
  if (Object.keys(diffChanges(before, after)).length === 0) {
    return c.json<UserMutationResponse>({ user: await findUser(db, id) })
  }

  const statements = [
    db
      .prepare(
        `UPDATE users
         SET name = ?2, email = ?3, username = ?4, role = ?5, rayon_id = ?6, is_active = ?7,
             password_hash = ?8, updated_at = datetime('now')
         WHERE id = ?1`,
      )
      .bind(
        id,
        next.name,
        next.email,
        next.username,
        next.role,
        next.rayon_id,
        nextActive ? 1 : 0,
        passwordHash,
      ),
  ]
  // Kata sandi baru menghentikan semua sesi akun itu, kecuali sesi yang sedang dipakai
  // bila Admin mengatur ulang kata sandinya sendiri. Sesi akun yang dinonaktifkan
  // dihapus oleh trigger trg_users_deactivated.
  if (newPassword) {
    statements.push(
      db
        .prepare('DELETE FROM sessions WHERE user_id = ?1 AND id != ?2')
        .bind(id, c.get('sessionId')),
    )
  }
  statements.push(
    auditStatement(c, {
      action: 'UPDATE',
      entityType: 'users',
      entityId: id,
      label: next.name,
      before,
      after,
    }),
  )

  const result = await runBatch(c, statements, TAKEN)
  if (result instanceof Response) return result

  return c.json<UserMutationResponse>({
    user: await findUser(db, id),
    ...(temporaryPassword && { temporary_password: temporaryPassword }),
  })
})

// Rayon harus ada, email dan username belum dipakai akun lain. Mengembalikan nama
// rayon untuk Log Aktivitas, atau respons error.
async function checkAgainstDatabase(c: Ctx, next: AccountFields, excludeId: number | null) {
  const db = c.env.DB
  const [rayon, taken] = await db.batch<{
    name: string
    email: string | null
    username: string | null
  }>([
    db.prepare('SELECT name FROM rayons WHERE id = ?1').bind(next.rayon_id),
    db
      .prepare(
        `SELECT email, username FROM users
         WHERE id IS NOT ?3
           AND ((?1 IS NOT NULL AND email = ?1) OR (?2 IS NOT NULL AND username = ?2))`,
      )
      .bind(next.email, next.username, excludeId),
  ])

  const rayonName = rayon.results[0]?.name ?? null
  if (next.rayon_id !== null && !rayonName) {
    return invalid(c, { rayon_id: ['Rayon tidak ditemukan.'] })
  }

  const details: FieldErrors = {}
  for (const row of taken.results) {
    if (next.email && row.email?.toLowerCase() === next.email) {
      details.email = ['Email ini sudah dipakai akun lain.']
    }
    if (next.username && row.username?.toLowerCase() === next.username) {
      details.username = ['Username ini sudah dipakai akun lain.']
    }
  }
  if (Object.keys(details).length > 0) {
    return c.json<ApiErrorBody>({ error: 'Email atau username sudah dipakai.', details }, 409)
  }
  return { rayonName }
}

// Bentuk akun di Log Aktivitas: nama rayon (bukan id) agar riwayatnya mudah dibaca.
// password_hash hanya dipakai untuk mendeteksi perubahan; nilainya disembunyikan.
function auditView(
  fields: AccountFields,
  rayonName: string | null,
  isActive: boolean,
  passwordHash?: string,
) {
  return {
    name: fields.name,
    email: fields.email,
    username: fields.username,
    role: fields.role,
    rayon: rayonName,
    is_active: isActive,
    ...(passwordHash && { password_hash: passwordHash }),
  }
}

async function findUser(db: D1Database, id: number): Promise<UserListItem> {
  const row = await db.prepare(`${USER_SELECT} WHERE u.id = ?1`).bind(id).first<UserListRow>()
  if (!row) throw new Error(`User ${id} tidak ditemukan setelah disimpan`)
  return toListItem(row)
}

function toListItem(row: UserListRow): UserListItem {
  return { ...row, is_active: row.is_active === 1 }
}

function invalid(c: Ctx, details: FieldErrors) {
  return c.json<ApiErrorBody>({ error: 'Data akun belum benar.', details }, 400)
}

export default users
