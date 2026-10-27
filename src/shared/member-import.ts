import type { FieldErrors } from './accounts'
import { isCalendarDate, witaToday } from './dates'
import type { SheetCell, SheetColumn } from './spreadsheet'
import {
  CATEGORICAL_GROUP_LABELS,
  FAMILY_RELATION_LABELS,
  GENDER_LABELS,
  MARRIAGE_STATUS_LABELS,
  MEMBER_STATUS_LABELS,
  type CategoricalGroup,
  type FamilyRelation,
  type Gender,
  type MarriageStatus,
  type MemberStatus,
  type MemberWithFamily,
} from './types'

// Format berkas impor & ekspor data jemaat (PRD: migrasi data Excel lama). Satu baris =
// satu anggota jemaat beserta data KK-nya; baris dengan Nomor KK yang sama (atau, bila
// kosong, nama kepala keluarga dan rayon yang sama) menjadi satu KK.
//
// Nilai ditulis seperti di Excel gereja: "L"/"P", "Sudah"/"Belum", "Kaum Ibu",
// "12/03/1975", dan seterusnya. normalizeImportRow mengubahnya menjadi kode API, lalu
// aturan di congregation.ts memeriksanya seperti form di dashboard.

export const IMPORT_MAX_ROWS = 2000

type ColumnDef = SheetColumn & {
  key: string
  // Judul lain yang dikenali (huruf besar/kecil, spasi, dan tanda baca diabaikan).
  aliases?: readonly string[]
  required?: boolean
  // Penjelasan isian untuk template dan halaman impor.
  help: string
  example: string
}

