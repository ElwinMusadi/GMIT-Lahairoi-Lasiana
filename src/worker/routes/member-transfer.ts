import type { Context } from 'hono'
import type { FieldErrors } from '../../shared/accounts'
import {
  NEW_MEMBER,
  parseFamilyInput,
  parseMemberInput,
  validateMember,
  type MemberFields,
} from '../../shared/congregation'
import { witaToday } from '../../shared/dates'
import {
  IMPORT_COLUMNS,
  IMPORT_MAX_ROWS,
  cellText,
  exportRow,
  normalizeImportRow,
  rayonKey,
  type ExportMember,
  type ImportValues,
} from '../../shared/member-import'
import { CSV_MIME, XLSX_MIME, toCsv, writeXlsx } from '../../shared/spreadsheet'
import type {
  ApiErrorBody,
  ImportRowStatus,
  MemberImportResult,
  MemberImportRow,
} from '../../shared/types'
import { auditStatement, recordAudit } from '../lib/audit'
import {
  FAMILY_MEMBER_ORDER,
  MEMBER_COLUMNS,
  MEMBER_FIELD_KEYS,
  memberValues,
  outsideRayon,
  rayonScope,
  toMember,
  type StoredMember,
} from '../lib/congregation'
import { memberFilter } from '../lib/member-filter'
import { invalid, readJsonObject, runBatch } from '../lib/request'
import type { AppEnv } from '../types'

// Impor & ekspor data jemaat (PRD: migrasi data Excel lama dan ekspor hasil filter).
//
// POST /api/members/import (khusus Admin)
//   Berkas CSV/Excel dibaca di browser; API menerima barisnya sebagai JSON
//   (MemberImportRequest). Setiap baris diperiksa dengan aturan yang sama dengan form:
//   - Rayon dicocokkan tanpa membedakan huruf besar/kecil dan ejaan h (rayonKey).
//   - Baris dikelompokkan per Nomor KK (atau nama kepala keluarga + rayon bila nomor
//     kosong); KK yang sudah terdaftar dipakai, KK yang belum ada dibuat.
//   - Nomor Induk, NIK, atau nama + tanggal lahir yang sudah terdaftar (di database
//     maupun di baris sebelumnya) dilewati, sehingga impor ulang tidak membuat data ganda.
//   dry_run: true mengembalikan pratinjau tanpa menyimpan. dry_run: false memeriksa
//   ulang lalu menyimpan semua baris yang siap dalam satu transaksi, dengan satu catatan
//   IMPORT di Log Aktivitas.
//
// GET /api/members/export?format=xlsx|csv (Admin, Pendeta, Majelis)
//   Filter sama dengan GET /api/members (lib/member-filter.ts); Majelis hanya rayonnya.
//   Kolomnya sama dengan template impor, sehingga hasil ekspor bisa diimpor ulang.

type Ctx = Context<AppEnv>

const MAX_VALUE_LENGTH = 500
const EXPORT_MAX_ROWS = 10_000
// Baris per statement INSERT; data dikirim sebagai satu parameter JSON (json_each), jauh
// di bawah batas ukuran parameter D1.
const INSERT_CHUNK = 500

const CONFLICT =
  'Data berubah saat menyimpan, mis. pengurus lain baru menambah data yang sama. Periksa pratinjau lagi lalu simpan ulang.'

type ImportRequestRow = { row: number; values: ImportValues }

type FamilyPlan = {
  // null untuk KK baru sampai id-nya dialokasikan saat menyimpan.
  id: number | null
  isNew: boolean
  kk_number: string | null
  head_name: string
  rayon_id: number
  rayon_name: string
  address: string | null
  phone: string | null
  firstRow: number
  // Kepala Keluarga aktif, dari database atau dari baris berkas sebelumnya.
  activeHead: string | null
  // KK lama yang nama kepalanya berubah karena berkas berisi Kepala Keluarga aktifnya.
  headChanged: boolean
  // Nama anggota (huruf kecil) yang sudah ada di KK ini → baris berkasnya (0 = database).
  memberNames: Map<string, number>
  savedRows: number
}

type ExistingFamily = {
  id: number
  kk_number: string | null
  family_head_name: string
  rayon_id: number
  rayon_name: string
  active_head: string | null
  // JSON array nama anggota KK ini dalam huruf kecil.
  member_names: string
}

// ---------- Impor ----------

