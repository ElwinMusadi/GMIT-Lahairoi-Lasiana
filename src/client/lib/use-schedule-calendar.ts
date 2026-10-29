import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router'
import { witaToday } from '@shared/dates'
import type { ApiPage, PublicWorshipItem, PublicWorshipResponse } from '@shared/types'
import {
  calendarParams,
  daySummary,
  filterWorships,
  inDates,
  kindCounts,
  loadRange,
  parseCalendarParams,
  periodDates,
  rayonCounts,
  type CalendarContext,
  type CalendarState,
} from '@/lib/schedule-calendar'
import { useApiQuery } from '@/lib/use-api-query'

// Keadaan dan data kalender Jadwal Ibadah. Keadaan hidup di URL (lib/schedule-calendar.ts),
// sehingga tautannya bisa dibagikan dan tombol Kembali berfungsi. Data dimuat per kisi bulan;
// saringan jenis dan rayon dihitung di browser tanpa memuat ulang.

// Di bawah 1024 px Agenda menjadi tampilan bawaan: di tablet tegak tujuh kolom Pekan hanya
// ±85 px, terlalu sempit untuk nama seperti "Kapernaum". Pekan tetap bisa dipilih dari 768 px;
// di bawahnya Pekan tidak tersedia sama sekali.
const AGENDA_FIRST_QUERY = '(max-width: 1023px)'
const NO_WEEK_QUERY = '(max-width: 767px)'
// Satu kisi bulan (42 hari) sekali minta; batas mode rentang API.
const RANGE_PER_PAGE = 300
export const SEARCH_PER_PAGE = 50

function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export function useScheduleCalendar() {
  const [params, setParams] = useSearchParams()
  const agendaFirst = useMedia(AGENDA_FIRST_QUERY)
  const narrow = useMedia(NO_WEEK_QUERY)
  const [today] = useState(witaToday)
  const context = useMemo<CalendarContext>(
    () => ({ today, narrow: agendaFirst }),
    [today, agendaFirst],
  )
  const state = useMemo(() => parseCalendarParams(params, context), [params, context])
  const range = loadRange(state.anchor)
  const searching = state.query !== ''

  // Kisi bulan selalu dimuat, juga saat mencari: kalender mini di sisi kiri tetap bertitik.
  const period = useApiQuery<ApiPage<PublicWorshipItem>>('/public/worships', {
    from: range.from,
    to: range.to,
    per_page: RANGE_PER_PAGE,
  })
  // Pencarian menembus periode: seluruh jadwal mendatang (keputusan J4).
  const search = useApiQuery<ApiPage<PublicWorshipItem>>(searching ? '/public/worships' : null, {
    q: state.query,
    per_page: SEARCH_PER_PAGE,
  })

  const loaded = period.data?.data ?? []
  const filtered = filterWorships(loaded, state)
  const dates = periodDates(state.view, state.anchor)
  const inPeriod = inDates(loaded, dates)

  // Rincian dari data yang sudah dimuat; bila tidak ada (tautan langsung ke jadwal di luar
  // periode), diminta sendiri.
  const known =
    state.openId === null
      ? null
      : (loaded.find((worship) => worship.id === state.openId) ??
        search.data?.data.find((worship) => worship.id === state.openId) ??
        null)
  const detail = useApiQuery<PublicWorshipResponse>(
    state.openId !== null && !known ? `/public/worships/${state.openId}` : null,
  )

  // Perubahan dibangun dari URL saat ini. Berpindah periode dan mengganti saringan memakai
  // replace agar riwayat tidak penuh; membuka rincian memakai push, sehingga tombol Kembali di
  // ponsel menutup lembar rinciannya.
  const update = useCallback(
    (changes: Partial<CalendarState>, options?: { push?: boolean }) => {
      const next = new URLSearchParams(window.location.search)
      const values = calendarParams({ ...parseCalendarParams(next, context), ...changes }, context)
      next.delete('page')
      for (const [key, value] of Object.entries(values)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      setParams(next, { replace: !options?.push, preventScrollReset: true })
    },
    [context, setParams],
  )

  return {
    state,
    today,
    // Di bawah 768 px: tampilan Pekan tidak tersedia.
    narrow,
    searching,
    dates,
    period,
    search,
    // Jadwal periode aktif yang lolos saringan, untuk tampilan Pekan, Agenda, dan Bulan.
    visible: inDates(filtered, dates),
    // Seluruh jadwal periode aktif sebelum disaring.
    periodTotal: inPeriod.length,
    // Titik kalender mini: seluruh kisi bulan, mengikuti saringan.
    days: daySummary(filtered),
    counts: {
      kinds: kindCounts(inPeriod, state.rayonId),
      rayons: rayonCounts(inPeriod, state.kinds),
    },
    open: known ?? detail.data?.worship ?? null,
    detail,
    update,
  }
}
