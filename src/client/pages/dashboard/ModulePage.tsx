import { Link } from 'react-router'
import type { ModuleItem } from '@/lib/navigation'

// Kerangka halaman modul: judul, deskripsi, dan bingkai kosong sampai modulnya dibangun.
// Pembatasan peran ditangani <RequireRole> di router.
export function ModulePage({ module }: { module: ModuleItem }) {
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
