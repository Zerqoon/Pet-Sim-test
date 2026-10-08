import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { buildValueFeed } from '../lib/value-api.js';
export async function buildValueApi(root = path.resolve(import.meta.dirname, '..')) {
  const read = name => readFile(path.join(root, 'public/data', `${name}.js`), 'utf8');
  const [catalog, prices, metadata] = await Promise.all([read('catalog'), read('prices'), read('price-updates').catch(() => null)]);
  const feed = await buildValueFeed(catalog, prices, metadata);
  const output = path.join(root, 'public/api/v1');
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'values.json'), JSON.stringify(feed, null, 2) + '\n');
  console.log(`Value API OK: ${feed.total} price variants; revision ${feed.revision.slice(0, 12)}.`);
  return feed;
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) await buildValueApi();
