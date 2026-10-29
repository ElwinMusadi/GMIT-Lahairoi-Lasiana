// Motif tunggal seluruh sistem: sumur Lahai-roi (Kejadian 16:13–14) dilihat dari
// atas, yaitu sebuah cincin. Dipakai sebagai tanda merek dan penanda aktif.

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
