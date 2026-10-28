import { Hono } from 'hono'
import { ROLE_LABELS, type ApiErrorBody } from '../../shared/types'
import {
  UPLOAD_FOLDER_ROLES,
  UPLOAD_MAX_BYTES,
  isUploadFolder,
  type UploadedFile,
} from '../../shared/uploads'
import { detectContentType, storeUpload } from '../lib/uploads'
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

  const contentType = await detectContentType(file)
  if (!contentType) {
    return c.json<ApiErrorBody>(
      { error: 'Jenis berkas tidak didukung. Gunakan JPG, PNG, WebP, atau PDF.' },
      415,
    )
  }

  return c.json<UploadedFile>(await storeUpload(c.env.FILES, folder, file, contentType), 201)
})

export default uploads
