import {
  CATEGORICAL_GROUPS,
  CATEGORICAL_GROUP_LABELS,
  GENDERS,
  GENDER_LABELS,
  type AnalyticsDemographics,
} from '@shared/types'
import { Donut } from '@/components/zenith/donut'
import { formatShare } from '@/lib/analytics'
import { cn } from '@/lib/utils'

// Grafik demografi jemaat (keadaan hari ini): komposisi jenis kelamin, jiwa per rayon,
// kelompok kategorial, dan cakupan sakramen. Setiap nilai tertulis di samping batangnya, sehingga tidak perlu
// tooltip untuk membacanya.

type Bar = { key: string; label: string; value: number; detail?: string; muted?: boolean }

// Daftar batang horizontal satu warna, satu baris per kategori: label, batang 8px, lalu
// nilai rata kanan (kolom nilai sama lebar di semua baris). Nilai nol tanpa potongan batang.
export function BarList({ caption, bars }: { caption: string; bars: Bar[] }) {
  const max = Math.max(1, ...bars.map((bar) => bar.value))
  return (
    <ul
      aria-label={caption}
      className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 text-sm"
    >
      {bars.map((bar) => (
        <li key={bar.key} className="col-span-3 grid grid-cols-subgrid items-center">
          <span className={cn('truncate', bar.muted && 'text-muted-foreground')}>{bar.label}</span>
          <span className="h-2">
            {bar.value > 0 && (
              <span
                className={cn('block h-2 rounded-full', bar.muted ? 'bg-chart-4' : 'bg-foreground')}
                style={{ width: `${(bar.value / max) * 100}%` }}
              />
            )}
          </span>
          <span className="text-right whitespace-nowrap tabular-nums">
            <span className={cn('font-medium', bar.muted && 'text-muted-foreground')}>
              {bar.value.toLocaleString('id-ID')}
            </span>
            {bar.detail && <span className="text-muted-foreground"> · {bar.detail}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function RayonBars({ rayons }: { rayons: AnalyticsDemographics['by_rayon'] }) {
  return (
    <BarList
      caption="Jiwa per rayon"
      bars={rayons.map((rayon) => ({
        key: String(rayon.rayon_id),
        label: rayon.rayon_name,
        value: rayon.members,
        detail: `${rayon.families.toLocaleString('id-ID')} KK`,
      }))}
    />
  )
}

export function CategoricalBars({
  groups,
  members,
}: {
  groups: AnalyticsDemographics['by_categorical']
  members: number
}) {
  const share = (value: number) =>
    members > 0 ? formatShare(Math.round((value / members) * 1000) / 10) : undefined
  return (
    <BarList
      caption="Kelompok kategorial"
      bars={[
        ...CATEGORICAL_GROUPS.map((group) => ({
          key: group,
          label: CATEGORICAL_GROUP_LABELS[group],
          value: groups[group],
          detail: share(groups[group]),
        })),
        // Hanya tampil bila ada; abu-abu karena bukan kelompok.
        ...(groups.unassigned > 0
          ? [
              {
                key: 'unassigned',
                label: 'Belum diisi',
                value: groups.unassigned,
                detail: share(groups.unassigned),
                muted: true,
              },
            ]
          : []),
      ]}
    />
  )
}

// Donat jenis kelamin dengan seri 1 dan 2 dari palet grafik (urutan tetap).
export function GenderComposition({ genders }: { genders: AnalyticsDemographics['by_gender'] }) {
  return (
    <Donut
      caption="Komposisi jemaat menurut jenis kelamin"
      totalLabel="jiwa"
      slices={GENDERS.map((gender, index) => ({
        key: gender,
        label: GENDER_LABELS[gender],
        value: genders[gender],
        color: `var(--chart-${index + 1})`,
      }))}
    />
  )
}

// Meter cakupan: isian = rasio sebenarnya terhadap jumlah anggota aktif, bertumpuk satu
// per baris.
export function SacramentCoverage({
  sacraments,
}: {
  sacraments: AnalyticsDemographics['sacraments']
}) {
  const rows = [
    {
      key: 'baptis',
      label: 'Baptis',
      count: sacraments.baptized,
      percent: sacraments.baptized_percent,
    },
    {
      key: 'sidi',
      label: 'Sidi',
      count: sacraments.confirmed,
      percent: sacraments.confirmed_percent,
    },
  ]
  return (
    <div className="grid gap-4">
      {rows.map((row) => (
        <div key={row.key} className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span>{row.label}</span>
            <span className="tabular-nums">
              <span className="font-medium">{formatShare(row.percent)}</span>
              <span className="text-muted-foreground">
                {' '}
                · {row.count.toLocaleString('id-ID')} dari{' '}
                {sacraments.members.toLocaleString('id-ID')}
              </span>
            </span>
          </div>
          <div
            role="meter"
            aria-label={`${row.label}: ${formatShare(row.percent)}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={row.percent}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            {row.count > 0 && (
              <div
                className="h-2 rounded-full bg-foreground"
                style={{ width: `${row.percent}%` }}
              />
            )}
          </div>
        </div>
      ))}
      <p className="text-[0.8125rem] text-muted-foreground">
        {sacraments.married.toLocaleString('id-ID')} jiwa berstatus menikah.
      </p>
    </div>
  )
}
