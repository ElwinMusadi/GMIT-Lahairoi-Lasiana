// Format tanggal dan jam untuk tampilan. API mengirim timestamp ISO 8601 UTC; jemaat
// berada di Kupang, jadi semuanya ditampilkan dalam WITA (UTC+8).

const TIME_ZONE = 'Asia/Makassar'

const dateFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const timeFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
})
// en-CA menghasilkan YYYY-MM-DD, format yang dipakai filter tanggal API.
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// "28 Okt 2026"
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso))
}

// "09.14"
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

// Tanggal WITA sebagai YYYY-MM-DD, mis. untuk nilai bawaan filter tanggal.
export function witaDate(date: Date = new Date()): string {
  return dayFormat.format(date)
}

const dayHeadingFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// Judul kelompok per hari: "Hari ini · Rabu, 28 Oktober 2026", "Kemarin · …", lalu tanggalnya saja.
export function formatDayHeading(iso: string, now: Date = new Date()): string {
  const label = dayHeadingFormat.format(new Date(iso))
  const days = Math.round(
    (Date.parse(witaDate(now)) - Date.parse(witaDate(new Date(iso)))) / 86_400_000,
  )
  if (days === 0) return `Hari ini · ${label}`
  if (days === 1) return `Kemarin · ${label}`
  return label
}

// Untuk keterkinian: "Hari ini, 09.14", "Kemarin, 18.02", "5 hari lalu", lalu tanggal.
export function formatRecent(iso: string, now: Date = new Date()): string {
  const days = Math.round(
    (Date.parse(witaDate(now)) - Date.parse(witaDate(new Date(iso)))) / 86_400_000,
  )
  if (days <= 0) return `Hari ini, ${formatTime(iso)}`
  if (days === 1) return `Kemarin, ${formatTime(iso)}`
  if (days < 7) return `${days} hari lalu`
  return formatDate(iso)
}
