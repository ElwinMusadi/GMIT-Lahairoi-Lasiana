import type { PublicContent, WorshipCategory } from '@shared/types'

// Tampilan data Portal Publik: tanggal ibadah, paragraf konten, daftar majelis, dan
// salin ke clipboard.

const DAY_MS = 86_400_000

// Foto gedung gereja (Keputusan K5) dalam tiga lebar, untuk hero, band, dan footer.
const PHOTO = '/images/gereja-gmit-lahairoi'
export const CHURCH_PHOTO = {
  src: `${PHOTO}-1254.webp`,
  srcSet: `${PHOTO}-640.webp 640w, ${PHOTO}-960.webp 960w, ${PHOTO}-1254.webp 1254w`,
  sizes: '100vw',
}

// Tanggal YYYY-MM-DD ditambah sejumlah hari.
export function addDays(date: string, days: number) {
  return new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10)
}

const shortDay = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
})

// Rentang tanggal untuk bilah jendela papan jadwal: "29 Okt s.d. 1 Nov".
export function dateRange(first: string, last: string) {
  const from = shortDay.format(Date.parse(first))
  return first === last ? from : `${from} s.d. ${shortDay.format(Date.parse(last))}`
}

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

const compactDate = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Makassar',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

// Waktu terbit ISO → "28 Okt 2026" (WITA), untuk keterangan yang sempit.
export function compactPublishedDate(iso: string) {
  return compactDate.format(new Date(iso))
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

const dayHeading = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// Judul kelompok Papan Jadwal: "Hari ini · Rabu, 28 Oktober 2026".
export function dayLabel(date: string, today: string) {
  const days = Math.round((Date.parse(date) - Date.parse(today)) / DAY_MS)
  const label = dayHeading.format(Date.parse(date))
  return days === 0 ? `Hari ini · ${label}` : days === 1 ? `Besok · ${label}` : label
}

// ID video YouTube dari tautan watch, youtu.be, shorts, atau embed; null bila bukan.
export function youTubeId(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\.|^m\./, '')
    let id: string | null = null
    if (host === 'youtu.be') id = parsed.pathname.slice(1)
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      id =
        parsed.searchParams.get('v') ??
        parsed.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ??
        null
    }
    return id && /^[\w-]{6,20}$/.test(id) ? id : null
  } catch {
    return null
  }
}

// Gambar sampul dokumentasi: foto yang diunggah, atau pratinjau YouTube untuk video saja.
export function mediaCover(item: Pick<PublicContent, 'thumbnail_url' | 'attachment_url'>) {
  if (item.thumbnail_url) return item.thumbnail_url
  const video = youTubeId(item.attachment_url)
  return video ? `https://i.ytimg.com/vi/${video}/hqdefault.jpg` : null
}

// Cuplikan awal isi untuk kartu artikel (±200 karakter, dipotong di batas kata).
export function excerpt(text: string | null | undefined, max = 200): string | null {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!flat) return null
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[.,;:!?-]+$/, '')}…`
}
