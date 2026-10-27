// Aturan unggah berkas yang dipakai bersama oleh API (validasi akhir) dan frontend
// (validasi awal sebelum berkas dikirim).

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024

// Folder di bucket R2, satu per jenis dokumen di PRD.
export const UPLOAD_FOLDERS = [
  'warta', // PDF Warta Jemaat
  'konten', // gambar sampul renungan, berita, QRIS
  'media', // galeri foto dokumentasi
  'kuitansi', // bukti transaksi keuangan
  'liturgi', // PDF tata ibadah
  'sakramen', // berkas syarat pendaftaran sakramen
  'surat', // salinan arsip surat
] as const
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number]

// Jenis berkas yang diterima beserta ekstensi yang disimpan.
export const UPLOAD_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
} as const
export type UploadContentType = keyof typeof UPLOAD_TYPES

export type UploadedFile = {
  key: string
  url: string
  name: string
  size: number
  contentType: UploadContentType
}

export function isUploadFolder(value: unknown): value is UploadFolder {
  return typeof value === 'string' && (UPLOAD_FOLDERS as readonly string[]).includes(value)
}

export function isUploadContentType(value: unknown): value is UploadContentType {
  return typeof value === 'string' && value in UPLOAD_TYPES
}