export async function importMembers(c: Ctx) {
  const body = await readJsonObject(c)
  const request = body ? readImportRequest(body) : { error: 'Data impor tidak valid.' }
  if ('error' in request) return c.json<ApiErrorBody>({ error: request.error }, 400)

  const db = c.env.DB
  const plan = await planImport(db, request.rows, witaToday())
  if (request.dryRun) return c.json<MemberImportResult>({ saved: false, ...plan.result })

  const { summary } = plan.result
  if (summary.new_members === 0) {
    return c.json<ApiErrorBody>({ error: 'Tidak ada baris yang siap disimpan.' }, 400)
  }

  // Id KK baru dialokasikan di sini agar anggota bisa dirujuk dalam transaksi yang sama.
  // Bila pengurus lain menambah KK di antaranya, id bentrok dan seluruh impor dibatalkan.
  const created = plan.families.filter((family) => family.isNew && family.savedRows > 0)
  const base = await nextFamilyId(db)
  created.forEach((family, index) => (family.id = base + index))

  const statements: D1PreparedStatement[] = []
  if (created.length > 0) {
    statements.push(
      db
        .prepare(
          `INSERT INTO families (id, kk_number, family_head_name, rayon_id, address, phone)
           SELECT ${jsonColumns(6)} FROM json_each(?1)`,
        )
        .bind(
          JSON.stringify(
            created.map((f) => [f.id, f.kk_number, f.head_name, f.rayon_id, f.address, f.phone]),
          ),
        ),
    )
  }
  const renamed = plan.families.filter((family) => family.headChanged && family.savedRows > 0)
  if (renamed.length > 0) {
    // Nama kepala KK lama mengikuti Kepala Keluarga aktif yang baru diimpor.
    statements.push(
      db
        .prepare(
          `UPDATE families
           SET family_head_name = (SELECT json_extract(value, '$[1]') FROM json_each(?1)
                                   WHERE json_extract(value, '$[0]') = families.id),
               updated_at = datetime('now')
           WHERE id IN (SELECT json_extract(value, '$[0]') FROM json_each(?1))`,
        )
        .bind(JSON.stringify(renamed.map((f) => [f.id, f.head_name]))),
    )
  }
  const values = plan.members.map(({ fields, family }) =>
    memberValues({ ...fields, family_id: family.id ?? 0 }),
  )
  for (let i = 0; i < values.length; i += INSERT_CHUNK) {
    statements.push(
      db
        .prepare(
          `INSERT INTO members (${MEMBER_FIELD_KEYS.join(', ')})
           SELECT ${jsonColumns(MEMBER_FIELD_KEYS.length)} FROM json_each(?1)`,
        )
        .bind(JSON.stringify(values.slice(i, i + INSERT_CHUNK))),
    )
  }
  statements.push(
    auditStatement(c, {
      action: 'IMPORT',
      entityType: 'members',
      entityId: null,
      label: request.fileName,
      details: {
        rows: summary.rows,
        members_created: summary.new_members,
        families_created: summary.new_families,
        duplicates: summary.duplicates,
        errors: summary.errors,
      },
    }),
  )

  const result = await runBatch(c, statements, CONFLICT)
  if (result instanceof Response) return result
  return c.json<MemberImportResult>({ saved: true, ...plan.result })
}

function readImportRequest(
  body: Record<string, unknown>,
): { fileName: string; dryRun: boolean; rows: ImportRequestRow[] } | { error: string } {
  if (typeof body.dry_run !== 'boolean') {
    return { error: 'Isi dry_run dengan true (pratinjau) atau false (simpan).' }
  }
  if (!Array.isArray(body.rows)) return { error: 'Data baris tidak ditemukan.' }
  if (body.rows.length === 0) return { error: 'Berkas tidak berisi baris data.' }
  if (body.rows.length > IMPORT_MAX_ROWS) {
    return {
      error: `Maksimal ${IMPORT_MAX_ROWS.toLocaleString('id-ID')} baris sekali impor. Bagi berkasnya menjadi beberapa bagian.`,
    }
  }

  const rows: ImportRequestRow[] = []
  for (const item of body.rows as unknown[]) {
    const { row, values } = (item ?? {}) as Record<string, unknown>
    if (typeof row !== 'number' || !Number.isInteger(row) || row < 1) {
      return { error: 'Nomor baris tidak valid.' }
    }
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      return { error: `Baris ${row}: format data tidak valid.` }
    }
    const clean: ImportValues = {}
    for (const column of IMPORT_COLUMNS) {
      const value = (values as Record<string, unknown>)[column.key]
      if (value === undefined || value === null) continue
      if (typeof value !== 'string' && typeof value !== 'number') {
        return { error: `Baris ${row}: isi kolom ${column.header} tidak valid.` }
      }
      const text = String(value)
      if (text.length > MAX_VALUE_LENGTH) {
        return { error: `Baris ${row}: isi kolom ${column.header} terlalu panjang.` }
      }
      clean[column.key] = text
    }
    rows.push({ row, values: clean })
  }

  const fileName = typeof body.file_name === 'string' ? body.file_name.trim().slice(0, 200) : ''
  return { fileName: fileName || 'berkas tanpa nama', dryRun: body.dry_run, rows }
}

