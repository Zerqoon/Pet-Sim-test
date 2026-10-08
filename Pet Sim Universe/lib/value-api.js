import { readCatalog, catalogGroups } from '../server/catalog-data.js';
import { readDataModule, rowsFromPrices, boundedText } from '../public/data/value-loader.js';
import { validateFeed, priceRevision, selectPriceUpdate } from '../public/data/price-core.js';

const categories = ['pets', 'charms', 'eggs', 'items'];
const variants = ['normal', 'golden', 'diamond'];
export const normalizeName = name => String(name).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

// The same safe readers and price semantics as the website. No fetched code runs.
export async function buildValueFeed(catalogSource, priceSource, metadataSource, site = 'https://api.invalid', now = Date.now()) {
  const groups = catalogGroups(readCatalog(catalogSource));
  let count = 0;
  for (const [category, entries] of Object.entries(groups)) {
    const ids = new Set();
    for (const item of entries) {
      if (!/^[a-z0-9-]{1,100}$/.test(item.id || '') || ids.has(item.id) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 180) throw new Error('Invalid API catalog.');
      if (!['Exclusive','Secret','Mythical','Legendary','Epic','Rare','Basic'].includes(item.rarity) || (item.supportsVariants && category !== 'pets')) throw new Error('Invalid API rarity or variants.');
      for (const image of [item.image, ...Object.values(item.variantImages || {})].filter(Boolean)) {
        if (typeof image !== 'string' || !/^assets\/(?:pets|charms|eggs|items)\/[^/\\<>?#%"\u0000-\u001f\u007f]+\.(?:png|webp|jpe?g)$/i.test(image) || image.includes('..')) throw new Error('Invalid API artwork.');
      }
      ids.add(item.id); count++;
    }
  }
  if (count > 1500) throw new Error('API catalog too large.');
  const sourceRows = rowsFromPrices(groups, readDataModule(priceSource, 'PRICES'));
  const rows = sourceRows.length ? validateFeed({ version: 1, rows: sourceRows }, site) : [];
  const revision = await priceRevision(rows);
  let update = null;
  try { if (metadataSource) update = selectPriceUpdate(revision, readDataModule(metadataSource, 'PRICE_UPDATE'), now); } catch { /* Unknown dates stay unknown. */ }
  const text = (value, max = 500) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
  const items = rows.map(row => {
    const card = groups[row.category].find(item => item.id === row.id);
    const image = row.image ? new URL(row.image).pathname : null;
    return {
      key: row.key, id: row.id, name: row.name, category: row.category, rarity: row.rarity,
      variant: row.variant, supportsVariants: Boolean(card.supportsVariants), image,
      value: row.price.number, display: row.price.label,
      priceStatus: row.price.number !== null ? 'priced' : row.price.key === 'oc' ? 'owner_choice' : 'unpriced',
      bestPct: Number.isFinite(card.bestPct) ? card.bestPct : null,
      eventBadge: text(card.eventBadge, 80), source: text(card.source), map: text(card.map),
      hatchChance: text(card.hatchChance, 180), exists: Number.isSafeInteger(card.exists) && card.exists >= 0 ? card.exists : null,
      dropSources: Array.isArray(card.dropSources) ? card.dropSources.map(source => text(source.name, 180)).filter(Boolean).slice(0, 12) : [],
    };
  });
  return { ok: true, apiVersion: 1, revision, updatedAt: update?.updatedAt || null, dateSource: update?.source || null,
    source: '/data/prices.js', total: items.length, items };
}

export function searchValues(feed, query = '', category = '') {
  const normalized = normalizeName(query);
  const cards = feed.items.filter(item => item.variant === 'normal' && (!category || item.category === category));
  const rank = item => [item.name, item.id].map(normalizeName).reduce((best, name) => Math.min(best,
    !normalized ? 3 : name === normalized ? 0 : name.startsWith(normalized) ? 1 : name.includes(normalized) ? 2 : 9), 9);
  return cards.filter(item => rank(item) < 9).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)).slice(0, 25)
    .map(({ id, name, category, rarity, supportsVariants }) => ({ id, name, category, rarity, supportsVariants }));
}

