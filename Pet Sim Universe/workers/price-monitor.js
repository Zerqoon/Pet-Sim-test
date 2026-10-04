import { changePayload, discordUrl, validateFeed } from '../server/pricing.js';
import { loadCurrentPrices } from '../public/data/value-loader.js';
import { PETS, CHARMS, EGGS, ITEMS } from '../public/data/catalog.js';
const MONITOR_CATALOGS = { pets: PETS, charms: CHARMS, eggs: EGGS, items: ITEMS };

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

export async function runMonitor(env, { fetcher = fetch, clock = Date.now, catalogs = MONITOR_CATALOGS } = {}) {
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
    const { rows, revision, updatedAt, source } = await loadCurrentPrices(site, { catalogs, fetcher, now });
    const stored = await db.prepare('SELECT item_key, price_key, payload FROM monitor_prices').all();
    const previous = new Map(stored.results.map(row => [row.item_key, row]));
    const seeded = await db.prepare("SELECT value FROM monitor_meta WHERE name = 'initialized'").first();
    const changeTime = updatedAt && Date.parse(updatedAt) <= now + 300000 ? updatedAt : null;
    const statements = [];
    const priceWrites = [];
    const events = [];
    let changed = 0;
    for (const row of rows) {
      const old = previous.get(row.key);
      const payload = JSON.stringify(row);
      if (seeded && old && old.price_key !== row.price.key) {
        changed++;
        events.push([crypto.randomUUID(), JSON.stringify(changePayload(JSON.parse(old.payload), row, now, changeTime)), now]);
      }
      if (!seeded || !old || old.payload !== payload) {
        priceWrites.push([row.key, row.price.key, payload]);
      }
    }
    // Removing an item and reintroducing it later seeds it instead of comparing
    // against an obsolete price. Price changes and the outbox commit together.
    const keys = new Set(rows.map(row => row.key));
    // JSON expansion keeps the whole catalog within D1's Free query budget.
    // Outbox and snapshot are still committed in the same atomic transaction.
    if (events.length) statements.push(db.prepare(`INSERT INTO monitor_outbox (id,payload,created_at)
      SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]') FROM json_each(?)`).bind(JSON.stringify(events)));
    if (priceWrites.length) statements.push(db.prepare(`INSERT INTO monitor_prices (item_key,price_key,payload)
      SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]') FROM json_each(?) WHERE true
      ON CONFLICT(item_key) DO UPDATE SET price_key=excluded.price_key,payload=excluded.payload`).bind(JSON.stringify(priceWrites)));
    const removed = [...previous.keys()].filter(key => !keys.has(key));
    if (removed.length) statements.push(db.prepare('DELETE FROM monitor_prices WHERE item_key IN (SELECT value FROM json_each(?))').bind(JSON.stringify(removed)));
    if (!seeded) statements.push(db.prepare("INSERT INTO monitor_meta (name,value) VALUES ('initialized',?)").bind(String(now)));
    statements.push(db.prepare("INSERT INTO monitor_meta (name,value) VALUES ('last_check',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(String(now)));
    if (statements.length) await db.batch(statements);

    // Keep accepted messages; retry failed ones on a later cron tick. Never
    // create a new change just because Discord is temporarily unavailable.
    const cooldown = await db.prepare("SELECT value FROM monitor_meta WHERE name='discord_retry_after'").first();
    const queue = Number(cooldown?.value || 0) > clock() ? { results: [] }
      : await db.prepare('SELECT * FROM monitor_outbox WHERE sent_at IS NULL AND next_attempt_at <= ? ORDER BY created_at, rowid LIMIT 8').bind(clock()).all();
    let sent = 0;
    let webhookStatus = null;
    for (const event of queue.results) {
      let result;
      let status = 0;
      let retryAfter = Math.min(3600000, 60000 * 2 ** Math.min(event.attempts, 6));
      try {
        result = await fetcher(webhook.href, { method: 'POST', headers: { 'content-type': 'application/json' }, body: event.payload, redirect: 'manual', signal: AbortSignal.timeout(15000) });
        status = result.status;
        webhookStatus = status;
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
    return { initialized: !seeded, checked: rows.length, changed, sent, pending: pending.count, checkedAt: new Date(now).toISOString(), revision, priceUpdatedAt: updatedAt, feedSource: source, webhookStatus };
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

function safeError(error, env) {
  let message = String(error?.message || 'Monitor failed.');
  for (const secret of [env.DISCORD_WEBHOOK_URL, env.MONITOR_KEY]) if (secret) message = message.split(secret).join('[hidden]');
  return message.replace(/https:\/\/[^\s]+/g, '[URL]').slice(0, 500);
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runMonitor(env).then(result => console.log(JSON.stringify(result))).catch(error => {
      console.error(safeError(error, env));
      throw new Error('Price monitor failed.');
    }));
  },
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/health' && request.method === 'GET') return json({ version: 115, deployment: env.MONITOR_DEPLOYMENT || null, configured: Boolean(env.MONITOR_DB && env.DISCORD_WEBHOOK_URL && env.MONITOR_KEY) });
    if (path === '/auth') {
      if (request.method !== 'GET') return json({ error: 'Use GET.' }, 405);
      if (!matchesKey(request, env.MONITOR_KEY)) return json({ error: 'Unauthorized.' }, 401);
      return json({ authorized: true, version: 115, deployment: env.MONITOR_DEPLOYMENT || null, hasWebhook: Boolean(env.DISCORD_WEBHOOK_URL), hasDatabase: Boolean(env.MONITOR_DB) });
    }
    if (path !== '/check' && path !== '/test') return json({ error: 'Not found.' }, 404);
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    if (!matchesKey(request, env.MONITOR_KEY)) return json({ error: 'Unauthorized.' }, 401);
    try {
      const result = await runMonitor(env);
      if (path === '/test' && !result.busy) {
        const response = await fetch(discordUrl(env.DISCORD_WEBHOOK_URL).href, {
          method: 'POST', headers: { 'content-type': 'application/json' }, redirect: 'manual',
          signal: AbortSignal.timeout(15000), body: JSON.stringify({ allowed_mentions: { parse: [] }, embeds: [{
            title: 'Pet Universe — test monitora', description: 'Monitor odczytał ceny i połączył się z Discordem. To test po naprawie, bez zmiany cen.',
            color: 3066993, timestamp: new Date().toISOString()
          }] })
        });
        if (!response.ok) throw new Error(`Discord test HTTP ${response.status}.`);
        await response.text();
        result.testSent = true;
        // A confirmed repair can retry failed queued changes on the next tick,
        // rather than inheriting an hour-long cooldown from a broken webhook.
        if (result.pending) {
          await env.MONITOR_DB.batch([
            env.MONITOR_DB.prepare("DELETE FROM monitor_meta WHERE name='discord_retry_after'"),
            env.MONITOR_DB.prepare('UPDATE monitor_outbox SET next_attempt_at=0 WHERE sent_at IS NULL'),
          ]);
          result.retryScheduled = true;
        }
      }
      return json(result);
    }
    catch (error) { return json({ error: safeError(error, env) }, 503); }
  },
};