export const IMPORT_COLUMNS = [
  {
    key: 'kk_number',
    header: 'Nomor KK',
    aliases: ['no kk', 'nomor kartu keluarga', 'no kartu keluarga', 'kk'],
    width: 14,
    kind: 'text',
    help: 'Nomor KK gereja. Baris dengan nomor yang sama menjadi satu KK; KK yang sudah terdaftar dipakai.',
    example: 'GTS-001',
  },
  {
    key: 'family_head_name',
    header: 'Nama Kepala Keluarga',
    aliases: ['kepala keluarga', 'nama kk', 'kepala kk'],
    width: 24,
    help: 'Wajib bila Nomor KK kosong; KK tanpa nomor dikelompokkan menurut nama ini dan rayonnya.',
    example: 'Yakob Lado',
  },
  {
    key: 'rayon',
    header: 'Rayon',
    aliases: ['nama rayon', 'wilayah'],
    width: 14,
    help: 'Nama rayon; huruf besar/kecil dan ejaan seperti Gethsemani tetap dikenali. Wajib untuk KK baru.',
    example: 'Getsemani',
  },
  {
    key: 'address',
    header: 'Alamat',
    aliases: ['alamat kk', 'alamat rumah'],
    width: 30,
    help: 'Alamat KK.',
    example: 'RT 07 / RW 03, Kel. Lasiana',
  },
  {
    key: 'phone',
    header: 'Telepon',
    aliases: [
      'no hp',
      'hp',
      'nomor hp',
      'no telepon',
      'nomor telepon',
      'whatsapp',
      'no wa',
      'telepon wa',
    ],
    width: 16,
    kind: 'text',
    help: 'Telepon atau WhatsApp KK.',
    example: '081234567890',
  },
  {
    key: 'church_member_number',
    header: 'Nomor Induk',
    aliases: ['no induk', 'nomor induk gereja', 'no induk gereja', 'nig'],
    width: 14,
    kind: 'text',
    help: 'Nomor Induk Gereja. Nomor yang sudah terdaftar dilewati, sehingga tidak ada data ganda.',
    example: 'LHR-0001',
  },
  {
    key: 'nik',
    header: 'NIK',
    aliases: ['nomor induk kependudukan', 'no ktp', 'nik ktp'],
    width: 19,
    kind: 'text',
    help: '16 angka sesuai KTP/KK Dukcapil.',
    example: '5371011203750001',
  },
  {
    key: 'full_name',
    header: 'Nama Lengkap',
    aliases: ['nama', 'nama jemaat', 'nama anggota'],
    width: 24,
    required: true,
    help: 'Wajib.',
    example: 'Yakob Lado',
  },
  {
    key: 'gender',
    header: 'Jenis Kelamin',
    aliases: ['jk', 'l/p', 'lp', 'kelamin', 'gender'],
    width: 13,
    required: true,
    help: 'Wajib. L atau P (Laki-laki / Perempuan).',
    example: 'L',
  },
  {
    key: 'family_relation',
    header: 'Hubungan Keluarga',
    aliases: ['hubungan', 'hubungan dalam keluarga', 'status dalam keluarga', 'shdk'],
    width: 18,
    required: true,
    help: 'Wajib. Kepala Keluarga, Istri, Suami, Anak, atau Tanggungan.',
    example: 'Kepala Keluarga',
  },
  {
    key: 'birth_place',
    header: 'Tempat Lahir',
    width: 14,
    help: 'Kota atau kabupaten.',
    example: 'Kupang',
  },
  {
    key: 'birth_date',
    header: 'Tanggal Lahir',
    aliases: ['tgl lahir'],
    width: 13,
    kind: 'date',
    help: 'Contoh 1975-03-12, 12/03/1975, atau 12 Maret 1975.',
    example: '1975-03-12',
  },
  {
    key: 'blood_type',
    header: 'Golongan Darah',
    aliases: ['gol darah', 'goldar'],
    width: 10,
    help: 'A, B, AB, atau O.',
    example: 'O',
  },
  {
    key: 'education',
    header: 'Pendidikan',
    aliases: ['pendidikan terakhir'],
    width: 14,
    help: 'Pendidikan terakhir, mis. SMA/SMK atau S1/D4.',
    example: 'S1/D4',
  },
  {
    key: 'occupation',
    header: 'Pekerjaan',
    width: 18,
    help: 'Pekerjaan.',
    example: 'Guru',
  },
  {
    key: 'categorical_group',
    header: 'Kategori',
    aliases: ['kategorial', 'kategori pelayanan'],
    width: 12,
    help: 'PAR, Pemuda, Kaum Ibu, Kaum Bapak, atau Lansia.',
    example: 'Kaum Bapak',
  },
  {
    key: 'baptism_status',
    header: 'Sudah Baptis',
    aliases: ['status baptis', 'baptis'],
    width: 12,
    help: 'Sudah atau Belum. Bila Tanggal Baptis diisi, dianggap sudah.',
    example: 'Sudah',
  },
  {
    key: 'baptism_date',
    header: 'Tanggal Baptis',
    aliases: ['tgl baptis'],
    width: 13,
    kind: 'date',
    help: 'Format tanggal seperti Tanggal Lahir.',
    example: '1975-06-01',
  },
  {
    key: 'sidi_status',
    header: 'Sudah Sidi',
    aliases: ['status sidi', 'sidi'],
    width: 11,
    help: 'Sudah atau Belum. Sidi hanya untuk yang sudah dibaptis.',
    example: 'Sudah',
  },
  {
    key: 'sidi_date',
    header: 'Tanggal Sidi',
    aliases: ['tgl sidi'],
    width: 13,
    kind: 'date',
    help: 'Format tanggal seperti Tanggal Lahir.',
    example: '1992-04-12',
  },
  {
    key: 'marriage_status',
    header: 'Status Nikah',
    aliases: ['status pernikahan', 'status perkawinan', 'status kawin'],
    width: 14,
    help: 'Belum menikah, Menikah, Cerai hidup, atau Cerai mati.',
    example: 'Menikah',
  },
  {
    key: 'marriage_date',
    header: 'Tanggal Nikah',
    aliases: ['tgl nikah', 'tanggal pemberkatan nikah', 'tanggal perkawinan'],
    width: 13,
    kind: 'date',
    help: 'Tanggal pemberkatan nikah.',
    example: '1999-07-10',
  },
  {
    key: 'status',
    header: 'Status Keanggotaan',
    aliases: ['status anggota', 'status jemaat', 'keanggotaan'],
    width: 16,
    help: 'Aktif, Pindah, atau Meninggal. Bila kosong: Aktif.',
    example: 'Aktif',
  },
] as const satisfies readonly ColumnDef[]

export type ImportColumnKey = (typeof IMPORT_COLUMNS)[number]['key']
export type ImportValues = Partial<Record<ImportColumnKey, string>>

// ---------- Judul kolom ----------

const simplify = (text: string) =>
  text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const HEADER_LOOKUP = new Map<string, ImportColumnKey>(
  IMPORT_COLUMNS.flatMap((column) =>
    [column.header, ...('aliases' in column ? column.aliases : [])].map(
      (name) => [simplify(name), column.key] as const,
    ),
  ),
)

