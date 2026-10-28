import type { FieldErrors } from './accounts'
import { isCalendarDate } from './dates'

// Pembaca body POST/PUT yang dipakai aturan data bersama (congregation.ts, finance.ts):
// teks dirapikan, '' dan null berarti dikosongkan, field wajib selalu dibaca saat
// membuat data, dan field yang tidak dikirim tidak diubah (mode update). Hasilnya
// `input` (nilai yang sudah normal) dan `details` (pesan kesalahan per field).

type Mode = 'create' | 'update'
type Body = Record<string, unknown>

export function createReader(body: Body, mode: Mode) {
  const input: Record<string, unknown> = {}
  const details: FieldErrors = {}
  const has = (key: string) => body[key] !== undefined
  // Field wajib selalu dibaca saat membuat data; field lain hanya bila dikirim.
  const wanted = (key: string, required: boolean) => has(key) || (mode === 'create' && required)
  const fail = (key: string, message: string) => {
    details[key] = [message]
  }

  return {
    input,
    details,
    has,

    text(
      key: string,
      label: string,
      options: {
        max: number
        required?: boolean
        normalize?: (value: string) => string
        pattern?: [RegExp, string]
        // Teks panjang (mis. isi renungan): baris dan paragraf dipertahankan.
        multiline?: boolean
      },
    ) {
      const { max, required = false, normalize, pattern, multiline = false } = options
      if (!wanted(key, required)) return
      const raw = body[key]
      if (raw !== null && raw !== undefined && typeof raw !== 'string') {
        return fail(key, `${label} harus berupa teks.`)
      }
      const cleaned =
        typeof raw !== 'string'
          ? ''
          : multiline
            ? raw
                .replace(/\r\n?/g, '\n')
                .replace(/[ \t]+$/gm, '')
                .replace(/\n{3,}/g, '\n\n')
                .trim()
            : raw.trim().replace(/\s+/g, ' ')
      if (!cleaned) {
        if (required) return fail(key, `${label} wajib diisi.`)
        input[key] = null
        return
      }
      const value = normalize ? normalize(cleaned) : cleaned
      if (value.length > max) return fail(key, `${label} maksimal ${max} karakter.`)
      if (pattern && !pattern[0].test(value)) return fail(key, pattern[1])
      input[key] = value
    },

    // Kode pilihan, mis. MALE atau PEMUDA. Huruf kecil diterima.
    choice(
      key: string,
      label: string,
      options: readonly string[],
      labels?: Record<string, string>,
      { required = false, nullable = !required }: { required?: boolean; nullable?: boolean } = {},
    ) {
      if (!wanted(key, required)) return
      const raw = body[key]
      if (nullable && (raw === null || raw === '')) {
        input[key] = null
        return
      }
      const value = typeof raw === 'string' ? raw.trim().toUpperCase() : ''
      if (options.includes(value)) input[key] = value
      else
        fail(key, `Pilih ${label}: ${listOr(options.map((option) => labels?.[option] ?? option))}.`)
    },

    flag(key: string, label: string) {
      if (!has(key)) return
      if (typeof body[key] === 'boolean') input[key] = body[key]
      else fail(key, `${label} harus true atau false.`)
    },

    // Id data lain, mis. rayon atau Kartu Keluarga. Tidak wajib berarti boleh null.
    id(key: string, label: string, { required = true }: { required?: boolean } = {}) {
      if (!wanted(key, required)) return
      const raw = body[key]
      if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) input[key] = raw
      else if (raw === undefined || raw === null || raw === '') {
        if (required) fail(key, `Pilih ${label}.`)
        else input[key] = null
      } else fail(key, `${capitalize(label)} tidak valid.`)
    },

    // Bilangan bulat, mis. nominal Rupiah atau tahun anggaran. Teks angka diterima.
    integer(
      key: string,
      label: string,
      {
        min,
        max,
        required = false,
        format = group,
      }: { min: number; max: number; required?: boolean; format?: (value: number) => string },
    ) {
      if (!wanted(key, required)) return
      const raw = body[key]
      if (raw === undefined || raw === null || raw === '') {
        if (required) fail(key, `${label} wajib diisi.`)
        return
      }
      const value = typeof raw === 'string' && /^-?\d+$/.test(raw.trim()) ? Number(raw) : raw
      if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
        return fail(key, `${label} harus bilangan bulat tanpa desimal.`)
      }
      if (value < min || value > max) {
        return fail(key, `${label} harus antara ${format(min)} dan ${format(max)}.`)
      }
      input[key] = value
    },

    date(key: string, label: string, today: string, { required = false } = {}) {
      if (!wanted(key, required)) return
      const raw = body[key]
      if (raw === undefined || raw === null || raw === '') {
        if (required) fail(key, `${label} wajib diisi.`)
        else input[key] = null
        return
      }
      const value = typeof raw === 'string' ? raw.trim() : ''
      if (!isCalendarDate(value))
        return fail(key, `${label} harus tanggal yang valid (YYYY-MM-DD).`)
      if (value > today) return fail(key, `${label} tidak boleh melewati hari ini.`)
      input[key] = value
    },
  }
}

export function upper(value: string) {
  return value.toUpperCase()
}

// 1500000 → "1.500.000"
export function group(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// ['A', 'B', 'C'] → "A, B, atau C"
function listOr(items: string[]) {
  return items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')}${items.length > 2 ? ',' : ''} atau ${items.at(-1)}`
}
