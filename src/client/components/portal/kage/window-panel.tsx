import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Panel gelap bergaya jendela dari rancangan kage: bilah atas dengan tiga titik, judul
// mono, dan badge opsional; isi; lalu bilah bawah opsional. Dipakai untuk papan jadwal,
// warta terbaru, cek status sakramen, dan kode registrasi.

type Props = {
  // Judul mono di bilah atas, mis. "jadwal — 1 s.d. 7 November 2026".
  title?: ReactNode
  badge?: ReactNode
  footer?: ReactNode
  children: ReactNode
  // Panel kecil di dalam kartu: titik dan jarak lebih rapat.
  compact?: boolean
  className?: string
  bodyClassName?: string
}

export function WindowPanel({
  title,
  badge,
  footer,
  children,
  compact = false,
  className,
  bodyClassName,
}: Props) {
  return (
    <div
      className={cn(
        // min-w-0: judul mono yang panjang dipotong, bukan melebarkan kolom grid induknya.
        // Tepi hanya di tema gelap, agar panel tetap terpisah dari kanvas yang gelap.
        'min-w-0 overflow-hidden text-left text-white dark:border dark:border-white/10',
        compact ? 'rounded-xl bg-site-panel-2' : 'rounded-3xl bg-site-panel shadow-site-panel',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 bg-white/[0.05]',
          compact ? 'px-4 py-3' : 'px-5 py-4 md:px-6',
        )}
      >
        <span aria-hidden="true" className="flex flex-none items-center gap-1.5">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className={cn('rounded-full bg-white/20', compact ? 'size-2.5' : 'size-3')}
            />
          ))}
        </span>
        {title && (
          // w-0 + flex-1: judul tidak ikut menentukan lebar minimum panel, jadi dipotong.
          <div className="w-0 flex-1 truncate text-center font-site-mono text-[13px] tracking-wide text-white/70">
            {title}
          </div>
        )}
        {badge && (
          <div className="ml-auto flex-none rounded border border-site-accent/30 bg-site-accent/10 px-2 py-0.5 font-site-mono text-[13px] text-site-accent">
            {badge}
          </div>
        )}
      </div>
      <div className={cn(compact ? 'p-4' : 'p-5 md:p-8', bodyClassName)}>{children}</div>
      {footer && (
        <div className="flex flex-col items-start justify-between gap-3 bg-white/[0.05] px-5 py-4 text-sm text-white/70 sm:flex-row sm:items-center md:px-6">
          {footer}
        </div>
      )}
    </div>
  )
}
