import type { ReactNode } from 'react'
import { Download, MapPin } from 'lucide-react'
import {
  SERVANT_ROLE_LABELS,
  WORSHIP_CATEGORY_LABELS,
  type PublicWorship,
  type PublicWorshipItem,
} from '@shared/types'
import { WindowPanel } from '@/components/portal/kage/window-panel'
import { dateRange, dayLabel } from '@/lib/portal'

// Papan jadwal ibadah rancangan kage: panel jendela gelap, jadwal dikelompokkan per hari
// (label hari di kiri, baris ibadah di kanan), jam dengan aksen jingga. Dipakai Beranda
// (Pelayan Firman saja) dan halaman Jadwal Ibadah (semua petugas).

type Worship = PublicWorship | PublicWorshipItem

type Props = {
  worships: Worship[]
  today: string
  // Tingkat judul kelompok hari; judul ibadah satu tingkat di bawahnya.
  level?: 2 | 3
  // Pengganti daftar saat memuat, gagal, atau kosong.
  status?: ReactNode
  footer?: ReactNode
  className?: string
}

export function ScheduleBoard({ worships, today, level = 3, status, footer, className }: Props) {
  const days = groupByDay(worships)
  const DayHeading = level === 2 ? 'h2' : 'h3'
  const range =
    days.length > 0 ? `jadwal — ${dateRange(days[0].date, days[days.length - 1].date)}` : 'jadwal'

  return (
    <WindowPanel title={range} badge="WITA" footer={footer} className={className}>
      {status ?? (
        <div className="grid gap-10">
          {days.map((day) => (
            <div key={day.date} className="grid gap-3 md:grid-cols-12 md:gap-6">
              <DayHeading className="text-sm font-medium text-white/60 md:col-span-3 md:pt-0.5">
                {dayLabel(day.date, today)}
              </DayHeading>
              <ul className="grid gap-6 md:col-span-9">
                {day.worships.map((worship) => (
                  <li key={worship.id}>
                    <ScheduleRow worship={worship} level={level === 2 ? 'h3' : 'h4'} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </WindowPanel>
  )
}

function groupByDay(worships: Worship[]) {
  const days: { date: string; worships: Worship[] }[] = []
  for (const worship of worships) {
    const last = days[days.length - 1]
    if (last?.date === worship.worship_date) last.worships.push(worship)
    else days.push({ date: worship.worship_date, worships: [worship] })
  }
  return days
}

function ScheduleRow({ worship, level }: { worship: Worship; level: 'h3' | 'h4' }) {
  const Title = level
  const kind =
    worship.category === 'RAYON' && worship.rayon_name
      ? `Rayon ${worship.rayon_name}`
      : WORSHIP_CATEGORY_LABELS[worship.category]
  const servants =
    'servants' in worship
      ? worship.servants.map((servant) => ({
          role: SERVANT_ROLE_LABELS[servant.role],
          name: servant.name,
        }))
      : worship.preacher
        ? [{ role: 'Pelayan Firman', name: worship.preacher }]
        : []
  const details = [
    ['Tema', worship.theme],
    ['Bacaan', worship.bible_reading],
  ].filter((row): row is [string, string] => Boolean(row[1]))

  return (
    <article className="grid gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Title className="font-site-display text-lg font-bold text-white">{worship.title}</Title>
        <span className="font-site-mono text-sm font-medium text-site-accent tabular-nums">
          {worship.worship_time ? `${worship.worship_time.replace(':', '.')} WITA` : 'Jam menyusul'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/70">
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-(length:--site-text-xs) font-medium text-white/85">
          {kind}
        </span>
        {worship.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 flex-none" aria-hidden="true" />
            {worship.location}
          </span>
        )}
      </div>
      {(servants.length > 0 || details.length > 0) && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm sm:gap-x-6">
          {[...servants.map((servant) => [servant.role, servant.name]), ...details].map(
            ([term, value], index) => (
              <div key={`${term}-${index}`} className="contents">
                <dt className="text-white/55">{term}</dt>
                <dd
                  className={
                    term === 'Pelayan Firman' ? 'font-semibold text-white' : 'text-white/85'
                  }
                >
                  {value}
                </dd>
              </div>
            ),
          )}
        </dl>
      )}
      {worship.liturgy_file_url && (
        <a
          href={worship.liturgy_file_url}
          download={`tata-ibadah-${worship.worship_date}.pdf`}
          target="_blank"
          rel="noreferrer"
          aria-label={`Unduh tata ibadah ${worship.title} (PDF)`}
          className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-site-mono text-(length:--site-text-xs) text-white transition-colors outline-none hover:bg-white/20 focus-visible:ring-3 focus-visible:ring-site-accent"
        >
          tata-ibadah.pdf
          <Download className="size-3.5" aria-hidden="true" />
        </a>
      )}
    </article>
  )
}
