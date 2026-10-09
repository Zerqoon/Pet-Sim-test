import { readPriceCache, savePriceCache } from './data/price-cache.js';
import { renderTradePage, tradePageCount, tradeSummary } from './data/trade-export.js';
import { calculateOffer, sanitizeTickets, MAX_QUANTITY } from './data/trade-math.js';
import { PETS, CHARMS, EGGS, ITEMS, CODES, RARITY_ORDER } from './data/catalog.js';
import { IMAGE_ASSETS } from './data/image-assets.js';
import { MONITOR } from './data/monitor-settings.js';
import { normalizePrice, selectPriceUpdate, formatPriceAge, applyFeedPrices } from './data/price-core.js';
import { loadCurrentPrices } from './data/value-loader.js';
import { enablePublicProtection } from './data/public-protection.js';
import { startLiveViewers } from './data/live-viewers.js';

enablePublicProtection();

const priceCatalogs = { pets: PETS, charms: CHARMS, eggs: EGGS, items: ITEMS };
let currentPriceRevision = null;
let currentPriceUpdate = null;
let priceSyncBusy = false;
let pricesReady = false;
let priceCacheRead = false;
let priceSyncError = false;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const ticket = 'assets/items/value-ticket.png';
const decimalFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
// `thumb` = 400 px WebP for cards, picker and trade tiles (≈7x lighter than the full art).
function imageSource(source, thumb = false) { const asset = IMAGE_ASSETS[source]; return (thumb && asset?.thumb) || asset?.src || source; }
function imageAttributes(source, { sizes = '', eager = false, thumb = false } = {}) {
  const asset = IMAGE_ASSETS[source];
  const responsive = asset && sizes && !(thumb && asset.thumb) ? ` srcset="${asset.srcset}" sizes="${sizes}"` : '';
  return `src="${imageSource(source, thumb)}"${responsive} decoding="async" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''} draggable="false"`;
}
function setImageSource(element, source) {
  element.removeAttribute('srcset');
  element.removeAttribute('sizes');
  element.src = imageSource(source);
  element.decoding = 'async';
}

// One render per display frame, including rapid keyboard input.
let renderFrame = 0;
let pickerFrame = 0;
function scheduleRender() {
  if (!renderFrame) renderFrame = requestAnimationFrame(() => { renderFrame = 0; render(); });
}
function schedulePickerRender() {
  if (!pickerFrame) pickerFrame = requestAnimationFrame(() => { pickerFrame = 0; renderCalcPicker(); });
}

// Restart CSS effects through their animation clock, without reading layout.
function restartEffect(element, className) {
  if (!motionAllowed()) return;
  element.classList.add(className);
  for (const animation of element.getAnimations()) {
    if (animation.effect?.getTiming().iterations !== Infinity) {
      animation.currentTime = 0;
      animation.play();
    }
  }
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function readSetting(key) { try { return localStorage.getItem(key); } catch { return null; } }
function writeSetting(key, value) { try { localStorage.setItem(key, value); } catch {} }
let animationsPaused = readSetting('pet-universe-motion') === 'off' || reducedMotion.matches;
function motionAllowed() { return !animationsPaused && !reducedMotion.matches; }
function syncMotion() {
  document.documentElement.dataset.motion = animationsPaused ? 'off' : 'on';
  const button = $('#motionToggle');
  button.textContent = animationsPaused ? 'Resume Animations' : 'Stop Animations';
  button.setAttribute('aria-label', animationsPaused ? 'Resume Animations' : 'Stop Animations');
  button.setAttribute('aria-pressed', String(animationsPaused));
  button.title = animationsPaused ? 'Resume Animations' : 'Stop Animations';
}

const rarityColors = {
  Exclusive: '#930fff',
  Secret: '#c1c1c1',
  Mythical: '#ff00ae',
  Legendary: '#ffd33f',
  Epic: '#34d8ff',
  Rare: '#7ef23a',
  Basic: '#8f98a8',
  Code: '#65d8ff',
};

const rarityPalettes = {
  Exclusive: ['#930fff', '#feddff', '#930fff', '#de22ff', '#9823ff', '#edc2ff', '#930fff'],
  Mythical: ['#ff00ae', '#ff0097', '#ff7dd2', '#ff0f3b', '#ffcfb9', '#ff8e0c', '#ffce78', '#fafbdd', '#f6fcb7', '#fff582'],
  Secret: ['#ffffff', '#c1c1c1', '#747474', '#b1b1b1', '#ffffff', '#6f6f6f', '#f1f1f1', '#a7a7a7'],
};

function paletteFor(item) {
  const rarity = typeof item === 'string' ? item : rarityFor(item);
  return rarityPalettes[rarity] || [rarityColors[rarity] || '#98a0af'];
}

function gradientFor(item, angle = 120) {
  return `linear-gradient(${angle}deg,${paletteFor(item).join(',')})`;
}
function pickerConicFor(item) {
  const colors = {
    Exclusive: '#930fff,#feddff,#de22ff,#9823ff,#edc2ff,#930fff',
    Mythical: '#ff00ae,#ff7dd2,#ff0f3b,#ff8e0c,#fff582,#ff00ae',
    Secret: '#ffffff,#c1c1c1,#747474,#ffffff,#a7a7a7,#ffffff',
  };
  return `conic-gradient(${colors[rarityFor(item)] || paletteFor(item).join(',')})`;
}

const catalogs = { pets: PETS, charms: CHARMS, eggs: EGGS, items: ITEMS, codes: CODES };
const itemGroups = { general: 'General Items', fishing: 'Fishing' };
function itemGroupFor(item) { return item.itemGroup || 'general'; }
const categoryMeta = {
  pets: ['PET COLLECTION', 'Pet Values', 'Search pets...', 'PET DETAILS'],
  charms: ['CHARM COLLECTION', 'Charm Values', 'Search charms...', 'CHARM DETAILS'],
  eggs: ['EGG COLLECTION', 'Egg Values', 'Search eggs...', 'EGG DETAILS'],
  items: ['ITEM COLLECTION', 'Item Values', 'Search items...', 'ITEM DETAILS'],
  codes: ['BONUS CODES', 'Codes', 'Search codes...', 'CODE DETAILS'],
};

const sortNames = {
  featured: 'Featured',
  name: 'Name A–Z',
  'price-desc': 'Value: high to low',
  'price-asc': 'Value: low to high',
  'best-desc': 'Best % high-low',
  'best-asc': 'Best % low-high',
  rarity: 'Rarity',
};

const state = {
  view: 'home',
  category: 'pets',
  itemGroup: 'all',
  variant: 'normal',
  query: '',
  sort: 'featured',
  modalItem: null,
  modalVariant: 'normal',
  modalRange: '24h',
  filtersOpen: false,
  calcActiveSide: 'left',
  calcPickerSide: 'left',
  calcPickerCategory: 'pets',
  calcPickerVariant: 'normal',
  calcPickerQuery: '',
  calc: { left: [], right: [], leftTickets: 0, rightTickets: 0 },
};

const smallLayout = matchMedia('(max-width: 900px)');
let tradeExportBusy = false;
let historyController = null;
let historyRequestId = 0;
let calcMotionCache = { leftTotal: null, rightTotal: null, diff: null, leftTickets: 0, rightTickets: 0, verdict: 'fair' };

const calcCategories = ['pets', 'charms', 'eggs', 'items'];

function calcFindItem(category, id) {
  return (catalogs[category] || []).find(item => item.id === id) || null;
}

function parseNumericValue(value) {
  try { return normalizePrice(value).number; } catch { return null; }
}

function calcNumericValue(item, variant = 'normal') {
  return parseNumericValue(valueFor(item, variant)) ?? 0;
}

function switchView(view) {
  if (!['home', 'values', 'calculator'].includes(view)) return;
  const changed = state.view !== view;
  state.view = view;
  render();
  if (changed) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

function focusViewHeading() {
  const heading = $('.page-view:not([hidden]) h1');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.focus();
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch (_) {
    return false;
  }
}

function currentCatalog() {
  return catalogs[state.category] || [];
}

function rarityFor(item) {
  return item.rarity || 'Basic';
}

let rarityPaintId = 0;
const rarityLetterStyles = {
  Exclusive: { width: 77, colors: ['#ffd0ff','#f599ff','#cb83ff'] },
  Mythical: { width: 73, colors: ['#ffe3a4','#ffb750','#ff789c'] },
  Legendary: { width: 89, colors: ['#ffda39','#fff3a1','#ffe94c'], horizontal: true },
  Secret: { width: 55, colors: ['#fff8ec','#ecedff','#b8a5ff'] },
  Epic: { width: 37, colors: ['#b0f8ff','#58e3ff','#1ea9ef'] },
  Rare: { width: 41, colors: ['#bcff52','#a8ff07','#8ee800'] },
  Basic: { width: 46, colors: ['#ffffff','#d4dce8','#9aa6ba'] },
  Code: { width: 44, colors: ['#c8fbff','#69dfff','#679cff'] },
};
function rarityLetterMarkup(item) {
  const rarity = rarityFor(item);
  const style = rarityLetterStyles[rarity];
  if (!style) return `<span class="rarity-text rarity-solid">${rarity}</span>`;
  return `<span class="rarity-text rarity-lettering" style="--rg:linear-gradient(${style.horizontal ? '90deg' : '180deg'},${style.colors.join(',')})">${rarity}</span>`;
}

function rarityIndex(item) {
  const index = RARITY_ORDER.indexOf(rarityFor(item));
  return index === -1 ? 999 : index;
}

function rarityColor(item) {
  return rarityColors[rarityFor(item)] || '#98a0af';
}

function raritySlug(item) {
  return rarityFor(item).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function formatValue(value) {
  try { return normalizePrice(value).label; } catch { return 'Not Price'; }
}
function priceStateFor(item, variant = state.variant) {
  if (!pricesReady) return 'loading';
  try { const price = normalizePrice(valueFor(item, variant)); return price.number != null ? 'number' : price.key; }
  catch { return 'unpriced'; }
}

function formatItemValue(item, variant = state.variant) {
  if (!pricesReady) return priceSyncError ? 'Unavailable' : 'Loading…';
  const value = valueFor(item, variant);
  // Labels always come from the live price, including Not Price and O/C.
  return formatValue(value);
}

function formatChartValue(value) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1).replace(/\.0$/, '')}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K`;
  return decimalFormat.format(value);
}

function formatSignedValue(value) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '-'}${formatChartValue(Math.abs(value))}`;
}

