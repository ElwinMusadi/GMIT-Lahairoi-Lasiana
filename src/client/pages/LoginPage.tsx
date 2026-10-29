import { useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { siteInput } from '@/components/portal/kage/field'
import { PillButton, PillLink } from '@/components/portal/kage/pill'
import { Reveal } from '@/components/portal/kage/reveal'
import { TwoToneHeading } from '@/components/portal/kage/two-tone-heading'
import { BrandPill } from '@/components/portal/site-header'
import { ThemeToggle } from '@/components/portal/theme-toggle'
import { ApiError, errorMessage } from '@/lib/api'
import { CHURCH_PHOTO } from '@/lib/portal'
import { useBackgroundParallax, usePortalMotion } from '@/lib/portal-motion'
import { usePortalTheme } from '@/lib/portal-theme'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

type FieldErrors = { identifier?: string; password?: string }

// Bagian halaman muncul berurutan (seperti halaman login 08), 80 ms per langkah.
const stagger = (step: number) => ({ transitionDelay: `${step * 80}ms` })

// Masuk pengurus bergaya kage. Desktop: formulir di kolom kiri, panel foto gereja di kanan
// dengan kartu kaca "Siapa yang bisa masuk". Ponsel: foto menjadi pita pendek di atas
// formulir dan kartu peran pindah ke bawahnya. Tema dan lapisan gerak mengikuti portal.
export default function LoginPage() {
  usePortalTheme()
  usePortalMotion()
  const photo = useRef<HTMLImageElement>(null)
  useBackgroundParallax(photo, 120)

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
    <div className="grid min-h-[calc(100svh/var(--site-zoom,1))] bg-site-canvas font-site-body text-site-ink lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr_auto]">
      <header className="flex items-center justify-between gap-2 px-(--site-inset) pt-(--site-inset) lg:col-start-1 lg:row-start-1">
        <BrandPill />
        <ThemeToggle />
      </header>

      {/* Foto gereja: pita pendek di ponsel, kolom kanan setinggi layar di desktop. Kartu
          peran di bawah menumpang di atasnya pada sel grid yang sama. */}
      <div
        aria-hidden="true"
        className="px-(--site-hero-gap) pt-4 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:p-(--site-hero-gap)"
      >
        <div className="relative h-40 overflow-hidden rounded-3xl bg-site-night sm:h-56 lg:h-full">
          <img
            ref={photo}
            data-parallax-bg
            src={CHURCH_PHOTO.src}
            srcSet={CHURCH_PHOTO.srcSet}
            sizes="(min-width: 1024px) 58vw, 100vw"
            alt=""
            fetchPriority="high"
            decoding="async"
          />
          <div className="site-login-scrim absolute inset-0 hidden lg:block" />
        </div>
      </div>

      <main className="px-(--site-inset) py-12 md:py-16 lg:col-start-1 lg:row-span-2 lg:row-start-2 lg:self-center">
        <div className="mx-auto grid max-w-[440px] gap-8 lg:mx-0">
          <Reveal className="grid gap-4">
            <TwoToneHeading as="h1" size="card" lead="Masuk" accent="pengurus." />
            <p className="text-lg leading-relaxed text-site-ink/80">
              Untuk Admin, Bendahara, Pendeta, dan Majelis GMIT Jemaat Lahairoi.
            </p>
          </Reveal>

          <Reveal
            as="form"
            noValidate
            onSubmit={handleSubmit}
            style={stagger(1)}
            className="grid gap-5"
          >
            <div className="grid gap-2">
              <label htmlFor="identifier" className="text-sm font-semibold">
                Email atau username
              </label>
              <input
                ref={identifierRef}
                id="identifier"
                name="identifier"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={Boolean(fieldErrors.identifier)}
                aria-describedby={fieldErrors.identifier ? 'identifier-error' : undefined}
                className={siteInput}
              />
              {fieldErrors.identifier && (
                <p id="identifier-error" className="text-sm text-destructive">
                  {fieldErrors.identifier}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm font-semibold">
                Kata sandi
              </label>
              <div className="relative">
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  className={cn(siteInput, 'pr-14')}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  aria-pressed={showPassword}
                  aria-controls="password"
                  onClick={() => setShowPassword((shown) => !shown)}
                  className="absolute top-1/2 right-0.5 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-[10px] text-site-muted transition-colors outline-none hover:bg-site-paper hover:text-site-ink focus-visible:ring-3 focus-visible:ring-ring [&_svg]:size-5"
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div role="alert" aria-live="assertive">
              {formError && (
                <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-base text-destructive ring-1 ring-destructive/30">
                  {formError}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:flex sm:items-center sm:gap-6">
              <PillButton
                type="submit"
                size="lg"
                arrow={!submitting}
                disabled={submitting}
                className="sm:min-w-36"
              >
                {submitting ? 'Memeriksa…' : 'Masuk'}
              </PillButton>
              <p className="text-base leading-snug text-site-muted">
                Lupa kata sandi? Minta Admin jemaat mengatur ulang.
              </p>
            </div>
          </Reveal>

          <Reveal style={stagger(2)} className="justify-self-start">
            <PillLink to="/" tone="outline">
              <ArrowLeft aria-hidden="true" />
              Kembali ke portal
            </PillLink>
          </Reveal>
        </div>
      </main>

      <aside
        aria-labelledby="judul-peran"
        className="relative z-10 mx-(--site-hero-gap) mb-(--site-hero-gap) grid gap-6 rounded-3xl bg-site-paper p-6 md:p-8 lg:col-start-2 lg:row-start-3 lg:m-[calc(var(--site-hero-gap)+24px)] lg:max-w-[600px] lg:self-end lg:bg-site-glass lg:shadow-site-panel"
      >
        <Reveal as="h2" id="judul-peran" className="font-site-display text-xl font-bold">
          Siapa yang bisa masuk
        </Reveal>
        <ul className="grid gap-5 sm:grid-cols-2 sm:gap-x-8">
          {ROLE_ACCESS.map((item, index) => (
            <Reveal
              as="li"
              key={item.role}
              style={stagger(index + 1)}
              className="grid content-start gap-1"
            >
              <span className="font-site-display text-base font-bold">{item.role}</span>
              <span className="text-base leading-snug text-site-ink/80">{item.access}</span>
            </Reveal>
          ))}
        </ul>
        <Reveal as="p" style={stagger(5)} className="text-base leading-snug text-site-muted">
          Warga jemaat tidak perlu akun: warta, jadwal ibadah, dan renungan terbuka di portal.
        </Reveal>
      </aside>
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
  {
    role: 'Pendeta',
    access: 'Profil jemaat, layanan sakramen, renungan, dan data keuangan (hanya baca).',
  },
  {
    role: 'Majelis',
    access: 'Anggota jemaat di rayonnya, jadwal pelayanan, dan data keuangan (hanya baca).',
  },
]
