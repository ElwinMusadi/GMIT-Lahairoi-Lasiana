import { useState } from 'react'
import type { ApiList, ApiPage, PublicWorshipItem, RayonListItem } from '@shared/types'
import { HeroPanel } from '@/components/portal/kage/hero-panel'
import { SearchField } from '@/components/portal/kage/list-controls'
import { PillButton } from '@/components/portal/kage/pill'
import { ScheduleBoard } from '@/components/portal/kage/schedule-board'
import { LoadError } from '@/components/portal/kage/site-section'
import { TwoToneHeading } from '@/components/portal/kage/two-tone-heading'
import { MiniMonth } from '@/components/portal/schedule/mini-month'
import {
  ActiveFilters,
  ClearFilters,
  FilterSheet,
  KindFilter,
  RayonFilter,
} from '@/components/portal/schedule/schedule-filters'
import { ScheduleToolbar } from '@/components/portal/schedule/schedule-toolbar'
import { worshipWhen } from '@/lib/portal'
import {
  activeFilterCount,
  addMonths,
  nextWorship,
  shiftAnchor,
  witaTime,
} from '@/lib/schedule-calendar'
import { useApiQuery } from '@/lib/use-api-query'
import { useScheduleCalendar } from '@/lib/use-schedule-calendar'
import { cn } from '@/lib/utils'

const PERIOD_TITLE = 'judul-periode'

