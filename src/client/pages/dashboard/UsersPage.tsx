import { useState, type ReactNode } from 'react'
import {
  EllipsisVertical,
  History,
  KeyRound,
  Pencil,
  Plus,
  Search,
  UserCheck,
  UserX,
} from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import {
  ROLE_LABELS,
  USER_ROLES,
  type ApiList,
  type Rayon,
  type UserListItem,
  type UserMutationResponse,
  type UserRole,
} from '@shared/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccountFormDialog } from '@/components/users/account-form-dialog'
import {
  TemporaryPasswordDialog,
  type IssuedPassword,
} from '@/components/users/temporary-password-dialog'
import { api, errorMessage } from '@/lib/api'
import { formatRecent } from '@/lib/format'
import { useCurrentUser } from '@/lib/session'
import { useApiQuery } from '@/lib/use-api-query'

type StatusTab = 'active' | 'inactive' | 'all'
type Confirmation = { kind: 'deactivate' | 'reset'; user: UserListItem }

const controlClass =
  'h-9 rounded-lg border border-input bg-card text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

// Manajemen Akun Pengurus (khusus Admin; dijaga <RequireRole> di router dan oleh API).
export default function UsersPage() {
  const me = useCurrentUser()
  const users = useApiQuery<ApiList<UserListItem>>('/users')
  const rayons = useApiQuery<ApiList<Rayon>>('/rayons')

  const [tab, setTab] = useState<StatusTab>('active')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')
  const [form, setForm] = useState<{ user?: UserListItem } | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [issued, setIssued] = useState<IssuedPassword | null>(null)
  const [busy, setBusy] = useState(false)

  const all = users.data?.data ?? []
  const counts: Record<StatusTab, number> = {
    active: all.filter((user) => user.is_active).length,
    inactive: all.filter((user) => !user.is_active).length,
    all: all.length,
  }
  const neverLoggedIn = all.filter((user) => user.is_active && !user.last_login_at).length
  const term = search.trim().toLowerCase()
  const rows = all
    .filter((user) => tab === 'all' || user.is_active === (tab === 'active'))
    .filter((user) => !roleFilter || user.role === roleFilter)
    .filter(
      (user) =>
        !term ||
        [user.name, user.email, user.username, user.rayon_name].some((value) =>
          value?.toLowerCase().includes(term),
        ),
    )

  function handleSaved(result: UserMutationResponse) {
    const created = !form?.user
    setForm(null)
    users.reload()
    if (result.temporary_password) {
      setIssued({ user: result.user, password: result.temporary_password, reason: 'created' })
    } else {
      toast.success(
        created
          ? `Akun ${result.user.name} dibuat.`
          : `Perubahan akun ${result.user.name} disimpan.`,
      )
    }
  }

  async function setActive(user: UserListItem, isActive: boolean) {
    try {
      await api.patch<UserMutationResponse>(`/users/${user.id}`, { is_active: isActive })
      users.reload()
      if (isActive) toast.success(`Akun ${user.name} aktif kembali.`)
      else {
        toast.success(`Akun ${user.name} dinonaktifkan dan keluar dari semua perangkat.`, {
          action: { label: 'Urungkan', onClick: () => void setActive(user, true) },
        })
      }
      return true
    } catch (err) {
      toast.error(errorMessage(err))
      return false
    }
  }

  async function confirm() {
    if (!confirmation) return
    const { kind, user } = confirmation
    setBusy(true)
    try {
      if (kind === 'deactivate') {
        if (await setActive(user, false)) setConfirmation(null)
        return
      }
      const result = await api.patch<UserMutationResponse>(`/users/${user.id}`, {
        reset_password: true,
      })
      setConfirmation(null)
      users.reload()
      if (result.temporary_password) {
        setIssued({ user: result.user, password: result.temporary_password, reason: 'reset' })
      }
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Akun Pengurus</h1>
          {users.data ? (
            <p className="text-sm text-muted-foreground">
              {counts.active} akun aktif
              {neverLoggedIn > 0
                ? ` · ${neverLoggedIn} belum pernah masuk sejak akunnya dibuat`
                : ' · semuanya sudah pernah masuk'}
            </p>
          ) : (
            <Skeleton className="h-5 w-64" />
          )}
        </div>
        <Button size="lg" onClick={() => setForm({})}>
          <Plus data-icon="inline-start" />
          Tambah pengurus
        </Button>
      </header>

      <Tabs value={tab} onValueChange={(value) => setTab(value as StatusTab)} className="gap-4">
        <TabsList
          variant="line"
          aria-label="Status akun"
          className="h-auto w-full justify-start gap-6 rounded-none border-b p-0"
        >
          {(['active', 'inactive', 'all'] as const).map((value) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex-none px-0 pb-2.5 after:bottom-[-1px]"
            >
              {value === 'active' ? 'Aktif' : value === 'inactive' ? 'Nonaktif' : 'Semua'}
              <span className="text-muted-foreground tabular-nums">
                {users.data ? counts[value] : ''}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, email, username, rayon"
              aria-label="Cari akun"
              className={`${controlClass} pl-9`}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as UserRole | '')}
            aria-label="Saring peran"
            className={`${controlClass} px-3`}
          >
            <option value="">Semua peran</option>
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <p className="ml-auto text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {users.data ? `${rows.length} akun` : ''}
          </p>
        </div>

        <TabsContent value={tab}>
          <div className="rounded-lg border bg-card">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th scope="col" className="h-10 pr-4 pl-4 font-normal">
                    Nama
                  </th>
                  <th scope="col" className="hidden w-44 pr-4 font-normal sm:table-cell">
                    Peran
                  </th>
                  <th scope="col" className="hidden w-40 pr-4 text-right font-normal sm:table-cell">
                    Masuk terakhir
                  </th>
                  <th scope="col" className="w-14 pr-2">
                    <span className="sr-only">Tindakan</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.error && !users.data && (
                  <MessageRow>
                    Daftar akun tidak dapat dimuat: {users.error}{' '}
                    <button type="button" onClick={users.reload} className="font-medium underline">
                      Coba lagi
                    </button>
                  </MessageRow>
                )}
                {!users.data &&
                  !users.error &&
                  Array.from({ length: 4 }, (_, index) => <SkeletonRow key={index} />)}
                {users.data && rows.length === 0 && (
                  <MessageRow>
                    {term || roleFilter ? (
                      <>
                        Tidak ada akun yang cocok dengan pencarian ini.{' '}
                        <button
                          type="button"
                          className="font-medium underline"
                          onClick={() => {
                            setSearch('')
                            setRoleFilter('')
                          }}
                        >
                          Hapus pencarian
                        </button>
                      </>
                    ) : tab === 'inactive' ? (
                      'Belum ada akun yang dinonaktifkan.'
                    ) : (
                      'Belum ada akun.'
                    )}
                  </MessageRow>
                )}
                {rows.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isSelf={user.id === me.id}
                    onEdit={() => setForm({ user })}
                    onResetPassword={() => setConfirmation({ kind: 'reset', user })}
                    onDeactivate={() => setConfirmation({ kind: 'deactivate', user })}
                    onReactivate={() => void setActive(user, true)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <AccountFormDialog
        open={form !== null}
        onOpenChange={(open) => !open && setForm(null)}
        user={form?.user}
        isSelf={form?.user?.id === me.id}
        rayons={rayons.data?.data ?? []}
        onSaved={handleSaved}
      />

      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => !open && !busy && setConfirmation(null)}
      >
        <AlertDialogContent>
          {confirmation && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {confirmation.kind === 'deactivate'
                    ? `Nonaktifkan akun ${confirmation.user.name}?`
                    : `Atur ulang kata sandi ${confirmation.user.name}?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmation.kind === 'deactivate'
                    ? `${confirmation.user.name} langsung keluar dari semua perangkat dan tidak bisa masuk sampai akunnya diaktifkan kembali. Riwayat aktivitasnya tetap tersimpan.`
                    : confirmation.user.id === me.id
                      ? 'Sistem membuat kata sandi sementara baru. Anda tetap masuk di perangkat ini, tetapi keluar dari perangkat lain.'
                      : `Sistem membuat kata sandi sementara baru, kata sandi lama tidak berlaku lagi, dan ${confirmation.user.name} keluar dari semua perangkat.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
                <AlertDialogAction
                  variant={confirmation.kind === 'deactivate' ? 'destructive' : 'default'}
                  disabled={busy}
                  onClick={(event) => {
                    // Dialog ditutup setelah permintaannya berhasil, bukan saat diklik.
                    event.preventDefault()
                    void confirm()
                  }}
                >
                  {busy
                    ? 'Memproses…'
                    : confirmation.kind === 'deactivate'
                      ? 'Nonaktifkan'
                      : 'Atur ulang'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <TemporaryPasswordDialog issued={issued} onClose={() => setIssued(null)} />
    </div>
  )
}

function UserRow({
  user,
  isSelf,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
}: {
  user: UserListItem
  isSelf: boolean
  onEdit: () => void
  onResetPassword: () => void
  onDeactivate: () => void
  onReactivate: () => void
}) {
  const identities = [user.username, user.email].filter(Boolean).join(' · ')
  const lastLogin = user.last_login_at ? formatRecent(user.last_login_at) : 'Belum pernah'

  return (
    <tr className="border-t border-rule align-top">
      <td className="py-3 pr-4 pl-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{user.name}</span>
          {isSelf && <span className="flex-none text-xs text-muted-foreground">(Anda)</span>}
          {!user.is_active && (
            <span className="flex-none rounded-full bg-secondary px-2 py-0.5 text-xs font-medium whitespace-nowrap text-secondary-foreground">
              Nonaktif
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground sm:truncate">
          <span className="sm:hidden">
            {ROLE_LABELS[user.role]}
            {user.rayon_name && ` · ${user.rayon_name}`} · masuk terakhir {lastLogin.toLowerCase()}
            <br />
          </span>
          {identities}
        </p>
      </td>
      {/* Rayon hanya berlaku untuk Majelis, jadi ikut di kolom peran. */}
      <td className="hidden py-3 pr-4 text-muted-foreground sm:table-cell">
        {ROLE_LABELS[user.role]}
        {user.rayon_name && ` · ${user.rayon_name}`}
      </td>
      <td className="hidden py-3 pr-4 text-right text-muted-foreground tabular-nums sm:table-cell">
        {lastLogin}
      </td>
      <td className="py-2 pr-2 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-10 sm:size-8">
              <EllipsisVertical />
              <span className="sr-only">Tindakan untuk {user.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil />
              Ubah data akun
            </DropdownMenuItem>
            {user.is_active && (
              <DropdownMenuItem onSelect={onResetPassword}>
                <KeyRound />
                Atur ulang kata sandi
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link to={`/dashboard/audit-logs?entity_type=users&entity_id=${user.id}`}>
                <History />
                Lihat riwayat akun
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {!user.is_active ? (
              <DropdownMenuItem onSelect={onReactivate}>
                <UserCheck />
                Aktifkan kembali
              </DropdownMenuItem>
            ) : isSelf ? (
              <DropdownMenuItem disabled className="items-start">
                <UserX className="mt-0.5" />
                <span className="grid">
                  Nonaktifkan akun
                  <span className="text-xs text-muted-foreground">
                    Tidak bisa untuk akun sendiri
                  </span>
                </span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem variant="destructive" onSelect={onDeactivate}>
                <UserX />
                Nonaktifkan akun
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}

function MessageRow({ children }: { children: ReactNode }) {
  return (
    <tr className="border-t border-rule">
      <td colSpan={4} className="px-4 py-6 text-muted-foreground">
        {children}
      </td>
    </tr>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-t border-rule" aria-hidden="true">
      <td className="py-3 pr-4 pl-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-1.5 h-4 w-56" />
      </td>
      <td className="hidden py-3 pr-4 sm:table-cell">
        <Skeleton className="h-5 w-20" />
      </td>
      <td className="hidden py-3 pr-4 sm:table-cell">
        <Skeleton className="ml-auto h-5 w-28" />
      </td>
      <td />
    </tr>
  )
}
