import type { ApiPage, PublicWorshipItem } from '@shared/types'
import { LoadError } from '@/components/portal/kage/site-section'
import { AgendaList } from '@/components/portal/schedule/agenda-list'
import type { ApiQuery } from '@/lib/use-api-query'
import { SEARCH_MAX_RESULTS } from '@/lib/use-schedule-calendar'
import { searchTerms } from '@/lib/schedule-calendar'
import { cn } from '@/lib/utils'

// Hasil pencarian kalender Jadwal Ibadah: jadwal mendatang yang cocok, per hari, dengan kata
// yang cocok ditandai. Menggantikan tampilan kalender selama kata cari terisi. Saringan jenis
// dan rayon ikut berlaku pada hasil yang sudah dimuat.

const button =
  'inline-flex min-h-11 items-center rounded-full border border-site-rule px-4 text-sm font-semibold text-site-ink transition-colors outline-none hover:border-site-ink focus-visible:ring-3 focus-visible:ring-ring'

export function SearchResults({
  query,
  results,
  worships,
  hidden,
  limit,
  today,
  onOpen,
  onMore,
  onClear,
  onClearFilters,
}: {
  query: string
  results: ApiQuery<ApiPage<PublicWorshipItem>>
  // Hasil yang dimuat sesudah saringan jenis dan rayon.
  worships: PublicWorshipItem[]
  // Hasil yang dimuat tetapi disembunyikan saringan.
  hidden: number
  limit: number
  today: string
  onOpen: (worship: PublicWorshipItem) => void
  onMore: () => void
  onClear: () => void
  onClearFilters: () => void
}) {
  const back = (
    <button type="button" onClick={onClear} className={button}>
      Kembali ke kalender
    </button>
  )
  if (results.error && !results.data) {
    return <LoadError message="Pencarian tidak dapat dimuat." onRetry={results.reload} />
  }
  if (!results.data) {
    return (
      <div aria-hidden="true" className="grid gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-lg bg-site-ink/[0.06]" />
        ))}
      </div>
    )
  }
  const { data, meta } = results.data
  const filteredOut =
    hidden > 0 ? (
      <p className="text-sm text-site-muted">
        {hidden} hasil lain disembunyikan saringan.{' '}
        <button
          type="button"
          onClick={onClearFilters}
          className="rounded-sm font-semibold text-site-ink underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          Hapus saringan
        </button>
      </p>
    ) : null
  if (worships.length === 0 && data.length > 0) {
    return (
      <div className="grid justify-items-start gap-3 rounded-2xl border border-dashed border-site-rule p-5 md:p-6">
        <p className="text-base text-site-ink">
          Tidak ada hasil untuk “{query}” yang cocok dengan saringan.
        </p>
        {filteredOut}
        {back}
      </div>
    )
  }
  if (data.length === 0) {
    return (
      <div className="grid justify-items-start gap-3 rounded-2xl border border-dashed border-site-rule p-5 md:p-6">
        <p className="text-base text-site-ink">
          Tidak ada jadwal mendatang yang cocok dengan “{query}”.
        </p>
        <p className="text-sm text-site-muted">
          Coba nama yang lebih pendek, mis. nama depan saja, atau periksa ejaannya.
        </p>
        {back}
      </div>
    )
  }
  const remaining = meta.total - data.length
  return (
    <div className={cn('grid gap-6 transition-opacity', results.loading && 'opacity-60')}>
      <AgendaList worships={worships} today={today} onOpen={onOpen} terms={searchTerms(query)} />
      {filteredOut}
      <div className="flex flex-wrap items-center gap-3">
        {remaining > 0 && limit < SEARCH_MAX_RESULTS && (
          <button type="button" onClick={onMore} disabled={results.loading} className={button}>
            Muat lebih banyak ({remaining} lagi)
          </button>
        )}
        {remaining > 0 && limit >= SEARCH_MAX_RESULTS && (
          <p className="text-sm text-site-muted">
            Menampilkan {data.length} jadwal terdekat dari {meta.total}. Tambahkan kata cari untuk
            mempersempit.
          </p>
        )}
        {back}
      </div>
    </div>
  )
}
