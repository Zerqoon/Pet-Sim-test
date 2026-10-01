import { changePayload, discordUrl, validateFeed } from '../server/pricing.js';

export const MONITOR_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS monitor_prices (item_key TEXT PRIMARY KEY, price_key TEXT NOT NULL, payload TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS monitor_outbox (id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at INTEGER NOT NULL DEFAULT 0, sent_at INTEGER, last_status INTEGER)`,
  `CREATE INDEX IF NOT EXISTS monitor_pending ON monitor_outbox (sent_at, next_attempt_at, created_at)`,
  `CREATE TABLE IF NOT EXISTS monitor_locks (name TEXT PRIMARY KEY, token TEXT NOT NULL, expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS monitor_meta (name TEXT PRIMARY KEY, value TEXT NOT NULL)`,
];

function siteOrigin(value) {
  const url = new URL(value || 'https://petuniverse-values.pl');
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('SITE_URL must be a public HTTPS URL.');
  return url.origin;
}

export async function runMonitor(env, { fetcher = fetch, clock = Date.now } = {}) {
  if (!env.MONITOR_DB) throw new Error('MONITOR_DB binding is missing.');
  const webhook = discordUrl(env.DISCORD_WEBHOOK_URL);
  const site = siteOrigin(env.SITE_URL);
  const db = env.MONITOR_DB;
  await db.batch(MONITOR_SCHEMA.map(sql => db.prepare(sql)));
  const now = clock();
  const token = crypto.randomUUID();
  const lock = await db.prepare(`INSERT INTO monitor_locks (name, token, expires_at) VALUES ('prices', ?, ?)
    ON CONFLICT(name) DO UPDATE SET token = excluded.token, expires_at = excluded.expires_at WHERE monitor_locks.expires_at < ?`)
    .bind(token, now + 180000, now).run();
  if (!lock.meta?.changes) return { busy: true, sent: 0 };

  try {
    const feedUrl = new URL('/api/price-feed', site);
    feedUrl.searchParams.set('check', String(now));
    const response = await fetcher(feedUrl.href, { headers: { accept: 'application/json', 'cache-control': 'no-cache' }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`Price feed HTTP ${response.status}.`);
    const feed = await response.json();
    const rows = validateFeed(feed, site);
    const stored = await db.prepare('SELECT item_key, price_key, payload FROM monitor_prices').all();
    const previous = new Map(stored.results.map(row => [row.item_key, row]));
    const seeded = await db.prepare("SELECT value FROM monitor_meta WHERE name = 'initialized'").first();
    const statements = [];
    let changed = 0;
    for (const row of rows) {
      const old = previous.get(row.key);
      const payload = JSON.stringify(row);
      if (seeded && old && old.price_key !== row.price.key) {
        changed++;
        statements.push(db.prepare('INSERT INTO monitor_outbox (id, payload, created_at) VALUES (?, ?, ?)')
          .bind(crypto.randomUUID(), JSON.stringify(changePayload(JSON.parse(old.payload), row, now)), now));
      }
      if (!old || old.payload !== payload) {
        statements.push(db.prepare(`INSERT INTO monitor_prices (item_key, price_key, payload) VALUES (?, ?, ?)
          ON CONFLICT(item_key) DO UPDATE SET price_key = excluded.price_key, payload = excluded.payload`).bind(row.key, row.price.key, payload));
      }
    }
    // Removing an item and reintroducing it later seeds it instead of comparing
    // against an obsolete price. Price changes and the outbox commit together.
    const keys = new Set(rows.map(row => row.key));
    for (const key of previous.keys()) if (!keys.has(key)) statements.push(db.prepare('DELETE FROM monitor_prices WHERE item_key = ?').bind(key));
    if (!seeded) statements.push(db.prepare("INSERT INTO monitor_meta (name,value) VALUES ('initialized',?)").bind(String(now)));
    statements.push(db.prepare("INSERT INTO monitor_meta (name,value) VALUES ('last_check',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(String(now)));
    if (statements.length) await db.batch(statements);

    // Keep accepted messages; retry failed ones on a later cron tick. Never
    // create a new change just because Discord is temporarily unavailable.
    const cooldown = await db.prepare("SELECT value FROM monitor_meta WHERE name='discord_retry_after'").first();
    const queue = Number(cooldown?.value || 0) > clock() ? { results: [] }
      : await db.prepare('SELECT * FROM monitor_outbox WHERE sent_at IS NULL AND next_attempt_at <= ? ORDER BY created_at, rowid LIMIT 8').bind(clock()).all();
    let sent = 0;
    for (const event of queue.results) {
      let result;
      let status = 0;
      let retryAfter = Math.min(3600000, 60000 * 2 ** Math.min(event.attempts, 6));
      try {
        result = await fetcher(webhook.href, { method: 'POST', headers: { 'content-type': 'application/json' }, body: event.payload, redirect: 'error', signal: AbortSignal.timeout(15000) });
        status = result.status;
        if (status === 429) {
          const rate = await result.json().catch(() => ({}));
          retryAfter = Math.max(60000, Number(rate.retry_after || result.headers.get('retry-after') || 60) * 1000);
          if (!Number.isFinite(retryAfter)) retryAfter = 60000;
        }
      } catch { /* Network errors contain no useful public details or secrets. */ }
      if (result?.ok) {
        // Drain the response before the next fetch to free a Worker connection.
        await result.text().catch(() => '');
        await db.prepare('UPDATE monitor_outbox SET sent_at=?, last_status=? WHERE id=?').bind(clock(), status, event.id).run();
        sent++;
      } else {
        await db.prepare('UPDATE monitor_outbox SET attempts=attempts+1, next_attempt_at=?, last_status=? WHERE id=?').bind(clock() + retryAfter, status, event.id).run();
        await db.prepare("INSERT INTO monitor_meta (name,value) VALUES ('discord_retry_after',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(String(clock() + retryAfter)).run();
        // Respect the shared Discord rate limit / outage for the whole queue.
        break;
      }
    }
    await db.prepare('DELETE FROM monitor_outbox WHERE sent_at IS NOT NULL AND sent_at < ?').bind(clock() - 30 * 86400000).run();
    const pending = await db.prepare('SELECT COUNT(*) AS count FROM monitor_outbox WHERE sent_at IS NULL').first();
    return { initialized: !seeded, checked: rows.length, changed, sent, pending: pending.count, checkedAt: new Date(now).toISOString() };
  } finally {
    await db.prepare("DELETE FROM monitor_locks WHERE name='prices' AND token=?").bind(token).run();
  }
}

function matchesKey(request, key) {
  if (!key) return false;
  const incoming = request.headers.get('authorization') || '';
  const expected = `Bearer ${key}`;
  if (incoming.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= incoming.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runMonitor(env).then(result => console.log(JSON.stringify(result))).catch(() => {
      console.error('Price monitor failed. Check the feed, D1 binding and Discord secret.');
      throw new Error('Price monitor failed.');
    }));
  },
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/health' && request.method === 'GET') return json({ version: 89, configured: Boolean(env.MONITOR_DB && env.DISCORD_WEBHOOK_URL && env.MONITOR_KEY) });
    if (path !== '/check') return json({ error: 'Not found.' }, 404);
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    if (!matchesKey(request, env.MONITOR_KEY)) return json({ error: 'Unauthorized.' }, 401);
    try { return json(await runMonitor(env)); }
    catch { return json({ error: 'Monitor failed. Check Worker logs and configuration.' }, 503); }
  },
};
