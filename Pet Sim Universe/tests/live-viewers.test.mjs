import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createLocalViewersDatabase } from '../server/live-viewers-local.js';
import { handleLiveViewers, readLiveViewers, VIEWER_ACTIVE_SECONDS } from '../lib/live-viewers.js';
import { sharedViewerId, startLiveViewers } from '../public/data/live-viewers.js';

const origin = 'https://values.example';
const context = (env, { method = 'GET', visitorId = randomUUID(), now = 100000, headers = {}, body } = {}) => ({
  env, now: () => now,
  request: new Request(`${origin}/api/viewers`, { method,
    headers: { origin, 'content-type': 'application/json', ...headers },
    ...(!['GET', 'HEAD'].includes(method) ? { body: body ?? JSON.stringify({ visitorId }) } : {}),
  }),
});
const decode = async ctx => { const response = await handleLiveViewers(ctx); return { status: response.status, data: await response.json(), headers: response.headers }; };

test('many tabs, reloads and simultaneous heartbeats with one shared ID count as one browser', async t => {
  const db = createLocalViewersDatabase(); t.after(() => db.close());
  const visitorId = randomUUID();
  const requests = Array.from({ length: 30 }, () => context({ VIEWERS_DB: db }, { method: 'POST', visitorId }));
  const results = await Promise.all(requests.map(decode));
  assert.ok(results.every(result => result.status === 200 && result.data.count === 1));
  assert.equal(await readLiveViewers(db, visitorId, 110000), 1);
  assert.equal((await db.prepare('SELECT COUNT(*) AS total FROM live_viewer_sessions').first()).total, 1);
});

test('two independent browsers are counted separately and GET does not add a viewer', async t => {
  const db = createLocalViewersDatabase(); t.after(() => db.close());
  assert.equal((await decode(context({ VIEWERS_DB: db }))).data.count, 0);
  for (const count of [1, 2]) assert.equal((await decode(context({ VIEWERS_DB: db }, { method: 'POST' }))).data.count, count);
  assert.equal((await decode(context({ VIEWERS_DB: db }))).data.count, 2);
});

test('closing one tab cannot remove the browser while another tab keeps sending heartbeats', async t => {
  const db = createLocalViewersDatabase(); t.after(() => db.close());
  const id = randomUUID();
  await readLiveViewers(db, id, 100000);
  await readLiveViewers(db, id, 130000);
  assert.equal(await readLiveViewers(db, null, 150000), 1);
  assert.equal(await readLiveViewers(db, null, 130000 + VIEWER_ACTIVE_SECONDS * 1000), 0);
});

test('inactive sessions expire, clean up their stored IDs and can rejoin without inflating the count', async t => {
  const db = createLocalViewersDatabase(); t.after(() => db.close());
  const first = randomUUID(); const second = randomUUID();
  await readLiveViewers(db, first, 100000); await readLiveViewers(db, second, 115000);
  assert.equal(await readLiveViewers(db, null, 145000), 1);
  assert.equal(await readLiveViewers(db, null, 160000), 0);
  assert.equal((await db.prepare('SELECT COUNT(*) AS total FROM live_viewer_sessions').first()).total, 0);
  assert.equal(await readLiveViewers(db, first, 200000), 1);
});

test('an older heartbeat cannot shorten a live session and separate edge contexts share one total', async t => {
  const db = createLocalViewersDatabase(); t.after(() => db.close());
  const otherContext = { prepare: db.prepare, batch: db.batch };
  const id = randomUUID();
  await readLiveViewers(db, id, 140000);
  await readLiveViewers(otherContext, id, 120000);
  assert.equal(await readLiveViewers(otherContext, null, 170000), 1);
  assert.equal(await readLiveViewers(db, null, 185000), 0);
});

test('the existing VALUES_DB binding also works, and successful responses cannot be cached', async t => {
  const db = createLocalViewersDatabase(); t.after(() => db.close());
  const result = await decode(context({ VALUES_DB: db }, { method: 'POST' }));
  assert.equal(result.status, 200); assert.equal(result.data.count, 1);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(result.headers.get('access-control-allow-origin'), null);
});

test('missing or failed storage gives an unavailable response instead of an invented count', async () => {
  for (const env of [{}, { VIEWERS_DB: { prepare() { throw new Error('Offline'); } } }]) {
    const result = await decode(context(env, { method: 'POST' }));
    assert.equal(result.status, 503); assert.equal(result.data.available, false);
    assert.equal(result.data.count, undefined);
  }
});

