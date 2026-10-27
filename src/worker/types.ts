import type { SessionUser } from '../shared/types'

// `Env` (binding DB, dll.) dihasilkan oleh `npm run cf-typegen` dari wrangler.toml.
// `user` dan `sessionId` diisi middleware autentikasi (src/worker/middleware/auth.ts).
export type AppEnv = {
  Bindings: Env
  Variables: {
    user: SessionUser
    sessionId: number
  }
}
