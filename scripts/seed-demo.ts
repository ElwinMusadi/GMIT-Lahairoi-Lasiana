// Data demo lengkap untuk database D1 lokal, agar Portal Publik dan dashboard dapat dilihat
// utuh: ±295 KK dan ±1.200 jiwa di lima rayon, jadwal ibadah 2026 beserta petugas dan
// kehadiran, renungan, warta (PDF), berita, galeri, profil, rekening & QRIS contoh,
// keuangan 2026 per Pos Kas (RAPBJ, transaksi, kuitansi), layanan sakramen, arsip surat,
// inventaris & peminjaman, akun pengurus contoh, dan log aktivitas.
//
//   npm run db:seed:demo                isi database lokal (belum boleh berisi data jemaat)
//   npm run db:seed:demo -- --dry-run   hanya hitung dan tampilkan ringkasan
//
// Khusus database lokal. Bersihkan dengan `npm run db:reset:local`. Datanya potret akhir
// Oktober 2026; nama orang, nomor rekening, dan kejadian jemaat adalah contoh (lihat
// scripts/demo/texts.ts). Kata sandi akun contoh ditulis ke scripts/demo-accounts.local.

import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { getPlatformProxy } from 'wrangler'
import { hashPassword } from '../src/worker/lib/password.ts'
import { textPdf, type PdfLine } from './demo/pdf.ts'
import {
  ASSETS,
  DEVOTIONALS,
  GALLERY,
  MAILS,
  NEWS,
  PASTORS,
  PAYMENT_ACCOUNTS,
  PROFILE_HISTORY,
  PROFILE_MISSION,
  PROFILE_NAME_MEANING,
  PROFILE_OFFICE,
  PROFILE_VISION,
  RAYON_AREAS,
  SPECIAL_SERVICES,
  SUNDAY_READINGS,
  type Photo,
} from './demo/texts.ts'

if (process.argv.includes('--remote')) {
  console.error('✖ Data demo hanya untuk database lokal, bukan database Cloudflare.')
  process.exit(1)
}
const dryRun = process.argv.includes('--dry-run')
const root = path.resolve(import.meta.dirname, '..')
const TODAY = '2026-10-29'
// Petugas dijadwalkan sampai tiga minggu ke depan; jadwal sesudahnya belum berpetugas.
const SERVANTS_UNTIL = '2026-11-22'

// ---------------------------------------------------------------------------------------
// Binding D1 dan R2 lokal (sama dengan yang dipakai `npm run dev`).

type Statement = {
  bind(...values: unknown[]): Statement
  all<T>(): Promise<{ results: T[] }>
  first<T>(): Promise<T | null>
  run(): Promise<unknown>
}
type Database = {
  prepare(sql: string): Statement
  batch(statements: Statement[]): Promise<unknown[]>
}
type Bucket = {
  put(
    key: string,
    value: Uint8Array,
    options: {
      httpMetadata: { contentType: string; contentDisposition: string }
      customMetadata: Record<string, string>
    },
  ): Promise<unknown>
}

const { env, dispose } = await getPlatformProxy<{ DB: Database; FILES: Bucket }>({
  configPath: path.join(root, 'wrangler.toml'),
})
const db = env.DB

function fail(message: string): never {
  console.error(`\n✖ ${message}`)
  process.exit(1)
}

const existing = await db
  .prepare(
    `SELECT (SELECT count(*) FROM families) + (SELECT count(*) FROM members)
          + (SELECT count(*) FROM public_contents) + (SELECT count(*) FROM worship_schedules)
          + (SELECT count(*) FROM finance_transactions) + (SELECT count(*) FROM finance_budgets)
          + (SELECT count(*) FROM sacrament_applications) + (SELECT count(*) FROM mail_archives)
          + (SELECT count(*) FROM assets) AS total`,
  )
  .first<{ total: number }>()
if (!dryRun && existing && existing.total > 0) {
  await dispose()
  fail(
    'Database lokal sudah berisi data. Kosongkan dulu dengan `npm run db:reset:local`, ' +
      'lalu jalankan `npm run db:seed:demo` lagi.',
  )
}
const admin = await db
  .prepare("SELECT id FROM users WHERE role = 'ADMIN' AND is_active = 1 ORDER BY id LIMIT 1")
  .first<{ id: number }>()
if (!admin) fail('Akun Admin belum ada. Jalankan `npm run db:seed:local` lebih dulu.')
const rayonRows = (
  await db.prepare('SELECT id, name FROM rayons ORDER BY id').all<{ id: number; name: string }>()
).results
const RAYONS = rayonRows.filter((rayon) => rayon.name in RAYON_AREAS)
if (RAYONS.length !== 5) fail('Lima rayon bawaan (Getsemani … Kapernaum) belum lengkap.')
const fundRows = (
  await db.prepare('SELECT id, code FROM finance_funds').all<{ id: number; code: string }>()
).results
const FUND = Object.fromEntries(fundRows.map((fund) => [fund.code.toUpperCase(), fund.id]))
for (const code of ['UMUM', 'PEMBANGUNAN', 'DIAKONIA', 'KATEGORIAL']) {
  if (!FUND[code]) fail(`Pos Kas ${code} belum ada. Jalankan \`npm run db:seed:local\` lebih dulu.`)
}

// ---------------------------------------------------------------------------------------
// Acak tetap (hasil sama setiap dijalankan) dan tanggal.

let state = 20261029
function random() {
  state = (state + 0x6d2b79f5) | 0
  let t = Math.imul(state ^ (state >>> 15), 1 | state)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1))
const chance = (p: number) => random() < p
const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)]
function weighted<T>(entries: [T, number][]): T {
  let roll = random() * entries.reduce((sum, [, weight]) => sum + weight, 0)
  for (const [value, weight] of entries) {
    roll -= weight
    if (roll < 0) return value
  }
  return entries[entries.length - 1][0]
}
// Nominal persembahan: kelipatan Rp500.
const money = (min: number, max: number, factor = 1) =>
  Math.round(((min + random() * (max - min)) * factor) / 500) * 500

const DAY = 86_400_000
const pad = (n: number, width = 2) => String(n).padStart(width, '0')
const time = (date: string) => Date.parse(`${date}T00:00:00Z`)
const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const addDays = (date: string, days: number) => isoDate(time(date) + days * DAY)
const weekday = (date: string) => new Date(time(date)).getUTCDay()
const nextWeekday = (date: string, day: number) => addDays(date, (day - weekday(date) + 7) % 7)
const randomDate = (from: string, to: string) =>
  isoDate(time(from) + Math.floor(random() * ((time(to) - time(from)) / DAY + 1)) * DAY)
// Waktu WITA → kolom datetime UTC "YYYY-MM-DD HH:MM:SS" (format SQLite datetime('now')).
const utc = (date: string, clock = '09:00') =>
  new Date(Date.parse(`${date}T${clock}:00+08:00`)).toISOString().slice(0, 19).replace('T', ' ')
const ageOn = (birth: string, date: string) => {
  const years = Number(date.slice(0, 4)) - Number(birth.slice(0, 4))
  return date.slice(5) < birth.slice(5) ? years - 1 : years
}
const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const longDate = (date: string) =>
  `${Number(date.slice(8))} ${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`
const dayDate = (date: string) => `${DAYS[weekday(date)]}, ${longDate(date)}`
const rupiah = (amount: number) => `Rp${amount.toLocaleString('id-ID')}`
const slugify = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')

