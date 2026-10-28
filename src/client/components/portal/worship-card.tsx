import { Download, MapPin } from 'lucide-react'
import {
  SERVANT_ROLE_LABELS,
  WORSHIP_CATEGORY_LABELS,
  type PublicWorship,
  type PublicWorshipItem,
} from '@shared/types'
import { PortalCard } from '@/components/portal/parts'
import { WORSHIP_TONE, worshipWhen } from '@/lib/portal'
import { cn } from '@/lib/utils'

// Kartu satu jadwal ibadah (rancangan portal: garis kiri berwarna menurut jenis ibadah).
// Dengan `servants` (Papan Jadwal) semua petugas tampil; tanpa itu (Beranda) cukup
// Pelayan Firman.
export function WorshipCard({
  worship,
  today,
  showDay = true,
}: {
  worship: PublicWorship | PublicWorshipItem
  today: string
  // Di Papan Jadwal tanggal sudah menjadi judul kelompok; cukup jamnya.
  showDay?: boolean
}) {
  const tone = WORSHIP_TONE[worship.category]
  const label =
    worship.category === 'RAYON' && worship.rayon_name
      ? `Rayon ${worship.rayon_name}`
      : WORSHIP_CATEGORY_LABELS[worship.category]
  const servants =
    'servants' in worship
      ? worship.servants.map((servant) => [SERVANT_ROLE_LABELS[servant.role], servant.name])
      : [['Pelayan Firman', worship.preacher]]
  const rows = [...servants, ['Tema', worship.theme], ['Bacaan', worship.bible_reading]].filter(
    (row): row is [string, string] => Boolean(row[1]),
  )
  const when = showDay
    ? worshipWhen(worship.worship_date, worship.worship_time, today)
    : worship.worship_time
      ? `${worship.worship_time.replace(':', '.')} WITA`
      : 'Jam menyusul'

  return (
    <PortalCard
      as="article"
      className="relative flex flex-col justify-between overflow-hidden p-4 transition-shadow hover:shadow-md"
    >
      <span className={cn('absolute inset-y-0 left-0 w-1.5', tone.bar)} aria-hidden="true" />
      <div className="grid gap-3 pl-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold uppercase', tone.pill)}>
            {label}
          </span>
          <span className="text-xs font-medium text-portal-muted tabular-nums">{when}</span>
        </div>
        <div className="grid gap-1">
          <h3 className="font-portal-heading text-xl leading-7 font-semibold text-portal-navy">
            {worship.title}
          </h3>
          {worship.location && (
            <p className="flex items-center gap-1.5 text-sm text-portal-muted">
              <MapPin className="size-3.5 flex-none text-portal-navy" aria-hidden="true" />
              {worship.location}
            </p>
          )}
        </div>
        {rows.length > 0 && (
          <dl className="grid gap-1 rounded-lg bg-portal-low p-3 text-sm">
            {rows.map(([term, value], index) => (
              <div key={`${term}-${index}`} className="flex items-baseline justify-between gap-3">
                <dt className="flex-none text-xs text-portal-muted">{term}</dt>
                <dd
                  className={cn(
                    'text-right',
                    term === 'Pelayan Firman' ? 'font-bold text-portal-navy' : 'text-portal-ink',
                  )}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {worship.liturgy_file_url && (
        <div className="mt-3 flex justify-end border-t border-portal-high pt-3 pl-1.5">
          <a
            href={worship.liturgy_file_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-portal-navy hover:underline"
          >
            Tata ibadah
            <Download className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      )}
    </PortalCard>
  )
}
