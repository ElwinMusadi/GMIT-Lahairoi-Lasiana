import { useLayoutEffect, useSyncExternalStore } from 'react'

// Tema portal dipasang di <html> agar konten Radix yang dirender di luar layout
// (sheet menu, dialog) ikut memakai token portal. Lihat juga skrip di index.html, yang
// memasang kelas yang sama sebelum React dimuat.
//
// Tema gelap hanya aktif bila pengunjung memilihnya lewat tombol tema; bawaannya selalu
// terang, tidak mengikuti setelan OS. Pilihan disimpan di perangkat ini. Dashboard
// selalu terang, jadi kedua kelas dilepas saat meninggalkan portal.

export type PortalTheme = 'light' | 'dark'

const STORAGE_KEY = 'gmit-lahairoi:tema-portal'
const THEME_COLOR: Record<PortalTheme, string> = { light: '#ffffff', dark: '#0a1215' }

const listeners = new Set<() => void>()
let current: PortalTheme = readStoredTheme()

function readStoredTheme(): PortalTheme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    // Penyimpanan diblokir (mis. mode privat): tetap terang.
    return 'light'
  }
}

function applyTheme(theme: PortalTheme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[theme])
}

export function setPortalTheme(theme: PortalTheme) {
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
export function usePortalThemeValue(): PortalTheme {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => 'light',
  )
}

// Dipanggil oleh PublicLayout dan halaman login: memasang tema portal beserta pilihan
// terang/gelap, lalu melepas keduanya saat pindah ke dashboard.
export function usePortalTheme() {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.add('theme-portal')
    applyTheme(current)
    return () => {
      root.classList.remove('theme-portal', 'dark')
      document
        .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.setAttribute('content', THEME_COLOR.light)
    }
  }, [])
}
