import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import monitor, { runMonitor, MONITOR_SCHEMA } from '../workers/price-monitor.js';
import { normalizePrice, validateFeed, priceRevision } from '../server/pricing.js';
import { onRequestGet } from '../functions/api/price-feed.js';
import { PETS, CHARMS, EGGS, ITEMS } from '../public/data/catalog.js';
import { existsSync } from 'node:fs';

// Exercise the real SQL, transactions and retry queue in SQLite. Only remote
// HTTP is replaced; these tests never send anything to a Discord channel.
function d1() {
  const sql = new DatabaseSync(':memory:');
  const db = {
    prepare(text) {
      let args = [];
      const statement = {
        bind(...values) { args = values; return statement; },
        async run() { const result = sql.prepare(text).run(...args); return { success: true, meta: { changes: Number(result.changes) } }; },
        async all() { return { results: sql.prepare(text).all(...args) }; },
        async first() { return sql.prepare(text).get(...args) || null; },
      };
      return statement;
    },
    async batch(statements) {
      sql.exec('BEGIN');
      try { const output = []; for (const statement of statements) output.push(await statement.run()); sql.exec('COMMIT'); return output; }
      catch (error) { sql.exec('ROLLBACK'); throw error; }
    },
    close() { sql.close(); },
  };
  return db;
}

