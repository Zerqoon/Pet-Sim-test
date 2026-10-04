import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, utimes } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { updatePriceTime } from '../scripts/update-price-time.mjs';
import { buildPriceFeed } from '../scripts/build-price-feed.mjs';
import { selectPriceUpdate, formatPriceAge, applyFeedPrices, catalogPriceRows, priceRevision } from '../public/data/price-core.js';
import { loadPriceFeed } from '../public/data/price-feed-client.js';
import { testMonitor, waitForPublishedPrices } from '../scripts/discord-tools.mjs';

const stamp = '2026-10-04T12:17:41.000Z';
const source = value => `export const PRICES = { pets: { 'test-pet': ${JSON.stringify(value)} }, charms: {}, eggs: {}, items: {} };\n`;
const row = value => ({ key: 'pets/test-pet/normal', category: 'pets', id: 'test-pet', name: 'Test Pet', variant: 'normal', value, image: null });
const site = 'https://petuniverse-values.pl';

async function temporaryRoot() {
  const root = await mkdtemp(path.join(tmpdir(), 'pet-price-time-'));
  await mkdir(path.join(root, 'public/data'), { recursive: true });
  await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
  return root;
}

test('stale metadata is rejected and elapsed time never rounds up to the next hour', () => {
  assert.equal(selectPriceUpdate('new', { revision: 'old', updatedAt: stamp }), null);
  assert.equal(selectPriceUpdate('new', { revision: 'new', updatedAt: 'bad-date' }), null);
  assert.equal(selectPriceUpdate('new', { revision: 'new', updatedAt: stamp }).updatedAt, stamp);
  const start = Date.parse(stamp);
  for (const [age, text] of [[0, 'Just now'], [59000, '59s ago'], [60000, '1m ago'], [3599000, '59m ago'], [3600000, '1h ago'], [7199000, '1h ago'], [86400000, '1d ago']]) {
    assert.equal(formatPriceAge(stamp, start + age), text);
  }
  assert.equal(formatPriceAge(stamp, start - 1000), 'Just now');
});

