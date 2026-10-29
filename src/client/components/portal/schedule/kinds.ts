import type { WorshipCategory } from '@shared/types'

// Warna jenis ibadah (token --site-kind-* di index.css). Ditulis utuh agar Tailwind
// menemukannya; selalu dipakai bersama label teks.

export const KIND_DOT: Record<WorshipCategory, string> = {
  SUNDAY_SERVICE: 'bg-site-kind-sunday',
  RAYON: 'bg-site-kind-rayon',
  CATEGORICAL: 'bg-site-kind-categorical',
  SPECIAL: 'bg-site-kind-special',
}

export const KIND_BORDER: Record<WorshipCategory, string> = {
  SUNDAY_SERVICE: 'border-site-kind-sunday',
  RAYON: 'border-site-kind-rayon',
  CATEGORICAL: 'border-site-kind-categorical',
  SPECIAL: 'border-site-kind-special',
}
