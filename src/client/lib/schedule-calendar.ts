import { isCalendarDate } from '@shared/dates'
import { WORSHIP_CATEGORIES, type PublicWorshipItem, type WorshipCategory } from '@shared/types'
import { addDays } from '@/lib/portal'

// Kalender Jadwal Ibadah di Portal (docs/rencana-redesign-jadwal-ibadah.md): hitungan
// tanggal, keadaan di URL, saringan, dan hitungan. Fungsi murni tanpa React. Semua tanggal
// berupa YYYY-MM-DD (WITA) dan dihitung di UTC, sehingga zona waktu perangkat tidak menggeser
// hari.

export type CalendarView = 'agenda' | 'pekan' | 'bulan'
export const CALENDAR_VIEWS: CalendarView[] = ['agenda', 'pekan', 'bulan']

export type CalendarState = {
  view: CalendarView
  // Tanggal jangkar periode: pekan yang memuatnya, atau bulannya.
  anchor: string
  // Jenis ibadah yang ditampilkan; kosong berarti semua jenis.
  kinds: WorshipCategory[]
  // Rayon pilihan; hanya menyaring ibadah yang terikat rayon (keputusan J3).
  rayonId: number | null
  // Kata cari; bila terisi, kalender diganti hasil pencarian jadwal mendatang.
  query: string
  // Jadwal yang rinciannya sedang dibuka.
  openId: number | null
}

// Ponsel memakai Agenda sebagai bawaan, layar lebih lebar memakai Pekan (keputusan J1).
export type CalendarContext = { today: string; narrow: boolean }

export const SEARCH_MAX_LENGTH = 100

const DAY_MS = 86_400_000

// ---------- Tanggal

export function dayOfWeek(date: string) {
  // 0 = Senin … 6 = Minggu.
  return (new Date(Date.parse(date)).getUTCDay() + 6) % 7
}

export function weekStart(date: string) {
  return addDays(date, -dayOfWeek(date))
}

