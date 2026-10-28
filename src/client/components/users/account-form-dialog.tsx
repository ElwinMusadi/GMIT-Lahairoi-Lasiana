import { useRef, useState, type FormEvent } from 'react'
import {
  parseAccountInput,
  validateAccount,
  type AccountFields,
  type FieldErrors,
} from '@shared/accounts'
import {
  ROLE_LABELS,
  type Rayon,
  type UserListItem,
  type UserMutationResponse,
  type UserRole,
} from '@shared/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, api, errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

// Ringkasan hak akses per peran (PRD, Autentikasi & Hak Akses), agar Admin memilih
// peran berdasarkan apa yang boleh dilakukan, bukan hanya namanya.
const ROLE_OPTIONS: { role: UserRole; access: string }[] = [
  { role: 'ADMIN', access: 'Akun pengurus, data jemaat, konten portal' },
  { role: 'TREASURER', access: 'Pos Kas, transaksi, laporan keuangan' },
  { role: 'PASTOR', access: 'Profil jemaat, sakramen, renungan, keuangan (baca)' },
  { role: 'ELDER', access: 'Jemaat di rayonnya, jadwal, keuangan (baca)' },
]

const fieldClass = 'h-10 rounded-lg bg-card px-3 text-base md:text-sm'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Kosong berarti menambah akun baru.
  user?: UserListItem
  isSelf: boolean
  rayons: Rayon[]
  onSaved: (result: UserMutationResponse) => void
}

export function AccountFormDialog({ open, onOpenChange, user, isSelf, rayons, onSaved }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? `Ubah akun ${user.name}` : 'Tambah pengurus'}</DialogTitle>
          <DialogDescription>
            {user
              ? 'Perubahan peran dan rayon langsung berlaku, tanpa perlu masuk ulang.'
              : 'Akun untuk Admin, Bendahara, Pendeta, atau Majelis. Warga jemaat tidak perlu akun.'}
          </DialogDescription>
        </DialogHeader>
        {/* Dirender ulang setiap kali dialog dibuka, sehingga isian selalu mulai dari data akun. */}
        <AccountForm
          user={user}
          isSelf={isSelf}
          rayons={rayons}
          onCancel={() => onOpenChange(false)}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  )
}

