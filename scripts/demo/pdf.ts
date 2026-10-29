// Penulis PDF teks sederhana (A4, Helvetica) untuk berkas contoh data demo: warta, tata
// ibadah, kuitansi, dokumen syarat sakramen, dan salinan surat. Tanpa dependensi; teks
// dibungkus otomatis dan berpindah halaman bila penuh.

export type PdfLine = {
  text: string
  size?: number
  bold?: boolean
  // Jarak tambahan di atas baris (pt).
  gap?: number
  indent?: number
}

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 56

// Huruf standar PDF hanya memuat WinAnsi; tanda baca tipografis diganti padanan ASCII.
function plain(text: string): string {
  return text
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/·/g, '-')
    .replace(/…/g, '...')
    .normalize('NFKD')
    .replace(/[^\x20-\x7e]/g, '')
}

function escape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

// Lebar rata-rata Helvetica ±0,5 em (tebal ±0,55 em); cukup untuk membungkus baris.
function wrap(text: string, size: number, bold: boolean, width: number): string[] {
  const perChar = size * (bold ? 0.56 : 0.51)
  const max = Math.max(10, Math.floor(width / perChar))
  const lines: string[] = []
  let current = ''
  for (const word of text.split(' ')) {
    const next = current ? `${current} ${word}` : word
    if (next.length > max && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  lines.push(current)
  return lines
}

export function textPdf(title: string, lines: PdfLine[]): Uint8Array {
  const pages: string[][] = [[]]
  let y = PAGE_HEIGHT - MARGIN
  for (const line of lines) {
    const size = line.size ?? 10.5
    const lead = size * 1.4
    const indent = line.indent ?? 0
    y -= line.gap ?? 0
    for (const part of wrap(
      plain(line.text),
      size,
      Boolean(line.bold),
      PAGE_WIDTH - 2 * MARGIN - indent,
    )) {
      if (y - lead < MARGIN) {
        pages.push([])
        y = PAGE_HEIGHT - MARGIN
      }
      y -= lead
      if (part) {
        pages
          .at(-1)!
          .push(
            `BT /${line.bold ? 'F2' : 'F1'} ${size} Tf ${(MARGIN + indent).toFixed(2)} ${y.toFixed(2)} Td (${escape(part)}) Tj ET`,
          )
      }
    }
  }

  // Objek: 1 katalog, 2 daftar halaman, 3–4 huruf, 5 info, lalu halaman + isinya.
  const objects: string[] = []
  const pageIds = pages.map((_, index) => 6 + index * 2)
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  objects[4] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  objects[5] = `<< /Title (${escape(plain(title))}) /Producer (GMIT Lahairoi - data demo) >>`
  pages.forEach((commands, index) => {
    const pageId = pageIds[index]
    const stream = commands.join('\n')
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`
    objects[pageId + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  })

  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = body.length
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }
  const xref = body.length
  body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for (let id = 1; id < objects.length; id++) {
    body += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  }
  body += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new Uint8Array(Buffer.from(body, 'latin1'))
}
