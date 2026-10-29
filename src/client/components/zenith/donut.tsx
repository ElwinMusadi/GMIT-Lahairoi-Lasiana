import { useState, type ReactNode } from 'react'
import { formatShare } from '@/lib/analytics'
import { cn } from '@/lib/utils'

export type DonutSlice = { key: string; label: string; value: number; color: string }

const SIZE = 136
const STROKE = 18
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
// Celah 2px warna kartu di antara potongan.
const GAP = 2

// Donat Zenith dengan legenda yang membawa angka dan persentase, sehingga identitas tidak
// hanya lewat warna. Menunjuk potongan atau baris legenda menyorotnya dan menampilkan
// nilainya di tengah; tanpa penunjuk, tengahnya berisi jumlah.
export function Donut({
  slices,
  caption,
  totalLabel,
  formatValue = (value) => value.toLocaleString('id-ID'),
}: {
  slices: DonutSlice[]
  caption: string
  totalLabel: ReactNode
  formatValue?: (value: number) => string
}) {
  const [active, setActive] = useState<string | null>(null)
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const visible = slices.filter((slice) => slice.value > 0)
  const share = (value: number) =>
    total > 0 ? formatShare(Math.round((value / total) * 1000) / 10) : formatShare(0)
  const current = visible.find((slice) => slice.key === active)
  // Panjang busur tiap potongan dan titik mulainya di sepanjang lingkaran.
  const arcs = visible.map((slice, index) => ({
    slice,
    length: total > 0 ? (slice.value / total) * CIRCUMFERENCE : 0,
    start: visible
      .slice(0, index)
      .reduce((sum, previous) => sum + (previous.value / total) * CIRCUMFERENCE, 0),
  }))

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden="true"
          className="-rotate-90"
          onPointerLeave={() => setActive(null)}
        >
          {total === 0 ? (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={STROKE}
            />
          ) : (
            arcs.map(({ slice, length, start }) => {
              const gap = arcs.length > 1 ? Math.min(GAP, length / 2) : 0
              return (
                <circle
                  key={slice.key}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${length - gap} ${CIRCUMFERENCE - length + gap}`}
                  strokeDashoffset={-start}
                  onPointerEnter={() => setActive(slice.key)}
                  className={cn(
                    'transition-opacity',
                    active !== null && active !== slice.key && 'opacity-30',
                  )}
                />
              )
            })
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-2xl leading-tight font-bold tracking-tight tabular-nums">
            {formatValue(current ? current.value : total)}
          </span>
          <span className="text-xs text-muted-foreground">
            {current ? current.label : totalLabel}
          </span>
        </div>
      </div>
      <ul aria-label={caption} className="grid max-w-72 min-w-44 flex-1 gap-2.5 text-sm">
        {slices.map((slice) => (
          <li
            key={slice.key}
            onPointerEnter={() => slice.value > 0 && setActive(slice.key)}
            onPointerLeave={() => setActive(null)}
            className="flex items-center justify-between gap-3"
          >
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: slice.color }}
              />
              <span className="truncate">{slice.label}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold">{formatValue(slice.value)}</span>
              <span className="text-muted-foreground"> · {share(slice.value)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
