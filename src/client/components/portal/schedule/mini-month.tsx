import { useId, useState, type KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { WorshipCategory } from '@shared/types'
import { KIND_DOT } from '@/components/portal/schedule/kinds'
import { addDays } from '@/lib/portal'
import {
  dayOfWeek,
  monthGrid,
  periodLabel,
  sameMonth,
  weekStart,
  type CalendarView,
} from '@/lib/schedule-calendar'
import { cn } from '@/lib/utils'

// Kalender mini di sisi kiri kalender Jadwal Ibadah: bulan jangkar dengan titik berwarna per
// jenis ibadah, hari ini dilingkari, dan pekan yang tampil disorot. Mengetuk tanggal
// memindahkan kalender ke sana. Tombol panah memindahkan fokus antar-tanggal (Home/End: awal
// dan akhir pekan, PageUp/PageDown: bulan), Enter memilih.

const WEEKDAYS = [
  ['S', 'Senin'],
  ['S', 'Selasa'],
  ['R', 'Rabu'],
  ['K', 'Kamis'],
  ['J', 'Jumat'],
  ['S', 'Sabtu'],
  ['M', 'Minggu'],
] as const

const dayName = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

type Props = {
  anchor: string
  today: string
  view: CalendarView
  days: Map<string, { count: number; kinds: WorshipCategory[] }>
  onSelect: (date: string) => void
  onMonth: (direction: 1 | -1) => void
  className?: string
}

export function MiniMonth({ anchor, today, view, days, onSelect, onMonth, className }: Props) {
  const titleId = useId()
  const grid = monthGrid(anchor)
  const weeks = Array.from({ length: 6 }, (_, index) => grid.slice(index * 7, index * 7 + 7))
  const activeWeek = view === 'bulan' ? null : weekStart(anchor)
  // Tanggal yang bisa difokus dengan Tab (roving tabindex): yang terakhir disentuh, atau
  // jangkarnya.
  const [focus, setFocus] = useState<string | null>(null)
  const tabStop = focus && grid.includes(focus) ? focus : anchor

  function handleKey(event: KeyboardEvent<HTMLTableElement>) {
    const current = (event.target as HTMLElement).dataset.date
    if (!current) return
    const moves: Record<string, () => string | null> = {
      ArrowLeft: () => addDays(current, -1),
      ArrowRight: () => addDays(current, 1),
      ArrowUp: () => addDays(current, -7),
      ArrowDown: () => addDays(current, 7),
      Home: () => addDays(current, -dayOfWeek(current)),
      End: () => addDays(current, 6 - dayOfWeek(current)),
    }
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault()
      onMonth(event.key === 'PageUp' ? -1 : 1)
      return
    }
    const target = moves[event.key]?.()
    if (!target) return
    event.preventDefault()
    // Di luar kisi yang tampil: berhenti di tepi (datanya hanya untuk kisi ini).
    if (!grid.includes(target)) return
    setFocus(target)
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)?.focus()
  }

  return (
    <div className={cn('grid gap-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 id={titleId} className="font-site-display text-base font-bold text-site-ink">
          {periodLabel('bulan', anchor)}
        </h2>
        <div className="flex items-center gap-1">
          <MonthButton direction={-1} onMonth={onMonth} />
          <MonthButton direction={1} onMonth={onMonth} />
        </div>
      </div>
      <table
        aria-labelledby={titleId}
        className="w-full table-fixed border-separate border-spacing-0"
        onKeyDown={handleKey}
      >
        <thead>
          <tr>
            {WEEKDAYS.map(([short, long]) => (
              <th
                key={long}
                scope="col"
                abbr={long}
                className={cn(
                  'pb-1 text-center text-(length:--site-text-xs) font-semibold',
                  long === 'Minggu' ? 'text-site-ink' : 'text-site-muted',
                )}
              >
                <span aria-hidden="true">{short}</span>
                <span className="sr-only">{long}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => {
            const active = week[0] === activeWeek
            return (
              <tr key={week[0]}>
                {week.map((date, index) => {
                  const summary = days.get(date)
                  const isToday = date === today
                  const outside = !sameMonth(date, anchor)
                  return (
                    <td
                      key={date}
                      className={cn(
                        'p-0',
                        active && 'bg-site-ink/[0.06]',
                        active && index === 0 && 'rounded-l-xl',
                        active && index === 6 && 'rounded-r-xl',
                      )}
                    >
                      <button
                        type="button"
                        data-date={date}
                        tabIndex={date === tabStop ? 0 : -1}
                        aria-current={isToday ? 'date' : undefined}
                        aria-label={`${dayName.format(Date.parse(date))}, ${
                          summary ? `${summary.count} ibadah` : 'tidak ada ibadah'
                        }`}
                        onClick={() => {
                          setFocus(date)
                          onSelect(date)
                        }}
                        className="group/day grid h-11 w-full place-items-center content-center gap-1 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring"
                      >
                        <span
                          className={cn(
                            'grid size-7 place-items-center rounded-full text-sm tabular-nums transition-colors',
                            isToday
                              ? 'bg-site-ink font-bold text-site-canvas'
                              : 'group-hover/day:bg-site-ink/10',
                            !isToday && (outside ? 'text-site-muted' : 'text-site-ink'),
                          )}
                        >
                          {Number(date.slice(8))}
                        </span>
                        <span aria-hidden="true" className="flex h-1 items-center gap-0.5">
                          {summary?.kinds.map((kind) => (
                            <span
                              key={kind}
                              className={cn('size-1 rounded-full', KIND_DOT[kind])}
                            />
                          ))}
                        </span>
                      </button>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function MonthButton({ direction, onMonth }: { direction: 1 | -1; onMonth: (d: 1 | -1) => void }) {
  const Icon = direction === 1 ? ChevronRight : ChevronLeft
  const label = direction === 1 ? 'Bulan berikutnya' : 'Bulan sebelumnya'
  return (
    <button
      type="button"
      onClick={() => onMonth(direction)}
      aria-label={label}
      title={label}
      className="grid size-9 place-items-center rounded-full text-site-ink transition-colors outline-none hover:bg-site-ink/10 focus-visible:ring-3 focus-visible:ring-ring"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  )
}
