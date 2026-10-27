import type { Context } from 'hono'
import type { FieldErrors } from '../../shared/accounts'
import type { ApiErrorBody } from '../../shared/types'
import type { AppEnv } from '../types'

// Pembaca permintaan yang dipakai bersama oleh rute API.

type Ctx = Context<AppEnv>

// Body JSON berupa objek; selain itu (rusak, array, kosong) null.
export async function readJsonObject(c: Ctx): Promise<Record<string, unknown> | null> {
  const body: unknown = await c.req.json().catch(() => null)
  return body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null
}

export function invalid(c: Ctx, error: string, details: FieldErrors) {
  return c.json<ApiErrorBody>({ error, details }, 400)
}

// Menjalankan batch (satu transaksi). Pemeriksaan duplikat dilakukan sebelumnya;
// pelanggaran UNIQUE di sini berarti dua pengurus menyimpan data yang sama
// bersamaan, dan dijawab 409 dengan `conflictMessage`.
export async function runBatch(c: Ctx, statements: D1PreparedStatement[], conflictMessage: string) {
  try {
    return await c.env.DB.batch(statements)
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      return c.json<ApiErrorBody>({ error: conflictMessage }, 409)
    }
    throw err
  }
}

// Bilangan bulat positif dari path atau query string, selain itu null.
export function positiveInt(text: string | undefined): number | null {
  if (text === undefined || !/^\d{1,15}$/.test(text)) return null
  const value = Number(text)
  return value > 0 ? value : null
}

export const DEFAULT_PER_PAGE = 50
export const MAX_PER_PAGE = 100

// Query page dan per_page. Nilai yang salah dicatat di `details`.
export function readPaging(query: Record<string, string>, details: FieldErrors) {
  const page = query.page === undefined ? 1 : positiveInt(query.page)
  if (page === null) details.page = ['Halaman harus bilangan bulat mulai dari 1.']
  const perPage = query.per_page === undefined ? DEFAULT_PER_PAGE : positiveInt(query.per_page)
  if (perPage === null || perPage > MAX_PER_PAGE) {
    details.per_page = [`Jumlah per halaman antara 1 dan ${MAX_PER_PAGE}.`]
  }
  return { page: page ?? 1, perPage: Math.min(perPage ?? DEFAULT_PER_PAGE, MAX_PER_PAGE) }
}

// Menyusun klausa WHERE dengan parameter bernomor (?1, ?2, ...).
export function whereBuilder() {
  const clauses: string[] = []
  const params: unknown[] = []
  const param = (value: unknown) => {
    params.push(value)
    return `?${params.length}`
  }
  return {
    params,
    // Setiap `?` di klausa merujuk ke nilai yang sama.
    add(clause: string, value: unknown) {
      const placeholder = param(value)
      clauses.push(clause.replaceAll('?', placeholder))
    },
    addIn(column: string, values: readonly unknown[]) {
      clauses.push(`${column} IN (${values.map(param).join(', ')})`)
    },
    get sql() {
      return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
    },
  }
}

// Pola LIKE "mengandung" yang aman: % dan _ dari pengguna dibaca apa adanya.
// Pasangkan dengan ESCAPE '\'.
export function containsPattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, '\\$&')}%`
}

// Kata pencarian dipecah per spasi; setiap kata harus cocok (maks. 5 kata).
// null bila terlalu panjang.
export function searchWords(text: string): string[] | null {
  const trimmed = text.trim()
  if (trimmed.length > 100) return null
  return trimmed.split(/\s+/).filter(Boolean).slice(0, 5)
}
