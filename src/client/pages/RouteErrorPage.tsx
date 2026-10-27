import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'

// Batas error terakhir untuk semua rute. Gaya netral agar terbaca di tema mana pun.
export default function RouteErrorPage() {
  const error = useRouteError()
  console.error(error)

  // Berkas halaman lama hilang setelah deploy baru (import dinamis gagal dimuat).
  const isStaleBundle =
    error instanceof TypeError && /dynamically imported module|Importing a module script/i.test(error.message)

  const message = isRouteErrorResponse(error)
    ? `Halaman tidak dapat dimuat (HTTP ${error.status}).`
    : isStaleBundle
      ? 'Versi aplikasi baru telah tersedia. Muat ulang halaman untuk melanjutkan.'
      : 'Terjadi kesalahan saat menampilkan halaman ini.'

  return (
    <main className="grid min-h-svh content-center gap-6 px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Halaman gagal dimuat</h1>
      <p className="max-w-[48ch] text-base">{message}</p>
      <div className="flex gap-3">
        <Button className="h-10 px-4" onClick={() => window.location.reload()}>
          Muat ulang
        </Button>
        <Button asChild variant="outline" className="h-10 px-4">
          <a href="/">Ke beranda</a>
        </Button>
      </div>
    </main>
  )
}