// Kalender Jadwal Ibadah (docs/rencana-redesign-jadwal-ibadah.md): hero ringkas dengan ibadah
// berikutnya, lalu panel kalender berisi kalender mini dan saringan (sisi kiri, atau lembar
// "Saring" di bawah 1024 px) serta bilah alat. Keadaan halaman tersimpan di URL.
// Tahap 3: tampilan Pekan, Agenda, dan Bulan masih memakai papan daftar sementara.
export default function SchedulePage() {
  const calendar = useScheduleCalendar()
  const { state, update, today } = calendar
  const rayons = useApiQuery<ApiList<RayonListItem>>('/rayons')
  const rayonList = rayons.data?.data ?? []
  const upcoming = useApiQuery<ApiPage<PublicWorshipItem>>('/public/worships', { per_page: 6 })
  const [now] = useState(witaTime)
  const next = nextWorship(upcoming.data?.data ?? [], today, now)

  const filtering = activeFilterCount(state) > 0
  const shown = calendar.visible.length
  const summary = calendar.searching
    ? calendar.search.data
      ? `${calendar.search.data.meta.total} jadwal mendatang untuk “${state.query}”`
      : `Mencari “${state.query}”…`
    : !calendar.period.data
      ? 'Memuat jadwal…'
      : filtering
        ? `${shown} dari ${calendar.periodTotal} ibadah`
        : `${shown} ibadah`

  const filters = (
    <>
      <KindFilter kinds={state.kinds} counts={calendar.counts.kinds} onChange={update} />
      <RayonFilter
        rayonId={state.rayonId}
        rayons={rayonList}
        counts={calendar.counts.rayons}
        onChange={update}
      />
    </>
  )
  const miniMonth = (
    <MiniMonth
      anchor={state.anchor}
      today={today}
      view={state.view}
      days={calendar.days}
      onSelect={(date) => update({ anchor: date })}
      onMonth={(direction) => update({ anchor: addMonths(state.anchor, direction) })}
    />
  )
  const search = (className?: string) => (
    <SearchField
      value={state.query}
      onSearch={(query) => update({ query })}
      label="Cari jadwal menurut nama pelayan, judul, tema, atau tempat"
      placeholder="Cari pelayan, tempat…"
      className={className}
    />
  )

  const board = calendar.searching ? calendar.search : calendar.period
  const worships = calendar.searching ? (calendar.search.data?.data ?? []) : calendar.visible
  const status =
    board.error && !board.data ? (
      <LoadError message="Jadwal tidak dapat dimuat." onRetry={board.reload} onDark />
    ) : !board.data ? (
      <div aria-hidden="true" className="grid gap-6">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-xl bg-white/[0.06]" />
        ))}
      </div>
    ) : worships.length === 0 ? (
      <p className="text-base text-white/80">
        {calendar.searching
          ? 'Tidak ada jadwal mendatang yang cocok.'
          : filtering
            ? 'Tidak ada ibadah yang cocok dengan saringan di periode ini.'
            : 'Belum ada ibadah di periode ini.'}
      </p>
    ) : undefined

  return (
    <>
      <HeroPanel
        size="compact"
        labelledBy="judul-jadwal"
        display={
          <TwoToneHeading
            as="h1"
            id="judul-jadwal"
            size="page"
            onDark
            inline
            lead="Jadwal Ibadah"
            accent="jemaat."
          />
        }
      >
        <div className="mt-5 grid gap-4 md:flex md:flex-wrap md:items-center md:justify-between">
          <p className="max-w-[58ch] text-base leading-relaxed text-white/85">
            <span className="max-sm:hidden">
              Kebaktian Minggu, ibadah rayon, ibadah kategorial, dan ibadah khusus.{' '}
            </span>
            Semua waktu dalam WITA.
          </p>
          {next && (
            <PillButton
              tone="glass"
              size="sm"
              onClick={() => update({ anchor: next.worship_date, openId: next.id }, { push: true })}
              className="h-auto min-h-11 justify-start py-2 text-left text-sm whitespace-normal"
            >
              <span className="min-w-0">
                <span className="font-semibold text-site-accent">Berikutnya:</span>{' '}
                <span className="font-medium">
                  {next.title}
                  {next.category === 'RAYON' && next.rayon_name && ` · Rayon ${next.rayon_name}`}
                  {' · '}
                  {worshipWhen(next.worship_date, next.worship_time, today)}
                </span>
              </span>
            </PillButton>
          )}
        </div>
      </HeroPanel>

      <section
        id="kalender"
        aria-labelledby={PERIOD_TITLE}
        className="mx-(--site-hero-gap) scroll-mt-24 rounded-[28px] bg-site-paper p-2 sm:p-3 glass:glass-slab"
      >
        <div className="grid gap-2 sm:gap-3 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside
            aria-label="Kalender dan saringan"
            className="hidden content-start gap-6 rounded-[22px] bg-site-canvas p-4 lg:grid glass:glass-card"
          >
            {miniMonth}
            {search('sm:w-full')}
            {filters}
            {filtering && <ClearFilters onChange={update} className="h-11 justify-self-start" />}
          </aside>

          <div className="min-w-0 rounded-[22px] bg-site-canvas p-3 sm:p-5 md:p-6 glass:glass-card">
            <ScheduleToolbar
              view={state.view}
              anchor={state.anchor}
              today={today}
              titleId={PERIOD_TITLE}
              onShift={(direction) =>
                update({ anchor: shiftAnchor(state.view, state.anchor, direction) })
              }
              onToday={() => update({ anchor: today })}
              onView={(view) => update({ view })}
            />
            <div className="mt-4 flex items-center gap-2 lg:hidden">
              {search('min-w-0 flex-1 sm:w-auto')}
              <FilterSheet
                active={activeFilterCount(state)}
                resultLabel={calendar.period.data ? `Tampilkan ${shown} ibadah` : 'Tutup'}
              >
                {miniMonth}
                {filters}
              </FilterSheet>
            </div>
            <ActiveFilters
              state={state}
              rayons={rayonList}
              onChange={update}
              className="mt-3 lg:hidden"
            />
            <p aria-live="polite" className="mt-4 text-sm text-site-muted">
              {summary}
            </p>

            {/* Tahap 3: papan daftar sementara sampai tampilan Pekan/Agenda/Bulan dibangun. */}
            <div
              aria-busy={board.loading}
              className={cn('mt-4 transition-opacity', board.loading && board.data && 'opacity-60')}
            >
              <ScheduleBoard
                worships={worships}
                today={today}
                status={status}
                className="shadow-none"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
