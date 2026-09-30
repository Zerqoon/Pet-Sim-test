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
const ranges = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function valueFor(item, variant = 'normal') {
  if (item?.supportsVariants) {
    if (item.values && Object.prototype.hasOwnProperty.call(item.values, variant)) return item.values[variant];
    return item.values?.normal ?? null;
  }
  return item?.value ?? null;
}

function findItem(category, id) {
  return catalogs[category]?.find(item => item.id === id) ?? null;
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

async function recordCurrent(db, { category, id, variant, value, now }) {
  if (!Number.isFinite(value)) return 0;
  const result = await db.prepare(`
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
    category, id, variant, value, now,
    category, id, variant, value,
  ).run();
  return Number(result?.meta?.changes || 0);
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const category = String(url.searchParams.get('category') || '').toLowerCase();
  const id = String(url.searchParams.get('id') || '');
  const variant = String(url.searchParams.get('variant') || 'normal').toLowerCase();
  const range = String(url.searchParams.get('range') || '24h').toLowerCase();
  const item = findItem(category, id);

  if (!item) return json({ error: 'Item not found.' }, 404);
  if (!['normal', 'golden', 'diamond'].includes(variant)) return json({ error: 'Invalid variant.' }, 400);

  const current = parseNumericValue(valueFor(item, variant));
  const now = Date.now();

  if (!context.env.VALUES_DB) {
    return json({
      available: false,
      reason: 'd1-not-configured',
      current,
      points: Number.isFinite(current) ? [{ timestamp: now, value: current }] : [],
    });
  }

  try {
    const db = context.env.VALUES_DB;
    await ensureSchema(db);
    await recordCurrent(db, { category, id, variant, value: current, now });

    const since = range === 'all' ? 0 : now - (ranges[range] ?? ranges['24h']);
    let rows = [];

    if (range === 'all') {
      const result = await db.prepare(`
        SELECT value, captured_at
        FROM value_history
        WHERE category = ? AND item_id = ? AND variant = ?
        ORDER BY captured_at ASC
        LIMIT 2000
      `).bind(category, id, variant).all();
      rows = result.results || [];
    } else {
      const [baseline, result] = await Promise.all([
        db.prepare(`
          SELECT value, captured_at
          FROM value_history
          WHERE category = ? AND item_id = ? AND variant = ? AND captured_at < ?
          ORDER BY captured_at DESC
          LIMIT 1
        `).bind(category, id, variant, since).first(),
        db.prepare(`
          SELECT value, captured_at
          FROM value_history
          WHERE category = ? AND item_id = ? AND variant = ? AND captured_at >= ?
          ORDER BY captured_at ASC
          LIMIT 1999
        `).bind(category, id, variant, since).all(),
      ]);
      rows = baseline ? [baseline, ...(result.results || [])] : (result.results || []);
    }

    const points = rows.map(row => ({
      timestamp: Number(row.captured_at),
      value: Number(row.value),
    }));

    return json({ available: true, current, range, points });
  } catch (error) {
    return json({
      available: false,
      reason: 'history-query-failed',
      message: error instanceof Error ? error.message : 'History query failed.',
      current,
      points: Number.isFinite(current) ? [{ timestamp: now, value: current }] : [],
    }, 200);
  }
}
