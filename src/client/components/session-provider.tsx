import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { ROLE_LABELS, type AuthResponse, type SessionUser, type UserRole } from '@shared/types'
import { WellMark } from '@/components/brand/well'
import { api, configureApi } from '@/lib/api'
import {
  SessionContext,
  useCan,
  useCurrentUser,
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
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return children
}

// Guard halaman dashboard per peran (di dalam <RequireAuth>). Untuk peran lain,
// halamannya tidak dirender sama sekali, sehingga datanya juga tidak diminta.
export function RequireRole({
  roles,
  title,
  children,
}: {
  roles: readonly UserRole[]
  title: string
  children: ReactNode
}) {
  const user = useCurrentUser()
  if (roles.includes(user.role)) return children

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Akses dibatasi</h1>
      <p className="max-w-[60ch] text-sm text-muted-foreground">
        Halaman {title} hanya untuk {roles.map((role) => ROLE_LABELS[role]).join(', ')}. Anda masuk
        sebagai {ROLE_LABELS[user.role]}.
      </p>
      <Link to="/dashboard" className="text-sm font-medium underline underline-offset-4">
        Kembali ke Ringkasan
      </Link>
    </div>
  )
}

// Menampilkan isinya hanya untuk peran tertentu, mis. tombol Tambah/Ubah/Hapus:
//   <Can roles={['TREASURER']}><Button>Catat transaksi</Button></Can>
export function Can({ roles, children }: { roles: readonly UserRole[]; children: ReactNode }) {
  return useCan(roles) ? children : null
}