function fixture() {
  let time = Date.parse('2026-10-01T12:30:00Z');
  let rows = [{ key: 'pets/job-cat/normal', category: 'pets', id: 'job-cat', name: 'Job Cat', rarity: 'Exclusive', variant: 'normal', value: '30K', image: 'assets/pets/job-cat-v30.png' }];
  let failure = null;
  let feedFailure = false;
  const messages = [];
  const requests = [];
  const env = { MONITOR_DB: d1(), DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/123456789012345678/test_token', MONITOR_KEY: 'test-secret-key', SITE_URL: 'https://petuniverse-values.pl' };
  const fetcher = async (url, options = {}) => {
    requests.push({ url, options });
    if (new URL(url).hostname === 'petuniverse-values.pl') {
      if (feedFailure) return new Response('Failure', { status: 503 });
      assert.equal(options.cache, 'no-store');
      return Response.json({ version: 1, rows });
    }
    assert.equal(new URL(url).searchParams.get('wait'), 'true');
    assert.equal(options.method, 'POST');
    messages.push(JSON.parse(options.body));
    if (failure === 'network') throw new Error('Network failed');
    if (failure) return Response.json(failure.status === 429 ? { retry_after: 180 } : {}, { status: failure.status });
    return Response.json({ id: 'message-id' });
  };
  return {
    env, messages, requests, run: () => runMonitor(env, { fetcher, clock: () => time }),
    setRows: value => { rows = value; }, getRows: () => structuredClone(rows),
    price: value => { rows[0].value = value; }, failure: value => { failure = value; },
    failFeed: value => { feedFailure = value; }, advance: (ms = 60000) => { time += ms; }, close: () => env.MONITOR_DB.close(),
  };
}

test('equivalent price formats, O/C, unpriced and invalid values', () => {
  for (const value of [30000, '30K', '30k', '30,000']) assert.equal(normalizePrice(value).key, 'number:30000');
  for (const value of [null, 'No Price', 'N/A', '']) assert.equal(normalizePrice(value).key, 'unpriced');
  for (const value of ['O/C', 'o/c', 'OC']) assert.equal(normalizePrice(value).label, 'O/C');
  assert.equal(normalizePrice(0).label, '0');
  assert.equal(normalizePrice('0.35').number, 0.35);
  for (const value of [-1, Infinity, {}, '-30', 'price?']) assert.throws(() => normalizePrice(value));
});

test('first check seeds prices; one actual change has image, 30K → 25K and Warsaw time; refresh does not resend', async () => {
  const f = fixture();
  try {
    assert.equal((await f.run()).initialized, true);
    assert.equal(f.messages.length, 0);
    f.price('25K'); f.advance();
    assert.equal((await f.run()).sent, 1);
    const embed = f.messages[0].embeds[0];
    assert.equal(embed.description, '**30K → 25K**');
    assert.equal(embed.image.url, 'https://petuniverse-values.pl/assets/pets/job-cat-v30.png');
    assert.equal(embed.timestamp, '2026-10-01T12:31:00.000Z');
    assert.match(embed.fields.find(field => field.name.includes('Polska')).value, /14:31:00/);
    assert.deepEqual(f.messages[0].allowed_mentions, { parse: [] });
    assert.equal((await f.run()).changed, 0);
    f.price(25000); f.advance(); assert.equal((await f.run()).changed, 0);
    assert.equal(f.messages.length, 1);
    f.price('30K'); f.advance(); await f.run();
    f.price('25K'); f.advance(); await f.run();
    assert.equal(f.messages.length, 3, 'repeated A→B→A→B changes must all notify');
  } finally { f.close(); }
});

test('O/C ↔ numeric and unpriced transitions notify; variant uses its own image', async () => {
  const f = fixture();
  try {
    const row = f.getRows()[0]; row.variant = 'diamond'; row.key = 'pets/job-cat/diamond'; row.image = 'assets/pets/imp-diamond.png'; row.value = 'O/C';
    f.setRows([row]); await f.run();
    f.price(30000); f.advance(); await f.run();
    assert.equal(f.messages[0].embeds[0].description, '**O/C → 30K**');
    assert.match(f.messages[0].embeds[0].image.url, /imp-diamond\.png$/);
    assert.match(f.messages[0].embeds[0].title, /Diamond/);
    f.price('No Price'); f.advance(); await f.run();
    assert.equal(f.messages[1].embeds[0].description, '**30K → No Price**');
    f.price(null); f.advance(); assert.equal((await f.run()).changed, 0);
    f.price('O/C'); f.advance(); await f.run();
    assert.equal(f.messages[2].embeds[0].description, '**No Price → O/C**');
  } finally { f.close(); }
});

test('Discord failures survive in D1, retry on next tick, and stop after success', async () => {
  for (const failure of [{ status: 500 }, 'network']) {
    const f = fixture();
    try {
      await f.run(); f.price(25000); f.advance(); f.failure(failure);
      const failed = await f.run(); assert.equal(failed.pending, 1); assert.equal(failed.sent, 0);
      assert.equal((await f.run()).sent, 0); assert.equal(f.messages.length, 1);
      f.advance(); f.failure(null); assert.equal((await f.run()).sent, 1);
      assert.equal(f.messages.length, 2); assert.deepEqual(f.messages[0], f.messages[1]);
      f.advance(); assert.equal((await f.run()).pending, 0); assert.equal(f.messages.length, 2);
    } finally { f.close(); }
  }
});

test('Discord 429 applies a cooldown to the entire queue', async () => {
  const f = fixture();
  try {
    const rows = f.getRows(); rows.push({ ...rows[0], id: 'rich-bee', key: 'pets/rich-bee/normal' });
    f.setRows(rows); await f.run(); rows.forEach(row => { row.value = 25000; }); f.advance(); f.failure({ status: 429 });
    assert.equal((await f.run()).pending, 2); assert.equal(f.messages.length, 1);
    f.failure(null); f.advance(60000); await f.run(); assert.equal(f.messages.length, 1);
    f.advance(120000); assert.equal((await f.run()).sent, 2); assert.equal(f.messages.length, 3);
  } finally { f.close(); }
});

test('invalid or unavailable feed does not corrupt the baseline', async () => {
  const f = fixture();
  try {
    await f.run(); f.price(25000); f.failFeed(true); await assert.rejects(f.run);
    f.failFeed(false); f.advance(); await f.run(); assert.equal(f.messages[0].embeds[0].description, '**30K → 25K**');
    const row = f.getRows()[0];
    f.setRows([]); await assert.rejects(f.run); assert.equal(f.messages.length, 1);
    assert.throws(() => validateFeed({ version: 1, rows: [{ ...row, image: 'https://other.example/image.png' }] }, f.env.SITE_URL), /image/);
  } finally { f.close(); }
});

test('new or reintroduced entries seed quietly; an overlapping check cannot acquire the lease', async () => {
  const f = fixture();
  try {
    await f.run(); const rows = f.getRows(); rows.push({ ...rows[0], id: 'rich-bee', key: 'pets/rich-bee/normal', value: 500 });
    f.setRows(rows); assert.equal((await f.run()).changed, 0);
    f.setRows([rows[1]]); await f.run(); rows[0].value = 25000; f.setRows(rows); assert.equal((await f.run()).changed, 0);
    f.price(20000); f.advance();
    // An existing unexpired lease is enough to model an overlapping cron/admin
    // invocation without inventing a concurrent SQLite transaction adapter.
    await f.env.MONITOR_DB.prepare("INSERT INTO monitor_locks(name,token,expires_at) VALUES ('prices','another-run',?)").bind(Date.parse('2026-10-01T12:40:00Z')).run();
    assert.equal((await f.run()).busy, true); assert.equal(f.messages.length, 0);
    await f.env.MONITOR_DB.prepare('DELETE FROM monitor_locks').run();
    assert.equal((await f.run()).sent, 1); assert.equal((await f.run()).sent, 0);
  } finally { f.close(); }
});

test('public API derives all prices from the same catalog, validates images and has no cache', async () => {
  const response = await onRequestGet();
  const feed = await response.json();
  assert.match(response.headers.get('cache-control'), /no-store/);
  const rows = validateFeed(feed, 'https://petuniverse-values.pl');
  assert.ok(rows.length > 48);
  for (const [category, items] of Object.entries({ pets: PETS, charms: CHARMS, eggs: EGGS, items: ITEMS })) {
    for (const item of items) {
      const variants = item.supportsVariants ? ['normal', 'golden', 'diamond'] : ['normal'];
      for (const variant of variants) {
        const row = rows.find(entry => entry.key === `${category}/${item.id}/${variant}`);
        assert.equal(row.price.key, normalizePrice(item.supportsVariants ? item.values?.[variant] : item.value).key);
        if (row.image) assert.ok(existsSync(new URL('../public' + new URL(row.image).pathname, import.meta.url)), 'pet image must exist in full project');
      }
    }
  }
  assert.equal(feed.revision, await priceRevision(feed.rows));
  assert.equal(await priceRevision([...feed.rows].reverse()), feed.revision);
  assert.ok(!JSON.stringify(feed).includes('webhook'));
});

test('admin check cannot be triggered by public browsers or the wrong key', async () => {
  const env = { MONITOR_KEY: 'correct-key' };
  assert.equal((await monitor.fetch(new Request('https://monitor.example/check'), env)).status, 405);
  assert.equal((await monitor.fetch(new Request('https://monitor.example/check', { method: 'POST' }), env)).status, 401);
  assert.equal((await monitor.fetch(new Request('https://monitor.example/check', { method: 'POST', headers: { authorization: 'Bearer wrong-key' } }), env)).status, 401);
  assert.equal((await monitor.fetch(new Request('https://monitor.example/anything'), env)).status, 404);
  assert.ok(MONITOR_SCHEMA.length >= 4);
});

test('a large update stays in the queue and sends each changed price once', async () => {
  const f = fixture();
  try {
    const template = f.getRows()[0];
    const rows = Array.from({ length: 10 }, (_, index) => ({ ...template, name: `Pet ${index}`, id: `pet-${index}`, key: `pets/pet-${index}/normal` }));
    f.setRows(rows); await f.run(); rows.forEach(row => { row.value = 25000; }); f.advance();
    const first = await f.run(); assert.equal(first.changed, 10); assert.equal(first.sent, 8); assert.equal(first.pending, 2);
    f.advance(); const second = await f.run(); assert.equal(second.changed, 0); assert.equal(second.sent, 2); assert.equal(second.pending, 0);
    assert.equal(new Set(f.messages.map(message => message.embeds[0].title)).size, 10);
  } finally { f.close(); }
});

test('failed transaction keeps the previous price and does not create a partial outbox', async () => {
  const f = fixture();
  try {
    await f.run(); f.price(25000); f.advance();
    const batch = f.env.MONITOR_DB.batch;
    let calls = 0;
    f.env.MONITOR_DB.batch = statements => {
      calls++;
      if (calls === 2) statements.push(f.env.MONITOR_DB.prepare('INSERT INTO missing_table VALUES (1)'));
      return batch(statements);
    };
    await assert.rejects(f.run);
    const saved = await f.env.MONITOR_DB.prepare('SELECT price_key FROM monitor_prices').first();
    assert.equal(saved.price_key, 'number:30000');
    assert.equal((await f.env.MONITOR_DB.prepare('SELECT COUNT(*) AS count FROM monitor_outbox').first()).count, 0);
    f.env.MONITOR_DB.batch = batch;
    assert.equal((await f.run()).sent, 1);
    assert.equal(f.messages[0].embeds[0].description, '**30K → 25K**');
  } finally { f.close(); }
});
