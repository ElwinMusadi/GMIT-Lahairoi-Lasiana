import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import type { ApiErrorBody } from '../shared/types'
import files from './routes/files'
import health from './routes/health'
import rayons from './routes/rayons'
import uploads from './routes/uploads'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>().basePath('/api')

app.use(logger())
app.use(secureHeaders())

app.route('/health', health)
app.route('/rayons', rayons)
app.route('/uploads', uploads)
app.route('/files', files)

app.notFound((c) => c.json<ApiErrorBody>({ error: 'Endpoint tidak ditemukan' }, 404))

app.onError((err, c) => {
  console.error(err)
  return c.json<ApiErrorBody>({ error: 'Terjadi kesalahan pada server' }, 500)
})

export default app
