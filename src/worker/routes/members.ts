import { Hono, type Context } from 'hono'
import type { FieldErrors } from '../../shared/accounts'
import {
  NEW_MEMBER,
  parseMemberInput,
  validateMember,
  type MemberFields,
} from '../../shared/congregation'
import type { ApiErrorBody, ApiPage, MemberResponse, MemberWithFamily } from '../../shared/types'
import { LAST_INSERT_ID, auditStatement, diffChanges } from '../lib/audit'
import {
  MEMBER_FIELD_KEYS,
  MEMBER_WITH_FAMILY_SELECT,
  familyAuditView,
  familyLabel,
  findMember,
  inScope,
  memberAuditView,
  memberValues,
  outsideRayon,
  pickMemberFields,
  rayonScope,
  toMember,
  type StoredMember,
} from '../lib/congregation'
import { memberFilter } from '../lib/member-filter'
import { invalid, positiveInt, readJsonObject, readPaging, runBatch } from '../lib/request'
import { requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'
import { exportMembers, importMembers } from './member-transfer'

// Anggota Jemaat (PRD, Database Jemaat & KK). Admin, Pendeta, dan Majelis dapat
// melihat; Admin dan Majelis menambah dan mengubah; menghapus khusus Admin (jemaat
// yang pindah atau meninggal cukup diubah statusnya). Majelis hanya mencakup jemaat
// di rayonnya sendiri.
//
// GET / menerima filter di lib/member-filter.ts ditambah page dan per_page (maks. 100).
// Impor dan ekspor ada di routes/member-transfer.ts.
const members = new Hono<AppEnv>()

members.use(requireRole('ADMIN', 'PASTOR', 'ELDER'))

// Didaftarkan sebelum /:id agar "export" dan "import" tidak dibaca sebagai id.
members.get('/export', exportMembers)
members.post('/import', requireRole('ADMIN'), importMembers)

type Ctx = Context<AppEnv>
type TargetFamily = {
  id: number
  kk_number: string | null
  family_head_name: string
  rayon_id: number
  rayon_name: string
  address: string | null
  phone: string | null
}

const CONFLICT =
  'Data ini bentrok dengan data jemaat yang baru saja disimpan pengurus lain. Muat ulang lalu coba lagi.'

members.get('/', async (c) => {
  const query = c.req.query()
  const { where, details, outsideScope } = memberFilter(query, rayonScope(c.get('user')))
  if (outsideScope) return outsideRayon(c)
  const { page, perPage } = readPaging(query, details)

  if (Object.keys(details).length > 0) return invalid(c, 'Filter data jemaat tidak valid.', details)

  const db = c.env.DB
  const count = where.params.length
  const [total, list] = await db.batch([
    db
      .prepare(
        `SELECT COUNT(*) AS total FROM members m
         JOIN families f ON f.id = m.family_id ${where.sql}`,
      )
      .bind(...where.params),
    db
      .prepare(
        `${MEMBER_WITH_FAMILY_SELECT} ${where.sql}
         ORDER BY m.full_name COLLATE NOCASE, m.id
         LIMIT ?${count + 1} OFFSET ?${count + 2}`,
      )
      .bind(...where.params, perPage, (page - 1) * perPage),
  ])

  return c.json<ApiPage<MemberWithFamily>>({
    data: (list.results as StoredMember<MemberWithFamily>[]).map(toMember),
    meta: { page, per_page: perPage, total: (total.results[0] as { total: number }).total },
  })
})

members.get('/:id', async (c) => {
  const id = positiveInt(c.req.param('id'))
  const member = id ? await findMember(c.env.DB, id) : null
  if (!member) return c.json<ApiErrorBody>({ error: 'Data jemaat tidak ditemukan.' }, 404)
  if (!inScope(rayonScope(c.get('user')), member.rayon_id)) {
    return outsideRayon(c, 'Jemaat ini')
  }
  return c.json<MemberResponse>({ member })
})

members.post('/', requireRole('ADMIN', 'ELDER'), async (c) => {
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data jemaat tidak valid.' }, 400)

  const { input, details } = parseMemberInput(body, 'create')
  const next = { ...NEW_MEMBER, ...input } as MemberFields
  validateMember(next, details)
  if (Object.keys(details).length > 0) return invalid(c, 'Data jemaat belum benar.', details)

  const checked = await checkAgainstDatabase(c, next, null)
  if (checked instanceof Response) return checked

  const db = c.env.DB
  const family = checked.family
  const result = await runBatch(
    c,
    [
      db
        .prepare(
          `INSERT INTO members (${MEMBER_FIELD_KEYS.join(', ')})
           VALUES (${MEMBER_FIELD_KEYS.map((_, i) => `?${i + 1}`).join(', ')}) RETURNING id`,
        )
        .bind(...memberValues(next)),
      auditStatement(c, {
        action: 'CREATE',
        entityType: 'members',
        entityId: LAST_INSERT_ID,
        label: next.full_name,
        after: memberAuditView(next, familyLabel(family.kk_number, family.family_head_name)),
      }),
      ...syncFamilyHead(c, family, next),
    ],
    CONFLICT,
  )
  if (result instanceof Response) return result

  const id = (result[0].results[0] as { id: number }).id
  return c.json<MemberResponse>({ member: await mustFind(c, id) }, 201)
})

// PRD menyebut PUT; PATCH diterima dengan arti yang sama. Field yang tidak dikirim
// tidak diubah. Mengganti family_id memindahkan jemaat ke KK lain.
members.on(['PUT', 'PATCH'], '/:id', requireRole('ADMIN', 'ELDER'), async (c) => {
  const id = positiveInt(c.req.param('id'))
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data jemaat tidak valid.' }, 400)

  const { input, details } = parseMemberInput(body, 'update')
  if (Object.keys(details).length > 0) return invalid(c, 'Data jemaat belum benar.', details)
  if (Object.keys(input).length === 0) {
    return c.json<ApiErrorBody>({ error: 'Tidak ada data yang diubah.' }, 400)
  }

  const current = id ? await findMember(c.env.DB, id) : null
  if (!id || !current) return c.json<ApiErrorBody>({ error: 'Data jemaat tidak ditemukan.' }, 404)
  if (!inScope(rayonScope(c.get('user')), current.rayon_id)) {
    return outsideRayon(c, 'Jemaat ini')
  }

  const stored = pickMemberFields(current)
  const next: MemberFields = { ...stored, ...input }
  validateMember(next, details)
  if (Object.keys(details).length > 0) return invalid(c, 'Data jemaat belum benar.', details)

  const checked = await checkAgainstDatabase(c, next, id)
  if (checked instanceof Response) return checked

  const family = checked.family
  const before = memberAuditView(stored, familyLabel(current.kk_number, current.family_head_name))
  const after = memberAuditView(next, familyLabel(family.kk_number, family.family_head_name))
  const headSync = syncFamilyHead(c, family, next)
  if (Object.keys(diffChanges(before, after)).length === 0 && headSync.length === 0) {
    return c.json<MemberResponse>({ member: current })
  }

  const db = c.env.DB
  const result = await runBatch(
    c,
    [
      db
        .prepare(
          `UPDATE members
           SET ${MEMBER_FIELD_KEYS.map((key, i) => `${key} = ?${i + 2}`).join(', ')},
               updated_at = datetime('now')
           WHERE id = ?1`,
        )
        .bind(id, ...memberValues(next)),
      auditStatement(c, {
        action: 'UPDATE',
        entityType: 'members',
        entityId: id,
        label: next.full_name,
        before,
        after,
      }),
      ...headSync,
    ],
    CONFLICT,
  )
  if (result instanceof Response) return result

  return c.json<MemberResponse>({ member: await mustFind(c, id) })
})

members.delete('/:id', requireRole('ADMIN'), async (c) => {
  const id = positiveInt(c.req.param('id'))
  const current = id ? await findMember(c.env.DB, id) : null
  if (!id || !current) return c.json<ApiErrorBody>({ error: 'Data jemaat tidak ditemukan.' }, 404)

  const db = c.env.DB
  await db.batch([
    db.prepare('DELETE FROM members WHERE id = ?1').bind(id),
    auditStatement(c, {
      action: 'DELETE',
      entityType: 'members',
      entityId: id,
      label: current.full_name,
      before: memberAuditView(
        pickMemberFields(current),
        familyLabel(current.kk_number, current.family_head_name),
      ),
    }),
  ])
  return c.body(null, 204)
})

// KK tujuan harus ada dan dalam cakupan Majelis, NIK dan Nomor Induk belum dipakai
// jemaat lain, dan satu KK hanya punya satu Kepala Keluarga aktif. Mengembalikan
// KK tujuan, atau respons error.
async function checkAgainstDatabase(c: Ctx, next: MemberFields, excludeId: number | null) {
  const db = c.env.DB
  const [family, taken, head] = await db.batch([
    db
      .prepare(
        `SELECT f.id, f.kk_number, f.family_head_name, f.rayon_id, r.name AS rayon_name,
                f.address, f.phone
         FROM families f JOIN rayons r ON r.id = f.rayon_id WHERE f.id = ?1`,
      )
      .bind(next.family_id),
    db
      .prepare(
        `SELECT m.full_name, m.nik, m.church_member_number, f.rayon_id
         FROM members m JOIN families f ON f.id = m.family_id
         WHERE m.id IS NOT ?3
           AND ((?1 IS NOT NULL AND m.nik = ?1) OR (?2 IS NOT NULL AND m.church_member_number = ?2))`,
      )
      .bind(next.nik, next.church_member_number, excludeId),
    db
      .prepare(
        `SELECT full_name FROM members
         WHERE family_id = ?1 AND family_relation = 'HEAD' AND status = 'ACTIVE'
           AND id IS NOT ?2`,
      )
      .bind(next.family_id, excludeId),
  ])

  const target = family.results[0] as TargetFamily | undefined
  if (!target) {
    return invalid(c, 'Data jemaat belum benar.', {
      family_id: ['Kartu Keluarga tidak ditemukan.'],
    })
  }
  const scope = rayonScope(c.get('user'))
  if (!inScope(scope, target.rayon_id)) return outsideRayon(c, 'Kartu Keluarga tujuan')

  const details: FieldErrors = {}
  for (const row of taken.results as {
    full_name: string
    nik: string | null
    church_member_number: string | null
    rayon_id: number
  }[]) {
    // Nama pemilik hanya disebut bila berada dalam cakupan pengurus.
    const owner = inScope(scope, row.rayon_id) ? `atas nama ${row.full_name}` : 'di rayon lain'
    if (next.nik && row.nik === next.nik) {
      details.nik = [`NIK ini sudah terdaftar ${owner}.`]
    }
    if (next.church_member_number && row.church_member_number === next.church_member_number) {
      details.church_member_number = [`Nomor Induk ini sudah terdaftar ${owner}.`]
    }
  }
  const currentHead = (head.results[0] as { full_name: string } | undefined)?.full_name
  if (currentHead && next.family_relation === 'HEAD' && next.status === 'ACTIVE') {
    details.family_relation = [`KK ini sudah memiliki Kepala Keluarga aktif: ${currentHead}.`]
  }
  if (Object.keys(details).length > 0) {
    return c.json<ApiErrorBody>({ error: 'Data jemaat bentrok dengan data lain.', details }, 409)
  }

  return { family: target }
}

// Nama kepala keluarga di KK mengikuti anggota yang menjadi Kepala Keluarga aktif,
// sehingga keduanya tidak pernah berbeda. Perubahan KK ini ikut dicatat.
function syncFamilyHead(c: Ctx, family: TargetFamily, next: MemberFields) {
  if (next.family_relation !== 'HEAD' || next.status !== 'ACTIVE') return []
  if (family.family_head_name === next.full_name) return []

  const before = familyAuditView(family, family.rayon_name)
  const db = c.env.DB
  return [
    db
      .prepare(
        `UPDATE families SET family_head_name = ?2, updated_at = datetime('now') WHERE id = ?1`,
      )
      .bind(family.id, next.full_name),
    auditStatement(c, {
      action: 'UPDATE',
      entityType: 'families',
      entityId: family.id,
      label: familyLabel(family.kk_number, next.full_name),
      before,
      after: { ...before, family_head_name: next.full_name },
    }),
  ]
}

async function mustFind(c: Ctx, id: number) {
  const member = await findMember(c.env.DB, id)
  if (!member) throw new Error(`Jemaat ${id} tidak ditemukan setelah disimpan`)
  return member
}

export default members
