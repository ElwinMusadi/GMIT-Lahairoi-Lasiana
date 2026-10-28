import {
  UPLOAD_TYPES,
  type UploadContentType,
  type UploadFolder,
  type UploadedFile,
} from '../../shared/uploads'

// Penyimpanan berkas ke R2, dipakai POST /api/uploads (pengurus) dan pendaftaran
// sakramen dari portal (berkas dikirim bersama formulirnya).

// Jenis berkas ditentukan dari isinya, bukan dari Content-Type kiriman klien.
export async function detectContentType(file: File): Promise<UploadContentType | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const startsWith = (bytes: number[], offset = 0) =>
    bytes.every((byte, i) => head[offset + i] === byte)

  if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp'
  }
  if (startsWith([0x25, 0x50, 0x44, 0x46])) return 'application/pdf'
  return null
}

// Kunci unik per berkas: folder/tahun/bulan/uuid.ext. Berkas tidak pernah ditimpa.
export async function storeUpload(
  bucket: R2Bucket,
  folder: UploadFolder,
  file: File,
  contentType: UploadContentType,
): Promise<UploadedFile> {
  const now = new Date()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const key = `${folder}/${now.getUTCFullYear()}/${month}/${crypto.randomUUID()}.${UPLOAD_TYPES[contentType]}`
  await bucket.put(key, file, {
    httpMetadata: {
      contentType,
      contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    },
    customMetadata: { originalName: file.name },
  })
  return { key, url: `/api/files/${key}`, name: file.name, size: file.size, contentType }
}
