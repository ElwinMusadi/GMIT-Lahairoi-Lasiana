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

// Kurva halus melalui titik-titik (x naik) yang tidak melampaui nilai di antara dua titik,
// sama dengan d3.curveMonotoneX (metode Steffen): garis tren bergaya Zenith tanpa puncak palsu.
export function monotonePath(points: readonly (readonly [number, number])[]): string {
  const n = points.length
  if (n < 3) return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
  const h = points.slice(1).map(([x], i) => x - points[i][0])
  const s = points.slice(1).map(([, y], i) => (y - points[i][1]) / h[i])
  const t = new Array<number>(n)
  for (let i = 1; i < n - 1; i++) {
    const p = (s[i - 1] * h[i] + s[i] * h[i - 1]) / (h[i - 1] + h[i])
    t[i] =
      (Math.sign(s[i - 1]) + Math.sign(s[i])) *
        Math.min(Math.abs(s[i - 1]), Math.abs(s[i]), 0.5 * Math.abs(p)) || 0
  }
  t[0] = (3 * s[0] - t[1]) / 2
  t[n - 1] = (3 * s[n - 2] - t[n - 2]) / 2
  let d = `M${points[0][0]},${points[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    const third = h[i] / 3
    d += ` C${x0 + third},${y0 + third * t[i]} ${x1 - third},${y1 - third * t[i + 1]} ${x1},${y1}`
  }
  return d
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
