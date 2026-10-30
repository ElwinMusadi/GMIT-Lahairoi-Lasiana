import { useCallback, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import type { ApiList, ApiPage, PublicWorshipItem, RayonListItem } from '@shared/types'
import { HeroPanel } from '@/components/portal/kage/hero-panel'
import { SearchField } from '@/components/portal/kage/list-controls'
import { PillButton } from '@/components/portal/kage/pill'
import { LoadError } from '@/components/portal/kage/site-section'
import { TwoToneHeading } from '@/components/portal/kage/two-tone-heading'
import { AgendaList, WeekStrip } from '@/components/portal/schedule/agenda-list'
import { MiniMonth } from '@/components/portal/schedule/mini-month'
import { MonthDots, MonthGrid } from '@/components/portal/schedule/month-grid'
import {
  ActiveFilters,
  ClearFilters,
  FilterSheet,
  KindFilter,
  RayonFilter,
} from '@/components/portal/schedule/schedule-filters'
import { ScheduleToolbar } from '@/components/portal/schedule/schedule-toolbar'
import { SearchResults } from '@/components/portal/schedule/search-results'
import { WeekTable } from '@/components/portal/schedule/week-table'
import { dayLabel, worshipWhen } from '@/lib/portal'
import { scrollToElement } from '@/lib/portal-motion'
import {
  activeFilterCount,
  addMonths,
  nextWorship,
  periodLabel,
  shiftAnchor,
  witaTime,
  type CalendarView,
} from '@/lib/schedule-calendar'
import { useApiQuery } from '@/lib/use-api-query'
import { useScheduleCalendar } from '@/lib/use-schedule-calendar'
import { cn } from '@/lib/utils'

const PERIOD_TITLE = 'judul-periode'

// Kalender Jadwal Ibadah (docs/rencana-redesign-jadwal-ibadah.md): hero ringkas dengan ibadah
// berikutnya, lalu panel kalender berisi kalender mini dan saringan (sisi kiri, atau lembar
// "Saring" di bawah 1280 px), bilah alat, dan tampilan Pekan, Agenda, atau Bulan. Selama kata
// cari terisi, kalender diganti hasil pencarian jadwal mendatang. Keadaan halaman tersimpan di
// URL.
export default function SchedulePage() {
  const calendar = useScheduleCalendar()
  const { state, update, today } = calendar
  // Di bawah 768 px Pekan diganti Agenda (tujuh kolom terlalu sempit), juga untuk tautan
  // ?tampilan=pekan yang dibuka di ponsel.
  const view: CalendarView = calendar.narrow && state.view === 'pekan' ? 'agenda' : state.view
  // Hari yang dituju Agenda (pita pekan, "+N lainnya" di Pekan); dikosongkan setelah digulir.
  const [jumpTo, setJumpTo] = useState<string | null>(null)
  const clearJump = useCallback(() => setJumpTo(null), [])
  const openWorship = (worship: PublicWorshipItem) => update({ openId: worship.id }, { push: true })
  const nextAnchor = shiftAnchor(view, state.anchor, 1)
  function goNext() {
    update({ anchor: nextAnchor })
    const panel = document.getElementById('kalender')
    if (panel) scrollToElement(panel)
  }
  // Dari Pekan atau Bulan: buka Agenda pekan itu dan gulir ke harinya.
  function openDay(date: string) {
    update({ view: 'agenda', anchor: date })
    setJumpTo(date)
  }
  const rayons = useApiQuery<ApiList<RayonListItem>>('/rayons')
  const rayonList = rayons.data?.data ?? []
  const upcoming = useApiQuery<ApiPage<PublicWorshipItem>>('/public/worships', { per_page: 6 })
  const [now] = useState(witaTime)
  const next = nextWorship(upcoming.data?.data ?? [], today, now)

  const filtering = activeFilterCount(state) > 0
  const shown = calendar.periodShown
  const summary = calendar.searching
    ? calendar.search.data
      ? `${calendar.search.data.meta.total - calendar.searchHidden} jadwal mendatang untuk “${state.query}”`
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
      view={view}
      days={calendar.days}
      // Memilih tanggal juga keluar dari hasil pencarian.
      onSelect={(date) => update({ anchor: date, query: '' })}
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

  const period = calendar.period
  const unit = view === 'bulan' ? 'bulan' : 'pekan'
  const nextButton = (className?: string) => (
    <NextPeriodButton
      label={`${view === 'bulan' ? 'Bulan' : 'Pekan'} berikutnya: ${periodLabel(view, nextAnchor)}`}
      onClick={goNext}
      className={className}
    />
  )
  // Ponsel, tampilan Bulan: ibadah tanggal yang dipilih di kisi bertitik.
  const dayList = calendar.visible.filter((worship) => worship.worship_date === state.anchor)
  const periodContent =
    period.error && !period.data ? (
      <LoadError message="Jadwal tidak dapat dimuat." onRetry={period.reload} />
    ) : !period.data ? (
      <PeriodSkeleton view={view} />
    ) : shown === 0 ? (
      <div className="grid justify-items-start gap-2 rounded-2xl border border-dashed border-site-rule p-5 md:p-6">
        <p className="text-base text-site-ink">
          {filtering
            ? `Tidak ada ibadah yang cocok dengan saringan di ${unit} ini.`
            : `Belum ada ibadah yang diumumkan untuk ${unit} ini.`}
        </p>
        {filtering ? <ClearFilters onChange={update} className="h-11 px-0" /> : nextButton()}
      </div>
    ) : view === 'pekan' ? (
      <WeekTable
        dates={calendar.dates}
        worships={calendar.visible}
        today={today}
        onOpen={openWorship}
        onDay={openDay}
      />
    ) : view === 'bulan' ? (
      <>
        <div className="max-md:hidden">
          <MonthGrid
            anchor={state.anchor}
            dates={calendar.dates}
            worships={calendar.visible}
            today={today}
            onOpen={openWorship}
            onDay={openDay}
          />
        </div>
        <div className="grid gap-4 md:hidden">
          <MonthDots
            anchor={state.anchor}
            dates={calendar.dates}
            today={today}
            days={calendar.days}
            onSelect={(date) => update({ anchor: date })}
          />
          {dayList.length > 0 ? (
            <AgendaList worships={dayList} today={today} onOpen={openWorship} />
          ) : (
            <p className="border-t border-site-rule px-2 pt-3 text-sm text-site-muted">
              {dayLabel(state.anchor, today)}: tidak ada ibadah.
            </p>
          )}
        </div>
      </>
    ) : (
      <>
        <AgendaList
          worships={calendar.visible}
          today={today}
          onOpen={openWorship}
          jumpTo={jumpTo}
          onJumped={clearJump}
        />
        {nextButton('mt-6')}
      </>
    )

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
        <div className="grid gap-2 sm:gap-3 xl:grid-cols-[19rem_minmax(0,1fr)]">
          <aside
            aria-label="Kalender dan saringan"
            className="hidden content-start gap-6 rounded-[22px] bg-site-canvas p-4 xl:grid glass:glass-card"
          >
            {miniMonth}
            {search('sm:w-full')}
            {filters}
            {filtering && <ClearFilters onChange={update} className="h-11 justify-self-start" />}
          </aside>

          <div className="min-w-0 rounded-[22px] bg-site-canvas p-3 sm:p-5 md:p-6 glass:glass-card">
            {calendar.searching ? (
              // Selama mencari, navigasi periode tidak berlaku.
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                  id={PERIOD_TITLE}
                  className="font-site-display text-lg font-bold tracking-tight text-site-ink md:text-xl"
                >
                  Hasil pencarian
                </h2>
                <button
                  type="button"
                  onClick={() => update({ query: '' })}
                  className="inline-flex min-h-11 items-center rounded-full border border-site-rule px-4 text-sm font-semibold text-site-ink transition-colors outline-none hover:border-site-ink focus-visible:ring-3 focus-visible:ring-ring md:min-h-9"
                >
                  Kembali ke kalender
                </button>
              </div>
            ) : (
              <ScheduleToolbar
                view={view}
                anchor={state.anchor}
                today={today}
                titleId={PERIOD_TITLE}
                onShift={(direction) =>
                  update({ anchor: shiftAnchor(view, state.anchor, direction) })
                }
                onToday={() => update({ anchor: today })}
                onView={(view) => update({ view })}
              />
            )}
            <div className="mt-4 flex items-center gap-2 xl:hidden">
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
              className="mt-3 xl:hidden"
            />
            <p aria-live="polite" className="mt-4 text-sm text-site-muted">
              {summary}
            </p>

            {!calendar.searching && view === 'agenda' && period.data && (
              <WeekStrip
                dates={calendar.dates}
                today={today}
                days={calendar.days}
                onDay={setJumpTo}
                className="mt-3 md:hidden"
              />
            )}

            {calendar.searching ? (
              <div aria-busy={calendar.search.loading} className="mt-4">
                <SearchResults
                  query={state.query}
                  results={calendar.search}
                  worships={calendar.searchResults}
                  hidden={calendar.searchHidden}
                  limit={calendar.searchLimit}
                  today={today}
                  onOpen={openWorship}
                  onMore={calendar.loadMoreResults}
                  onClear={() => update({ query: '' })}
                  onClearFilters={() => update({ kinds: [], rayonId: null })}
                />
              </div>
            ) : (
              <div
                aria-busy={period.loading}
                className={cn(
                  'mt-4 transition-opacity',
                  period.loading && period.data && 'opacity-60',
                )}
              >
                {periodContent}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

function NextPeriodButton({
  label,
  onClick,
  className,
}: {
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-full border border-site-rule px-4 text-sm font-semibold text-site-ink transition-colors outline-none hover:border-site-ink focus-visible:ring-3 focus-visible:ring-ring',
        className,
      )}
    >
      {label}
      <ArrowRight className="size-4" aria-hidden="true" />
    </button>
  )
}

// Kerangka memuat seukuran tampilannya: kisi tujuh kolom untuk Pekan dan Bulan, baris untuk
// Agenda.
function PeriodSkeleton({ view }: { view: CalendarView }) {
  const count = view === 'pekan' ? 24 : view === 'bulan' ? 42 : 5
  return (
    <div
      aria-hidden="true"
      className={cn(
        'grid gap-2',
        view === 'pekan' && 'grid-cols-[3rem_repeat(7,1fr)]',
        view === 'bulan' && 'grid-cols-7',
      )}
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={cn(
            'animate-pulse rounded-lg bg-site-ink/[0.06]',
            view === 'pekan'
              ? index % 8 === 0
                ? 'h-6'
                : 'h-20'
              : view === 'bulan'
                ? 'h-12 md:h-24'
                : 'h-16',
          )}
        />
      ))}
    </div>
  )
}
