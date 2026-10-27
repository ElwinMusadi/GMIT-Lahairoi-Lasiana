-- Migration number: 0008
-- Inventaris gereja dan peminjamannya.

CREATE TABLE assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  -- Unit yang sedang tidak dipinjam.
  available_quantity INTEGER NOT NULL CHECK (available_quantity BETWEEN 0 AND quantity),
  location TEXT,
  acquisition_source TEXT,
  acquisition_year INTEGER CHECK (acquisition_year BETWEEN 1900 AND 2100),
  -- Estimasi nilai dalam Rupiah.
  estimated_value INTEGER CHECK (
    estimated_value IS NULL OR (typeof(estimated_value) = 'integer' AND estimated_value >= 0)
  ),
  condition TEXT NOT NULL DEFAULT 'GOOD' CHECK (
    condition IN ('GOOD', 'MINOR_DAMAGE', 'MAJOR_DAMAGE', 'MAINTENANCE')
  ),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE asset_loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL REFERENCES assets (id) ON DELETE RESTRICT,
  borrower_name TEXT NOT NULL,
  rayon_id INTEGER REFERENCES rayons (id) ON DELETE SET NULL,
  quantity_borrowed INTEGER NOT NULL CHECK (quantity_borrowed > 0),
  borrow_date TEXT NOT NULL CHECK (date(borrow_date) IS borrow_date),
  due_date TEXT NOT NULL CHECK (date(due_date) IS due_date AND due_date >= borrow_date),
  return_date TEXT CHECK (
    return_date IS NULL OR (date(return_date) IS return_date AND return_date >= borrow_date)
  ),
  return_condition TEXT CHECK (
    return_condition IN ('GOOD', 'MINOR_DAMAGE', 'MAJOR_DAMAGE', 'MAINTENANCE')
  ),
  status TEXT NOT NULL DEFAULT 'BORROWED' CHECK (status IN ('BORROWED', 'RETURNED', 'OVERDUE')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- Tanggal kembali wajib diisi tepat ketika status RETURNED.
  CHECK ((status = 'RETURNED') = (return_date IS NOT NULL))
);

CREATE INDEX idx_asset_loans_asset_id ON asset_loans (asset_id);
CREATE INDEX idx_asset_loans_status_due ON asset_loans (status, due_date);
