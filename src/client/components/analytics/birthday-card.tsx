import { useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import type { AnalyticsBirthday, AnalyticsBirthdays } from '@shared/types'
import { Button } from '@/components/ui/button'
import { formatShortDay, monthLabel } from '@/lib/finance'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

// Widget "Ulang Tahun Jemaat Minggu Ini" (PRD Fase 3) untuk doa syafaat dan warta:
// nama, tanggal lahir, usia yang dicapai, dan rayon. Tab kedua menampilkan bulan ini.
// Di layar lebar tinggi kartu mengikuti kartu Jemaat di sebelahnya dan daftarnya
// bergulir; di layar sempit daftarnya dibatasi ±6 baris lalu bergulir.

const dayFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const longDayFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export function BirthdayCard({
  birthdays,
  today,
}: {
  birthdays: AnalyticsBirthdays
  today: string
}) {
  const [view, setView] = useState<'week' | 'month'>('week')
  const { week, month } = birthdays
  const list = view === 'week' ? week.members : month.members
  const range =
    view === 'week'
      ? `${formatShortDay(week.from)} – ${formatShortDay(week.to)} ${week.to.slice(0, 4)}`
      : monthLabel(month.month)

  async function copyForWarta() {
    const lines = list.map(
      (person) =>
        `${longDayFormat.format(Date.parse(person.birthday))} — ${person.full_name} (${person.age} tahun, Rayon ${person.rayon_name})`,
    )
    try {
      await navigator.clipboard.writeText([`Ulang tahun jemaat, ${range}`, ...lines].join('\n'))
      toast.success('Daftar ulang tahun disalin untuk warta.')
    } catch {
      toast.error('Tidak dapat menyalin. Izinkan akses papan klip di browser ini.')
    }
  }

  return (
    <section
      aria-labelledby="judul-ulang-tahun"
      className="flex flex-col gap-3 rounded-lg border bg-card p-5 xl:h-0 xl:min-h-full"
    >
      <div className="grid gap-0.5">
        <h2 id="judul-ulang-tahun" className="text-base font-semibold">
          Ulang Tahun Jemaat {view === 'week' ? 'Minggu Ini' : 'Bulan Ini'}
        </h2>
        <p className="text-[0.8125rem] text-muted-foreground tabular-nums">{range}</p>
      </div>

      <div
        role="group"
        aria-label="Periode ulang tahun"
        className="grid grid-cols-2 gap-1 rounded-lg bg-rule p-1"
      >
        {(
          [
            ['week', 'Minggu ini', week.members.length],
            ['month', 'Bulan ini', month.members.length],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => setView(value)}
            className={cn(
              'h-8 rounded-md text-sm whitespace-nowrap',
              view === value
                ? 'bg-card font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label} <span className="text-muted-foreground tabular-nums">{count}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground">
          Tidak ada jemaat aktif yang berulang tahun {view === 'week' ? 'minggu' : 'bulan'} ini.
        </p>
      ) : (
        <ol
          tabIndex={0}
          aria-label={`Ulang tahun ${range}`}
          className="-mx-1 max-h-[22rem] overflow-y-auto rounded-md px-1 outline-offset-2 xl:max-h-none xl:min-h-0 xl:flex-1"
        >
          {list.map((person) => (
            <BirthdayRow
              key={person.member_id}
              person={person}
              isToday={person.birthday === today}
            />
          ))}
        </ol>
      )}

      {list.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-2">
          <span className="text-[0.8125rem] text-muted-foreground tabular-nums">
            {list.length.toLocaleString('id-ID')} jemaat
          </span>
          <Button variant="ghost" size="sm" className="-mr-2" onClick={copyForWarta}>
            <Copy data-icon="inline-start" />
            Salin untuk warta
          </Button>
        </div>
      )}
    </section>
  )
}

function BirthdayRow({ person, isToday }: { person: AnalyticsBirthday; isToday: boolean }) {
  return (
    <li className="flex items-start justify-between gap-3 border-t border-rule py-2.5 first:border-t-0">
      <div className="grid min-w-0 gap-0.5">
        <p className="flex min-w-0 items-center gap-2 text-sm">
          <span className="truncate font-medium">{person.full_name}</span>
          {isToday && (
            <span className="flex-none rounded-full bg-secondary px-2 py-0.5 text-xs font-medium whitespace-nowrap text-secondary-foreground">
              Hari ini
            </span>
          )}
        </p>
        <p className="text-[0.8125rem] text-muted-foreground">
          Rayon {person.rayon_name} · lahir {formatDate(person.birth_date)}
        </p>
      </div>
      <div className="grid flex-none gap-0.5 text-right">
        <p className="text-sm whitespace-nowrap">{dayFormat.format(Date.parse(person.birthday))}</p>
        <p className="text-[0.8125rem] whitespace-nowrap text-muted-foreground tabular-nums">
          {person.age} tahun
        </p>
      </div>
    </li>
  )
}
