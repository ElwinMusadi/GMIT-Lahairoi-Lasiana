import { useLayoutEffect } from 'react'

// Tema portal dipasang di <html> agar konten Radix yang dirender di luar layout
// (sheet menu, dialog) ikut memakai token gelap. Lihat juga skrip di index.html.
export function usePortalTheme() {
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.add('dark', 'theme-portal')
    return () => root.classList.remove('dark', 'theme-portal')
  }, [])
}
