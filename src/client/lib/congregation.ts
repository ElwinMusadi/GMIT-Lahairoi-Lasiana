import { witaToday } from '@shared/dates'
import {
  CATEGORICAL_GROUP_LABELS,
  type CategoricalGroup,
  type Family,
  type Gender,
  type MarriageStatus,
  type Member,
} from '@shared/types'

// Tampilan data jemaat yang dipakai bersama oleh halaman KK, Anggota Jemaat, dan
// form profil.

// KK yang bisa dipilih di form anggota (dari daftar KK atau dari data anggota).
export type FamilyChoice = Pick<Family, 'id' | 'kk_number' | 'family_head_name' | 'rayon_name'>

// Umur dalam tahun penuh pada hari ini (WITA), atau null bila tanggal lahir kosong.
export function ageOn(birthDate: string | null, today = witaToday()): number | null {
  if (!birthDate) return null
  const [year, month, day] = birthDate.split('-').map(Number)
  const [toYear, toMonth, toDay] = today.split('-').map(Number)
  const beforeBirthday = toMonth < month || (toMonth === month && toDay < day)
  return toYear - year - (beforeBirthday ? 1 : 0)
}

// "Sudah sidi" (sidi selalu setelah baptis), "Baptis, belum sidi", atau "Belum baptis".
export function sacramentSummary(member: Pick<Member, 'baptism_status' | 'sidi_status'>) {
  if (member.sidi_status) return 'Sudah sidi'
  return member.baptism_status ? 'Baptis, belum sidi' : 'Belum baptis'
}

// "LHR-001 · Yakob Lado", atau nama kepala keluarga saja untuk KK tanpa nomor.
export function familyName(family: Pick<Family, 'kk_number' | 'family_head_name'>) {
  return family.kk_number
    ? `${family.kk_number} · ${family.family_head_name}`
    : family.family_head_name
}

export function categoricalLabel(group: CategoricalGroup | null) {
  return group ? CATEGORICAL_GROUP_LABELS[group] : null
}

// Saran kategori pelayanan dari umur, jenis kelamin, dan status nikah, untuk
// mempercepat pengisian; pengurus tetap memilih sendiri. Batas umur: PAR di bawah
// 17 tahun, Pemuda sampai 35 tahun selama belum menikah, Lansia mulai 60 tahun.
export function suggestCategoricalGroup(input: {
  age: number | null
  gender: Gender | ''
  marriageStatus: MarriageStatus | ''
}): CategoricalGroup | null {
  const { age, gender, marriageStatus } = input
  const married = marriageStatus !== '' && marriageStatus !== 'SINGLE'
  if (age !== null && age >= 60) return 'LANSIA'
  if (!married && age !== null && age < 17) return 'PAR'
  if (!married && age !== null && age <= 35) return 'PEMUDA'
  if (!gender || (!married && age === null)) return null
  return gender === 'MALE' ? 'KAUM_BAPAK' : 'KAUM_IBU'
}

// Pilihan pendidikan yang umum di data jemaat; isian lain tetap diterima.
export const EDUCATION_OPTIONS = [
  'Belum sekolah',
  'SD',
  'SMP',
  'SMA/SMK',
  'D1–D3',
  'S1/D4',
  'S2',
  'S3',
]
