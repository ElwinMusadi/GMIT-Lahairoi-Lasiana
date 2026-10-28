import { createReader } from './form-reader'
import {
  MAIL_CATEGORIES,
  MAIL_CATEGORY_LABELS,
  MAIL_DIRECTIONS,
  MAIL_DIRECTION_LABELS,
  type MailCategory,
  type MailDirection,
} from './types'

// Aturan data Buku Agenda Surat Masuk & Keluar (PRD: Layanan Sakramen & Arsip
// Persuratan), dipakai bersama oleh API dan form dashboard.

type Body = Record<string, unknown>

export type MailFields = {
  direction: MailDirection
  reference_number: string | null
  mail_date: string
  sender_or_recipient: string
  subject: string
  category: MailCategory
  file_url: string | null
}

// Salinan surat yang diunggah lewat POST /api/uploads ke folder surat (khusus pengurus).
const FILE_PATTERN = /^\/api\/files\/surat\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(?:pdf|jpg|png|webp)$/

// Body POST /api/mails. today: tanggal hari ini (WITA); tanggal surat tidak boleh
// melewatinya.
export function parseMailInput(body: Body, today: string) {
  const read = createReader(body, 'create')
  read.choice('direction', 'arah surat', MAIL_DIRECTIONS, MAIL_DIRECTION_LABELS, {
    required: true,
  })
  read.date('mail_date', 'Tanggal surat', today, { required: true })
  read.text('reference_number', 'Nomor surat', { max: 100 })
  const outgoing =
    String(body.direction ?? '')
      .trim()
      .toUpperCase() === 'OUTGOING'
  const sender = outgoing ? 'Penerima' : 'Pengirim'
  read.text('sender_or_recipient', sender, { max: 200, required: true })
  read.text('subject', 'Perihal', { max: 300, required: true })
  read.choice('category', 'kategori', MAIL_CATEGORIES, MAIL_CATEGORY_LABELS)
  read.text('file_url', 'Salinan surat', {
    max: 200,
    pattern: [FILE_PATTERN, 'Salinan surat harus berkas yang diunggah ke folder surat.'],
  })
  return { input: read.input as Partial<MailFields>, details: read.details }
}