function refreshHomeUpdated() {
  const el = $('#homeUpdated');
  if (!el) return;
  el.dataset.state = priceSyncError ? 'error' : !pricesReady ? 'loading' : currentPriceUpdate?.updatedAt ? 'ready' : 'unrecorded';
  const saved = priceSyncError && pricesReady ? 'Saved values · ' : '';
  el.textContent = currentPriceUpdate?.updatedAt
    ? `${saved}${currentPriceUpdate.source === 'detected' ? 'Change detected' : 'Values updated'} ${formatPriceAge(currentPriceUpdate.updatedAt)}`
    : priceSyncError ? (pricesReady ? 'Saved values · Update time unavailable' : 'Prices unavailable')
    : pricesReady ? 'Update time unavailable' : 'Loading values…';
}

const priceUpdateDateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Warsaw', day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZoneName: 'short',
});

function refreshPricesUpdated() {
  refreshHomeUpdated();
  const label = $('#valuesUpdated');
  const badge = $('#collectionUpdated');
  const date = currentPriceUpdate?.updatedAt ? new Date(currentPriceUpdate.updatedAt) : null;
  const known = date && Number.isFinite(date.getTime());
  const detected = currentPriceUpdate?.source === 'detected';
  const age = known ? formatPriceAge(date.toISOString()) : priceSyncError
    ? (pricesReady ? 'Connection unavailable' : 'Prices unavailable')
    : pricesReady ? 'Update time unavailable' : 'Loading values…';
  label.hidden = state.view !== 'values' || state.category === 'codes';
  label.dataset.recorded = String(Boolean(known));
  $('#valuesUpdatedHeading').textContent = priceSyncError && pricesReady ? 'SAVED VALUES' : detected ? 'CHANGE DETECTED' : 'VALUES UPDATED';
  $('#valuesUpdatedRelative').textContent = age;
  badge.hidden = state.category === 'codes';
  badge.dataset.state = priceSyncError ? 'error' : pricesReady ? 'ready' : 'loading';
  $('#collectionUpdatedText').textContent = known
    ? `${priceSyncError ? 'Saved values · ' : ''}${detected ? 'Change detected' : 'Last updated'} ${age}` : age;
  for (const time of [$('#valuesUpdatedTime'), $('#collectionUpdatedTime')]) {
    time.hidden = !known;
    if (known) { time.dateTime = date.toISOString(); time.textContent = priceUpdateDateFormat.format(date); }
    else { time.textContent = ''; time.removeAttribute('datetime'); }
  }
  const title = known ? `${detected ? 'Change detected' : 'Last price update'}: ${priceUpdateDateFormat.format(date)} (Europe/Warsaw)${priceSyncError ? ' — saved values, connection unavailable' : ''}` : '';
  label.title = title; badge.title = title; $('#homeUpdated').title = title;
}

function refreshPriceViews() {
      for (const [key, view] of catalogViews) {
        const [category, variant] = key.split(':');
        for (const [id, node] of view.cards) {
          const item = priceCatalogs[category]?.find(item => item.id === id);
          const value = $('.set-value strong', node);
          if (item && value) { value.textContent = formatItemValue(item, variant); node.dataset.priceState = priceStateFor(item, variant); }
        }
      }
      catalogRenderSignature = '';
      // These views also cache DOM nodes. Rebuild their value labels while
      // preserving the actual offers, quantities and selected variants.
      pickerCards.clear();
      for (const side of ['left', 'right']) {
        calcNodes[side].clear();
        calcListSignatures[side] = null;
      }
      render();
      if ($('#calcPickerModal').open) renderCalcPicker();
      if ($('#detailModal').open) renderModalVariant();
}

async function syncPublishedPrices() {
  if (priceSyncBusy) return;
  priceSyncBusy = true;
  try {
    if (!priceCacheRead) {
      priceCacheRead = true;
      const cached = await readPriceCache(priceCatalogs,location.origin);
      if (cached) {
        applyFeedPrices(priceCatalogs,cached.rows);
        currentPriceRevision = cached.revision;
        currentPriceUpdate = selectPriceUpdate(cached.revision,{ revision:cached.revision, updatedAt:cached.updatedAt, source:cached.dateSource });
        pricesReady = true; refreshPriceViews(); refreshPricesUpdated();
      }
    }
    const latest = await loadCurrentPrices(location.origin, { catalogs: priceCatalogs, monitorUrl: MONITOR.url });
    const initial = !pricesReady || priceSyncError;
    pricesReady = true;
    priceSyncError = false;
    const changed = applyFeedPrices(priceCatalogs, latest.rows);
    const sameRevision = currentPriceRevision === latest.revision;
    currentPriceRevision = latest.revision;
    currentPriceUpdate = selectPriceUpdate(latest.revision, { revision: latest.revision, updatedAt: latest.updatedAt, source: latest.dateSource })
      || (sameRevision ? currentPriceUpdate : null);
    savePriceCache({ ...latest, updatedAt:currentPriceUpdate?.updatedAt || null, dateSource:currentPriceUpdate?.source });
    if (changed || initial) {
      refreshPriceViews();
    }
  } catch {
    priceSyncError = true;
    refreshPriceViews();
    // Keep the last verified prices and time during a temporary outage.
  } finally {
    priceSyncBusy = false;
    refreshPricesUpdated();
  }
}

function fallbackHistoryPoint(item, variant = state.modalVariant) {
  const value = parseNumericValue(valueFor(item, variant));
  return Number.isFinite(value) ? [{ timestamp: Date.now(), value }] : [];
}

function normalizeHistoryPoints(points = []) {
  if (!Array.isArray(points)) return [];
  return points.slice(-10000)
    .filter(point => point && point.value != null && (point.timestamp ?? point.captured_at) != null)
    .map(point => ({ timestamp: Number(point.timestamp ?? point.captured_at), value: Number(point.value) }))
    .filter(point => Number.isFinite(point.timestamp) && Number.isFinite(point.value) && point.value >= 0)
    .sort((a, b) => a.timestamp - b.timestamp);
}

function setHistoryStatus(text, mode = 'neutral') {
  const status = $('#historyStatus');
  status.textContent = text;
  status.className = `history-status is-${mode}`;
}

function renderHistoryStats(points, currentValue) {
  const values = points.map(point => point.value).filter(Number.isFinite);
  const latest = Number.isFinite(currentValue) ? currentValue : (values.length ? values.at(-1) : null);
  const previousEl = $('#historyPrevious');
  const changeEl = $('#historyChange');
  const amountEl = $('#historyChangeAmount');

  $('#historyCurrent').textContent = Number.isFinite(latest) ? formatChartValue(latest) : '—';
  $('#historyCurrentMeta').textContent = Number.isFinite(latest) ? 'Current catalog value' : 'Numeric value not set';
  $('#historyHigh').textContent = values.length ? formatChartValue(Math.max(...values)) : '—';
  $('#historyLow').textContent = values.length ? formatChartValue(Math.min(...values)) : '—';

  changeEl.className = 'is-neutral';
  amountEl.className = 'is-neutral';

  $('#modalHistoryArea').dataset.hasTrend = String(values.length >= 2);
  if (values.length < 2) {
    if (previousEl) previousEl.textContent = '—';
    changeEl.textContent = '—';
    amountEl.textContent = '—';
    return;
  }

  const previous = values.at(-2);
  const last = values.at(-1);
  const amount = last - previous;
  const pct = previous !== 0 ? (amount / Math.abs(previous)) * 100 : null;
  const trendClass = amount > 0 ? 'is-up' : amount < 0 ? 'is-down' : 'is-neutral';
  const trendArrow = amount > 0 ? '▲' : amount < 0 ? '▼' : '•';

  if (previousEl) previousEl.textContent = formatChartValue(previous);
  changeEl.className = trendClass;
  changeEl.textContent = pct == null ? '—' : `${trendArrow} ${pct > 0 ? '+' : ''}${pct.toFixed(Math.abs(pct) >= 100 ? 0 : 1)}%`;
  amountEl.className = trendClass;
  amountEl.textContent = amount === 0 ? '0' : formatSignedValue(amount);
}

function updateHistoryTimestamp(points) {
  const label = $('#historyLastUpdated');
  const last = points.at(-1);
  if (!last) {
    label.textContent = 'No snapshots yet';
    return;
  }
  const date = new Date(last.timestamp);
  label.textContent = `Last snapshot ${new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)}`;
}

