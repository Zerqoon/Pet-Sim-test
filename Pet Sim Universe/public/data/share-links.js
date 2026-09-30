// Links carry item IDs, variants and quantities. Prices always come from prices.js.
const categories = ['pets', 'charms', 'eggs', 'items'];
const variants = ['normal', 'golden', 'diamond'];
const maxEntries = 200;
function number(value, limit) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= limit;
}
export function sanitizeTrade(input, catalogs) {
  if (!input || input.v !== 1) throw new Error('Unsupported trade link.');
  const result = { left: [], right: [], leftTickets: 0, rightTickets: 0 };
  for (const side of ['left', 'right']) {
    if (!Array.isArray(input[side]) || input[side].length > maxEntries) throw new Error('Invalid offer.');
    const seen = new Set();
    for (const entry of input[side]) {
      if (!entry || !categories.includes(entry.category) || !variants.includes(entry.variant) || !Number.isInteger(entry.qty) || entry.qty < 1 || entry.qty > 10000) throw new Error('Invalid trade item.');
      const item = catalogs[entry.category]?.find(item => item.id === entry.id);
      if (!item || (entry.variant !== 'normal' && (!item.supportsVariants || !item.variantImages?.[entry.variant]))) throw new Error('Item or variant unavailable.');
      const key = `${entry.category}/${entry.id}/${entry.variant}`;
      if (seen.has(key)) throw new Error('Duplicate trade item.');
      seen.add(key);
      result[side].push({ category: entry.category, id: item.id, variant: entry.variant, qty: entry.qty });
    }
    const tickets = input[`${side}Tickets`];
    if (!number(tickets, 1e15)) throw new Error('Invalid ticket amount.');
    result[`${side}Tickets`] = tickets;
  }
  return result;
}
export function tradeHash(trade, catalogs) {
  const data = sanitizeTrade({ ...trade, v: 1 }, catalogs);
  return '#trade=' + encodeURIComponent(JSON.stringify({ v: 1, ...data }));
}
export function itemHash(category, id, variant = 'normal') {
  return '#' + new URLSearchParams({ pet: id, category, variant }).toString();
}
export function readSharedRoute(hash, catalogs) {
  if (!hash || hash === '#') return null;
  if (hash.length > 100000) throw new Error('Link is too long.');
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (params.has('trade')) return { type: 'trade', trade: sanitizeTrade(JSON.parse(params.get('trade')), catalogs) };
  if (params.has('pet')) {
    const category = params.get('category') || 'pets';
    const variant = params.get('variant') || 'normal';
    if (!Object.prototype.hasOwnProperty.call(catalogs, category) || !variants.includes(variant)) throw new Error('Invalid item link.');
    const item = catalogs[category].find(item => item.id === params.get('pet'));
    if (!item || (variant !== 'normal' && (!item.supportsVariants || !item.variantImages?.[variant]))) throw new Error('Item or variant unavailable.');
    return { type: 'item', category, variant, item };
  }
  return null;
}
