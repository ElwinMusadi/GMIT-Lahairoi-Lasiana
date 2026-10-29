import { useId, type ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Kartu widget bergaya Zenith: judul, satu baris keterangan, aksi di kanan (tautan "Lihat
// semua", kendali grafik), lalu isi. Kepala kartu membungkus aksinya ke baris berikut bila
// sempit, agar judul tidak terhimpit di ponsel.
export function Panel({
  title,
  description,
  action,
  busy = false,
  className,
  contentClassName,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  // Data sedang dimuat ulang: isi lama dipertahankan, sedikit pudar.
  busy?: boolean
  className?: string
  contentClassName?: string
  children: ReactNode
}) {
  const headingId = useId()
  return (
    <Card
      role="region"
      aria-labelledby={headingId}
      aria-busy={busy || undefined}
      className={cn('min-w-0 [--card-spacing:--spacing(5)]', className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-(--card-spacing)">
        {/* Dasar 12rem: aksi tetap sebaris dengan judul selama muat, keterangan yang panjang
            membungkus di bawah judul. */}
        <div className="grid min-w-0 flex-1 basis-48 gap-1">
          <h2 id={headingId} className="text-base leading-snug font-semibold">
            {title}
          </h2>
          {description && <div className="text-sm text-muted-foreground">{description}</div>}
        </div>
        {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      </div>
      <CardContent
        className={cn(
          '@container min-w-0 transition-opacity',
          busy && 'opacity-60',
          contentClassName,
        )}
      >
        {children}
      </CardContent>
    </Card>
  )
}

// Tautan "Lihat semua" di kepala kartu.
export function PanelLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="-my-1 inline-flex items-center gap-1 rounded-md py-1 text-sm font-medium whitespace-nowrap outline-none hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
      <ArrowUpRight className="size-3.5" aria-hidden="true" />
    </Link>
  )
}
