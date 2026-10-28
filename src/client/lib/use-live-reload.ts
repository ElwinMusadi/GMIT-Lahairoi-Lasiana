import { useEffect } from 'react'

// Memuat ulang data saat jendela kembali dilihat dan berkala selama tab terbuka, agar
// angka yang diubah pengurus lain (mis. transaksi baru) ikut tampil tanpa refresh.
export function useLiveReload(reload: () => void, intervalMs = 60_000) {
  useEffect(() => {
    let last = Date.now()
    // Pindah tab memicu focus dan visibilitychange sekaligus; cukup satu kali muat.
    function refresh() {
      if (document.visibilityState !== 'visible' || Date.now() - last < 5_000) return
      last = Date.now()
      reload()
    }
    const timer = window.setInterval(refresh, intervalMs)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [reload, intervalMs])
}
