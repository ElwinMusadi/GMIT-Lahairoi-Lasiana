// Membaca berkas impor di browser menjadi baris-baris teks. Indeks array sama dengan
// nomor baris di berkas dikurangi satu, agar pesan kesalahan bisa menyebut barisnya.
// - CSV: pemisah koma, titik koma (Excel berbahasa Indonesia), atau tab dikenali sendiri.
// - Excel .xlsx: lembar pertama; sel tanggal diubah menjadi YYYY-MM-DD.

export class SpreadsheetError extends Error {}

export const MAX_FILE_BYTES = 5 * 1024 * 1024

export async function readSpreadsheet(file: File): Promise<string[][]> {
  if (file.size > MAX_FILE_BYTES) {
    throw new SpreadsheetError(
      'Ukuran berkas lebih dari 5 MB. Bagi datanya menjadi beberapa berkas.',
    )
  }
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv') || name.endsWith('.txt')) return parseCsv(await file.text())
  if (name.endsWith('.xlsx')) return readXlsx(new Uint8Array(await file.arrayBuffer()))
  if (name.endsWith('.xls')) {
    throw new SpreadsheetError(
      'Berkas .xls (Excel 97–2003) belum didukung. Buka di Excel, lalu simpan ulang sebagai .xlsx atau CSV.',
    )
  }
  throw new SpreadsheetError('Pilih berkas Excel (.xlsx) atau CSV (.csv).')
}

// ---------- CSV ----------