async function planImport(db: D1Database, rows: ImportRequestRow[], today: string) {
  const { results: rayons } = await db
    .prepare('SELECT id, name FROM rayons ORDER BY id')
    .all<{ id: number; name: string }>()
  const rayonByKey = new Map(rayons.map((rayon) => [rayonKey(rayon.name), rayon]))
  const rayonChoices = rayons.map((rayon) => rayon.name).join(', ')

  // 1. Setiap baris dinormalkan dan diperiksa tanpa database.
  const prepared = rows.map(({ row, values }) => {
    const normalized = normalizeImportRow(values, today)
    const { input, details } = parseMemberInput(
      { ...normalized.member, family_id: 1 },
      'create',
      today,
    )
    delete details.family_id
    const fields = {
      ...NEW_MEMBER,
      family_id: 0,
      full_name: '',
      gender: 'MALE',
      family_relation: 'CHILD',
      ...input,
    } as MemberFields
    validateMember(fields, details)
    // Pesan normalisasi lebih jelas ("L atau P") daripada pesan parser untuk nilai kosong.
    const errors: FieldErrors = { ...details, ...normalized.errors }

    const rayonText = normalized.family.rayon
    const rayon = rayonText ? (rayonByKey.get(rayonKey(rayonText)) ?? null) : null
    if (rayonText && !rayon) {
      errors.rayon = [`Rayon “${rayonText}” tidak dikenal. Pilihan: ${rayonChoices}.`]
    }

    // Tanpa kolom kepala keluarga, nama anggota berperan Kepala Keluarga dipakai.
    const headText =
      normalized.family.family_head_name ||
      (input.family_relation === 'HEAD' && input.full_name ? input.full_name : '')
    const family = parseFamilyInput(
      {
        kk_number: normalized.family.kk_number,
        family_head_name: headText || 'tanpa nama',
        rayon_id: rayon?.id ?? 1,
        address: normalized.family.address,
        phone: normalized.family.phone,
      },
      'create',
    )
    for (const key of ['kk_number', 'family_head_name', 'address', 'phone'] as const) {
      if (family.details[key]) errors[key] = family.details[key]
    }
    const kk = family.input.kk_number ?? null
    const head = headText ? (family.input.family_head_name ?? headText) : ''
    if (!kk && !head) {
      errors.family_head_name = [
        'Isi Nomor KK atau Nama Kepala Keluarga agar baris ini masuk ke KK yang tepat.',
      ]
    } else if (!kk && !rayon && !errors.rayon) {
      errors.rayon = ['Rayon wajib diisi untuk KK tanpa nomor.']
    }
    const key = kk ? `kk:${kk}` : head && rayon ? `nama:${head.toLowerCase()}|${rayon.id}` : null

    return {
      row,
      fields,
      errors,
      rayon,
      rayonText,
      kk,
      head,
      key,
      address: family.input.address ?? null,
      phone: family.input.phone ?? null,
    }
  })

  // 2. Data yang sudah ada di database, dalam satu batch.
  const unique = (values: (string | null)[]) => JSON.stringify([...new Set(values.filter(Boolean))])
  const familyLookup = `
    SELECT f.id, f.kk_number, f.family_head_name, f.rayon_id, r.name AS rayon_name,
           (SELECT m.full_name FROM members m WHERE m.family_id = f.id
            AND m.family_relation = 'HEAD' AND m.status = 'ACTIVE') AS active_head,
           (SELECT json_group_array(lower(m.full_name)) FROM members m
            WHERE m.family_id = f.id) AS member_names
    FROM families f JOIN rayons r ON r.id = f.rayon_id`
  const [byKk, byHead, byNumber, byNik, byBirth] = await db.batch([
    db
      .prepare(`${familyLookup} WHERE f.kk_number IN (SELECT value FROM json_each(?1))`)
      .bind(unique(prepared.map((p) => p.kk))),
    db
      .prepare(
        `${familyLookup}
         WHERE f.kk_number IS NULL AND lower(f.family_head_name) IN (SELECT value FROM json_each(?1))`,
      )
      .bind(unique(prepared.filter((p) => !p.kk).map((p) => p.head.toLowerCase()))),
    db
      .prepare(
        `SELECT church_member_number AS value, full_name FROM members
         WHERE church_member_number IN (SELECT value FROM json_each(?1))`,
      )
      .bind(unique(prepared.map((p) => p.fields.church_member_number))),
    db
      .prepare(
        `SELECT nik AS value, full_name FROM members WHERE nik IN (SELECT value FROM json_each(?1))`,
      )
      .bind(unique(prepared.map((p) => p.fields.nik))),
    db
      .prepare(
        `SELECT full_name, birth_date AS value FROM members
         WHERE birth_date IN (SELECT value FROM json_each(?1))`,
      )
      .bind(unique(prepared.map((p) => p.fields.birth_date))),
  ])
  const familiesByKk = new Map(
    (byKk.results as ExistingFamily[]).map((family) => [family.kk_number, family]),
  )
  const familiesByHead = byHead.results as ExistingFamily[]
  const owners = (rows: unknown[]) =>
    new Map(
      (rows as { value: string; full_name: string }[]).map((row) => [row.value, row.full_name]),
    )
  const numberOwners = owners(byNumber.results)
  const nikOwners = owners(byNik.results)
  const namesByBirth = new Set(
    (byBirth.results as { value: string; full_name: string }[]).map(
      (row) => `${row.full_name.toLowerCase()}|${row.value}`,
    ),
  )

  // 3. Rencana per baris dan per KK, mengikuti urutan berkas.
  const families = new Map<string, FamilyPlan>()
  const firstNumber = new Map<string, number>()
  const firstNik = new Map<string, number>()
  const firstPerson = new Map<string, number>()
  const planned = prepared.map((p) => {
    const f = p.fields
    let familyError: string | null = null
    const notes: string[] = []

    let family = p.key ? (families.get(p.key) ?? null) : null
    if (p.key && !family) {
      const matches = p.kk
        ? [familiesByKk.get(p.kk)].filter((x) => x !== undefined)
        : familiesByHead.filter(
            (x) =>
              x.family_head_name.toLowerCase() === p.head.toLowerCase() &&
              x.rayon_id === p.rayon?.id,
          )
      if (matches.length > 1) {
        familyError = `Ada ${matches.length} KK tanpa nomor atas nama ${p.head} di Rayon ${p.rayon?.name}. Isi Nomor KK-nya agar jelas.`
      } else if (matches[0]) {
        const existing = matches[0]
        family = {
          id: existing.id,
          isNew: false,
          kk_number: existing.kk_number,
          head_name: existing.family_head_name,
          rayon_id: existing.rayon_id,
          rayon_name: existing.rayon_name,
          address: null,
          phone: null,
          firstRow: p.row,
          activeHead: existing.active_head,
          headChanged: false,
          memberNames: new Map(
            (JSON.parse(existing.member_names) as string[]).map((name) => [name, 0]),
          ),
          savedRows: 0,
        }
      } else if (p.rayon) {
        family = {
          id: null,
          isNew: true,
          kk_number: p.kk,
          head_name: p.head,
          rayon_id: p.rayon.id,
          rayon_name: p.rayon.name,
          address: p.address,
          phone: p.phone,
          firstRow: p.row,
          activeHead: null,
          headChanged: false,
          memberNames: new Map(),
          savedRows: 0,
        }
      } else if (!p.errors.rayon) {
        familyError = `KK ${p.kk} belum terdaftar, jadi Rayon wajib diisi.`
      }
      if (family) families.set(p.key, family)
    }

    if (family) {
      if (p.rayon && p.rayon.id !== family.rayon_id) {
        notes.push(
          family.isNew
            ? `Rayon berbeda dengan baris ${family.firstRow}; KK ini memakai Rayon ${family.rayon_name}.`
            : `KK ini terdaftar di Rayon ${family.rayon_name}; rayon di berkas diabaikan.`,
        )
      }
      if (family.isNew) {
        family.head_name ||= p.head
        family.address ??= p.address
        family.phone ??= p.phone
      }
    }

    // Data ganda: Nomor Induk, NIK, nama yang sama di KK yang sama, atau (tanpa Nomor
    // Induk dan NIK) nama + tanggal lahir yang sama.
    let duplicate: string | null = null
    const number = f.church_member_number
    if (number) {
      const owner = numberOwners.get(number)
      if (owner) duplicate = `Nomor Induk ${number} sudah terdaftar atas nama ${owner}.`
      else if (firstNumber.has(number)) {
        duplicate = `Nomor Induk ${number} sama dengan baris ${firstNumber.get(number)}.`
      } else firstNumber.set(number, p.row)
    }
    if (!duplicate && f.nik) {
      const owner = nikOwners.get(f.nik)
      if (owner) duplicate = `NIK ${f.nik} sudah terdaftar atas nama ${owner}.`
      else if (firstNik.has(f.nik)) duplicate = `NIK sama dengan baris ${firstNik.get(f.nik)}.`
      else firstNik.set(f.nik, p.row)
    }
    const name = f.full_name.toLowerCase()
    if (!duplicate && family && name) {
      const seenAt = family.memberNames.get(name)
      if (seenAt === 0) duplicate = `${f.full_name} sudah tercatat di KK ini.`
      else if (seenAt !== undefined) duplicate = `Nama sama dengan baris ${seenAt} di KK yang sama.`
      else family.memberNames.set(name, p.row)
    }
    if (!duplicate && !number && !f.nik && f.full_name && f.birth_date) {
      const person = `${f.full_name.toLowerCase()}|${f.birth_date}`
      if (namesByBirth.has(person)) {
        duplicate = `Jemaat bernama ${f.full_name} dengan tanggal lahir yang sama sudah terdaftar.`
      } else if (firstPerson.has(person)) {
        duplicate = `Nama dan tanggal lahir sama dengan baris ${firstPerson.get(person)}.`
      } else firstPerson.set(person, p.row)
    }

    let status: ImportRowStatus = 'new'
    let messages = [...new Set(Object.values(p.errors).flat())]
    if (familyError) messages.push(familyError)
    if (duplicate) {
      status = 'duplicate'
      messages = [duplicate]
    } else if (messages.length > 0) status = 'error'
    else if (family && f.family_relation === 'HEAD' && f.status === 'ACTIVE') {
      // Satu KK hanya punya satu Kepala Keluarga aktif; nama kepala KK mengikutinya.
      if (family.activeHead) {
        status = 'error'
        messages = [`KK ini sudah punya Kepala Keluarga aktif: ${family.activeHead}.`]
      } else {
        family.activeHead = f.full_name
        if (family.head_name !== f.full_name) {
          family.head_name = f.full_name
          family.headChanged = !family.isNew
        }
      }
    }
    if (status === 'new' && family) family.savedRows++
    else if (status === 'new') {
      status = 'error'
      messages = ['Kartu Keluarga untuk baris ini belum bisa ditentukan.']
    }
    if (status === 'new') messages = notes

    return { p, family, status, messages }
  })

  // KK baru wajib punya nama kepala keluarga.
  for (const item of planned) {
    if (item.status === 'new' && item.family?.isNew && !item.family.head_name) {
      item.family.savedRows--
      item.status = 'error'
      item.messages = [
        `KK ${item.family.kk_number} belum punya nama kepala keluarga. Isi kolom Nama Kepala Keluarga, atau tambahkan anggota dengan hubungan Kepala Keluarga.`,
      ]
    }
  }

  const resultRows: MemberImportRow[] = planned.map(({ p, family, status, messages }) => ({
    row: p.row,
    status,
    messages,
    full_name: p.fields.full_name,
    church_member_number: p.fields.church_member_number,
    nik: p.fields.nik,
    family_relation: p.errors.family_relation ? null : p.fields.family_relation,
    family: family
      ? {
          kk_number: family.kk_number,
          head_name: family.head_name,
          rayon_name: family.rayon_name,
          rayon_input: p.rayonText && p.rayonText !== family.rayon_name ? p.rayonText : null,
          is_new: family.isNew,
        }
      : p.kk || p.head
        ? {
            kk_number: p.kk,
            head_name: p.head,
            rayon_name: p.rayon?.name ?? null,
            rayon_input: p.rayonText || null,
            is_new: true,
          }
        : null,
  }))

  const familyPlans = [...families.values()]
  const count = (status: ImportRowStatus) =>
    resultRows.filter((row) => row.status === status).length
  return {
    result: {
      summary: {
        rows: resultRows.length,
        new_members: count('new'),
        duplicates: count('duplicate'),
        errors: count('error'),
        new_families: familyPlans.filter((f) => f.isNew && f.savedRows > 0).length,
        existing_families: familyPlans.filter((f) => !f.isNew && f.savedRows > 0).length,
      },
      rows: resultRows,
    },
    families: familyPlans,
    members: planned
      .filter((item) => item.status === 'new' && item.family)
      .map((item) => ({ fields: item.p.fields, family: item.family as FamilyPlan })),
  }
}

