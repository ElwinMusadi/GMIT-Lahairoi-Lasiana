import { useSearchParams } from 'react-router'

// Filter halaman daftar disimpan di query URL, agar tombol Kembali berfungsi dan
// tautannya bisa dibagikan.
export function useUrlFilters() {
  const [params, setParams] = useSearchParams()

  // Perubahan dibangun dari URL saat ini, bukan dari render terakhir, sehingga dua
  // perubahan yang berdekatan (pencarian yang tertunda lalu filter) tidak saling menimpa.
  // `keepScroll`: posisi gulir tidak dikembalikan ke atas, mis. saat mengetik di kolom
  // cari yang ada di tengah halaman portal.
  function update(changes: Record<string, string>, options?: { keepScroll?: boolean }) {
    const next = new URLSearchParams(window.location.search)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    // Filter baru selalu mulai dari halaman pertama.
    if (!('page' in changes)) next.delete('page')
    setParams(next, { preventScrollReset: options?.keepScroll })
    // Halaman berikutnya dibaca dari atas, bukan dari tombol paging di bawah.
    if ('page' in changes) window.scrollTo({ top: 0 })
  }

  return { params, setParams, update }
}