// Paskah (algoritma Gregorian anonim) untuk tanggal Pentakosta tiap tahun.
function easter(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const h =
    (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30
  const l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  return `${year}-${pad(month)}-${pad(((h + l - 7 * m + 114) % 31) + 1)}`
}
const pentecost = (year: number) => addDays(easter(year), 49)

// ---------------------------------------------------------------------------------------
// Jemaat: keluarga dan anggota.

type Gender = 'MALE' | 'FEMALE'
type Relation = 'HEAD' | 'SPOUSE' | 'CHILD' | 'DEPENDENT'
type Marriage = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED'
type Person = {
  id: number
  number: string
  family: Family
  name: string
  gender: Gender
  birthPlace: string
  birthDate: string
  blood: string | null
  relation: Relation
  education: string | null
  occupation: string | null
  baptismDate: string | null
  baptized: boolean
  sidiDate: string | null
  sidi: boolean
  marriage: Marriage | null
  marriageDate: string | null
  status: 'ACTIVE' | 'MOVED' | 'DECEASED'
  deathDate?: string
}
type Family = {
  id: number
  kk: string
  rayonId: number
  rayon: string
  address: string
  members: Person[]
}

const MALE_NAMES = [
  'Yohanis',
  'Marthen',
  'Daniel',
  'Yosua',
  'Samuel',
  'Simon',
  'Petrus',
  'Paulus',
  'Stefanus',
  'Yakob',
  'Yusuf',
  'Benyamin',
  'Hendrikus',
  'Markus',
  'Lukas',
  'Matius',
  'Timotius',
  'Titus',
  'Obed',
  'Habel',
  'Nikodemus',
  'Melkianus',
  'Mesakh',
  'Yeskiel',
  'Yermias',
  'Imanuel',
  'Abraham',
  'Ishak',
  'Elia',
  'Gidion',
  'Kornelis',
  'Dominggus',
  'Semuel',
  'Zakarias',
  'Ferdinand',
  'Alfred',
  'Ronald',
  'Jefri',
  'Agustinus',
  'Adrianus',
  'Bernadus',
  'Lambertus',
  'Arnoldus',
  'Hermanus',
  'Kristofel',
  'Yunus',
  'Fredrik',
  'Andreas',
  'Filipus',
  'Rudolf',
]
const FEMALE_NAMES = [
  'Maria',
  'Yohana',
  'Martha',
  'Ester',
  'Debora',
  'Rut',
  'Naomi',
  'Sara',
  'Lidia',
  'Febe',
  'Priskila',
  'Dorkas',
  'Magdalena',
  'Kristina',
  'Yuliana',
  'Adriana',
  'Selfina',
  'Orpa',
  'Welhelmina',
  'Novita',
  'Delfina',
  'Yunita',
  'Agustina',
  'Elisabeth',
  'Margaretha',
  'Anace',
  'Yakomina',
  'Paulina',
  'Fransina',
  'Mince',
  'Hana',
  'Rahel',
  'Susana',
  'Bertha',
  'Antoneta',
  'Damaris',
  'Mariana',
  'Dorothea',
  'Seprianti',
  'Yuneti',
]
const YOUNG_MALE = [
  'Kevin',
  'Rio',
  'Gabriel',
  'Nathan',
  'Rafael',
  'Joshua',
  'Christian',
  'Valentino',
  'Steven',
  'Ricky',
  'Glen',
  'Jordan',
  'Yehezkiel',
  'Rendy',
  'Aldo',
  'Gilbert',
  'Marvel',
  'Andrew',
  'Natanael',
  'Elkana',
  'Jonathan',
  'Michael',
  'Arnold',
  'Kenzo',
  'Theo',
  'Daniel',
  'Yosua',
  'Samuel',
  'Imanuel',
  'Abraham',
]
const YOUNG_FEMALE = [
  'Grace',
  'Gloria',
  'Kezia',
  'Keren',
  'Michelle',
  'Jessica',
  'Angel',
  'Stevani',
  'Christin',
  'Natalia',
  'Valentina',
  'Cindy',
  'Chelsea',
  'Gisela',
  'Imelda',
  'Yemima',
  'Abigail',
  'Sefanya',
  'Clara',
  'Nadia',
  'Jovita',
  'Felicia',
  'Priska',
  'Talita',
  'Kirana',
  'Aurelia',
  'Bella',
  'Ester',
  'Debora',
  'Naomi',
]
const SURNAMES = [
  'Bire',
  'Dimu',
  'Kana',
  'Lay',
  'Haning',
  'Riwu',
  'Djami',
  'Tallo',
  'Lede',
  'Ratu',
  'Lado',
  'Ga',
  'Hede',
  'Wadu',
  'Dida',
  'Bunga',
  'Huma',
  'Rihi',
  'Ludji',
  'Rohi',
  'Mone',
  'Djawa',
  'Logo',
  'Mangi',
  'Lodo',
  'Balla',
  'Dethan',
  'Nalle',
  'Pah',
  'Tefa',
  'Ndun',
  'Kore',
  'Medah',
  'Manafe',
  'Pandie',
  'Mooy',
  'Ndolu',
  'Messakh',
  'Henukh',
  'Lomi',
  'Bessie',
  'Tanya',
  'Raja',
  'Doko',
  'Kadja',
  'Talo',
  'Radja',
  'Bara',
  'Uly',
  'Tede',
  'Nguru',
  'Huru',
]
const BIRTH_PLACES: [string, number][] = [
  ['Kupang', 55],
  ['Seba', 14],
  ["Ba'a", 6],
  ['Soe', 5],
  ['Kefamenanu', 4],
  ['Atambua', 3],
  ['Kalabahi', 3],
  ['Waingapu', 3],
  ['Ende', 2],
  ['Maumere', 2],
  ['Oelamasi', 3],
]
const BLOOD: [string | null, number][] = [
  ['O', 26],
  ['B', 20],
  ['A', 18],
  ['AB', 6],
  [null, 30],
]

const families: Family[] = []
const people: Person[] = []
const usedNames = new Set<string>()

function firstName(gender: Gender, birthYear: number) {
  const young = birthYear >= 1995
  return pick(
    gender === 'MALE' ? (young ? YOUNG_MALE : MALE_NAMES) : young ? YOUNG_FEMALE : FEMALE_NAMES,
  )
}
function uniqueName(gender: Gender, birthYear: number, surname: string) {
  for (let attempt = 0; ; attempt++) {
    const name = `${firstName(gender, birthYear)} ${surname}`
    if (!usedNames.has(name) || attempt > 8) {
      usedNames.add(name)
      return name
    }
  }
}
function education(age: number) {
  if (age < 6) return null
  if (age <= 12) return 'SD'
  if (age <= 15) return 'SMP'
  if (age <= 18) return 'SMA/SMK'
  if (age >= 65)
    return weighted([
      ['SD', 35],
      ['SMP', 25],
      ['SMA/SMK', 25],
      ['S1', 15],
    ])
  return weighted([
    ['SD', 8],
    ['SMP', 12],
    ['SMA/SMK', 40],
    ['D3', 9],
    ['S1', 27],
    ['S2', 4],
  ])
}
function occupation(person: Person, age: number) {
  if (age < 6) return null
  if (age <= 18) return 'Pelajar'
  if (age <= 23 && chance(0.55)) return 'Mahasiswa'
  if (age >= 60) {
    return person.gender === 'MALE'
      ? weighted([
          ['Pensiunan PNS', 40],
          ['Petani', 25],
          ['Nelayan', 15],
          ['Wiraswasta', 20],
        ])
      : weighted([
          ['Ibu Rumah Tangga', 55],
          ['Pensiunan PNS', 25],
          ['Pedagang', 10],
          ['Penenun', 10],
        ])
  }
  if (age <= 25 && chance(0.3)) return 'Belum bekerja'
  return person.gender === 'MALE'
    ? weighted([
        ['Wiraswasta', 16],
        ['PNS', 14],
        ['Karyawan Swasta', 12],
        ['Nelayan', 7],
        ['Petani', 5],
        ['Sopir', 6],
        ['Tukang Bangunan', 7],
        ['Pedagang', 6],
        ['Guru', 7],
        ['TNI', 3],
        ['Polri', 4],
        ['Tenaga Honorer', 5],
        ['Dosen', 1],
        ['Montir', 3],
      ])
    : weighted([
        ['Ibu Rumah Tangga', 33],
        ['Guru', 12],
        ['PNS', 12],
        ['Pedagang', 10],
        ['Wiraswasta', 8],
        ['Perawat', 5],
        ['Bidan', 3],
        ['Karyawan Swasta', 8],
        ['Tenaga Honorer', 6],
        ['Penenun', 3],
      ])
}
// Sabtu acak dalam tahun itu (pemberkatan nikah umumnya hari Sabtu).
const saturdayIn = (year: number) => {
  const capped = Math.min(year, 2025)
  return nextWeekday(randomDate(`${capped}-01-10`, `${capped}-12-20`), 6)
}

function addPerson(
  family: Family,
  fields: Pick<Person, 'name' | 'gender' | 'birthDate' | 'relation'> & Partial<Person>,
) {
  const age = ageOn(fields.birthDate, TODAY)
  const person: Person = {
    id: 0,
    number: '',
    family,
    birthPlace: weighted(BIRTH_PLACES),
    blood: weighted(BLOOD),
    education: null,
    occupation: null,
    baptismDate: null,
    baptized: false,
    sidiDate: null,
    sidi: false,
    marriage: age >= 17 ? 'SINGLE' : null,
    marriageDate: null,
    status: 'ACTIVE',
    ...fields,
  }
  if (fields.relation === 'CHILD' && fields.birthPlace === undefined) {
    person.birthPlace = chance(0.9) ? 'Kupang' : 'Seba'
  }
  if (fields.education === undefined) person.education = education(age)
  if (fields.occupation === undefined) person.occupation = occupation(person, age)
  family.members.push(person)
  return person
}

function newFamily(rayonName: string): Family {
  const rayon = RAYONS.find((item) => item.name === rayonName)!
  const area = RAYON_AREAS[rayonName]
  const family: Family = {
    id: families.length + 1,
    kk: `KK-${pad(families.length + 1, 3)}`,
    rayonId: rayon.id,
    rayon: rayonName,
    address: `RT ${pad(int(area.rt[0], area.rt[1]), 3)}/RW ${pad(pick(area.rw), 3)}, Kel. Lasiana, Kec. Kelapa Lima, Kota Kupang`,
    members: [],
  }
  families.push(family)
  return family
}

function addChildren(family: Family, surname: string, from: string, count: number) {
  let birth = from
  for (let i = 0; i < count; i++) {
    if (birth > '2026-09-15') break
    const gender: Gender = chance(0.5) ? 'MALE' : 'FEMALE'
    const age = ageOn(birth, TODAY)
    // Anak dewasa yang sudah merantau atau berkeluarga tidak lagi tercatat di KK ini.
    if (age < 26 || chance(0.45)) {
      addPerson(family, {
        name: uniqueName(gender, Number(birth.slice(0, 4)), surname),
        gender,
        birthDate: birth,
        relation: 'CHILD',
      })
    }
    birth = addDays(birth, int(420, 1500))
  }
}

type Couple = {
  head: [string, number | string]
  spouse?: [string, number | string]
  married?: string
  children?: [string, Gender, string][]
  randomChildren?: number
}
const asDate = (value: number | string) =>
  typeof value === 'string' ? value : `${value}-${pad(int(1, 12))}-${pad(int(1, 28))}`

// Keluarga yang namanya dipakai di jadwal, berita, dan layanan sakramen.
function keyFamily(rayon: string, spec: Couple) {
  const family = newFamily(rayon)
  const [headName, headBirth] = spec.head
  const surname = headName.split(' ').at(-1)!
  const female =
    FEMALE_NAMES.includes(headName.split(' ')[0]) || YOUNG_FEMALE.includes(headName.split(' ')[0])
  usedNames.add(headName)
  const head = addPerson(family, {
    name: headName,
    gender: female ? 'FEMALE' : 'MALE',
    birthDate: asDate(headBirth),
    relation: 'HEAD',
  })
  const married =
    spec.married ??
    (spec.spouse ? saturdayIn(Number(head.birthDate.slice(0, 4)) + int(25, 30)) : null)
  if (spec.spouse) {
    usedNames.add(spec.spouse[0])
    addPerson(family, {
      name: spec.spouse[0],
      gender: female ? 'MALE' : 'FEMALE',
      birthDate: asDate(spec.spouse[1]),
      relation: 'SPOUSE',
      marriage: 'MARRIED',
      marriageDate: married,
    })
    head.marriage = 'MARRIED'
    head.marriageDate = married
  }
  for (const [name, gender, birth] of spec.children ?? []) {
    usedNames.add(name)
    addPerson(family, { name, gender, birthDate: birth, relation: 'CHILD' })
  }
  if (spec.randomChildren && married) {
    addChildren(family, surname, addDays(married, int(300, 700)), spec.randomChildren)
  }
  return family
}

type Kind = 'couple' | 'young' | 'elderly' | 'widow' | 'widower' | 'single'
function randomFamily(rayon: string) {
  const family = newFamily(rayon)
  const kind = weighted<Kind>([
    ['couple', 70],
    ['young', 9],
    ['elderly', 6],
    ['widow', 8],
    ['widower', 3],
    ['single', 4],
  ])
  const surname = pick(SURNAMES)
  const spouseSurname = () => {
    let other = pick(SURNAMES)
    while (other === surname) other = pick(SURNAMES)
    return other
  }
  const headYear =
    kind === 'young'
      ? int(1990, 1998)
      : kind === 'elderly'
        ? int(1940, 1957)
        : kind === 'single'
          ? int(1975, 1996)
          : int(1956, 1990)
  const headGender: Gender =
    kind === 'widow' ? 'FEMALE' : kind === 'single' && chance(0.4) ? 'FEMALE' : 'MALE'
  const headSurname = headGender === 'FEMALE' && kind === 'widow' ? spouseSurname() : surname
  const head = addPerson(family, {
    name: uniqueName(headGender, headYear, headSurname),
    gender: headGender,
    birthDate: asDate(headYear),
    relation: 'HEAD',
  })
  if (kind === 'single') {
    if (chance(0.35)) {
      const parentYear = int(1938, 1952)
      addPerson(family, {
        name: uniqueName('FEMALE', parentYear, spouseSurname()),
        gender: 'FEMALE',
        birthDate: asDate(parentYear),
        relation: 'DEPENDENT',
        marriage: 'WIDOWED',
      })
    }
    return family
  }
  const marriedYear = Math.min(headYear + int(24, 31), kind === 'young' ? 2024 : 2023)
  const married = saturdayIn(marriedYear)
  head.marriage = kind === 'widow' || kind === 'widower' ? 'WIDOWED' : 'MARRIED'
  head.marriageDate = married
  if (kind === 'couple' || kind === 'young' || kind === 'elderly') {
    const spouseYear = headYear + int(-1, 6)
    addPerson(family, {
      name: uniqueName('FEMALE', spouseYear, spouseSurname()),
      gender: 'FEMALE',
      birthDate: asDate(spouseYear),
      relation: 'SPOUSE',
      marriage: 'MARRIED',
      marriageDate: married,
    })
  }
  const count =
    kind === 'young'
      ? weighted([
          [0, 2],
          [1, 4],
          [2, 3],
          [3, 1],
        ])
      : kind === 'elderly'
        ? weighted([
            [0, 7],
            [1, 3],
          ])
        : weighted([
            [0, 5],
            [1, 15],
            [2, 30],
            [3, 28],
            [4, 15],
            [5, 7],
          ])
  const firstBirth = addDays(married, int(300, 800))
  addChildren(family, surname, firstBirth, count)
  // Pasangan muda: sebagian punya bayi yang lahir 2025–2026 (calon baptisan).
  if (kind === 'young' && chance(0.6)) {
    const birth = randomDate('2025-02-01', '2026-09-10')
    const last = family.members.at(-1)!
    if (last.relation !== 'CHILD' || time(birth) - time(last.birthDate) > 400 * DAY) {
      const gender: Gender = chance(0.5) ? 'MALE' : 'FEMALE'
      addPerson(family, {
        name: uniqueName(gender, 2025, surname),
        gender,
        birthDate: birth,
        relation: 'CHILD',
      })
    }
  }
  // Tanggungan: orang tua lanjut usia, atau keponakan dari kampung yang bersekolah di Kupang.
  if (chance(0.1)) {
    if (chance(0.5)) {
      const year = int(1936, 1950)
      addPerson(family, {
        name: uniqueName('FEMALE', year, spouseSurname()),
        gender: 'FEMALE',
        birthDate: asDate(year),
        relation: 'DEPENDENT',
        marriage: 'WIDOWED',
      })
    } else {
      const year = int(2004, 2010)
      const gender: Gender = chance(0.5) ? 'MALE' : 'FEMALE'
      addPerson(family, {
        name: uniqueName(gender, year, spouseSurname()),
        gender,
        birthDate: asDate(year),
        relation: 'DEPENDENT',
        birthPlace: pick(['Seba', 'Seba', "Ba'a", 'Kalabahi']),
      })
    }
  }
  return family
}

// Majelis Jemaat (contoh) beserta keluarganya.
const MAJELIS: {
  title: 'Pnt.' | 'Dkn.'
  name: string
  rayon: string
  office: string
  coordinator?: boolean
}[] = [
  { title: 'Pnt.', name: 'Markus Lodo', rayon: 'Tiberias', office: 'Wakil Ketua Majelis Jemaat' },
  { title: 'Pnt.', name: 'Selfina Ludji', rayon: 'Getsemani', office: 'Sekretaris Majelis Jemaat' },
  { title: 'Dkn.', name: 'Marthen Bire', rayon: 'Golgota', office: 'Bendahara Majelis Jemaat' },
  {
    title: 'Pnt.',
    name: 'Frans Dethan',
    rayon: 'Getsemani',
    office: 'Koordinator Rayon Getsemani',
    coordinator: true,
  },
  {
    title: 'Pnt.',
    name: 'Yohanis Dimu',
    rayon: 'Golgota',
    office: 'Koordinator Rayon Golgota',
    coordinator: true,
  },
  {
    title: 'Pnt.',
    name: 'Debora Tallo',
    rayon: 'Tiberias',
    office: 'Koordinator Rayon Tiberias',
    coordinator: true,
  },
  {
    title: 'Pnt.',
    name: 'Hendrikus Ratu',
    rayon: 'Galilea',
    office: 'Koordinator Rayon Galilea',
    coordinator: true,
  },
  {
    title: 'Pnt.',
    name: 'Daniel Balla',
    rayon: 'Kapernaum',
    office: 'Koordinator Rayon Kapernaum',
    coordinator: true,
  },
  { title: 'Dkn.', name: 'Obed Haning', rayon: 'Getsemani', office: 'Diaken Rayon Getsemani' },
  { title: 'Pnt.', name: 'Maria Lede', rayon: 'Golgota', office: 'Penatua Rayon Golgota' },
  { title: 'Dkn.', name: 'Habel Kana', rayon: 'Golgota', office: 'Diaken Rayon Golgota' },
  { title: 'Dkn.', name: 'Simon Rihi', rayon: 'Tiberias', office: 'Diaken Rayon Tiberias' },
  { title: 'Pnt.', name: 'Yuliana Hede', rayon: 'Galilea', office: 'Penatua Rayon Galilea' },
  { title: 'Dkn.', name: 'Petrus Wadu', rayon: 'Galilea', office: 'Diaken Rayon Galilea' },
  { title: 'Pnt.', name: 'Ester Djami', rayon: 'Kapernaum', office: 'Penatua Rayon Kapernaum' },
  { title: 'Dkn.', name: 'Nikodemus Mone', rayon: 'Kapernaum', office: 'Diaken Rayon Kapernaum' },
]

// Getsemani
keyFamily('Getsemani', {
  head: ['Frans Dethan', 1968],
  spouse: ['Magdalena Huma', 1971],
  randomChildren: 3,
})
keyFamily('Getsemani', {
  head: ['Yakob Nalle', 1970],
  spouse: ['Selfina Ludji', 1974],
  randomChildren: 2,
})
keyFamily('Getsemani', {
  head: ['Obed Haning', 1979],
  spouse: ['Delfina Mooy', 1982],
  children: [
    ['Rio Haning', 'MALE', '2004-05-17'],
    ['Talita Haning', 'FEMALE', '2008-11-02'],
  ],
})
keyFamily('Getsemani', {
  head: ['Adrianus Tefa', 1972],
  spouse: ['Kristina Bunga', 1975],
  children: [['Stefanus Tefa', 'MALE', '2001-02-11']],
  randomChildren: 2,
})
keyFamily('Getsemani', {
  head: ['Yermias Ndun', 1969],
  spouse: ['Paulina Raja', 1971],
  children: [['Clara Ndun', 'FEMALE', '1998-09-23']],
})
keyFamily('Getsemani', {
  head: ['Kornelis Pandie', 1961],
  spouse: ['Yakomina Doko', 1964],
  children: [['Rahel Pandie', 'FEMALE', '1990-04-14']],
  randomChildren: 2,
})
// Golgota
keyFamily('Golgota', {
  head: ['Yohanis Dimu', 1966],
  spouse: ['Adriana Tanya', 1968],
  randomChildren: 3,
})
keyFamily('Golgota', {
  head: ['Simon Mangi', 1967],
  spouse: ['Maria Lede', 1970],
  randomChildren: 3,
})
keyFamily('Golgota', {
  head: ['Habel Kana', 1976],
  spouse: ['Rut Henukh', 1978],
  children: [['Lidia Kana', 'FEMALE', '2002-06-30']],
  randomChildren: 1,
})
keyFamily('Golgota', {
  head: ['Marthen Bire', 1969],
  spouse: ['Yohana Logo', 1972],
  children: [
    ['Ester Bire', 'FEMALE', '1999-03-18'],
    ['Febe Bire', 'FEMALE', '2003-08-09'],
    ['Samuel Bire', 'MALE', '2006-12-01'],
  ],
})
keyFamily('Golgota', {
  head: ['Yosua Kana', '1995-01-22'],
  spouse: ['Debora Rohi', '1997-10-05'],
  married: '2026-02-14',
})
// Tiberias
keyFamily('Tiberias', {
  head: ['Markus Lodo', 1964],
  spouse: ['Welhelmina Ga', 1966],
  randomChildren: 3,
})
keyFamily('Tiberias', {
  head: ['Imanuel Djawa', 1969],
  spouse: ['Debora Tallo', 1972],
  randomChildren: 2,
})
keyFamily('Tiberias', {
  head: ['Simon Rihi', 1980],
  spouse: ['Yunita Bessie', 1983],
  randomChildren: 3,
})
keyFamily('Tiberias', {
  head: ['Lambertus Ga', '1948-03-12'],
  spouse: ['Orpa Lomi', '1952-07-19'],
  children: [['Yuliana Ga', 'FEMALE', '1983-01-27']],
})
keyFamily('Tiberias', {
  head: ['Ferdinand Pah', 1968],
  spouse: ['Mariana Tede', 1971],
  children: [
    ['Arnold Pah', 'MALE', '1997-04-03'],
    ['Obed Pah', 'MALE', '2000-10-12'],
  ],
})
keyFamily('Tiberias', {
  head: ['Rendy Medah', '1996-03-09'],
  spouse: ['Priska Tefa', '1998-12-14'],
  married: '2026-10-10',
})
// Galilea
keyFamily('Galilea', {
  head: ['Hendrikus Ratu', 1965],
  spouse: ['Margaretha Dida', 1967],
  children: [['Steven Ratu', 'MALE', '1998-05-25']],
  randomChildren: 2,
})
keyFamily('Galilea', {
  head: ['Kornelis Doko', 1972],
  spouse: ['Yuliana Hede', 1975],
  randomChildren: 2,
})
keyFamily('Galilea', {
  head: ['Petrus Wadu', 1977],
  spouse: ['Seprianti Kadja', 1980],
  randomChildren: 3,
})
keyFamily('Galilea', {
  head: ['Yakob Lay', 1966],
  spouse: ['Ruth Kore', 1969],
  children: [
    ['Daniel Lay', 'MALE', '1997-07-02'],
    ['Natalia Lay', 'FEMALE', '2001-12-19'],
  ],
})
keyFamily('Galilea', {
  head: ['Andreas Lado', 1967],
  spouse: ['Novita Rohi', 1985],
  children: [['Imanuel Lado', 'MALE', '1996-02-28']],
})
keyFamily('Galilea', {
  head: ['Natanael Dida', '1996-08-30'],
  spouse: ['Kezia Hede', '1999-02-16'],
  married: '2026-06-20',
})
// Kapernaum
keyFamily('Kapernaum', {
  head: ['Daniel Balla', 1967],
  spouse: ['Mince Uly', 1970],
  randomChildren: 3,
})
keyFamily('Kapernaum', {
  head: ['Hermanus Tanya', 1970],
  spouse: ['Ester Djami', 1973],
  randomChildren: 2,
})
keyFamily('Kapernaum', {
  head: ['Nikodemus Mone', 1978],
  spouse: ['Fransina Talo', 1981],
  randomChildren: 3,
})
keyFamily('Kapernaum', {
  head: ['Gidion Djami', 1975],
  spouse: ['Hana Radja', 1977],
  children: [['Kevin Djami', 'MALE', '2002-03-15']],
  randomChildren: 1,
})
keyFamily('Kapernaum', {
  head: ['Zakarias Lay', 1976],
  spouse: ['Antoneta Nguru', 1979],
  children: [['Grace Lay', 'FEMALE', '2003-09-07']],
})
keyFamily('Kapernaum', {
  head: ['Gabriel Bunga', '1997-11-11'],
  spouse: ['Yemima Logo', '1999-06-21'],
  married: '2026-08-08',
})
// Keluarga pindahan dari Seba (atestasi masuk April 2026).
const transferFamily = keyFamily('Kapernaum', {
  head: ['Melkianus Huma', 1980],
  spouse: ['Dorothea Nguru', 1983],
  randomChildren: 3,
})
for (const member of transferFamily.members)
  if (member.relation !== 'CHILD') member.birthPlace = 'Seba'

// ±330 KK dan ±1.200 jiwa aktif (PRD: sekitar 1.200 warga jemaat).
const FAMILY_COUNTS: Record<string, number> = {
  Getsemani: 72,
  Golgota: 68,
  Tiberias: 63,
  Galilea: 70,
  Kapernaum: 60,
}
for (const rayon of RAYONS) {
  let count = families.filter((family) => family.rayon === rayon.name).length
  while (count++ < FAMILY_COUNTS[rayon.name]) randomFamily(rayon.name)
}
families.sort((a, b) => a.rayonId - b.rayonId || a.id - b.id)
families.forEach((family, index) => {
  family.id = index + 1
  family.kk = `KK-${pad(index + 1, 3)}`
})
for (const family of families) {
  for (const person of family.members) {
    people.push(person)
    person.id = people.length
    person.number = `LHR-${pad(people.length, 4)}`
  }
}
const byName = new Map(people.map((person) => [person.name, person]))
const member = (name: string) => byName.get(name) ?? fail(`Anggota contoh ${name} tidak ada.`)

// Sakramen yang sudah dilayankan sebelum 2026: baptisan (Minggu, 2–9 bulan setelah lahir)
// dan sidi (Pentakosta pada usia 17). Data lama sering tanpa tanggal.
for (const person of people) {
  const age = ageOn(person.birthDate, TODAY)
  if (person.birthDate < '2025-01-01' && chance(0.97)) {
    person.baptized = true
    if (person.birthDate >= '1980-01-01' || chance(0.6)) {
      const date = nextWeekday(addDays(person.birthDate, int(60, 270)), 0)
      if (date < '2026-01-01') person.baptismDate = date
    }
  }
  if (age >= 18 && person.baptized && chance(0.93)) {
    const year = Number(person.birthDate.slice(0, 4)) + 17
    const date = pentecost(Math.max(year, 1960))
    person.sidi = true
    if (date < '2026-01-01' && (person.birthDate >= '1980-01-01' || chance(0.6)))
      person.sidiDate = date
  }
}

// Baptisan Kudus 2026 (Buku Induk) untuk bayi yang lahir Februari 2025 – Januari 2026.
const BAPTISM_SUNDAYS: [string, number][] = [
  ['2026-01-25', 3],
  ['2026-04-05', 5],
  ['2026-07-26', 2],
  ['2026-10-04', 3],
]
const baptisms2026: { person: Person; date: string }[] = []
for (const infant of people
  .filter((person) => person.birthDate >= '2025-02-01' && person.birthDate <= '2026-01-15')
  .sort((a, b) => a.birthDate.localeCompare(b.birthDate))) {
  const slot = BAPTISM_SUNDAYS.find(
    ([date, left]) => left > 0 && time(date) - time(infant.birthDate) >= 45 * DAY,
  )
  if (!slot) continue
  slot[1]--
  infant.baptized = true
  infant.baptismDate = slot[0]
  baptisms2026.push({ person: infant, date: slot[0] })
}
// Bayi 2025 sisanya dibaptis tahun 2025 bila sempat; yang lahir 2026 belum dibaptis.
for (const infant of people.filter(
  (person) => person.birthDate >= '2025-01-01' && !person.baptized,
)) {
  const date = nextWeekday(addDays(infant.birthDate, int(70, 150)), 0)
  if (date <= '2025-12-28') {
    infant.baptized = true
    infant.baptismDate = date
  }
}

// Peneguhan Sidi Pentakosta 2026: remaja yang lahir Juni 2008 – Mei 2009.
const PENTECOST_2026 = pentecost(2026)
const sidi2026 = people
  .filter(
    (person) =>
      person.birthDate >= '2008-06-01' && person.birthDate <= '2009-05-31' && person.baptized,
  )
  .slice(0, 18)
for (const person of sidi2026) {
  person.sidi = true
  person.sidiDate = PENTECOST_2026
}

// Status: warga yang meninggal (dengan bantuan duka bila tahun 2026) dan yang merantau.
const lambertus = member('Lambertus Ga')
lambertus.status = 'DECEASED'
lambertus.deathDate = '2026-10-13'
const elders = people.filter(
  (person) =>
    person.status === 'ACTIVE' &&
    ageOn(person.birthDate, TODAY) >= 72 &&
    !person.family.members.includes(lambertus),
)
for (let i = 0; i < 9 && elders.length; i++) {
  const person = elders.splice(Math.floor(random() * elders.length), 1)[0]
  person.status = 'DECEASED'
  person.deathDate =
    i < 5 ? randomDate('2026-01-15', '2026-09-25') : randomDate('2025-03-01', '2025-12-20')
}
for (const person of people.filter((item) => item.status === 'DECEASED')) {
  const others = person.family.members.filter((item) => item !== person && item.status === 'ACTIVE')
  const partner = others.find(
    (item) => item.relation === (person.relation === 'HEAD' ? 'SPOUSE' : 'HEAD'),
  )
  if (partner && (person.relation === 'HEAD' || person.relation === 'SPOUSE')) {
    partner.marriage = 'WIDOWED'
    if (person.relation === 'HEAD') partner.relation = 'HEAD'
  } else if (person.relation === 'HEAD') {
    const successor = others.find((item) => ageOn(item.birthDate, TODAY) >= 21)
    if (successor) successor.relation = 'HEAD'
  }
}
const rahel = member('Rahel Pandie')
rahel.status = 'MOVED'
const wanderers = people.filter(
  (person) =>
    person.relation === 'CHILD' &&
    person.status === 'ACTIVE' &&
    ageOn(person.birthDate, TODAY) >= 22 &&
    ageOn(person.birthDate, TODAY) <= 32,
)
const KEEP = new Set([
  'Ester Bire',
  'Daniel Lay',
  'Clara Ndun',
  'Imanuel Lado',
  'Arnold Pah',
  'Obed Pah',
  'Steven Ratu',
  'Stefanus Tefa',
  'Lidia Kana',
  'Kevin Djami',
  'Grace Lay',
  'Febe Bire',
  'Rio Haning',
  'Natalia Lay',
  'Yuliana Ga',
])
for (let moved = 0; moved < 12 && wanderers.length;) {
  const person = wanderers.splice(Math.floor(random() * wanderers.length), 1)[0]
  if (KEEP.has(person.name)) continue
  person.status = 'MOVED'
  moved++
}

const headOf = (family: Family) =>
  family.members.find((person) => person.relation === 'HEAD' && person.status === 'ACTIVE') ??
  family.members[0]
const activePeople = people.filter((person) => person.status === 'ACTIVE')
function groupOf(person: Person) {
  const age = ageOn(person.birthDate, TODAY)
  if (age < 17) return 'PAR'
  if (age >= 60) return 'LANSIA'
  if ((person.marriage && person.marriage !== 'SINGLE') || age >= 36) {
    return person.gender === 'FEMALE' ? 'KAUM_IBU' : 'KAUM_BAPAK'
  }
  return 'PEMUDA'
}

// ---------------------------------------------------------------------------------------
// Berkas di R2 lokal (kunci dan URL sama dengan POST /api/uploads).

type Stored = { url: string; name: string; size: number; contentType: string }
const CONTENT_TYPES = { pdf: 'application/pdf', webp: 'image/webp', png: 'image/png' } as const
let filesStored = 0
async function store(
  folder: string,
  date: string,
  name: string,
  bytes: Uint8Array,
): Promise<Stored> {
  const ext = name.split('.').pop() as keyof typeof CONTENT_TYPES
  const contentType = CONTENT_TYPES[ext]
  const key = `${folder}/${date.slice(0, 4)}/${date.slice(5, 7)}/${randomUUID()}.${ext}`
  if (!dryRun) {
    await env.FILES.put(key, bytes, {
      httpMetadata: {
        contentType,
        contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
      },
      customMetadata: { originalName: name },
    })
  }
  filesStored++
  return { url: `/api/files/${key}`, name, size: bytes.length, contentType }
}
const photoBytes = (photo: Photo) =>
  new Uint8Array(
    readFileSync(path.join(import.meta.dirname, 'demo', 'foto', `gereja-${photo}.webp`)),
  )
const photoCache = new Map<string, string>()
async function photo(folder: 'konten' | 'media', name: Photo, date: string) {
  const cacheKey = `${folder}:${name}`
  if (!photoCache.has(cacheKey)) {
    photoCache.set(
      cacheKey,
      (await store(folder, date, `gereja-${name}.webp`, photoBytes(name))).url,
    )
  }
  return photoCache.get(cacheKey)!
}

const LETTERHEAD: PdfLine[] = [
  { text: 'GEREJA MASEHI INJILI DI TIMOR', size: 11, bold: true },
  { text: 'MAJELIS JEMAAT LAHAIROI TUAK SABU LASIANA', size: 13, bold: true },
  { text: 'Kelurahan Lasiana, Kecamatan Kelapa Lima, Kota Kupang, Nusa Tenggara Timur', size: 9 },
  { text: '' },
]

// ---------------------------------------------------------------------------------------
// Statement SQL dikumpulkan lalu dijalankan per 100 dalam db.batch.

const queue: Statement[] = []
const counts: Record<string, number> = {}
function insert(table: string, row: Record<string, unknown>) {
  const columns = Object.keys(row)
  queue.push(
    db
      .prepare(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((_, i) => `?${i + 1}`).join(', ')})`,
      )
      .bind(...columns.map((column) => row[column] ?? null)),
  )
  counts[table] = (counts[table] ?? 0) + 1
}
async function flush() {
  if (!dryRun) {
    for (let i = 0; i < queue.length; i += 100) await db.batch(queue.slice(i, i + 100))
  }
  queue.length = 0
}

// ---------------------------------------------------------------------------------------
// Akun pengurus contoh. Akun dengan username yang sama (mis. dari --sample-users) dipakai
// apa adanya, termasuk kata sandinya.

const ACCOUNTS = [
  {
    username: 'pendeta',
    name: 'Pdt. Agustina Riwu Kaho',
    role: 'PASTOR',
    rayon: null,
    active: true,
  },
  {
    username: 'pendeta.yeskiel',
    name: 'Pdt. Yeskiel Lado',
    role: 'PASTOR',
    rayon: null,
    active: true,
  },
  { username: 'bendahara', name: 'Marthen Bire', role: 'TREASURER', rayon: null, active: true },
  {
    username: 'majelis.getsemani',
    name: 'Frans Dethan',
    role: 'ELDER',
    rayon: 'Getsemani',
    active: true,
  },
  {
    username: 'majelis.golgota',
    name: 'Yohanis Dimu',
    role: 'ELDER',
    rayon: 'Golgota',
    active: true,
  },
  {
    username: 'majelis.tiberias',
    name: 'Debora Tallo',
    role: 'ELDER',
    rayon: 'Tiberias',
    active: true,
  },
  {
    username: 'majelis.galilea',
    name: 'Hendrikus Ratu',
    role: 'ELDER',
    rayon: 'Galilea',
    active: true,
  },
  {
    username: 'majelis.kapernaum',
    name: 'Daniel Balla',
    role: 'ELDER',
    rayon: 'Kapernaum',
    active: true,
  },
  {
    username: 'bendahara.lama',
    name: 'Agustinus Djawa',
    role: 'TREASURER',
    rayon: null,
    active: false,
  },
] as const
const userId: Record<string, number> = {}
const newPasswords: string[] = []
for (const account of ACCOUNTS) {
  const found = await db
    .prepare('SELECT id FROM users WHERE username = ?1')
    .bind(account.username)
    .first<{ id: number }>()
  if (found) {
    userId[account.username] = found.id
    continue
  }
  if (dryRun) {
    userId[account.username] = 0
    continue
  }
  const password = Buffer.from(crypto.getRandomValues(new Uint8Array(15))).toString('base64url')
  const row = await db
    .prepare(
      `INSERT INTO users (name, email, username, password_hash, role, rayon_id, is_active, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8) RETURNING id`,
    )
    .bind(
      account.name,
      `${account.username}@gmit-lahairoi.local`,
      account.username,
      await hashPassword(password),
      account.role,
      account.rayon ? RAYONS.find((rayon) => rayon.name === account.rayon)!.id : null,
      account.active ? 1 : 0,
      utc(account.active ? '2026-01-08' : '2024-02-01', '10:00'),
    )
    .first<{ id: number }>()
  userId[account.username] = row!.id
  if (account.active)
    newPasswords.push(`${account.username.padEnd(20)} ${password}   (${account.name})`)
  counts.users = (counts.users ?? 0) + 1
}
const ADMIN = admin.id
const PASTOR = userId.pendeta
const PASTOR_2 = userId['pendeta.yeskiel']
const TREASURER = userId.bendahara

// ---------------------------------------------------------------------------------------
// Rayon: koordinator dan wilayah.

for (const rayon of RAYONS) {
  const area = RAYON_AREAS[rayon.name]
  const coordinator = MAJELIS.find((item) => item.rayon === rayon.name && item.coordinator)!
  queue.push(
    db
      .prepare('UPDATE rayons SET coordinator_name = ?2, description = ?3 WHERE id = ?1')
      .bind(
        rayon.id,
        `${coordinator.title} ${coordinator.name}`,
        `${area.area}, RT ${pad(area.rt[0], 3)}-${pad(area.rt[1], 3)}`,
      ),
  )
}

// KK dan anggota.
for (const family of families) {
  insert('families', {
    id: family.id,
    kk_number: family.kk,
    family_head_name: headOf(family).name,
    rayon_id: family.rayonId,
    address: family.address,
  })
}
for (const person of people) {
  insert('members', {
    id: person.id,
    family_id: person.family.id,
    church_member_number: person.number,
    full_name: person.name,
    gender: person.gender,
    birth_place: person.birthPlace,
    birth_date: person.birthDate,
    blood_type: person.blood,
    family_relation: person.relation,
    education: person.education,
    occupation: person.occupation,
    categorical_group: groupOf(person),
    baptism_status: person.baptized ? 1 : 0,
    baptism_date: person.baptismDate,
    sidi_status: person.sidi ? 1 : 0,
    sidi_date: person.sidiDate,
    marriage_status: person.marriage,
    marriage_date: person.marriage && person.marriage !== 'SINGLE' ? person.marriageDate : null,
    status: person.status,
  })
}
await flush()

// ---------------------------------------------------------------------------------------
// Jadwal ibadah 2026, petugas, dan kehadiran.

type Worship = {
  id: number
  title: string
  category: 'SUNDAY_SERVICE' | 'RAYON' | 'CATEGORICAL' | 'SPECIAL'
  rayon?: string
  date: string
  clock: string
  location: string
  theme?: string
  reading?: string
  liturgy?: string
  servants: [string, string][]
  attendance?: [number, number, number]
}
const worships: Worship[] = []
const busy = new Set<string>()
const servantKey = (name: string) =>
  name
    .replace(/^(Pdt\.|Pnt\.|Dkn\.|Vik\.|Sdr\.|Sdri\.|Ibu|Bpk\.)\s+/, '')
    .split(',')[0]
    .toLowerCase()
// Petugas berikutnya dari daftar yang belum bertugas pada hari itu (satu tugas per orang
// per hari, sehingga tidak ada bentrok jam dan petugas pagi berbeda dengan sore).
function rota(list: string[], index: number, date: string) {
  for (let i = 0; i < list.length; i++) {
    const name = list[(index + i) % list.length]
    const key = `${date} ${servantKey(name)}`
    if (!busy.has(key)) {
      busy.add(key)
      return name
    }
  }
  return list[index % list.length]
}

const pastors = [PASTORS.head, PASTORS.second, PASTORS.head, PASTORS.vicar, PASTORS.second]
const majelisNames = MAJELIS.map((item) => `${item.title} ${item.name}`)
const SINGERS = ['Sdri. Lidia Kana', 'Sdr. Obed Pah', 'Ibu Novita Rohi', 'Sdri. Febe Bire']
const MUSICIANS = ['Sdr. Stefanus Tefa', 'Sdr. Rio Haning', 'Sdri. Grace Lay']
const MEDIA_TEAM = ['Sdr. Kevin Djami', 'Sdri. Febe Bire', 'Sdr. Samuel Bire']
const parTeachers = activePeople
  .filter(
    (person) =>
      person.gender === 'FEMALE' && groupOf(person) === 'KAUM_IBU' && person.occupation === 'Guru',
  )
  .slice(0, 4)
  .map((person) => `Ibu ${person.name}`)
if (parTeachers.length < 2) parTeachers.push('Ibu Yohana Logo', 'Ibu Magdalena Huma')
const hosts = Object.fromEntries(
  RAYONS.map((rayon) => [
    rayon.name,
    families.filter((family) => family.rayon === rayon.name && headOf(family).status === 'ACTIVE'),
  ]),
)
const allHosts = Object.values(hosts).flat()
const SERVANT_LABEL: Record<string, string> = {
  PREACHER: 'Pelayan Firman',
  LITURGIST: 'Liturgos',
  ELDER_ON_DUTY: 'Majelis bertugas',
  SINGER: 'Pemandu lagu',
  MUSICIAN: 'Pemusik',
  MULTIMEDIA: 'Multimedia',
}
const hostLabel = (family: Family) => {
  const head = headOf(family)
  const spouse = family.members.find(
    (person) => person.relation === 'SPOUSE' && person.status === 'ACTIVE',
  )
  const surname = head.name.split(' ').at(-1)
  const second = spouse?.name.split(' ').at(-1)
  return `Rumah Kel. ${second && second !== surname ? `${surname}-${second}` : surname}, ${family.address.split(',')[0]}`
}

// Faktor musim untuk kehadiran: musim hujan dan libur sedikit lebih sepi, hari raya ramai.
const season = (date: string) => {
  const month = Number(date.slice(5, 7))
  if (date === '2026-04-05') return 1.32
  if (date === PENTECOST_2026) return 1.22
  if (date === '2026-08-16') return 1.1
  return month <= 3 || month === 12 ? 0.93 : month === 7 ? 0.95 : 1
}
const split = (total: number, shares: [number, number, number]) => {
  const men = Math.round(total * shares[0] * (0.95 + random() * 0.1))
  const women = Math.round(total * shares[1] * (0.95 + random() * 0.1))
  return [men, women, Math.max(0, total - men - women)] as [number, number, number]
}

const IRT_DAY: Record<string, number> = {
  Getsemani: 3,
  Golgota: 3,
  Tiberias: 4,
  Galilea: 4,
  Kapernaum: 5,
}
const hostIndex: Record<string, number> = {}
let rotation = 0
for (let sunday = '2026-01-04'; sunday <= '2026-12-27'; sunday = addDays(sunday, 7)) {
  rotation++
  const reading = SUNDAY_READINGS[sunday]
  const withServants = sunday <= SERVANTS_UNTIL
  const suffix =
    sunday === PENTECOST_2026
      ? ' (Peneguhan Sidi)'
      : BAPTISM_SUNDAYS.some(([date]) => date === sunday) || sunday === '2026-11-29'
        ? ' (Baptisan Kudus)'
        : ''
  for (const [title, clock, share, offset] of [
    ['Kebaktian Minggu Pagi', '07:00', 430, 0],
    ['Kebaktian Minggu Sore', '17:00', 255, 1],
  ] as const) {
    const total = Math.round((share + int(-35, 35)) * season(sunday))
    worships.push({
      id: 0,
      title: `${title}${offset === 0 ? suffix : ''}`,
      category: 'SUNDAY_SERVICE',
      date: sunday,
      clock,
      location: 'Gedung Gereja Lahairoi',
      theme: reading?.theme,
      reading: reading?.reading,
      servants: withServants
        ? [
            ['PREACHER', rota(pastors, rotation + offset * 2, sunday)],
            ['LITURGIST', rota(majelisNames, rotation * 2 + offset, sunday)],
            ['ELDER_ON_DUTY', rota(majelisNames, rotation * 2 + offset + 7, sunday)],
            ['SINGER', rota(SINGERS, rotation + offset, sunday)],
            ['MUSICIAN', rota(MUSICIANS, rotation + offset, sunday)],
            ['MULTIMEDIA', rota(MEDIA_TEAM, rotation + offset, sunday)],
          ]
        : [],
      attendance:
        sunday < TODAY
          ? split(total, offset === 0 ? [0.34, 0.44, 0.22] : [0.36, 0.4, 0.24])
          : undefined,
    })
  }
  if (sunday <= '2026-12-13') {
    worships.push({
      id: 0,
      title: 'Kebaktian PAR',
      category: 'CATEGORICAL',
      date: sunday,
      clock: '09:00',
      location: 'Gedung Gereja Lahairoi',
      servants: withServants ? [['PREACHER', rota(parTeachers, rotation, sunday)]] : [],
      attendance:
        sunday < TODAY
          ? [int(2, 4), int(4, 8), Math.round(int(68, 92) * season(sunday))]
          : undefined,
    })
  }
  // Pekan sesudah Minggu ini: ibadah rumah tangga dan kategorial.
  const monday = addDays(sunday, 1)
  const holyWeek = monday === '2026-03-30'
  const firstWeek = monday === '2026-01-05' || monday === '2025-12-29'
  if (monday <= '2026-12-13' && !holyWeek) {
    for (const rayon of RAYONS) {
      const date = nextWeekday(monday, IRT_DAY[rayon.name])
      if (date === '2026-01-01') continue
      const list = hosts[rayon.name]
      hostIndex[rayon.name] = ((hostIndex[rayon.name] ?? int(0, 10)) + 7) % list.length
      const rayonElders = MAJELIS.filter((item) => item.rayon === rayon.name).map(
        (item) => `${item.title} ${item.name}`,
      )
      const preacherPool = rotation % 6 === 0 ? [PASTORS.vicar, ...rayonElders] : rayonElders
      const unrecorded = date === '2026-10-28'
      worships.push({
        id: 0,
        title: 'Ibadah Rumah Tangga',
        category: 'RAYON',
        rayon: rayon.name,
        date,
        clock: '18:00',
        location: hostLabel(list[hostIndex[rayon.name]]),
        theme:
          date >= '2026-10-26' && date <= SERVANTS_UNTIL
            ? SUNDAY_READINGS[nextWeekday(date, 0)]?.theme
            : undefined,
        servants:
          date <= SERVANTS_UNTIL
            ? [
                ['PREACHER', rota(preacherPool, rotation, date)],
                ['LITURGIST', rota(rayonElders, rotation + 1, date)],
              ]
            : [],
        attendance: date < TODAY && !unrecorded ? [int(8, 16), int(12, 22), int(6, 14)] : undefined,
      })
    }
    const tuesday = addDays(monday, 1)
    if (!firstWeek) {
      worships.push({
        id: 0,
        title: 'Ibadah Kaum Ibu',
        category: 'CATEGORICAL',
        date: tuesday,
        clock: '16:00',
        location: hostLabel(pick(allHosts)),
        servants:
          tuesday <= SERVANTS_UNTIL
            ? [
                [
                  'PREACHER',
                  rota(
                    [
                      PASTORS.head,
                      'Pnt. Maria Lede',
                      'Pnt. Yuliana Hede',
                      'Pnt. Ester Djami',
                      'Pnt. Selfina Ludji',
                    ],
                    rotation,
                    tuesday,
                  ),
                ],
              ]
            : [],
        attendance: tuesday < TODAY && tuesday !== '2026-10-27' ? [0, int(28, 46), 0] : undefined,
      })
    }
    const saturday = addDays(monday, 5)
    if (saturday !== '2026-10-31' && saturday !== '2026-04-04') {
      const beach = saturday === '2026-06-27'
      worships.push({
        id: 0,
        title: beach ? 'Persekutuan Pemuda' : 'Ibadah Pemuda',
        category: 'CATEGORICAL',
        date: saturday,
        clock: '18:00',
        location: beach ? 'Pantai Lasiana' : 'Gedung Gereja Lahairoi',
        servants:
          saturday <= SERVANTS_UNTIL
            ? [
                [
                  'PREACHER',
                  rota([PASTORS.vicar, PASTORS.vicar, PASTORS.second], rotation, saturday),
                ],
              ]
            : [],
        attendance: saturday < TODAY ? [int(14, 24), int(16, 28), 0] : undefined,
      })
    }
    // Kaum Bapak: Sabtu pertama tiap bulan. Lansia: Kamis kedua tiap bulan.
    if (Number(saturday.slice(8)) <= 7 && saturday !== '2026-10-31') {
      worships.push({
        id: 0,
        title: 'Ibadah Kaum Bapak',
        category: 'CATEGORICAL',
        date: saturday,
        clock: '16:00',
        location: hostLabel(pick(allHosts)),
        servants:
          saturday <= SERVANTS_UNTIL
            ? [
                [
                  'PREACHER',
                  rota(
                    [
                      'Pnt. Markus Lodo',
                      'Pnt. Hendrikus Ratu',
                      'Pnt. Yohanis Dimu',
                      PASTORS.second,
                    ],
                    rotation,
                    saturday,
                  ),
                ],
              ]
            : [],
        attendance: saturday < TODAY ? [int(22, 36), 0, 0] : undefined,
      })
    }
    const thursday = addDays(monday, 3)
    if (Number(thursday.slice(8)) >= 8 && Number(thursday.slice(8)) <= 14) {
      worships.push({
        id: 0,
        title: 'Ibadah Lansia',
        category: 'CATEGORICAL',
        date: thursday,
        clock: '10:00',
        location: 'Gedung Gereja Lahairoi',
        servants:
          thursday <= SERVANTS_UNTIL
            ? [['PREACHER', rota([PASTORS.head, PASTORS.second], rotation, thursday)]]
            : [],
        attendance: thursday < TODAY ? [int(6, 11), int(12, 19), 0] : undefined,
      })
    }
  }
}
const SPECIAL_ATTENDANCE: Record<string, number> = {
  '2026-01-01': 350,
  '2026-04-03': 520,
  '2026-04-05': 380,
  '2026-05-14': 300,
}
for (const special of SPECIAL_SERVICES) {
  const total = SPECIAL_ATTENDANCE[special.date]
  worships.push({
    id: 0,
    title: special.title,
    category: 'SPECIAL',
    date: special.date,
    clock: special.time,
    location: special.location,
    theme: special.theme,
    reading: special.reading,
    servants:
      special.date <= SERVANTS_UNTIL
        ? [
            [
              'PREACHER',
              rota(
                special.date === '2026-10-31' ? [PASTORS.second] : [PASTORS.head, PASTORS.second],
                0,
                special.date,
              ),
            ],
            ['LITURGIST', rota(majelisNames, int(0, 15), special.date)],
            ['SINGER', rota(SINGERS, int(0, 3), special.date)],
            ['MUSICIAN', rota(MUSICIANS, int(0, 2), special.date)],
          ]
        : [],
    attendance:
      total && special.date < TODAY ? split(total + int(-20, 20), [0.35, 0.43, 0.22]) : undefined,
  })
}
worships.sort((a, b) => a.date.localeCompare(b.date) || a.clock.localeCompare(b.clock))
worships.forEach((worship, index) => (worship.id = index + 1))

// Tata ibadah PDF untuk Kebaktian Minggu terdekat dan ibadah HUT GMIT.
function liturgyPdf(worship: Worship) {
  const lines: PdfLine[] = [
    ...LETTERHEAD,
    { text: 'TATA IBADAH', size: 14, bold: true },
    {
      text: `${worship.title.replace(/ (Pagi|Sore)$/, '')} - ${dayDate(worship.date)}`,
      bold: true,
    },
    { text: `Tema: ${worship.theme ?? '-'}` },
    { text: `Bacaan Alkitab: ${worship.reading ?? '-'}`, gap: 0 },
    { text: '' },
  ]
  const order = [
    'Persiapan dan saat teduh',
    'Panggilan beribadah (Votum) dan Salam',
    'Nyanyian jemaat',
    'Pengakuan dosa',
    'Berita anugerah',
    'Nyanyian jemaat',
    'Doa pembacaan Alkitab',
    `Pembacaan Alkitab: ${worship.reading ?? ''}`,
    'Khotbah',
    'Nyanyian jemaat',
    'Pengakuan Iman Rasuli',
    'Doa syafaat',
    'Persembahan dan doa persembahan',
    'Warta jemaat',
    'Nyanyian pengutusan',
    'Pengutusan dan berkat',
  ]
  order.forEach((item, index) => lines.push({ text: `${index + 1}. ${item}`, gap: 2 }))
  lines.push({ text: '' }, { text: 'Petugas pelayanan', bold: true, gap: 6 })
  for (const [role, name] of worship.servants) {
    lines.push({ text: `${SERVANT_LABEL[role]}: ${name}`, indent: 12 })
  }
  lines.push({
    text: 'Nomor nyanyian dibacakan pemandu lagu dan ditayangkan di layar.',
    size: 9,
    gap: 10,
  })
  return textPdf(`Tata Ibadah ${longDate(worship.date)}`, lines)
}
const liturgyDates = ['2026-10-31', '2026-11-01', '2026-11-08']
for (const date of liturgyDates) {
  const services = worships.filter(
    (worship) =>
      worship.date === date &&
      (worship.category === 'SUNDAY_SERVICE' || worship.category === 'SPECIAL'),
  )
  const file = await store(
    'liturgi',
    addDays(date, -3),
    `tata-ibadah-${date}.pdf`,
    liturgyPdf(services[0]),
  )
  for (const worship of services) worship.liturgy = file.url
}

const memberIdOf = (servant: string) =>
  byName.get(servant.replace(/^(Pnt\.|Dkn\.|Sdr\.|Sdri\.|Ibu)\s+/, ''))?.id ?? null
for (const worship of worships) {
  insert('worship_schedules', {
    id: worship.id,
    title: worship.title,
    category: worship.category,
    rayon_id: worship.rayon ? RAYONS.find((rayon) => rayon.name === worship.rayon)!.id : null,
    worship_date: worship.date,
    worship_time: worship.clock,
    location: worship.location,
    theme: worship.theme,
    bible_reading: worship.reading,
    liturgy_file_url: worship.liturgy,
    attendance_men: worship.attendance?.[0],
    attendance_women: worship.attendance?.[1],
    attendance_youth_children: worship.attendance?.[2],
    is_public: 1,
    created_at: utc(addDays(worship.date, worship.date < '2026-02-01' ? -10 : -21), '10:00'),
    updated_at: utc(
      worship.attendance ? addDays(worship.date, 1) : addDays(worship.date, -14),
      '10:00',
    ),
  })
  for (const [role, name] of worship.servants) {
    insert('worship_servants', {
      schedule_id: worship.id,
      role,
      servant_name: name,
      member_id: memberIdOf(name),
    })
  }
}
await flush()

// ---------------------------------------------------------------------------------------
// Keuangan 2026: RAPBJ, saldo pindahan 2025, transaksi, dan kuitansi.

const BUDGETS: [string, string, string, 'INCOME' | 'EXPENSE', number][] = [
  ['P1', 'Persembahan Kebaktian Minggu', 'UMUM', 'INCOME', 300_000_000],
  ['P2', 'Persembahan Ibadah Rumah Tangga', 'UMUM', 'INCOME', 85_000_000],
  ['P3', 'Persepuluhan', 'UMUM', 'INCOME', 190_000_000],
  ['P4', 'Persembahan Syukur dan Nazar', 'UMUM', 'INCOME', 60_000_000],
  ['P5', 'Persembahan Hari Raya Gerejawi', 'UMUM', 'INCOME', 45_000_000],
  ['P6', 'Persembahan Pembangunan', 'PEMBANGUNAN', 'INCOME', 160_000_000],
  ['P7', 'Donasi dan Bantuan Pembangunan', 'PEMBANGUNAN', 'INCOME', 75_000_000],
  ['P8', 'Persembahan Diakonia', 'DIAKONIA', 'INCOME', 36_000_000],
  ['P9', 'Persembahan Ibadah Kategorial', 'KATEGORIAL', 'INCOME', 32_000_000],
  ['P10', 'Alokasi dari Kas Umum', 'PEMBANGUNAN', 'INCOME', 120_000_000],
  ['B1', 'Setoran ke Majelis Sinode dan Klasis', 'UMUM', 'EXPENSE', 150_000_000],
  ['B2', 'Tunjangan Pelayan dan Pegawai Jemaat', 'UMUM', 'EXPENSE', 192_000_000],
  ['B3', 'Listrik, Air, dan Internet', 'UMUM', 'EXPENSE', 33_000_000],
  ['B4', 'Administrasi dan Alat Tulis Kantor', 'UMUM', 'EXPENSE', 15_000_000],
  ['B5', 'Rapat dan Persidangan', 'UMUM', 'EXPENSE', 18_000_000],
  ['B6', 'Perayaan Hari Raya Gerejawi', 'UMUM', 'EXPENSE', 70_000_000],
  ['B7', 'Pemeliharaan Gedung dan Inventaris', 'UMUM', 'EXPENSE', 40_000_000],
  ['B8', 'Pembangunan Pastori Tahap II', 'PEMBANGUNAN', 'EXPENSE', 400_000_000],
  ['B9', 'Bantuan Duka dan Sakit', 'DIAKONIA', 'EXPENSE', 24_000_000],
  ['B10', 'Bantuan Pendidikan', 'DIAKONIA', 'EXPENSE', 18_000_000],
  ['B11', 'Kegiatan PAR', 'KATEGORIAL', 'EXPENSE', 12_000_000],
  ['B12', 'Kegiatan Pemuda', 'KATEGORIAL', 'EXPENSE', 10_000_000],
  ['B13', 'Kegiatan Kaum Ibu dan Kaum Bapak', 'KATEGORIAL', 'EXPENSE', 10_000_000],
  ['B14', 'Kegiatan Lansia', 'KATEGORIAL', 'EXPENSE', 6_000_000],
  ['B15', 'Alokasi ke Kas Pembangunan', 'UMUM', 'EXPENSE', 120_000_000],
]
const budgetId: Record<string, number> = {}
BUDGETS.forEach(([code, name, fund, type, target], index) => {
  budgetId[code] = index + 1
  insert('finance_budgets', {
    id: index + 1,
    fund_id: FUND[fund],
    fiscal_year: 2026,
    account_code: code,
    account_name: name,
    type,
    target_amount: target,
    created_at: utc('2026-01-08', '10:00'),
    updated_at: utc('2026-01-08', '10:00'),
  })
})

type Transaction = {
  date: string
  code: string | null
  fund: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  description: string
  receipt?: boolean
}
const transactions: Transaction[] = []
const income = (date: string, code: string, amount: number, description: string) =>
  transactions.push({
    date,
    code,
    fund: BUDGETS.find((b) => b[0] === code)![2],
    type: 'INCOME',
    amount,
    description,
  })
const expense = (
  date: string,
  code: string,
  amount: number,
  description: string,
  receipt = chance(0.75),
) =>
  transactions.push({
    date,
    code,
    fund: BUDGETS.find((b) => b[0] === code)![2],
    type: 'EXPENSE',
    amount,
    description,
    receipt,
  })

for (const [fund, amount] of [
  ['UMUM', 48_350_000],
  ['PEMBANGUNAN', 312_750_000],
  ['DIAKONIA', 18_400_000],
  ['KATEGORIAL', 9_250_000],
] as const) {
  transactions.push({
    date: '2025-12-31',
    code: null,
    fund,
    type: 'INCOME',
    amount,
    description: 'Saldo kas per 31 Desember 2025 (pindahan buku kas manual)',
  })
}
for (let sunday = '2026-01-04'; sunday < TODAY; sunday = addDays(sunday, 7)) {
  const factor = season(sunday)
  income(sunday, 'P1', money(3_700_000, 4_700_000, factor), 'Persembahan Kebaktian Minggu Pagi')
  income(sunday, 'P1', money(1_400_000, 2_100_000, factor), 'Persembahan Kebaktian Minggu Sore')
  income(sunday, 'P3', money(3_300_000, 4_500_000), 'Persepuluhan (amplop)')
  income(sunday, 'P4', money(600_000, 1_700_000), 'Persembahan syukur dan nazar')
  income(sunday, 'P6', money(2_600_000, 4_100_000), 'Persembahan pembangunan (amplop)')
  income(
    sunday,
    'P9',
    money(450_000, 850_000),
    'Persembahan ibadah kategorial (PAR, Pemuda, Kaum Ibu)',
  )
  if (Number(sunday.slice(8)) <= 7)
    income(sunday, 'P8', money(2_200_000, 3_400_000), 'Kolekte diakonia Minggu pertama')
  if (sunday === '2026-04-05')
    income(sunday, 'P5', money(8_500_000, 9_500_000), 'Persembahan Paskah')
  if (sunday === PENTECOST_2026)
    income(sunday, 'P5', money(5_500_000, 6_500_000), 'Persembahan Pentakosta')
}
for (const worship of worships.filter((item) => item.category === 'RAYON' && item.attendance)) {
  income(worship.date, 'P2', money(270_000, 460_000), `Persembahan IRT Rayon ${worship.rayon}`)
}
income('2026-01-01', 'P5', 4_850_000, 'Persembahan Kebaktian Tahun Baru')
income('2026-04-03', 'P5', 6_720_000, 'Persembahan Kebaktian Jumat Agung')
income('2026-04-05', 'P5', 3_180_000, 'Persembahan Ibadah Subuh Paskah')
income('2026-05-14', 'P5', 3_260_000, 'Persembahan Kebaktian Kenaikan Tuhan Yesus')
income(
  '2026-03-15',
  'P7',
  25_000_000,
  'Donasi pembangunan pastori dari keluarga jemaat di perantauan',
)
income('2026-07-19', 'P7', 15_000_000, 'Donasi pembangunan pastori dari donatur')
income('2026-09-27', 'P7', 12_450_000, 'Hasil lelang persembahan natura untuk pembangunan')

for (let month = 1; month <= 10; month++) {
  const label = MONTHS[month - 1]
  const day = (d: number) => `2026-${pad(month)}-${pad(d)}`
  expense(
    day(10),
    'B1',
    money(11_600_000, 12_400_000),
    `Setoran bulanan ke Majelis Sinode GMIT bulan ${label}`,
  )
  if (month % 3 === 1)
    expense(
      day(12),
      'B1',
      1_500_000,
      `Iuran Majelis Klasis triwulan ${['I', 'II', 'III', 'IV'][(month - 1) / 3]}`,
    )
  if (month < 10 || TODAY >= day(25))
    expense(day(25), 'B2', 16_000_000, `Tunjangan pelayan dan pegawai jemaat bulan ${label}`, false)
  expense(
    day(20),
    'B3',
    money(2_350_000, 2_950_000),
    `Tagihan listrik PLN, air PDAM, dan internet bulan ${label}`,
  )
  expense(
    day(month === 2 ? 7 : 6),
    'B5',
    money(750_000, 1_250_000),
    `Konsumsi rapat majelis bulan ${label}`,
  )
  if (month % 2 === 0)
    expense(
      day(15),
      'B4',
      money(650_000, 1_400_000),
      'Pembelian kertas, tinta, dan alat tulis kantor',
    )
  expense(
    day(18),
    'B9',
    money(500_000, 1_200_000),
    `Bantuan warga sakit (kunjungan diakonia) bulan ${label}`,
  )
  expense(day(12), 'B14', money(300_000, 420_000), `Konsumsi Ibadah Lansia bulan ${label}`)
}
expense('2026-02-07', 'B5', 3_650_000, 'Konsumsi dan perlengkapan Rapat Kerja Majelis Jemaat 2026')
expense('2026-02-20', 'B7', 3_820_000, 'Perbaikan atap bocor di serambi gereja')
expense('2026-03-30', 'B6', 9_450_000, 'Dekorasi, konsumsi, dan perlengkapan perayaan Paskah')
expense('2026-04-06', 'B6', 4_180_000, 'Konsumsi dan sewa tenda Ibadah Subuh Paskah')
expense('2026-04-04', 'B11', 1_800_000, 'Kegiatan Paskah PAR')
expense('2026-05-08', 'B7', 450_000, 'Servis AC ruang konsistori')
expense('2026-05-09', 'B13', 1_600_000, 'Pertemuan Kaum Ibu antarrayon')
expense('2026-05-23', 'B6', 2_750_000, 'Perlengkapan Peneguhan Sidi Pentakosta')
expense('2026-06-27', 'B12', 2_400_000, 'Persekutuan Pemuda di Pantai Lasiana')
expense('2026-07-10', 'B7', 5_200_000, 'Pengecatan pagar dan pintu gereja')
expense(
  '2026-08-09',
  'B10',
  8_000_000,
  'Bantuan pendidikan 16 pelajar SD-SMA tahun ajaran 2026/2027',
)
expense('2026-08-16', 'B10', 6_000_000, 'Bantuan pendidikan 8 mahasiswa tahun ajaran 2026/2027')
expense('2026-08-15', 'B6', 1_950_000, 'Konsumsi ibadah syukur HUT ke-81 Kemerdekaan RI')
expense('2026-08-29', 'B11', 2_100_000, 'Hadiah dan konsumsi Lomba Cerdas Cermat Alkitab PAR')
expense('2026-09-12', 'B13', 1_900_000, 'Konsumsi gotong royong Kaum Bapak pengecoran pastori')
expense('2026-10-02', 'B5', 1_150_000, 'Konsumsi Rapat Majelis Jemaat Lengkap Triwulan III')
expense('2026-10-16', 'B7', 850_000, 'Pembelian sapu, sekop, dan karung untuk kerja bakti')
expense('2026-10-21', 'B7', 1_750_000, 'Servis genset di bengkel')
expense('2026-10-27', 'B6', 2_300_000, 'Persiapan Ibadah Syukur HUT ke-79 GMIT')
// Alokasi bulanan Kas Umum untuk pembangunan pastori (dicatat di kedua Pos Kas).
for (let month = 1; month <= 10; month++) {
  const date = `2026-${pad(month)}-28`
  if (date >= TODAY) break
  const label = `${MONTHS[month - 1]} 2026`
  expense(date, 'B15', 10_000_000, `Alokasi ke Kas Pembangunan bulan ${label}`, false)
  income(date, 'P10', 10_000_000, `Alokasi dari Kas Umum bulan ${label}`)
}
// Pastori tahap II: material dan upah tukang mingguan sejak Mei.
const MATERIALS = [
  'Pembelian semen 80 sak',
  'Pembelian besi beton dan kawat',
  'Pembelian pasir dan batu pecah',
  'Pembelian batako',
  'Pembelian kayu bekisting',
  'Pembelian baja ringan rangka atap',
  'Pembelian seng dan perlengkapan atap',
]
for (let date = '2026-05-09', week = 0; date < TODAY; date = addDays(date, 7), week++) {
  expense(
    date,
    'B8',
    money(4_200_000, 4_800_000),
    `Upah tukang pastori minggu ke-${week + 1}`,
    false,
  )
  if (week % 2 === 0) {
    const material = MATERIALS[Math.min(MATERIALS.length - 1, Math.floor(week / 4))]
    expense(addDays(date, -2), 'B8', money(7_500_000, 13_500_000), material, true)
  }
}
for (const person of people.filter((item) => item.deathDate && item.deathDate >= '2026-01-01')) {
  expense(
    addDays(person.deathDate!, 1),
    'B9',
    1_500_000,
    `Bantuan duka keluarga alm. ${person.name} (Rayon ${person.family.rayon})`,
  )
}
transactions.sort((a, b) => a.date.localeCompare(b.date))

let receiptNumber = 0
for (const item of transactions) {
  let receipt: string | null = null
  if (item.type === 'EXPENSE' && item.receipt) {
    receiptNumber++
    const number = `KW-${pad(receiptNumber, 3)}/BDH-LHR/${item.date.slice(0, 4)}`
    const pdf = textPdf(`Kuitansi ${number}`, [
      ...LETTERHEAD,
      { text: 'KUITANSI', size: 16, bold: true },
      { text: `Nomor: ${number}`, gap: 4 },
      { text: `Tanggal: ${longDate(item.date)}` },
      { text: '' },
      { text: 'Telah terima dari Bendahara Majelis Jemaat GMIT Lahairoi Tuak Sabu Lasiana' },
      { text: `Uang sejumlah: ${rupiah(item.amount)}`, bold: true, gap: 6 },
      { text: `Untuk pembayaran: ${item.description}`, gap: 6 },
      { text: '' },
      { text: 'Penerima,', gap: 24 },
      { text: '(tanda tangan dan nama terang)', gap: 30 },
      {
        text: 'Berkas contoh untuk data demo aplikasi, bukan bukti transaksi sebenarnya.',
        size: 8,
        gap: 30,
      },
    ])
    receipt = (await store('kuitansi', item.date, `kuitansi-${pad(receiptNumber, 3)}.pdf`, pdf)).url
  }
  insert('finance_transactions', {
    fund_id: FUND[item.fund],
    budget_id: item.code ? budgetId[item.code] : null,
    transaction_date: item.date,
    type: item.type,
    amount: item.amount,
    description: item.description,
    receipt_url: receipt,
    created_by: TREASURER || ADMIN,
    created_at: utc(item.date < '2026-01-01' ? '2026-01-08' : addDays(item.date, 1), '10:00'),
    updated_at: utc(item.date < '2026-01-01' ? '2026-01-08' : addDays(item.date, 1), '10:00'),
  })
}
await flush()

// ---------------------------------------------------------------------------------------
// Isi yang dirujuk berita, warta, dan surat.

const daniel = member('Daniel Lay')
const ester = member('Ester Bire')
const parentsOf = (person: Person) => {
  const head = person.family.members.find(
    (item) => item.relation === 'HEAD' || item.relation === 'SPOUSE',
  )
  const father = person.family.members.find(
    (item) => (item.relation === 'HEAD' || item.relation === 'SPOUSE') && item.gender === 'MALE',
  )
  const mother = person.family.members.find(
    (item) => (item.relation === 'HEAD' || item.relation === 'SPOUSE') && item.gender === 'FEMALE',
  )
  return father && mother
    ? `Bapak ${father.name} dan Ibu ${mother.name}`
    : `keluarga ${head?.name ?? person.name}`
}
const september = transactions.filter((item) => item.date.startsWith('2026-09'))
const sum = (list: Transaction[]) => list.reduce((total, item) => total + item.amount, 0)
const FUND_NAMES: Record<string, string> = {
  UMUM: 'Kas Umum / Sinode',
  PEMBANGUNAN: 'Kas Pembangunan',
  DIAKONIA: 'Kas Diakonia',
  KATEGORIAL: 'Kas Kategorial',
}
const fill: Record<string, string> = {
  groom: daniel.name,
  bride: ester.name,
  groomRayon: daniel.family.rayon,
  brideRayon: ester.family.rayon,
  groomParents: parentsOf(daniel),
  brideParents: parentsOf(ester),
  pastor: PASTORS.head,
  secondPastor: PASTORS.second,
  deceased: `Bapak ${lambertus.name}`,
  deceasedRayon: lambertus.family.rayon,
  deceasedAge: String(ageOn(lambertus.birthDate, '2026-10-13')),
  christmasChair: 'Pnt. Hendrikus Ratu',
  easterChair: 'Dkn. Simon Rihi',
  transferInHead: transferFamily.members[0].name,
  transferOut: rahel.name,
  sidiCount: String(sidi2026.length),
  septIncome: rupiah(sum(september.filter((item) => item.type === 'INCOME'))),
  septExpense: rupiah(sum(september.filter((item) => item.type === 'EXPENSE'))),
  septByFund: Object.keys(FUND_NAMES)
    .map((fund) => {
      const list = september.filter((item) => item.fund === fund)
      return `${FUND_NAMES[fund]}: masuk ${rupiah(sum(list.filter((item) => item.type === 'INCOME')))}, keluar ${rupiah(sum(list.filter((item) => item.type === 'EXPENSE')))}.`
    })
    .join(' '),
}
// Gelar yang berakhiran titik (S.Th., M.Th.) di akhir kalimat tidak diberi titik kedua.
const render = (text: string) =>
  text
    .replace(/\{\{(\w+)\}\}/g, (_, key: string) => fill[key] ?? `{{${key}}}`)
    .replace(/\.\./g, '.')

// ---------------------------------------------------------------------------------------
// Konten portal: profil, rekening, renungan, berita, galeri, dan warta (PDF).

type Content = {
  category: 'WARTA' | 'DEVOTIONAL' | 'NEWS' | 'MEDIA' | 'PROFILE' | 'PAYMENT_INFO'
  title: string
  slug?: string
  summary?: string
  body?: string
  attachment?: string
  thumbnail?: string
  published: string | null
  author: number
}
const contents: Content[] = []
const at = (stamp: string) => utc(stamp.slice(0, 10), stamp.slice(11, 16))

const profileDate = '2026-01-10T10:00'
contents.push(
  {
    category: 'PROFILE',
    title: 'Sejarah Jemaat',
    body: PROFILE_HISTORY.join('\n\n'),
    thumbnail: await photo('konten', 'sisi', '2026-01-10'),
    published: at(profileDate),
    author: ADMIN,
  },
  {
    category: 'PROFILE',
    title: 'Visi',
    body: PROFILE_VISION.join('\n\n'),
    published: at(profileDate),
    author: ADMIN,
  },
  {
    category: 'PROFILE',
    title: 'Misi',
    body: PROFILE_MISSION.map((item, index) => `${index + 1}. ${item}`).join('\n\n'),
    published: at(profileDate),
    author: ADMIN,
  },
  {
    category: 'PROFILE',
    title: 'Pendeta & Majelis Jemaat',
    body: [
      `Ketua Majelis Jemaat: ${PASTORS.head}`,
      `Pendeta Jemaat: ${PASTORS.second}`,
      `Vikaris: ${PASTORS.vicar}`,
      ...MAJELIS.map((item) => `${item.office}: ${item.title} ${item.name}`),
      'Majelis Jemaat terdiri atas pendeta, penatua, dan diaken yang melayani di lima rayon.',
    ].join('\n'),
    published: at(profileDate),
    author: ADMIN,
  },
  {
    category: 'PROFILE',
    title: 'Makna Nama Lahai-roi',
    summary: 'Sumur Dia yang hidup, yang melihat aku.',
    body: PROFILE_NAME_MEANING.join('\n\n'),
    published: at(profileDate),
    author: ADMIN,
  },
  {
    category: 'PROFILE',
    title: 'Kantor Jemaat',
    summary: 'Selasa-Sabtu, 09.00-14.00 WITA',
    body: PROFILE_OFFICE.join('\n\n'),
    published: at(profileDate),
    author: ADMIN,
  },
)
const qris = await store(
  'konten',
  '2026-01-10',
  'qris-contoh.png',
  new Uint8Array(readFileSync(path.join(import.meta.dirname, 'demo', 'foto', 'qris-contoh.png'))),
)
for (const account of PAYMENT_ACCOUNTS) {
  contents.push({
    category: 'PAYMENT_INFO',
    title: account.title,
    summary: account.number,
    body: account.body,
    thumbnail: account.qris ? qris.url : undefined,
    published: at(profileDate),
    author: ADMIN,
  })
}
for (const [index, item] of DEVOTIONALS.entries()) {
  contents.push({
    category: 'DEVOTIONAL',
    title: item.title,
    summary: item.passage,
    body: item.body.join('\n\n'),
    thumbnail: item.photo ? await photo('konten', item.photo, item.date) : undefined,
    published: utc(item.date, '05:00'),
    author: index % 3 === 1 ? PASTOR_2 || PASTOR || ADMIN : PASTOR || ADMIN,
  })
}
for (const item of NEWS) {
  contents.push({
    category: 'NEWS',
    title: render(item.title),
    summary: render(item.summary),
    body: item.body.map(render).join('\n\n'),
    thumbnail: item.photo ? await photo('konten', item.photo, item.at.slice(0, 10)) : undefined,
    published: item.draft ? null : at(item.at),
    author: ADMIN,
  })
}
for (const item of GALLERY) {
  contents.push({
    category: 'MEDIA',
    title: item.title,
    summary: render(item.summary),
    body: `${render(item.summary)} Dokumentasi oleh tim multimedia jemaat.`,
    thumbnail: await photo('media', item.photo, item.at.slice(0, 10)),
    published: at(item.at),
    author: ADMIN,
  })
}

// Warta Jemaat mingguan (Juli – 1 November 2026) dengan PDF yang disusun dari data demo.
function wartaPdf(sunday: string, notices: string[]) {
  const lines: PdfLine[] = [
    ...LETTERHEAD,
    { text: 'WARTA JEMAAT', size: 16, bold: true },
    { text: dayDate(sunday), bold: true },
  ]
  const reading = SUNDAY_READINGS[sunday]
  if (reading)
    lines.push({ text: `Tema: ${reading.theme}` }, { text: `Bacaan: ${reading.reading}` })
  lines.push({ text: 'I. PELAYAN KEBAKTIAN MINGGU', bold: true, gap: 10 })
  for (const worship of worships.filter(
    (item) => item.date === sunday && item.category === 'SUNDAY_SERVICE',
  )) {
    lines.push({
      text: `${worship.title} (pukul ${worship.clock.replace(':', '.')} WITA)`,
      bold: true,
      gap: 4,
    })
    for (const [role, name] of worship.servants)
      lines.push({ text: `${SERVANT_LABEL[role]}: ${name}`, indent: 12 })
  }
  lines.push({ text: 'II. PENGUMUMAN', bold: true, gap: 10 })
  notices.forEach((notice, index) => lines.push({ text: `${index + 1}. ${notice}`, gap: 2 }))
  const week = worships.filter(
    (item) => item.category === 'RAYON' && item.date > sunday && item.date <= addDays(sunday, 6),
  )
  if (week.length) {
    lines.push({ text: 'III. IBADAH RUMAH TANGGA PEKAN INI', bold: true, gap: 10 })
    for (const worship of week) {
      lines.push({
        text: `Rayon ${worship.rayon} - ${dayDate(worship.date)}, ${worship.clock.replace(':', '.')} WITA, ${worship.location}`,
        gap: 2,
      })
    }
  }
  const lastSunday = addDays(sunday, -7)
  const received = transactions.filter(
    (item) =>
      item.type === 'INCOME' &&
      item.date > addDays(lastSunday, -1) &&
      item.date < sunday &&
      item.code,
  )
  if (received.length) {
    lines.push({
      text: `IV. PERSEMBAHAN ${dayDate(lastSunday).toUpperCase()} DAN PEKAN SESUDAHNYA`,
      bold: true,
      gap: 10,
    })
    for (const item of received)
      lines.push({ text: `${item.description}: ${rupiah(item.amount)}`, indent: 12 })
    lines.push({ text: `Jumlah: ${rupiah(sum(received))}`, bold: true, indent: 12 })
  }
  const birthdays = activePeople
    .filter((person) => {
      for (let i = 0; i < 7; i++)
        if (addDays(sunday, i).slice(5) === person.birthDate.slice(5)) return true
      return false
    })
    .sort((a, b) => a.birthDate.slice(5).localeCompare(b.birthDate.slice(5)))
  if (birthdays.length) {
    lines.push({ text: 'V. ULANG TAHUN WARGA JEMAAT PEKAN INI', bold: true, gap: 10 })
    for (const person of birthdays) {
      lines.push({
        text: `${person.name} (Rayon ${person.family.rayon}) - ${Number(person.birthDate.slice(8))} ${MONTHS[Number(person.birthDate.slice(5, 7)) - 1]}`,
        indent: 12,
      })
    }
  }
  lines.push({ text: 'Majelis Jemaat GMIT Lahairoi Tuak Sabu Lasiana', bold: true, gap: 16 })
  lines.push({ text: 'Warta contoh untuk data demo aplikasi.', size: 8, gap: 10 })
  return textPdf(`Warta Jemaat ${longDate(sunday)}`, lines)
}
const STANDARD_NOTICES = [
  'Warga jemaat yang belum mengembalikan amplop persepuluhan dan pembangunan bulan ini dapat menyerahkannya kepada majelis rayon.',
  'Kantor Majelis Jemaat buka Selasa sampai Sabtu pukul 09.00-14.00 WITA.',
]
for (let sunday = '2026-07-05'; sunday <= '2026-11-08'; sunday = addDays(sunday, 7)) {
  const recent = NEWS.filter(
    (item) =>
      !item.draft &&
      item.at.slice(0, 10) > addDays(sunday, -10) &&
      item.at.slice(0, 10) <= addDays(sunday, -1),
  )
  const notices = [
    ...recent.map((item) => `${render(item.title)}. ${render(item.summary)}`),
    ...STANDARD_NOTICES,
  ]
  const draft = sunday === '2026-11-08'
  const pdf = await store(
    'warta',
    addDays(sunday, -1),
    `warta-jemaat-${sunday}.pdf`,
    wartaPdf(sunday, notices),
  )
  contents.push({
    category: 'WARTA',
    title: `Warta Jemaat Minggu, ${longDate(sunday)}`,
    summary: recent.length
      ? recent.map((item) => render(item.title)).join('; ') + '.'
      : 'Pelayan ibadah, pengumuman, persembahan, dan ulang tahun warga jemaat.',
    attachment: pdf.url,
    published: draft ? null : utc(addDays(sunday, -1), '16:00'),
    author: ADMIN,
  })
}

for (const item of contents) {
  const published = item.published
  const created = published ?? utc('2026-10-28', '15:00')
  insert('public_contents', {
    category: item.category,
    title: item.title,
    slug:
      item.slug ??
      slugify(
        item.category === 'PROFILE' || item.category === 'PAYMENT_INFO'
          ? `${item.title}`
          : item.title,
      ),
    summary: item.summary,
    content_body: item.body,
    attachment_url: item.attachment,
    thumbnail_url: item.thumbnail,
    published_at: published,
    author_id: item.author || ADMIN,
    is_published: published ? 1 : 0,
    // Konten terjadwal dibuat beberapa hari sebelum waktu terbitnya.
    created_at: published && published > utc(TODAY, '18:00') ? utc('2026-10-26', '19:00') : created,
    updated_at: published && published > utc(TODAY, '18:00') ? utc('2026-10-26', '19:00') : created,
  })
}
await flush()

// ---------------------------------------------------------------------------------------
// Layanan sakramen: Buku Induk 2026 dan antrean yang sedang diproses.

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PREFIX = { BAPTISM: 'BPT', SIDI: 'SDI', MARRIAGE: 'NKH' } as const
const codes = new Set<string>()
function registrationCode(type: keyof typeof PREFIX) {
  for (;;) {
    const chars = Array.from(
      { length: 8 },
      () => CODE_ALPHABET[int(0, CODE_ALPHABET.length - 1)],
    ).join('')
    const code = `${PREFIX[type]}-${chars.slice(0, 4)}-${chars.slice(4)}`
    if (!codes.has(code)) {
      codes.add(code)
      return code
    }
  }
}
const phone = () => `0812000${pad(int(0, 99999), 5)}`
const DOC_LABELS: Record<string, string> = {
  birth_certificate: 'Akta kelahiran',
  family_card: 'Kartu Keluarga',
  baptism_certificate: 'Surat baptis',
  groom_certificates: 'Surat baptis dan sidi mempelai pria',
  bride_certificates: 'Surat baptis dan sidi mempelai wanita',
  id_cards: 'KTP kedua mempelai',
}
async function documents(kinds: string[], owner: string, date: string) {
  const list = []
  for (const kind of kinds) {
    const label = DOC_LABELS[kind]
    const pdf = textPdf(`${label} - ${owner}`, [
      { text: 'DOKUMEN CONTOH', size: 16, bold: true },
      { text: label, size: 13, bold: true, gap: 6 },
      { text: `Atas nama: ${owner}`, gap: 10 },
      {
        text: 'Berkas ini dibuat untuk data demo aplikasi dan bukan dokumen kependudukan atau gerejawi yang sah.',
        gap: 10,
      },
    ])
    const stored = await store('sakramen', date, `${slugify(`${label} ${owner}`)}.pdf`, pdf)
    list.push({
      kind,
      label,
      url: stored.url,
      name: stored.name,
      size: stored.size,
      content_type: stored.contentType,
    })
  }
  return list
}
const rayonIdOf = (person: Person) => person.family.rayonId
const fatherOf = (person: Person) =>
  person.family.members.find(
    (item) => (item.relation === 'HEAD' || item.relation === 'SPOUSE') && item.gender === 'MALE',
  )
const motherOf = (person: Person) =>
  person.family.members.find(
    (item) => (item.relation === 'HEAD' || item.relation === 'SPOUSE') && item.gender === 'FEMALE',
  )
// Pendaftar baptisan dan sidi anak adalah orang tuanya; pendaftar nikah mempelai pria.
const contact = (person: Person, self = false) => {
  const parent =
    person.relation === 'CHILD' && !self ? (fatherOf(person) ?? motherOf(person) ?? person) : person
  return {
    contact_name: parent.name,
    address: person.family.address,
    church_member_number: parent.number,
    rayon_id: rayonIdOf(person),
  }
}

type Application = {
  type: keyof typeof PREFIX
  applicant: string
  memberId: number | null
  partnerId?: number | null
  form: Record<string, string | number>
  docs: string[]
  docOwner: string
  status: 'PENDING' | 'REVISION' | 'COUNSELING' | 'APPROVED' | 'COMPLETED'
  created: string
  scheduled?: string
  scheduledTime?: string
  counseling?: [string, string]
  pastor?: string
  certificate?: string
  notes?: string
}
const applications: Application[] = []
const certificateCounter = { BAPTISM: 0, SIDI: 0, MARRIAGE: 0 }
const certificate = (type: keyof typeof PREFIX) =>
  `${PREFIX[type]}-2026-${pad(++certificateCounter[type], 3)}`
const baptismForm = (person: Person) => ({
  full_name: person.name,
  gender: person.gender,
  birth_place: person.birthPlace,
  birth_date: person.birthDate,
  father_name: fatherOf(person)?.name ?? '-',
  mother_name: motherOf(person)?.name ?? '-',
  ...contact(person),
})
for (const { person, date } of baptisms2026) {
  applications.push({
    type: 'BAPTISM',
    applicant: person.name,
    memberId: person.id,
    form: baptismForm(person),
    docs: ['birth_certificate', 'family_card'],
    docOwner: person.name,
    status: 'COMPLETED',
    created: addDays(date, -int(24, 40)),
    scheduled: date,
    scheduledTime: '07:00',
    pastor: date === '2026-04-05' ? PASTORS.head : pick([PASTORS.head, PASTORS.second]),
    certificate: certificate('BAPTISM'),
  })
}
for (const person of sidi2026) {
  applications.push({
    type: 'SIDI',
    applicant: person.name,
    memberId: person.id,
    form: {
      full_name: person.name,
      gender: person.gender,
      birth_place: person.birthPlace,
      birth_date: person.birthDate,
      baptism_church: 'GMIT Jemaat Lahairoi Tuak Sabu Lasiana',
      ...(person.baptismDate ? { baptism_date: person.baptismDate } : {}),
      father_name: fatherOf(person)?.name ?? '-',
      mother_name: motherOf(person)?.name ?? '-',
      ...contact(person),
    },
    docs: ['baptism_certificate'],
    docOwner: person.name,
    status: 'COMPLETED',
    created: randomDate('2025-09-01', '2025-09-27'),
    scheduled: PENTECOST_2026,
    scheduledTime: '07:00',
    pastor: PASTORS.head,
    certificate: certificate('SIDI'),
    notes: 'Telah menyelesaikan katekisasi angkatan 2025/2026.',
  })
}
const MARRIED_2026: [string, string, string][] = [
  ['Yosua Kana', 'Debora Rohi', '2026-02-14'],
  ['Natanael Dida', 'Kezia Hede', '2026-06-20'],
  ['Gabriel Bunga', 'Yemima Logo', '2026-08-08'],
  ['Rendy Medah', 'Priska Tefa', '2026-10-10'],
]
const marriageForm = (
  groom: string,
  groomBirth: [string, string],
  groomChurch: string,
  bride: string,
  brideBirth: [string, string],
  brideChurch: string,
  planned?: string,
) => ({
  groom_name: groom,
  groom_birth_place: groomBirth[0],
  groom_birth_date: groomBirth[1],
  groom_church: groomChurch,
  bride_name: bride,
  bride_birth_place: brideBirth[0],
  bride_birth_date: brideBirth[1],
  bride_church: brideChurch,
  ...(planned ? { planned_date: planned } : {}),
})
const HOME = 'GMIT Jemaat Lahairoi Tuak Sabu Lasiana'
for (const [groomName, brideName, date] of MARRIED_2026) {
  const groom = member(groomName)
  const bride = member(brideName)
  applications.push({
    type: 'MARRIAGE',
    applicant: `${groom.name} & ${bride.name}`,
    memberId: groom.id,
    partnerId: bride.id,
    form: {
      ...marriageForm(
        groom.name,
        [groom.birthPlace, groom.birthDate],
        HOME,
        bride.name,
        [bride.birthPlace, bride.birthDate],
        HOME,
      ),
      ...contact(groom, true),
    },
    docs: ['groom_certificates', 'bride_certificates', 'id_cards'],
    docOwner: `${groom.name} dan ${bride.name}`,
    status: 'COMPLETED',
    created: addDays(date, -int(60, 80)),
    scheduled: date,
    scheduledTime: '10:00',
    counseling: [addDays(date, -int(21, 30)), '10:00'],
    pastor: pick([PASTORS.head, PASTORS.second]),
    certificate: certificate('MARRIAGE'),
  })
}
// Sedang diproses.
applications.push({
  type: 'MARRIAGE',
  applicant: `${daniel.name} & ${ester.name}`,
  memberId: daniel.id,
  partnerId: ester.id,
  form: {
    ...marriageForm(
      daniel.name,
      [daniel.birthPlace, daniel.birthDate],
      HOME,
      ester.name,
      [ester.birthPlace, ester.birthDate],
      HOME,
      '2026-11-14',
    ),
    ...contact(daniel, true),
  },
  docs: ['groom_certificates', 'bride_certificates', 'id_cards'],
  docOwner: `${daniel.name} dan ${ester.name}`,
  status: 'APPROVED',
  created: '2026-09-14',
  scheduled: '2026-11-14',
  scheduledTime: '10:00',
  counseling: ['2026-10-03', '10:00'],
  pastor: PASTORS.head,
  notes:
    'Percakapan penggembalaan sudah dilaksanakan. Pewartaan nikah di warta 4 dan 11 Oktober 2026.',
})
const imanuel = member('Imanuel Lado')
const clara = member('Clara Ndun')
applications.push({
  type: 'MARRIAGE',
  applicant: `${imanuel.name} & ${clara.name}`,
  memberId: imanuel.id,
  partnerId: clara.id,
  form: {
    ...marriageForm(
      imanuel.name,
      [imanuel.birthPlace, imanuel.birthDate],
      HOME,
      clara.name,
      [clara.birthPlace, clara.birthDate],
      HOME,
      '2026-12-12',
    ),
    ...contact(imanuel, true),
  },
  docs: ['groom_certificates', 'bride_certificates'],
  docOwner: `${imanuel.name} dan ${clara.name}`,
  status: 'COUNSELING',
  created: '2026-10-12',
  counseling: ['2026-11-07', '10:00'],
  notes: 'Percakapan penggembalaan Sabtu, 7 November 2026 pukul 10.00 WITA di ruang konsistori.',
})
const arnold = member('Arnold Pah')
applications.push({
  type: 'MARRIAGE',
  applicant: `${arnold.name} & Nadia Riwu`,
  memberId: arnold.id,
  form: {
    ...marriageForm(
      arnold.name,
      [arnold.birthPlace, arnold.birthDate],
      HOME,
      'Nadia Riwu',
      ['Seba', '2000-05-08'],
      'GMIT di Seba, Sabu Raijua',
      '2027-01-16',
    ),
    ...contact(arnold, true),
  },
  docs: ['groom_certificates', 'bride_certificates', 'id_cards'],
  docOwner: `${arnold.name} dan Nadia Riwu`,
  status: 'PENDING',
  created: '2026-10-27',
})
const steven = member('Steven Ratu')
applications.push({
  type: 'MARRIAGE',
  applicant: `${steven.name} & Felicia Messakh`,
  memberId: steven.id,
  form: {
    ...marriageForm(
      steven.name,
      [steven.birthPlace, steven.birthDate],
      HOME,
      'Felicia Messakh',
      ['Soe', '1999-11-30'],
      'GMIT di Soe, Timor Tengah Selatan',
      '2027-02-06',
    ),
    ...contact(steven, true),
  },
  docs: ['groom_certificates'],
  docOwner: `${steven.name} dan Felicia Messakh`,
  status: 'REVISION',
  created: '2026-10-19',
  notes:
    'Surat baptis dan sidi mempelai wanita belum dilampirkan. Mohon diunggah melalui kantor jemaat.',
})
const babies = people
  .filter(
    (person) => person.birthDate >= '2026-01-01' && !person.baptized && person.status === 'ACTIVE',
  )
  .sort((a, b) => a.birthDate.localeCompare(b.birthDate))
const queueStatus: Application['status'][] = [
  'APPROVED',
  'APPROVED',
  'PENDING',
  'REVISION',
  'PENDING',
]
babies.slice(0, queueStatus.length).forEach((baby, index) => {
  const status = queueStatus[index]
  applications.push({
    type: 'BAPTISM',
    applicant: baby.name,
    memberId: baby.id,
    form: baptismForm(baby),
    docs: status === 'REVISION' ? ['family_card'] : ['birth_certificate', 'family_card'],
    docOwner: baby.name,
    status,
    created:
      status === 'APPROVED'
        ? randomDate('2026-10-05', '2026-10-15')
        : randomDate('2026-10-20', '2026-10-28'),
    scheduled: status === 'APPROVED' ? '2026-11-29' : undefined,
    scheduledTime: status === 'APPROVED' ? '07:00' : undefined,
    pastor: status === 'APPROVED' ? PASTORS.head : undefined,
    notes:
      status === 'REVISION'
        ? 'Akta kelahiran belum dilampirkan. Mohon diunggah sebelum 15 November 2026.'
        : status === 'APPROVED'
          ? 'Dilayankan pada Kebaktian Minggu Pagi, Minggu Adven I.'
          : undefined,
  })
})
const catechumens = people
  .filter(
    (person) =>
      person.birthDate >= '2009-06-01' &&
      person.birthDate <= '2010-12-31' &&
      person.baptized &&
      !person.sidi &&
      person.status === 'ACTIVE',
  )
  .slice(0, 5)
catechumens.forEach((person, index) => {
  const pending = index === catechumens.length - 1
  applications.push({
    type: 'SIDI',
    applicant: person.name,
    memberId: person.id,
    form: {
      full_name: person.name,
      gender: person.gender,
      birth_place: person.birthPlace,
      birth_date: person.birthDate,
      baptism_church: HOME,
      ...(person.baptismDate ? { baptism_date: person.baptismDate } : {}),
      father_name: fatherOf(person)?.name ?? '-',
      mother_name: motherOf(person)?.name ?? '-',
      ...contact(person),
    },
    docs: ['baptism_certificate', 'family_card'],
    docOwner: person.name,
    status: pending ? 'PENDING' : 'APPROVED',
    created: pending ? '2026-10-22' : randomDate('2026-09-07', '2026-09-26'),
    scheduled: pending ? undefined : pentecost(2027),
    scheduledTime: pending ? undefined : '07:00',
    pastor: pending ? undefined : PASTORS.head,
    notes: pending
      ? 'Mendaftar sesudah kelas dimulai; menunggu persetujuan majelis.'
      : 'Peserta katekisasi angkatan 2026/2027; peneguhan direncanakan Minggu Pentakosta 2027.',
  })
})
for (const application of applications.sort((a, b) => a.created.localeCompare(b.created))) {
  const docs = await documents(application.docs, application.docOwner, application.created)
  const updated =
    application.status === 'COMPLETED'
      ? application.scheduled!
      : application.status === 'PENDING'
        ? application.created
        : addDays(application.created, int(2, 6))
  insert('sacrament_applications', {
    registration_code: registrationCode(application.type),
    type: application.type,
    applicant_name: application.applicant,
    member_id: application.memberId,
    partner_member_id: application.partnerId ?? null,
    phone: phone(),
    form_data_json: JSON.stringify(application.form),
    documents_json: JSON.stringify(docs),
    status: application.status,
    scheduled_date: application.scheduled,
    scheduled_time: application.scheduledTime,
    counseling_date: application.counseling?.[0],
    counseling_time: application.counseling?.[1],
    officiating_pastor: application.pastor,
    certificate_number: application.certificate,
    notes: application.notes,
    created_at: utc(application.created, '11:00'),
    updated_at: utc(updated < application.created ? application.created : updated, '13:00'),
  })
}
await flush()

// ---------------------------------------------------------------------------------------
// Arsip surat, inventaris, dan peminjaman.

for (const mail of MAILS) {
  let file: string | null = null
  const subject = render(mail.subject)
  const party = render(mail.party)
  if (mail.file) {
    const pdf = textPdf(subject, [
      ...(mail.direction === 'OUTGOING'
        ? LETTERHEAD
        : [{ text: party.toUpperCase(), size: 12, bold: true }, { text: '' }]),
      { text: `Nomor: ${mail.number ?? '-'}`, gap: 4 },
      { text: `Tanggal: ${longDate(mail.date)}` },
      { text: `Perihal: ${subject}`, bold: true },
      { text: '' },
      {
        text:
          mail.direction === 'OUTGOING'
            ? `Kepada Yth. ${party}`
            : 'Kepada Yth. Majelis Jemaat GMIT Lahairoi Tuak Sabu Lasiana',
        gap: 6,
      },
      { text: 'di tempat', gap: 0 },
      { text: '' },
      {
        text: 'Salinan contoh untuk data demo aplikasi. Isi surat yang sebenarnya disimpan dalam arsip kertas Majelis Jemaat.',
        gap: 8,
      },
    ])
    file = (
      await store('surat', mail.date, `${mail.date}-${slugify(mail.number ?? subject)}.pdf`, pdf)
    ).url
  }
  insert('mail_archives', {
    direction: mail.direction,
    reference_number: mail.number,
    mail_date: mail.date,
    sender_or_recipient: party,
    subject,
    category: mail.category,
    file_url: file,
    created_at: utc(addDays(mail.date, 1), '10:00'),
    updated_at: utc(addDays(mail.date, 1), '10:00'),
  })
}

const LOANS: {
  asset: string
  borrower: string
  rayon?: string
  quantity: number
  from: string
  due: string
  returned?: string
  condition?: string
  notes?: string
}[] = [
  {
    asset: 'Proyektor',
    borrower: 'Pnt. Maria Lede (katekisasi)',
    quantity: 1,
    from: '2026-10-03',
    due: '2026-10-03',
    returned: '2026-10-03',
    condition: 'GOOD',
  },
  {
    asset: 'Kursi lipat besi',
    borrower: 'Keluarga Habel Kana',
    rayon: 'Golgota',
    quantity: 30,
    from: '2026-10-10',
    due: '2026-10-12',
    returned: '2026-10-12',
    condition: 'MINOR_DAMAGE',
    notes: 'Dua kursi kembali dalam keadaan bengkok.',
  },
  {
    asset: 'Kursi plastik',
    borrower: 'Keluarga duka alm. Lambertus Ga',
    rayon: 'Tiberias',
    quantity: 80,
    from: '2026-10-13',
    due: '2026-10-16',
    returned: '2026-10-16',
    condition: 'GOOD',
    notes: 'Ibadah penghiburan dan pemakaman.',
  },
  {
    asset: 'Tenda terop 4 x 6 m',
    borrower: 'Keluarga duka alm. Lambertus Ga',
    rayon: 'Tiberias',
    quantity: 2,
    from: '2026-10-13',
    due: '2026-10-16',
    returned: '2026-10-16',
    condition: 'GOOD',
  },
  {
    asset: 'Meja lipat panjang',
    borrower: 'Pnt. Hendrikus Ratu',
    rayon: 'Galilea',
    quantity: 6,
    from: '2026-10-18',
    due: '2026-10-20',
    notes: 'Ibadah syukur ulang tahun keluarga.',
  },
  {
    asset: 'Mikrofon nirkabel',
    borrower: 'Pengurus Kaum Ibu',
    quantity: 2,
    from: '2026-10-20',
    due: '2026-10-22',
    returned: '2026-10-22',
    condition: 'GOOD',
  },
  {
    asset: 'Gitar akustik',
    borrower: 'Sdr. Obed Pah (Persekutuan Pemuda)',
    rayon: 'Tiberias',
    quantity: 1,
    from: '2026-10-22',
    due: '2026-10-31',
  },
  {
    asset: 'Speaker aktif 15 inci',
    borrower: 'Persekutuan Pemuda',
    quantity: 2,
    from: '2026-10-24',
    due: '2026-10-25',
    returned: '2026-10-25',
    condition: 'GOOD',
  },
  {
    asset: 'Kursi plastik',
    borrower: 'Keluarga Zakarias Lay',
    rayon: 'Kapernaum',
    quantity: 60,
    from: '2026-10-24',
    due: '2026-10-26',
    returned: '2026-10-26',
    condition: 'GOOD',
    notes: 'Ibadah syukur ulang tahun pernikahan.',
  },
  {
    asset: 'Kursi plastik',
    borrower: 'Keluarga Frans Dethan',
    rayon: 'Getsemani',
    quantity: 40,
    from: '2026-10-27',
    due: '2026-11-02',
    notes: 'Ibadah syukur wisuda anak.',
  },
  {
    asset: 'Tenda terop 4 x 6 m',
    borrower: 'Keluarga Frans Dethan',
    rayon: 'Getsemani',
    quantity: 1,
    from: '2026-10-27',
    due: '2026-11-02',
  },
  {
    asset: 'Kursi plastik',
    borrower: 'Keluarga Petrus Wadu',
    rayon: 'Galilea',
    quantity: 50,
    from: '2026-09-19',
    due: '2026-09-21',
    returned: '2026-09-22',
    condition: 'GOOD',
  },
  {
    asset: 'Tenda terop 4 x 6 m',
    borrower: 'Keluarga Simon Rihi',
    rayon: 'Tiberias',
    quantity: 1,
    from: '2026-08-15',
    due: '2026-08-17',
    returned: '2026-08-17',
    condition: 'GOOD',
  },
]
const borrowed = new Map<string, number>()
for (const loan of LOANS)
  if (!loan.returned) borrowed.set(loan.asset, (borrowed.get(loan.asset) ?? 0) + loan.quantity)
ASSETS.forEach((asset, index) => {
  insert('assets', {
    id: index + 1,
    asset_code: `INV-${pad(index + 1, 4)}`,
    name: asset.name,
    category: asset.category,
    quantity: asset.quantity,
    available_quantity: asset.quantity - (borrowed.get(asset.name) ?? 0),
    location: asset.location,
    acquisition_source: asset.source,
    acquisition_year: asset.year,
    estimated_value: asset.value,
    condition: asset.condition ?? 'GOOD',
    notes: asset.notes,
    created_at: utc('2026-01-15', '10:00'),
    updated_at: utc(asset.condition === 'MAINTENANCE' ? '2026-10-20' : '2026-01-15', '10:00'),
  })
})
for (const loan of LOANS.sort((a, b) => a.from.localeCompare(b.from))) {
  insert('asset_loans', {
    asset_id: ASSETS.findIndex((asset) => asset.name === loan.asset) + 1,
    borrower_name: loan.borrower,
    rayon_id: loan.rayon ? RAYONS.find((rayon) => rayon.name === loan.rayon)!.id : null,
    quantity_borrowed: loan.quantity,
    borrow_date: loan.from,
    due_date: loan.due,
    return_date: loan.returned,
    return_condition: loan.condition,
    status: loan.returned ? 'RETURNED' : 'BORROWED',
    notes: loan.notes,
    created_at: utc(loan.from, '09:00'),
    updated_at: utc(loan.returned ?? loan.from, '17:00'),
  })
}
await flush()

// ---------------------------------------------------------------------------------------
// Log aktivitas sepekan terakhir (masuk, renungan, transaksi, kehadiran, sakramen).

function audit(
  user: number,
  action: string,
  entity: string,
  entityId: number | null,
  stamp: string,
  label?: string,
  data?: Record<string, unknown>,
) {
  if (!user) return
  insert('audit_logs', {
    user_id: user,
    action,
    entity_type: entity,
    entity_id: entityId,
    details_json: JSON.stringify({ ...(label ? { label } : {}), ...(data ?? {}), ip: null }),
    created_at: stamp,
  })
}
for (let date = '2026-10-19'; date <= TODAY; date = addDays(date, 1)) {
  if (weekday(date) !== 0)
    audit(PASTOR, 'LOGIN', 'users', PASTOR, utc(date, `0${int(6, 8)}:${pad(int(0, 59))}`))
  if (weekday(date) === 1 || weekday(date) === 2)
    audit(TREASURER, 'LOGIN', 'users', TREASURER, utc(date, `1${int(0, 1)}:${pad(int(0, 59))}`))
}
const recentTx = await db
  .prepare(
    `SELECT id, description, amount, transaction_date FROM finance_transactions WHERE transaction_date >= '2026-10-18' ORDER BY id`,
  )
  .all<{ id: number; description: string; amount: number; transaction_date: string }>()
for (const row of recentTx.results.slice(0, 18)) {
  audit(
    TREASURER,
    'CREATE',
    'finance_transactions',
    row.id,
    utc(addDays(row.transaction_date, 1), `10:${pad(int(5, 55))}`),
    `${row.description} · ${rupiah(row.amount)}`,
  )
}
for (const worship of worships.filter(
  (item) => item.attendance && item.date >= '2026-10-21' && item.date < TODAY,
)) {
  const elder = worship.rayon ? userId[`majelis.${worship.rayon.toLowerCase()}`] : PASTOR
  audit(
    elder,
    'UPDATE',
    'worship_schedules',
    worship.id,
    utc(addDays(worship.date, 1), '08:30'),
    `“${worship.title}” ${longDate(worship.date)}`,
    {
      changes: {
        attendance_men: { from: null, to: worship.attendance![0] },
        attendance_women: { from: null, to: worship.attendance![1] },
        attendance_youth_children: { from: null, to: worship.attendance![2] },
      },
    },
  )
}
const contentRows = await db
  .prepare(
    `SELECT id, title, category FROM public_contents WHERE category = 'DEVOTIONAL' AND published_at >= '2026-10-29' ORDER BY id`,
  )
  .all<{ id: number; title: string; category: string }>()
for (const row of contentRows.results) {
  audit(
    PASTOR,
    'CREATE',
    'public_contents',
    row.id,
    utc('2026-10-26', `19:${pad(int(5, 55))}`),
    row.title,
  )
}
const queueRows = await db
  .prepare(
    `SELECT id, applicant_name, status FROM sacrament_applications WHERE status IN ('APPROVED', 'REVISION', 'COUNSELING') AND created_at >= '2026-10-01' ORDER BY id`,
  )
  .all<{ id: number; applicant_name: string; status: string }>()
for (const row of queueRows.results) {
  audit(
    PASTOR,
    'UPDATE',
    'sacrament_applications',
    row.id,
    utc('2026-10-23', `09:${pad(int(5, 55))}`),
    row.applicant_name,
    {
      changes: { status: { from: 'PENDING', to: row.status } },
    },
  )
}
await flush()

// ---------------------------------------------------------------------------------------

await dispose()
if (newPasswords.length && !dryRun) {
  const file = path.join(root, 'scripts', 'demo-accounts.local')
  writeFileSync(
    file,
    `# Akun pengurus contoh dari npm run db:seed:demo (database lokal). Jangan di-commit.\n${newPasswords.join('\n')}\n`,
  )
}
const active = people.filter((person) => person.status === 'ACTIVE').length
console.log(`${dryRun ? 'Uji coba (tanpa menulis)' : 'Data demo tersimpan di database lokal'}:`)
console.log(
  `  ${families.length} KK, ${active} jiwa aktif (${people.length - active} pindah/meninggal)`,
)
console.log(`  ${worships.length} jadwal ibadah, ${counts.worship_servants ?? 0} petugas`)
console.log(`  ${transactions.length} transaksi, ${BUDGETS.length} mata anggaran RAPBJ 2026`)
console.log(`  ${contents.length} konten portal, ${applications.length} pendaftaran sakramen`)
console.log(
  `  ${MAILS.length} surat, ${ASSETS.length} inventaris, ${LOANS.length} peminjaman, ${filesStored} berkas`,
)
const byStatus = (status: string) => applications.filter((item) => item.status === status).length
console.log(
  `  Sakramen: baptisan 2026 ${baptisms2026.length}, sidi 2026 ${sidi2026.length}, nikah 2026 ${MARRIED_2026.length}; ` +
    `antrean ${byStatus('PENDING')} menunggu, ${byStatus('REVISION')} revisi, ${byStatus('COUNSELING')} konseling, ${byStatus('APPROVED')} disetujui`,
)
console.log(
  `  Saldo per Pos Kas: ${Object.keys(FUND_NAMES)
    .map((fund) => {
      const list = transactions.filter((item) => item.fund === fund)
      const balance =
        sum(list.filter((item) => item.type === 'INCOME')) -
        sum(list.filter((item) => item.type === 'EXPENSE'))
      return `${fund} ${rupiah(balance)}`
    })
    .join(', ')}`,
)
if (newPasswords.length && !dryRun) {
  console.log(
    '\nKata sandi akun contoh tersimpan di scripts/demo-accounts.local (tidak di-commit).',
  )
}
