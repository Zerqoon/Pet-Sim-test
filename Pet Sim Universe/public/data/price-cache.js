import { validateFeed, priceRevision, selectPriceUpdate, catalogPriceRows } from './price-core.js';
const KEY = 'pet-universe-prices-v116';
export async function readPriceCache(catalogs, site, storage = undefined, now = Date.now()) {
  try {
    storage ||= globalThis.localStorage;
    const text = storage.getItem(KEY);
    if (!text || text.length > 200000) return null;
    const data = JSON.parse(text);
    if (data.version !== 1 || !Number.isFinite(data.savedAt) || data.savedAt > now+300000 || data.savedAt < now-7*86400000) return null;
    const rows = validateFeed({ version:1, rows:data.rows }, site);
    const expected = catalogPriceRows(catalogs);
    const keys = new Set(rows.map(row => row.key));
    if (expected.length !== rows.length || expected.some(row => !keys.has(row.key))) return null;
    const revision = await priceRevision(rows);
    if (revision !== data.revision) return null;
    const update = selectPriceUpdate(revision,{ revision, updatedAt:data.updatedAt },now);
    return { rows, revision, updatedAt:update?.updatedAt || null, dateSource:data.dateSource === 'detected' ? 'detected' : 'author' };
  } catch { return null; }
}
export function savePriceCache(latest, storage = undefined, now = Date.now()) {
  try { storage ||= globalThis.localStorage; storage.setItem(KEY,JSON.stringify({ ...latest, version:1, savedAt:now })); return true; } catch { return false; }
}
