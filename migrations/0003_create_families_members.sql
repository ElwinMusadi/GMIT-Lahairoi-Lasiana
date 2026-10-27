-- Migration number: 0003
-- Kartu Keluarga (KK) gereja dan anggota jemaat.
-- Rayon anggota ditentukan oleh KK-nya (families.rayon_id).

CREATE TABLE families (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Boleh kosong untuk data lama yang belum memiliki nomor KK gereja.
  kk_number TEXT UNIQUE,
  family_head_name TEXT NOT NULL,
  rayon_id INTEGER NOT NULL REFERENCES rayons (id) ON DELETE RESTRICT,
  address TEXT,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_families_rayon_id ON families (rayon_id);

CREATE TABLE members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL REFERENCES families (id) ON DELETE RESTRICT,
  -- Nomor Induk Gereja; unik agar impor Excel tidak membuat duplikat.
  church_member_number TEXT UNIQUE,
  nik TEXT UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE')),
  birth_place TEXT,
  birth_date TEXT CHECK (date(birth_date) IS birth_date),
  blood_type TEXT CHECK (blood_type IN ('A', 'B', 'AB', 'O')),
  -- HEAD = Kepala Keluarga, SPOUSE = Istri/Suami, CHILD = Anak, DEPENDENT = Tanggungan.
  family_relation TEXT NOT NULL CHECK (family_relation IN ('HEAD', 'SPOUSE', 'CHILD', 'DEPENDENT')),
  education TEXT,
  occupation TEXT,
  categorical_group TEXT CHECK (
    categorical_group IN ('PAR', 'PEMUDA', 'KAUM_IBU', 'KAUM_BAPAK', 'LANSIA')
  ),
  -- Status sakramen: 0 = belum, 1 = sudah.
  baptism_status INTEGER NOT NULL DEFAULT 0 CHECK (baptism_status IN (0, 1)),
  baptism_date TEXT CHECK (date(baptism_date) IS baptism_date),
  sidi_status INTEGER NOT NULL DEFAULT 0 CHECK (sidi_status IN (0, 1)),
  sidi_date TEXT CHECK (date(sidi_date) IS sidi_date),
  marriage_status TEXT CHECK (marriage_status IN ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED')),
  marriage_date TEXT CHECK (date(marriage_date) IS marriage_date),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MOVED', 'DECEASED')),
  -- Diturunkan dari status agar keduanya tidak pernah bertentangan.
  is_deceased INTEGER GENERATED ALWAYS AS (status = 'DECEASED') VIRTUAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_members_family_id ON members (family_id);
CREATE INDEX idx_members_full_name ON members (full_name);
