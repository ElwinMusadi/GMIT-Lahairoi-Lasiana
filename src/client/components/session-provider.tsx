import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import type { AuthResponse, SessionUser } from '@shared/types'
import { WellMark } from '@/components/brand/well'
import { api, configureApi } from '@/lib/api'
import {
  SessionContext,
  useSession,
  type SessionContextValue,
  type SessionStatus,
} from '@/lib/session'

type SessionState = { status: SessionStatus; user: SessionUser | null }

const ANONYMOUS: SessionState = { status: 'anonymous', user: null }

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading', user: null })

  useEffect(() => {
    // Respons 401 dari endpoint terproteksi berarti sesi berakhir atau akun dinonaktifkan.
    configureApi({ onUnauthorized: () => setState(ANONYMOUS) })

    const controller = new AbortController()
    api
      .get<AuthResponse>('/auth/me', { auth: false, signal: controller.signal })
      .then(({ user }) => setState({ status: 'authenticated', user }))
      .catch(() => {
        if (!controller.signal.aborted) setState(ANONYMOUS)
      })
    return () => controller.abort()
  }, [])

  const value: SessionContextValue = {
    ...state,
    login: async (input) => {
      const { user } = await api.post<AuthResponse>('/auth/login', input, { auth: false })
      setState({ status: 'authenticated', user })
      return user
    },
    logout: async () => {
      try {
        await api.post('/auth/logout', undefined, { auth: false })
      } finally {
        setState(ANONYMOUS)
      }
    },
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="grid min-h-svh place-items-center" role="status">
        <WellMark className="size-8 text-brand" />
        <span className="sr-only">Memeriksa sesi…</span>
      </div>
    )
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}
