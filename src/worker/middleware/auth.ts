import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import { ROLE_LABELS, type ApiErrorBody, type SessionUser, type UserRole } from '../../shared/types'
import {
  SESSION_REFRESH_BELOW_HOURS,
  clearSessionCookie,
  extendSession,
  findSession,
  readSessionToken,
  setSessionCookie,
  toSessionUser,
} from '../lib/session'
import type { AppEnv } from '../types'

type AuthResult = { ok: true; user: SessionUser } | { ok: false; error: string }

// Memeriksa token sesi dari cookie atau header Authorization: Bearer. Bila sah,
// mengisi c.var.user dan c.var.sessionId. Dipakai langsung oleh rute yang hanya
// sebagian terproteksi (mis. berkas privat); rute lain memakai requireAuth.
export async function authenticate(c: Context<AppEnv>): Promise<AuthResult> {
  const existing = c.get('user') as SessionUser | undefined
  if (existing) return { ok: true, user: existing }

  const credential = readSessionToken(c)
  if (!credential) return { ok: false, error: 'Silakan masuk terlebih dahulu.' }

  const session = await findSession(c.env.DB, credential.token)
  if (!session) {
    if (credential.fromCookie) clearSessionCookie(c)
    return { ok: false, error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' }
  }

  // Trigger trg_users_deactivated sudah menghapus sesi saat akun dinonaktifkan;
  // pemeriksaan ini pengaman tambahan bila status diubah dengan cara lain.
  if (session.is_active !== 1) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(session.id).run()
    if (credential.fromCookie) clearSessionCookie(c)
    return { ok: false, error: 'Akun Anda telah dinonaktifkan. Hubungi Admin jemaat.' }
  }

  if (session.hours_left < SESSION_REFRESH_BELOW_HOURS) {
    await extendSession(c.env.DB, session.session_id)
    if (credential.fromCookie) setSessionCookie(c, credential.token)
  }

  const user = toSessionUser(session)
  c.set('user', user)
  c.set('sessionId', session.session_id)
  return { ok: true, user }
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const result = await authenticate(c)
  if (!result.ok) return c.json<ApiErrorBody>({ error: result.error }, 401)
  await next()
})

// RBAC: hanya peran yang disebut yang boleh lanjut. Sudah termasuk autentikasi,
// sehingga bisa dipakai tanpa requireAuth di depannya.
export function requireRole(...roles: UserRole[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const result = await authenticate(c)
    if (!result.ok) return c.json<ApiErrorBody>({ error: result.error }, 401)
    if (!roles.includes(result.user.role)) {
      const allowed = roles.map((role) => ROLE_LABELS[role]).join(', ')
      return c.json<ApiErrorBody>(
        { error: `Akses ditolak. Tindakan ini hanya untuk ${allowed}.` },
        403,
      )
    }
    await next()
  })
}
