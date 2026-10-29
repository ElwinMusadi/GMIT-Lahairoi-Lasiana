import { useLayoutEffect, useSyncExternalStore } from 'react'
import type { PortalThemeCode, PublicSettings } from '@shared/types'

// Tema portal dipasang di <html> agar konten Radix yang dirender di luar layout
// (sheet menu, dialog) ikut memakai token portal. Lihat juga skrip di index.html, yang
// memasang kelas yang sama sebelum React dimuat.
//
// Ada dua pilihan yang saling bebas:
// - Terang/gelap: pilihan pengunjung lewat tombol tema; bawaannya selalu terang, tidak
//   mengikuti setelan OS. Disimpan di perangkat ini.
// - Tema portal (Bawaan atau Glassmorphism, kelas portal-glass): pilihan Admin di
//   Pengaturan > Tampilan, berlaku untuk semua pengunjung. Nilainya dibaca dari
//   /api/public/settings sekali per muat halaman; nilai terakhir disimpan di perangkat agar
//   kunjungan berikutnya langsung memakai tema yang sama tanpa berkedip.
// Dashboard selalu memakai temanya sendiri, jadi kelas-kelas ini dilepas saat
// meninggalkan portal.

export type PortalTheme = 'light' | 'dark'

const STORAGE_KEY = 'gmit-lahairoi:tema-portal'
const CODE_STORAGE_KEY = 'gmit-lahairoi:gaya-portal'
// Warna bilah browser: kanvas portal, atau warna dasar latar senja di tema Glassmorphism.
const THEME_COLOR: Record<PortalThemeCode, Record<PortalTheme, string>> = {
  DEFAULT: { light: '#ffffff', dark: '#0a1215' },
  GLASS: { light: '#f3eee8', dark: '#061317' },
}

declare global {
  interface Window {
    // Permintaan /api/public/settings yang dimulai skrip di index.html.
    portalSettings?: Promise<PublicSettings | null>
  }
}

const listeners = new Set<() => void>()
let current: PortalTheme = readStoredTheme()
let code: PortalThemeCode = readStoredCode()
let settingsRequest: Promise<void> | null = null

function readStoredTheme(): PortalTheme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    // Penyimpanan diblokir (mis. mode privat): tetap terang.
    return 'light'
  }
}

function readStoredCode(): PortalThemeCode {
  try {
    return localStorage.getItem(CODE_STORAGE_KEY) === 'GLASS' ? 'GLASS' : 'DEFAULT'
  } catch {
    return 'DEFAULT'
  }
}

// Kelas tema hanya dipasang selama tema portal aktif, sehingga pemanggilan dari dashboard
// (setelah Admin menyimpan pengaturan) tidak mengubah tampilan dashboard.
function applyTheme(theme: PortalTheme) {
  const root = document.documentElement
  if (!root.classList.contains('theme-portal')) return
  root.classList.toggle('dark', theme === 'dark')
  root.classList.toggle('portal-glass', code === 'GLASS')
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[code][theme])
}

function notify() {
  listeners.forEach((listener) => listener())
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
  notify()
}

function setPortalThemeCode(next: PortalThemeCode) {
  if (next === code) return
  code = next
  applyTheme(current)
  try {
    if (next === 'GLASS') localStorage.setItem(CODE_STORAGE_KEY, next)
    else localStorage.removeItem(CODE_STORAGE_KEY)
  } catch {
    // Tema tetap berlaku sampai halaman dimuat ulang.
  }
  notify()
}

function fetchSettings(init?: RequestInit): Promise<PublicSettings | null> {
  return fetch('/api/public/settings', init)
    .then((response) => (response.ok ? (response.json() as Promise<PublicSettings>) : null))
    .catch(() => null)
}

// Bila gagal dimuat (mis. luring), tema yang tersimpan di perangkat tetap dipakai.
function loadSettings(request: Promise<PublicSettings | null>) {
  settingsRequest = request.then((settings) => {
    if (settings) setPortalThemeCode(settings.portal_theme)
  })
}

// Dipanggil halaman Pengaturan > Tampilan setelah menyimpan: tema langsung berganti saat
// Admin kembali ke portal, dan salinan /api/public/settings di cache browser (max-age 60)
// diperbarui agar muat ulang berikutnya tidak membaca tema lama.
export function refreshPortalThemeCode(saved: PortalThemeCode) {
  setPortalThemeCode(saved)
  loadSettings(fetchSettings({ cache: 'reload' }))
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
// terang/gelap dan tema pilihan Admin, lalu melepas semuanya saat pindah ke dashboard.
export function usePortalTheme() {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.add('theme-portal')
    applyTheme(current)
    if (!settingsRequest) loadSettings(window.portalSettings ?? fetchSettings())
    return () => {
      root.classList.remove('theme-portal', 'dark', 'portal-glass')
      document
        .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.setAttribute('content', THEME_COLOR.DEFAULT.light)
    }
  }, [])
}
