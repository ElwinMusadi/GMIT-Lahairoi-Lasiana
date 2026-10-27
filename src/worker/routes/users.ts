import { Hono } from 'hono'
import type { ApiList, UserListItem, UserRole } from '../../shared/types'
import { requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

type UserListRow = Omit<UserListItem, 'is_active'> & { is_active: number; role: UserRole }

// Manajemen Akun Pengurus: hanya Admin (PRD, Autentikasi & Hak Akses).
const users = new Hono<AppEnv>()

users.use(requireRole('ADMIN'))

users.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.username, u.role, u.rayon_id, r.name AS rayon_name,
            u.is_active, u.created_at
     FROM users u
     LEFT JOIN rayons r ON r.id = u.rayon_id
     ORDER BY u.is_active DESC, u.name`,
  ).all<UserListRow>()

  return c.json<ApiList<UserListItem>>({
    data: results.map((row) => ({ ...row, is_active: row.is_active === 1 })),
  })
})

export default users
