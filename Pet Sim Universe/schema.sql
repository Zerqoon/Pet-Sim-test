CREATE TABLE IF NOT EXISTS value_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  item_id TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'normal',
  value REAL NOT NULL,
  captured_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_value_history_lookup
ON value_history (category, item_id, variant, captured_at);
