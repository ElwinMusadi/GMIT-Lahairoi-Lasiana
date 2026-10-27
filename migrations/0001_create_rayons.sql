-- Migration number: 0001
-- Rayon (wilayah pelayanan) jemaat beserta 5 rayon bawaan sesuai PRD.
-- Nama rayon unik tanpa membedakan huruf besar/kecil agar impor data Excel
-- dapat mencocokkan nama rayon secara case-insensitive.

CREATE TABLE rayons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  description TEXT,
  coordinator_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO rayons (id, name) VALUES
  (1, 'Getsemani'),
  (2, 'Golgota'),
  (3, 'Tiberias'),
  (4, 'Galilea'),
  (5, 'Kapernaum');
