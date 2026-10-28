import { CODE_ALPHABET, SACRAMENT_PREFIX, type StatusFields } from '../../shared/sacraments'
import {
  SACRAMENT_TYPE_LABELS,
  type SacramentDetail,
  type SacramentDocument,
  type SacramentListItem,
  type SacramentType,
} from '../../shared/types'

// Bagian bersama rute pendaftaran sakramen: kolom SQL, konversi baris D1, kode
// pendaftaran, nomor register buku induk, dan bentuk data di Log Aktivitas.

const ISO = (column: string) => `strftime('%Y-%m-%dT%H:%M:%SZ', ${column})`

export const APPLICATION_SELECT = (detail = false) => `
  SELECT a.id, a.registration_code, a.type, a.applicant_name, a.phone, a.status,
         a.counseling_date, a.counseling_time, a.scheduled_date, a.scheduled_time,
         a.officiating_pastor, a.certificate_number,
         a.member_id, m.full_name AS member_name,
         a.partner_member_id, p.full_name AS partner_name,
         json_array_length(a.documents_json) AS document_count,
         ${detail ? 'a.form_data_json, a.documents_json, a.notes,' : ''}
         ${ISO('a.created_at')} AS created_at, ${ISO('a.updated_at')} AS updated_at
  FROM sacrament_applications a
  LEFT JOIN members m ON m.id = a.member_id
  LEFT JOIN members p ON p.id = a.partner_member_id`

type DetailRow = SacramentListItem & {
  form_data_json: string
  documents_json: string
  notes: string | null
}

export function toDetail(row: DetailRow): SacramentDetail {
  const { form_data_json, documents_json, ...rest } = row
  return {
    ...rest,
    form_data: JSON.parse(form_data_json) as SacramentDetail['form_data'],
    documents: JSON.parse(documents_json) as SacramentDocument[],
  }
}

export async function findApplication(db: D1Database, id: number) {
  const row = await db
    .prepare(`${APPLICATION_SELECT(true)} WHERE a.id = ?1`)
    .bind(id)
    .first<DetailRow>()
  return row ? toDetail(row) : null
}

// Kode lacak acak, mis. "BPT-K7QX-29MD": 32^8 kemungkinan per layanan, sehingga tidak
// bisa ditebak. 256 habis dibagi 32, jadi setiap huruf sama peluangnya.
export function newRegistrationCode(type: SacramentType): string {
  const chars = [...crypto.getRandomValues(new Uint8Array(8))].map(
    (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length],
  )
  return `${SACRAMENT_PREFIX[type]}-${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`
}

// Nomor register buku induk berikutnya untuk layanan dan tahun pelaksanaan itu, mis.
// "BPT-2026-007". Nomor yang diisi manual dengan format lain tidak dihitung.
export async function nextCertificateNumber(db: D1Database, type: SacramentType, year: string) {
  const prefix = `${SACRAMENT_PREFIX[type]}-${year}-`
  const { results } = await db
    .prepare(
      `SELECT certificate_number FROM sacrament_applications
       WHERE type = ?1 AND certificate_number LIKE ?2`,
    )
    .bind(type, `${prefix}%`)
    .all<{ certificate_number: string }>()
  const last = results.reduce((max, row) => {
    const n = Number(row.certificate_number.slice(prefix.length))
    return Number.isInteger(n) && n > max ? n : max
  }, 0)
  return `${prefix}${String(last + 1).padStart(3, '0')}`
}

export function applicationLabel(item: {
  type: SacramentType
  applicant_name: string
  registration_code: string
}) {
  return `${SACRAMENT_TYPE_LABELS[item.type]} ${item.applicant_name} (${item.registration_code})`
}

// SacramentDetail → kolom verifikasi.
export function statusFields(item: SacramentDetail): StatusFields {
  return {
    status: item.status,
    notes: item.notes,
    counseling_date: item.counseling_date,
    counseling_time: item.counseling_time,
    scheduled_date: item.scheduled_date,
    scheduled_time: item.scheduled_time,
    officiating_pastor: item.officiating_pastor,
    certificate_number: item.certificate_number,
    member_id: item.member_id,
    partner_member_id: item.partner_member_id,
  }
}

// Anggota jemaat dicatat dengan namanya agar Log Aktivitas tetap terbaca.
export function statusAuditView(
  fields: StatusFields,
  names: { member: string | null; partner: string | null },
) {
  const { member_id: _member, partner_member_id: _partner, ...rest } = fields
  return { ...rest, member: names.member, partner: names.partner }
}
