// Pencatatan Log Aktivitas (tabel audit_logs): siapa melakukan apa pada entitas apa.

export type AuditEntry = {
  userId: number | null
  action: string
  entityType: string
  entityId?: number | null
  details?: Record<string, unknown>
}

export async function logAudit(db: D1Database, entry: AuditEntry) {
  await db
    .prepare(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details_json)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(
      entry.userId,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      entry.details ? JSON.stringify(entry.details) : null,
    )
    .run()
}
