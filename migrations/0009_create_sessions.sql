-- Migration number: 0009
-- Sesi login pengurus. Token sesi hanya ada di cookie HttpOnly pengguna; database
-- menyimpan hash SHA-256-nya, sehingga isi tabel ini tidak bisa dipakai untuk masuk.

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- Diperpanjang otomatis selama pengguna aktif (lihat src/worker/lib/session.ts).
  expires_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

-- Akun yang dinonaktifkan Admin langsung kehilangan semua sesinya (PRD: sesi aktifnya dihentikan).
CREATE TRIGGER trg_users_deactivated
AFTER UPDATE OF is_active ON users
WHEN NEW.is_active = 0
BEGIN
  DELETE FROM sessions WHERE user_id = NEW.id;
END;

-- Penguncian login dihitung dari LOGIN_FAILED di audit_logs per identitas.
CREATE INDEX idx_audit_logs_action_created ON audit_logs (action, created_at);
