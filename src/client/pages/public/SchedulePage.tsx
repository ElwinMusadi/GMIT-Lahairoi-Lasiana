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
import { EmptyNote, FilterPill, PageIntro, Pager, PortalSection } from '@/components/portal/parts'
import { WorshipCard } from '@/components/portal/worship-card'
import { Skeleton } from '@/components/ui/skeleton'
import { dayLabel } from '@/lib/portal'
import { useApiQuery } from '@/lib/use-api-query'
import { useUrlFilters } from '@/lib/use-url-filters'

const PER_PAGE = 30

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

  // Kelompok per tanggal, berurutan seperti dari API.
  const days: { date: string; items: PublicWorshipItem[] }[] = []
  for (const item of items) {
    const last = days.at(-1)
    if (last?.date === item.worship_date) last.items.push(item)
    else days.push({ date: item.worship_date, items: [item] })
  }

  // "8 jadwal ibadah mendatang", "1 Ibadah Rayon mendatang di Rayon Golgota".
  const kindLabel = category ? WORSHIP_CATEGORY_LABELS[category] : 'jadwal ibadah'
  const place = rayon ? ` di Rayon ${rayon.name}` : ''

  return (
    <>
      <PageIntro
        id="judul-jadwal"
        eyebrow="Papan jadwal ibadah"
        title="Jadwal Ibadah"
        lead="Kebaktian Minggu, ibadah rumah tangga di lima rayon, ibadah kategorial, dan acara gerejawi mendatang. Semua waktu dalam WITA."
      >
        <div className="grid gap-3">
          <div role="group" aria-label="Jenis ibadah" className="flex gap-2 overflow-x-auto pb-1">
            <FilterPill active={!category} onClick={() => update({ jenis: '' })}>
              Semua jenis
            </FilterPill>
            {WORSHIP_CATEGORIES.map((value) => (
              <FilterPill
                key={value}
                active={category === value}
                onClick={() => update({ jenis: value.toLowerCase() })}
              >
                {WORSHIP_CATEGORY_LABELS[value]}
              </FilterPill>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-portal-ink" id="label-rayon">
              Rayon
            </span>
            {/* Di ponsel lima rayon menjadi satu pilihan. */}
            <select
              aria-labelledby="label-rayon"
              value={rayonId}
              onChange={(event) => update({ rayon: event.target.value })}
              className="h-10 min-w-0 flex-1 rounded-lg border-0 bg-white px-3 text-sm font-semibold text-portal-navy shadow-sm sm:hidden"
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
              <FilterPill active={!rayonId} onClick={() => update({ rayon: '' })}>
                Semua rayon
              </FilterPill>
              {rayonList.map((item) => (
                <FilterPill
                  key={item.id}
                  active={String(item.id) === rayonId}
                  onClick={() => update({ rayon: String(item.id) })}
                >
                  {item.name}
                </FilterPill>
              ))}
            </div>
          </div>
        </div>
      </PageIntro>

      <PortalSection labelledBy="judul-daftar-jadwal">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="judul-daftar-jadwal"
            className="font-portal-heading text-xl font-semibold text-portal-navy"
          >
            {schedule.data
              ? `${total.toLocaleString('id-ID')} ${kindLabel} mendatang${place}`
              : 'Memuat jadwal…'}
          </h2>
          {(category || rayonId) && (
            <button
              type="button"
              onClick={() => update({ jenis: '', rayon: '' })}
              className="text-sm font-semibold text-portal-navy underline underline-offset-4"
            >
              Tampilkan semua jadwal
            </button>
          )}
        </div>

        {schedule.error && !schedule.data ? (
          <EmptyNote>
            Jadwal tidak dapat dimuat.{' '}
            <button
              type="button"
              onClick={schedule.reload}
              className="font-semibold text-portal-navy underline"
            >
              Coba lagi
            </button>
          </EmptyNote>
        ) : !schedule.data ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyNote>
            Belum ada {kindLabel}
            {place} yang diumumkan.
            {rayon && category !== 'RAYON' && category !== null
              ? ' Coba pilih jenis “Ibadah Rayon”.'
              : ''}
          </EmptyNote>
        ) : (
          <div
            className={schedule.loading ? 'grid gap-8 opacity-60 transition-opacity' : 'grid gap-8'}
          >
            {days.map((day) => (
              <section key={day.date} aria-label={dayLabel(day.date, today)} className="grid gap-3">
                <h3 className="flex items-center gap-3 text-sm font-bold tracking-wide text-portal-amber uppercase">
                  {dayLabel(day.date, today)}
                  <span className="h-px flex-1 bg-portal-high" aria-hidden="true" />
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {day.items.map((item) => (
                    <WorshipCard key={item.id} worship={item} today={today} showDay={false} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        {schedule.data && (
          <Pager
            page={page}
            perPage={PER_PAGE}
            total={total}
            noun="jadwal"
            onPage={(next) => update({ page: String(next) })}
          />
        )}
      </PortalSection>
    </>
  )
}