export function parseCsv(input: string): string[][] {
  let text = input.replace(/^﻿/, '')
  // Baris petunjuk Excel "sep=;" menentukan pemisah dan bukan data.
  let delimiter: string | null = null
  const hint = /^sep=(.)\r?\n/i.exec(text)
  if (hint) {
    delimiter = hint[1]
    text = text.slice(hint[0].length)
  }
  delimiter ??= detectDelimiter(text)

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"' && field === '') quoted = true
    else if (char === delimiter) {
      row.push(unescapeFormula(field))
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(unescapeFormula(field))
      rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  if (field !== '' || row.length > 0) {
    row.push(unescapeFormula(field))
    rows.push(row)
  }
  return rows
}

// Pemisah yang paling sering muncul di baris pertama (di luar tanda petik).
function detectDelimiter(text: string): string {
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 }
  let quoted = false
  for (const char of text) {
    if (char === '"') quoted = !quoted
    else if (!quoted && (char === '\n' || char === '\r')) break
    else if (!quoted && char in counts) counts[char]++
  }
  const [best, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return count > 0 ? best : ','
}

// Ekspor CSV memberi petik tunggal di depan nilai yang mirip rumus (lihat toCsv).
function unescapeFormula(value: string) {
  return /^'[=@+-]/.test(value) ? value.slice(1) : value
}

// ---------- XLSX ----------

const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

async function readXlsx(bytes: Bytes): Promise<string[][]> {
  let files: Map<string, Bytes>
  try {
    files = await unzip(bytes)
  } catch {
    throw new SpreadsheetError(
      'Berkas Excel tidak dapat dibaca. Pastikan berkas tidak rusak dan bukan .xls.',
    )
  }
  const decoder = new TextDecoder()
  const xmlOf = (path: string) => {
    const data = files.get(path)
    return data ? new DOMParser().parseFromString(decoder.decode(data), 'application/xml') : null
  }
  const all = (node: Document | Element, tag: string) => [...node.getElementsByTagNameNS('*', tag)]

  const workbook = xmlOf('xl/workbook.xml')
  const firstSheet = workbook && all(workbook, 'sheet')[0]
  if (!workbook || !firstSheet) throw new SpreadsheetError('Berkas Excel tidak berisi lembar data.')
  const date1904 = ['1', 'true'].includes(
    all(workbook, 'workbookPr')[0]?.getAttribute('date1904') ?? '',
  )

  const relId = firstSheet.getAttributeNS(REL_NS, 'id') ?? firstSheet.getAttribute('r:id')
  const rels = xmlOf('xl/_rels/workbook.xml.rels')
  const target =
    rels &&
    all(rels, 'Relationship')
      .find((rel) => rel.getAttribute('Id') === relId)
      ?.getAttribute('Target')
  const sheetPath = target
    ? target.startsWith('/')
      ? target.slice(1)
      : `xl/${target}`
    : 'xl/worksheets/sheet1.xml'
  const sheet = xmlOf(sheetPath)
  if (!sheet) throw new SpreadsheetError('Lembar pertama berkas Excel tidak ditemukan.')

  const sharedDoc = xmlOf('xl/sharedStrings.xml')
  const shared = sharedDoc ? all(sharedDoc, 'si').map(richText) : []
  const dateStyles = readDateStyles(xmlOf('xl/styles.xml'))

  const rows: string[][] = []
  for (const rowEl of all(sheet, 'row')) {
    const rowIndex = Number(rowEl.getAttribute('r') ?? rows.length + 1) - 1
    const row: string[] = []
    let next = 0
    for (const cell of all(rowEl, 'c')) {
      const ref = cell.getAttribute('r')
      const column = ref ? columnIndex(ref) : next
      next = column + 1
      row[column] = cellText(cell, shared, dateStyles, date1904)
    }
    rows[rowIndex] = Array.from(row, (value) => value ?? '')
  }
  return Array.from(rows, (row) => row ?? [])
}

function cellText(cell: Element, shared: string[], dateStyles: Set<number>, date1904: boolean) {
  const type = cell.getAttribute('t')
  const raw = cell.getElementsByTagNameNS('*', 'v')[0]?.textContent ?? ''
  switch (type) {
    case 's':
      return shared[Number(raw)] ?? ''
    case 'inlineStr': {
      const inline = cell.getElementsByTagNameNS('*', 'is')[0]
      return inline ? richText(inline) : ''
    }
    case 'str':
      return raw
    case 'b':
      return raw === '1' ? 'TRUE' : 'FALSE'
    case 'e':
      return ''
    case 'd':
      return raw.slice(0, 10)
  }
  if (raw === '') return ''
  const style = Number(cell.getAttribute('s') ?? 0)
  return dateStyles.has(style) ? serialToDate(Number(raw), date1904) : raw
}

// Teks sel, termasuk teks berformat (beberapa <r>), tanpa teks fonetik (<rPh>).
function richText(node: Element): string {
  return [...node.getElementsByTagNameNS('*', 't')]
    .filter((t) => t.parentElement?.localName !== 'rPh')
    .map((t) => t.textContent ?? '')
    .join('')
}

// Indeks gaya sel (cellXfs) yang menampilkan tanggal.
function readDateStyles(styles: Document | null): Set<number> {
  const result = new Set<number>()
  if (!styles) return result
  const custom = new Map<number, string>()
  for (const fmt of styles.getElementsByTagNameNS('*', 'numFmt')) {
    custom.set(Number(fmt.getAttribute('numFmtId')), fmt.getAttribute('formatCode') ?? '')
  }
  const cellXfs = styles.getElementsByTagNameNS('*', 'cellXfs')[0]
  if (!cellXfs) return result
  ;[...cellXfs.getElementsByTagNameNS('*', 'xf')].forEach((xf, index) => {
    const id = Number(xf.getAttribute('numFmtId') ?? 0)
    const builtinDate =
      (id >= 14 && id <= 22) ||
      (id >= 45 && id <= 47) ||
      (id >= 27 && id <= 36) ||
      (id >= 50 && id <= 58)
    const code = (custom.get(id) ?? '').replace(/"[^"]*"|\[[^\]]*\]/g, '')
    if (builtinDate || /[dmy]/i.test(code)) result.add(index)
  })
  return result
}

function serialToDate(serial: number, date1904: boolean): string {
  if (!Number.isFinite(serial)) return ''
  const days = Math.floor(serial) + (date1904 ? 1462 : 0)
  return new Date(Date.UTC(1899, 11, 30) + days * 86_400_000).toISOString().slice(0, 10)
}

// "AB12" → 27
function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? 'A'
  return [...letters].reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1
}

// ---------- ZIP ----------

type Bytes = Uint8Array<ArrayBuffer>

async function unzip(bytes: Bytes): Promise<Map<string, Bytes>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  // Akhir direktori pusat ada di 22 byte terakhir, atau sebelum komentar arsip.
  let end = bytes.length - 22
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--
  if (end < 0) throw new Error('bukan arsip ZIP')

  const count = view.getUint16(end + 10, true)
  let offset = view.getUint32(end + 16, true)
  const decoder = new TextDecoder()
  const files = new Map<string, Bytes>()
  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('direktori ZIP rusak')
    const method = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength))
    offset += 46 + nameLength + extraLength + commentLength

    // Hanya berkas XML yang dibaca; gambar dan lainnya dilewati.
    if (!name.endsWith('.xml') && !name.endsWith('.rels')) continue
    const dataStart =
      localOffset +
      30 +
      view.getUint16(localOffset + 26, true) +
      view.getUint16(localOffset + 28, true)
    const data = bytes.subarray(dataStart, dataStart + compressedSize)
    if (method === 0) files.set(name, data)
    else if (method === 8) files.set(name, await inflateRaw(data))
  }
  return files
}

async function inflateRaw(data: Bytes): Promise<Bytes> {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}