test('local price edit captures its save time; rebuilds, formatting and extraction times do not reset it', async () => {
  const root = await temporaryRoot();
  try {
    const prices = path.join(root, 'public/data/prices.js');
    await writeFile(prices, source(30000));
    const initial = await updatePriceTime(root);
    assert.equal(initial.updatedAt, null, 'a historical timestamp cannot be invented');
    await writeFile(prices, source(25000));
    await utimes(prices, new Date(stamp), new Date(stamp));
    const updated = await updatePriceTime(root);
    assert.equal(updated.updatedAt, stamp);
    await writeFile(prices, '// comment only\n' + source('25K'));
    await utimes(prices, new Date('2026-10-10T15:00:00Z'), new Date('2026-10-10T15:00:00Z'));
    const rebuilt = await updatePriceTime(root);
    assert.equal(rebuilt.revision, updated.revision);
    assert.equal(rebuilt.updatedAt, stamp);
    assert.equal((await updatePriceTime(root)).updatedAt, stamp);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('Git dates real changes, ignores equivalent spelling, and detects an unbuilt A -> B -> A revert', async () => {
  const root = await temporaryRoot();
  const git = (args, timestamp) => execFileSync('git', args, { cwd: root, stdio: 'pipe', env: { ...process.env, ...(timestamp ? { GIT_AUTHOR_DATE: timestamp, GIT_COMMITTER_DATE: timestamp } : {}) } });
  const commit = async (value, timestamp) => {
    await writeFile(path.join(root, 'public/data/prices.js'), source(value));
    git(['add', 'public/data/prices.js']); git(['commit', '-m', 'prices'], timestamp);
  };
  try {
    git(['init']); git(['config', 'user.email', 'test@example.invalid']); git(['config', 'user.name', 'Price Test']);
    await commit(30000, '2026-10-01T12:00:00Z');
    assert.equal((await updatePriceTime(root)).updatedAt, '2026-10-01T12:00:00.000Z');
    await commit('30K', '2026-10-01T13:00:00Z');
    assert.equal((await updatePriceTime(root)).updatedAt, '2026-10-01T12:00:00.000Z');
    await commit(25000, '2026-10-01T14:00:00Z');
    // Simulate a second price commit before the first Pages build completes.
    await commit(30000, '2026-10-01T15:00:00Z');
    assert.equal((await updatePriceTime(root)).updatedAt, '2026-10-01T15:00:00.000Z');
    await writeFile(path.join(root, 'style.css'), 'body{}'); git(['add', 'style.css']); git(['commit', '-m', 'style'], '2026-10-01T16:00:00Z');
    assert.equal((await updatePriceTime(root)).updatedAt, '2026-10-01T15:00:00.000Z');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('static feed is self-consistent and retains its previous revision through rebuilds', async () => {
  const root = await temporaryRoot();
  try {
    await writeFile(path.join(root, 'public/data/catalog.js'), `export const PETS = [{id:'test-pet',name:'Test Pet',value:25000}]; export const CHARMS=[]; export const EGGS=[]; export const ITEMS=[];`);
    const previousRows = [row(30000)];
    const previous = { version: 1, revision: await priceRevision(previousRows), updatedAt: '2026-10-03T14:49:00Z', rows: previousRows };
    await writeFile(path.join(root, 'public/data/price-feed.json'), JSON.stringify(previous));
    const current = { revision: await priceRevision([row(25000)]), updatedAt: stamp };
    const feed = await buildPriceFeed(root, current);
    assert.equal(feed.updatedAt, stamp);
    assert.equal(feed.revision, await priceRevision(feed.rows));
    assert.equal(feed.baseline.revision, previous.revision);
    const again = await buildPriceFeed(root, current);
    assert.deepEqual(again, feed);
    assert.ok(!JSON.stringify(feed).includes('webhook'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('browser prices update shared catalog objects without losing a calculator selection', () => {
  const pet = { id: 'test-pet', name: 'Test Pet', supportsVariants: true, values: { normal: 30000, golden: 60000, diamond: null } };
  const catalogs = { pets: [pet], charms: [], eggs: [], items: [] };
  const selection = { item: pet, variant: 'golden', qty: 3 };
  const rows = catalogPriceRows(catalogs).map(row => ({ ...row, value: row.variant === 'golden' ? 50000 : row.value }));
  assert.equal(applyFeedPrices(catalogs, rows), true);
  assert.equal(selection.item.values[selection.variant] * selection.qty, 150000);
  assert.equal(selection.item, catalogs.pets[0]);
  assert.equal(applyFeedPrices(catalogs, rows.map(row => ({ ...row, value: row.variant === 'golden' ? '50K' : row.value }))), false);
  assert.throws(() => applyFeedPrices(catalogs, rows.slice(1)), /Catalog changed/);
  assert.equal(selection.item.values.golden, '50K');
});

test('static data works with Functions disabled; old HTML fallback uses the API with fresh requests', async () => {
  const rows = [row(25000)];
  const feed = { version: 1, revision: await priceRevision(rows), updatedAt: stamp, rows };
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push(new URL(url).pathname);
    assert.equal(options.cache, 'no-store'); assert.equal(options.redirect, 'manual');
    assert.equal(new URL(url).searchParams.get('check'), '123');
    if (calls.length === 1) return new Response('<html>old site fallback</html>', { headers: { 'content-type': 'text/html' } });
    return Response.json(feed);
  };
  assert.equal((await loadPriceFeed(site, { fetcher, now: 123 })).source, '/api/price-feed');
  assert.deepEqual(calls, ['/data/price-feed.json', '/api/price-feed']);
  const staticOnly = async url => {
    assert.equal(new URL(url).pathname, '/data/price-feed.json', 'disabled API must not be required');
    return Response.json(feed);
  };
  assert.equal((await loadPriceFeed(site, { fetcher: staticOnly })).updatedAt, stamp);
});

test('repair confirms actual deployed prices and never reports success without Discord acknowledgement', async () => {
  const local = JSON.parse(await readFile(new URL('../public/data/price-feed.json', import.meta.url), 'utf8'));
  const published = await waitForPublishedPrices(site, { fetcher: async () => Response.json(local), timeout: 0 });
  assert.equal(published.revision, local.revision);
  let attempts = 0;
  const result = await testMonitor('https://monitor.example', 'private-key', { delay: 0, fetcher: async (url, options) => {
    assert.equal(url, 'https://monitor.example/test');
    assert.equal(options.headers.authorization, 'Bearer private-key');
    return Response.json(++attempts === 1 ? { busy: true } : { checked: 91, testSent: true, sent: 1, changed: 1, pending: 0 });
  } });
  assert.equal(result.testSent, true);
  assert.equal(attempts, 2);
  await assert.rejects(() => testMonitor('https://monitor.example', 'key', { fetcher: async () => Response.json({ checked: 91 }) }), /nie potwierdzil/);
  await assert.rejects(() => testMonitor('https://monitor.example', 'key', { fetcher: async () => Response.json({ error: 'Discord test HTTP 404.' }, { status: 503 }) }), /Discord test HTTP 404/);
});


test('generated browser bundle parses and all of its external data modules exist', async () => {
  const bundleRoot = new URL('../public/bundle/', import.meta.url);
  const names = (await readdir(bundleRoot)).filter(name => /^app-.*\.js$/.test(name));
  assert.equal(names.length, 1);
  const bundle = new URL(names[0], bundleRoot);
  execFileSync(process.execPath, ['--check', fileURLToPath(bundle)], { stdio: 'pipe' });
  const text = await readFile(bundle, 'utf8');
  for (const match of text.matchAll(/from ['"]([^'"]+)['"]/g)) {
    await readFile(new URL(match[1], bundle));
  }
});
