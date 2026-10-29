import {
  GENDER_LABELS,
  type Gender,
  type SacramentDetail,
  type SacramentStatus,
  type SacramentType,
} from '@shared/types'
import { formatLongDate } from '@/lib/finance'

// Bagian bersama halaman Layanan Sakramen di dashboard: antrean, rincian verifikasi,
// buku induk, dan cetak sertifikat.

export const TYPE_SHORT: Record<SacramentType, string> = {
  BAPTISM: 'Baptisan',
  SIDI: 'Sidi',
  MARRIAGE: 'Nikah',
}

// Sebutan pendek untuk pil di tabel; sebutan lengkap ada di SACRAMENT_STATUS_LABELS.
export const STATUS_SHORT: Record<SacramentStatus, string> = {
  PENDING: 'Menunggu',
  REVISION: 'Revisi berkas',
  COUNSELING: 'Konseling',
  APPROVED: 'Disetujui',
  COMPLETED: 'Selesai',
}

// Arti tiap status dan isian yang dibutuhkannya, untuk panel verifikasi.
export const STATUS_HINTS: Record<SacramentStatus, string> = {
  PENDING: 'Berkas belum diperiksa.',
  REVISION: 'Pendaftar perlu memperbaiki berkas; tulis apa yang kurang di catatan.',
  COUNSELING: 'Tetapkan jadwal konseling/penggembalaan.',
  APPROVED: 'Tetapkan tanggal pelaksanaan dan pendeta yang melayani.',
  COMPLETED: 'Sakramen sudah dilaksanakan; dicatat di buku induk dan data jemaat diperbarui.',
}

// "Kupang, 30 Juni 2026"
export function placeAndDate(place: unknown, date: unknown): string {
  const parts = [
    typeof place === 'string' ? place : null,
    typeof date === 'string' && date ? formatLongDate(date) : null,
  ].filter(Boolean)
  return parts.join(', ')
}

const text = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : ''

export type CertificateRow = { key: string; label: string; value: string }

export type CertificateContent = {
  title: string
  statement: string
  verse: string
  verseSource: string
  // Judul kelompok baris (mis. mempelai pria) beserta barisnya.
  groups: { heading: string | null; rows: CertificateRow[] }[]
  number: string
  // Tempat dan tanggal penandatanganan, mis. "Lasiana, 1 November 2026".
  signedAt: string
  pastor: string
}

// Isi sertifikat dari data buku induk: isian formulir pendaftaran, tanggal pelaksanaan,
// pendeta, dan nomor register.
export function certificateContent(application: SacramentDetail): CertificateContent {
  const data = application.form_data
  const date = application.scheduled_date ? formatLongDate(application.scheduled_date) : ''
  const pastor = application.officiating_pastor ?? ''
  const gender = (value: unknown) =>
    typeof value === 'string' && value in GENDER_LABELS ? GENDER_LABELS[value as Gender] : ''
  const common = {
    number: application.certificate_number ?? '',
    signedAt: date ? `Lasiana, ${date}` : '',
    pastor,
  }

  if (application.type === 'MARRIAGE') {
    const person = (prefix: 'groom' | 'bride') => [
      { key: `${prefix}_name`, label: 'Nama', value: text(data[`${prefix}_name`]) },
      {
        key: `${prefix}_birth`,
        label: 'Tempat, tanggal lahir',
        value: placeAndDate(data[`${prefix}_birth_place`], data[`${prefix}_birth_date`]),
      },
      { key: `${prefix}_church`, label: 'Jemaat asal', value: text(data[`${prefix}_church`]) },
    ]
    return {
      ...common,
      title: 'Surat Nikah Gerejawi',
      statement:
        'Majelis Jemaat GMIT Lahairoi Tuak Sabu Lasiana menerangkan bahwa kedua mempelai berikut telah menerima pemberkatan nikah kudus di hadapan Tuhan dan jemaat-Nya:',
      verse: 'Apa yang telah dipersatukan Allah, tidak boleh diceraikan manusia.',
      verseSource: 'Markus 10:9',
      groups: [
        { heading: 'Mempelai pria', rows: person('groom') },
        { heading: 'Mempelai wanita', rows: person('bride') },
        {
          heading: null,
          rows: [
            { key: 'date', label: 'Tanggal pemberkatan', value: date },
            { key: 'pastor', label: 'Dilayani oleh', value: pastor },
          ],
        },
      ],
    }
  }

  const subject = [
    { key: 'full_name', label: 'Nama', value: text(data.full_name) },
    {
      key: 'birth',
      label: 'Tempat, tanggal lahir',
      value: placeAndDate(data.birth_place, data.birth_date),
    },
    { key: 'gender', label: 'Jenis kelamin', value: gender(data.gender) },
  ]
  if (application.type === 'SIDI') {
    return {
      ...common,
      title: 'Surat Peneguhan Sidi',
      statement:
        'Majelis Jemaat GMIT Lahairoi Tuak Sabu Lasiana menerangkan bahwa saudara/saudari berikut telah mengaku percaya dan diteguhkan sebagai anggota sidi jemaat:',
      verse: 'Hendaklah kamu tetap berakar di dalam Dia dan dibangun di atas Dia.',
      verseSource: 'Kolose 2:7',
      groups: [
        {
          heading: null,
          rows: [
            ...subject,
            {
              key: 'baptism',
              label: 'Dibaptis di',
              value: [
                text(data.baptism_church),
                typeof data.baptism_date === 'string' ? formatLongDate(data.baptism_date) : '',
              ]
                .filter(Boolean)
                .join(', '),
            },
            { key: 'date', label: 'Tanggal peneguhan', value: date },
            { key: 'pastor', label: 'Dilayani oleh', value: pastor },
          ],
        },
      ],
    }
  }
  return {
    ...common,
    title: 'Surat Baptisan Kudus',
    statement:
      'Majelis Jemaat GMIT Lahairoi Tuak Sabu Lasiana menerangkan bahwa anak berikut telah menerima Sakramen Baptisan Kudus dalam nama Bapa, Anak, dan Roh Kudus:',
    verse: 'Biarkan anak-anak itu datang kepada-Ku, jangan menghalang-halangi mereka.',
    verseSource: 'Markus 10:14',
    groups: [
      {
        heading: null,
        rows: [
          ...subject,
          { key: 'father', label: 'Nama ayah', value: text(data.father_name) },
          { key: 'mother', label: 'Nama ibu', value: text(data.mother_name) },
          { key: 'date', label: 'Tanggal baptisan', value: date },
          { key: 'pastor', label: 'Dilayani oleh', value: pastor },
        ],
      },
    ],
  }
}

// Kalibrasi blangko per jenis sertifikat, disimpan di peramban ini saja (setiap
// printer bisa berbeda). Boleh hilang; nilai bawaannya 0.
export type Margins = { top: number; left: number }

const marginKey = (type: SacramentType) => `gmit-lahairoi:margin-blangko:${type}`

export function loadMargins(type: SacramentType): Margins {
  try {
    const parsed = JSON.parse(localStorage.getItem(marginKey(type)) ?? 'null') as Margins | null
    if (parsed && Number.isFinite(parsed.top) && Number.isFinite(parsed.left)) return parsed
  } catch {
    // Penyimpanan tidak tersedia.
  }
  return { top: 0, left: 0 }
}

export function saveMargins(type: SacramentType, margins: Margins) {
  try {
    localStorage.setItem(marginKey(type), JSON.stringify(margins))
  } catch {
    // Penyimpanan tidak tersedia; kalibrasi berlaku sampai halaman ditutup.
  }
}
