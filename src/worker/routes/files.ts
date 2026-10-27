import { Hono } from 'hono'
import type { ApiErrorBody } from '../../shared/types'
import type { AppEnv } from '../types'

// Menyajikan berkas dari R2 dengan kunci yang dibuat oleh POST /api/uploads.
const KEY_PATTERN = /^[a-z]+\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/

const files = new Hono<AppEnv>()

files.get('/*', async (c) => {
  const key = c.req.path.replace(/^\/api\/files\//, '')
  if (!KEY_PATTERN.test(key)) {
    return c.json<ApiErrorBody>({ error: 'Berkas tidak ditemukan' }, 404)
  }

  const object = await c.env.FILES.get(key, { onlyIf: c.req.raw.headers })
  if (!object) {
    return c.json<ApiErrorBody>({ error: 'Berkas tidak ditemukan' }, 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'private, max-age=3600')

  // onlyIf terpenuhi (If-None-Match cocok): R2 mengembalikan metadata tanpa body.
  if (!('body' in object)) {
    return new Response(null, { status: 304, headers })
  }
  return new Response(object.body, { headers })
})

export default files
