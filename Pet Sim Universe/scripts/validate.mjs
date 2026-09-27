import { PETS, CHARMS, EGGS, ITEMS, CODES, RARITY_ORDER } from '../public/data/catalog.js';

const catalogs = { PETS, CHARMS, EGGS, ITEMS, CODES };
const allowedValue = value => value == null || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
let errors = 0;

for (const [name, list] of Object.entries(catalogs)) {
  if (!Array.isArray(list)) {
    console.error(`[catalog] ${name} is not an array.`);
    errors++;
    continue;
  }

  const ids = new Set();
  for (const item of list) {
    if (!item?.id || !item?.name) {
      console.error(`[catalog] ${name} contains an item without id/name.`);
      errors++;
      continue;
    }
    if (ids.has(item.id)) {
      console.error(`[catalog] Duplicate id in ${name}: ${item.id}`);
      errors++;
    }
    ids.add(item.id);

    if (item.rarity && !RARITY_ORDER.includes(item.rarity) && item.rarity !== 'Code') {
      console.error(`[catalog] Unknown rarity for ${item.id}: ${item.rarity}`);
      errors++;
    }

    if (item.supportsVariants) {
      for (const variant of ['normal', 'golden', 'diamond']) {
        if (!allowedValue(item.values?.[variant])) {
          console.error(`[catalog] Invalid ${variant} value for ${item.id}.`);
          errors++;
        }
      }
    } else if ('value' in item && !allowedValue(item.value)) {
      console.error(`[catalog] Invalid value for ${item.id}.`);
      errors++;
    }
  }
}

if (errors) {
  console.error(`\nCatalog validation failed with ${errors} error(s).`);
  process.exit(1);
}

const tracked = [...PETS, ...CHARMS, ...EGGS, ...ITEMS].reduce((sum, item) => {
  if (item.supportsVariants) {
    return sum + ['normal', 'golden', 'diamond'].filter(v => Number.isFinite(item.values?.[v])).length;
  }
  return sum + (Number.isFinite(item.value) ? 1 : 0);
}, 0);

console.log(`Catalog OK. ${PETS.length} pets, ${CHARMS.length} charms, ${EGGS.length} eggs, ${ITEMS.length} items, ${CODES.length} codes.`);
console.log(`D1 can track ${tracked} numeric value stream(s).`);
