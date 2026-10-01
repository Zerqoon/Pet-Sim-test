import { PETS, CHARMS, EGGS, ITEMS } from '../../public/data/catalog.js';
import { catalogPriceRows, priceRevision } from '../../server/pricing.js';

// Read-only, public prices. The Discord secret never belongs in this Function.
export async function onRequestGet() {
  const rows = catalogPriceRows({ pets: PETS, charms: CHARMS, eggs: EGGS, items: ITEMS });
  return new Response(JSON.stringify({ version: 1, revision: await priceRevision(rows), rows }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store, max-age=0', 'x-content-type-options': 'nosniff' },
  });
}
