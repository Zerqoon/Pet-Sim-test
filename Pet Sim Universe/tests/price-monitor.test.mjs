import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import monitor, { runMonitor, MONITOR_SCHEMA } from '../workers/price-monitor.js';
import { normalizePrice, validateFeed, priceRevision } from '../server/pricing.js';
import { onRequestGet } from '../functions/api/price-feed.js';
import { PETS, CHARMS, EGGS, ITEMS } from '../public/data/catalog.js';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

// Exercise the real SQL, transactions and retry queue in SQLite. Only remote
// HTTP is replaced; these tests never send anything to a Discord channel.
function d1() {
  const sql = new DatabaseSync(':memory:');
  let queries = 0;
  const count = args => { assert.ok(args.length <= 100, 'D1 bound parameter limit'); if (++queries > 50) throw new Error('D1 Free query limit exceeded'); };
  const db = {
    resetBudget() { queries = 0; },
    get queryCount() { return queries; },
    prepare(text) {
      let args = [];
      const statement = {
        bind(...values) { args = values; return statement; },
        async run() { count(args); const result = sql.prepare(text).run(...args); return { success: true, meta: { changes: Number(result.changes) } }; },
        async all() { count(args); return { results: sql.prepare(text).all(...args) }; },
        async first() { count(args); return sql.prepare(text).get(...args) || null; },
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
  let metadata = {};
  const messages = [];
  const requests = [];
  const env = { MONITOR_DB: d1(), DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/123456789012345678/test_token', MONITOR_KEY: 'test-secret-key', SITE_URL: 'https://petuniverse-values.pl' };
  const fetcher = async (url, options = {}) => {
    requests.push({ url, options });
    assert.equal(options.redirect, 'manual', 'Workers supports manual or follow redirects');
    if (new URL(url).hostname === 'petuniverse-values.pl') {
      if (feedFailure) return new Response('Failure', { status: 503 });
      assert.equal(options.cache, 'no-store');
      return Response.json({ version: 1, rows, ...metadata });
    }
    assert.equal(new URL(url).searchParams.get('wait'), 'true');
    assert.equal(options.method, 'POST');
    messages.push(JSON.parse(options.body));
    if (failure === 'network') throw new Error('Network failed');
    if (failure) return Response.json(failure.status === 429 ? { retry_after: 180 } : {}, { status: failure.status });
    return Response.json({ id: 'message-id' });
  };
  return {
    env, messages, requests, run: () => { env.MONITOR_DB.resetBudget(); return runMonitor(env, { fetcher, clock: () => time }); },
    setMetadata: value => { metadata = value; },
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
    assert.match(embed.description, /\*\*30K → 25K\*\*/);
    assert.equal(embed.image, undefined);
    assert.equal(embed.fields[0].value, '**30K**');
    assert.equal(embed.thumbnail.url, 'https://petuniverse-values.pl/assets/pets/job-cat-v30.png');
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
    assert.match(f.messages[0].embeds[0].description, /O\/C → 30K/);
    assert.match(f.messages[0].embeds[0].thumbnail.url, /imp-diamond\.png$/);
    assert.match(f.messages[0].embeds[0].title, /Diamond/);
    f.price('No Price'); f.advance(); await f.run();
    assert.match(f.messages[1].embeds[0].description, /30K → No Price/);
    f.price(null); f.advance(); assert.equal((await f.run()).changed, 0);
    f.price('O/C'); f.advance(); await f.run();
    assert.match(f.messages[2].embeds[0].description, /No Price → O\/C/);
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
    f.failFeed(false); f.advance(); await f.run(); assert.match(f.messages[0].embeds[0].description, /\*\*30K → 25K\*\*/);
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
    assert.match(f.messages[0].embeds[0].description, /\*\*30K → 25K\*\*/);
  } finally { f.close(); }
});

 test('68-row baseline and mass update stay within D1 Free limits', async () => {
  const f = fixture();
  try {
    const base = f.getRows()[0];
    f.setRows(Array.from({length:68}, (_,i) => ({...base,id:`pet-${i}`,key:`pets/pet-${i}/normal`})));
    assert.equal((await f.run()).checked,68);
    assert.ok(f.env.MONITOR_DB.queryCount < 50);
    f.setRows(f.getRows().map(row => ({...row,value:'25K'}))); f.advance();
    const result = await f.run();
    assert.equal(result.changed,68); assert.equal(result.sent,8); assert.equal(result.pending,60);
    assert.ok(f.env.MONITOR_DB.queryCount < 50);
  } finally { f.close(); }
});

test('authenticated diagnostic confirms feed and Discord; reports Discord failure', async () => {
 const f=fixture(); const original=globalThis.fetch; let status=200; let tests=0;
 globalThis.fetch=async(url,options={})=> {
  assert.equal(options.redirect,'manual');
  if(new URL(url).hostname==='petuniverse-values.pl') return Response.json({version:1,rows:f.getRows()});
  tests++; const body=JSON.parse(options.body); assert.match(body.embeds[0].title,/test monitora/);
  return Response.json({}, {status});
 };
 try {
  const request=()=>new Request('https://monitor.example/test',{method:'POST',headers:{authorization:'Bearer test-secret-key'}});
  f.env.MONITOR_DB.resetBudget();const response=await monitor.fetch(request(),f.env);
  assert.equal(response.status,200);assert.equal((await response.json()).testSent,true);assert.equal(tests,1);
  status=404;f.env.MONITOR_DB.resetBudget();const failure=await monitor.fetch(request(),f.env);
  assert.equal(failure.status,503);assert.match((await failure.json()).error,/Discord test HTTP 404/);
 }finally{globalThis.fetch=original;f.close();}
});


test('static publication recovers real price changes on first start and uses the authoring time', async () => {
  const f = fixture();
  try {
    const old = f.getRows();
    const baseline = { version: 1, revision: await priceRevision(old), rows: old };
    f.price('25K');
    f.setMetadata({ revision: await priceRevision(f.getRows()), updatedAt: '2026-10-01T12:17:41Z', baseline });
    const result = await f.run();
    assert.equal(result.initialized, true);
    assert.equal(result.changed, 1);
    assert.equal(result.sent, 1);
    assert.equal(result.feedSource, '/data/price-feed.json');
    assert.equal(result.priceUpdatedAt, '2026-10-01T12:17:41.000Z');
    assert.match(f.requests[0].url, /data\/price-feed\.json\?check=/);
    assert.ok(!f.requests.some(request => request.url.includes('/api/price-feed')));
    assert.equal(f.messages[0].embeds[0].timestamp, '2026-10-01T12:17:41.000Z');
    assert.match(f.messages[0].embeds[0].footer.text, /czas aktualizacji cen/);
    f.advance(); assert.equal((await f.run()).changed, 0);
    assert.equal(f.messages.length, 1);
  } finally { f.close(); }
});

test('initialized D1 takes precedence over a publication baseline', async () => {
  const f = fixture();
  try {
    await f.run();
    const baselineRows = f.getRows().map(row => ({ ...row, value: '90K' }));
    f.price('25K');
    f.setMetadata({ revision: await priceRevision(f.getRows()), baseline: { version: 1, revision: await priceRevision(baselineRows), rows: baselineRows } });
    f.advance(); await f.run();
    assert.match(f.messages[0].embeds[0].description, /30K → 25K/);
  } finally { f.close(); }
});

test('mismatched current or previous revision cannot overwrite the D1 snapshot', async () => {
  const f = fixture();
  try {
    await f.run(); f.price(25000);
    f.setMetadata({ revision: 'wrong-revision' });
    await assert.rejects(f.run, /revision/);
    f.setMetadata({ revision: await priceRevision(f.getRows()), baseline: { version: 1, revision: 'wrong', rows: f.getRows() } });
    await assert.rejects(f.run, /previous price revision/);
    const saved = await f.env.MONITOR_DB.prepare('SELECT price_key FROM monitor_prices').first();
    assert.equal(saved.price_key, 'number:30000');
    assert.equal(f.messages.length, 0);
    f.setMetadata({}); f.advance(); assert.equal((await f.run()).sent, 1);
  } finally { f.close(); }
});

test('this full prices import recovers all changed streams and drains its outbox once', async () => {
  const f = fixture();
  try {
    const feed = JSON.parse(await readFile(new URL('../public/data/price-feed.json', import.meta.url), 'utf8'));
    assert.ok(feed.baseline, 'the previous project prices must travel with this import');
    const previous = new Map(feed.baseline.rows.map(row => [row.key, normalizePrice(row.value).key]));
    const expected = feed.rows.filter(row => previous.has(row.key) && previous.get(row.key) !== normalizePrice(row.value).key).length;
    assert.ok(expected > 10, 'the supplied prices contain a real update, not just a new timestamp');
    f.setRows(feed.rows);
    f.setMetadata({ revision: feed.revision, updatedAt: feed.updatedAt, baseline: feed.baseline });
    const first = await f.run();
    assert.equal(first.changed, expected);
    assert.equal(first.sent, 8);
    assert.equal(first.pending, expected - 8);
    let pending = first.pending;
    while (pending) { f.advance(); const next = await f.run(); assert.equal(next.changed, 0); pending = next.pending; }
    assert.equal(f.messages.length, expected);
    assert.equal(new Set(f.messages.map(message => message.embeds[0].title)).size, expected);
    f.advance(); assert.equal((await f.run()).sent, 0);
    assert.ok(f.env.MONITOR_DB.queryCount < 50);
  } finally { f.close(); }
});


test('successful repair test releases old retry cooldown without losing queued messages', async () => {
  const f = fixture(); const original = globalThis.fetch;
  try {
    await f.run(); f.price(25000); f.failure({status:404}); f.advance();
    assert.equal((await f.run()).pending, 1);
    const future = Date.now() + 3600000;
    await f.env.MONITOR_DB.prepare("UPDATE monitor_meta SET value=? WHERE name='discord_retry_after'").bind(String(future)).run();
    await f.env.MONITOR_DB.prepare('UPDATE monitor_outbox SET next_attempt_at=? WHERE sent_at IS NULL').bind(future).run();
    let diagnostics = 0;
    globalThis.fetch = async (url, options) => {
      if (new URL(url).hostname === 'petuniverse-values.pl') return Response.json({version:1,rows:f.getRows()});
      diagnostics++; assert.match(JSON.parse(options.body).embeds[0].title, /test monitora/);
      return Response.json({id:'diagnostic-message'});
    };
    f.env.MONITOR_DB.resetBudget();
    const response = await monitor.fetch(new Request('https://monitor.example/test', {method:'POST',headers:{authorization:'Bearer test-secret-key'}}),f.env);
    assert.equal(response.status,200);
    const result = await response.json(); assert.equal(result.testSent,true); assert.equal(result.retryScheduled,true);
    assert.equal(diagnostics,1);
    assert.equal(await f.env.MONITOR_DB.prepare("SELECT value FROM monitor_meta WHERE name='discord_retry_after'").first(),null);
    f.failure(null); f.advance(); assert.equal((await f.run()).sent,1);
    f.advance(); assert.equal((await f.run()).sent,0);
  } finally { globalThis.fetch=original; f.close(); }
});
