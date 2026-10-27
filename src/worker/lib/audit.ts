import type { Context } from 'hono'
import type { AuditDetails, AuditFieldChange, SessionUser } from '../../shared/types'
import type { AppEnv } from '../types'

// Pencatatan Log Aktivitas (tabel audit_logs): siapa melakukan apa pada entitas apa,
// dan kapan. Pelaku (pengguna yang sedang masuk) dan alamat IP diisi otomatis;
// untuk UPDATE cukup kirim data sebelum dan sesudah, kolom yang berubah dihitung
// sendiri, dan nilai kolom rahasia seperti password_hash tidak pernah tercatat.
//
// Jalankan auditStatement() di dalam db.batch() bersama perubahan datanya. Batch D1
// adalah satu transaksi, sehingga tidak mungkin ada perubahan tanpa log atau log
// tanpa perubahan:
//
//   await c.env.DB.batch([
//     c.env.DB.prepare('UPDATE members SET ... WHERE id = ?1').bind(...),
//     auditStatement(c, { action: 'UPDATE', entityType: 'members', entityId: id,
//                         label: member.full_name, before, after }),
//   ])
//
// Untuk INSERT, pakai entityId: LAST_INSERT_ID tepat setelah statement INSERT-nya.

// Mengambil id baris yang baru saja dibuat oleh statement sebelumnya dalam batch.
export const LAST_INSERT_ID = Symbol('last_insert_rowid')

export const REDACTED = '[disembunyikan]'
const SENSITIVE_FIELDS = new Set(['password', 'password_hash', 'token', 'token_hash'])
// Kolom yang berubah di setiap penyimpanan dan tidak bermakna di log.
const IGNORED_FIELDS = new Set(['id', 'created_at', 'updated_at'])

type Row = Record<string, unknown>

export type AuditEntry = {
  // CREATE, UPDATE, DELETE, IMPORT, LOGIN, ... (huruf besar)
  action: string
  // Nama tabel entitas, mis. members, finance_transactions.
  entityType: string
  entityId?: number | typeof LAST_INSERT_ID | null
  // Nama entitas yang mudah dibaca, mis. nama jemaat atau nomor kuitansi.
  label?: string
  // UPDATE: kirim keduanya. CREATE: cukup `after`. DELETE: cukup `before`.
  before?: Row | null
  after?: Row | null
  // Keterangan tambahan, mis. { identifier } pada LOGIN_FAILED atau { rows } pada IMPORT.
  details?: Row
  // Bawaan: pengguna yang sedang masuk (c.var.user). Isi sendiri untuk aksi sebelum
  // login selesai, mis. percobaan login.
  userId?: number | null
}

export function auditStatement(c: Context<AppEnv>, entry: AuditEntry): D1PreparedStatement {
  const actor = c.get('user') as SessionUser | undefined
  const userId = entry.userId !== undefined ? entry.userId : (actor?.id ?? null)

  const details: AuditDetails = {}
  if (entry.label) details.label = entry.label
  if (entry.before && entry.after) details.changes = diffChanges(entry.before, entry.after)
  else if (entry.after) details.data = redact(entry.after)
  else if (entry.before) details.data = redact(entry.before)
  Object.assign(details, entry.details, { ip: c.req.header('CF-Connecting-IP') ?? null })

  const fromLastInsert = entry.entityId === LAST_INSERT_ID
  const values: unknown[] = [userId, entry.action, entry.entityType, JSON.stringify(details)]
  if (!fromLastInsert) values.push(entry.entityId ?? null)

  return c.env.DB.prepare(
    `INSERT INTO audit_logs (user_id, action, entity_type, details_json, entity_id)
     VALUES (?1, ?2, ?3, ?4, ${fromLastInsert ? 'last_insert_rowid()' : '?5'})`,
  ).bind(...values)
}

// Untuk aksi yang tidak mengubah data lain, mis. LOGIN atau LOGOUT.
export async function recordAudit(c: Context<AppEnv>, entry: AuditEntry) {
  await auditStatement(c, entry).run()
}

// Kolom yang nilainya berbeda antara `before` dan `after`. Dipakai juga oleh rute
// untuk mengetahui apakah sebuah PATCH benar-benar mengubah sesuatu.
export function diffChanges(before: Row, after: Row): Record<string, AuditFieldChange> {
  const changes: Record<string, AuditFieldChange> = {}
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (IGNORED_FIELDS.has(key)) continue
    const from = before[key] ?? null
    const to = after[key] ?? null
    if (JSON.stringify(from) === JSON.stringify(to)) continue
    changes[key] = SENSITIVE_FIELDS.has(key) ? { from: REDACTED, to: REDACTED } : { from, to }
  }
  return changes
}

function redact(row: Row): Row {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => !IGNORED_FIELDS.has(key))
      .map(([key, value]) => [key, SENSITIVE_FIELDS.has(key) ? REDACTED : value]),
  )
}
