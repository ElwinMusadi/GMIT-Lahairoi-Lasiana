import { useEffect } from 'react'
import type { PublicWorshipItem, WorshipCategory } from '@shared/types'
import { KIND_DOT } from '@/components/portal/schedule/kinds'
import { AgendaRow } from '@/components/portal/schedule/worship-card'
import { dayLabel } from '@/lib/portal'
import { scrollToElement } from '@/lib/portal-motion'
import { dayOfWeek, groupByDate } from '@/lib/schedule-calendar'
import { cn } from '@/lib/utils'

// Tampilan Agenda kalender Jadwal Ibadah: daftar per hari untuk satu pekan, baris ringkas.
// Hari tanpa ibadah tidak ditampilkan. `jumpTo` menggulir ke hari tertentu (dari pita pekan
// atau "+N lainnya" di tampilan Pekan).

export function AgendaList({
  worships,
  today,
  onOpen,
  jumpTo = null,
  onJumped,
  terms,
}: {
  worships: PublicWorshipItem[]
  today: string
  onOpen: (worship: PublicWorshipItem) => void
  jumpTo?: string | null
  onJumped?: () => void
  // Hasil pencarian: kata yang cocok ditandai.
  terms?: readonly string[]
}) {
  const days = [...groupByDate(worships)]

  useEffect(() => {
    if (!jumpTo) return
    const day = document.getElementById(`hari-${jumpTo}`)
    if (day) scrollToElement(day)
    onJumped?.()
  }, [jumpTo, onJumped])

  return (
    <div className="grid gap-6">
      {days.map(([date, list]) => (
        <section
          key={date}
          id={`hari-${date}`}
          aria-labelledby={`judul-hari-${date}`}
          className="scroll-mt-[calc(var(--site-header-top)+5rem)]"
        >
          <h3
            id={`judul-hari-${date}`}
            className={cn(
              'border-b border-site-rule px-2 pb-2 text-sm font-semibold',
              date === today ? 'text-site-ink' : 'text-site-muted',
            )}
          >
            {dayLabel(date, today)}
          </h3>
          <ul className="grid divide-y divide-site-rule">
            {list.map((worship) => (
              <li key={worship.id}>
                <AgendaRow worship={worship} onOpen={onOpen} past={date < today} terms={terms} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

const WEEKDAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const dayName = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

// Pita pekan untuk ponsel: tujuh hari dengan titik jenis ibadah. Mengetuk hari menggulir
// Agenda ke hari itu; hari tanpa ibadah tidak bisa diketuk.
export function WeekStrip({
  dates,
  today,
  days,
  onDay,
  className,
}: {
  dates: string[]
  today: string
  days: Map<string, { count: number; kinds: WorshipCategory[] }>
  onDay: (date: string) => void
  className?: string
}) {
  return (
    <ol aria-label="Hari dalam pekan ini" className={cn('grid grid-cols-7 gap-1', className)}>
      {dates.map((date) => {
        const summary = days.get(date)
        const isToday = date === today
        return (
          <li key={date}>
            <button
              type="button"
              disabled={!summary}
              onClick={() => onDay(date)}
              aria-label={`${dayName.format(Date.parse(date))}, ${
                summary ? `${summary.count} ibadah` : 'tidak ada ibadah'
              }`}
              aria-current={isToday ? 'date' : undefined}
              className={cn(
                'grid h-16 w-full place-items-center content-center gap-1 rounded-xl transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-45',
                isToday ? 'bg-site-ink text-site-canvas' : 'text-site-ink hover:bg-site-ink/[0.06]',
              )}
            >
              <span
                className={cn(
                  'text-(length:--site-text-xs) font-semibold',
                  !isToday && 'text-site-muted',
                )}
              >
                {WEEKDAY_SHORT[dayOfWeek(date)]}
              </span>
              <span className="font-site-display text-base leading-none font-bold tabular-nums">
                {Number(date.slice(8))}
              </span>
              <span aria-hidden="true" className="flex h-1 items-center gap-0.5">
                {summary?.kinds.map((kind) => (
                  <span
                    key={kind}
                    className={cn(
                      'size-1 rounded-full',
                      KIND_DOT[kind],
                      isToday && 'ring-1 ring-site-canvas',
                    )}
                  />
                ))}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
