-- Migration number: 0002
-- Akun pengurus (Admin, Bendahara, Pendeta, Majelis) dan log aktivitas pengguna.
-- Akun tidak dihapus melainkan dinonaktifkan (is_active = 0) agar riwayat di
-- audit_logs dan data yang dibuat pengguna tetap utuh; karena itu referensi ke
-- users memakai aturan bawaan (NO ACTION) yang menolak penghapusan.

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  -- Login memakai email atau username (minimal salah satu wajib diisi).
  email TEXT UNIQUE COLLATE NOCASE,
  username TEXT UNIQUE COLLATE NOCASE,
  -- Format: pbkdf2_sha256$<iterasi>$<salt base64>$<hash base64> (src/worker/lib/password.ts)
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'TREASURER', 'PASTOR', 'ELDER')),
  -- Rayon pelayanan untuk Majelis; NULL untuk peran lain.
  rayon_id INTEGER REFERENCES rayons (id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (email IS NOT NULL OR username IS NOT NULL)
);

CREATE INDEX idx_users_rayon_id ON users (rayon_id);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- NULL untuk aksi sistem atau pengunjung Portal Publik.
  user_id INTEGER REFERENCES users (id),
  -- Contoh: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, IMPORT.
  action TEXT NOT NULL,
  -- Nama tabel entitas yang diubah, contoh: members, finance_transactions.
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  details_json TEXT CHECK (details_json IS NULL OR json_valid(details_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);
