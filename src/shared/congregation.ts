import { NAME_MAX_LENGTH, type FieldErrors } from './accounts'
import { witaToday } from './dates'
import { createReader, upper } from './form-reader'
import {
  BLOOD_TYPES,
  CATEGORICAL_GROUPS,
  CATEGORICAL_GROUP_LABELS,
  FAMILY_RELATIONS,
  FAMILY_RELATION_LABELS,
  GENDERS,
  GENDER_LABELS,
  MARRIAGE_STATUSES,
  MARRIAGE_STATUS_LABELS,
  MEMBER_STATUSES,
  MEMBER_STATUS_LABELS,
  type Member,
} from './types'

// Aturan data Rayon, Kartu Keluarga, dan Anggota Jemaat, dipakai bersama oleh API
// (src/worker) dan form di dashboard (src/client), sehingga pesan kesalahannya
// selalu sama di keduanya.
//
// parse*Input membaca dan menormalkan body POST/PUT: teks dirapikan, '' dan null
// berarti dikosongkan, field yang tidak dikirim tidak diubah (mode update).

type Mode = 'create' | 'update'
type Body = Record<string, unknown>

export type RayonFields = {
  name: string
  description: string | null
  coordinator_name: string | null
}

export type FamilyFields = {
  kk_number: string | null
  family_head_name: string
  rayon_id: number
  address: string | null
  phone: string | null
}

export type MemberFields = Omit<Member, 'id' | 'created_at' | 'updated_at'>

// Nilai bawaan anggota baru untuk field yang tidak dikirim.
export const NEW_MEMBER: Omit<
  MemberFields,
  'family_id' | 'full_name' | 'gender' | 'family_relation'
> = {
  church_member_number: null,
  nik: null,
  birth_place: null,
  birth_date: null,
  blood_type: null,
  education: null,
  occupation: null,
  categorical_group: null,
  baptism_status: false,
  baptism_date: null,
  sidi_status: false,
  sidi_date: null,
  marriage_status: null,
  marriage_date: null,
  status: 'ACTIVE',
}

const RAYON_NAME_MAX_LENGTH = 50
const NUMBER_MAX_LENGTH = 30
const TEXT_MAX_LENGTH = 100

export function parseRayonInput(body: Body, mode: Mode) {
  const read = createReader(body, mode)
  read.text('name', 'Nama rayon', { max: RAYON_NAME_MAX_LENGTH, required: true })
  read.text('description', 'Keterangan', { max: 500 })
  read.text('coordinator_name', 'Nama koordinator', { max: NAME_MAX_LENGTH })
  return { input: read.input as Partial<RayonFields>, details: read.details }
}

export function parseFamilyInput(body: Body, mode: Mode) {
  const read = createReader(body, mode)
  read.text('kk_number', 'Nomor KK', { max: NUMBER_MAX_LENGTH, normalize: upper })
  read.text('family_head_name', 'Nama kepala keluarga', { max: NAME_MAX_LENGTH, required: true })
  read.id('rayon_id', 'rayon')
  read.text('address', 'Alamat', { max: 255 })
  read.text('phone', 'Nomor telepon', {
    max: 16,
    normalize: (value) => value.replace(/[\s().-]/g, ''),
    pattern: [/^\+?\d{8,15}$/, 'Nomor telepon 8–15 angka, boleh diawali +.'],
  })
  return { input: read.input as Partial<FamilyFields>, details: read.details }
}

export function parseMemberInput(body: Body, mode: Mode, today = witaToday()) {
  const read = createReader(body, mode)
  read.id('family_id', 'Kartu Keluarga')
  read.text('church_member_number', 'Nomor Induk', { max: NUMBER_MAX_LENGTH, normalize: upper })
  read.text('nik', 'NIK', {
    max: 16,
    normalize: (value) => value.replace(/[\s.-]/g, ''),
    pattern: [/^\d{16}$/, 'NIK harus 16 angka.'],
  })
  read.text('full_name', 'Nama lengkap', { max: NAME_MAX_LENGTH, required: true })
  read.choice('gender', 'jenis kelamin', GENDERS, GENDER_LABELS, { required: true })
  read.text('birth_place', 'Tempat lahir', { max: TEXT_MAX_LENGTH })
  read.date('birth_date', 'Tanggal lahir', today)
  read.choice('blood_type', 'golongan darah', BLOOD_TYPES)
  read.choice('family_relation', 'hubungan keluarga', FAMILY_RELATIONS, FAMILY_RELATION_LABELS, {
    required: true,
  })
  read.text('education', 'Pendidikan', { max: TEXT_MAX_LENGTH })
  read.text('occupation', 'Pekerjaan', { max: TEXT_MAX_LENGTH })
  read.choice(
    'categorical_group',
    'kategori pelayanan',
    CATEGORICAL_GROUPS,
    CATEGORICAL_GROUP_LABELS,
  )
  read.flag('baptism_status', 'Status baptis')
  read.date('baptism_date', 'Tanggal baptis', today)
  read.flag('sidi_status', 'Status sidi')
  read.date('sidi_date', 'Tanggal sidi', today)
  read.choice('marriage_status', 'status pernikahan', MARRIAGE_STATUSES, MARRIAGE_STATUS_LABELS)
  read.date('marriage_date', 'Tanggal nikah', today)
  read.choice('status', 'status keanggotaan', MEMBER_STATUSES, MEMBER_STATUS_LABELS, {
    nullable: false,
  })

  // Tanggal baptis/sidi yang diisi tanpa statusnya berarti sudah dibaptis/sidi.
  const input = read.input as Partial<MemberFields>
  if (input.baptism_date && !read.has('baptism_status')) input.baptism_status = true
  if (input.sidi_date && !read.has('sidi_status')) input.sidi_status = true
  return { input, details: read.details }
}

// Aturan yang melibatkan beberapa field, diperiksa pada data akhir (setelah PUT
// digabung dengan data tersimpan).
export function validateMember(next: MemberFields, details: FieldErrors) {
  const fail = (key: keyof MemberFields, message: string) => {
    if (!details[key]) details[key] = [message]
  }
  if (next.baptism_date && !next.baptism_status) {
    fail('baptism_date', 'Tanggal baptis hanya diisi untuk jemaat yang sudah dibaptis.')
  }
  if (next.sidi_status && !next.baptism_status) {
    fail('sidi_status', 'Sidi hanya untuk jemaat yang sudah dibaptis.')
  }
  if (next.sidi_date && !next.sidi_status) {
    fail('sidi_date', 'Tanggal sidi hanya diisi untuk jemaat yang sudah sidi.')
  }
  if (next.marriage_date && (next.marriage_status ?? 'SINGLE') === 'SINGLE') {
    fail('marriage_date', 'Tanggal nikah hanya diisi untuk jemaat yang pernah menikah.')
  }
  const events = [
    ['baptism_date', 'Tanggal baptis'],
    ['sidi_date', 'Tanggal sidi'],
    ['marriage_date', 'Tanggal nikah'],
  ] as const
  for (const [key, label] of events) {
    const date = next[key]
    if (date && next.birth_date && date < next.birth_date) {
      fail(key, `${label} tidak boleh sebelum tanggal lahir.`)
    }
  }
  if (next.baptism_date && next.sidi_date && next.sidi_date < next.baptism_date) {
    fail('sidi_date', 'Tanggal sidi tidak boleh sebelum tanggal baptis.')
  }
}
