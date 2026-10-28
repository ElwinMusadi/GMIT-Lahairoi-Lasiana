import type { FieldErrors } from './accounts'
import type { AnalyticsPeriod } from './types'

// Aturan Dashboard Eksekutif & Analitik (PRD Fase 3) yang dipakai bersama API dan
// dashboard: periode filter keuangan & kehadiran, minggu berjalan, dan tanggal ulang
// tahun. Semua tanggal berupa teks YYYY-MM-DD (WITA).

const DAY_MS = 86_400_000

// Tahun anggaran paling awal yang bisa dipilih.
export const MIN_ANALYTICS_YEAR = 2000

// Query `year`, `month_from`, `month_to` (1–12, inklusif). Tanpa `year`: tahun berjalan.
// Tanpa rentang bulan: Januari s.d. bulan berjalan untuk tahun ini, atau seluruh tahun
// untuk tahun lampau.
export function parseAnalyticsPeriod(
  query: Record<string, string | undefined>,
  today: string,
): { period: AnalyticsPeriod | null; details: FieldErrors } {
  const details: FieldErrors = {}
  const currentYear = Number(today.slice(0, 4))
  const currentMonth = Number(today.slice(5, 7))

  const year = query.year === undefined ? currentYear : wholeNumber(query.year)
  if (year === null || year < MIN_ANALYTICS_YEAR || year > currentYear) {
    details.year = [`Tahun anggaran antara ${MIN_ANALYTICS_YEAR} dan ${currentYear}.`]
  }
  const lastMonth = year === currentYear ? currentMonth : 12
  const monthFrom = query.month_from === undefined ? 1 : wholeNumber(query.month_from)
  const monthTo = query.month_to === undefined ? lastMonth : wholeNumber(query.month_to)
  if (monthFrom === null || monthFrom < 1 || monthFrom > 12) {
    details.month_from = ['Bulan awal antara 1 dan 12.']
  }
  if (monthTo === null || monthTo < 1 || monthTo > 12) {
    details.month_to = ['Bulan akhir antara 1 dan 12.']
  } else if (monthFrom !== null && monthTo < monthFrom) {
    details.month_to = ['Bulan akhir tidak boleh sebelum bulan awal.']
  }
  if (Object.keys(details).length > 0 || year === null || monthFrom === null || monthTo === null) {
    return { period: null, details }
  }
  return {
    period: {
      year,
      month_from: monthFrom,
      month_to: monthTo,
      from: `${year}-${pad(monthFrom)}-01`,
      to: `${year}-${pad(monthTo)}-${pad(daysInMonth(year, monthTo))}`,
    },
    details,
  }
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
}

// Minggu yang memuat `date`, dari hari Minggu s.d. Sabtu.
export function weekOf(date: string): { from: string; to: string } {
  const from = addDays(date, -new Date(`${date}T00:00:00Z`).getUTCDay())
  return { from, to: addDays(from, 6) }
}

export function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

// Tanggal ulang tahun pada tahun `year`. Yang lahir 29 Februari merayakannya pada
// 28 Februari di tahun bukan kabisat.
export function birthdayInYear(birthDate: string, year: number): string {
  const monthDay = birthDate.slice(5)
  if (monthDay === '02-29' && !isLeapYear(year)) return `${year}-02-28`
  return `${year}-${monthDay}`
}

// Ulang tahun yang jatuh di antara `from` dan `to` (inklusif, paling lama satu tahun),
// atau null. Kelahiran pada rentang itu sendiri bukan ulang tahun (usia 0).
export function birthdayBetween(
  birthDate: string,
  from: string,
  to: string,
): { birthday: string; age: number } | null {
  const birthYear = Number(birthDate.slice(0, 4))
  for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year++) {
    const birthday = birthdayInYear(birthDate, year)
    const age = year - birthYear
    if (birthday >= from && birthday <= to && age >= 1) return { birthday, age }
  }
  return null
}

// Pola MM-DD tanggal lahir yang ulang tahunnya bisa jatuh di antara `from` dan `to`,
// untuk menyaring di database. 28 Februari tahun bukan kabisat ikut membawa 02-29.
export function birthdayKeys(from: string, to: string): string[] {
  const keys = new Set<string>()
  for (let date = from; date <= to; date = addDays(date, 1)) {
    keys.add(date.slice(5))
    if (date.slice(5) === '02-28' && !isLeapYear(Number(date.slice(0, 4)))) keys.add('02-29')
  }
  return [...keys]
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function wholeNumber(text: string): number | null {
  return /^\d{1,4}$/.test(text.trim()) ? Number(text.trim()) : null
}
