import type { PublicContent, WorshipCategory } from '@shared/types'

// Tampilan data Portal Publik: tanggal ibadah, paragraf konten, daftar majelis, dan
// salin ke clipboard.

const DAY_MS = 86_400_000

// Tanggal tanpa jam (YYYY-MM-DD) diformat apa adanya, tanpa geser zona waktu.
const weekdayDate = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'short',
})
const longDate = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Makassar',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// "2026-11-01", "09:00" → "Minggu, 1 Nov · 09.00 WITA"; hari ini dan besok disebut.
export function worshipWhen(date: string, time: string | null, today: string) {
  const days = Math.round((Date.parse(date) - Date.parse(today)) / DAY_MS)
  const day = days === 0 ? 'Hari ini' : days === 1 ? 'Besok' : weekdayDate.format(Date.parse(date))
  return time ? `${day} · ${time.replace(':', '.')} WITA` : day
}

// Waktu terbit ISO → "28 Oktober 2026" (WITA).
export function publishedDate(iso: string) {
  return longDate.format(new Date(iso))
}

// Warna kartu jadwal per jenis ibadah, seperti rancangan portal (garis kiri + label).
export const WORSHIP_TONE: Record<WorshipCategory, { bar: string; pill: string }> = {
  SUNDAY_SERVICE: { bar: 'bg-portal-amber', pill: 'bg-portal-amber-soft text-portal-amber-ink' },
  RAYON: { bar: 'bg-portal-navy', pill: 'bg-portal-blue-soft text-portal-blue-ink' },
  CATEGORICAL: { bar: 'bg-portal-green', pill: 'bg-portal-green-soft text-portal-green' },
  SPECIAL: { bar: 'bg-portal-indigo', pill: 'bg-portal-high text-portal-navy' },
}

// Isi konten (teks biasa) → paragraf; paragraf dipisah baris kosong.
export function paragraphs(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

// Daftar Pendeta & Majelis ditulis di CMS satu baris per orang: "Jabatan: Nama".
// Baris lain (tanpa titik dua) menjadi catatan di bawah daftar.
export type RosterEntry = { role: string; name: string }

export function parseRoster(text: string | null | undefined) {
  const entries: RosterEntry[] = []
  const notes: string[] = []
  for (const raw of (text ?? '').split('\n')) {
    const line = raw.trim().replace(/^[-•*]\s*/, '')
    if (!line) continue
    const index = line.indexOf(':')
    if (index > 0 && index < line.length - 1) {
      entries.push({ role: line.slice(0, index).trim(), name: line.slice(index + 1).trim() })
    } else {
      notes.push(line)
    }
  }
  return { entries, notes }
}

// Dua huruf untuk lingkaran nama, tanpa gelar: "Pdt. Agustina Riwu Kaho" → "AR".
export function initials(name: string) {
  const words = name
    .replace(/\b(Pdt|Pnt|Dkn|Pnj|Em|Bpk|Ibu|Sdr|Sdri)\.?\s+/gi, '')
    .replace(/,.*$/, '')
    .split(/\s+/)
    .filter(Boolean)
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || '?'
}

// Bagian halaman Profil dikenali dari judul atau alamat konten Profil di CMS.
export type ProfileSlot = 'history' | 'vision' | 'leaders' | 'other'

export function profileSlot(content: Pick<PublicContent, 'title' | 'slug'>): ProfileSlot {
  const text = `${content.title} ${content.slug}`.toLowerCase()
  if (text.includes('sejarah')) return 'history'
  if (text.includes('visi') || text.includes('misi')) return 'vision'
  if (text.includes('majelis') || text.includes('pendeta')) return 'leaders'
  return 'other'
}

// Nomor rekening untuk aplikasi bank: hanya angka.
export function accountDigits(number: string) {
  return number.replace(/\D/g, '')
}

// Menyalin teks; memakai cara lama bila Clipboard API tidak tersedia (mis. bukan HTTPS).
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Lanjut ke cara lama.
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  area.remove()
  return ok
}
