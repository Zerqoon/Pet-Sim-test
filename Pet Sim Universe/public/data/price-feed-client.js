import { validateFeed, priceRevision } from './price-core.js';

// Static data works on Pages without Functions. The API remains compatible
// with older deployments. Neither endpoint contains private configuration.
export async function loadPriceFeed(site, { fetcher = fetch, now = Date.now() } = {}) {
  const origin = new URL(site).origin;
  const failures = [];
  for (const pathname of ['/data/price-feed.json', '/api/price-feed']) {
    try {
      const url = new URL(pathname, origin);
      url.searchParams.set('check', String(now));
      const response = await fetcher(url.href, {
        headers: { accept: 'application/json', 'cache-control': 'no-cache' },
        cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const feed = await response.json();
      const rows = validateFeed(feed, origin);
      const revision = await priceRevision(rows);
      if (feed.revision && feed.revision !== revision) throw new Error('Price revision does not match its values.');
      const updatedAt = feed.revision && feed.updatedAt && Number.isFinite(Date.parse(feed.updatedAt))
        ? new Date(feed.updatedAt).toISOString() : null;
      if (feed.baseline) {
        const baselineRows = validateFeed(feed.baseline, origin);
        if (feed.baseline.revision !== await priceRevision(baselineRows)) throw new Error('Invalid previous price revision.');
      }
      return { feed, rows, revision, updatedAt, source: pathname };
    } catch (error) {
      failures.push(`${pathname}: ${error?.message || 'unavailable'}`);
    }
  }
  throw new Error(`Price feed unavailable. ${failures.join('; ')}`);
}
