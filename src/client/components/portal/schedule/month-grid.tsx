import type { PublicWorshipItem, WorshipCategory } from '@shared/types'
import { KIND_BORDER, KIND_DOT, clock } from '@/components/portal/schedule/kinds'
import { dayOfWeek, groupByDate, periodLabel, sameMonth } from '@/lib/schedule-calendar'
import { cn } from '@/lib/utils'

// Tampilan Bulan kalender Jadwal Ibadah. Mulai 768 px: kisi 6×7 dengan sampai 3 label per
// tanggal ("18.00 Rayon Golgota") lalu "+N lainnya"; nomor tanggal membuka Agenda hari itu.
// Di ponsel: kisi bertitik saja, dan daftar tanggal terpilih tampil di bawahnya (halaman).

const WEEKDAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const WEEKDAY_LONG = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const CELL_LIMIT = 3

const dayName = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function weeksOf(dates: string[]) {
  return Array.from({ length: dates.length / 7 }, (_, index) =>
    dates.slice(index * 7, index * 7 + 7),
  )
}

function countLabel(count: number) {
  return count > 0 ? `${count} ibadah` : 'tidak ada ibadah'
}

// Label ringkas: ibadah rayon disebut rayonnya ("Rayon Golgota"; di bawah 1024 px cukup
// "Golgota", kata "Rayon" tetap dibaca pembaca layar), lainnya judulnya.
function ChipLabel({ worship }: { worship: PublicWorshipItem }) {
  if (worship.category === 'RAYON' && worship.rayon_name) {
    return (
      <>
        <span className="max-lg:sr-only">Rayon </span>
        {worship.rayon_name}
      </>
    )
  }
  return worship.title
}

type Props = {
  anchor: string
  dates: string[]
  worships: PublicWorshipItem[]
  today: string
  onOpen: (worship: PublicWorshipItem) => void
  onDay: (date: string) => void
}

