import {
  IMPORT_COLUMNS,
  IMPORT_MAX_ROWS,
  matchImportHeaders,
  type ImportColumnKey,
} from '@shared/member-import'
import { CSV_MIME, XLSX_MIME, toCsv, writeXlsx, type SheetCell } from '@shared/spreadsheet'
import type { MemberImportRequest, MemberImportRow } from '@shared/types'
import { api } from './api'
import { witaDate } from './format'
import { SpreadsheetError } from './read-spreadsheet'

// Berkas impor & ekspor data jemaat di dashboard: template, unduhan ekspor, dan berkas
// berisi baris yang belum masuk.

export type ImportRows = MemberImportRequest['rows']

export function saveFile(data: BlobPart, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Template kosong: lembar "Data Jemaat" dengan judul kolom, dan (Excel) lembar
// "Petunjuk" berisi penjelasan dan contoh setiap kolom.
export async function downloadTemplate(format: 'xlsx' | 'csv') {
  if (format === 'csv') {
    saveFile(
      toCsv([IMPORT_COLUMNS.map((column) => column.header)]),
      'template-data-jemaat.csv',
      CSV_MIME,
    )
    return
  }
  const guide: SheetCell[][] = IMPORT_COLUMNS.map((column) => [
    column.header,
    'required' in column ? 'Wajib' : '',
    column.help,
    column.example,
  ])
  const data = await writeXlsx([
    { name: 'Data Jemaat', columns: [...IMPORT_COLUMNS], rows: [] },
    {
      name: 'Petunjuk',
      columns: [
        { header: 'Kolom', width: 22 },
        { header: 'Wajib', width: 8 },
        { header: 'Isi', width: 80 },
        { header: 'Contoh', width: 26 },
      ],
      rows: guide,
    },
  ])
  saveFile(data, 'template-data-jemaat.xlsx', XLSX_MIME)
}

// Ekspor dari API dengan filter yang sedang aktif di halaman Anggota Jemaat.
export async function downloadExport(
  format: 'xlsx' | 'csv',
  query: Record<string, string | number>,
) {
  const blob = await api.get<Blob>('/members/export', {
    query: { ...query, format },
    responseType: 'blob',
  })
  saveFile(blob, `data-jemaat-${witaDate()}.${format}`, blob.type)
}

// Tabel berkas → baris impor. Baris judul kolom adalah baris dengan judul dikenali
// terbanyak di antara 15 baris pertama yang berisi, sehingga judul laporan di atas tabel
// (mis. "DATA JEMAAT GMIT LAHAIROI") dilewati. Baris kosong dilewati; nomor baris
// mengikuti berkas.
export function toImportRows(table: string[][]): { rows: ImportRows; ignored: string[] } {
  const filled = table
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.some((cell) => cell.trim() !== ''))
  if (filled.length === 0) throw new SpreadsheetError('Berkas kosong.')
  const candidates = filled.slice(0, 15).map(({ row, index }) => ({
    index,
    match: matchImportHeaders(row),
  }))
  const recognized = (match: ReturnType<typeof matchImportHeaders>) =>
    match.keys.filter(Boolean).length
  const { index: headerIndex, match } = candidates.reduce((best, next) =>
    recognized(next.match) > recognized(best.match) ? next : best,
  )
  if (match.missing.length > 0) {
    throw new SpreadsheetError(
      `Kolom wajib tidak ditemukan: ${match.missing.join(', ')}. Pakai template agar judul kolomnya sesuai.`,
    )
  }

  const rows: ImportRows = []
  for (let i = headerIndex + 1; i < table.length; i++) {
    const cells = table[i] ?? []
    if (!cells.some((cell) => cell.trim() !== '')) continue
    const values: Partial<Record<ImportColumnKey, string>> = {}
    match.keys.forEach((key, column) => {
      const value = cells[column]?.trim()
      if (key && value) values[key] = value
    })
    rows.push({ row: i + 1, values })
  }
  if (rows.length === 0) {
    throw new SpreadsheetError('Belum ada data jemaat di bawah baris judul kolom.')
  }
  if (rows.length > IMPORT_MAX_ROWS) {
    throw new SpreadsheetError(
      `Berkas berisi ${rows.length.toLocaleString('id-ID')} baris; maksimal ${IMPORT_MAX_ROWS.toLocaleString('id-ID')} sekali impor. Bagi berkasnya menjadi beberapa bagian.`,
    )
  }
  return { rows, ignored: match.ignored }
}

// Baris yang belum masuk beserta alasannya, dengan kolom yang sama seperti template.
// Kolom "Baris" dan "Keterangan" diabaikan saat berkas ini diimpor lagi setelah diperbaiki.
export async function downloadSkippedRows(
  fileName: string,
  rows: ImportRows,
  results: MemberImportRow[],
) {
  const byRow = new Map(rows.map((row) => [row.row, row.values]))
  const skipped = results.filter((result) => result.status !== 'new')
  const data = await writeXlsx([
    {
      name: 'Belum masuk',
      columns: [
        { header: 'Baris', width: 7 },
        { header: 'Keterangan', width: 50 },
        ...IMPORT_COLUMNS,
      ],
      rows: skipped.map((result) => {
        const values = byRow.get(result.row) ?? {}
        return [
          result.row,
          result.messages.join(' '),
          ...IMPORT_COLUMNS.map((column) => values[column.key] ?? null),
        ]
      }),
    },
  ])
  const base = fileName.replace(/\.[^.]+$/, '')
  saveFile(data, `belum-masuk-${base}.xlsx`, XLSX_MIME)
}