// Id KK berikutnya: tidak pernah memakai ulang id KK yang pernah dihapus (AUTOINCREMENT).
async function nextFamilyId(db: D1Database): Promise<number> {
  const max = await db
    .prepare('SELECT COALESCE(MAX(id), 0) AS value FROM families')
    .first<{ value: number }>()
  const seq = await db
    .prepare(`SELECT seq AS value FROM sqlite_sequence WHERE name = 'families'`)
    .first<{ value: number }>()
    .catch(() => null)
  return Math.max(max?.value ?? 0, seq?.value ?? 0) + 1
}

// "json_extract(value, '$[0]'), json_extract(value, '$[1]'), ..."
function jsonColumns(count: number) {
  return Array.from({ length: count }, (_, i) => `json_extract(value, '$[${i}]')`).join(', ')
}

// ---------- Ekspor ----------

export async function exportMembers(c: Ctx) {
  const query = c.req.query()
  const format = query.format ?? 'xlsx'
  if (format !== 'xlsx' && format !== 'csv') {
    return invalid(c, 'Format ekspor tidak dikenal.', { format: ['Pilih xlsx atau csv.'] })
  }
  const { where, details, outsideScope } = memberFilter(query, rayonScope(c.get('user')))
  if (outsideScope) return outsideRayon(c)
  if (Object.keys(details).length > 0) return invalid(c, 'Filter data jemaat tidak valid.', details)

  // Urut per rayon dan KK, anggota keluarga berdekatan seperti buku induk.
  const { results } = await c.env.DB.prepare(
    `SELECT ${MEMBER_COLUMNS}, f.kk_number, f.family_head_name, f.rayon_id,
            r.name AS rayon_name, f.address, f.phone
     FROM members m
     JOIN families f ON f.id = m.family_id
     JOIN rayons r ON r.id = f.rayon_id
     ${where.sql}
     ORDER BY r.id, f.family_head_name COLLATE NOCASE, f.id, ${FAMILY_MEMBER_ORDER}
     LIMIT ${EXPORT_MAX_ROWS + 1}`,
  )
    .bind(...where.params)
    .all<StoredMember<ExportMember>>()
  if (results.length > EXPORT_MAX_ROWS) {
    return c.json<ApiErrorBody>(
      {
        error: `Hasil filter lebih dari ${EXPORT_MAX_ROWS.toLocaleString('id-ID')} baris; persempit filternya.`,
      },
      400,
    )
  }

  const rows = results.map((row) => exportRow(toMember(row)))
  const fileName = `data-jemaat-${witaToday()}.${format}`
  const filters = Object.fromEntries(Object.entries(query).filter(([key]) => key !== 'format'))
  // Data pribadi jemaat keluar dari sistem: siapa mengekspor apa ikut tercatat.
  await recordAudit(c, {
    action: 'EXPORT',
    entityType: 'members',
    entityId: null,
    label: fileName,
    details: { rows: rows.length, format, filters },
  })

  const body =
    format === 'csv'
      ? toCsv([
          IMPORT_COLUMNS.map((column) => column.header),
          ...rows.map((row) => row.map(cellText)),
        ])
      : await writeXlsx([{ name: 'Data Jemaat', columns: [...IMPORT_COLUMNS], rows }])
  return new Response(body, {
    headers: {
      'Content-Type': format === 'csv' ? CSV_MIME : XLSX_MIME,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
