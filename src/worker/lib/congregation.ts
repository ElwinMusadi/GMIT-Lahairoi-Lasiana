import type { Context } from 'hono'
import type { FamilyFields, MemberFields } from '../../shared/congregation'
import type {
  ApiErrorBody,
  Family,
  FamilyDetail,
  Member,
  MemberWithFamily,
  SessionUser,
} from '../../shared/types'
import type { AppEnv } from '../types'

// Bagian bersama rute /api/families dan /api/members: kolom SQL, konversi baris D1,
// bentuk data di Log Aktivitas, dan cakupan rayon Majelis.

// Majelis hanya melihat dan mengelola jemaat di rayonnya sendiri (PRD: "akses
// informasi anggota jemaat di rayon masing-masing"). null berarti semua rayon.
export function rayonScope(user: SessionUser): number | null {
  if (user.role !== 'ELDER') return null
  // Akun Majelis selalu punya rayon (validasi akun); 0 tidak cocok dengan rayon mana pun.
  return user.rayon_id ?? 0
}

export function inScope(scope: number | null, rayonId: number): boolean {
  return scope === null || scope === rayonId
}

export function outsideRayon(c: Context<AppEnv>, subject?: string) {
  const rule = 'Majelis hanya dapat mengakses jemaat di rayonnya sendiri.'
  return c.json<ApiErrorBody>(
    { error: subject ? `${subject} berada di luar rayon Anda. ${rule}` : rule },
    403,
  )
}

const ISO = (column: string) => `strftime('%Y-%m-%dT%H:%M:%SZ', ${column})`

export const FAMILY_SELECT = `
  SELECT f.id, f.kk_number, f.family_head_name, f.rayon_id, r.name AS rayon_name,
         f.address, f.phone,
         (SELECT COUNT(*) FROM members m
          WHERE m.family_id = f.id AND m.status = 'ACTIVE') AS member_count,
         ${ISO('f.created_at')} AS created_at, ${ISO('f.updated_at')} AS updated_at
  FROM families f
  JOIN rayons r ON r.id = f.rayon_id`

// Kolom anggota yang bisa diisi pengurus, dalam urutan tabel. Dipakai untuk SELECT,
// INSERT, UPDATE, dan urutan field di Log Aktivitas.
export const MEMBER_FIELD_KEYS = [
  'family_id',
  'church_member_number',
  'nik',
  'full_name',
  'gender',
  'birth_place',
  'birth_date',
  'blood_type',
  'family_relation',
  'education',
  'occupation',
  'categorical_group',
  'baptism_status',
  'baptism_date',
  'sidi_status',
  'sidi_date',
  'marriage_status',
  'marriage_date',
  'status',
] as const satisfies readonly (keyof MemberFields)[]

export const MEMBER_COLUMNS = `m.id, ${MEMBER_FIELD_KEYS.map((key) => `m.${key}`).join(', ')},
  ${ISO('m.created_at')} AS created_at, ${ISO('m.updated_at')} AS updated_at`

export const MEMBER_WITH_FAMILY_SELECT = `
  SELECT ${MEMBER_COLUMNS},
         f.kk_number, f.family_head_name, f.rayon_id, r.name AS rayon_name
  FROM members m
  JOIN families f ON f.id = m.family_id
  JOIN rayons r ON r.id = f.rayon_id`

// Urutan anggota di KK: Kepala Keluarga, Istri/Suami, Anak (tertua dulu), Tanggungan.
export const FAMILY_MEMBER_ORDER = `
  CASE m.family_relation WHEN 'HEAD' THEN 0 WHEN 'SPOUSE' THEN 1 WHEN 'CHILD' THEN 2 ELSE 3 END,
  m.birth_date IS NULL, m.birth_date, m.id`

// D1 menyimpan status baptis/sidi sebagai 0/1.
export type StoredMember<T extends Member> = Omit<T, 'baptism_status' | 'sidi_status'> & {
  baptism_status: number
  sidi_status: number
}

export function toMember<T extends Member>(row: StoredMember<T>): T {
  return {
    ...row,
    baptism_status: row.baptism_status === 1,
    sidi_status: row.sidi_status === 1,
  } as T
}

// Nilai kolom untuk INSERT/UPDATE, sesuai urutan MEMBER_FIELD_KEYS.
export function memberValues(fields: MemberFields): unknown[] {
  return MEMBER_FIELD_KEYS.map((key) => {
    const value = fields[key]
    return typeof value === 'boolean' ? (value ? 1 : 0) : value
  })
}

export function pickMemberFields(member: Member): MemberFields {
  return Object.fromEntries(MEMBER_FIELD_KEYS.map((key) => [key, member[key]])) as MemberFields
}

export async function findMember(db: D1Database, id: number): Promise<MemberWithFamily | null> {
  const row = await db
    .prepare(`${MEMBER_WITH_FAMILY_SELECT} WHERE m.id = ?1`)
    .bind(id)
    .first<StoredMember<MemberWithFamily>>()
  return row ? toMember(row) : null
}

export async function findFamilyDetail(db: D1Database, id: number): Promise<FamilyDetail | null> {
  const [family, members] = await db.batch([
    db.prepare(`${FAMILY_SELECT} WHERE f.id = ?1`).bind(id),
    db
      .prepare(
        `SELECT ${MEMBER_COLUMNS} FROM members m WHERE m.family_id = ?1
         ORDER BY ${FAMILY_MEMBER_ORDER}`,
      )
      .bind(id),
  ])
  const row = family.results[0] as Family | undefined
  if (!row) return null
  return { ...row, members: (members.results as StoredMember<Member>[]).map(toMember) }
}

// Nama KK di Log Aktivitas, mis. "LHR-0012 (Yohanis Dimu)".
export function familyLabel(kkNumber: string | null, headName: string): string {
  return kkNumber ? `${kkNumber} (${headName})` : headName
}

// Bentuk KK di Log Aktivitas: nama rayon, bukan id, agar riwayatnya mudah dibaca.
export function familyAuditView(fields: FamilyFields, rayonName: string) {
  return {
    kk_number: fields.kk_number,
    family_head_name: fields.family_head_name,
    rayon: rayonName,
    address: fields.address,
    phone: fields.phone,
  }
}

// Bentuk anggota di Log Aktivitas: KK disebut dengan nomor dan kepala keluarganya.
export function memberAuditView(fields: MemberFields, family: string) {
  const view: Record<string, unknown> = { family }
  for (const key of MEMBER_FIELD_KEYS) if (key !== 'family_id') view[key] = fields[key]
  return view
}
