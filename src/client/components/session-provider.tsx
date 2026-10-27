import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import type { SessionUser } from '@shared/types'
import { configureApi } from '@/lib/api'
import {
  PREVIEW_ENABLED,
  PREVIEW_USERS,
  SessionContext,
  readPreviewRole,
  storePreviewRole,
  useSession,
  type SessionContextValue,
} from '@/lib/session'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => {
    const role = readPreviewRole()
    return role ? PREVIEW_USERS[role] : null
  })

  // Respons 401 dari API berarti sesi berakhir: kosongkan pengguna agar diarahkan ke /login.
  useEffect(() => {
    configureApi({ onUnauthorized: () => setUser(null) })
  }, [])

  const value: SessionContextValue = {
    user,
    signOut: () => {
      storePreviewRole('none')
      setUser(null)
    },
    previewAs: PREVIEW_ENABLED
      ? (role) => {
          storePreviewRole(role)
          setUser(PREVIEW_USERS[role])
        }
      : null,
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useSession()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
