import { useId } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

// Motif tunggal seluruh sistem: sumur Lahai-roi (Kejadian 16:13–14) dilihat dari
// atas, yaitu sebuah cincin. Dipakai sebagai tanda merek, penanda aktif, bentuk
// besar di hero, dan dibangun ulang dari empat potongan di footer.

const RING_PATH = 'M16 1a15 15 0 1 1 0 30a15 15 0 1 1 0-30Zm0 8a7 7 0 1 0 0 14a7 7 0 1 0 0-14Z'

export function WellMark({ className, label }: { className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path fill="currentColor" fillRule="evenodd" d={RING_PATH} />
    </svg>
  )
}

// Cincin yang sama, disusun dari sepuluh potongan seperti batu bibir sumur.
const STONE_JOINTS = [0, 36, 72, 108, 144]

export function BuiltWell({ className }: { className?: string }) {
  const maskId = useId()
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <mask id={maskId}>
        <rect width="200" height="200" fill="white" />
        {STONE_JOINTS.map((angle) => (
          <rect
            key={angle}
            x="98.5"
            y="-10"
            width="3"
            height="220"
            fill="black"
            transform={`rotate(${angle} 100 100)`}
          />
        ))}
      </mask>
      <path
        fill="currentColor"
        fillRule="evenodd"
        mask={`url(#${maskId})`}
        d="M100 0a100 100 0 1 1 0 200a100 100 0 1 1 0-200Zm0 50a50 50 0 1 0 0 100a50 50 0 1 0 0-100Z"
      />
    </svg>
  )
}

export function Wordmark({ to = '/', className }: { to?: string; className?: string }) {
  return (
    <Link
      to={to}
      aria-label={to === '/' ? 'Lahairoi, GMIT Tuak Sabu Lasiana: beranda' : 'Lahairoi, GMIT Tuak Sabu Lasiana'}
      className={cn('group inline-flex items-center gap-2.5 rounded-full outline-offset-4', className)}
    >
      <WellMark className="size-7 shrink-0 text-brand transition-transform duration-300 group-hover:scale-110" />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-semibold tracking-[-0.01em]">Lahairoi</span>
        <span className="mt-1 text-[0.8125rem] text-muted-foreground">GMIT · Tuak Sabu Lasiana</span>
      </span>
    </Link>
  )
}
