import { PETS, CHARMS, EGGS, ITEMS, CODES, RARITY_ORDER } from '../public/data/catalog.js';
import { IMAGE_ASSETS } from '../public/data/image-assets.js';
import { existsSync } from 'node:fs';
import path from 'node:path';
const publicRoot = path.resolve(import.meta.dirname, '../public');

const catalogs = { PETS, CHARMS, EGGS, ITEMS, CODES };
const allowedValue = value => value == null || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
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
