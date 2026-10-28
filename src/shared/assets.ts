import { isCalendarDate } from './dates'
import { MAX_AMOUNT } from './finance'
import { createReader, upper } from './form-reader'
import { ASSET_CONDITIONS, ASSET_CONDITION_LABELS, type AssetCondition } from './types'

// Aturan data inventaris gereja dan peminjamannya (PRD: Manajemen Aset & Inventaris),
// dipakai bersama oleh API dan form dashboard.

type Mode = 'create' | 'update'
type Body = Record<string, unknown>

export type AssetFields = {
  asset_code: string
  name: string
  category: string | null
  quantity: number
  location: string | null
  acquisition_source: string | null
  acquisition_year: number | null
  estimated_value: number | null
  condition: AssetCondition
  notes: string | null
}

export type LoanFields = {
  asset_id: number
  borrower_name: string
  rayon_id: number | null
  quantity_borrowed: number
  borrow_date: string
  due_date: string
  notes: string | null
}

export type ReturnFields = {
  return_date: string
  return_condition: AssetCondition | null
  notes: string | null
}

// Batas wajar jumlah unit satu aset (mis. kursi), untuk menangkap salah ketik.
export const MAX_QUANTITY = 100_000

// Contoh kategori untuk isian form; kategori tetap teks bebas.
export const SUGGESTED_CATEGORIES = [
  'Alat musik',
  'Sound system',
  'Perabot ibadah',
  'Kursi & meja',
  'Tenda',
  'Elektronik',
  'Kendaraan',
  'Tanah & gedung',
]

// Kode inventaris otomatis: INV-0001, INV-0002, …
export const AUTO_CODE_PREFIX = 'INV-'

// Barang dalam kondisi ini tidak dipinjamkan.
export const UNLENDABLE_CONDITIONS: readonly AssetCondition[] = ['MAJOR_DAMAGE', 'MAINTENANCE']

// Body POST/PUT /api/assets. asset_code kosong saat membuat berarti dibuat otomatis.
export function parseAssetInput(body: Body, mode: Mode, currentYear: number) {
  const read = createReader(body, mode)
  read.text('asset_code', 'Kode inventaris', {
    max: 30,
    normalize: (value) => upper(value).replace(/\s+/g, '-'),
    pattern: [
      /^[A-Z0-9][A-Z0-9./-]*$/,
      'Kode inventaris berisi huruf, angka, titik, garis miring, atau tanda hubung.',
    ],
  })
  // Kode otomatis hanya saat membuat; aset yang sudah ada tetap punya kode.
  if (mode === 'update' && read.input.asset_code === null) {
    read.details.asset_code = ['Kode inventaris tidak boleh dikosongkan.']
    delete read.input.asset_code
  }
  read.text('name', 'Nama barang', { max: 150, required: true })
  read.text('category', 'Kategori', { max: 60 })
  read.integer('quantity', 'Jumlah unit', {
    min: 1,
    max: MAX_QUANTITY,
    required: true,
    format: (value) => value.toLocaleString('id-ID'),
  })
  read.text('location', 'Lokasi penyimpanan', { max: 150 })
  read.text('acquisition_source', 'Sumber perolehan', { max: 150 })
  if (body.acquisition_year === null || body.acquisition_year === '') {
    if (read.has('acquisition_year')) read.input.acquisition_year = null
  } else {
    read.integer('acquisition_year', 'Tahun perolehan', {
      min: 1900,
      max: currentYear,
      format: String,
    })
  }
  if (body.estimated_value === null || body.estimated_value === '') {
    if (read.has('estimated_value')) read.input.estimated_value = null
  } else {
    read.integer('estimated_value', 'Estimasi nilai', { min: 0, max: MAX_AMOUNT })
  }
  read.choice('condition', 'kondisi', ASSET_CONDITIONS, ASSET_CONDITION_LABELS, {
    nullable: false,
  })
  read.text('notes', 'Catatan', { max: 1000, multiline: true })
  return { input: read.input as Partial<AssetFields>, details: read.details }
}

// Body POST /api/asset-loans. today: tanggal hari ini (WITA); barang dicatat saat
// keluar, jadi tanggal pinjam tidak boleh di masa depan.
export function parseLoanInput(body: Body, today: string) {
  const read = createReader(body, 'create')
  read.id('asset_id', 'barang')
  read.text('borrower_name', 'Nama peminjam', { max: 150, required: true })
  read.id('rayon_id', 'rayon', { required: false })
  read.integer('quantity_borrowed', 'Jumlah dipinjam', {
    min: 1,
    max: MAX_QUANTITY,
    required: true,
    format: (value) => value.toLocaleString('id-ID'),
  })
  read.date('borrow_date', 'Tanggal pinjam', today, { required: true })
  readFutureDate(read, 'due_date', 'Batas pengembalian')
  const borrow = read.input.borrow_date
  const due = read.input.due_date
  if (typeof borrow === 'string' && typeof due === 'string' && due < borrow) {
    read.details.due_date = ['Batas pengembalian tidak boleh sebelum tanggal pinjam.']
  }
  read.text('notes', 'Catatan', { max: 500, multiline: true })
  return { input: read.input as Partial<LoanFields>, details: read.details }
}

// Body PATCH /api/asset-loans/:id/return. Tanggal kembali bawaan hari ini.
export function parseReturnInput(body: Body, today: string) {
  const read = createReader(body, 'update')
  read.date('return_date', 'Tanggal kembali', today)
  read.choice('return_condition', 'kondisi saat kembali', ASSET_CONDITIONS, ASSET_CONDITION_LABELS)
  read.text('notes', 'Catatan', { max: 500, multiline: true })
  return { input: read.input as Partial<ReturnFields>, details: read.details }
}

// Tanggal yang boleh di masa depan, mis. batas pengembalian.
function readFutureDate(read: ReturnType<typeof createReader>, key: string, label: string) {
  read.text(key, label, {
    max: 10,
    required: true,
    pattern: [/^\d{4}-\d{2}-\d{2}$/, `${label} harus tanggal YYYY-MM-DD.`],
  })
  const value = read.input[key]
  if (typeof value === 'string' && !isCalendarDate(value)) {
    read.details[key] = [`${label} tidak ada di kalender.`]
    delete read.input[key]
  }
}
