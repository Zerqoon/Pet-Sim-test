import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { catalogPriceRows, priceRevision, selectPriceUpdate, validateFeed } from '../public/data/price-core.js';

export async function buildPriceFeed(root, metadata) {
  const catalogPath = path.join(root, 'public/data/catalog.js');
  // A build runs in its own Node process, so the catalog imports fresh prices.
  const { PETS, CHARMS, EGGS, ITEMS } = await import(pathToFileURL(catalogPath).href);
  const rows = catalogPriceRows({ pets: PETS, charms: CHARMS, eggs: EGGS, items: ITEMS });
  const revision = await priceRevision(rows);
  const update = selectPriceUpdate(revision, metadata);
  if (metadata.revision !== revision) throw new Error('Price timestamp and catalog revision do not match. Run the build with complete prices.');
  const filename = path.join(root, 'public/data/price-feed.json');
  let previous = null;
  try {
    previous = JSON.parse(await readFile(filename, 'utf8'));
    validateFeed(previous, 'https://petuniverse-values.pl');
    if (previous.revision !== await priceRevision(previous.rows)) previous = null;
  } catch { previous = null; }
  let baseline = previous?.baseline || null;
  if (previous && previous.revision !== revision) {
    baseline = { version: 1, revision: previous.revision, updatedAt: previous.updatedAt, rows: previous.rows };
  }
  const feed = { version: 1, revision, updatedAt: update?.updatedAt || null, rows, ...(baseline ? { baseline } : {}) };
  const output = JSON.stringify(feed, null, 2) + '\n';
  const old = await readFile(filename, 'utf8').catch(() => '');
  if (old !== output) await writeFile(filename, output);
  console.log(`Public price feed: ${rows.length} prices, revision ${revision.slice(0, 12)}.`);
  return feed;
}
