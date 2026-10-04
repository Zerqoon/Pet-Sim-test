import { loadCurrentPrices } from '../../public/data/value-loader.js';
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

export async function onRequestPost(context) {
  if (!context.env.VALUES_DB) {
    return json({ available: false, reason: 'd1-not-configured', inserted: 0 });
  }

  try {
    const db = context.env.VALUES_DB;
    await ensureSchema(db);
    const now = Date.now();
    const latest = await loadCurrentPrices(context.request.url, { catalogs, fetcher: context.fetcher || fetch });
    const rows = latest.rows.filter(row => row.price.number !== null);
    const payload = rows.map(row => [row.category, row.id, row.variant, row.price.number, now]);
    const result = await db.prepare(`INSERT INTO value_history(category,item_id,variant,value,captured_at)
      SELECT json_extract(j.value,'$[0]'),json_extract(j.value,'$[1]'),json_extract(j.value,'$[2]'),json_extract(j.value,'$[3]'),json_extract(j.value,'$[4]') FROM json_each(?) j
      WHERE COALESCE((SELECT h.value FROM value_history h WHERE h.category=json_extract(j.value,'$[0]') AND h.item_id=json_extract(j.value,'$[1]') AND h.variant=json_extract(j.value,'$[2]') ORDER BY captured_at DESC,id DESC LIMIT 1),-1) != json_extract(j.value,'$[3]')`).bind(JSON.stringify(payload)).run();
    const results = [result];

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
