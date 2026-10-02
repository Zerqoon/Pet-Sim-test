import { PETS, CHARMS, EGGS, ITEMS, CODES, RARITY_ORDER } from '../public/data/catalog.js';
import { IMAGE_ASSETS } from '../public/data/image-assets.js';
import { PRICES } from '../public/data/prices.js';
import { normalizePrice } from '../server/pricing.js';
import { existsSync } from 'node:fs';
import path from 'node:path';
const publicRoot = path.resolve(import.meta.dirname, '../public');

const catalogs = { PETS, CHARMS, EGGS, ITEMS, CODES };
const allowedValue = value => { try { normalizePrice(value); return true; } catch { return false; } };
const numericValue = value => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/,/g, '').toUpperCase();
  const match = normalized.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(K|M|B|T|QA|QI|SX|SP|OC)?$/);
  if (!match) return null;
  const multipliers = { K:1e3, M:1e6, B:1e9, T:1e12, QA:1e15, QI:1e18, SX:1e21, SP:1e24, OC:1e27 };
  const numeric = Number(match[1]) * (multipliers[match[2]] || 1);
  return Number.isFinite(numeric) ? numeric : null;
};
let errors = 0;
function validateImage(source) {
  if (!source) return;
  if (!existsSync(path.join(publicRoot, source))) {
    console.error(`[asset] Missing original image: ${source}`);
    errors++;
  }
}

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
    if (!/^[a-z0-9-]{1,100}$/.test(item.id)) {
      console.error(`[catalog] Invalid id for the price API: ${name}/${item.id}`);
      errors++;
    }
    if (ids.has(item.id)) {
      console.error(`[catalog] Duplicate id in ${name}: ${item.id}`);
      errors++;
    }
    ids.add(item.id);
    validateImage(item.image);
    Object.values(item.variantImages || {}).forEach(validateImage);
    (item.dropSources || []).forEach(source => validateImage(source.image));

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

// Keep the editable price file aligned with every catalog entry, including
// unpriced items. This catches missing entries and spelling/case mismatches.
for (const [category, list] of Object.entries({ pets: PETS, charms: CHARMS, eggs: EGGS, items: ITEMS })) {
  const prices = PRICES[category];
  if (!prices || typeof prices !== 'object' || Array.isArray(prices)) {
    console.error(`[prices] Missing price table: ${category}`);
    errors++;
    continue;
  }
  const ids = new Set(list.map(item => item.id));
  for (const item of list) {
    if (!Object.hasOwn(prices, item.id)) {
      console.error(`[prices] Missing entry: ${category}/${item.id}`);
      errors++;
      continue;
    }
    if (item.supportsVariants) {
      const values = prices[item.id];
      for (const variant of ['normal', 'golden', 'diamond']) {
        if (!values || typeof values !== 'object' || !Object.hasOwn(values, variant)) {
          console.error(`[prices] Missing variant: ${category}/${item.id}/${variant}`);
          errors++;
        }
      }
    }
    if (category === 'items' && item.itemGroup && !['general', 'fishing'].includes(item.itemGroup)) {
      console.error(`[catalog] Unknown item group for ${item.id}: ${item.itemGroup}`);
      errors++;
    }
  }
  for (const id of Object.keys(prices)) {
    if (!ids.has(id)) {
      console.error(`[prices] Entry has no catalog item: ${category}/${id}`);
      errors++;
    }
  }
}

for (const [source, image] of Object.entries(IMAGE_ASSETS)) {
  validateImage(source);
  const variants = image.srcset.split(', ').map(part => part.replace(/ \d+w$/, ''));
  for (const file of new Set([image.src, ...variants])) {
    if (!existsSync(path.join(publicRoot, file))) {
      console.error(`[asset] Missing optimized image: ${file}`);
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
    return sum + ['normal', 'golden', 'diamond'].filter(v => Number.isFinite(numericValue(item.values?.[v]))).length;
  }
  return sum + (Number.isFinite(numericValue(item.value)) ? 1 : 0);
}, 0);

console.log(`Catalog OK. ${PETS.length} pets, ${CHARMS.length} charms, ${EGGS.length} eggs, ${ITEMS.length} items, ${CODES.length} codes.`);
console.log(`D1 can track ${tracked} numeric value stream(s).`);
