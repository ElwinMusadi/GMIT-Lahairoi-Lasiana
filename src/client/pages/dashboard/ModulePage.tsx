import { Link } from 'react-router'
import { ROLE_LABELS } from '@shared/types'
import type { ModuleItem } from '@/lib/navigation'
import { useCurrentUser } from '@/lib/session'

// Kerangka halaman modul: judul, deskripsi, dan bingkai kosong sampai modulnya dibangun.
export function ModulePage({ module }: { module: ModuleItem }) {
  const user = useCurrentUser()

  if (!module.roles.includes(user.role)) {
    return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Akses dibatasi</h1>
        <p className="max-w-[60ch] text-sm text-muted-foreground">
          Halaman {module.title} hanya untuk{' '}
          {module.roles.map((role) => ROLE_LABELS[role]).join(', ')}. Anda masuk sebagai{' '}
          {ROLE_LABELS[user.role]}.
        </p>
        <Link to="/dashboard" className="text-sm font-medium underline underline-offset-4">
          Kembali ke Ringkasan
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">{module.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
      </header>
      <p className="rounded-lg border border-dashed border-input px-5 py-3 text-sm text-muted-foreground">
        Modul {module.title} dibangun pada Fase {module.phase}. Belum ada data untuk ditampilkan.
      </p>
    </div>
  )
}

export function DashboardNotFound() {
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Halaman tidak ditemukan</h1>
      <p className="text-sm text-muted-foreground">Menu ini tidak ada di dashboard.</p>
      <Link to="/dashboard" className="text-sm font-medium underline underline-offset-4">
        Kembali ke Ringkasan
      </Link>
    </div>
  )
}
