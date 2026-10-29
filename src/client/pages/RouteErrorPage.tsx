import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'

// Batas error terakhir untuk semua rute. Gaya netral agar terbaca di tema mana pun
// (portal terang/gelap maupun dashboard); hanya hurufnya mengikuti judul dua nada portal.
export default function RouteErrorPage() {
  const error = useRouteError()
  console.error(error)

  // Berkas halaman lama hilang setelah deploy baru (import dinamis gagal dimuat).
  const isStaleBundle =
    error instanceof TypeError &&
    /dynamically imported module|Importing a module script/i.test(error.message)

  const message = isRouteErrorResponse(error)
    ? `Halaman tidak dapat dimuat (HTTP ${error.status}).`
    : isStaleBundle
      ? 'Versi aplikasi baru telah tersedia. Muat ulang halaman untuk melanjutkan.'
      : 'Terjadi kesalahan saat menampilkan halaman ini.'

  return (
    <main className="grid min-h-svh content-center gap-6 px-6 py-16 font-site-body sm:px-12 xl:px-16">
      <h1 className="text-[clamp(2rem,9.5vw,2.5rem)] leading-none tracking-[-0.03em] sm:text-5xl">
        <span className="block font-site-display font-extrabold">Halaman</span>{' '}
        <span className="mt-1 block font-site-serif font-normal text-muted-foreground italic md:mt-2">
          gagal dimuat.
        </span>
      </h1>
      <p className="max-w-[48ch] text-base leading-relaxed md:text-lg">{message}</p>
      <div className="flex flex-wrap gap-3">
        <Button
          className="h-11 rounded-full px-5 font-semibold"
          onClick={() => window.location.reload()}
        >
          Muat ulang
        </Button>
        <Button asChild variant="outline" className="h-11 rounded-full px-5 font-semibold">
          <a href="/">Ke beranda</a>
        </Button>
      </div>
    </main>
  )
}
