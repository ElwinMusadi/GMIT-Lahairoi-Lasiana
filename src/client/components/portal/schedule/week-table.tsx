import type { PublicWorshipItem } from '@shared/types'
import { clock } from '@/components/portal/schedule/kinds'
import { WeekCard } from '@/components/portal/schedule/worship-card'
import { dayOfWeek, periodLabel, timeRows } from '@/lib/schedule-calendar'
import { cn } from '@/lib/utils'

// Tampilan Pekan kalender Jadwal Ibadah, seperti jadwal pelajaran: kolom Senin–Minggu, baris
// per jam yang benar-benar dipakai pekan itu (jadwal tidak menyimpan jam selesai, jadi tidak
// ada kisi jam berdurasi), dan baris "Jam menyusul" di akhir bila ada.

const WEEKDAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const WEEKDAY_LONG = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
// Sel yang lebih padat dari ini menampilkan "+N lainnya".
const CELL_LIMIT = 3

type Props = {
  dates: string[]
  worships: PublicWorshipItem[]
  today: string
  onOpen: (worship: PublicWorshipItem) => void
  // "+N lainnya": buka Agenda di hari itu.
  onDay: (date: string) => void
}

export function WeekTable({ dates, worships, today, onOpen, onDay }: Props) {
  const rows = timeRows(worships)
  return (
    <table className="w-full table-fixed border-separate border-spacing-0">
      <caption className="sr-only">Jadwal ibadah {periodLabel('pekan', dates[0])}</caption>
      <thead>
        <tr>
          <th scope="col" className="w-11 lg:w-16">
            <span className="sr-only">Jam</span>
          </th>
          {dates.map((date) => {
            const index = dayOfWeek(date)
            const isToday = date === today
            return (
              <th
                key={date}
                scope="col"
                abbr={WEEKDAY_LONG[index]}
                className={cn(
                  'px-1 pb-2 text-center font-normal',
                  index === 6 && 'rounded-t-xl bg-site-ink/[0.035]',
                )}
              >
                <span
                  className={cn(
                    'block text-(length:--site-text-xs) font-semibold',
                    isToday ? 'text-site-ink' : 'text-site-muted',
                  )}
                >
                  <span aria-hidden="true">{WEEKDAY_SHORT[index]}</span>
                  <span className="sr-only">{WEEKDAY_LONG[index]}</span>
                </span>
                <span
                  className={cn(
                    'mx-auto mt-1 grid size-8 place-items-center rounded-full font-site-display text-base font-bold tabular-nums',
                    isToday ? 'bg-site-ink text-site-canvas' : 'text-site-ink',
                  )}
                >
                  {Number(date.slice(8))}
                </span>
                {isToday && <span className="sr-only"> (hari ini)</span>}
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((time) => (
          <tr key={time ?? 'menyusul'}>
            <th
              scope="row"
              className="border-t border-site-rule pt-2.5 pr-2 text-left align-top font-site-mono text-(length:--site-text-xs) font-medium text-site-muted tabular-nums"
            >
              {clock(time) ?? 'Jam menyusul'}
            </th>
            {dates.map((date) => {
              const cell = worships.filter(
                (worship) => worship.worship_date === date && worship.worship_time === time,
              )
              const extra = cell.length - CELL_LIMIT
              return (
                <td
                  key={date}
                  className={cn(
                    'border-t border-site-rule p-0.5 align-top lg:p-1',
                    dayOfWeek(date) === 6 && 'bg-site-ink/[0.035]',
                  )}
                >
                  <div className="grid gap-1">
                    {cell.slice(0, extra > 0 ? CELL_LIMIT - 1 : CELL_LIMIT).map((worship) => (
                      <WeekCard
                        key={worship.id}
                        worship={worship}
                        onOpen={onOpen}
                        past={date < today}
                      />
                    ))}
                    {extra > 0 && (
                      <button
                        type="button"
                        onClick={() => onDay(date)}
                        className="rounded-lg px-2 py-1.5 text-left text-(length:--site-text-xs) font-semibold text-site-ink underline underline-offset-2 outline-none hover:bg-site-ink/[0.06] focus-visible:ring-3 focus-visible:ring-ring"
                      >
                        +{extra + 1} lainnya
                      </button>
                    )}
                  </div>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
