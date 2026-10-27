import { Hono } from 'hono'
import { ROLE_LABELS, type ApiErrorBody } from '../../shared/types'
import {
  UPLOAD_FOLDER_ROLES,
  UPLOAD_MAX_BYTES,
  UPLOAD_TYPES,
  isUploadFolder,
  type UploadContentType,
  type UploadedFile,
} from '../../shared/uploads'
import { requireAuth } from '../middleware/auth'
import type { AppEnv } from '../types'

const uploads = new Hono<AppEnv>()

uploads.post('/', requireAuth, async (c) => {
  const form = await c.req.formData().catch(() => null)
  const file = form?.get('file')
  const folder = form?.get('folder')

  if (!(file instanceof File)) {
    return c.json<ApiErrorBody>({ error: 'Berkas wajib dilampirkan pada field "file".' }, 400)
  }
  if (!isUploadFolder(folder)) {
    return c.json<ApiErrorBody>({ error: 'Folder unggahan tidak dikenal.' }, 400)
  }
  const allowedRoles = UPLOAD_FOLDER_ROLES[folder]
  if (!allowedRoles.includes(c.get('user').role)) {
    const allowed = allowedRoles.map((role) => ROLE_LABELS[role]).join(', ')
    return c.json<ApiErrorBody>(
      { error: `Akses ditolak. Unggahan ke folder ${folder} hanya untuk ${allowed}.` },
      403,
    )
  }
  if (file.size === 0) {
    return c.json<ApiErrorBody>({ error: 'Berkas kosong.' }, 400)
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    return c.json<ApiErrorBody>({ error: 'Ukuran berkas maksimal 10 MB.' }, 413)
  }

  // Jenis berkas ditentukan dari isinya, bukan dari Content-Type kiriman klien.
  const contentType = detectContentType(new Uint8Array(await file.slice(0, 12).arrayBuffer()))
  if (!contentType) {
    return c.json<ApiErrorBody>(
      { error: 'Jenis berkas tidak didukung. Gunakan JPG, PNG, WebP, atau PDF.' },
      415,
    )
  }

  const now = new Date()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const key = `${folder}/${now.getUTCFullYear()}/${month}/${crypto.randomUUID()}.${UPLOAD_TYPES[contentType]}`

  await c.env.FILES.put(key, file, {
    httpMetadata: {
      contentType,
      contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    },
    customMetadata: { originalName: file.name },
  })

  return c.json<UploadedFile>(
    { key, url: `/api/files/${key}`, name: file.name, size: file.size, contentType },
    201,
  )
})

function detectContentType(head: Uint8Array): UploadContentType | null {
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

export default uploads