async function loadValueHistory() {
  const item = state.modalItem;
  if (!item || state.category === 'codes') return;

  const historyArea = $('#modalHistoryArea');
  historyController?.abort();
  const requestId = ++historyRequestId;
  const currentValue = parseNumericValue(valueFor(item, state.modalVariant));
  historyArea.hidden = !pricesReady || currentValue == null;
  if (historyArea.hidden) return;
  const fallback = fallbackHistoryPoint(item, state.modalVariant);
  renderHistoryStats(fallback, currentValue);
  updateHistoryTimestamp(fallback);
  $('#historyHint').textContent = 'Connecting to value history…';
  setHistoryStatus('Loading', 'loading');

  const controller = new AbortController();
  historyController = controller;
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const params = new URLSearchParams({
      category: state.category,
      id: item.id,
      variant: state.modalVariant,
      range: state.modalRange,
    });
    const response = await fetch(`/api/history?${params}`, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`History API ${response.status}`);
    const payload = await response.json();
    if (requestId !== historyRequestId || state.modalItem?.id !== item.id) return;

    const points = normalizeHistoryPoints(payload.points);
    const usablePoints = points.length ? points : fallback;
    const apiCurrent = Number.isFinite(payload.current) ? payload.current : currentValue;
    renderHistoryStats(usablePoints, apiCurrent);
    updateHistoryTimestamp(usablePoints);

    if (payload.available === false) {
      setHistoryStatus('History unavailable', 'offline');
      $('#historyHint').textContent = 'The current listed value is shown above. Price history is not available yet.';
    } else if (!Number.isFinite(apiCurrent)) {
      setHistoryStatus(valueFor(item, state.modalVariant) === 'O/C' ? 'Owner’s Choice' : 'Not Price', 'offline');
      $('#historyHint').textContent = 'This item has no fixed numeric price. Agree on its value with the owner.';
    } else if (points.length <= 1) {
      setHistoryStatus('No previous price changes', 'neutral');
      $('#historyHint').textContent = 'One price record is available. A trend appears once another price is recorded.';
    } else {
      const trendDelta = points.at(-1).value - points.at(-2).value;
      const trendMode = trendDelta > 0 ? 'up' : trendDelta < 0 ? 'down' : 'live';
      const trendLabel = trendDelta > 0 ? '▲ Rising' : trendDelta < 0 ? '▼ Falling' : `${points.length} snapshots`;
      setHistoryStatus(trendLabel, trendMode);
      $('#historyHint').textContent = `Price movement over ${state.modalRange.toUpperCase()}. Change compares the two latest records.`;
    }
  } catch (error) {
    if (requestId !== historyRequestId || !$('#detailModal').open) return;
    setHistoryStatus('History unavailable', 'offline');
    $('#historyHint').textContent = 'The current listed value is shown above. Price history could not be loaded.';
  } finally { clearTimeout(timeout); }
}


function supportsVariant(item, variant) {
  if (variant === 'normal') return true;
  return Boolean(item.supportsVariants && item.variantImages?.[variant]);
}

function imageFor(item, variant = state.variant) {
  if (item.id === 'pop-cat') return 'assets/pets/pop-cat-normal-v30.png';
  if (item.supportsVariants) return item.variantImages?.[variant] || item.variantImages?.normal || null;
  return item.image || null;
}

function valueFor(item, variant = state.variant) {
  if (!item) return null;
  if (item.supportsVariants) {
    if (item.values && Object.prototype.hasOwnProperty.call(item.values, variant)) return item.values[variant];
    return item.values?.normal ?? null;
  }
  return item.value ?? null;
}

function isAnimated(item) {
  return item.id === 'pop-cat';
}