export type HeaderMatch = {
  // Kolom berkas → kunci kolom impor (null bila tidak dikenali).
  keys: (ImportColumnKey | null)[]
  // Judul kolom wajib yang tidak ditemukan.
  missing: string[]
  // Judul kolom berkas yang tidak dikenali dan diabaikan.
  ignored: string[]
}

export function matchImportHeaders(cells: string[]): HeaderMatch {
  const seen = new Set<ImportColumnKey>()
  const keys = cells.map((cell) => {
    const key = HEADER_LOOKUP.get(simplify(cell)) ?? null
    if (!key || seen.has(key)) return null
    seen.add(key)
    return key
  })
  const missing: string[] = IMPORT_COLUMNS.filter(
    (column) => 'required' in column && !seen.has(column.key),
  ).map((column) => column.header)
  if (!seen.has('kk_number') && !seen.has('family_head_name')) {
    missing.push('Nomor KK atau Nama Kepala Keluarga')
  }
  const ignored = cells.filter((cell, i) => cell.trim() !== '' && keys[i] === null)
  return { keys, missing, ignored }
}

// ---------- Nilai ----------

// prettier-ignore
const GENDER_WORDS: Record<string, Gender> = {
  l: 'MALE', lk: 'MALE', laki: 'MALE', lakilaki: 'MALE', pria: 'MALE', male: 'MALE', m: 'MALE',
  p: 'FEMALE', pr: 'FEMALE', perempuan: 'FEMALE', wanita: 'FEMALE', female: 'FEMALE', f: 'FEMALE', w: 'FEMALE',
}

// prettier-ignore
const RELATION_WORDS: Record<string, FamilyRelation> = {
  kepalakeluarga: 'HEAD', kepala: 'HEAD', kk: 'HEAD', head: 'HEAD',
  istri: 'SPOUSE', isteri: 'SPOUSE', suami: 'SPOUSE', istrisuami: 'SPOUSE', suamiistri: 'SPOUSE', pasangan: 'SPOUSE', spouse: 'SPOUSE',
  anak: 'CHILD', anakkandung: 'CHILD', anakangkat: 'CHILD', anaktiri: 'CHILD', child: 'CHILD',
  tanggungan: 'DEPENDENT', famili: 'DEPENDENT', famililain: 'DEPENDENT', keluargalain: 'DEPENDENT', orangtua: 'DEPENDENT',
  mertua: 'DEPENDENT', cucu: 'DEPENDENT', menantu: 'DEPENDENT', lainnya: 'DEPENDENT', dependent: 'DEPENDENT',
}

// prettier-ignore
const CATEGORY_WORDS: Record<string, CategoricalGroup> = {
  par: 'PAR', anak: 'PAR', remaja: 'PAR', anakremaja: 'PAR', pelayanananakdanremaja: 'PAR',
  pemuda: 'PEMUDA', pemudi: 'PEMUDA',
  kaumibu: 'KAUM_IBU', ibu: 'KAUM_IBU',
  kaumbapak: 'KAUM_BAPAK', bapak: 'KAUM_BAPAK',
  lansia: 'LANSIA', lanjutusia: 'LANSIA',
}

// prettier-ignore
const MARRIAGE_WORDS: Record<string, MarriageStatus> = {
  belummenikah: 'SINGLE', belumkawin: 'SINGLE', belumnikah: 'SINGLE', lajang: 'SINGLE', single: 'SINGLE',
  menikah: 'MARRIED', kawin: 'MARRIED', nikah: 'MARRIED', sudahmenikah: 'MARRIED', married: 'MARRIED',
  ceraihidup: 'DIVORCED', cerai: 'DIVORCED', divorced: 'DIVORCED',
  ceraimati: 'WIDOWED', duda: 'WIDOWED', janda: 'WIDOWED', dudajanda: 'WIDOWED', widowed: 'WIDOWED',
}

// prettier-ignore
const STATUS_WORDS: Record<string, MemberStatus> = {
  aktif: 'ACTIVE', active: 'ACTIVE',
  pindah: 'MOVED', keluar: 'MOVED', atestasi: 'MOVED', atestasikeluar: 'MOVED', moved: 'MOVED',
  meninggal: 'DECEASED', meninggaldunia: 'DECEASED', almarhum: 'DECEASED', almarhumah: 'DECEASED', alm: 'DECEASED', wafat: 'DECEASED', deceased: 'DECEASED',
}

const YES = new Set(['sudah', 'ya', 'y', 'yes', '1', 'true', 'benar', 'v', 's'])
const NO = new Set(['belum', 'tidak', 'tdk', 't', 'no', 'n', '0', 'false', 'blm'])

