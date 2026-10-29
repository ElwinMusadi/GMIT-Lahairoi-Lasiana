-- Migration number: 0012
-- Pengaturan situs yang diatur Admin dari dashboard (Pengaturan > Tampilan), satu baris per
-- kunci. Kunci yang belum pernah disimpan memakai nilai bawaannya (src/worker/lib/settings.ts),
-- jadi tabel ini boleh kosong.

CREATE TABLE site_settings (
  -- Contoh: portal_theme.
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by INTEGER REFERENCES users (id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