test('cross-site posts, malformed IDs, oversized bodies and unsupported methods never write a session', async t => {
  const db = createLocalViewersDatabase(); t.after(() => db.close());
  const attempts = [
    [{ method: 'POST', headers: { origin: 'https://other.example' } }, 403],
    [{ method: 'POST', headers: { 'sec-fetch-site': 'cross-site' } }, 403],
    [{ method: 'POST', headers: { 'content-type': 'text/plain' } }, 415],
    [{ method: 'POST', visitorId: 'per-tab-counter' }, 400],
    [{ method: 'POST', body: '{' }, 400],
    [{ method: 'POST', body: JSON.stringify({ visitorId: randomUUID(), junk: 'a'.repeat(300) }) }, 400],
    [{ method: 'DELETE' }, 405],
  ];
  for (const [options, status] of attempts) assert.equal((await decode(context({ VIEWERS_DB: db }, options))).status, status);
  assert.equal(await readLiveViewers(db, null, 100000), 0);
});

function browserFixture({ shared = new Map(), cookie = { value: '' }, blockedStorage = false, blockedCookie = false, locks } = {}) {
  const document = new EventTarget(); document.hidden = false;
  Object.defineProperty(document, 'cookie', { get: () => blockedCookie ? '' : cookie.value,
    set: value => { if (!blockedCookie) cookie.value = value.split(';')[0]; } });
  const browser = new EventTarget();
  Object.assign(browser, { document, navigator: { onLine: true, ...(locks ? { locks } : {}) },
    location: { protocol: 'https:' }, crypto: { randomUUID }, AbortController,
    localStorage: { getItem: key => { if (blockedStorage) throw new Error('Blocked'); return shared.get(key) ?? null; },
      setItem: (key, value) => { if (blockedStorage) throw new Error('Blocked'); shared.set(key, value); } },
    setInterval: () => 1, clearInterval() {}, setTimeout, clearTimeout,
  });
  const count = { textContent: '—' };
  const badge = { hidden: true, dataset: {}, querySelector: () => count };
  return { browser, badge, count };
}

test('browser IDs are shared between tabs, including simultaneous first openings protected by Web Locks', async () => {
  const shared = new Map(); const cookie = { value: '' }; let queue = Promise.resolve();
  const locks = { request(name, callback) { assert.equal(name, 'pet-universe-live-visitor-v1'); const next = queue.then(callback); queue = next.catch(() => {}); return next; } };
  const tabs = Array.from({ length: 20 }, () => browserFixture({ shared, cookie, locks }).browser);
  const ids = await Promise.all(tabs.map(sharedViewerId));
  assert.equal(new Set(ids).size, 1); assert.ok(ids[0]);
  assert.equal(await sharedViewerId(browserFixture({ shared, cookie, locks }).browser), ids[0]);
});

test('a shared cookie handles blocked localStorage; blocking all shared storage never creates per-tab identities', async () => {
  const cookie = { value: '' };
  const a = browserFixture({ cookie, blockedStorage: true }); const b = browserFixture({ cookie, blockedStorage: true });
  assert.equal(await sharedViewerId(a.browser), await sharedViewerId(b.browser));
  assert.equal(await sharedViewerId(browserFixture({ blockedStorage: true, blockedCookie: true }).browser), null);
});

test('the badge shows a verified count, refreshes, pauses hidden tabs and hides unavailable results', async () => {
  const { browser, badge, count } = browserFixture(); let requests = 0; let available = true;
  browser.fetch = async (url, options) => {
    requests++; assert.equal(url, '/api/viewers'); assert.equal(options.method, 'POST'); assert.equal(options.cache, 'no-store');
    assert.ok(JSON.parse(options.body).visitorId);
    return new Response(JSON.stringify(available ? { available: true, count: requests } : { available: false }), { status: available ? 200 : 503 });
  };
  const counter = startLiveViewers(badge, browser); await counter.ready;
  assert.equal(count.textContent, '1'); assert.equal(badge.hidden, false);
  browser.document.hidden = true; browser.document.dispatchEvent(new Event('visibilitychange'));
  await counter.refresh(); assert.equal(requests, 1);
  browser.document.hidden = false; await counter.refresh(); assert.equal(count.textContent, '2');
  available = false; await counter.refresh(); assert.equal(badge.hidden, true); assert.equal(count.textContent, '—');
  counter.destroy();
});

test('a response arriving after pagehide cannot display an old live count', async () => {
  const { browser, badge } = browserFixture(); let complete;
  browser.fetch = () => new Promise(resolve => { complete = resolve; });
  const counter = startLiveViewers(badge, browser);
  await new Promise(resolve => setImmediate(resolve));
  browser.document.hidden = true; browser.dispatchEvent(new Event('pagehide'));
  complete(new Response(JSON.stringify({ available: true, count: 7 })));
  await counter.ready; assert.equal(badge.hidden, true); counter.destroy();
});
