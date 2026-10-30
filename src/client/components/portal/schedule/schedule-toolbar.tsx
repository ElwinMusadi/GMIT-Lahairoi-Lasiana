import { ChevronLeft, ChevronRight } from 'lucide-react'
import { periodLabel, sameMonth, weekDates, type CalendarView } from '@/lib/schedule-calendar'
import { cn } from '@/lib/utils'

// Bilah alat kalender Jadwal Ibadah: pindah periode, kembali ke hari ini, label periode, dan
// pilihan tampilan. Di bawah 768 px tampilan Pekan tidak ditawarkan (tujuh kolom terlalu
// sempit); Agenda menggantikannya.

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: 'agenda', label: 'Agenda' },
  { value: 'pekan', label: 'Pekan' },
  { value: 'bulan', label: 'Bulan' },
]

type Props = {
  view: CalendarView
  anchor: string
  today: string
  titleId: string
  onShift: (direction: 1 | -1) => void
  onToday: () => void
  onView: (view: CalendarView) => void
}

export function ScheduleToolbar({ view, anchor, today, titleId, onShift, onToday, onView }: Props) {
  const unit = view === 'bulan' ? 'Bulan' : 'Pekan'
  const showsToday = view === 'bulan' ? sameMonth(anchor, today) : weekDates(anchor).includes(today)

  // Ponsel: baris pertama ‹ label ›, baris kedua Hari ini dan pilihan tampilan. Layar lebih
  // lebar: satu baris ‹ › Hari ini label, pilihan tampilan di kanan (diatur dengan order;
  // urutan Tab tetap ‹ › Hari ini, tampilan).
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3 md:flex md:gap-2">
      <ShiftButton
        direction={-1}
        label={`${unit} sebelumnya`}
        onShift={onShift}
        className="md:order-1"
      />
      <h2
        id={titleId}
        aria-live="polite"
        className="min-w-0 truncate text-center font-site-display text-lg font-bold tracking-tight text-site-ink md:order-4 md:pl-1 md:text-left md:text-xl"
      >
        <span className="max-md:sr-only">{periodLabel(view, anchor)}</span>
        <span aria-hidden="true" className="md:hidden">
          {periodLabel(view, anchor, true)}
        </span>
      </h2>
      <ShiftButton
        direction={1}
        label={`${unit} berikutnya`}
        onShift={onShift}
        className="md:order-2"
      />
      <div className="col-span-3 flex items-center justify-between gap-2 md:contents">
        <button
          type="button"
          onClick={onToday}
          disabled={showsToday}
          className="inline-flex h-9 flex-none items-center rounded-full border border-site-rule px-3.5 text-sm font-semibold text-site-ink transition-colors outline-none hover:border-site-ink focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50 disabled:hover:border-site-rule md:order-3"
        >
          Hari ini
        </button>
        <div
          role="group"
          aria-label="Tampilan"
          className="inline-flex flex-none rounded-full bg-site-ink/[0.06] p-1 md:order-5 md:ml-auto"
        >
          {VIEWS.map((option) => {
            const active = option.value === view
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onView(option.value)}
                className={cn(
                  'h-9 items-center rounded-full px-4 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring',
                  option.value === 'pekan' ? 'hidden md:inline-flex' : 'inline-flex',
                  active ? 'bg-site-ink text-site-canvas' : 'text-site-ink/80 hover:bg-site-ink/10',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ShiftButton({
  direction,
  label,
  onShift,
  className,
}: {
  direction: 1 | -1
  label: string
  onShift: (direction: 1 | -1) => void
  className?: string
}) {
  const Icon = direction === 1 ? ChevronRight : ChevronLeft
  return (
    <button
      type="button"
      onClick={() => onShift(direction)}
      aria-label={label}
      title={label}
      className={cn(
        'grid size-11 flex-none place-items-center rounded-full text-site-ink transition-colors outline-none hover:bg-site-ink/10 focus-visible:ring-3 focus-visible:ring-ring md:size-9',
        className,
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  )
}
