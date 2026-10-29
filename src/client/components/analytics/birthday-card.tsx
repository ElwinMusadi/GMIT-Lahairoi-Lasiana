import { useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import type { AnalyticsBirthday, AnalyticsBirthdays } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/zenith/panel'
import { Segmented } from '@/components/zenith/segmented'
import { StatusBadge } from '@/components/zenith/status-badge'
import { formatShortDay, monthLabel } from '@/lib/finance'
import { formatDate } from '@/lib/format'

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
  className,
}: {
  birthdays: AnalyticsBirthdays
  today: string
  className?: string
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
    <Panel
      title={`Ulang tahun jemaat ${view === 'week' ? 'minggu ini' : 'bulan ini'}`}
      description={<span className="tabular-nums">{range}</span>}
      className={className}
      contentClassName="flex min-h-0 flex-1 flex-col gap-3"
    >
      <Segmented
        label="Periode ulang tahun"
        value={view}
        onChange={setView}
        className="grid w-full grid-cols-2"
        options={[
          { value: 'week', label: 'Minggu ini', count: week.members.length },
          { value: 'month', label: 'Bulan ini', count: month.members.length },
        ]}
      />

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <span className="text-sm text-muted-foreground tabular-nums">
            {list.length.toLocaleString('id-ID')} jemaat
          </span>
          <Button variant="outline" onClick={copyForWarta}>
            <Copy data-icon="inline-start" />
            Salin untuk warta
          </Button>
        </div>
      )}
    </Panel>
  )
}

function BirthdayRow({ person, isToday }: { person: AnalyticsBirthday; isToday: boolean }) {
  return (
    <li className="flex items-start justify-between gap-3 border-t py-2.5 first:border-t-0">
      <div className="grid min-w-0 gap-0.5">
        <p className="flex min-w-0 items-center gap-2 text-sm">
          <span className="truncate font-medium">{person.full_name}</span>
          {isToday && (
            <StatusBadge tone="brand" className="flex-none">
              Hari ini
            </StatusBadge>
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