// prettier-ignore
const MONTHS: Record<string, number> = {
  jan: 1, januari: 1, january: 1, feb: 2, februari: 2, pebruari: 2, february: 2, mar: 3, maret: 3, march: 3,
  apr: 4, april: 4, mei: 5, may: 5, jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7,
  agu: 8, agt: 8, ags: 8, agus: 8, agustus: 8, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, october: 10, nov: 11, nopember: 11, november: 11,
  des: 12, desember: 12, dec: 12, december: 12,
}

// Tanggal dari berbagai tulisan: 1975-03-12, 12/03/1975, 12-3-75, 12 Maret 1975, atau
// nomor seri Excel (mis. 27465). Tanggal ditulis hari dulu (kebiasaan Indonesia),
// kecuali angka kedua jelas hari (lebih dari 12). null bila kosong, undefined bila
// tidak dikenali.
export function parseImportDate(text: string, today = witaToday()): string | null | undefined {
  const value = text.trim().replace(/\s+/g, ' ')
  if (!value || value === '-') return null
  const iso = (y: number, m: number, d: number) => {
    const date = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    return isCalendarDate(date) ? date : undefined
  }
  const fullYear = (y: string) => {
    if (y.length === 4) return Number(y)
    const short = Number(y)
    return short <= Number(today.slice(2, 4)) ? 2000 + short : 1900 + short
  }

  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$/.exec(value)
  if (match) return iso(Number(match[1]), Number(match[2]), Number(match[3]))

  match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/.exec(value)
  if (match) {
    const a = Number(match[1])
    const b = Number(match[2])
    const [day, month] = a <= 12 && b > 12 ? [b, a] : [a, b]
    return iso(fullYear(match[3]), month, day)
  }

  match = /^(\d{1,2})[ -]([a-z]+)\.?[ -](\d{4}|\d{2})$/i.exec(value)
  if (match) {
    const month = MONTHS[match[2].toLowerCase()]
    return month ? iso(fullYear(match[3]), month, Number(match[1])) : undefined
  }

  // Nomor seri Excel lima digit (1927–2173) dari sel yang tidak berformat tanggal.
  match = /^(\d{5})(?:\.\d+)?$/.exec(value)
  if (match) {
    const date = new Date(Date.UTC(1899, 11, 30) + Number(match[1]) * 86_400_000)
    return date.toISOString().slice(0, 10)
  }
  return undefined
}

export type NormalizedImportRow = {
  family: {
    kk_number: string
    family_head_name: string
    rayon: string
    address: string
    phone: string
  }
  // Siap diperiksa parseMemberInput (tanpa family_id).
  member: Record<string, unknown>
  // Nilai yang tidak dikenali, per kolom impor.
  errors: FieldErrors
}

