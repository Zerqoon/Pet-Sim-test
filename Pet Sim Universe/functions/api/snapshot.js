import { PETS, CHARMS, EGGS, ITEMS } from '../../public/data/catalog.js';

const catalogs = { pets: PETS, charms: CHARMS, eggs: EGGS, items: ITEMS };

function parseNumericValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/,/g, '').toUpperCase();
  const match = normalized.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(K|M|B|T|QA|QI|SX|SP|OC)?$/);
  if (!match) return null;
  const multipliers = { K:1e3, M:1e6, B:1e9, T:1e12, QA:1e15, QI:1e18, SX:1e21, SP:1e24, OC:1e27 };
  const numeric = Number(match[1]) * (multipliers[match[2]] || 1);
  return Number.isFinite(numeric) ? numeric : null;
}

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
          const numeric = parseNumericValue(value);
          if (Number.isFinite(numeric)) rows.push({ category, id: item.id, variant, value: numeric, now });
        }
      } else {
        const numeric = parseNumericValue(item.value);
        if (Number.isFinite(numeric)) rows.push({ category, id: item.id, variant: 'normal', value: numeric, now });
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
    const rows = rowsFromCatalog(now);

    const statements = rows.map(row => db.prepare(`
      INSERT INTO value_history (category, item_id, variant, value, captured_at)
      SELECT ?, ?, ?, ?, ?
      WHERE NOT EXISTS (
        SELECT 1
        FROM (
          SELECT value
          FROM value_history
          WHERE category = ? AND item_id = ? AND variant = ?
          ORDER BY captured_at DESC
          LIMIT 1
        ) latest
        WHERE latest.value = ?
      )
    `).bind(
      row.category, row.id, row.variant, row.value, row.now,
      row.category, row.id, row.variant, row.value,
    ));

    const results = statements.length ? await db.batch(statements) : [];
    const inserted = results.reduce((sum, result) => sum + Number(result?.meta?.changes || 0), 0);
    return json({
      available: true,
      inserted,
      changed: inserted,
      checked: rows.length,
      timestamp: now,
      message: inserted ? `${inserted} changed value snapshot(s) saved.` : 'No values changed since the previous snapshot.',
    });
  } catch (error) {
    return json({
      available: false,
      reason: 'snapshot-failed',
      message: error instanceof Error ? error.message : 'Snapshot failed.',
      inserted: 0,
    }, 200);
  }
}
