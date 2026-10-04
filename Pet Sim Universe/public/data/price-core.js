const UNITS = { K: 1e3, M: 1e6, B: 1e9, T: 1e12, QA: 1e15, QI: 1e18, SX: 1e21, SP: 1e24, OC: 1e27 };
const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 9 });

// Compare values, not spelling: 30000, "30K" and "30k" are the same price.
export function normalizePrice(value) {
  if (value == null || (typeof value === 'string' && /^(?:no\s*price|unpriced|unknown|\?+|n\/?a|[-—]|)$/i.test(value.trim()))) {
    return { key: 'unpriced', number: null, label: 'No Price' };
  }
  if (typeof value === 'string' && /^(?:o\s*\/\s*c|oc)$/i.test(value.trim())) {
    return { key: 'oc', number: null, label: 'O/C' };
  }
  let number = value;
  if (typeof value === 'string') {
    let text = value.trim();
    if (text.length > 64) throw new Error('Price is too long.');
    if (/^[1-9]\d{0,2}(?:,\d{3})+(?:\.\d+)?(?:\s*[A-Za-z]+)?$/.test(text)) text = text.replace(/,/g, '');
    else if (/^\d+,\d+(?:\s*[A-Za-z]+)?$/.test(text)) text = text.replace(',', '.');
    const match = text.match(/^(\d+(?:\.\d+)?|\.\d+)\s*(K|M|B|T|QA|QI|SX|SP|OC)?$/i);
    if (!match) throw new Error('Invalid price in feed.');
    number = Number(match[1]) * (UNITS[(match[2] || '').toUpperCase()] || 1);
  }
  if (typeof number !== 'number' || !Number.isFinite(number) || number < 0) throw new Error('Invalid numeric price in feed.');
  const unit = Object.entries(UNITS).reverse().find(([, multiplier]) => number >= multiplier);
  const label = unit ? `${decimal.format(number / unit[1])}${unit[0]}` : decimal.format(number);
  return { key: `number:${number}`, number, label };
}

export function catalogPriceRows(catalogs) {
  return Object.entries(catalogs).flatMap(([category, items]) => items.flatMap(item => {
    const variants = item.supportsVariants ? ['normal', 'golden', 'diamond'] : ['normal'];
    return variants.map(variant => ({
      key: `${category}/${item.id}/${variant}`, category, id: item.id, name: item.name,
      rarity: item.rarity || 'Basic', variant,
      value: (item.supportsVariants ? item.values?.[variant] : item.value) ?? null,
      image: (item.supportsVariants ? item.variantImages?.[variant] || item.variantImages?.normal : item.image) || null,
    }));
  }));
}

export async function priceRevision(rows) {
  const values = rows.map(row => [row.key, normalizePrice(row.value).key]).sort(([a], [b]) => a.localeCompare(b));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(values)));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function validateFeed(feed, siteUrl) {
  if (feed?.version !== 1 || !Array.isArray(feed.rows) || !feed.rows.length || feed.rows.length > 1000) throw new Error('Invalid price feed.');
  const origin = new URL(siteUrl).origin;
  const keys = new Set();
  return feed.rows.map(row => {
    if (!['pets', 'charms', 'eggs', 'items'].includes(row.category) || !/^[a-z0-9-]{1,100}$/.test(row.id) || !['normal', 'golden', 'diamond'].includes(row.variant)) throw new Error('Invalid feed item.');
    const key = `${row.category}/${row.id}/${row.variant}`;
    if (row.key !== key || keys.has(key) || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 180) throw new Error('Invalid feed key or name.');
    keys.add(key);
    let image = null;
    if (row.image) {
      const url = new URL(row.image, origin + '/');
      if (url.origin !== origin || !url.pathname.startsWith('/assets/') || !/\.(?:png|webp|jpe?g)$/i.test(url.pathname)) throw new Error('Invalid feed image.');
      image = url.href;
    }
    return { ...row, key, image, price: normalizePrice(row.value) };
  });
}

// A timestamp is usable only for these exact normalized prices.
export function selectPriceUpdate(revision, metadata, now = Date.now()) {
  if (metadata?.revision !== revision || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(metadata.updatedAt) || !Number.isFinite(Date.parse(metadata.updatedAt)) || Date.parse(metadata.updatedAt) > now + 300000) return null;
  return { ...metadata, updatedAt: new Date(metadata.updatedAt).toISOString() };
}

export function formatPriceAge(updatedAt, now = Date.now()) {
  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp)) return 'Not recorded yet';
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return seconds ? `${seconds}s ago` : 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Require a complete snapshot before mutating shared catalog objects. Calculator
// selections remain intact and continue referring to the same items.
export function applyFeedPrices(catalogs, rows) {
  const expected = catalogPriceRows(catalogs);
  const incoming = new Map(rows.map(row => [row.key, row]));
  if (incoming.size !== rows.length || expected.length !== rows.length || expected.some(row => !incoming.has(row.key))) {
    throw new Error('Catalog changed. Reload the page to load its new items.');
  }
  for (const row of rows) normalizePrice(row.value);
  let changed = false;
  for (const [category, items] of Object.entries(catalogs)) {
    for (const item of items) {
      for (const variant of item.supportsVariants ? ['normal', 'golden', 'diamond'] : ['normal']) {
        const value = incoming.get(`${category}/${item.id}/${variant}`).value ?? null;
        const old = item.supportsVariants ? item.values?.[variant] : item.value;
        changed ||= normalizePrice(old).key !== normalizePrice(value).key;
        if (item.supportsVariants) { item.values ||= {}; item.values[variant] = value; }
        else item.value = value;
      }
    }
  }
  return changed;
}
