import { useLayoutEffect, useRef, useState } from 'react'

// Tampilan Dashboard Eksekutif (/dashboard): skala sumbu, angka ringkas, dan lebar
// wadah grafik.

export const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

// Tick sumbu-y yang bulat dari 0 sampai sedikit di atas `max`, sekitar `target` langkah.
// Untuk hitungan (`integer`) langkahnya bilangan bulat.
export function niceTicks(max: number, { target = 4, integer = false } = {}): number[] {
  // Tanpa data: hanya garis nol; grafik memakai skala 0–1 agar tetap tergambar.
  if (max <= 0) return [0]
  const raw = max / target
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  let step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= raw) ??
    10 * magnitude
  if (integer) step = Math.max(1, Math.ceil(step))
  // Tick teratas di atas nilai terbesar, agar garis/batang tidak menyentuh tepi plot.
  let top = Math.ceil(max / step) * step
  if (top === max) top += step
  const ticks: number[] = []
  for (let value = 0; value <= top + step / 2; value += step)
    ticks.push(Math.round(value * 100) / 100)
  return ticks
}

// 0 → "0", 750000 → "750 rb", 2500000 → "2,5 jt", 1200000000 → "1,2 M"
export function compactRupiah(value: number): string {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const format = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 1 })
  if (abs >= 1e9) return `${sign}${format(abs / 1e9)} M`
  if (abs >= 1e6) return `${sign}${format(abs / 1e6)} jt`
  if (abs >= 1e3) return `${sign}${format(abs / 1e3)} rb`
  return `${sign}${abs}`
}

// 71.4 → "71,4%"
export function formatShare(percent: number): string {
  return `${percent.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`
}

// Lebar wadah (px) yang diperbarui saat ukuran berubah, untuk menggambar SVG pas lebar.
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

// Langkah label sumbu-x agar label (lebar ±`labelWidth` px) tidak bertabrakan.
export function labelStep(count: number, plotWidth: number, labelWidth: number) {
  if (count <= 1 || plotWidth <= 0) return 1
  return Math.max(1, Math.ceil((count * labelWidth) / plotWidth))
}

// Kolom dari garis dasar: ujung data membulat 4px, alas persegi.
export function columnPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(4, width / 2, height)
  return [
    `M${x},${y + height}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${y + height}`,
    'Z',
  ].join(' ')
}
