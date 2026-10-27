import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { USER_ROLES, ROLE_LABELS } from '@shared/types'
import { WellMark, Wordmark } from '@/components/brand/well'
import { portalButton } from '@/components/portal/site-header'
import { Button } from '@/components/ui/button'
import { usePortalTheme } from '@/lib/portal-theme'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

// Formulir masuk dibangun di modul Autentikasi. Di mode pengembangan halaman ini
// menyediakan pratinjau per peran agar dashboard dapat diperiksa.
export default function LoginPage() {
  usePortalTheme()
  const { user, previewAs } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  if (user) return <Navigate to={from} replace />

  return (
    <div className="relative isolate flex min-h-svh flex-col overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <WellMark className="ring-in pointer-events-none absolute top-1/2 -right-[60svh] -z-10 hidden size-[120svh] -translate-y-1/2 text-brand lg:block" />
      <Wordmark />
      <main className="grid flex-1 content-center gap-8 py-16 lg:max-w-[40rem]">
        <h1 className="text-step-head leading-[1.05] font-medium tracking-[-0.025em]">
          Masuk pengurus
        </h1>
        <p className="text-step-lead leading-snug">
          Untuk Admin, Bendahara, Pendeta, dan Majelis GMIT Jemaat Lahairoi.
        </p>

        {previewAs ? (
          <div className="grid gap-4">
            <p className="text-step-body text-muted-foreground">
              Mode pengembangan: formulir masuk belum dibangun. Pilih peran untuk melihat
              dashboard sebagai peran tersebut.
            </p>
            <div className="flex flex-wrap gap-3">
              {USER_ROLES.map((role) => (
                <Button
                  key={role}
                  variant="outline"
                  className={cn(portalButton, 'border-foreground/30')}
                  onClick={() => {
                    previewAs(role)
                    navigate(from, { replace: true })
                  }}
                >
                  {ROLE_LABELS[role]}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-step-body text-muted-foreground">
            Formulir masuk sedang disiapkan. Hubungi Admin jemaat bila Anda membutuhkan akses.
          </p>
        )}

        <Link to="/" className="text-step-body underline underline-offset-8">
          Kembali ke portal
        </Link>
      </main>
    </div>
  )
}
