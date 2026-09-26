import { PETS, CHARMS, EGGS, ITEMS } from '../../public/data/catalog.js';

const catalogs = { pets: PETS, charms: CHARMS, eggs: EGGS, items: ITEMS };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

async function ensureSchema(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS value_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      item_id TEXT NOT NULL,
      variant TEXT NOT NULL DEFAULT 'normal',
      value REAL NOT NULL,
      captured_at INTEGER NOT NULL
    )
  `).run();
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_value_history_lookup
    ON value_history (category, item_id, variant, captured_at)
  `).run();
}

function rowsFromCatalog(now) {
  const rows = [];
  for (const [category, items] of Object.entries(catalogs)) {
    for (const item of items) {
      if (item.supportsVariants) {
        for (const variant of ['normal', 'golden', 'diamond']) {
          const value = item.values && Object.prototype.hasOwnProperty.call(item.values, variant)
            ? item.values[variant]
            : null;
          if (Number.isFinite(value)) rows.push({ category, id: item.id, variant, value, now });
        }
      } else if (Number.isFinite(item.value)) {
        rows.push({ category, id: item.id, variant: 'normal', value: item.value, now });
      }
    }
  }
  return rows;
}

export async function onRequestPost(context) {
  if (!context.env.VALUES_DB) {
    return json({ available: false, reason: 'd1-not-configured', inserted: 0 });
  }

  try {
    const db = context.env.VALUES_DB;
    await ensureSchema(db);
    const now = Date.now();
    const duplicateCutoff = now - 30 * 60 * 1000;
    const rows = rowsFromCatalog(now);

    const statements = rows.map(row => db.prepare(`
      INSERT INTO value_history (category, item_id, variant, value, captured_at)
      SELECT ?, ?, ?, ?, ?
      WHERE NOT EXISTS (
        SELECT 1
        FROM value_history
        WHERE category = ?
          AND item_id = ?
          AND variant = ?
          AND value = ?
          AND captured_at >= ?
      )
    `).bind(
      row.category, row.id, row.variant, row.value, row.now,
      row.category, row.id, row.variant, row.value, duplicateCutoff,
    ));

    const results = statements.length ? await db.batch(statements) : [];
    const inserted = results.reduce((sum, result) => sum + Number(result?.meta?.changes || 0), 0);
    return json({ available: true, inserted, checked: rows.length, timestamp: now });
  } catch (error) {
    return json({
      available: false,
      reason: 'snapshot-failed',
      message: error instanceof Error ? error.message : 'Snapshot failed.',
      inserted: 0,
    }, 200);
  }
}
