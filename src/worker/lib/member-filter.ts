import type { FieldErrors } from '../../shared/accounts'
import {
  BLOOD_TYPES,
  CATEGORICAL_GROUPS,
  FAMILY_RELATIONS,
  GENDERS,
  MARRIAGE_STATUSES,
  MEMBER_STATUSES,
} from '../../shared/types'
import { inScope } from './congregation'
import { containsPattern, positiveInt, searchWords, whereBuilder } from './request'

// Filter data jemaat dari query string, dipakai bersama oleh GET /api/members dan
// GET /api/members/export, sehingga ekspor selalu berisi data yang sama dengan daftar.
//
// Query opsional, dapat dikombinasikan:
//   q                  nama, NIK, Nomor Induk, atau nomor KK (setiap kata harus cocok)
//   rayon_id, family_id
//   categorical_group, blood_type, gender, family_relation, marriage_status, status
//                      satu kode atau beberapa dipisah koma, mis. PAR,PEMUDA
//   baptism_status, sidi_status
//                      true/1 = sudah, false/0 = belum
//
// Kolom memakai alias m (members) dan f (families).

const CHOICE_FILTERS = [
  ['categorical_group', CATEGORICAL_GROUPS],
  ['blood_type', BLOOD_TYPES],
  ['gender', GENDERS],
  ['family_relation', FAMILY_RELATIONS],
  ['marriage_status', MARRIAGE_STATUSES],
  ['status', MEMBER_STATUSES],
] as const

// Status baptis/sidi di query: sudah (1) atau belum (0).
const SACRAMENT_QUERY = new Map([
  ['true', 1],
  ['1', 1],
  ['false', 0],
  ['0', 0],
])

export type MemberFilter = {
  where: ReturnType<typeof whereBuilder>
  details: FieldErrors
  // Majelis meminta rayon di luar rayonnya.
  outsideScope: boolean
}

// `scope`: rayon Majelis (lihat rayonScope), null untuk semua rayon.
export function memberFilter(query: Record<string, string>, scope: number | null): MemberFilter {
  const details: FieldErrors = {}
  const where = whereBuilder()
  let outsideScope = false

  if (query.rayon_id !== undefined) {
    const rayonId = positiveInt(query.rayon_id)
    if (rayonId === null) details.rayon_id = ['Rayon tidak valid.']
    else if (!inScope(scope, rayonId)) outsideScope = true
    else where.add('f.rayon_id = ?', rayonId)
  }
  if (scope !== null) where.add('f.rayon_id = ?', scope)

  if (query.family_id !== undefined) {
    const familyId = positiveInt(query.family_id)
    if (familyId === null) details.family_id = ['Kartu Keluarga tidak valid.']
    else where.add('m.family_id = ?', familyId)
  }

  for (const [key, options] of CHOICE_FILTERS) {
    if (query[key] === undefined) continue
    const values = [
      ...new Set(
        query[key]
          .split(',')
          .map((value) => value.trim().toUpperCase())
          .filter(Boolean),
      ),
    ]
    const unknown = values.filter((value) => !(options as readonly string[]).includes(value))
    if (values.length === 0 || unknown.length > 0) {
      const prefix = unknown.length > 0 ? `Nilai tidak dikenal: ${unknown.join(', ')}. ` : ''
      details[key] = [`${prefix}Pilihan: ${options.join(', ')}.`]
    } else where.addIn(`m.${key}`, values)
  }

  for (const key of ['baptism_status', 'sidi_status'] as const) {
    if (query[key] === undefined) continue
    const value = SACRAMENT_QUERY.get(query[key].trim().toLowerCase())
    if (value === undefined) details[key] = ['Isi true (sudah) atau false (belum).']
    else where.add(`m.${key} = ?`, value)
  }

  if (query.q !== undefined) {
    const words = searchWords(query.q)
    if (words === null) details.q = ['Kata pencarian maksimal 100 karakter.']
    for (const word of words ?? []) {
      where.add(
        `(m.full_name LIKE ? ESCAPE '\\' OR m.nik LIKE ? ESCAPE '\\'
          OR m.church_member_number LIKE ? ESCAPE '\\' OR f.kk_number LIKE ? ESCAPE '\\')`,
        containsPattern(word),
      )
    }
  }

  return { where, details, outsideScope }
}
