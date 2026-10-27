// `Env` (binding DB, dll.) dihasilkan oleh `npm run cf-typegen` dari wrangler.toml.
export type AppEnv = {
  Bindings: Env
}