export function normalizeImportRow(values: ImportValues, today = witaToday()): NormalizedImportRow {
  const errors: FieldErrors = {}
  const text = (key: ImportColumnKey) => (values[key] ?? '').trim()
  const member: Record<string, unknown> = {}

  const pick = <T>(key: ImportColumnKey, words: Record<string, T>, hint: string) => {
    const raw = text(key)
    if (!raw || raw === '-') return null
    const found = words[simplify(raw)]
    if (found === undefined) errors[key] = [`${headerOf(key)} “${raw}” tidak dikenali. ${hint}`]
    return found ?? null
  }

  member.church_member_number = text('church_member_number')
  member.nik = text('nik')
  member.full_name = text('full_name')
  member.birth_place = text('birth_place')
  member.education = text('education')
  member.occupation = text('occupation')

  const gender = pick('gender', GENDER_WORDS, 'Isi L atau P.')
  if (!gender && !errors.gender) errors.gender = ['Jenis Kelamin wajib diisi (L atau P).']
  member.gender = gender ?? ''

  const relation = pick(
    'family_relation',
    RELATION_WORDS,
    'Isi Kepala Keluarga, Istri, Suami, Anak, atau Tanggungan.',
  )
  if (!relation && !errors.family_relation)
    errors.family_relation = ['Hubungan Keluarga wajib diisi.']
  member.family_relation = relation ?? ''

  member.categorical_group = pick(
    'categorical_group',
    CATEGORY_WORDS,
    'Isi PAR, Pemuda, Kaum Ibu, Kaum Bapak, atau Lansia.',
  )
  member.marriage_status = pick(
    'marriage_status',
    MARRIAGE_WORDS,
    'Isi Belum menikah, Menikah, Cerai hidup, atau Cerai mati.',
  )
  member.status = pick('status', STATUS_WORDS, 'Isi Aktif, Pindah, atau Meninggal.') ?? 'ACTIVE'

  const blood = text('blood_type').toUpperCase().replace(/\s/g, '')
  if (blood && blood !== '-') {
    const normalized = blood === '0' ? 'O' : blood.replace(/[+-]$/, '')
    if (['A', 'B', 'AB', 'O'].includes(normalized)) member.blood_type = normalized
    else
      errors.blood_type = [
        `Golongan Darah “${text('blood_type')}” tidak dikenali. Isi A, B, AB, atau O.`,
      ]
  }

  for (const key of ['baptism_status', 'sidi_status'] as const) {
    const raw = simplify(text(key))
    if (!raw) continue
    if (YES.has(raw)) member[key] = true
    else if (NO.has(raw)) member[key] = false
    else errors[key] = [`${headerOf(key)} “${text(key)}” tidak dikenali. Isi Sudah atau Belum.`]
  }

  for (const key of ['birth_date', 'baptism_date', 'sidi_date', 'marriage_date'] as const) {
    const raw = text(key)
    const date = parseImportDate(raw, today)
    if (date === undefined) {
      errors[key] = /^\d{4}$/.test(raw)
        ? [`${headerOf(key)} hanya berisi tahun (${raw}); isi tanggal lengkap.`]
        : [`${headerOf(key)} “${raw}” tidak dikenali. Contoh: 1975-03-12 atau 12/03/1975.`]
    } else member[key] = date
  }

  // Nomor ponsel yang tersimpan sebagai angka di Excel kehilangan angka 0 di depannya.
  let phone = text('phone').replace(/[\s().-]/g, '')
  if (/^8\d{8,11}$/.test(phone)) phone = `0${phone}`

  return {
    family: {
      kk_number: text('kk_number'),
      family_head_name: text('family_head_name'),
      rayon: text('rayon'),
      address: text('address'),
      phone,
    },
    member,
    errors,
  }
}

function headerOf(key: ImportColumnKey): string {
  return IMPORT_COLUMNS.find((column) => column.key === key)?.header ?? key
}

// Kunci pencocokan nama rayon: huruf besar/kecil, spasi, tanda baca, awalan "Rayon",
// dan huruf h diabaikan, sehingga "GETSEMANI", "Rayon Gethsemani", dan "golgotha"
// tetap cocok dengan rayonnya.
export function rayonKey(name: string): string {
  return simplify(name)
    .replace(/^rayon/, '')
    .replaceAll('h', '')
}

// ---------- Ekspor ----------

export type ExportMember = MemberWithFamily & { address: string | null; phone: string | null }

// Satu baris ekspor, urut sesuai IMPORT_COLUMNS, sehingga berkas ekspor bisa diimpor ulang.
export function exportRow(member: ExportMember): SheetCell[] {
  const date = (value: string | null) => (value ? { date: value } : null)
  const cells: Record<ImportColumnKey, SheetCell> = {
    kk_number: member.kk_number,
    family_head_name: member.family_head_name,
    rayon: member.rayon_name,
    address: member.address,
    phone: member.phone,
    church_member_number: member.church_member_number,
    nik: member.nik,
    full_name: member.full_name,
    gender: GENDER_LABELS[member.gender],
    family_relation: FAMILY_RELATION_LABELS[member.family_relation],
    birth_place: member.birth_place,
    birth_date: date(member.birth_date),
    blood_type: member.blood_type,
    education: member.education,
    occupation: member.occupation,
    categorical_group: member.categorical_group
      ? CATEGORICAL_GROUP_LABELS[member.categorical_group]
      : null,
    baptism_status: member.baptism_status ? 'Sudah' : 'Belum',
    baptism_date: date(member.baptism_date),
    sidi_status: member.sidi_status ? 'Sudah' : 'Belum',
    sidi_date: date(member.sidi_date),
    marriage_status: member.marriage_status ? MARRIAGE_STATUS_LABELS[member.marriage_status] : null,
    marriage_date: date(member.marriage_date),
    status: MEMBER_STATUS_LABELS[member.status],
  }
  return IMPORT_COLUMNS.map((column) => cells[column.key])
}

// Teks sel untuk CSV.
export function cellText(cell: SheetCell): string {
  if (cell === null) return ''
  if (typeof cell === 'object') return cell.date
  return String(cell)
}
