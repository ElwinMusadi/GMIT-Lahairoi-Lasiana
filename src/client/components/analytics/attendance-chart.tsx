import { useId, useState, type KeyboardEvent } from 'react'
import type { AnalyticsAttendanceWeek, WorshipCategory } from '@shared/types'
import { MONTH_SHORT, labelStep, monotonePath, niceTicks, useElementWidth } from '@/lib/analytics'
import { formatShortDay } from '@/lib/finance'
import { ChartTooltip, TooltipRow } from './chart-parts'

// Tren rata-rata kehadiran per ibadah dari minggu ke minggu untuk satu jenis ibadah, sebagai
// kurva halus dengan isian bergradasi (Zenith). Minggu tanpa data memutus garis (bukan nol);
// titik yang berdiri sendiri digambar sebagai titik.
export const ATTENDANCE_COLOR = 'var(--brand)'

const PLOT = 190
const TOP = 10
const AXIS = 28

export function AttendanceChart({
  weeks,
  category,
  emptyText,
}: {
  weeks: AnalyticsAttendanceWeek[]
  category: WorshipCategory
  emptyText: string
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const gradient = useId()

  const values = weeks.map((week) => week.by_category[category].average)
  const max = Math.max(0, ...values.map((value) => value ?? 0))
  const ticks = niceTicks(max, { integer: true })
  const top = ticks.at(-1) || 1
  const left = String(top).length * 7 + 14
  const plotWidth = Math.max(0, width - left - 8)
  const gap = weeks.length > 1 ? plotWidth / (weeks.length - 1) : 0
  const x = (index: number) => (weeks.length > 1 ? left + index * gap : left + plotWidth / 2)
  const y = (value: number) => TOP + PLOT - (value / top) * PLOT
  const hasData = values.some((value) => value !== null)

  // Garis terputus di minggu tanpa data; tiap ruas punya isian sampai garis dasar.
  const segments: { line: string; area: string }[] = []
  const lonely: number[] = []
  let run: number[] = []
  const flush = () => {
    if (run.length === 1) lonely.push(run[0])
    if (run.length > 1) {
      const line = monotonePath(run.map((index) => [x(index), y(values[index] ?? 0)] as const))
      const base = y(0)
      segments.push({
        line,
        area: `${line} L${x(run.at(-1) ?? 0)},${base} L${x(run[0])},${base} Z`,
      })
    }
    run = []
  }
  values.forEach((value, index) => (value === null ? flush() : run.push(index)))
  flush()

  // Label bulan di minggu pertama tiap bulan (menurut hari Sabtunya).
  const monthStarts = weeks
    .map((week, index) => ({ index, month: Number(week.week_end.slice(5, 7)) - 1 }))
    .filter(
      ({ index, month }) =>
        index === 0 || Number(weeks[index - 1].week_end.slice(5, 7)) - 1 !== month,
    )
  const step = labelStep(monthStarts.length, plotWidth, 36)

  const current = active === null ? null : weeks[active]
  const currentStat = current?.by_category[category]

  function moveWith(event: KeyboardEvent) {
    const last = weeks.length - 1
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
      aria-label="Rata-rata kehadiran per minggu. Gunakan panah kiri dan kanan untuk membaca tiap minggu."
      onKeyDown={moveWith}
      onFocus={() => setActive((value) => value ?? weeks.length - 1)}
      onBlur={() => setActive(null)}
      onPointerLeave={() => setActive(null)}
      className="relative rounded-md outline-offset-4"
      style={{ height: TOP + PLOT + AXIS }}
    >
      {width > 0 && weeks.length > 0 && (
        <svg
          width={width}
          height={TOP + PLOT + AXIS}
          aria-hidden="true"
          className="block overflow-visible"
          onPointerMove={(event) => {
            const px = event.clientX - event.currentTarget.getBoundingClientRect().left
            if (px < left - 4) return setActive(null)
            const index = gap > 0 ? Math.round((px - left) / gap) : 0
            setActive(Math.max(0, Math.min(weeks.length - 1, index)))
          }}
        >
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={ATTENDANCE_COLOR} stopOpacity="0.18" />
              <stop offset="1" stopColor={ATTENDANCE_COLOR} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={left}
                x2={width - 8}
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
                {tick.toLocaleString('id-ID')}
              </text>
            </g>
          ))}
          {monthStarts.map(
            ({ index, month }, i) =>
              i % step === 0 && (
                <text
                  key={index}
                  x={Math.min(Math.max(x(index), left + 12), width - 20)}
                  y={TOP + PLOT + 18}
                  textAnchor="middle"
                  className="fill-muted-foreground text-xs"
                >
                  {MONTH_SHORT[month]}
                </text>
              ),
          )}
          {active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={TOP}
              y2={TOP + PLOT}
              stroke="var(--input)"
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          )}
          {segments.map((segment, index) => (
            <path key={`isi-${index}`} d={segment.area} fill={`url(#${gradient})`} />
          ))}
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.line}
              fill="none"
              stroke={ATTENDANCE_COLOR}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {lonely.map((index) => (
            <circle
              key={index}
              cx={x(index)}
              cy={y(values[index] ?? 0)}
              r={4}
              fill={ATTENDANCE_COLOR}
              stroke="var(--card)"
              strokeWidth={2}
            />
          ))}
          {active !== null && values[active] !== null && (
            <circle
              cx={x(active)}
              cy={y(values[active] ?? 0)}
              r={5}
              fill={ATTENDANCE_COLOR}
              stroke="var(--card)"
              strokeWidth={2}
            />
          )}
        </svg>
      )}
      {!hasData && (
        <p className="absolute inset-x-0 top-1/3 px-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      )}
      {current && currentStat && active !== null && (
        <ChartTooltip x={x(active)} containerWidth={width}>
          <p className="font-medium">
            {formatShortDay(current.week_start)} – {formatShortDay(current.week_end)}{' '}
            {current.week_end.slice(0, 4)}
          </p>
          {currentStat.average === null ? (
            <p className="text-muted-foreground">Belum ada kehadiran yang diinput.</p>
          ) : (
            <>
              <TooltipRow
                color={ATTENDANCE_COLOR}
                label="Rata-rata per ibadah"
                value={currentStat.average.toLocaleString('id-ID')}
              />
              <TooltipRow label="Ibadah" value={currentStat.services.toLocaleString('id-ID')} />
              <TooltipRow label="Total hadir" value={currentStat.total.toLocaleString('id-ID')} />
            </>
          )}
        </ChartTooltip>
      )}
    </div>
  )
}