export function weekDates(anchor: string) {
  const start = weekStart(anchor)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`
}

// Hari pertama bulan, digeser sejumlah bulan.
export function addMonths(date: string, months: number) {
  const value = new Date(Date.parse(monthStart(date)))
  value.setUTCMonth(value.getUTCMonth() + months)
  return value.toISOString().slice(0, 10)
}

export function sameMonth(a: string, b: string) {
  return a.slice(0, 7) === b.slice(0, 7)
}

// Kisi bulan 6×7 mulai Senin: selalu 42 hari, cukup untuk bulan yang mulai hari Minggu.
export function monthGrid(anchor: string) {
  const start = weekStart(monthStart(anchor))
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

// Rentang yang dimuat dari API: kisi bulan jangkar (41 hari dari awal ke akhir, di dalam
// batas mode rentang 42 hari). Pekan jangkar selalu ada di dalamnya, jadi berpindah pekan di
// bulan yang sama dan berganti tampilan tidak memuat ulang data.
export function loadRange(anchor: string) {
  const grid = monthGrid(anchor)
  return { from: grid[0], to: grid[grid.length - 1] }
}

// Tanggal yang tampil di tampilan aktif.
export function periodDates(view: CalendarView, anchor: string) {
  return view === 'bulan' ? monthGrid(anchor) : weekDates(anchor)
}

// Jangkar periode sebelum/sesudahnya: satu pekan, atau hari pertama bulan.
export function shiftAnchor(view: CalendarView, anchor: string, direction: 1 | -1) {
  return view === 'bulan' ? addMonths(anchor, direction) : addDays(anchor, 7 * direction)
}

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS)
}

const monthNames = {
  long: new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', month: 'long' }),
  short: new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', month: 'short' }),
}

function parts(date: string, month: keyof typeof monthNames = 'long') {
  const value = Date.parse(date)
  return {
    day: new Date(value).getUTCDate(),
    month: monthNames[month].format(value),
    year: date.slice(0, 4),
  }
}

// "2–8 November 2026", "26 Oktober–1 November 2026", "28 Desember 2026–3 Januari 2027";
// tampilan Bulan: "November 2026". `short` untuk ponsel: "26 Okt–1 Nov 2026".
export function periodLabel(view: CalendarView, anchor: string, short = false) {
  if (view === 'bulan') {
    const { month, year } = parts(anchor)
    return `${month} ${year}`
  }
  const dates = weekDates(anchor)
  const first = parts(dates[0], short ? 'short' : 'long')
  const last = parts(dates[6], short ? 'short' : 'long')
  if (first.year !== last.year) {
    return `${first.day} ${first.month} ${first.year}–${last.day} ${last.month} ${last.year}`
  }
  if (first.month !== last.month) {
    return `${first.day} ${first.month}–${last.day} ${last.month} ${last.year}`
  }
  return `${first.day}–${last.day} ${last.month} ${last.year}`
}

// ---------- URL

// Parameter di alamat halaman. Tautan lama `?jenis=rayon&rayon=2` tetap terbaca; `page` dari
// daftar lama diabaikan dan dibuang pada perubahan pertama.
export const CALENDAR_PARAMS = ['tampilan', 'tanggal', 'jenis', 'rayon', 'cari', 'jadwal'] as const

function defaultView({ narrow }: CalendarContext): CalendarView {
  return narrow ? 'agenda' : 'pekan'
}

function positiveId(text: string | null) {
  if (!text || !/^\d{1,9}$/.test(text)) return null
  const value = Number(text)
  return value > 0 ? value : null
}

// Urut seperti WORSHIP_CATEGORIES; keempatnya sekaligus berarti tanpa saringan.
function normalizeKinds(kinds: readonly string[]): WorshipCategory[] {
  const chosen = WORSHIP_CATEGORIES.filter((kind) => kinds.includes(kind))
  return chosen.length === WORSHIP_CATEGORIES.length ? [] : chosen
}

export function parseCalendarParams(
  params: URLSearchParams,
  context: CalendarContext,
): CalendarState {
  const view = params.get('tampilan') as CalendarView | null
  const date = params.get('tanggal') ?? ''
  return {
    view: view && CALENDAR_VIEWS.includes(view) ? view : defaultView(context),
    anchor: isCalendarDate(date) ? date : context.today,
    kinds: normalizeKinds(
      (params.get('jenis') ?? '').split(',').map((kind) => kind.trim().toUpperCase()),
    ),
    rayonId: positiveId(params.get('rayon')),
    query: (params.get('cari') ?? '').trim().slice(0, SEARCH_MAX_LENGTH),
    openId: positiveId(params.get('jadwal')),
  }
}

// Nilai parameter untuk keadaan ini; string kosong berarti parameternya dihapus. Nilai bawaan
// tidak ditulis, jadi tautan tanpa `tanggal` selalu berarti "pekan ini" bagi penerimanya.
export function calendarParams(
  state: CalendarState,
  context: CalendarContext,
): Record<(typeof CALENDAR_PARAMS)[number], string> {
  const kinds = normalizeKinds(state.kinds)
  return {
    tampilan: state.view === defaultView(context) ? '' : state.view,
    tanggal: state.anchor === context.today ? '' : state.anchor,
    jenis: kinds.map((kind) => kind.toLowerCase()).join(','),
    rayon: state.rayonId ? String(state.rayonId) : '',
    cari: state.query.trim().slice(0, SEARCH_MAX_LENGTH),
    jadwal: state.openId ? String(state.openId) : '',
  }
}

// ---------- Saringan dan hitungan

type Worship = Pick<PublicWorshipItem, 'category' | 'rayon_id' | 'worship_date' | 'worship_time'>

export function matchesKinds(worship: Worship, kinds: readonly WorshipCategory[]) {
  return kinds.length === 0 || kinds.includes(worship.category)
}

// Ibadah seluruh jemaat (tanpa rayon) selalu ikut; ibadah rayon lain disembunyikan.
export function matchesRayon(worship: Worship, rayonId: number | null) {
  return rayonId === null || worship.rayon_id === null || worship.rayon_id === rayonId
}

export function filterWorships<T extends Worship>(
  worships: readonly T[],
  filter: Pick<CalendarState, 'kinds' | 'rayonId'>,
) {
  return worships.filter(
    (worship) => matchesKinds(worship, filter.kinds) && matchesRayon(worship, filter.rayonId),
  )
}

export function inDates<T extends Worship>(worships: readonly T[], dates: readonly string[]) {
  const first = dates[0]
  const last = dates[dates.length - 1]
  return worships.filter((worship) => worship.worship_date >= first && worship.worship_date <= last)
}

// Jumlah per jenis di periode, dengan saringan rayon tetapi tanpa saringan jenis, agar
// setiap kotak centang menunjukkan berapa yang akan tampil bila dicentang.
export function kindCounts(worships: readonly Worship[], rayonId: number | null) {
  const counts = Object.fromEntries(WORSHIP_CATEGORIES.map((kind) => [kind, 0])) as Record<
    WorshipCategory,
    number
  >
  for (const worship of worships) {
    if (matchesRayon(worship, rayonId)) counts[worship.category]++
  }
  return counts
}

// Jumlah ibadah yang terikat rayon, per rayon, dengan saringan jenis.
export function rayonCounts(worships: readonly Worship[], kinds: readonly WorshipCategory[]) {
  const counts = new Map<number, number>()
  for (const worship of worships) {
    if (worship.rayon_id === null || !matchesKinds(worship, kinds)) continue
    counts.set(worship.rayon_id, (counts.get(worship.rayon_id) ?? 0) + 1)
  }
  return counts
}

// Jadwal per tanggal, dengan urutan dari API (tanggal lalu jam) tetap terjaga.
export function groupByDate<T extends Worship>(worships: readonly T[]) {
  const days = new Map<string, T[]>()
  for (const worship of worships) {
    const day = days.get(worship.worship_date)
    if (day) day.push(worship)
    else days.set(worship.worship_date, [worship])
  }
  return days
}

// Titik di kalender: jumlah jadwal dan jenis yang ada di tiap tanggal.
export function daySummary(worships: readonly Worship[]) {
  const days = new Map<string, { count: number; kinds: WorshipCategory[] }>()
  for (const [date, list] of groupByDate(worships)) {
    days.set(date, {
      count: list.length,
      kinds: WORSHIP_CATEGORIES.filter((kind) => list.some((worship) => worship.category === kind)),
    })
  }
  return days
}

// Baris tabel Pekan: jam yang benar-benar dipakai, urut; jadwal tanpa jam di baris terakhir.
export function timeRows(worships: readonly Worship[]) {
  const times = [...new Set(worships.map((worship) => worship.worship_time))]
  const known = times.filter((time): time is string => time !== null).sort()
  return times.includes(null) ? [...known, null] : known
}

// Jam sekarang di Kupang (WITA), "HH:MM".
export function witaTime(now = Date.now()) {
  return new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(11, 16)
}

// Ibadah berikutnya dari daftar mendatang (urut tanggal dan jam): ibadah hari ini yang jamnya
// sudah lewat dilewati; ibadah hari ini tanpa jam tetap dihitung.
export function nextWorship<T extends Worship>(
  worships: readonly T[],
  today: string,
  time: string,
) {
  return (
    worships.find(
      (worship) =>
        worship.worship_date > today ||
        (worship.worship_date === today &&
          (worship.worship_time === null || worship.worship_time >= time)),
    ) ?? null
  )
}

// Jumlah kelompok saringan yang aktif (jenis, rayon), untuk angka di tombol "Saring".
export function activeFilterCount(state: Pick<CalendarState, 'kinds' | 'rayonId'>) {
  return (state.kinds.length > 0 ? 1 : 0) + (state.rayonId !== null ? 1 : 0)
}
