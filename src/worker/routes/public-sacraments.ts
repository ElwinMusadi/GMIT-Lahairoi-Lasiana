import { Hono } from 'hono'
import { witaToday } from '../../shared/dates'
import {
  SACRAMENT_FORMS,
  documentProblems,
  maskName,
  normalizeCode,
  parseApplicationInput,
} from '../../shared/sacraments'
import type {
  ApiErrorBody,
  PublicSacramentStatus,
  SacramentApplyResponse,
  SacramentDocument,
  SacramentStatus,
  SacramentType,
} from '../../shared/types'
import { UPLOAD_MAX_BYTES, type UploadContentType } from '../../shared/uploads'
import { LAST_INSERT_ID, auditStatement } from '../lib/audit'
import { invalid } from '../lib/request'
import { applicationLabel, newRegistrationCode } from '../lib/sacraments'
import { detectContentType, storeUpload } from '../lib/uploads'
import type { AppEnv } from '../types'

// Pendaftaran sakramen online dari Portal Publik, tanpa login (PRD: Baptis, Sidi, Nikah
// dengan kode lacak).
//
// POST /apply: multipart/form-data berisi `type` (BAPTISM, SIDI, MARRIAGE), isian
// formulir (src/shared/sacraments.ts), dan berkas syarat dengan nama field sesuai jenis
// dokumennya, mis. `birth_certificate`. Berkas disimpan di folder R2 `sakramen` yang
// hanya bisa dibuka pengurus. Respons berisi kode pendaftaran unik.
//
// GET /track/:code: status terkini, catatan verifikasi, serta jadwal konseling dan
// pelaksanaan. Nama pendaftar disamarkan; data pribadi lain tidak dikirim.
const publicSacraments = new Hono<AppEnv>()

const CODE_ATTEMPTS = 3

