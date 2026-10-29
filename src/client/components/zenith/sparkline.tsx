import { useId } from 'react'
import { cn } from '@/lib/utils'

// Grafik mini garis dengan isian bergradasi (kartu KPI Zenith). Warnanya currentColor, jadi
// diatur lewat kelas teks (mis. text-brand). Hanya hiasan: angkanya selalu tertulis di kartu.
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const gradient = useId()
  if (values.length < 2 || values.every((value) => value === values[0])) return null

  const width = 100
  const height = 32
  const min = Math.min(...values)
  const max = Math.max(...values)
  // Ruang 15% di atas agar puncak garis tidak menempel di tepi.
  const span = (max - min) * 1.15 || 1
  const points = values.map((value, index) => [
    (index / (values.length - 1)) * width,
    height - ((value - min) / span) * height,
  ])
  const line = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn('h-12 w-full overflow-visible', className)}
    >
      <defs>
        <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${line} ${width},${height}`} fill={`url(#${gradient})`} />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