function filtered() {
  let list = [...currentCatalog()];
  const query = state.query.trim().toLowerCase();

  if (state.category === 'pets' && state.variant !== 'normal') {
    list = list.filter(item => supportsVariant(item, state.variant));
  }

  if (state.category === 'items' && state.itemGroup !== 'all') {
    list = list.filter(item => itemGroupFor(item) === state.itemGroup);
  }

  if (query) {
    list = list.filter(item => [
      item.name,
      item.rarity,
      item.source,
      item.description,
      item.note,
      item.map,
      item.hatchChance,
      state.category === 'items' ? itemGroups[itemGroupFor(item)] : '',
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }

  if (state.sort === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (state.sort === 'price-desc' || state.sort === 'price-asc') {
    const direction = state.sort === 'price-desc' ? -1 : 1;
    list.sort((a, b) => {
      const first = parseNumericValue(valueFor(a));
      const second = parseNumericValue(valueFor(b));
      if (first == null || second == null) return first == null && second == null ? a.name.localeCompare(b.name) : first == null ? 1 : -1;
      return (first - second) * direction || a.name.localeCompare(b.name);
    });
  } else if (state.sort === 'best-desc') {
    list.sort((a, b) => (b.bestPct ?? -1) - (a.bestPct ?? -1) || rarityIndex(a) - rarityIndex(b));
  } else if (state.sort === 'best-asc') {
    list.sort((a, b) => (a.bestPct ?? 999) - (b.bestPct ?? 999) || rarityIndex(a) - rarityIndex(b));
  } else if (state.sort === 'rarity') {
    list.sort((a, b) => rarityIndex(a) - rarityIndex(b) || a.name.localeCompare(b.name));
  } else if (state.category !== 'codes') {
    list.sort((a, b) =>
      rarityIndex(a) - rarityIndex(b)
      || (b.bestPct ?? -1) - (a.bestPct ?? -1)
      || a.name.localeCompare(b.name));
  }

  return list;
}

function animatedPopMarkup(location = 'card') {
  const className = location === 'card' ? 'animated-pop-card' : 'animated-pop-modal';
  return `<div class="${className}">
    <img class="pop-frame normal" ${imageAttributes('assets/pets/pop-cat-normal-v30.png')} alt="Pop Cat">
    <img class="pop-frame scream" ${imageAttributes('assets/pets/pop-cat-scream-v30.png')} alt="Pop Cat animated frame">
  </div>`;
}

function card(item, index = 0) {
  const color = rarityColor(item);
  const art = isAnimated(item)
    ? animatedPopMarkup('card')
    : `<img class="card-image" ${imageAttributes(imageFor(item), { eager: index < 8, thumb: true })} alt="${item.name}">`;

  return `<article class="value-card rarity-${raritySlug(item)}" data-id="${item.id}" data-rarity="${raritySlug(item)}" data-price-state="${priceStateFor(item)}" style="--rarity:${color};--delay:${Math.min(index, 12) * 24}ms;">
    <button class="card-button" type="button" aria-label="Open ${item.name}">
      <span class="card-chips">
        <span class="rarity-badge">${rarityLetterMarkup(item)}</span>
        ${item.bestPct != null ? `<span class="best-badge">${item.bestPct}%<span class="best-full"> Best</span></span>` : ''}
        ${item.eventBadge ? `<span class="event-badge">${item.eventBadge}</span>` : ''}
      </span>
      <span class="card-art">
        ${isAnimated(item) ? '<span class="animated-badge card-animated-badge">▶ Animated</span>' : ''}
        ${art}
      </span>
      <span class="card-bottom">
        <span class="card-title">${item.name}</span>
        <span class="card-value-row"><span class="set-value"><img ${imageAttributes(ticket, { sizes: '24px' })} alt=""><strong>${formatItemValue(item)}</strong></span></span>
      </span>
    </button>
  </article>`;
}

function renderPets(list) {
  const exclusive = list.filter(item => rarityFor(item) === 'Exclusive');
  const statPets = list.filter(item => rarityFor(item) !== 'Exclusive');
  const sections = [];

  if (exclusive.length) {
    sections.push(`<section class="rarity-section rarity-section-exclusive" data-rarity="exclusive" style="--section-color:${rarityColors.Exclusive};--section-gradient:${gradientFor('Exclusive')}">
      <div class="rarity-section-head">
        <h2>Exclusive</h2>
        <span>${exclusive.length}</span>
      </div>
      <div class="card-grid">${exclusive.map(card).join('')}</div>
    </section>`);
  }

  if (statPets.length) {
    sections.push(`<section class="rarity-section rarity-section-stat" data-rarity="mythical" style="--section-color:${rarityColors.Mythical};--section-gradient:${gradientFor('Mythical')}">
      <div class="rarity-section-head">
        <h2>Stat Pets</h2>
        <span>${statPets.length}</span>
      </div>
      <div class="card-grid">${statPets.map(card).join('')}</div>
    </section>`);
  }

  return sections.join('');
}

function renderCompact(list) {
  return `<div class="card-grid compact-grid compact-grid-${state.category}">${list.map(card).join('')}</div>`;
}

function escapeCodeMarkup(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function renderCodes(list) {
  return `<div class="codes-list">${list.map((item, index) => {
    const status = String(item.status || 'active').toLowerCase();
    const expired = status === 'expired';
    const code = escapeCodeMarkup(item.code);
    return `
    <article class="code-row ${expired ? 'is-expired' : 'is-active'}" data-id="${escapeCodeMarkup(item.id)}" style="--delay:${Math.min(index, 12) * 34}ms;">
      <span class="code-row-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none"><path d="M4 5.5h16v4a2.5 2.5 0 0 0 0 5v4H4v-4a2.5 2.5 0 0 0 0-5v-4Z"/><path d="m9.5 9-3 3 3 3m5-6 3 3-3 3"/></svg>
      </span>
      <div class="code-row-main">
        <strong class="code-row-code">${code}</strong>
        <span class="code-row-status"><i aria-hidden="true"></i>${expired ? 'Expired' : 'Active'}</span>
      </div>
      <button class="code-copy-button copy-code-btn" type="button" data-code="${code}" aria-label="${expired ? `Expired code ${code}` : `Copy ${code}`}" ${expired ? 'disabled' : ''}>
        <svg class="copy-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="3"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/></svg>
        <strong aria-live="polite">${expired ? 'Expired' : 'Copy code'}</strong>
      </button>
    </article>`;
  }).join('')}</div>`;
}

// Keep real card nodes and decoded images when filtering, sorting or returning
// to a category. No virtualization: the complete list stays in the document.
const catalogViews = new Map();
let catalogRenderSignature = '';
const catalogTemplate = document.createElement('template');
function elementFromMarkup(markup) {
  catalogTemplate.innerHTML = markup;
  const node = catalogTemplate.content.firstElementChild;
  return catalogTemplate.content.removeChild(node);
}
function reconcileChildren(parent, nodes) {
  if (!parent.firstElementChild) {
    const fragment = document.createDocumentFragment();
    for (const node of nodes) fragment.append(node);
    parent.append(fragment);
    return;
  }
  nodes.forEach((node, index) => {
    const current = parent.children[index];
    if (current !== node) parent.insertBefore(node, current || null);
  });
  while (parent.children.length > nodes.length) parent.lastElementChild.remove();
}
function createPetSection(exclusive) {
  const rarity = exclusive ? 'Exclusive' : 'Mythical';
  const section = elementFromMarkup(`<section class="rarity-section rarity-section-${exclusive ? 'exclusive' : 'stat'}" data-rarity="${rarity.toLowerCase()}" style="--section-color:${rarityColors[rarity]};--section-gradient:${gradientFor(rarity)}"><div class="rarity-section-head"><h2>${exclusive ? 'Exclusive' : 'Stat Pets'}</h2><span></span></div><div class="card-grid"></div></section>`);
  return { section, grid: $('.card-grid', section), count: $('.rarity-section-head > span', section) };
}
function createItemSection(group) {
  const section = elementFromMarkup(`<section class="item-section" data-item-section="${group}"><div class="item-section-head"><h2>${itemGroups[group]}</h2><span></span></div><div class="card-grid compact-grid compact-grid-items"></div></section>`);
  return { section, grid: $('.card-grid', section), count: $('.item-section-head > span', section) };
}
const observedTiles = new Set();
const touchLayout = matchMedia('(max-width: 768px), (pointer: coarse)');
const tileObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  for (const entry of entries) entry.target.toggleAttribute('data-offscreen', !entry.isIntersecting);
}, { rootMargin: touchLayout.matches ? '80px 0px' : '200px 0px' }) : null;
function syncVisibleAnimations() {
  if (!tileObserver) return;
  const tiles = new Set($$('#cardsGrid .animated-pop-card').map(node => node.closest('.value-card')).filter(Boolean));
  for (const tile of observedTiles) {
    if (!tiles.has(tile)) { tileObserver.unobserve(tile); observedTiles.delete(tile); }
  }
  for (const tile of tiles) {
    if (!observedTiles.has(tile)) { tileObserver.observe(tile); observedTiles.add(tile); }
  }
}
function renderCatalog(list) {
  const key = `${state.category}:${state.variant}`;
  const signature = `${key}:${state.category === 'items' ? state.itemGroup : ''}:${list.map(item => item.id).join(',')}`;
  if (signature === catalogRenderSignature) return;
  catalogRenderSignature = signature;
  let view = catalogViews.get(key);
  if (!view) {
    view = { cards: new Map() };
    if (state.category === 'pets') {
      view.exclusive = createPetSection(true);
      view.stat = createPetSection(false);
    } else if (state.category === 'items') {
      view.groups = Object.fromEntries(Object.keys(itemGroups).map(group => [group, createItemSection(group)]));
    } else {
      view.root = elementFromMarkup(state.category === 'codes' ? '<div class="codes-list"></div>' : `<div class="card-grid compact-grid compact-grid-${state.category}"></div>`);
    }
    catalogViews.set(key, view);
  }
  const cardNode = (item, index) => {
    if (!view.cards.has(item.id)) {
      const node = state.category === 'codes'
        ? elementFromMarkup(renderCodes([item])).firstElementChild
        : elementFromMarkup(card(item, index));
      view.cards.set(item.id, node);
    }
    return view.cards.get(item.id);
  };
  const roots = [];
  if (state.category === 'pets') {
    for (const [group, exclusive] of [[view.exclusive, true], [view.stat, false]]) {
      const items = list.filter(item => (rarityFor(item) === 'Exclusive') === exclusive);
      reconcileChildren(group.grid, items.map(cardNode));
      group.count.textContent = items.length;
      if (items.length) roots.push(group.section);
    }
  } else if (state.category === 'items') {
    for (const [name, group] of Object.entries(view.groups)) {
      const items = list.filter(item => itemGroupFor(item) === name);
      reconcileChildren(group.grid, items.map(cardNode));
      group.count.textContent = items.length;
      if (items.length) roots.push(group.section);
    }
  } else {
    reconcileChildren(view.root, list.map(cardNode));
    roots.push(view.root);
  }
  const host = $('#cardsGrid');
  if (list.length) reconcileChildren(host, roots);
  else {
    const hint = state.category === 'codes' ? 'Try another code.'
      : state.category === 'pets' ? 'Try another name or pet variant.' : 'Try another item name.';
    host.replaceChildren(elementFromMarkup(`<div class="empty-results"><strong>No matches found</strong><p>${hint}</p><button type="button" id="clearFilters">Clear filters</button></div>`));
  }
  syncVisibleAnimations();
}

function render() {
  document.body.dataset.view = state.view;
  const homeView = $('#homeView');
  const valuesView = $('#valuesView');
  valuesView.dataset.category = state.category;
  const calculatorView = $('#calculatorView');
  const categoryNav = $('#categoryNav');

  homeView.hidden = state.view !== 'home';
  valuesView.hidden = state.view !== 'values';
  calculatorView.hidden = state.view !== 'calculator';
  categoryNav.hidden = state.view !== 'values';
  $('#mobileTradeSummary').hidden = state.view !== 'calculator';
  $$('.primary-nav [data-view-target], .mobile-nav [data-view-target]').forEach(button => {
    const active = button.dataset.viewTarget === state.view;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });

  refreshHomeUpdated();

  refreshPricesUpdated();

  if (state.view === 'calculator') {
    renderCalculator();
    return;
  }
  if (state.view !== 'values') return;

  const list = filtered();
  const [kicker, title, placeholder] = categoryMeta[state.category];
  const petsMode = state.category === 'pets';
  const itemsMode = state.category === 'items';
  const codesMode = state.category === 'codes';
  $('#itemGroupTabs').hidden = !itemsMode;
  $$('#itemGroupTabs [data-item-group]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.itemGroup === state.itemGroup));
  });

  $('#sectionKicker').textContent = kicker;
  $('#sectionTitle').textContent = title;
  $('#searchInput').placeholder = placeholder;
  $('#resultCount').textContent = `${list.length} ${list.length === 1 ? 'result' : 'results'}`;

  const variantTools = $('#variantTools');
  variantTools.hidden = !petsMode;
  $('.page-tools').classList.toggle('no-variants', !petsMode && !itemsMode);
  $('#customSort').hidden = codesMode;
  $('#filterToggle').hidden = codesMode;
  $('#filterPanel').hidden = codesMode;
  $('#catalogToolbar').dataset.filtersOpen = String(state.filtersOpen);
  $('#filterToggle').setAttribute('aria-expanded', String(state.filtersOpen));
  const activeFilters = [];
  if (petsMode && state.variant !== 'normal') activeFilters.push(state.variant[0].toUpperCase() + state.variant.slice(1));
  if (itemsMode && state.itemGroup !== 'all') activeFilters.push(itemGroups[state.itemGroup]);
  if (!codesMode && state.sort !== 'featured') activeFilters.push(sortNames[state.sort]);
  $('#filterToggleLabel').textContent = itemsMode ? 'Categories' : 'Filters';
  $('#filterActiveDot').hidden = !activeFilters.length;
  $('#activeFilterLabel').textContent = activeFilters.join(' · ');
  $('#activeFilterLabel').hidden = !activeFilters.length || state.filtersOpen;
  const catalogLabel = $('#catalogLabel');
  catalogLabel.textContent = codesMode ? 'Game codes' : (petsMode ? 'Pet Collection' : title);
  catalogLabel.hidden = false;
  $('#codesHint').hidden = !codesMode;
  $('.catalog-meta').classList.toggle('codes-meta', codesMode);

  const petOnlySorts = new Set(['best-desc', 'best-asc']);
  $$('.sort-option').forEach(option => {
    option.hidden = petOnlySorts.has(option.dataset.sort) && !petsMode;
  });

  $$('.nav-btn').forEach(button => {
    const active = button.dataset.category === state.category;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  $$('.variant-btn').forEach(button => {
    const active = button.dataset.variant === state.variant;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  renderCatalog(list);
}

function calcSideInfo(side) {
  const entries = (state.calc[side] || []).map(entry => ({ value: valueFor(calcFindItem(entry.category, entry.id), entry.variant), qty: entry.qty }));
  const result = calculateOffer(entries, state.calc[`${side}Tickets`]);
  return { ...result, hasOC: result.incomplete };
}

function calcEntryPrice(item, entry) {
  if (!pricesReady) return formatItemValue(item, entry.variant);
  const raw = valueFor(item, entry.variant);
  if (parseNumericValue(raw) == null) return formatValue(raw);
  const total = calcNumericValue(item, entry.variant) * entry.qty;
  return Number.isFinite(total) ? formatValue(total) : 'Too large';
}

function calcEntryMarkup(side, entry) {
  const item = calcFindItem(entry.category, entry.id);
  if (!item) return '';
  const displayValue = calcEntryPrice(item, entry);
  const image = imageFor(item, entry.variant);
  const variantName = entry.category === 'pets' ? entry.variant[0].toUpperCase() + entry.variant.slice(1) : '';
  return `<article class="trade-item-v40 trade-entry-new" data-entry-category="${entry.category}" data-entry-id="${entry.id}" data-entry-variant="${entry.variant}">
    <div class="trade-item-art-v40">
      <img ${imageAttributes(image, { thumb: true })} alt="${item.name}">
      <span class="trade-item-qty-v40">x${entry.qty}</span>
    </div>
    <div class="trade-item-copy-v40">
      <strong>${item.name}</strong>
      <small>${variantName ? `${variantName} · ${rarityFor(item)}` : rarityFor(item)}</small>
      <span class="trade-entry-price"><img ${imageAttributes(ticket, { sizes: '22px' })} alt="">${displayValue}</span>
    </div>
    <button class="trade-item-increase-v88" type="button" data-calc-increase="${side}" data-category="${entry.category}" data-id="${entry.id}" data-variant="${entry.variant}" aria-label="Add one ${item.name}">+</button>
    <button class="trade-item-remove-v40" type="button" data-calc-remove="${side}" data-category="${entry.category}" data-id="${entry.id}" data-variant="${entry.variant}" aria-label="Remove one ${item.name}">−</button>
  </article>`;
}

function calcAddTile(side) {
  return `<button type="button" class="trade-add-v40" data-calc-open="${side}" aria-label="Add item to ${side} side">
    <span>+</span><strong>Add to offer</strong>
  </button>`;
}

function animateMetric(target, nextText, direction = 'neutral') {
  const element = typeof target === 'string' ? $(target) : target;
  if (!element) return;
  const prevText = element.textContent?.trim() || '';
  if (prevText === String(nextText).trim()) return;
  element.textContent = nextText;
  if (!motionAllowed()) return;
  element.classList.remove('metric-rise', 'metric-fall', 'metric-neutral');
  restartEffect(element, direction === 'up' ? 'metric-rise' : direction === 'down' ? 'metric-fall' : 'metric-neutral');
  clearTimeout(element._metricTimer);
  element._metricTimer = setTimeout(() => element.classList.remove('metric-rise', 'metric-fall', 'metric-neutral'), 480);
}

function flashTicketInput(element, direction = 'neutral') {
  if (!element || !motionAllowed()) return;
  const host = element.closest('.trade-v55-ticket');
  if (!host) return;
  host.classList.remove('ticket-rise', 'ticket-fall');
  if (direction === 'up') host.classList.add('ticket-rise');
  if (direction === 'down') host.classList.add('ticket-fall');
  clearTimeout(host._ticketTimer);
  host._ticketTimer = setTimeout(() => host.classList.remove('ticket-rise', 'ticket-fall'), 420);
}

const calcListSignatures = { left: null, right: null };
const calcNodes = { left: new Map(), right: new Map() };
function updateCalcList(side) {
  const cache = calcNodes[side];
  const keys = new Set();
  const nodes = state.calc[side].map(entry => {
    const key = `${entry.category}/${entry.id}/${entry.variant}`;
    keys.add(key);
    let saved = cache.get(key);
    if (!saved) {
      saved = { node: elementFromMarkup(calcEntryMarkup(side, entry)), qty: entry.qty };
      cache.set(key, saved);
    } else if (saved.qty !== entry.qty) {
      const direction = entry.qty > saved.qty ? 'up' : 'down';
      animateMetric($('.trade-item-qty-v40', saved.node), `x${entry.qty}`, direction);
      const price = $('.trade-entry-price', saved.node);
      price.lastChild.textContent = calcEntryPrice(calcFindItem(entry.category, entry.id), entry);
      saved.qty = entry.qty;
    }
    return saved.node;
  });
  for (const key of cache.keys()) if (!keys.has(key)) cache.delete(key);
  const host = $(`#calc${side === 'left' ? 'Left' : 'Right'}List`);
  nodes.push($('.trade-add-v40', host) || elementFromMarkup(calcAddTile(side)));
  reconcileChildren(host, nodes);
}
let calculatorFrame = 0;
function scheduleCalculatorRender() {
  if (!calculatorFrame) calculatorFrame = requestAnimationFrame(() => { calculatorFrame = 0; renderCalculator(); });
}
function renderCalculator() {
  for (const side of ['left', 'right']) {
    const signature = JSON.stringify(state.calc[side]);
    if (signature !== calcListSignatures[side]) {
      updateCalcList(side);
      calcListSignatures[side] = signature;
    }
  }

  const leftInfo = calcSideInfo('left');
  const rightInfo = calcSideInfo('right');
  const left = leftInfo.total;
  const right = rightInfo.total;
  const diff = left - right;
  const gap = Math.abs(diff);
  const hasAnyOC = leftInfo.hasOC || rightInfo.hasOC;

  for (const side of ['left', 'right']) {
    const input = $(`#calc${side === 'left' ? 'Left' : 'Right'}Tickets`);
    if (input !== document.activeElement && input.value !== String(state.calc[`${side}Tickets`])) {
      input.value = state.calc[`${side}Tickets`];
    }
  }
  animateMetric('#calcLeftTotal', leftInfo.overflow ? 'Too large' : formatValue(left), calcMotionCache.leftTotal == null ? 'neutral' : left > calcMotionCache.leftTotal ? 'up' : left < calcMotionCache.leftTotal ? 'down' : 'neutral');
  animateMetric('#calcRightTotal', rightInfo.overflow ? 'Too large' : formatValue(right), calcMotionCache.rightTotal == null ? 'neutral' : right > calcMotionCache.rightTotal ? 'up' : right < calcMotionCache.rightTotal ? 'down' : 'neutral');
  animateMetric('#calcDifference', formatValue(gap), calcMotionCache.diff == null ? 'neutral' : gap > calcMotionCache.diff ? 'up' : gap < calcMotionCache.diff ? 'down' : 'neutral');
  $('#calcLeftOcNote').hidden = !leftInfo.hasOC;
  $('#calcRightOcNote').hidden = !rightInfo.hasOC;

  const label = $('#calcDifferenceLabel');
  const centerVerdict = $('#calcDifferenceVerdict');
  centerVerdict.className = '';

  const setTradeStatus = status => {
    $$('.trade-status-segment').forEach(segment => {
      const active = segment.dataset.tradeStatus === status;
      segment.classList.toggle('active', active);
      segment.setAttribute('aria-current', active ? 'true' : 'false');
    });
  };

  // The same rule is used by PNG export: incomplete offers have no W/F/L rating.
  const summary = tradeSummary({ left: { total: left, entries: state.calc.left, tickets: state.calc.leftTickets, unpriced: leftInfo.hasOC, overflow: leftInfo.overflow }, right: { total: right, entries: state.calc.right, tickets: state.calc.rightTickets, unpriced: rightInfo.hasOC, overflow: rightInfo.overflow } });
  const verdictState = summary.verdict;
  setTradeStatus(verdictState);
  centerVerdict.className = `is-${verdictState}`;
  label.className = `is-${verdictState}`;
  animateMetric(centerVerdict, verdictState === 'win' ? 'WIN' : verdictState === 'lose' ? 'LOSS' : verdictState === 'partial' ? 'INCOMPLETE' : 'FAIR', verdictState === 'win' ? 'up' : verdictState === 'lose' ? 'down' : 'neutral');
  animateMetric(label, summary.detail, verdictState === 'win' ? 'up' : verdictState === 'lose' ? 'down' : 'neutral');
  $('#calcUnpricedNotice').hidden = !hasAnyOC;
  const countText = side => { const count = state.calc[side].reduce((sum, entry) => sum + entry.qty, 0); return `${count} ${count === 1 ? 'item' : 'items'}`; };
  $('#calcLeftCount').textContent = countText('left');
  $('#calcRightCount').textContent = countText('right');
  $('#leftTabCount').textContent = state.calc.left.reduce((sum, entry) => sum + entry.qty, 0);
  $('#rightTabCount').textContent = state.calc.right.reduce((sum, entry) => sum + entry.qty, 0);
  $('#calculatorPanel').dataset.activeOffer = state.calcActiveSide;
  $$('[data-offer-side]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.offerSide === state.calcActiveSide)));
  $('#mobileLeftTotal').textContent = leftInfo.overflow ? 'Too large' : formatValue(left);
  $('#mobileRightTotal').textContent = rightInfo.overflow ? 'Too large' : formatValue(right);
  $('#mobileTradeVerdict').textContent = verdictState === 'partial' ? 'INCOMPLETE' : verdictState === 'win' ? 'WIN' : verdictState === 'lose' ? 'LOSS' : 'FAIR';
  $('#mobileTradeHint').textContent = summary.detail;
  $('#mobileTradeSummary').dataset.verdict = verdictState;
  $('#saveTradeImage').disabled = tradeExportBusy || !pricesReady;

  calcMotionCache.leftTotal = left;
  calcMotionCache.rightTotal = right;
  calcMotionCache.diff = gap;
  calcMotionCache.verdict = verdictState;
  if ($('#calcPickerModal').open) syncPickerAddedCounts();
}

function swapCalcOffers() {
  const leftEntries = state.calc.left;
  state.calc.left = state.calc.right;
  state.calc.right = leftEntries;
  const leftTickets = state.calc.leftTickets;
  state.calc.leftTickets = state.calc.rightTickets;
  state.calc.rightTickets = leftTickets;
  renderCalculator();
}

function clearCalcTrade() {
  state.calc.left = [];
  state.calc.right = [];
  state.calc.leftTickets = 0;
  state.calc.rightTickets = 0;
  renderCalculator();
}

function openCalcPicker(side) {
  if (!['left', 'right'].includes(side)) return;
  state.calcPickerSide = side;
  state.calcPickerCategory = 'pets';
  state.calcPickerVariant = 'normal';
  state.calcPickerQuery = '';
  $('#calcPickerSearch').value = '';
  $('#calcPickerOfferLabel').textContent = side === 'left' ? 'MY OFFER · ADD ITEMS' : 'THEIR OFFER · ADD ITEMS';
  renderCalcPicker();
  $('#calcPickerModal').showModal();
  $('#calcPickerGrid').scrollTop = 0;
}

const pickerCards = new Map();
function syncPickerAddedCounts() {
  const quantities = new Map(state.calc[state.calcPickerSide].map(entry => [`${entry.category}/${entry.id}/${entry.variant}`, entry.qty]));
  const info = calcSideInfo(state.calcPickerSide);
  $('#pickerOfferTotal').textContent = `${state.calcPickerSide === 'left' ? 'My Offer' : 'Their Offer'} · ${info.overflow ? 'Too large' : formatValue(info.total)}${info.hasOC ? ' · Incomplete' : ''}`;
  $$('#calcPickerGrid [data-calc-pick]').forEach(button => {
    const key = `${button.dataset.calcCategoryPick}/${button.dataset.calcPick}/${button.dataset.calcVariant}`;
    const quantity = quantities.get(key) || 0;
    const count = $('.calc-picker-added-count', button);
    count.hidden = quantity === 0;
    count.textContent = `×${quantity}`;
    button.dataset.added = String(quantity > 0);
    button.setAttribute('aria-label', `Add ${button.dataset.calcName} to ${state.calcPickerSide === 'left' ? 'My Offer' : 'Their Offer'}${quantity ? `; ${quantity} already added` : ''}`);
  });
}
function renderCalcPicker() {
  const category = state.calcPickerCategory;
  const petsMode = category === 'pets';
  const variant = petsMode ? state.calcPickerVariant : 'normal';
  $$('#calcPickerTabs [data-calc-category]').forEach(button => {
    const active = button.dataset.calcCategory === category;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#calcPickerVariantTools').hidden = !petsMode;
  $$('#calcPickerVariantTools [data-calc-filter-variant]').forEach(button => {
    const active = button.dataset.calcFilterVariant === state.calcPickerVariant;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const query = state.calcPickerQuery.trim().toLowerCase();
  const list = (catalogs[category] || [])
    .filter(item => (!petsMode || supportsVariant(item, variant)) && (!query || `${item.name} ${item.rarity || ''}`.toLowerCase().includes(query)))
    .map(item => {
      const rawValue = valueFor(item, variant);
      const numeric = parseNumericValue(rawValue);
      const ownerChoice = typeof rawValue === 'string' && rawValue.trim().toUpperCase() === 'O/C';
      return { item, priority: ownerChoice ? 2 : numeric != null ? 1 : 0, numeric: numeric ?? 0 };
    })
    .sort((a, b) => b.priority - a.priority || b.numeric - a.numeric || a.item.name.localeCompare(b.item.name, 'en', { sensitivity: 'base' }))
    .map(entry => entry.item);
  $('#calcPickerCount').textContent = `${list.length} ${list.length === 1 ? 'result' : 'results'}`;
  $('#calcPickerOrderHint').textContent = petsMode ? 'O/C first · Value high to low' : 'Value high to low';
  const variantLabel = variant[0].toUpperCase() + variant.slice(1);
  const nodes = list.map((item, index) => {
    const key = `${category}:${variant}:${item.id}`;
    if (pickerCards.has(key)) return pickerCards.get(key);
    const node = elementFromMarkup(`<article class="calc-picker-card" data-id="${item.id}" data-variant="${variant}" data-rarity="${raritySlug(item)}" style="--picker-rarity:${rarityColor(item)};--rarity-gradient:${gradientFor(item)};--picker-conic:${pickerConicFor(item)}">
      <span class="rarity-sheen" aria-hidden="true"></span>
      <div class="calc-picker-art">
        <div class="calc-picker-badges">
          <span class="calc-picker-rarity">${rarityLetterMarkup(item)}</span>
          ${item.eventBadge ? `<span class="calc-picker-event">${item.eventBadge}</span>` : ''}
          ${item.bestPct != null ? `<span class="calc-picker-best">${item.bestPct}% Best Pet</span>` : ''}
        </div>
        <img class="calc-picker-image" ${imageAttributes(imageFor(item, variant), { eager: index < 8, thumb: true })} alt="${item.name}${petsMode ? ` (${variantLabel})` : ''}">
      </div>
      <div class="calc-picker-body">
        <strong class="calc-picker-name">${item.name}</strong>
        <div class="calc-picker-meta">
          <span class="calc-picker-variant-label">${petsMode ? variantLabel : 'VALUE'}</span>
          <strong class="calc-picker-value"><img ${imageAttributes(ticket, { sizes: '18px' })} alt=""><span>${formatItemValue(item, variant)}</span></strong>
        </div>
      </div>
      <button type="button" class="calc-picker-add" data-calc-pick="${item.id}" data-calc-name="${item.name}" data-calc-variant="${variant}" data-calc-category-pick="${category}"><span aria-hidden="true">+</span><span>Add to offer</span><span class="calc-picker-added-count" hidden>×0</span></button>
    </article>`);
    pickerCards.set(key, node);
    return node;
  });
  reconcileChildren($('#calcPickerGrid'), nodes.length ? nodes : [elementFromMarkup('<div class="calc-picker-empty">No matches found.</div>')]);
  syncPickerAddedCounts();
  syncVisibleAnimations();
}

function addCalcItem(side, category, id, variant = 'normal') {
  const item = calcFindItem(category, id);
  if (!item || !['left', 'right'].includes(side) || !calcCategories.includes(category)) return;
  if (!['normal', 'golden', 'diamond'].includes(variant)) return;
  if (category === 'pets' ? !supportsVariant(item, variant) : variant !== 'normal') return;
  const entries = state.calc[side];
  const existing = entries.find(entry => entry.category === category && entry.id === id && entry.variant === variant);
  if (existing && existing.qty >= MAX_QUANTITY) { showExportMessage(`Maximum quantity is ${MAX_QUANTITY.toLocaleString('en-US')} per item.`); return; }
  if (existing) existing.qty += 1;
  else entries.push({ category, id, variant, qty: 1 });
  renderCalculator();
}

function removeCalcItem(side, category, id, variant) {
  const entries = state.calc[side];
  const existing = entries.find(entry => entry.category === category && entry.id === id && entry.variant === variant);
  if (!existing) return;
  if (existing.qty > 1) existing.qty -= 1;
  else state.calc[side] = entries.filter(entry => !(entry.category === category && entry.id === id && entry.variant === variant));
  renderCalculator();
}

function switchCategory(category) {
  if (!catalogs[category]) return;
  const main = $('.main');

  state.view = 'values';
  state.category = category;
  state.itemGroup = 'all';
  state.filtersOpen = false;
  state.query = '';
  if (category !== 'pets') state.variant = 'normal';
  if (category !== 'pets' && state.sort.startsWith('best-')) {
    state.sort = 'featured';
    $('#sortLabel').textContent = sortNames.featured;
    $$('.sort-option').forEach(button => {
      const active = button.dataset.sort === 'featured';
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }
  $('#searchInput').value = '';
  render();
  restartEffect(main, 'category-switching');
  setTimeout(() => main.classList.remove('category-switching'), 380);
}

function dropSourcesMarkup(sources = []) {
  return sources.map(source => `<div class="drop-source-card">
    <img ${imageAttributes(source.image, { eager: true })} alt="${source.name}">
    <span>${source.name}</span>
  </div>`).join('');
}

function openModal(item) {
  clearTimeout(petTapTimer);
  $('#modalArtShell').classList.remove('pet-tap');
  state.modalItem = item;
  state.modalVariant = item.supportsVariants && item.variantImages?.[state.variant] ? state.variant : 'normal';

  const modal = $('#detailModal');
  modal.style.setProperty('--modal-rarity', rarityColor(item));
  modal.style.setProperty('--rarity-gradient', gradientFor(item));
  modal.dataset.rarity = raritySlug(item);
  modal.dataset.itemId = item.id;
  $('#modalKicker').textContent = categoryMeta[state.category][3];
  $('#modalRarity').innerHTML = `<i></i>${rarityLetterMarkup(item)}`;
  $('#modalBest').textContent = item.bestPct != null ? `${item.bestPct}% Best Pet` : '';
  $('#modalBest').hidden = item.bestPct == null;
  $('#modalEventBadge').textContent = item.eventBadge || '';
  $('#modalEventBadge').hidden = !item.eventBadge;
  $('#modalTitle').textContent = item.name;
  $('#modalArtShell').setAttribute('aria-label', `Animate ${item.name}`);
  const description = item.description === `${item.name}.` ? '' : (item.description || '');
  $('#modalDescription').textContent = description;
  $('#modalDescription').hidden = !description;
  $('#modalSource').textContent = item.source || '—';

  const isCode = state.category === 'codes';
  $('#modalTradeActions').hidden = isCode;
  $('#modalHistoryArea').hidden = isCode;
  if (!isCode) {
    state.modalRange = '24h';
    $$('#historyRange [data-history-range]').forEach(button => {
      const active = button.dataset.historyRange === state.modalRange;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  $('#modalMapRow').hidden = isCode || !item.map;
  $('#modalMap').textContent = item.map || '';
  $('#modalChanceRow').hidden = isCode || !item.hatchChance;
  $('#modalChance').textContent = item.hatchChance || '';

  $('#modalDropArea').hidden = isCode || !item.dropSources?.length;
  $('#modalSourceGallery').innerHTML = item.dropSources?.length ? dropSourcesMarkup(item.dropSources) : '';
  $('#modalVariantArea').hidden = !(state.category === 'pets' && item.supportsVariants);
  $('#modalAnimatedBadge').hidden = !isAnimated(item);
  $('#modalNote').hidden = !(item.note || isCode);
  $('#modalNote').textContent = isCode ? 'Use the copy button on the code card, then redeem it in game.' : (item.note || '');

  $('#modalValueLabel').textContent = isCode ? 'Code' : 'Listed value';
  setImageSource($('#modalValueIcon'), isCode ? 'assets/ui/category-codes.png' : ticket);
  $('#modalValueIcon').alt = isCode ? 'Code badge' : 'Ticket';

  renderModalVariant();
  modal.showModal();
  document.body.classList.add('modal-open');
}

function renderModalVariant() {
  const item = state.modalItem;
  if (!item) return;

  const variantArea = $('#modalVariantArea');
  if (state.category === 'pets' && item.supportsVariants) {
    variantArea.hidden = false;
    $('#modalVariantButtons').innerHTML = ['normal', 'golden', 'diamond'].map(variant => `
      <button class="modal-variant-btn ${state.modalVariant === variant ? 'active' : ''}" data-modal-variant="${variant}" aria-pressed="${state.modalVariant === variant}" ${!item.variantImages?.[variant] ? 'disabled' : ''}>
        <i></i>${variant[0].toUpperCase() + variant.slice(1)}
      </button>`).join('');
  } else {
    variantArea.hidden = true;
    $('#modalVariantButtons').innerHTML = '';
  }

  const modalImage = $('#modalImage');
  const animatedArt = $('#modalAnimatedArt');
  if (isAnimated(item)) {
    modalImage.hidden = true;
    animatedArt.hidden = false;
  } else {
    animatedArt.hidden = true;
    modalImage.hidden = false;
    setImageSource(modalImage, imageFor(item, state.modalVariant));
    modalImage.alt = item.name;
    restartEffect(modalImage, 'pop-in');
  }

  $('#modalValue').textContent = state.category === 'codes' ? item.code : formatItemValue(item, state.modalVariant);
  const priceState = priceStateFor(item, state.modalVariant);
  $('.value-panel').dataset.priceState = priceState;
  const hint = $('#modalPriceHint');
  hint.hidden = state.category === 'codes' || priceState === 'number';
  hint.textContent = !pricesReady ? (priceSyncError ? 'Prices could not be loaded. Please refresh to try again.' : 'Prices are loading. Offer totals will update automatically.')
    : priceState === 'oc' ? 'Owner’s Choice — agree on a value with the owner.' : 'Value not listed yet.';
  if (state.category !== 'codes') loadValueHistory();
}

function closeModal() {
  historyController?.abort();
  ++historyRequestId;
  $('#detailModal').close();
  document.body.classList.remove('modal-open');
}

function setSort(nextSort) {
  if (!sortNames[nextSort]) return;
  state.sort = nextSort;
  $('#sortLabel').textContent = sortNames[nextSort];
  $$('.sort-option').forEach(option => {
    const active = option.dataset.sort === nextSort;
    option.classList.toggle('active', active);
    option.setAttribute('aria-selected', String(active));
  });
  $('#sortPopover').hidden = true;
  $('#sortTrigger').setAttribute('aria-expanded', 'false');
  render();
}

function toggleSortMenu(forceOpen = null) {
  const popover = $('#sortPopover');
  const trigger = $('#sortTrigger');
  const willOpen = forceOpen == null ? popover.hidden : forceOpen;
  popover.hidden = !willOpen;
  trigger.setAttribute('aria-expanded', String(willOpen));
}

const copyFeedbackTimers = new WeakMap();
document.addEventListener('click', event => {
  const offerTab = event.target.closest('[data-offer-side]');
  if (offerTab) { state.calcActiveSide = offerTab.dataset.offerSide; renderCalculator(); return; }
  const modalAdd = event.target.closest('[data-modal-add]');
  if (modalAdd && state.modalItem && state.category !== 'codes') {
    const side = modalAdd.dataset.modalAdd;
    const item = state.modalItem;
    addCalcItem(side, state.category, item.id, state.modalVariant);
    state.calcActiveSide = side;
    closeModal(); switchView('calculator');
    return;
  }
  if (event.target.closest('#filterToggle')) {
    state.filtersOpen = !state.filtersOpen;
    toggleSortMenu(false); render(); return;
  }
  if (event.target.closest('#clearFilters')) {
    state.query = ''; state.variant = 'normal'; state.itemGroup = 'all';
    $('#searchInput').value = ''; render(); $('#searchInput').focus(); return;
  }
  const copyButton = event.target.closest('.copy-code-btn');
  if (copyButton) {
    event.preventDefault();
    event.stopPropagation();
    if (copyButton.disabled || copyButton.dataset.copyState === 'pending') return;
    clearTimeout(copyFeedbackTimers.get(copyButton));
    copyButton.dataset.copyState = 'pending';
    copyText(copyButton.dataset.code || '').then(ok => {
      const strong = copyButton.querySelector('strong');
      if (!strong) return;
      copyButton.dataset.copyState = ok ? 'copied' : 'failed';
      strong.textContent = ok ? 'Copied!' : 'Copy failed';
      copyButton.setAttribute('aria-label', ok ? `Copied ${copyButton.dataset.code}` : 'Copy failed. Try again.');
      copyFeedbackTimers.set(copyButton, setTimeout(() => {
        delete copyButton.dataset.copyState;
        strong.textContent = 'Copy code';
        copyButton.setAttribute('aria-label', `Copy ${copyButton.dataset.code}`);
      }, 1600));
    });
    return;
  }

  const viewTarget = event.target.closest('[data-view-target]');
  if (viewTarget) {
    event.preventDefault();
    toggleSortMenu(false);
    switchView(viewTarget.dataset.viewTarget);
    if (viewTarget.closest('#homeView')) focusViewHeading();
    return;
  }

  const nav = event.target.closest('#categoryNav [data-category]');
  if (nav) {
    toggleSortMenu(false);
    switchCategory(nav.dataset.category);
    return;
  }

  const itemGroupButton = event.target.closest('#itemGroupTabs [data-item-group]');
  if (itemGroupButton && state.category === 'items') {
    const group = itemGroupButton.dataset.itemGroup;
    if (group !== 'all' && !Object.hasOwn(itemGroups, group)) return;
    toggleSortMenu(false);
  
    state.itemGroup = group;
    render();
    return;
  }

  if (event.target.closest('[data-swap-trade]')) {
    swapCalcOffers();
    return;
  }

  if (event.target.closest('[data-clear-trade]')) {
    clearCalcTrade();
    return;
  }

  const calcOpen = event.target.closest('[data-calc-open]');
  if (calcOpen) {
    openCalcPicker(calcOpen.dataset.calcOpen);
    return;
  }

  const calcIncrease = event.target.closest('[data-calc-increase]');
  if (calcIncrease) { addCalcItem(calcIncrease.dataset.calcIncrease, calcIncrease.dataset.category, calcIncrease.dataset.id, calcIncrease.dataset.variant); return; }

  const calcRemove = event.target.closest('[data-calc-remove]');
  if (calcRemove) {
    removeCalcItem(calcRemove.dataset.calcRemove, calcRemove.dataset.category, calcRemove.dataset.id, calcRemove.dataset.variant);
    return;
  }

  const pickerVariant = event.target.closest('[data-calc-filter-variant]');
  if (pickerVariant) {
    state.calcPickerVariant = pickerVariant.dataset.calcFilterVariant;
    renderCalcPicker();
    $('#calcPickerGrid').scrollTop = 0;
    return;
  }

  const calcPick = event.target.closest('[data-calc-pick]');
  if (calcPick) {
    addCalcItem(state.calcPickerSide, calcPick.dataset.calcCategoryPick, calcPick.dataset.calcPick, calcPick.dataset.calcVariant || 'normal');
    return;
  }

  const calcTab = event.target.closest('[data-calc-category]');
  if (calcTab) {
    state.calcPickerCategory = calcTab.dataset.calcCategory;
    renderCalcPicker();
    $('#calcPickerGrid').scrollTop = 0;
    return;
  }

  if (event.target.closest('[data-close-calc-picker]')) {
    $('#calcPickerModal').close();
    return;
  }

  const variant = event.target.closest('.variant-btn');
  if (variant) {
    toggleSortMenu(false);
    state.variant = variant.dataset.variant;
    render();
    return;
  }

  const sortOption = event.target.closest('.sort-option');
  if (sortOption) {
    setSort(sortOption.dataset.sort);
    $('#sortTrigger').focus();
    return;
  }

  if (event.target.closest('#sortTrigger')) {
    toggleSortMenu();
    return;
  }

  if (!event.target.closest('#customSort')) {
    toggleSortMenu(false);
  }

  const cardElement = event.target.closest('.value-card');
  if (cardElement) {
    const item = currentCatalog().find(entry => entry.id === cardElement.dataset.id);
    if (item) openModal(item);
    return;
  }

  if (event.target.closest('[data-close-modal]')) closeModal();
});

$('#searchInput').addEventListener('input', event => {
  state.query = event.target.value;
  scheduleRender();
});

$('#calcPickerSearch').addEventListener('input', event => {
  state.calcPickerQuery = event.target.value;
  schedulePickerRender();
});

$('#calcLeftTickets').addEventListener('input', event => {
  const next = sanitizeTickets(event.target.value);
  flashTicketInput(event.target, next > state.calc.leftTickets ? 'up' : next < state.calc.leftTickets ? 'down' : 'neutral');
  state.calc.leftTickets = next;
  scheduleCalculatorRender();
});

$('#calcRightTickets').addEventListener('input', event => {
  const next = sanitizeTickets(event.target.value);
  flashTicketInput(event.target, next > state.calc.rightTickets ? 'up' : next < state.calc.rightTickets ? 'down' : 'neutral');
  state.calc.rightTickets = next;
  scheduleCalculatorRender();
});
for (const side of ['left', 'right']) {
  $(`#calc${side === 'left' ? 'Left' : 'Right'}Tickets`).addEventListener('blur', event => {
    event.target.value = state.calc[`${side}Tickets`];
  });
}

$('#calcPickerModal').addEventListener('click', event => {
  if (event.target !== $('#calcPickerModal')) return;
  const rect = $('#calcPickerModal').getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('#calcPickerModal').close();
});

$('#modalVariantButtons').addEventListener('click', event => {
  const button = event.target.closest('[data-modal-variant]');
  if (!button || button.disabled) return;
  state.modalVariant = button.dataset.modalVariant;
  renderModalVariant();
});

$('#historyRange').addEventListener('click', event => {
  const button = event.target.closest('[data-history-range]');
  if (!button || button.dataset.historyRange === state.modalRange) return;
  state.modalRange = button.dataset.historyRange;
  $$('#historyRange [data-history-range]').forEach(option => {
    const active = option === button;
    option.classList.toggle('active', active);
    option.setAttribute('aria-pressed', String(active));
  });
  loadValueHistory();
});

$('#detailModal').addEventListener('click', event => {
  if (event.target !== $('#detailModal')) return;
  const rect = $('#detailModal').getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal();
});

$('#detailModal').addEventListener('close', () => {
  historyController?.abort();
  clearTimeout(petTapTimer);
  $('#modalArtShell').classList.remove('pet-tap');
  document.body.classList.remove('modal-open');
});

document.addEventListener('keydown', event => {
  if (event.key === '/' && state.view === 'values' && !event.ctrlKey && !event.metaKey && !$('#detailModal').open && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault(); $('#searchInput').focus();
  }
  if (event.key === 'Escape' && !$('#sortPopover').hidden) {
    toggleSortMenu(false);
    $('#sortTrigger').focus();
  }
});

document.documentElement.dataset.theme = 'dark';

let petTapTimer;
$('#modalArtShell').addEventListener('click', () => {
  if (!motionAllowed()) return;
  const art = $('#modalArtShell');
  clearTimeout(petTapTimer);
  art.classList.add('pet-tap');
  for (const animation of art.getAnimations({ subtree: true })) {
    if (animation.animationName === 'petTap') { animation.currentTime = 0; animation.play(); }
  }
  petTapTimer = setTimeout(() => art.classList.remove('pet-tap'), 700);
});
$('#motionToggle').addEventListener('click', () => {
  animationsPaused = !animationsPaused; syncMotion(); writeSetting('pet-universe-motion', animationsPaused ? 'off' : 'on');

});
reducedMotion.addEventListener('change', event => { if (event.matches) { animationsPaused = true; syncMotion(); } });
document.addEventListener('visibilitychange', () => {
  document.documentElement.toggleAttribute('data-page-hidden', document.hidden);
  if (!document.hidden) { refreshPricesUpdated(); syncPublishedPrices(); }
});
$('#sortTrigger').addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') { event.preventDefault(); toggleSortMenu(true); $('.sort-option:not([hidden])')?.focus(); }
});
$('#sortPopover').addEventListener('keydown', event => {
  const options = $$('.sort-option:not([hidden])');
  const index = options.indexOf(document.activeElement);
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault(); options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus();
  }
  if (event.key === 'Home') { event.preventDefault(); options[0]?.focus(); }
  if (event.key === 'End') { event.preventDefault(); options.at(-1)?.focus(); }
});
function syncResponsiveShell() {
  const mobile = smallLayout.matches;
  const categoryHost = mobile ? $('#mobileCategorySlot') : $('.sidebar');
  const nav = $('#categoryNav');
  if (mobile) categoryHost.append(nav);
  else $('.primary-nav').after(nav);
  const motion = $('#motionToggle');
  (mobile ? $('#mobileSettings') : $('#desktopSettings')).append(motion);
  if (!mobile && $('#settingsDialog').open) $('#settingsDialog').close();
}
smallLayout.addEventListener('change', () => { syncResponsiveShell(); render(); });
$('#openSettings').addEventListener('click', () => $('#settingsDialog').showModal());
$('#closeSettings').addEventListener('click', () => $('#settingsDialog').close());
$('#settingsDialog').addEventListener('click', event => {
  if (event.target !== event.currentTarget) return;
  const rect = event.currentTarget.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close();
});
syncResponsiveShell();
syncMotion();
// Phone grid density: 3 compact cards or 2 large cards per row.
function setCols(value, save = true) {
  const cols = value === '2' ? '2' : '3';
  document.documentElement.dataset.cols = cols;
  $$('[data-cols-btn]').forEach(button => {
    const on = button.dataset.colsBtn === cols;
    button.classList.toggle('active', on);
    button.setAttribute('aria-pressed', String(on));
  });
  if (save) writeSetting('pet-universe-cols', cols);
}
$('#layoutTools').addEventListener('click', event => {
  const button = event.target.closest('[data-cols-btn]');
  if (button) setCols(button.dataset.colsBtn);
});
setCols(readSetting('pet-universe-cols'), false);

refreshHomeUpdated();
refreshPricesUpdated();
startLiveViewers($('#homeWatching'));
setInterval(() => {
  refreshHomeUpdated();
  if (!document.hidden) syncPublishedPrices();
}, 30000);
setInterval(() => {
  if (!document.hidden && state.view === 'values') refreshPricesUpdated();
}, 1000);
syncPublishedPrices();
render();

let exportMessageTimer;
function showExportMessage(message) {
  const status = $('#exportStatus');
  status.textContent = message; status.hidden = false;
  clearTimeout(exportMessageTimer);
  exportMessageTimer = setTimeout(() => { status.hidden = true; }, 6000);
}
function exportTradeModel() {
  const model = { timestamp: new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) };
  for (const side of ['left', 'right']) {
    const info = calcSideInfo(side);
    const entries = state.calc[side].map(entry => {
      const item = calcFindItem(entry.category, entry.id);
      return { name: item.name, qty: entry.qty, image: imageSource(imageFor(item, entry.variant)), color: rarityColor(item), variantLabel: entry.variant[0].toUpperCase()+entry.variant.slice(1), valueLabel: calcEntryPrice(item, entry) };
    });
    model[side] = { entries, tickets: sanitizeTickets(state.calc[`${side}Tickets`]), total: info.total, unpriced: info.hasOC, overflow: info.overflow };
  }
  return model;
}
$('#saveTradeImage').addEventListener('click', async event => {
  if (tradeExportBusy || !pricesReady) return;
  tradeExportBusy = true;
  const button = event.currentTarget;
  button.disabled = true; button.textContent = 'Creating image…';
  try {
    const model = exportTradeModel();
    const pages = tradePageCount(model);
    const files = [];
    for (let page=0; page<pages; page++) {
      const canvas = await renderTradePage(model, page);
      const blob = await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create PNG.')), 'image/png'));
      files.push({ blob, name: `Pet-Universe-Trade${pages>1?`-${page+1}`:''}.png` });
    }
    $('#tradeExportDownloads').replaceChildren();
    for (const file of exportObjectUrls) URL.revokeObjectURL(file);
    exportObjectUrls = files.map(file => URL.createObjectURL(file.blob));
    $('#tradeExportPreview').src = exportObjectUrls[0];
    files.forEach((file,index) => {
      const link = document.createElement('a');
      link.href = exportObjectUrls[index]; link.download = file.name;
      link.className = 'export-download-btn';
      link.textContent = files.length>1 ? `Download PNG · Page ${index+1}` : 'Download PNG';
      $('#tradeExportDownloads').append(link);
    });
    $('#tradeExportDialog').showModal();
  } catch (error) {
    showExportMessage(error.message || 'Could not create the image. Please try again.');
  } finally { tradeExportBusy = false; button.disabled = !pricesReady; button.textContent = 'Save Trade Image'; }
});
let exportObjectUrls = [];
$('#closeTradeExport').addEventListener('click', () => $('#tradeExportDialog').close());
$('#tradeExportDialog').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });

fetch('/api/snapshot', { method: 'POST', headers: { accept: 'application/json' } }).catch(() => {});



