import { Hono } from 'hono'
import type { ApiErrorBody, AuthResponse } from '../../shared/types'
import { recordAudit } from '../lib/audit'
import { verifyPassword } from '../lib/password'
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  findSession,
  readSessionToken,
  setSessionCookie,
  toSessionUser,
  type UserRow,
} from '../lib/session'
import { requireAuth } from '../middleware/auth'
import type { AppEnv } from '../types'

// Penguncian: setelah 5 kali gagal untuk satu email/username dalam 15 menit,
// percobaan berikutnya ditolak sampai jendela waktunya lewat.
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

const INVALID_CREDENTIALS = 'Email/username atau kata sandi salah.'

// Hash pembanding untuk identitas yang tidak dikenal, agar lama respons tidak
// membocorkan apakah sebuah akun ada: setiap percobaan menjalankan tepat satu
// PBKDF2. Ini hash dari string acak yang sudah dibuang, bukan rahasia.
const DUMMY_HASH =
  'pbkdf2_sha256$100000$xGEA3C131vaG227qDuMp7g==$bFTU9YdDwU/rhP7WwVWGjerm9iPYUdV6gYiA4ap1ajY='

const auth = new Hono<AppEnv>()

auth.post('/login', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  const identifier = typeof body?.identifier === 'string' ? body.identifier.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  const details: Record<string, string[]> = {}
  if (!identifier) details.identifier = ['Email atau username wajib diisi.']
  else if (identifier.length > 254) details.identifier = ['Email atau username terlalu panjang.']
  if (!password) details.password = ['Kata sandi wajib diisi.']
  else if (password.length > 1024) details.password = ['Kata sandi terlalu panjang.']
  if (Object.keys(details).length > 0) {
    return c.json<ApiErrorBody>({ error: 'Data masuk belum lengkap.', details }, 400)
  }

  const db = c.env.DB

  const failed = await db
    .prepare(
      `SELECT COUNT(*) AS attempts FROM audit_logs
       WHERE action = 'LOGIN_FAILED'
         AND created_at > datetime('now', ?2)
         AND json_extract(details_json, '$.identifier') = ?1`,
    )
    .bind(identifier, `-${LOCKOUT_MINUTES} minutes`)
    .first<{ attempts: number }>()
  if ((failed?.attempts ?? 0) >= MAX_FAILED_ATTEMPTS) {
    return c.json<ApiErrorBody>(
      {
        error: `Terlalu banyak percobaan masuk yang gagal. Coba lagi dalam ${LOCKOUT_MINUTES} menit.`,
      },
      429,
    )
  }

  // Kolom email dan username memakai COLLATE NOCASE.
  const user = await db
    .prepare(
      `SELECT id, name, email, username, role, rayon_id, is_active, password_hash
       FROM users WHERE email = ?1 OR username = ?1
       ORDER BY email = ?1 DESC LIMIT 1`,
    )
    .bind(identifier)
    .first<UserRow & { password_hash: string }>()

  const passwordMatches = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH)

  if (!user || !passwordMatches) {
    await recordAudit(c, {
      userId: user?.id ?? null,
      action: 'LOGIN_FAILED',
      entityType: 'users',
      entityId: user?.id ?? null,
      details: { identifier },
    })
    return c.json<ApiErrorBody>({ error: INVALID_CREDENTIALS }, 401)
  }

  // Status nonaktif baru diungkap setelah kata sandi terbukti benar.
  if (user.is_active !== 1) {
    await recordAudit(c, {
      userId: user.id,
      action: 'LOGIN_REJECTED_INACTIVE',
      entityType: 'users',
      entityId: user.id,
      details: { identifier },
    })
    return c.json<ApiErrorBody>(
      { error: 'Akun Anda dinonaktifkan. Hubungi Admin jemaat bila ini keliru.' },
      403,
    )
  }

  await db.prepare(`DELETE FROM sessions WHERE expires_at <= datetime('now')`).run()
  const token = await createSession(c, user.id)
  setSessionCookie(c, token)
  await recordAudit(c, { userId: user.id, action: 'LOGIN', entityType: 'users', entityId: user.id })

  return c.json<AuthResponse>({ user: toSessionUser(user) })
})

// Idempoten: selalu menghapus cookie, juga bila sesinya sudah tidak ada.
auth.post('/logout', async (c) => {
  const credential = readSessionToken(c)
  if (credential) {
    const session = await findSession(c.env.DB, credential.token)
    await deleteSession(c.env.DB, credential.token)
    if (session) {
      await recordAudit(c, {
        userId: session.id,
        action: 'LOGOUT',
        entityType: 'users',
        entityId: session.id,
      })
    }
  }
  clearSessionCookie(c)
  return c.body(null, 204)
})

auth.get('/me', requireAuth, (c) => c.json<AuthResponse>({ user: c.get('user') }))

export default auth
