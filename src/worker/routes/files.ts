import { Hono } from 'hono'
import type { ApiErrorBody } from '../../shared/types'
import { PUBLIC_UPLOAD_FOLDERS, isUploadFolder } from '../../shared/uploads'
import { authenticate } from '../middleware/auth'
import type { AppEnv } from '../types'

// Menyajikan berkas dari R2 dengan kunci yang dibuat oleh POST /api/uploads.
// Folder portal (warta, konten, media, liturgi) terbuka untuk umum; folder lain
// (kuitansi, berkas sakramen, arsip surat) hanya untuk pengurus yang sudah masuk.
const KEY_PATTERN = /^([a-z]+)\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/

const files = new Hono<AppEnv>()

files.get('/*', async (c) => {
  const key = c.req.path.replace(/^\/api\/files\//, '')
  const folder = KEY_PATTERN.exec(key)?.[1]
  if (!isUploadFolder(folder)) {
    return c.json<ApiErrorBody>({ error: 'Berkas tidak ditemukan' }, 404)
  }

  const isPublic = PUBLIC_UPLOAD_FOLDERS.includes(folder)
  if (!isPublic) {
    const result = await authenticate(c)
    if (!result.ok) return c.json<ApiErrorBody>({ error: result.error }, 401)
  }

  const object = await c.env.FILES.get(key, { onlyIf: c.req.raw.headers })
  if (!object) {
    return c.json<ApiErrorBody>({ error: 'Berkas tidak ditemukan' }, 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  // Kunci berkas unik (UUID) dan tidak pernah ditimpa, jadi berkas publik aman di-cache lama.
  headers.set(
    'cache-control',
    isPublic ? 'public, max-age=31536000, immutable' : 'private, no-cache',
  )

  // onlyIf terpenuhi (If-None-Match cocok): R2 mengembalikan metadata tanpa body.
  if (!('body' in object)) {
    return new Response(null, { status: 304, headers })
  }
  return new Response(object.body, { headers })
})

export default files
