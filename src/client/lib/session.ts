import { createContext, useContext } from 'react'
import type { LoginRequest, SessionUser, UserRole } from '@shared/types'

// Sesi pengurus. Token sesi ada di cookie HttpOnly yang dikelola server; frontend
// hanya mengetahui pengguna yang sedang masuk dari GET /api/auth/me.

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous'

export type SessionContextValue = {
  user: SessionUser | null
  status: SessionStatus
  login: (input: LoginRequest) => Promise<SessionUser>
  logout: () => Promise<void>
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession harus dipakai di dalam <SessionProvider>')
  return session
}

// Pengguna yang pasti sudah masuk; hanya untuk komponen di bawah <RequireAuth>.
export function useCurrentUser(): SessionUser {
  const { user } = useSession()
  if (!user) throw new Error('useCurrentUser dipakai di luar <RequireAuth>')
  return user
}

// Apakah pengguna yang sedang masuk memegang salah satu peran ini. Hanya untuk
// menyembunyikan menu dan tombol; pembatasan sebenarnya selalu ditegakkan API.
export function useCan(roles: readonly UserRole[]): boolean {
  const { user } = useSession()
  return user !== null && roles.includes(user.role)
}
