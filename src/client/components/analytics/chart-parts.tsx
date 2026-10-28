import type { ReactNode } from 'react'

// Potongan grafik SVG Dashboard Eksekutif: tooltip dan baris tooltip.

const TOOLTIP_WIDTH = 200

// Tooltip di atas plot, mengikuti posisi x yang aktif dan tidak keluar dari wadah.
// Ikut diumumkan pembaca layar saat nilai berpindah lewat keyboard.
export function ChartTooltip({
  x,
  containerWidth,
  children,
}: {
  x: number
  containerWidth: number
  children: ReactNode
}) {
  const half = TOOLTIP_WIDTH / 2
  const center = Math.min(Math.max(x, half), Math.max(half, containerWidth - half))
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-0 z-10 grid -translate-x-1/2 gap-1 rounded-md border bg-popover px-3 py-2 text-[0.8125rem] shadow-md"
      style={{ left: center, width: TOOLTIP_WIDTH }}
    >
      {children}
    </div>
  )
}

// Baris tooltip: nilai di depan (tebal), nama seri di belakang, dengan garis kunci warna.
export function TooltipRow({
  color,
  label,
  value,
}: {
  color?: string
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        {color && (
          <span
            aria-hidden="true"
            className="h-0.5 w-3 rounded-full"
            style={{ background: color }}
          />
        )}
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}
