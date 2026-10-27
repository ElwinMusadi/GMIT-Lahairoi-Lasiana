import { createContext, useContext } from 'react'
import { USER_ROLES, type SessionUser, type UserRole } from '@shared/types'

// Sesi pengguna dashboard.
//
// Modul autentikasi (login, GET /api/auth/me) belum dibangun. Sampai saat itu,
// mode pengembangan memakai pengguna pratinjau yang perannya bisa diganti agar
// kerangka dashboard dapat diperiksa per peran. Build produksi tidak punya sesi
// sama sekali, sehingga /dashboard selalu diarahkan ke /login.

export const PREVIEW_ENABLED = import.meta.env.DEV

// Contoh data pengguna untuk pratinjau; diganti data dari API saat login dibangun.
export const PREVIEW_USERS: Record<UserRole, SessionUser> = {
  ADMIN: { id: 1, name: 'Yuliana Lado', email: 'admin@gmit-lahairoi.local', username: 'admin', role: 'ADMIN', rayon_id: null },
  TREASURER: { id: 2, name: 'Marthen Bire', email: null, username: 'bendahara', role: 'TREASURER', rayon_id: null },
  PASTOR: { id: 3, name: 'Pdt. Agustina Riwu Kaho', email: null, username: 'pendeta', role: 'PASTOR', rayon_id: null },
  ELDER: { id: 4, name: 'Yohanis Dimu', email: null, username: 'majelis.golgota', role: 'ELDER', rayon_id: 2 },
}

const PREVIEW_STORAGE_KEY = 'gmit:preview-role'

export function readPreviewRole(): UserRole | null {
  if (!PREVIEW_ENABLED) return null
  try {
    const stored = localStorage.getItem(PREVIEW_STORAGE_KEY)
    if (stored === 'none') return null
    return USER_ROLES.find((role) => role === stored) ?? 'ADMIN'
  } catch {
    return 'ADMIN'
  }
}

export function storePreviewRole(value: UserRole | 'none') {
  try {
    localStorage.setItem(PREVIEW_STORAGE_KEY, value)
  } catch {
    // Penyimpanan diblokir (mode privat): pilihan hanya berlaku sampai halaman dimuat ulang.
  }
}

export type SessionContextValue = {
  user: SessionUser | null
  signOut: () => void
  // Hanya tersedia di mode pengembangan.
  previewAs: ((role: UserRole) => void) | null
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
