import type { ReactNode } from 'react'
import { ArrowRight, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Sparkline } from '@/components/zenith/sparkline'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: ReactNode
  icon: LucideIcon
  // brand: angka utama dengan aksen crimson; neutral: kartu pendamping (D3, crimson hanya data).
  tone?: 'brand' | 'neutral'
  // Perubahan dalam persen terhadap periode pembanding; null bila belum ada pembanding.
  trend?: number | null
  // Arah yang baik: naik untuk jumlah jiwa atau saldo, turun untuk mis. kas keluar.
  goodWhen?: 'up' | 'down'
  hint?: ReactNode
  spark?: number[]
  to?: string
}

// Kartu KPI bergaya Zenith: label dan ikon dalam kotak bertint, angka besar, perubahan
// berwarna, dan grafik mini opsional. Angka memakai seluruh lebar kartu dan mengecil bila
// kartu sempit (mis. saldo Rupiah di empat kolom), agar tidak terpotong. Seluruh kartu
// menjadi tautan bila `to` diisi; kartu bertautan tanpa grafik mini diberi baris
// "Lihat rincian" di bawah.
export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
  trend = null,
  goodWhen = 'up',
  hint,
  spark,
  to,
}: Props) {
  const good = trend !== null && (goodWhen === 'up' ? trend >= 0 : trend <= 0)
  // Sama dengan syarat Sparkline menggambar: minimal dua titik yang tidak datar.
  const hasSpark = spark !== undefined && spark.length > 1 && spark.some((v) => v !== spark[0])
  const body = (
    <>
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <p className="min-w-0 truncate text-sm text-muted-foreground">{label}</p>
        <span
          aria-hidden="true"
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-lg',
            tone === 'brand' ? 'bg-brand/12 text-brand' : 'bg-muted text-foreground',
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-1 truncate px-5 text-[length:clamp(1.25rem,10.5cqi,1.75rem)] leading-tight font-bold tracking-tight tabular-nums">
        {value}
      </p>
      <div className="mt-2 flex min-w-0 items-center gap-1.5 px-5 pb-5 text-xs">
        {trend !== null && (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 font-medium tabular-nums',
              good ? 'text-positive' : 'text-destructive',
            )}
          >
            {trend >= 0 ? (
              <TrendingUp className="size-3.5" aria-hidden="true" />
            ) : (
              <TrendingDown className="size-3.5" aria-hidden="true" />
            )}
            {trend > 0 ? '+' : ''}
            {trend.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%
          </span>
        )}
        {hint && <span className="truncate text-muted-foreground">{hint}</span>}
      </div>
      {hasSpark ? (
        <Sparkline
          values={spark}
          className={cn('mt-auto -mb-px', tone === 'brand' ? 'text-brand' : 'text-chart-2')}
        />
      ) : (
        to && (
          <span className="mt-auto flex items-center gap-1 px-5 pb-5 text-xs font-medium text-muted-foreground">
            Lihat rincian
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </span>
        )
      )}
    </>
  )

  const card =
    '@container flex min-w-0 flex-col overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10'
  return to ? (
    <Link
      to={to}
      className={cn(
        card,
        'transition-shadow outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50',
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={card}>{body}</div>
  )
}
