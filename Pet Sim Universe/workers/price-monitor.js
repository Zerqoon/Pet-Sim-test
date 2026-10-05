import { priceRevision, selectPriceUpdate } from '../public/data/price-core.js';
import { messageGroups, sendDiscord, wait } from './discord-delivery.js';
import { changePayload, discordUrl, validateFeed } from '../server/pricing.js';
import { readCatalog, catalogGroups } from '../server/catalog-data.js';
import { boundedText, loadCurrentPrices } from '../public/data/value-loader.js';

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

export async function runMonitor(env, { fetcher = fetch, clock = Date.now, catalogs, diagnostic = false, pause = wait } = {}) {
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
    if (!catalogs) {
      const catalogUrl = new URL('/data/catalog.js', site); catalogUrl.searchParams.set('check', String(now));
      const response = await fetcher(catalogUrl.href, {cache:'no-store', redirect:'manual', headers:{'cache-control':'no-cache'}, signal:AbortSignal.timeout(12000)});
      if (!response.ok) throw new Error(`catalog.js: HTTP ${response.status}.`);
      catalogs = catalogGroups(readCatalog(await boundedText(response)));
    }
    const { rows, revision, updatedAt, source } = await loadCurrentPrices(site, { catalogs, fetcher, now });
    const stored = await db.prepare('SELECT item_key, price_key, payload FROM monitor_prices').all();
    const previous = new Map(stored.results.map(row => [row.item_key, row]));
    const seeded = await db.prepare("SELECT value FROM monitor_meta WHERE name = 'initialized'").first();
    const savedUpdate = await db.prepare("SELECT value FROM monitor_meta WHERE name='price_update'").first();
    let persisted = null;
    try { persisted = selectPriceUpdate(revision, JSON.parse(savedUpdate?.value || 'null'), now); } catch {}
    const oldRevision = previous.size ? await priceRevision([...previous.values()].map(row => JSON.parse(row.payload))) : null;
    const update = selectPriceUpdate(revision, { revision, updatedAt, source: 'author' }, now) || persisted
      || (seeded && oldRevision !== revision ? { revision, updatedAt: new Date(now).toISOString(), source: 'detected' } : null);
    const changeTime = update?.source !== 'detected' ? update?.updatedAt : null;
    const statements = [];
    const priceWrites = [];
    const events = [];
    let changed = 0;
    for (const row of rows) {
      const old = previous.get(row.key);
      const payload = JSON.stringify(row);
      if (seeded && old && old.price_key !== row.price.key) {
        changed++;
        events.push([crypto.randomUUID(), JSON.stringify(changePayload(old ? JSON.parse(old.payload) : {value:null}, row, now, changeTime)), now]);
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
    statements.push(db.prepare("INSERT INTO monitor_meta(name,value) VALUES ('revision',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(revision));
    statements.push(db.prepare("INSERT INTO monitor_meta(name,value) VALUES ('price_update',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(JSON.stringify(update)));
    if (statements.length) await db.batch(statements);

    let testSent = false, retryScheduled = false;
    if (diagnostic) {
      const payload = { allowed_mentions: { parse: [] }, embeds: [{ title: 'Value alerts connected', description: 'Published values are available. Future price changes will appear here.', color: 3066993, timestamp: new Date(now).toISOString() }] };
      let result = await sendDiscord(fetcher, webhook.href, payload);
      if (result.status === 429 && result.retryMs <= 5000) { await pause(result.retryMs); result = await sendDiscord(fetcher, webhook.href, payload); }
      if (!result.ok) throw new Error(`Discord test HTTP ${result.status}.`);
      testSent = true; retryScheduled = true;
      await db.batch([
        db.prepare("DELETE FROM monitor_meta WHERE name IN ('discord_retry_after','discord_blocked')"),
        db.prepare('UPDATE monitor_outbox SET next_attempt_at=0 WHERE sent_at IS NULL'),
      ]);
      if (result.resetMs && result.resetMs <= 5000) await pause(result.resetMs);
      else if (result.resetMs) await db.prepare("INSERT INTO monitor_meta(name,value) VALUES ('discord_retry_after',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(String(clock()+result.resetMs)).run();
    }
    const cooldown = await db.prepare("SELECT value FROM monitor_meta WHERE name='discord_retry_after'").first();
    const blocked = await db.prepare("SELECT value FROM monitor_meta WHERE name='discord_blocked'").first();
    const queue = blocked || Number(cooldown?.value || 0) > clock() ? { results: [] }
      : await db.prepare('SELECT * FROM monitor_outbox WHERE sent_at IS NULL AND next_attempt_at <= ? ORDER BY created_at, rowid LIMIT 64').bind(clock()).all();
    let sent = 0, batches = 0, webhookStatus = null;
    for (const group of messageGroups(queue.results).slice(0,8)) {
      if (clock() - now > 90000) break;
      const payload = { allowed_mentions: { parse: [] }, embeds: group.embeds };
      let result = await sendDiscord(fetcher, webhook.href, payload);
      if (result.status === 429 && result.retryMs <= 5000) { await pause(result.retryMs); result = await sendDiscord(fetcher, webhook.href, payload); }
      webhookStatus = result.status;
      if (result.ok) {
        await db.prepare('UPDATE monitor_outbox SET sent_at=?,last_status=? WHERE id IN (SELECT value FROM json_each(?))').bind(clock(),result.status,JSON.stringify(group.ids)).run();
        sent += group.ids.length; batches++;
        if (result.resetMs && result.resetMs <= 5000) await pause(result.resetMs);
        else if (result.resetMs) {
          await db.prepare("INSERT INTO monitor_meta(name,value) VALUES ('discord_retry_after',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(String(clock()+result.resetMs)).run(); break;
        }
      } else {
        if ([401,403,404].includes(result.status)) await db.prepare("INSERT INTO monitor_meta(name,value) VALUES ('discord_blocked',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(String(result.status)).run();
        const attempts = Math.max(...queue.results.filter(event => group.ids.includes(event.id)).map(event => event.attempts));
        const retry = result.status === 429 ? result.retryMs : Math.min(3600000,60000*2**Math.min(attempts,6));
        await db.prepare('UPDATE monitor_outbox SET attempts=attempts+1,next_attempt_at=?,last_status=? WHERE id IN (SELECT value FROM json_each(?))').bind(clock()+retry,result.status,JSON.stringify(group.ids)).run();
        await db.prepare("INSERT INTO monitor_meta(name,value) VALUES ('discord_retry_after',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(String(clock()+retry)).run(); break;
      }
    }
    await db.prepare('DELETE FROM monitor_outbox WHERE sent_at IS NOT NULL AND sent_at < ?').bind(clock() - 30 * 86400000).run();
    const pending = await db.prepare('SELECT COUNT(*) AS count FROM monitor_outbox WHERE sent_at IS NULL').first();
    return { initialized: !seeded, checked: rows.length, changed, sent, pending: pending.count, checkedAt: new Date(now).toISOString(), revision, priceUpdatedAt: update?.updatedAt || null, dateSource: update?.source || null, feedSource: source, webhookStatus, batches, testSent, retryScheduled };
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
    if (path === '/status' && request.method === 'GET') {
      const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };
      if (request.headers.get('origin') === siteOrigin(env.SITE_URL)) headers['access-control-allow-origin'] = siteOrigin(env.SITE_URL);
      try {
        const stored = await env.MONITOR_DB.prepare("SELECT name,value FROM monitor_meta WHERE name IN ('revision','price_update','last_check')").all();
        const data = Object.fromEntries(stored.results.map(row => [row.name,row.value]));
        let update = null;
        try { update = selectPriceUpdate(data.revision,JSON.parse(data.price_update || 'null')); } catch {}
        const desired = new URL(request.url).searchParams.get('revision');
        if (desired && desired !== data.revision) update = null;
        return new Response(JSON.stringify({ version:116, revision:data.revision || null, update, checkedAt:data.last_check || null }), { headers });
      } catch { return new Response(JSON.stringify({ version:116, update:null }), { status:503, headers }); }
    }
    if (path === '/health' && request.method === 'GET') return json({ version: 116, deployment: env.MONITOR_DEPLOYMENT || null, configured: Boolean(env.MONITOR_DB && env.DISCORD_WEBHOOK_URL && env.MONITOR_KEY) });
    if (path === '/auth') {
      if (request.method !== 'GET') return json({ error: 'Use GET.' }, 405);
      if (!matchesKey(request, env.MONITOR_KEY)) return json({ error: 'Unauthorized.' }, 401);
      return json({ authorized: true, version: 116, deployment: env.MONITOR_DEPLOYMENT || null, hasWebhook: Boolean(env.DISCORD_WEBHOOK_URL), hasDatabase: Boolean(env.MONITOR_DB) });
    }
    if (path !== '/check' && path !== '/test') return json({ error: 'Not found.' }, 404);
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    if (!matchesKey(request, env.MONITOR_KEY)) return json({ error: 'Unauthorized.' }, 401);
    try {
      const result = await runMonitor(env, { diagnostic: path === '/test' });
      return json(result);
    }
    catch (error) { return json({ error: safeError(error, env) }, 503); }
  },
};
