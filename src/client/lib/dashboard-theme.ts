import { useLayoutEffect, useSyncExternalStore } from 'react'
// Huruf Geist (OFL) di-host sendiri dan hanya ikut bundel dashboard.
import '@fontsource-variable/geist'

// Tema dashboard pengurus bergaya Zenith (docs/rencana-redesign-dashboard-zenith.md). Kelas
// theme-dashboard dipasang di <html> agar isi Radix di luar layout (menu, dialog, toast) ikut
// memakai tokennya. Bawaannya terang; tema gelap hanya bila pengurus memilihnya, disimpan di
// perangkat ini. Kelas dilepas lagi saat meninggalkan dashboard. Polanya sama seperti
// lib/portal-theme.ts, dengan kunci penyimpanan sendiri.

export type DashboardTheme = 'light' | 'dark'

const STORAGE_KEY = 'gmit-lahairoi:tema-dashboard'
const THEME_COLOR: Record<DashboardTheme, string> = { light: '#ffffff', dark: '#030303' }

const listeners = new Set<() => void>()
let current: DashboardTheme = readStoredTheme()

function readStoredTheme(): DashboardTheme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    // Penyimpanan diblokir (mis. mode privat): tetap terang.
    return 'light'
  }
}

function applyTheme(theme: DashboardTheme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[theme])
}

export function setDashboardTheme(theme: DashboardTheme) {
  current = theme
  applyTheme(theme)
  try {
    if (theme === 'dark') localStorage.setItem(STORAGE_KEY, 'dark')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Pilihan tetap berlaku sampai halaman dimuat ulang.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Tema yang sedang aktif, untuk tombol tema dan komponen yang perlu tahu (mis. toaster).
export function useDashboardThemeValue(): DashboardTheme {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => 'light',
  )
}

// Dipanggil sekali oleh layout dashboard: memasang tema dashboard beserta pilihan
// terang/gelap, lalu melepas keduanya saat pindah ke portal atau halaman login.
export function useDashboardTheme() {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.add('theme-dashboard')
    applyTheme(current)
    return () => {
      root.classList.remove('theme-dashboard', 'dark')
      document
        .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.setAttribute('content', THEME_COLOR.light)
    }
  }, [])
}
