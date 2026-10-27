import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import type { ApiError } from '../shared/types'
import health from './routes/health'
import rayons from './routes/rayons'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>().basePath('/api')

app.use(logger())
app.use(secureHeaders())

app.route('/health', health)
app.route('/rayons', rayons)

app.notFound((c) => c.json<ApiError>({ error: 'Endpoint tidak ditemukan' }, 404))

app.onError((err, c) => {
  console.error(err)
  return c.json<ApiError>({ error: 'Terjadi kesalahan pada server' }, 500)
})

export default app