export function MonthGrid({ anchor, dates, worships, today, onOpen, onDay }: Props) {
  const days = groupByDate(worships)
  return (
    <table className="w-full table-fixed border-separate border-spacing-0">
      <caption className="sr-only">Jadwal ibadah {periodLabel('bulan', anchor)}</caption>
      <thead>
        <tr>
          {WEEKDAY_SHORT.map((short, index) => (
            <th
              key={short}
              scope="col"
              abbr={WEEKDAY_LONG[index]}
              className={cn(
                'pb-2 text-center text-(length:--site-text-xs) font-semibold',
                index === 6 ? 'text-site-ink' : 'text-site-muted',
              )}
            >
              <span aria-hidden="true">{short}</span>
              <span className="sr-only">{WEEKDAY_LONG[index]}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeksOf(dates).map((week) => (
          <tr key={week[0]}>
            {week.map((date) => {
              const list = days.get(date) ?? []
              const extra = list.length - CELL_LIMIT
              const outside = !sameMonth(date, anchor)
              const isToday = date === today
              const past = date < today
              return (
                <td
                  key={date}
                  className={cn(
                    'h-28 border-t border-site-rule p-1 align-top',
                    dayOfWeek(date) === 6 && 'bg-site-ink/[0.035]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onDay(date)}
                    aria-label={`${dayName.format(Date.parse(date))}, ${countLabel(list.length)}. Buka agenda hari itu.`}
                    aria-current={isToday ? 'date' : undefined}
                    className={cn(
                      'mb-1 grid size-7 place-items-center rounded-full text-sm font-semibold tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring',
                      isToday
                        ? 'bg-site-ink text-site-canvas'
                        : outside
                          ? 'text-site-muted hover:bg-site-ink/[0.06]'
                          : 'text-site-ink hover:bg-site-ink/[0.06]',
                    )}
                  >
                    {Number(date.slice(8))}
                  </button>
                  <div className="grid gap-0.5">
                    {list.slice(0, extra > 0 ? CELL_LIMIT - 1 : CELL_LIMIT).map((worship) => (
                      <button
                        key={worship.id}
                        type="button"
                        onClick={() => onOpen(worship)}
                        className={cn(
                          'flex min-w-0 items-baseline gap-1 rounded-md border-l-[3px] py-0.5 pr-1 pl-1.5 text-left text-(length:--site-text-xs) leading-snug transition-colors outline-none hover:bg-site-ink/[0.07] focus-visible:ring-3 focus-visible:ring-ring',
                          KIND_BORDER[worship.category],
                          past
                            ? 'bg-transparent text-site-muted'
                            : 'bg-site-paper text-site-ink glass:bg-white/45 dark:glass:bg-white/[0.06]',
                        )}
                      >
                        {worship.worship_time && (
                          <span className="flex-none font-semibold tabular-nums">
                            {clock(worship.worship_time)}
                          </span>
                        )}
                        <span className="min-w-0 truncate font-medium">
                          <ChipLabel worship={worship} />
                        </span>
                        {past && <span className="sr-only"> (sudah lewat)</span>}
                      </button>
                    ))}
                    {extra > 0 && (
                      <button
                        type="button"
                        onClick={() => onDay(date)}
                        className="rounded-md px-1.5 py-0.5 text-left text-(length:--site-text-xs) font-semibold text-site-ink underline underline-offset-2 outline-none hover:bg-site-ink/[0.06] focus-visible:ring-3 focus-visible:ring-ring"
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

// Kisi bulan untuk ponsel: nomor tanggal dan titik jenis ibadah. Mengetuk tanggal memilihnya;
// daftar ibadah tanggal itu tampil di bawah kisi.
export function MonthDots({
  anchor,
  dates,
  today,
  days,
  onSelect,
}: {
  anchor: string
  dates: string[]
  today: string
  days: Map<string, { count: number; kinds: WorshipCategory[] }>
  onSelect: (date: string) => void
}) {
  return (
    <table className="w-full table-fixed border-separate border-spacing-0">
      <caption className="sr-only">Jadwal ibadah {periodLabel('bulan', anchor)}</caption>
      <thead>
        <tr>
          {WEEKDAY_SHORT.map((short, index) => (
            <th
              key={short}
              scope="col"
              abbr={WEEKDAY_LONG[index]}
              className="pb-1 text-center text-(length:--site-text-xs) font-semibold text-site-muted"
            >
              <span aria-hidden="true">{short.slice(0, 1)}</span>
              <span className="sr-only">{WEEKDAY_LONG[index]}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeksOf(dates).map((week) => (
          <tr key={week[0]}>
            {week.map((date) => {
              const summary = days.get(date)
              const selected = date === anchor
              const isToday = date === today
              return (
                <td key={date} className="p-0.5">
                  <button
                    type="button"
                    onClick={() => onSelect(date)}
                    aria-pressed={selected}
                    aria-current={isToday ? 'date' : undefined}
                    aria-label={`${dayName.format(Date.parse(date))}, ${countLabel(summary?.count ?? 0)}`}
                    className={cn(
                      'grid h-12 w-full place-items-center content-center gap-1 rounded-xl transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring',
                      selected ? 'bg-site-ink text-site-canvas' : 'hover:bg-site-ink/[0.06]',
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm tabular-nums',
                        isToday && !selected && 'font-bold underline underline-offset-4',
                        !selected &&
                          (sameMonth(date, anchor) ? 'text-site-ink' : 'text-site-muted'),
                      )}
                    >
                      {Number(date.slice(8))}
                    </span>
                    <span aria-hidden="true" className="flex h-1 items-center gap-0.5">
                      {summary?.kinds.map((kind) => (
                        <span
                          key={kind}
                          className={cn(
                            'size-1 rounded-full',
                            KIND_DOT[kind],
                            selected && 'ring-1 ring-site-canvas',
                          )}
                        />
                      ))}
                    </span>
                  </button>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
