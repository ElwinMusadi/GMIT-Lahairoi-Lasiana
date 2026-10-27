// Menulis berkas spreadsheet untuk ekspor data dan template impor, dipakai oleh API
// (src/worker) dan dashboard (src/client):
// - CSV: UTF-8 dengan BOM agar Excel membaca huruf seperti ’ dengan benar.
// - Excel .xlsx (Office Open XML) tanpa pustaka tambahan: berkas XML di dalam ZIP yang
//   dikompres dengan CompressionStream('deflate-raw') (browser modern dan Workers).

export type SheetCell = string | number | { date: string } | null

export type SheetColumn = {
  header: string
  // Lebar kolom dalam satuan karakter Excel.
  width?: number
  // text: isian di kolom ini tetap teks (NIK dan nomor telepon tidak berubah menjadi
  // angka); date: tanggal ditampilkan sebagai yyyy-mm-dd.
  kind?: 'text' | 'date'
}

export type Sheet = {
  // Maksimal 31 karakter (batas Excel).
  name: string
  columns: SheetColumn[]
  rows: SheetCell[][]
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const CSV_MIME = 'text/csv; charset=utf-8'

// ---------- CSV ----------

// Baris pertama berisi judul kolom. Nilai yang diawali =, @, atau +/- yang bukan angka
// diberi tanda petik tunggal agar tidak dijalankan sebagai rumus saat dibuka di Excel;
// pembaca impor membuang tanda itu kembali.
export function toCsv(rows: (string | null)[][]): string {
  const line = (row: (string | null)[]) => row.map((value) => csvField(value ?? '')).join(',')
  return `﻿${rows.map(line).join('\r\n')}\r\n`
}

function csvField(value: string): string {
  const safe = /^[=@]|^[+-](?![\d\s])/.test(value) ? `'${value}` : value
  return /[",;\r\n]|^\s|\s$/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

// ---------- XLSX ----------

const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const PKG_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

// Indeks gaya di styles.xml.
const STYLE_HEADER = 1
const STYLE_DATE = 2
const STYLE_TEXT = 3

export async function writeXlsx(sheets: Sheet[]): Promise<Uint8Array<ArrayBuffer>> {
  const encoder = new TextEncoder()
  const files: { name: string; text: string }[] = [
    { name: '[Content_Types].xml', text: contentTypes(sheets.length) },
    {
      name: '_rels/.rels',
      text: `${XML_HEAD}<Relationships xmlns="${PKG_REL_NS}"><Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    { name: 'xl/workbook.xml', text: workbook(sheets) },
    { name: 'xl/_rels/workbook.xml.rels', text: workbookRels(sheets.length) },
    { name: 'xl/styles.xml', text: STYLES },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      text: worksheet(sheet),
    })),
  ]
  return zip(
    files.map((file) => ({ name: file.name, data: new Uint8Array(encoder.encode(file.text)) })),
  )
}

function contentTypes(sheetCount: number) {
  const sheets = Array.from(
    { length: sheetCount },
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('')
  return `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets}</Types>`
}

function workbook(sheets: Sheet[]) {
  const entries = sheets
    .map(
      (sheet, i) =>
        `<sheet name="${xml(sheetName(sheet))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
    )
    .join('')
  // Excel mengenali filter kolom lewat nama tersembunyi _FilterDatabase.
  const filters = sheets
    .map((sheet, i) =>
      sheet.rows.length > 0
        ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xml(sheetName(sheet).replaceAll("'", "''"))}'!$A$1:$${columnName(sheet.columns.length - 1)}$${sheet.rows.length + 1}</definedName>`
        : '',
    )
    .join('')
  return `${XML_HEAD}<workbook xmlns="${MAIN_NS}" xmlns:r="${REL_NS}"><sheets>${entries}</sheets>${filters ? `<definedNames>${filters}</definedNames>` : ''}</workbook>`
}

function workbookRels(sheetCount: number) {
  const sheets = Array.from(
    { length: sheetCount },
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="${REL_NS}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  ).join('')
  return `${XML_HEAD}<Relationships xmlns="${PKG_REL_NS}">${sheets}<Relationship Id="rId${sheetCount + 1}" Type="${REL_NS}/styles" Target="styles.xml"/></Relationships>`
}

const STYLES = `${XML_HEAD}<styleSheet xmlns="${MAIN_NS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`

function worksheet(sheet: Sheet) {
  const lastColumn = columnName(sheet.columns.length - 1)
  const cols = sheet.columns
    .map((column, i) => {
      const style =
        column.kind === 'text'
          ? ` style="${STYLE_TEXT}"`
          : column.kind === 'date'
            ? ` style="${STYLE_DATE}"`
            : ''
      return `<col min="${i + 1}" max="${i + 1}" width="${column.width ?? 14}" customWidth="1"${style}/>`
    })
    .join('')
  const header = `<row r="1">${sheet.columns
    .map((column, i) => stringCell(`${columnName(i)}1`, column.header, STYLE_HEADER))
    .join('')}</row>`
  const body = sheet.rows
    .map((row, r) => {
      const cells = row
        .map((value, c) => {
          const ref = `${columnName(c)}${r + 2}`
          if (value === null || value === '') return ''
          if (typeof value === 'number') return `<c r="${ref}"><v>${value}</v></c>`
          if (typeof value === 'object') {
            const serial = excelSerial(value.date)
            return serial === null
              ? stringCell(ref, value.date)
              : `<c r="${ref}" s="${STYLE_DATE}"><v>${serial}</v></c>`
          }
          return stringCell(ref, value, sheet.columns[c]?.kind === 'text' ? STYLE_TEXT : undefined)
        })
        .join('')
      return `<row r="${r + 2}">${cells}</row>`
    })
    .join('')
  const filter =
    sheet.rows.length > 0 ? `<autoFilter ref="A1:${lastColumn}${sheet.rows.length + 1}"/>` : ''
  return `${XML_HEAD}<worksheet xmlns="${MAIN_NS}" xmlns:r="${REL_NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${header}${body}</sheetData>${filter}</worksheet>`
}

function stringCell(ref: string, text: string, style?: number) {
  return `<c r="${ref}" t="inlineStr"${style ? ` s="${style}"` : ''}><is><t xml:space="preserve">${xml(text)}</t></is></c>`
}

// 0 → A, 25 → Z, 26 → AA
export function columnName(index: number): string {
  let name = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  }
  return name
}

// Nomor seri tanggal Excel (sistem 1900): hari sejak 30 Desember 1899.
function excelSerial(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  return (
    (Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) - Date.UTC(1899, 11, 30)) /
    86_400_000
  )
}

function sheetName(sheet: Sheet) {
  return sheet.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31)
}

