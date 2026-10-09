const STORAGE_KEY = 'pet-universe-live-visitor-v1';
const COOKIE_NAME = 'puv_live_visitor';
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HEARTBEAT_MS = 15000;
const TIMEOUT_MS = 6000;

function readId(browser) {
  try {
    const id = browser.localStorage.getItem(STORAGE_KEY);
    if (ID_PATTERN.test(id)) return id;
  } catch {}
  try {
    const id = browser.document.cookie.split(';').map(part => part.trim())
      .find(part => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
    if (ID_PATTERN.test(id)) return id;
  } catch {}
  return null;
}

function createId(browser) {
  const id = readId(browser) || browser.crypto.randomUUID();
  // Both are shared across tabs; the cookie also handles blocked localStorage.
  try { browser.localStorage.setItem(STORAGE_KEY, id); } catch {}
  try {
    browser.document.cookie = `${COOKIE_NAME}=${id}; Path=/; SameSite=Lax; Max-Age=86400${browser.location.protocol === 'https:' ? '; Secure' : ''}`;
  } catch {}
  // If all shared storage is blocked, do not fall back to a per-tab ID.
  return readId(browser);
}

export async function sharedViewerId(browser) {
  try {
    // The lock also covers simultaneous first openings in several tabs.
    return browser.navigator.locks
      ? await browser.navigator.locks.request(STORAGE_KEY, () => createId(browser))
      : createId(browser);
  } catch { return null; }
}

export function startLiveViewers(badge, browser = globalThis.window) {
  if (!badge || !browser) return { refresh: async () => {}, destroy() {} };
  const document = browser.document;
  const countElement = badge.querySelector('[data-viewer-count]');
  const format = new Intl.NumberFormat('en-US');
  let stopped = false;
  let busy = false;
  let controller = null;
  let generation = 0;

  function unavailable() {
    badge.hidden = true;
    badge.dataset.state = 'unavailable';
    if (countElement) countElement.textContent = '—';
  }

  async function refresh() {
    if (stopped || busy || document.hidden || browser.navigator.onLine === false) return;
    busy = true;
    const current = ++generation;
    let timeout;
    try {
      const visitorId = await sharedViewerId(browser);
      if (!visitorId || stopped || document.hidden || current !== generation) { unavailable(); return; }
      controller = new browser.AbortController();
      timeout = browser.setTimeout(() => controller?.abort(), TIMEOUT_MS);
      const response = await browser.fetch('/api/viewers', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ visitorId }), signal: controller.signal,
      });
      if (!response.ok) throw new Error('Viewer count unavailable');
      const result = await response.json();
      if (stopped || document.hidden || current !== generation) return;
      if (result.available !== true || !Number.isSafeInteger(result.count) || result.count < 1) throw new Error('Invalid viewer count');
      countElement.textContent = format.format(result.count);
      badge.dataset.state = 'online';
      badge.hidden = false;
    } catch { if (current === generation) unavailable(); }
    finally {
      browser.clearTimeout(timeout); controller = null; busy = false;
      // A quick tab switch can finish the old, aborted request after pageshow.
      if (current !== generation && !stopped && !document.hidden && browser.navigator.onLine !== false) refresh();
    }
  }

  function pause() {
    generation++;
    controller?.abort();
    unavailable();
  }
  function visibility() { if (document.hidden) pause(); else refresh(); }
  function online() { refresh(); }
  function storage(event) { if (event.key === STORAGE_KEY && !document.hidden) refresh(); }
  document.addEventListener('visibilitychange', visibility);
  browser.addEventListener('pageshow', online);
  browser.addEventListener('pagehide', pause);
  browser.addEventListener('online', online);
  browser.addEventListener('offline', pause);
  browser.addEventListener('storage', storage);
  const interval = browser.setInterval(refresh, HEARTBEAT_MS);
  unavailable();
  const ready = refresh();
  return { refresh, ready, destroy() {
    stopped = true;
    pause();
    browser.clearInterval(interval);
    document.removeEventListener('visibilitychange', visibility);
    browser.removeEventListener('pageshow', online);
    browser.removeEventListener('pagehide', pause);
    browser.removeEventListener('online', online);
    browser.removeEventListener('offline', pause);
    browser.removeEventListener('storage', storage);
  } };
}
