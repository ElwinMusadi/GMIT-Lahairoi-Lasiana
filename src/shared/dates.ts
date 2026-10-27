// Tanggal kalender (YYYY-MM-DD) yang dipakai bersama oleh API dan dashboard.

// Tanggal yang benar-benar ada, mis. menolak 2026-02-30.
export function isCalendarDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false
  const date = new Date(`${text}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text)
}

// Tanggal hari ini di Kupang (WITA, UTC+8, tanpa pergantian musim).
export function witaToday(now = Date.now()): string {
  return new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
