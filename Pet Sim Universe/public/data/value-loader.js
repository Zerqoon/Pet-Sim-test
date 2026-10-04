import { catalogPriceRows, normalizePrice, priceRevision, selectPriceUpdate, validateFeed } from './price-core.js';

// Read only object literals; never execute JavaScript fetched from the site.
// This accepts the existing prices.js format, including comments and commas.
export function readDataModule(source, exportName) {
  if (typeof source !== 'string' || source.length > 200000) throw new Error('Invalid data file.');
  let offset = 0;
  const fail = () => { throw new Error(`Invalid ${exportName} data near character ${offset}.`); };
  function skip() {
    while (offset < source.length) {
      if (/\s/.test(source[offset])) { offset++; continue; }
      if (source.startsWith('//', offset)) { offset = source.indexOf('\n', offset); if (offset < 0) offset = source.length; continue; }
      if (source.startsWith('/*', offset)) { const end = source.indexOf('*/', offset + 2); if (end < 0) fail(); offset = end + 2; continue; }
      break;
    }
  }
  function string() {
    const quote = source[offset++];
    let output = '';
    while (offset < source.length) {
      let char = source[offset++];
      if (char === quote) return output;
      if (char === '\n' || char === '\r') fail();
      if (char === '\\') {
        char = source[offset++];
        if (char === 'u' || char === 'x') {
          const length = char === 'u' ? 4 : 2;
          const hex = source.slice(offset, offset + length);
          if (!new RegExp(`^[a-f0-9]{${length}}$`, 'i').test(hex)) fail();
          output += String.fromCharCode(parseInt(hex, 16)); offset += length; continue;
        }
        const escapes = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0' };
        if (!(char in escapes) && !['\\', '"', "'", '/'].includes(char)) fail();
        output += escapes[char] ?? char;
      } else output += char;
    }
    fail();
  }
  function value(depth = 0) {
    if (depth > 6) fail();
    skip();
    if (source[offset] === '"' || source[offset] === "'") return string();
    if (source[offset] === '{') {
      offset++; const object = Object.create(null); skip();
      while (source[offset] !== '}') {
        let key;
        if (source[offset] === '"' || source[offset] === "'") key = string();
        else { const match = source.slice(offset).match(/^[A-Za-z_$][\w$]*/); if (!match) fail(); key = match[0]; offset += key.length; }
        if (Object.hasOwn(object, key) || ['__proto__', 'constructor', 'prototype'].includes(key)) fail();
        skip(); if (source[offset++] !== ':') fail();
        object[key] = value(depth + 1); skip();
        if (source[offset] === '}') break;
        if (source[offset++] !== ',') fail();
        skip();
      }
      offset++; return object;
    }
    const match = source.slice(offset).match(/^(?:null|true|false|-?(?:(?:0|[1-9]\d*)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/);
    if (!match) fail(); offset += match[0].length;
    if (match[0] === 'null') return null;
    if (match[0] === 'true') return true;
    if (match[0] === 'false') return false;
    const number = Number(match[0]); if (!Number.isFinite(number)) fail(); return number;
  }
  skip();
  const declaration = `export const ${exportName}`;
  if (!source.startsWith(declaration, offset)) fail(); offset += declaration.length;
  skip(); if (source[offset++] !== '=') fail();
  const result = value(); skip();
  if (source[offset] === ';') { offset++; skip(); }
  if (offset !== source.length) fail();
  return result;
}

export function rowsFromPrices(catalogs, prices) {
  const categories = ['pets', 'charms', 'eggs', 'items'];
  if (!prices || Object.keys(prices).some(key => !categories.includes(key))) throw new Error('Invalid price categories.');
  for (const category of categories) {
    const table = prices[category];
    if (!table || typeof table !== 'object' || Array.isArray(table)) throw new Error(`Missing prices: ${category}.`);
    const items = catalogs[category] || [];
    const ids = new Set(items.map(item => item.id));
    if (Object.keys(table).some(id => !ids.has(id)) || items.some(item => !Object.hasOwn(table, item.id))) throw new Error(`Catalog changed: ${category}. Update the project/monitor.`);
    for (const item of items) {
      const price = table[item.id];
      if (item.supportsVariants) {
        if (!price || typeof price !== 'object' || Object.keys(price).some(key => !['normal', 'golden', 'diamond'].includes(key))) throw new Error(`Invalid price variants: ${category}/${item.id}.`);
        for (const variant of ['normal', 'golden', 'diamond']) {
          if (!Object.hasOwn(price, variant)) throw new Error(`Missing price variant: ${category}/${item.id}/${variant}.`);
          try { normalizePrice(price[variant]); } catch { throw new Error(`Invalid price: ${category}/${item.id}/${variant}.`); }
        }
      } else { try { normalizePrice(price); } catch { throw new Error(`Invalid price: ${category}/${item.id}.`); } }
    }
  }
  return catalogPriceRows(catalogs).map(row => ({ ...row,
    value: (catalogs[row.category].find(item => item.id === row.id).supportsVariants
      ? prices[row.category][row.id][row.variant] : prices[row.category][row.id]) ?? null,
  }));
}

export async function loadCurrentPrices(site, { catalogs, fetcher = fetch, now = Date.now(), monitorUrl } = {}) {
  if (!catalogs) throw new Error('Catalog metadata is missing.');
  const origin = new URL(site).origin;
  const get = async filename => {
    const url = new URL(`/data/${filename}`, origin); url.searchParams.set('check', String(now));
    const response = await fetcher(url.href, { headers: { accept: 'text/javascript', 'cache-control': 'no-cache' },
      cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(filename === 'prices.js' ? 12000 : 3000) });
    if (!response.ok) throw new Error(`${filename}: HTTP ${response.status}.`);
    return boundedText(response);
  };
  const prices = readDataModule(await get('prices.js'), 'PRICES');
  const rows = validateFeed({ version: 1, rows: rowsFromPrices(catalogs, prices) }, origin);
  const revision = await priceRevision(rows);
  let update = null;
  try { update = selectPriceUpdate(revision, readDataModule(await get('price-updates.js'), 'PRICE_UPDATE'), now); }
  catch { /* Missing metadata never blocks fresh prices or supplies a stale date. */ }
  if (!update && monitorUrl) update = await loadMonitorUpdate(revision, { monitorUrl, fetcher, now });
  return { rows, revision, updatedAt: update?.updatedAt || null, dateSource: update?.source || null, source: '/data/prices.js' };
}

export async function boundedText(response, limit = 200000) {
  if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new Error('Data file is too large.'); }
  const reader = response.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0, text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('Data file is too large.');
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
}
export async function loadMonitorUpdate(revision, { monitorUrl, fetcher = fetch, now = Date.now() }) {
  try {
    const url = new URL('/status', monitorUrl);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.workers.dev') || url.username || url.password || url.port) return null;
    url.searchParams.set('revision', revision); url.searchParams.set('check', String(now));
    const response = await fetcher(url.href, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(4000) });
    if (!response.ok) return null;
    const result = JSON.parse(await boundedText(response, 10000));
    return result.version === 116 ? selectPriceUpdate(revision, result.update, now) : null;
  } catch { return null; }
}
