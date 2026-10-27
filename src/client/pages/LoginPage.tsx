import { useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { WellMark, Wordmark } from '@/components/brand/well'
import { portalButton } from '@/components/portal/site-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, errorMessage } from '@/lib/api'
import { usePortalTheme } from '@/lib/portal-theme'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

const fieldClass = 'h-12 rounded-full border-input bg-card px-5 text-base md:text-base dark:bg-card'

type FieldErrors = { identifier?: string; password?: string }

export default function LoginPage() {
  usePortalTheme()
  const { status, login } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const identifierRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  if (status === 'authenticated') return <Navigate to={from} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const identifier = String(form.get('identifier') ?? '').trim()
    const password = String(form.get('password') ?? '')

    const errors: FieldErrors = {}
    if (!identifier) errors.identifier = 'Isi email atau username Anda.'
    if (!password) errors.password = 'Isi kata sandi Anda.'
    setFieldErrors(errors)
    setFormError(null)
    if (errors.identifier) return identifierRef.current?.focus()
    if (errors.password) return passwordRef.current?.focus()

    setSubmitting(true)
    try {
      await login({ identifier, password })
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setFieldErrors({
          identifier: err.details.identifier?.[0],
          password: err.details.password?.[0],
        })
      }
      setFormError(errorMessage(err))
      // Kata sandi salah: kosongkan dan fokuskan agar bisa langsung diketik ulang.
      if (passwordRef.current && (!(err instanceof ApiError) || err.status === 401)) {
        passwordRef.current.value = ''
        passwordRef.current.focus()
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col px-4 py-5 sm:px-6 lg:px-8">
      <header>
        <Wordmark className="rise-in" />
      </header>

      <main className="grid flex-1 content-center gap-x-8 gap-y-16 py-16 lg:grid-cols-12">
        <div className="grid gap-10 lg:col-span-5">
          <div className="rise-in grid gap-6 [--rise-delay:80ms]">
            <h1 className="text-step-display leading-[0.95] font-medium tracking-[-0.035em]">
              Masuk
              <br />
              pengurus
            </h1>
            <p className="text-step-lead leading-snug">
              Untuk Admin, Bendahara, Pendeta, dan Majelis GMIT Jemaat Lahairoi.
            </p>
          </div>

          <form
            noValidate
            onSubmit={handleSubmit}
            className="rise-in grid gap-6 [--rise-delay:160ms]"
          >
            <div className="grid gap-2.5">
              <Label htmlFor="identifier" className="text-step-body">
                Email atau username
              </Label>
              <Input
                ref={identifierRef}
                id="identifier"
                name="identifier"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={Boolean(fieldErrors.identifier)}
                aria-describedby={fieldErrors.identifier ? 'identifier-error' : undefined}
                className={fieldClass}
              />
              {fieldErrors.identifier && (
                <p id="identifier-error" className="text-step-body text-destructive">
                  {fieldErrors.identifier}
                </p>
              )}
            </div>

            <div className="grid gap-2.5">
              <Label htmlFor="password" className="text-step-body">
                Kata sandi
              </Label>
              <div className="relative">
                <Input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  className={cn(fieldClass, 'pr-14')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  aria-pressed={showPassword}
                  aria-controls="password"
                  onClick={() => setShowPassword((shown) => !shown)}
                  className="absolute top-1/2 right-1 size-10 -translate-y-1/2 rounded-full"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="text-step-body text-destructive">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div role="alert" aria-live="assertive">
              {formError && (
                <p className="flex items-start gap-3 text-step-body text-destructive">
                  <WellMark className="mt-1.5 size-3 shrink-0" />
                  {formError}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:flex sm:items-center sm:gap-8">
              <Button
                type="submit"
                disabled={submitting}
                className={cn(portalButton, 'sm:min-w-40')}
              >
                {submitting ? 'Memeriksa…' : 'Masuk'}
              </Button>
              <p className="text-step-body text-muted-foreground">
                Lupa kata sandi? Minta Admin jemaat mengatur ulang.
              </p>
            </div>
          </form>

          <Link to="/" className="justify-self-start text-step-body underline underline-offset-8">
            Kembali ke portal
          </Link>
        </div>

        <section
          aria-labelledby="judul-peran"
          className="grid content-start gap-6 lg:col-span-6 lg:col-start-7 lg:self-end"
        >
          <h2
            id="judul-peran"
            className="rise-in text-step-lead font-medium [--rise-delay:240ms]"
          >
            Siapa yang bisa masuk
          </h2>
          <ul className="grid gap-6">
            {ROLE_ACCESS.map((item, index) => (
              <li
                key={item.role}
                style={{ '--rise-delay': `${300 + index * 70}ms` } as CSSProperties}
                className="rise-in grid grid-cols-[1.25rem_1fr] gap-x-3 gap-y-1"
              >
                <WellMark className="mt-1.5 size-3.5 text-brand" />
                <span className="text-step-body font-semibold">{item.role}</span>
                <span className="col-start-2 text-step-body">{item.access}</span>
              </li>
            ))}
          </ul>
          <p className="text-step-body text-muted-foreground">
            Warga jemaat tidak perlu akun: warta, jadwal ibadah, dan renungan terbuka di portal.
          </p>
        </section>
      </main>
    </div>
  )
}

// Ringkasan hak akses per peran dari PRD (Autentikasi & Manajemen Hak Akses).
const ROLE_ACCESS = [
  { role: 'Admin', access: 'Akun pengurus, data jemaat dan Kartu Keluarga, serta konten portal.' },
  {
    role: 'Bendahara',
    access: 'Pos Kas, RAPBJ, transaksi kas masuk dan keluar, laporan keuangan.',
  },
  { role: 'Pendeta', access: 'Profil jemaat, layanan sakramen, renungan, dan laporan keuangan.' },
  {
    role: 'Majelis',
    access: 'Anggota jemaat di rayonnya, jadwal pelayanan, dan laporan keuangan.',
  },
]
