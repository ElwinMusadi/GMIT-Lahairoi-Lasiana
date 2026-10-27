-- Migration number: 0007
-- Pendaftaran & buku induk sakramen (Baptis, Sidi, Nikah) serta arsip surat masuk/keluar.

CREATE TABLE sacrament_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Kode lacak yang diberikan ke pendaftar di Portal Publik.
  registration_code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  type TEXT NOT NULL CHECK (type IN ('BAPTISM', 'SIDI', 'MARRIAGE')),
  applicant_name TEXT NOT NULL,
  member_id INTEGER REFERENCES members (id) ON DELETE SET NULL,
  phone TEXT,
  form_data_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(form_data_json)),
  documents_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(documents_json)),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'REVISION', 'COUNSELING', 'APPROVED', 'COMPLETED')
  ),
  -- Tanggal pelaksanaan sakramen.
  scheduled_date TEXT CHECK (date(scheduled_date) IS scheduled_date),
  officiating_pastor TEXT,
  -- Nomor register buku induk, unik per jenis sakramen.
  certificate_number TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (type, certificate_number)
);

CREATE INDEX idx_sacrament_applications_status ON sacrament_applications (status, type);
CREATE INDEX idx_sacrament_applications_member_id ON sacrament_applications (member_id);

CREATE TABLE mail_archives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  direction TEXT NOT NULL CHECK (direction IN ('INCOMING', 'OUTGOING')),
  reference_number TEXT,
  mail_date TEXT NOT NULL CHECK (date(mail_date) IS mail_date),
  sender_or_recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'UMUM' CHECK (
    category IN ('ATESTASI', 'TUGAS', 'UNDANGAN', 'UMUM')
  ),
  file_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_mail_archives_direction_date ON mail_archives (direction, mail_date);
