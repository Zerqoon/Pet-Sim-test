import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { readDataModule, rowsFromPrices } from '../public/data/value-loader.js';
export async function readPrices(root, catalogs) {
  const source = await readFile(path.join(root, 'public/data/prices.js'), 'utf8');
  const prices = readDataModule(source, 'PRICES');
  if (catalogs) rowsFromPrices(catalogs, prices);
  return { source, prices };
}
