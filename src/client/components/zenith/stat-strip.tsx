import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type Stat = { label: string; value: ReactNode; className?: string }

// Deret angka ringkas dalam satu kartu (jumlah transaksi, saldo laporan): di layar lebar
// tiap angka satu kolom berlabel di atasnya; di bawah 1024 px menjadi baris label–angka.
// Angka mengecil mengikuti lebar kolomnya agar nominal Rupiah tidak terpotong.
export function StatStrip({
  label,
  stats,
  className,
}: {
  label: string
  stats: Stat[]
  className?: string
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        'overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10',
        className,
      )}
    >
      <dl className="grid divide-y lg:auto-cols-fr lg:grid-flow-col lg:divide-x lg:divide-y-0">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="@container flex items-baseline justify-between gap-3 px-4 py-3 lg:grid lg:content-start lg:gap-1 lg:px-5 lg:py-4"
          >
            <dt className="text-sm text-muted-foreground">{stat.label}</dt>
            <dd
              className={cn(
                'text-[length:clamp(1.125rem,9cqi,1.5rem)] leading-tight font-bold tracking-tight whitespace-nowrap tabular-nums',
                stat.className,
              )}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
