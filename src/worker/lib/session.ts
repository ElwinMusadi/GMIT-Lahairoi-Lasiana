import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { SessionUser, UserRole } from '../../shared/types'
import type { AppEnv } from '../types'

// Sesi login berbasis token acak (bukan JWT) yang disimpan di D1 sebagai hash
// SHA-256. Dengan begitu logout dan penonaktifan akun berlaku seketika.
//
// Sesi berlaku 12 jam sejak aktivitas terakhir: bila sisa waktunya di bawah 6 jam,
// setiap request terautentikasi memperpanjangnya lagi.

export const SESSION_TTL_HOURS = 12
export const SESSION_REFRESH_BELOW_HOURS = 6
const COOKIE_NAME = 'gmit_session'

type Ctx = Context<AppEnv>

export type UserRow = {
  id: number
  name: string
  email: string | null
  username: string | null
  role: UserRole
  rayon_id: number | null
  is_active: number
}

export type SessionRow = UserRow & {
  session_id: number
  hours_left: number
}

export function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username,
    role: row.role,
    rayon_id: row.rayon_id,
  }
}

// Di HTTPS cookie memakai prefiks __Host- (wajib Secure, Path=/, tanpa Domain) agar
// tidak bisa ditimpa subdomain lain. Dev server lokal memakai http://localhost.
function isSecure(c: Ctx) {
  return new URL(c.req.url).protocol === 'https:'
}

export function readSessionToken(c: Ctx): { token: string; fromCookie: boolean } | null {
  const header = c.req.header('Authorization')
  if (header?.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim()
    return token ? { token, fromCookie: false } : null
  }
  const token = isSecure(c) ? getCookie(c, COOKIE_NAME, 'host') : getCookie(c, COOKIE_NAME)
  return token ? { token, fromCookie: true } : null
}

export function setSessionCookie(c: Ctx, token: string) {
  const secure = isSecure(c)
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL_HOURS * 60 * 60,
    prefix: secure ? 'host' : undefined,
  })
}

export function clearSessionCookie(c: Ctx) {
  const secure = isSecure(c)
  deleteCookie(c, COOKIE_NAME, { path: '/', secure, prefix: secure ? 'host' : undefined })
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function createSession(c: Ctx, userId: number): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const token = btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')

  await c.env.DB.prepare(
    `INSERT INTO sessions (token_hash, user_id, expires_at, ip_address, user_agent)
     VALUES (?1, ?2, datetime('now', ?3), ?4, ?5)`,
  )
    .bind(
      await hashToken(token),
      userId,
      `+${SESSION_TTL_HOURS} hours`,
      c.req.header('CF-Connecting-IP') ?? null,
      c.req.header('User-Agent')?.slice(0, 255) ?? null,
    )
    .run()
  return token
}

export async function findSession(db: D1Database, token: string): Promise<SessionRow | null> {
  return db
    .prepare(
      `SELECT s.id AS session_id,
              (julianday(s.expires_at) - julianday('now')) * 24 AS hours_left,
              u.id, u.name, u.email, u.username, u.role, u.rayon_id, u.is_active
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?1 AND s.expires_at > datetime('now')`,
    )
    .bind(await hashToken(token))
    .first<SessionRow>()
}

export async function extendSession(db: D1Database, sessionId: number) {
  await db
    .prepare(
      `UPDATE sessions SET expires_at = datetime('now', ?2), last_seen_at = datetime('now')
       WHERE id = ?1`,
    )
    .bind(sessionId, `+${SESSION_TTL_HOURS} hours`)
    .run()
}

export async function deleteSession(db: D1Database, token: string) {
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(await hashToken(token)).run()
}
