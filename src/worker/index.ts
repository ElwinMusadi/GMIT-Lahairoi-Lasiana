import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import type { ApiErrorBody } from '../shared/types'
import auditLogs from './routes/audit-logs'
import auth from './routes/auth'
import files from './routes/files'
import health from './routes/health'
import rayons from './routes/rayons'
import uploads from './routes/uploads'
import users from './routes/users'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>().basePath('/api')

app.use(logger())
app.use(secureHeaders())
// Menolak kiriman form (multipart, urlencoded, text/plain) dari origin lain. Bersama
// cookie SameSite=Lax, ini mencegah CSRF terhadap sesi pengurus.
app.use(csrf())

// Publik
app.route('/health', health)
app.route('/rayons', rayons)
app.route('/files', files)
app.route('/auth', auth)

// Terproteksi: setiap rute memasang requireAuth / requireRole sendiri.
app.route('/uploads', uploads)
app.route('/users', users)
app.route('/audit-logs', auditLogs)

app.notFound((c) => c.json<ApiErrorBody>({ error: 'Endpoint tidak ditemukan' }, 404))

app.onError((err, c) => {
  // Penolakan dari middleware bawaan Hono (mis. csrf → 403) diteruskan dengan statusnya.
  if (err instanceof HTTPException) {
    const message =
      err.status === 403
        ? 'Permintaan ditolak karena tidak berasal dari situs ini.'
        : 'Permintaan tidak dapat diproses.'
    return c.json<ApiErrorBody>({ error: message }, err.status)
  }
  console.error(err)
  return c.json<ApiErrorBody>({ error: 'Terjadi kesalahan pada server' }, 500)
})

export default app
