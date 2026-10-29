import { useId, type ReactNode } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import {
  WORSHIP_CATEGORIES,
  WORSHIP_CATEGORY_LABELS,
  type RayonListItem,
  type WorshipCategory,
} from '@shared/types'
import { KIND_DOT } from '@/components/portal/schedule/kinds'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { CalendarState } from '@/lib/schedule-calendar'
import { cn } from '@/lib/utils'

// Saringan kalender Jadwal Ibadah: jenis ibadah (pilih banyak, dengan jumlah di periode),
// rayon (pilih satu; ibadah seluruh jemaat tetap tampil, keputusan J3), chip saringan aktif,
// dan lembar "Saring" untuk layar di bawah 1280 px (sisi kiri baru muncul dari 1280 px agar
// tujuh kolom tampilan Pekan tetap lega di 1024 px).

type Change = (changes: Partial<CalendarState>) => void

const option =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2.5 text-sm transition-colors hover:bg-site-ink/[0.06] has-focus-visible:ring-3 has-focus-visible:ring-ring has-disabled:cursor-default'
const legend = 'mb-1 px-2.5 font-site-display text-sm font-bold text-site-ink'

export function KindFilter({
  kinds,
  counts,
  onChange,
}: {
  kinds: WorshipCategory[]
  counts: Record<WorshipCategory, number>
  onChange: Change
}) {
  const all = kinds.length === 0
  function toggle(kind: WorshipCategory) {
    const current = all ? WORSHIP_CATEGORIES : kinds
    onChange({
      kinds: current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind],
    })
  }
  return (
    <fieldset className="grid gap-0.5">
      <legend className={legend}>Jenis ibadah</legend>
      {WORSHIP_CATEGORIES.map((kind) => {
        const checked = all || kinds.includes(kind)
        // Paling sedikit satu jenis tetap tercentang.
        const last = checked && kinds.length === 1
        return (
          <label
            key={kind}
            className={option}
            title={last ? 'Paling sedikit satu jenis' : undefined}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={last}
              onChange={() => toggle(kind)}
              className="size-4 flex-none accent-site-ink"
            />
            <span
              aria-hidden="true"
              className={cn('h-4 w-1 flex-none rounded-full', KIND_DOT[kind])}
            />
            <span className="min-w-0 flex-1 font-medium text-site-ink">
              {WORSHIP_CATEGORY_LABELS[kind]}
            </span>
            <span className="text-(length:--site-text-xs) text-site-muted tabular-nums">
              {counts[kind]}
              <span className="sr-only"> ibadah</span>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}

export function RayonFilter({
  rayonId,
  rayons,
  counts,
  onChange,
}: {
  rayonId: number | null
  rayons: RayonListItem[]
  counts: Map<number, number>
  onChange: Change
}) {
  const name = useId()
  return (
    <fieldset className="grid gap-0.5">
      <legend className={legend}>Rayon</legend>
      <p className="mb-1 px-2.5 text-(length:--site-text-xs) text-site-muted">
        Ibadah seluruh jemaat tetap tampil.
      </p>
      <label className={option}>
        <input
          type="radio"
          name={name}
          checked={rayonId === null}
          onChange={() => onChange({ rayonId: null })}
          className="size-4 flex-none accent-site-ink"
        />
        <span className="flex-1 font-medium text-site-ink">Semua rayon</span>
      </label>
      {rayons.map((rayon) => (
        <label key={rayon.id} className={option}>
          <input
            type="radio"
            name={name}
            checked={rayonId === rayon.id}
            onChange={() => onChange({ rayonId: rayon.id })}
            className="size-4 flex-none accent-site-ink"
          />
          <span className="min-w-0 flex-1 font-medium text-site-ink">{rayon.name}</span>
          <span className="text-(length:--site-text-xs) text-site-muted tabular-nums">
            {counts.get(rayon.id) ?? 0}
            <span className="sr-only"> ibadah rayon</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}

// Chip saringan yang sedang aktif. Satu chip per kelompok, dan melepasnya selalu
// memperluas hasil: chip jenis mengembalikan semua jenis, chip rayon semua rayon. Jenis
// disebut yang tampil bila paling banyak dua, selain itu yang disembunyikan.
export function ActiveFilters({
  state,
  rayons,
  onChange,
  className,
}: {
  state: CalendarState
  rayons: RayonListItem[]
  onChange: Change
  className?: string
}) {
  const chips: { key: string; label: string; remove: Partial<CalendarState> }[] = []
  if (state.kinds.length > 0) {
    const names = (kinds: readonly WorshipCategory[]) =>
      kinds.map((kind) => WORSHIP_CATEGORY_LABELS[kind]).join(' & ')
    chips.push({
      key: 'jenis',
      label:
        state.kinds.length <= 2
          ? names(state.kinds)
          : `Tanpa ${names(WORSHIP_CATEGORIES.filter((kind) => !state.kinds.includes(kind)))}`,
      remove: { kinds: [] },
    })
  }
  const rayon = rayons.find((item) => item.id === state.rayonId)
  if (state.rayonId !== null) {
    chips.push({
      key: 'rayon',
      label: `Rayon ${rayon?.name ?? state.rayonId}`,
      remove: { rayonId: null },
    })
  }
  if (chips.length === 0) return null
  return (
    <div role="group" aria-label="Saringan aktif" className={cn('flex flex-wrap gap-2', className)}>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onChange(chip.remove)}
          aria-label={`Lepas saringan ${chip.label}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-site-ink/[0.06] pr-2.5 pl-3.5 text-sm font-medium text-site-ink transition-colors outline-none hover:bg-site-ink/10 focus-visible:ring-3 focus-visible:ring-ring"
        >
          {chip.label}
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ))}
      {chips.length > 1 && <ClearFilters onChange={onChange} className="h-9" />}
    </div>
  )
}

export function ClearFilters({ onChange, className }: { onChange: Change; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange({ kinds: [], rayonId: null })}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 text-sm font-semibold text-site-ink underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring',
        className,
      )}
    >
      Hapus saringan
    </button>
  )
}

// Lembar saringan untuk ponsel dan tablet: kalender mini dan saringan yang sama dengan sisi
// kiri desktop, lalu tombol yang menutup lembar sambil menyebut hasilnya.
export function FilterSheet({
  active,
  resultLabel,
  children,
}: {
  active: number
  resultLabel: string
  children: ReactNode
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex h-11 flex-none items-center gap-2 rounded-full border border-site-rule bg-site-canvas px-4 text-sm font-semibold text-site-ink transition-colors outline-none hover:border-site-ink focus-visible:ring-3 focus-visible:ring-ring"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Saring
          {active > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-site-ink text-(length:--site-text-xs) font-bold text-site-canvas">
              {active}
              <span className="sr-only"> saringan aktif</span>
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        data-lenis-prevent
        className="max-h-[calc(88svh/var(--site-zoom,1))] gap-0 overflow-y-auto overscroll-contain rounded-t-3xl border-0 bg-site-canvas p-0 font-site-body text-site-ink glass:glass-bar"
      >
        <div className="px-5 pt-5 pb-3">
          <SheetTitle className="font-site-display text-lg font-bold text-site-ink">
            Saring jadwal
          </SheetTitle>
          <SheetDescription className="text-sm text-site-muted">
            Pilih tanggal, jenis ibadah, dan rayon.
          </SheetDescription>
        </div>
        <div className="grid gap-6 px-3 pb-4">{children}</div>
        <div className="sticky bottom-0 bg-inherit px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] glass:backdrop-blur-xl">
          <SheetClose asChild>
            <button
              type="button"
              className="h-12 w-full rounded-full bg-site-ink text-[15px] font-semibold text-site-canvas transition-opacity outline-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring"
            >
              {resultLabel}
            </button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}
