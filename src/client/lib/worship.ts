import {
  SERVANT_ROLE_LABELS,
  WORSHIP_CATEGORY_LABELS,
  type ServantRole,
  type UserRole,
  type WorshipCategory,
  type WorshipItem,
} from '@shared/types'
import { ATTENDANCE_FIELDS, ATTENDANCE_LABELS, sameServant } from '@shared/worship'
import { formatLongDate } from '@/lib/finance'

// Bagian bersama halaman Jadwal Ibadah di dashboard (daftar, rincian, editor).

// Menyusun jadwal dan petugas (PRD: Admin dan Pendeta). Semua yang membuka modul ini
// (Admin, Pendeta, Majelis) boleh mencatat kehadiran. API menegakkan hal yang sama.
export const WORSHIP_PLANNERS: readonly UserRole[] = ['ADMIN', 'PASTOR']

export const CATEGORY_ORDER: WorshipCategory[] = [
  'SUNDAY_SERVICE',
  'RAYON',
  'CATEGORICAL',
  'SPECIAL',
]

// Sebutan pendek untuk pilihan jenis di form.
export const CATEGORY_SHORT: Record<WorshipCategory, string> = {
  SUNDAY_SERVICE: 'Kebaktian Minggu',
  RAYON: 'Ibadah Rayon',
  CATEGORICAL: 'Kategorial',
  SPECIAL: 'Ibadah Khusus',
}

// "Rayon Golgota" untuk Ibadah Rayon, selain itu jenis ibadahnya.
export function worshipKind(worship: { category: WorshipCategory; rayon_name: string | null }) {
  return worship.category === 'RAYON' && worship.rayon_name
    ? `Rayon ${worship.rayon_name}`
    : WORSHIP_CATEGORY_LABELS[worship.category]
}

// "07.00", atau null bila jamnya belum ditetapkan.
export function worshipTime(time: string | null) {
  return time ? time.replace(':', '.') : null
}

const DAY_MS = 86_400_000

// Judul kelompok per tanggal: "Hari ini · Minggu, 1 November 2026", "Besok · …",
// "Kemarin · …", lalu tanggalnya saja.
export function dayHeading(date: string, today: string) {
  const label = formatLongDate(date, true)
  const days = Math.round((Date.parse(date) - Date.parse(today)) / DAY_MS)
  if (days === 0) return `Hari ini · ${label}`
  if (days === 1) return `Besok · ${label}`
  if (days === -1) return `Kemarin · ${label}`
  return label
}

// Nama ibadah yang dipakai bila kolom nama dibiarkan kosong.
export function suggestedTitle(
  category: WorshipCategory,
  rayonName: string | null,
  time: string,
): string {
  if (category === 'RAYON') return rayonName ? `Ibadah Rayon ${rayonName}` : 'Ibadah Rayon'
  if (category !== 'SUNDAY_SERVICE') return WORSHIP_CATEGORY_LABELS[category]
  const hour = Number(time.slice(0, 2))
  if (!time || Number.isNaN(hour)) return 'Kebaktian Minggu'
  return hour < 11
    ? 'Kebaktian Minggu Pagi'
    : hour < 15
      ? 'Kebaktian Minggu Siang'
      : 'Kebaktian Minggu Sore'
}

// "Pria 120 · Wanita 150 · Anak/Pemuda —"
export function attendanceBreakdown(worship: WorshipItem) {
  return ATTENDANCE_FIELDS.map(
    (field) => `${ATTENDANCE_LABELS[field]} ${worship[field]?.toLocaleString('id-ID') ?? '—'}`,
  ).join(' · ')
}

export type LiveConflict = {
  worship_id: number
  title: string
  kind: string
  role: ServantRole
}

// Tugas orang ini di ibadah lain pada tanggal dan jam yang sama, untuk peringatan
// langsung di form sebelum disimpan. Aturannya sama dengan API (sameServant).
export function liveConflicts(
  person: { servant_name: string; member_id: number | null },
  others: WorshipItem[],
): LiveConflict[] {
  if (!person.servant_name.trim()) return []
  return others.flatMap((worship) =>
    worship.servants
      .filter((servant) => sameServant(servant, person))
      .map((servant) => ({
        worship_id: worship.id,
        title: worship.title,
        kind: worshipKind(worship),
        role: servant.role,
      })),
  )
}

// "Pelayan Firman di “Ibadah Rayon Golgota”"
export function conflictPhrase(conflict: { role: ServantRole; title: string }) {
  return `${SERVANT_ROLE_LABELS[conflict.role]} di “${conflict.title}”`
}
