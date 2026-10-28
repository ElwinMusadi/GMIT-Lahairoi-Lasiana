import type { WorshipFields } from '../../shared/worship'
import { sameServant } from '../../shared/worship'
import {
  SERVANT_ROLES,
  SERVANT_ROLE_LABELS,
  type ServantRole,
  type WorshipItem,
  type WorshipServant,
} from '../../shared/types'

// Bagian bersama rute /api/worships: kolom SQL, petugas beserta tanda bentroknya, dan
// bentuk data di Log Aktivitas.

const ISO = (column: string) => `strftime('%Y-%m-%dT%H:%M:%SZ', ${column})`

export const SCHEDULE_SELECT = `
  SELECT w.id, w.title, w.category, w.rayon_id, r.name AS rayon_name, w.worship_date,
         w.worship_time, w.location, w.theme, w.bible_reading, w.liturgy_file_url,
         w.is_public, w.attendance_men, w.attendance_women, w.attendance_youth_children,
         w.attendance_total, ${ISO('w.created_at')} AS created_at,
         ${ISO('w.updated_at')} AS updated_at
  FROM worship_schedules w
  LEFT JOIN rayons r ON r.id = w.rayon_id`

export type ScheduleRow = Omit<WorshipItem, 'is_public' | 'servants' | 'has_conflict'> & {
  is_public: number
}

type SlotServant = {
  id: number
  schedule_id: number
  role: ServantRole
  servant_name: string
  member_id: number | null
  title: string
  worship_date: string
  worship_time: string | null
}

// Melengkapi jadwal dengan petugasnya. Petugas bentrok bila orang yang sama juga
// bertugas di ibadah lain pada tanggal dan jam yang sama; jadwal yang jamnya belum
// ditetapkan tidak dibandingkan. Satu query untuk semua petugas pada tanggal-tanggal itu,
// termasuk ibadah di luar halaman yang sedang dimuat.
export async function withServants(db: D1Database, rows: ScheduleRow[]): Promise<WorshipItem[]> {
  if (rows.length === 0) return []
  const dates = [...new Set(rows.map((row) => row.worship_date))]
  const { results } = await db
    .prepare(
      `SELECT s.id, s.schedule_id, s.role, s.servant_name, s.member_id, w.title,
              w.worship_date, w.worship_time
       FROM worship_servants s
       JOIN worship_schedules w ON w.id = s.schedule_id
       WHERE w.worship_date IN (SELECT value FROM json_each(?1))
       ORDER BY s.id`,
    )
    .bind(JSON.stringify(dates))
    .all<SlotServant>()

  const bySchedule = new Map<number, SlotServant[]>()
  const bySlot = new Map<string, SlotServant[]>()
  for (const servant of results) {
    bySchedule.set(servant.schedule_id, [...(bySchedule.get(servant.schedule_id) ?? []), servant])
    if (servant.worship_time === null) continue
    const slot = `${servant.worship_date} ${servant.worship_time}`
    bySlot.set(slot, [...(bySlot.get(slot) ?? []), servant])
  }

  return rows.map((row) => {
    const slot = row.worship_time
      ? (bySlot.get(`${row.worship_date} ${row.worship_time}`) ?? [])
      : []
    const servants: WorshipServant[] = (bySchedule.get(row.id) ?? [])
      .sort((a, b) => SERVANT_ROLES.indexOf(a.role) - SERVANT_ROLES.indexOf(b.role))
      .map((servant) => ({
        id: servant.id,
        role: servant.role,
        servant_name: servant.servant_name,
        member_id: servant.member_id,
        conflicts: slot
          .filter((other) => other.schedule_id !== row.id && sameServant(other, servant))
          .map((other) => ({
            worship_id: other.schedule_id,
            title: other.title,
            role: other.role,
          })),
      }))
    return {
      ...row,
      is_public: row.is_public === 1,
      servants,
      has_conflict: servants.some((servant) => servant.conflicts.length > 0),
    }
  })
}

export async function findWorship(db: D1Database, id: number): Promise<WorshipItem | null> {
  const row = await db.prepare(`${SCHEDULE_SELECT} WHERE w.id = ?1`).bind(id).first<ScheduleRow>()
  if (!row) return null
  const [worship] = await withServants(db, [row])
  return worship
}

// WorshipItem → nilai kolom jadwal.
export function worshipFields(item: WorshipItem): WorshipFields {
  return {
    title: item.title,
    category: item.category,
    rayon_id: item.rayon_id,
    worship_date: item.worship_date,
    worship_time: item.worship_time,
    location: item.location,
    theme: item.theme,
    bible_reading: item.bible_reading,
    liturgy_file_url: item.liturgy_file_url,
    is_public: item.is_public,
  }
}

const SHORT_DATE = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

// “Kebaktian Pagi” 1 Nov 2026
export function worshipLabel(fields: { title: string; worship_date: string }) {
  return `“${fields.title}” ${SHORT_DATE.format(Date.parse(`${fields.worship_date}T00:00:00Z`))}`
}

// Rayon dicatat dengan namanya agar Log Aktivitas tetap terbaca.
export function worshipAuditView(fields: WorshipFields, rayonName: string | null) {
  const { rayon_id: _rayonId, ...rest } = fields
  return { ...rest, rayon: rayonName }
}

// Susunan petugas sebagai satu teks, mis. "Pelayan Firman: Pdt. X; Liturgos: Pnt. Y".
export function servantsAuditText(
  servants: { role: ServantRole; servant_name: string; member_id: number | null }[],
) {
  if (servants.length === 0) return null
  return [...servants]
    .sort((a, b) => SERVANT_ROLES.indexOf(a.role) - SERVANT_ROLES.indexOf(b.role))
    .map((servant) => `${SERVANT_ROLE_LABELS[servant.role]}: ${servant.servant_name}`)
    .join('; ')
}
