-- Migration number: 0006
-- Jadwal ibadah beserta kehadiran, dan petugas pelayanan per jadwal.

CREATE TABLE worship_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('SUNDAY_SERVICE', 'RAYON', 'CATEGORICAL', 'SPECIAL')),
  rayon_id INTEGER REFERENCES rayons (id) ON DELETE RESTRICT,
  worship_date TEXT NOT NULL CHECK (date(worship_date) IS worship_date),
  -- Format HH:MM.
  worship_time TEXT CHECK (strftime('%H:%M', worship_time) IS worship_time),
  location TEXT,
  theme TEXT,
  bible_reading TEXT,
  liturgy_file_url TEXT,
  attendance_men INTEGER CHECK (attendance_men >= 0),
  attendance_women INTEGER CHECK (attendance_women >= 0),
  attendance_youth_children INTEGER CHECK (attendance_youth_children >= 0),
  -- NULL selama kehadiran belum diinput.
  attendance_total INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN attendance_men IS NULL
        AND attendance_women IS NULL
        AND attendance_youth_children IS NULL THEN NULL
      ELSE coalesce(attendance_men, 0)
        + coalesce(attendance_women, 0)
        + coalesce(attendance_youth_children, 0)
    END
  ) VIRTUAL,
  -- 1 = tampil di Papan Jadwal Ibadah Portal Publik.
  is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (category <> 'RAYON' OR rayon_id IS NOT NULL)
);

CREATE INDEX idx_worship_schedules_date ON worship_schedules (worship_date);
CREATE INDEX idx_worship_schedules_rayon_id ON worship_schedules (rayon_id);

CREATE TABLE worship_servants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER NOT NULL REFERENCES worship_schedules (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (
    role IN ('PREACHER', 'LITURGIST', 'ELDER_ON_DUTY', 'SINGER', 'MUSICIAN', 'MULTIMEDIA')
  ),
  servant_name TEXT NOT NULL,
  -- Diisi jika petugas adalah anggota jemaat terdaftar.
  member_id INTEGER REFERENCES members (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_worship_servants_schedule_id ON worship_servants (schedule_id);
CREATE INDEX idx_worship_servants_member_id ON worship_servants (member_id);
