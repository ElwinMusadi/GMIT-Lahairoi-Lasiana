import { Hono } from 'hono'
import type { FieldErrors } from '../../shared/accounts'
import {
  PORTAL_THEME_LABELS,
  type ApiErrorBody,
  type PublicSettings,
  type SiteSettingsResponse,
} from '../../shared/types'
import { auditStatement } from '../lib/audit'
import { invalid, readJsonObject } from '../lib/request'
import { SETTING_VALUES, isSettingValue, publicSettings, readSettings } from '../lib/settings'
import { requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

// Pengaturan situs (dashboard: Pengaturan > Tampilan), khusus Admin. Portal Publik membaca
// nilainya lewat GET /api/public/settings.
//
// GET /    seluruh pengaturan beserta siapa yang terakhir mengubahnya
// PUT /    mengubah pengaturan yang dikirim; yang tidak dikirim tetap
const settings = new Hono<AppEnv>()

settings.use(requireRole('ADMIN'))

settings.get('/', async (c) => {
  return c.json<SiteSettingsResponse>({ settings: await readSettings(c.env.DB) })
})

const VALUE_MESSAGES: { [K in keyof PublicSettings]: string } = {
  portal_theme: `Pilih tema ${Object.values(PORTAL_THEME_LABELS).join(' atau ')}.`,
}

settings.put('/', async (c) => {
  const body = await readJsonObject(c)
  if (!body) return c.json<ApiErrorBody>({ error: 'Data pengaturan tidak valid.' }, 400)

  const input: Partial<PublicSettings> = {}
  const details: FieldErrors = {}
  for (const key of Object.keys(SETTING_VALUES) as (keyof PublicSettings)[]) {
    if (!(key in body)) continue
    if (isSettingValue(key, body[key])) Object.assign(input, { [key]: body[key] })
    else details[key] = [VALUE_MESSAGES[key]]
  }
  if (Object.keys(details).length > 0) return invalid(c, 'Pengaturan belum benar.', details)
  if (Object.keys(input).length === 0) {
    return c.json<ApiErrorBody>({ error: 'Tidak ada pengaturan yang diubah.' }, 400)
  }

  const db = c.env.DB
  const before = publicSettings(await readSettings(db))
  const changed = (Object.keys(input) as (keyof PublicSettings)[]).filter(
    (key) => input[key] !== before[key],
  )
  if (changed.length > 0) {
    const pick = (source: Partial<PublicSettings>) =>
      Object.fromEntries(changed.map((key) => [key, source[key]]))
    await db.batch([
      ...changed.map((key) =>
        db
          .prepare(
            `INSERT INTO site_settings (key, value, updated_by) VALUES (?1, ?2, ?3)
             ON CONFLICT (key) DO UPDATE SET value = excluded.value,
               updated_by = excluded.updated_by, updated_at = datetime('now')`,
          )
          .bind(key, input[key], c.get('user').id),
      ),
      auditStatement(c, {
        action: 'UPDATE',
        entityType: 'site_settings',
        label: 'tampilan Portal Publik',
        before: pick(before),
        after: pick(input),
      }),
    ])
  }

  return c.json<SiteSettingsResponse>({ settings: await readSettings(db) })
})

export default settings
