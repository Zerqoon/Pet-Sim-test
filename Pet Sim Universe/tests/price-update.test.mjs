import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, utimes } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { updatePriceTime } from '../scripts/update-price-time.mjs';
import { selectPriceUpdate, formatPriceAge, applyFeedPrices, catalogPriceRows, priceRevision } from '../public/data/price-core.js';
import { loadCurrentPrices, readDataModule, rowsFromPrices } from '../public/data/value-loader.js';
import { readDataModule as parsePrices, rowsFromPrices as priceRows } from '../public/data/value-loader.js';
const PRICES = parsePrices(await readFile(new URL('../public/data/prices.js', import.meta.url), 'utf8'), 'PRICES');
import { PETS, CHARMS, EGGS, ITEMS } from '../public/data/catalog.js';
import { testMonitor, waitForPublishedPrices } from '../scripts/discord-tools.mjs';

const stamp = '2026-10-04T12:17:41.000Z';
const source = value => `export const PRICES = { pets: { 'test-pet': ${JSON.stringify(value)} }, charms: {}, eggs: {}, items: {} };\n`;
const row = value => ({ key: 'pets/test-pet/normal', category: 'pets', id: 'test-pet', name: 'Test Pet', variant: 'normal', value, image: null });
const site = 'https://petuniverse-values.pl';
const catalogs = { pets: [{ id: 'test-pet', name: 'Test Pet', value: 30000 }], charms: [], eggs: [], items: [] };

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

test('the supplied prices.js is read directly, including comments, trailing commas and escaped names', async () => {
  const text = await readFile(new URL('../public/data/prices.js', import.meta.url), 'utf8');
  assert.equal(JSON.stringify(readDataModule(text, 'PRICES')), JSON.stringify(PRICES));
  const parsed = readDataModule("/* header */ export const PRICES = {pets:{'test-pet':2.5e4,},charms:{},eggs:{},items:{},}; // footer", 'PRICES');
  assert.equal(rowsFromPrices(catalogs, parsed)[0].value, 25000);
  assert.equal(readDataModule("export const TEST = {'na\\u006de':'a\\x62\\\\c',};", 'TEST').name, 'ab\\c');
  const all = rowsFromPrices({ pets: PETS, charms: CHARMS, eggs: EGGS, items: ITEMS }, parsedFrom(text));
  assert.equal(all.length, catalogPriceRows({ pets: PETS, charms: CHARMS, eggs: EGGS, items: ITEMS }).length);
});

const parsedFrom = text => readDataModule(text, 'PRICES');

test('the data reader rejects executable code, duplicate IDs, missing variants and prototype keys', () => {
  for (const text of [
    'export const PRICES = {}; globalThis.changed=true;',
    'export const PRICES = {pets: (()=>1)()};',
    'export const PRICES = {pets:{"test-pet":1,"test-pet":2}};',
    'export const PRICES = {__proto__: {polluted: true}};',
    'export const PRICES = {pets: [1,2]};',
    'export const PRICES = {/* unfinished',
  ]) assert.throws(() => readDataModule(text, 'PRICES'), /Invalid PRICES data/);
  assert.throws(() => rowsFromPrices(catalogs, { pets: { 'different-pet': 1 }, charms: {}, eggs: {}, items: {} }), /Catalog changed/);
  const variantCatalog = { ...catalogs, pets: [{ ...catalogs.pets[0], supportsVariants: true }] };
  assert.throws(() => rowsFromPrices(variantCatalog, { pets: { 'test-pet': { normal: 1 } }, charms: {}, eggs: {}, items: {} }), /Missing price variant/);
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

test('prices.js works with Functions disabled and its exact revision selects the timestamp', async () => {
  const rows = [row(25000)];
  const revision = await priceRevision(rows);
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push(new URL(url).pathname);
    assert.equal(options.cache, 'no-store'); assert.equal(options.redirect, 'manual');
    assert.equal(new URL(url).searchParams.get('check'), String(Date.parse(stamp) + 123));
    return new Response(new URL(url).pathname === '/data/prices.js'
      ? source(25000) : `export const PRICE_UPDATE = ${JSON.stringify({ revision, updatedAt: stamp })};`);
  };
  const loaded = await loadCurrentPrices(site, { catalogs, fetcher, now: Date.parse(stamp) + 123 });
  assert.equal(loaded.source, '/data/prices.js');
  assert.equal(loaded.updatedAt, stamp);
  assert.equal(loaded.rows[0].value, 25000);
  assert.deepEqual(calls, ['/data/prices.js', '/data/price-updates.js']);
  assert.equal(catalogs.pets[0].value, 30000, 'reading prices must not mutate metadata');
});

test('missing or stale date metadata never supplies an old date or blocks current prices', async () => {
  for (const metadata of ['export const PRICE_UPDATE = {revision:"old",updatedAt:"2026-10-01T12:00:00Z"};', '<html>unavailable</html>', null]) {
    const loaded = await loadCurrentPrices(site, { catalogs, fetcher: async url => new URL(url).pathname === '/data/prices.js'
      ? new Response(source(25000)) : metadata === null ? new Response('', { status: 404 }) : new Response(metadata) });
    assert.equal(loaded.rows[0].value, 25000);
    assert.equal(loaded.updatedAt, null);
  }
  await assert.rejects(() => loadCurrentPrices(site, { catalogs, fetcher: async () => new Response('<html>old fallback</html>') }), /Invalid PRICES data/);
});

test('repair confirms actual deployed prices and never reports success without Discord acknowledgement', async () => {
  const local = await readFile(new URL('../public/data/prices.js', import.meta.url), 'utf8');
  const metadata = await readFile(new URL('../public/data/price-updates.js', import.meta.url), 'utf8');
  const published = await waitForPublishedPrices(site, { fetcher: async url => {
    assert.ok(['/data/prices.js', '/data/price-updates.js'].includes(new URL(url).pathname));
    return new Response(new URL(url).pathname === '/data/prices.js' ? local : metadata);
  }, timeout: 0 });
  assert.equal(published.revision, await priceRevision(rowsFromPrices({ pets: PETS, charms: CHARMS, eggs: EGGS, items: ITEMS }, parsedFrom(local))));
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
