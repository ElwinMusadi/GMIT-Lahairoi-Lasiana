import { PORTAL_THEMES, type PublicSettings, type SiteSettings } from '../../shared/types'

// Pengaturan situs (tabel site_settings): satu baris per kunci. Kunci yang belum pernah
// disimpan, atau nilainya tidak dikenal, memakai nilai bawaan di bawah.

export const DEFAULT_SETTINGS: PublicSettings = { portal_theme: 'DEFAULT' }

// Nilai yang sah per kunci; dipakai untuk membaca baris dan memeriksa permintaan.
export const SETTING_VALUES: { [K in keyof PublicSettings]: readonly PublicSettings[K][] } = {
  portal_theme: PORTAL_THEMES,
}

type Row = {
  key: string
  value: string
  updated_at: string
  updated_by_name: string | null
}

export function isSettingValue<K extends keyof PublicSettings>(
  key: K,
  value: unknown,
): value is PublicSettings[K] {
  return (SETTING_VALUES[key] as readonly unknown[]).includes(value)
}

export async function readSettings(db: D1Database): Promise<SiteSettings> {
  const { results } = await db
    .prepare(
      `SELECT s.key, s.value, strftime('%Y-%m-%dT%H:%M:%SZ', s.updated_at) AS updated_at,
              u.name AS updated_by_name
       FROM site_settings s LEFT JOIN users u ON u.id = s.updated_by
       ORDER BY s.updated_at DESC`,
    )
    .all<Row>()

  const settings: SiteSettings = {
    ...DEFAULT_SETTINGS,
    updated_at: results[0]?.updated_at ?? null,
    updated_by_name: results[0]?.updated_by_name ?? null,
  }
  for (const row of results) {
    const key = row.key as keyof PublicSettings
    if (Object.hasOwn(SETTING_VALUES, key) && isSettingValue(key, row.value)) {
      Object.assign(settings, { [key]: row.value })
    }
  }
  return settings
}

export function publicSettings({ portal_theme }: SiteSettings): PublicSettings {
  return { portal_theme }
}