function AccountForm({
  user,
  isSelf,
  rayons,
  onCancel,
  onSaved,
}: Omit<Props, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [role, setRole] = useState<UserRole | ''>(user?.role ?? '')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const mode = user ? 'update' : 'create'

  function focusFirstError(details: FieldErrors) {
    const order = ['name', 'role', 'rayon_id', 'email', 'username', 'password']
    const field = order.find((name) => details[name])
    const element = field ? formRef.current?.elements.namedItem(field) : null
    if (element instanceof RadioNodeList) (element[0] as HTMLElement | undefined)?.focus()
    else if (element instanceof HTMLElement) element.focus()
  }

  // Pesan error sebuah field hilang begitu field itu diubah. Pesan "email atau
  // username" dipasang di kedua field, jadi ikut hilang di pasangannya.
  function clearError(field: string) {
    if (!errors[field]) return
    const next = { ...errors }
    const partner = field === 'email' ? 'username' : field === 'username' ? 'email' : null
    if (partner && next[partner]?.[0] === next[field][0]) delete next[partner]
    delete next[field]
    setErrors(next)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const text = (name: string) => String(form.get(name) ?? '')
    const rayonId = text('rayon_id')
    const body: Record<string, unknown> = {
      name: text('name'),
      email: text('email'),
      username: text('username'),
      role,
      rayon_id: rayonId ? Number(rayonId) : null,
    }
    if (mode === 'create') body.password = text('password')

    // Aturan yang sama dengan API (src/shared/accounts.ts), diperiksa sebelum dikirim.
    const { input, details } = parseAccountInput(body, mode)
    const next: AccountFields = {
      name: input.name ?? '',
      email: input.email ?? null,
      username: input.username ?? null,
      role: input.role ?? 'ELDER',
      rayon_id: input.rayon_id ?? null,
    }
    validateAccount(next, details)
    setErrors(details)
    setFormError(null)
    if (Object.keys(details).length > 0) return focusFirstError(details)

    setSubmitting(true)
    try {
      const result = user
        ? await api.patch<UserMutationResponse>(`/users/${user.id}`, body)
        : await api.post<UserMutationResponse>('/users', body)
      onSaved(result)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.details).length > 0) {
        setErrors(err.details)
        focusFirstError(err.details)
      }
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const describedBy = (field: string, hint?: string) =>
    [hint, errors[field] ? `${field}-error` : null].filter(Boolean).join(' ') || undefined

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      onChange={({ target }: { target: EventTarget }) => {
        if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
          clearError(target.name)
        }
      }}
      className="grid gap-5"
    >
      <div className="grid gap-2">
        <Label htmlFor="name">Nama lengkap</Label>
        <Input
          id="name"
          name="name"
          defaultValue={user?.name}
          autoComplete="off"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy('name')}
          className={fieldClass}
        />
        <FieldError id="name-error" messages={errors.name} />
      </div>

      <fieldset
        className="grid gap-2"
        aria-describedby={describedBy('role', isSelf ? 'role-hint' : undefined)}
      >
        <legend className="mb-2 text-sm font-medium">Peran</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ROLE_OPTIONS.map((option) => (
            <label
              key={option.role}
              className={cn(
                'grid cursor-pointer grid-cols-[1rem_1fr] gap-x-2.5 gap-y-0.5 rounded-lg border border-input bg-card px-3 py-2.5',
                'has-checked:border-primary has-checked:ring-1 has-checked:ring-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                'has-disabled:cursor-not-allowed has-disabled:opacity-60',
              )}
            >
              <input
                type="radio"
                name="role"
                value={option.role}
                checked={role === option.role}
                onChange={() => setRole(option.role)}
                disabled={isSelf}
                aria-invalid={Boolean(errors.role)}
                className="mt-0.5 size-4 accent-primary"
              />
              <span className="text-sm font-medium">{ROLE_LABELS[option.role]}</span>
              <span className="col-start-2 text-[0.8125rem] text-muted-foreground">
                {option.access}
              </span>
            </label>
          ))}
        </div>
        {isSelf && (
          <p id="role-hint" className="text-[0.8125rem] text-muted-foreground">
            Peran akun Anda sendiri tidak bisa diubah. Minta Admin lain bila perlu.
          </p>
        )}
        <FieldError id="role-error" messages={errors.role} />
      </fieldset>

      {role === 'ELDER' && (
        <div className="grid gap-2">
          <Label htmlFor="rayon_id">Rayon pelayanan</Label>
          <select
            id="rayon_id"
            name="rayon_id"
            defaultValue={user?.rayon_id ?? ''}
            aria-invalid={Boolean(errors.rayon_id)}
            aria-describedby={describedBy('rayon_id')}
            className={cn(
              fieldClass,
              'w-full border border-input outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive',
            )}
          >
            <option value="">Pilih rayon</option>
            {rayons.map((rayon) => (
              <option key={rayon.id} value={rayon.id}>
                {rayon.name}
              </option>
            ))}
          </select>
          <FieldError id="rayon_id-error" messages={errors.rayon_id} />
        </div>
      )}

      <div className="grid gap-2">
        <div className="grid gap-x-3 gap-y-5 sm:grid-cols-2">
          <div className="grid content-start gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              defaultValue={user?.email ?? ''}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={describedBy('email', 'login-hint')}
              className={fieldClass}
            />
            <FieldError id="email-error" messages={errors.email} />
          </div>
          <div className="grid content-start gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              defaultValue={user?.username ?? ''}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(errors.username)}
              aria-describedby={describedBy('username', 'login-hint')}
              className={fieldClass}
            />
            <FieldError id="username-error" messages={errors.username} />
          </div>
        </div>
        <p id="login-hint" className="text-[0.8125rem] text-muted-foreground">
          Dipakai untuk masuk. Isi minimal salah satu; username cocok untuk pengurus tanpa email.
        </p>
      </div>

      {mode === 'create' && (
        <div className="grid gap-2">
          <Label htmlFor="password">Kata sandi awal (opsional)</Label>
          <Input
            id="password"
            name="password"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={describedBy('password', 'password-hint')}
            className={fieldClass}
          />
          <p id="password-hint" className="text-[0.8125rem] text-muted-foreground">
            Kosongkan agar sistem membuat kata sandi sementara yang mudah dibacakan.
          </p>
          <FieldError id="password-error" messages={errors.password} />
        </div>
      )}

      <div role="alert" aria-live="assertive">
        {formError && <p className="text-sm text-destructive">{formError}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Menyimpan…' : user ? 'Simpan perubahan' : 'Tambah akun'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.[0]) return null
  return (
    <p id={id} className="text-[0.8125rem] text-destructive">
      {messages[0]}
    </p>
  )
}