// Escape XML, termasuk membuang karakter kontrol yang tidak sah di XML.
function xml(text: string) {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '') // eslint-disable-line no-control-regex
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

// ---------- ZIP ----------

type Bytes = Uint8Array<ArrayBuffer>

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

async function deflateRaw(data: Bytes): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// Arsip ZIP dengan metode deflate (8), tanpa ZIP64 (cukup untuk berkas di bawah 4 GB).
async function zip(files: { name: string; data: Bytes }[]): Promise<Bytes> {
  const encoder = new TextEncoder()
  const entries = await Promise.all(
    files.map(async (file) => ({
      name: encoder.encode(file.name),
      crc: crc32(file.data),
      size: file.data.length,
      compressed: await deflateRaw(file.data),
    })),
  )
  const localSize = entries.reduce((sum, e) => sum + 30 + e.name.length + e.compressed.length, 0)
  const centralSize = entries.reduce((sum, e) => sum + 46 + e.name.length, 0)
  const out = new Uint8Array(localSize + centralSize + 22)
  const view = new DataView(out.buffer)
  // Tanggal 1 Januari 2026 00.00 dalam format DOS.
  const dosTime = 0
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1

  let offset = 0
  const offsets: number[] = []
  for (const e of entries) {
    offsets.push(offset)
    view.setUint32(offset, 0x04034b50, true)
    view.setUint16(offset + 4, 20, true)
    view.setUint16(offset + 6, 0x0800, true) // nama berkas UTF-8
    view.setUint16(offset + 8, 8, true)
    view.setUint16(offset + 10, dosTime, true)
    view.setUint16(offset + 12, dosDate, true)
    view.setUint32(offset + 14, e.crc, true)
    view.setUint32(offset + 18, e.compressed.length, true)
    view.setUint32(offset + 22, e.size, true)
    view.setUint16(offset + 26, e.name.length, true)
    view.setUint16(offset + 28, 0, true)
    out.set(e.name, offset + 30)
    out.set(e.compressed, offset + 30 + e.name.length)
    offset += 30 + e.name.length + e.compressed.length
  }

  const centralStart = offset
  entries.forEach((e, i) => {
    view.setUint32(offset, 0x02014b50, true)
    view.setUint16(offset + 4, 20, true)
    view.setUint16(offset + 6, 20, true)
    view.setUint16(offset + 8, 0x0800, true)
    view.setUint16(offset + 10, 8, true)
    view.setUint16(offset + 12, dosTime, true)
    view.setUint16(offset + 14, dosDate, true)
    view.setUint32(offset + 16, e.crc, true)
    view.setUint32(offset + 20, e.compressed.length, true)
    view.setUint32(offset + 24, e.size, true)
    view.setUint16(offset + 28, e.name.length, true)
    view.setUint32(offset + 42, offsets[i], true)
    out.set(e.name, offset + 46)
    offset += 46 + e.name.length
  })

  view.setUint32(offset, 0x06054b50, true)
  view.setUint16(offset + 8, entries.length, true)
  view.setUint16(offset + 10, entries.length, true)
  view.setUint32(offset + 12, offset - centralStart, true)
  view.setUint32(offset + 16, centralStart, true)
  return out
}
