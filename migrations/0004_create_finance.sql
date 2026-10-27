-- Migration number: 0004
-- Keuangan multi-pos: Pos Kas, mata anggaran RAPBJ, dan transaksi kas masuk/keluar.
-- Semua nominal disimpan sebagai bilangan bulat Rupiah (tanpa desimal).
--
-- finance_funds.current_balance dipelihara otomatis oleh trigger pada
-- finance_transactions. Jangan mengubah kolom tersebut secara manual dari aplikasi.

CREATE TABLE finance_funds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  description TEXT,
  current_balance INTEGER NOT NULL DEFAULT 0 CHECK (typeof(current_balance) = 'integer'),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE finance_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fund_id INTEGER NOT NULL REFERENCES finance_funds (id) ON DELETE RESTRICT,
  fiscal_year INTEGER NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2100),
  -- Kode mata anggaran bebas ditentukan Bendahara, unik per tahun anggaran.
  account_code TEXT NOT NULL COLLATE NOCASE,
  account_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  target_amount INTEGER NOT NULL DEFAULT 0 CHECK (
    typeof(target_amount) = 'integer' AND target_amount >= 0
  ),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (fiscal_year, account_code)
);

CREATE INDEX idx_finance_budgets_fund_year ON finance_budgets (fund_id, fiscal_year);

CREATE TABLE finance_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fund_id INTEGER NOT NULL REFERENCES finance_funds (id) ON DELETE RESTRICT,
  budget_id INTEGER REFERENCES finance_budgets (id) ON DELETE RESTRICT,
  transaction_date TEXT NOT NULL CHECK (date(transaction_date) IS transaction_date),
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  amount INTEGER NOT NULL CHECK (typeof(amount) = 'integer' AND amount > 0),
  description TEXT,
  receipt_url TEXT,
  created_by INTEGER NOT NULL REFERENCES users (id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_finance_transactions_fund_date ON finance_transactions (fund_id, transaction_date);
CREATE INDEX idx_finance_transactions_budget_id ON finance_transactions (budget_id);
CREATE INDEX idx_finance_transactions_date ON finance_transactions (transaction_date);

CREATE TRIGGER trg_finance_transactions_insert
AFTER INSERT ON finance_transactions
BEGIN
  UPDATE finance_funds
  SET current_balance = current_balance
    + CASE NEW.type WHEN 'INCOME' THEN NEW.amount ELSE -NEW.amount END
  WHERE id = NEW.fund_id;
END;

CREATE TRIGGER trg_finance_transactions_delete
AFTER DELETE ON finance_transactions
BEGIN
  UPDATE finance_funds
  SET current_balance = current_balance
    - CASE OLD.type WHEN 'INCOME' THEN OLD.amount ELSE -OLD.amount END
  WHERE id = OLD.fund_id;
END;

CREATE TRIGGER trg_finance_transactions_update
AFTER UPDATE OF fund_id, type, amount ON finance_transactions
BEGIN
  UPDATE finance_funds
  SET current_balance = current_balance
    - CASE OLD.type WHEN 'INCOME' THEN OLD.amount ELSE -OLD.amount END
  WHERE id = OLD.fund_id;

  UPDATE finance_funds
  SET current_balance = current_balance
    + CASE NEW.type WHEN 'INCOME' THEN NEW.amount ELSE -NEW.amount END
  WHERE id = NEW.fund_id;
END;
