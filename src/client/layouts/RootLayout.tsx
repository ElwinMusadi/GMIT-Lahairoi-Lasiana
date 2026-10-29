import { useEffect } from 'react'
import { Outlet, ScrollRestoration, useMatches, type Location } from 'react-router'
import type { RouteHandle } from '@/router'

const SITE_NAME = 'GMIT Lahairoi Tuak Sabu Lasiana'

export default function RootLayout() {
  const title = useMatches()
    .map((match) => (match.handle as RouteHandle | undefined)?.title)
    .filter(Boolean)
    .at(-1)

  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME
  }, [title])

  return (
    <>
      <Outlet />
      <ScrollRestoration getKey={scrollKey} />
    </>
  )
}

// Setiap muat penuh (alamat diketik, tautan <a> biasa, muat ulang) memakai kunci lokasi
// "default" yang sama, sehingga halaman baru ikut dipulihkan ke posisi gulir halaman lain.
// Muat penuh dikunci per alamat; navigasi di dalam aplikasi tetap per entri riwayat.
function scrollKey(location: Location) {
  return location.key === 'default' ? location.pathname : location.key
}
