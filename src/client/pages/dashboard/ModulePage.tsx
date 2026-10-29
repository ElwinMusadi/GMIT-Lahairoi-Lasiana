import { Link } from 'react-router'
import { PageHeader } from '@/components/zenith/page-header'
import type { ModuleItem } from '@/lib/navigation'

// Kerangka halaman modul: judul, deskripsi, dan bingkai kosong sampai modulnya dibangun.
// Pembatasan peran ditangani <RequireRole> di router.
export function ModulePage({ module }: { module: ModuleItem }) {
  return (
    <div className="grid gap-6">
      <PageHeader title={module.title} description={module.description} />
      <p className="rounded-xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
        Modul {module.title} dibangun pada Fase {module.phase}. Belum ada data untuk ditampilkan.
      </p>
    </div>
  )
}

export function DashboardNotFound() {
  return (
    <div className="grid gap-4">
      <PageHeader title="Halaman tidak ditemukan" description="Menu ini tidak ada di dashboard." />
      <Link
        to="/dashboard"
        className="justify-self-start text-sm font-medium underline underline-offset-4"
      >
        Kembali ke Ringkasan
      </Link>
    </div>
  )
}
