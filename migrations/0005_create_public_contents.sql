-- Migration number: 0005
-- Konten Portal Publik: Warta, Renungan, Berita, Media, Profil, dan info Persembahan.

CREATE TABLE public_contents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK (
    category IN ('WARTA', 'DEVOTIONAL', 'NEWS', 'MEDIA', 'PROFILE', 'PAYMENT_INFO')
  ),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  content_body TEXT,
  attachment_url TEXT,
  thumbnail_url TEXT,
  published_at TEXT,
  author_id INTEGER REFERENCES users (id),
  is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_public_contents_listing ON public_contents (category, is_published, published_at);