export async function loadValueFeed(context) {
  const origin = new URL(context.request.url).origin;
  const fetcher = context.fetcher || (context.env?.ASSETS ? (url, options) => context.env.ASSETS.fetch(new Request(url, options)) : fetch);
  for (let attempt = 0; attempt < 2; attempt++) {
    const read = async filename => {
      const url = new URL(`/data/${filename}.js`, origin);
      const response = await fetcher(url.href, { cache: 'no-store', redirect: 'manual', headers: { accept: 'text/javascript', 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error('Published API source unavailable.');
      return boundedText(response);
    };
    const [catalog, prices, metadata] = await Promise.all([read('catalog'), read('prices'), read('price-updates').catch(() => null)]);
    try { return await buildValueFeed(catalog, prices, metadata, origin); }
    catch (error) { if (attempt || !/Catalog changed|Missing price/.test(error.message)) throw error; }
  }
}

export async function handleValueApi(context, mode = 'values') {
  const { request } = context;
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
    'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, HEAD, OPTIONS', 'x-content-type-options': 'nosniff' };
  const json = (data, status = 200, extra = {}) => new Response(request.method === 'HEAD' ? null : JSON.stringify(data), { status, headers: { ...headers, ...extra } });
  const error = (code, message, status = 400, extra = {}) => json({ ok: false, apiVersion: 1, error: { code, message, ...extra } }, status);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (!['GET','HEAD'].includes(request.method)) return json({ ok: false, apiVersion: 1, error: { code: 'method_not_allowed', message: 'Use GET.' } }, 405, { allow: 'GET, HEAD, OPTIONS' });
  const url = new URL(request.url), params = url.searchParams;
  if (url.search.length > 2000 || [...params.values()].some(value => value.length > 180)) return error('invalid_query', 'Query is too long.');
  for (const key of ['name','id','variant','category','q']) if (params.getAll(key).length > 1) return error('invalid_query', `Provide ${key} once.`);
  const category = params.get('category') || '';
  const variant = params.get('variant') || 'normal';
  if (category && !categories.includes(category)) return error('invalid_category', 'Use pets, charms, eggs or items.');
  if (!variants.includes(variant)) return error('invalid_variant', 'Use normal, golden or diamond.');
  const name = params.get('name')?.trim() || '', id = params.get('id')?.trim() || '';
  if (mode === 'value' && (!name && !id || name && id)) return error('invalid_query', 'Provide either name or id.');
  if (id && !/^[a-z0-9-]{1,100}$/.test(id)) return error('invalid_id', 'Use a catalog ID.');
  try {
    const feed = await loadValueFeed(context);
    if (mode === 'search') return json({ ok: true, apiVersion: 1, items: searchValues(feed, params.get('q') || '', category) });
    if (mode === 'value') {
      const matches = feed.items.filter(item => item.variant === 'normal' && (!category || item.category === category)
        && (id ? item.id === id : normalizeName(item.name) === normalizeName(name) || normalizeName(item.id) === normalizeName(name)));
      if (!matches.length) return error('not_found', 'No matching card. Select a search result.', 404, { suggestions: searchValues(feed, name || id, category) });
      if (matches.length > 1) return error('ambiguous_name', 'Choose a category or catalog ID.', 409, { matches: matches.map(({ id, name, category }) => ({ id, name, category })) });
      const card = matches[0];
      const item = feed.items.find(item => item.id === card.id && item.category === card.category && item.variant === variant);
      if (!item) return error('variant_unavailable', 'This card only has a Normal variant.', 422);
      return json({ ok: true, apiVersion: 1, revision: feed.revision, updatedAt: feed.updatedAt, dateSource: feed.dateSource,
        item: { ...item, image: item.image ? new URL(item.image, url.origin).href : null } });
    }
    const query = normalizeName(params.get('q') || '');
    const items = feed.items.filter(item => (!category || item.category === category) && (!query || normalizeName(item.name).includes(query) || normalizeName(item.id).includes(query)));
    return json({ ...feed, total: items.length, items });
  } catch { return json({ ok: false, apiVersion: 1, error: { code: 'source_unavailable', message: 'Published values are temporarily unavailable. Retry shortly.' } }, 503, { 'retry-after': '15' }); }
}