publicSacraments.post('/apply', async (c) => {
  const form = await c.req.formData().catch(() => null)
  if (!form) {
    return c.json<ApiErrorBody>(
      { error: 'Kirim formulir pendaftaran sebagai multipart/form-data.' },
      400,
    )
  }
  const fields: Record<string, string> = {}
  const files = new Map<string, File>()
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') fields[key] = value
    else if (value.size > 0) files.set(key, value)
  }

  // Isian dan dokumen diperiksa bersama agar semua kesalahan tampil sekaligus.
  const { type, input, details } = parseApplicationInput(fields, witaToday())
  if (!type) return invalid(c, 'Formulir pendaftaran belum lengkap.', details)

  Object.assign(details, documentProblems(type, [...files.keys()]))
  const accepted = new Map<string, UploadContentType>()
  // Berkas di luar daftar dokumen layanan ini sudah ditolak, jadi jumlahnya terbatas.
  for (const [kind, file] of files) {
    if (details[kind]) continue
    if (file.size > UPLOAD_MAX_BYTES) {
      details[kind] = ['Ukuran berkas maksimal 10 MB.']
      continue
    }
    const contentType = await detectContentType(file)
    if (contentType) accepted.set(kind, contentType)
    else details[kind] = ['Gunakan berkas PDF, JPG, PNG, atau WebP.']
  }

  const db = c.env.DB
  const rayonId = input?.form_data.rayon_id
  if (input && typeof rayonId === 'number') {
    const rayon = await db
      .prepare('SELECT name FROM rayons WHERE id = ?1')
      .bind(rayonId)
      .first<{ name: string }>()
    if (rayon) input.form_data.rayon_name = rayon.name
    else details.rayon_id = ['Rayon tidak ditemukan.']
  }
  if (!input || Object.keys(details).length > 0) {
    return invalid(c, 'Formulir pendaftaran belum lengkap.', details)
  }

  // Berkas disimpan dulu; bila pendaftaran gagal disimpan, berkasnya dihapus lagi.
  const documents: SacramentDocument[] = []
  for (const document of SACRAMENT_FORMS[input.type].documents) {
    const file = files.get(document.kind)
    const contentType = accepted.get(document.kind)
    if (!file || !contentType) continue
    const stored = await storeUpload(c.env.FILES, 'sakramen', file, contentType)
    documents.push({
      kind: document.kind,
      label: document.label,
      url: stored.url,
      name: stored.name,
      size: stored.size,
      content_type: stored.contentType,
    })
  }

  try {
    for (let attempt = 1; ; attempt++) {
      const code = newRegistrationCode(input.type)
      try {
        const [insert] = await db.batch([
          db
            .prepare(
              `INSERT INTO sacrament_applications (registration_code, type, applicant_name,
                 phone, form_data_json, documents_json)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6)
               RETURNING strftime('%Y-%m-%dT%H:%M:%SZ', created_at) AS created_at`,
            )
            .bind(
              code,
              input.type,
              input.applicant_name,
              input.phone,
              JSON.stringify(input.form_data),
              JSON.stringify(documents),
            ),
          auditStatement(c, {
            action: 'CREATE',
            entityType: 'sacrament_applications',
            entityId: LAST_INSERT_ID,
            label: applicationLabel({ ...input, registration_code: code }),
            // Jenis layanan sudah ada di label.
            after: {
              applicant_name: input.applicant_name,
              registration_code: code,
              documents: documents.length,
            },
            details: { source: 'portal' },
          }),
        ])
        return c.json<SacramentApplyResponse>(
          {
            registration_code: code,
            type: input.type,
            status: 'PENDING',
            submitted_at: (insert.results[0] as { created_at: string }).created_at,
          },
          201,
        )
      } catch (err) {
        // Kode kembar sangat jarang; coba kode lain.
        const duplicate = err instanceof Error && err.message.includes('UNIQUE constraint failed')
        if (!duplicate || attempt >= CODE_ATTEMPTS) throw err
      }
    }
  } catch (err) {
    if (documents.length > 0) {
      await c.env.FILES.delete(documents.map((document) => document.url.replace('/api/files/', '')))
    }
    throw err
  }
})

type TrackRow = {
  registration_code: string
  type: SacramentType
  applicant_name: string
  status: SacramentStatus
  notes: string | null
  counseling_date: string | null
  counseling_time: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  officiating_pastor: string | null
  documents_json: string
  submitted_at: string
  updated_at: string
}

publicSacraments.get('/track/:code', async (c) => {
  // Status pribadi pendaftar: jangan disimpan di cache peramban atau proxy.
  c.header('Cache-Control', 'no-store')
  const code = normalizeCode(c.req.param('code'))
  if (!code) {
    return c.json<ApiErrorBody>(
      { error: 'Format kode pendaftaran tidak dikenal. Contoh: BPT-K7QX-29MD.' },
      400,
    )
  }
  const row = await c.env.DB.prepare(
    `SELECT registration_code, type, applicant_name, status, notes, counseling_date,
            counseling_time, scheduled_date, scheduled_time, officiating_pastor,
            documents_json,
            strftime('%Y-%m-%dT%H:%M:%SZ', created_at) AS submitted_at,
            strftime('%Y-%m-%dT%H:%M:%SZ', updated_at) AS updated_at
     FROM sacrament_applications WHERE registration_code = ?1`,
  )
    .bind(code)
    .first<TrackRow>()
  if (!row) {
    return c.json<ApiErrorBody>(
      { error: 'Kode pendaftaran tidak ditemukan. Periksa kembali kode Anda.' },
      404,
    )
  }
  const { documents_json, applicant_name, ...rest } = row
  const documents = JSON.parse(documents_json) as SacramentDocument[]
  return c.json<PublicSacramentStatus>({
    ...rest,
    applicant_name: maskName(applicant_name),
    documents: documents.map(({ kind, label }) => ({ kind, label })),
  })
})

export default publicSacraments
