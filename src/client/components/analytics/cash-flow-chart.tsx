import { useState, type KeyboardEvent } from 'react'
import { formatRupiah } from '@shared/finance'
import type { AnalyticsCashMonth } from '@shared/types'
import {
  MONTH_SHORT,
  columnPath,
  compactRupiah,
  labelStep,
  niceTicks,
  useElementWidth,
} from '@/lib/analytics'
import { monthLabel } from '@/lib/finance'
import { ChartTooltip, TooltipRow } from './chart-parts'

// Kas masuk (warna utama) dan kas keluar (abu-abu pembanding) per bulan, sebagai
// kolom berpasangan pada satu sumbu Rupiah, dengan garis bantu putus-putus (Zenith).
export const INCOME_COLOR = 'var(--brand)'
export const EXPENSE_COLOR = 'var(--chart-2)'

const PLOT = 200
const TOP = 10
const AXIS = 28

export function CashFlowChart({ months }: { months: AnalyticsCashMonth[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const max = Math.max(0, ...months.flatMap((month) => [month.income, month.expense]))
  const ticks = niceTicks(max)
  const top = ticks.at(-1) || 1
  const left = Math.max(...ticks.map((tick) => compactRupiah(tick).length)) * 7 + 12
  const plotWidth = Math.max(0, width - left - 4)
  const band = months.length > 0 ? plotWidth / months.length : 0
  const barWidth = Math.max(3, Math.min(14, (band * 0.6 - 2) / 2))
  const y = (value: number) => TOP + PLOT - (value / top) * PLOT
  const step = labelStep(months.length, plotWidth, 34)
  const current = active === null ? null : months[active]

  function moveWith(event: KeyboardEvent) {
    const last = months.length - 1
    const index = active ?? last
    const next =
      event.key === 'ArrowLeft'
        ? Math.max(0, index - 1)
        : event.key === 'ArrowRight'
          ? Math.min(last, index + 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (next === null) return
    event.preventDefault()
    setActive(next)
  }

  return (
    <div
      ref={ref}
      role="group"
      tabIndex={0}
      aria-label="Kas masuk dan keluar per bulan. Gunakan panah kiri dan kanan untuk membaca tiap bulan."
      onKeyDown={moveWith}
      onFocus={() => setActive((value) => value ?? months.length - 1)}
      onBlur={() => setActive(null)}
      onPointerLeave={() => setActive(null)}
      className="relative rounded-md outline-offset-4"
      style={{ height: TOP + PLOT + AXIS }}
    >
      {width > 0 && (
        <svg
          width={width}
          height={TOP + PLOT + AXIS}
          aria-hidden="true"
          className="block overflow-visible"
          onPointerMove={(event) => {
            const x = event.clientX - event.currentTarget.getBoundingClientRect().left - left
            if (x < 0 || band === 0) return setActive(null)
            setActive(Math.min(months.length - 1, Math.floor(x / band)))
          }}
        >
          {active !== null && (
            <rect x={left + active * band} y={TOP} width={band} height={PLOT} fill="var(--rule)" />
          )}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={left}
                x2={width - 4}
                y1={y(tick)}
                y2={y(tick)}
                stroke={tick === 0 ? 'var(--input)' : 'var(--border)'}
                strokeWidth={1}
                strokeDasharray={tick === 0 ? undefined : '4 4'}
                shapeRendering="crispEdges"
              />
              <text
                x={left - 8}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-xs tabular-nums"
              >
                {compactRupiah(tick)}
              </text>
            </g>
          ))}
          {months.map((month, index) => {
            const center = left + (index + 0.5) * band
            const monthIndex = Number(month.month.slice(5, 7)) - 1
            return (
              <g key={month.month}>
                {month.income > 0 && (
                  <path
                    d={columnPath(
                      center - barWidth - 1,
                      y(month.income),
                      barWidth,
                      y(0) - y(month.income),
                    )}
                    fill={INCOME_COLOR}
                  />
                )}
                {month.expense > 0 && (
                  <path
                    d={columnPath(center + 1, y(month.expense), barWidth, y(0) - y(month.expense))}
                    fill={EXPENSE_COLOR}
                  />
                )}
                {index % step === 0 && (
                  <text
                    x={center}
                    y={TOP + PLOT + 18}
                    textAnchor="middle"
                    className="fill-muted-foreground text-xs"
                  >
                    {MONTH_SHORT[monthIndex]}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      {current && active !== null && (
        <ChartTooltip x={left + (active + 0.5) * band} containerWidth={width}>
          <p className="font-medium">{monthLabel(current.month)}</p>
          <TooltipRow color={INCOME_COLOR} label="Kas masuk" value={formatRupiah(current.income)} />
          <TooltipRow
            color={EXPENSE_COLOR}
            label="Kas keluar"
            value={formatRupiah(current.expense)}
          />
          <TooltipRow
            label="Selisih"
            value={`${current.income - current.expense > 0 ? '+' : ''}${formatRupiah(current.income - current.expense)}`}
          />
        </ChartTooltip>
      )}
    </div>
  )
}
