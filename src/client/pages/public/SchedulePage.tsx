import { useState } from 'react'
import { witaToday } from '@shared/dates'
import {
  WORSHIP_CATEGORIES,
  WORSHIP_CATEGORY_LABELS,
  type ApiList,
  type ApiPage,
  type PublicWorshipItem,
  type RayonListItem,
  type WorshipCategory,
} from '@shared/types'
import { HeroPanel } from '@/components/portal/kage/hero-panel'
import { PhotoFilterPill, SitePager } from '@/components/portal/kage/list-controls'
import { PillButton } from '@/components/portal/kage/pill'
import { Reveal } from '@/components/portal/kage/reveal'
import { ScheduleBoard } from '@/components/portal/kage/schedule-board'
import { LoadError, SiteSection } from '@/components/portal/kage/site-section'
import { TwoToneHeading } from '@/components/portal/kage/two-tone-heading'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'
import { cn } from '@/lib/utils'

const PER_PAGE = 30
// Saringan diganti di tempat; halaman tidak meloncat ke atas.
const KEEP = { keepScroll: true }

// Papan Jadwal Ibadah (PRD: kebaktian Minggu, ibadah rumah tangga per rayon, ibadah
// kategorial, dan acara gerejawi mendatang). Saringan jenis ibadah (?jenis=) dan rayon
// (?rayon=) tersimpan di URL agar tautannya bisa dibagikan di grup rayon.
export default function SchedulePage() {
  const { params, update } = useUrlFilters()
  const [today] = useState(witaToday)
  const jenisParam = (params.get('jenis') ?? '').toUpperCase()
  const category = (WORSHIP_CATEGORIES as string[]).includes(jenisParam)
    ? (jenisParam as WorshipCategory)
    : null
  const rayonId = params.get('rayon') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)

  const rayons = useApiQuery<ApiList<RayonListItem>>('/rayons')
  const schedule = useApiQuery<ApiPage<PublicWorshipItem>>('/public/worships', {
    category: category ?? '',
    rayon_id: rayonId,
    page,
    per_page: PER_PAGE,
  })
  const rayonList = rayons.data?.data ?? []
  const rayon = rayonList.find((item) => String(item.id) === rayonId)
  const items = schedule.data?.data ?? []
  const total = schedule.data?.meta.total ?? 0

  // "8 jadwal ibadah mendatang", "1 Ibadah Rayon mendatang di Rayon Golgota".
  const kindLabel = category ? WORSHIP_CATEGORY_LABELS[category] : 'jadwal ibadah'
  const place = rayon ? ` di Rayon ${rayon.name}` : ''

  const status =
    schedule.error && !schedule.data ? (
      <LoadError message="Jadwal tidak dapat dimuat." onRetry={schedule.reload} onDark />
    ) : !schedule.data ? (
      <div aria-hidden="true" className="grid gap-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-xl bg-white/[0.06]" />
        ))}
      </div>
    ) : items.length === 0 ? (
      <p className="text-base text-white/80">
        Belum ada {kindLabel}
        {place} yang diumumkan.
        {rayon && category !== 'RAYON' && category !== null
          ? ' Coba pilih jenis “Ibadah Rayon”.'
          : ''}
      </p>
    ) : undefined

  return (
    <>
      <HeroPanel
        labelledBy="judul-jadwal"
        display={
          <div className="grid max-w-[760px] gap-5">
            <TwoToneHeading
              as="h1"
              id="judul-jadwal"
              size="page"
              onDark
              lead="Jadwal Ibadah"
              accent="mendatang."
            />
            <p className="max-w-[60ch] text-base leading-relaxed text-white/85 md:text-lg">
              Kebaktian Minggu, ibadah rumah tangga di lima rayon, ibadah kategorial, dan acara
              gerejawi mendatang. Semua waktu dalam WITA.
            </p>
          </div>
        }
      >
        <div className="mt-auto grid gap-4 pt-10">
          <div role="group" aria-label="Jenis ibadah" className="flex flex-wrap gap-2">
            <PhotoFilterPill active={!category} onClick={() => update({ jenis: '' }, KEEP)}>
              Semua jenis
            </PhotoFilterPill>
            {WORSHIP_CATEGORIES.map((value) => (
              <PhotoFilterPill
                key={value}
                active={category === value}
                onClick={() => update({ jenis: value.toLowerCase() }, KEEP)}
              >
                {WORSHIP_CATEGORY_LABELS[value]}
              </PhotoFilterPill>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span id="label-rayon" className="mr-1 text-sm font-semibold text-white/85">
              Rayon
            </span>
            {/* Di ponsel lima rayon menjadi satu pilihan. */}
            <select
              aria-labelledby="label-rayon"
              value={rayonId}
              onChange={(event) => update({ rayon: event.target.value }, KEEP)}
              className="h-11 min-w-0 flex-1 rounded-full bg-white/[0.12] px-4 text-base font-semibold text-white [color-scheme:dark] outline-none focus-visible:ring-3 focus-visible:ring-site-accent sm:hidden"
            >
              <option value="">Semua rayon</option>
              {rayonList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <div
              role="group"
              aria-labelledby="label-rayon"
              className="hidden flex-wrap gap-2 sm:flex"
            >
              <PhotoFilterPill active={!rayonId} onClick={() => update({ rayon: '' }, KEEP)}>
                Semua rayon
              </PhotoFilterPill>
              {rayonList.map((item) => (
                <PhotoFilterPill
                  key={item.id}
                  active={String(item.id) === rayonId}
                  onClick={() => update({ rayon: String(item.id) }, KEEP)}
                >
                  {item.name}
                </PhotoFilterPill>
              ))}
            </div>
          </div>
        </div>
      </HeroPanel>

      <SiteSection labelledBy="judul-daftar-jadwal" className="pt-12 lg:pt-16">
        <Reveal className="flex flex-wrap items-center justify-between gap-4">
          <h2
            id="judul-daftar-jadwal"
            className="font-site-display text-2xl font-bold tracking-tight md:text-[28px]"
          >
            {schedule.data
              ? `${total.toLocaleString('id-ID')} ${kindLabel} mendatang${place}`
              : 'Memuat jadwal…'}
          </h2>
          {(category || rayonId) && (
            <PillButton
              tone="outline"
              size="sm"
              onClick={() => update({ jenis: '', rayon: '' }, KEEP)}
            >
              Tampilkan semua jadwal
            </PillButton>
          )}
        </Reveal>
        <Reveal className="mt-8">
          <div
            aria-busy={schedule.loading}
            className={cn('transition-opacity', schedule.loading && schedule.data && 'opacity-60')}
          >
            <ScheduleBoard
              worships={items}
              today={today}
              status={status}
              footer={
                schedule.data && total > PER_PAGE ? (
                  <SitePager
                    page={page}
                    perPage={PER_PAGE}
                    total={total}
                    noun="jadwal"
                    onPage={(next) => update({ page: String(next) })}
                    onDark
                  />
                ) : undefined
              }
            />
          </div>
        </Reveal>
      </SiteSection>
    </>
  )
}
