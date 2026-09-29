import { PETS, CHARMS, EGGS, ITEMS, CODES, RARITY_ORDER, LAST_UPDATED } from './data/catalog.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const ticket = 'assets/items/value-ticket.png';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const lowPowerDevice = Boolean(
  connection?.saveData ||
  (Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 4) ||
  (Number.isFinite(navigator.hardwareConcurrency) && navigator.hardwareConcurrency <= 4)
);
document.documentElement.dataset.performance = lowPowerDevice ? 'lite' : 'full';
function readSetting(key) { try { return localStorage.getItem(key); } catch { return null; } }
function writeSetting(key, value) { try { localStorage.setItem(key, value); } catch {} }
let animationsPaused = readSetting('pet-universe-motion') === 'off' || reducedMotion.matches;
function motionAllowed() { return !animationsPaused && !reducedMotion.matches; }
function syncMotion() {
  document.documentElement.dataset.motion = animationsPaused ? 'off' : 'on';
  const button = $('#motionToggle');
  button.textContent = animationsPaused ? '▶' : 'Ⅱ';
  button.setAttribute('aria-label', animationsPaused ? 'Enable animations' : 'Pause animations');
  button.setAttribute('aria-pressed', String(animationsPaused));
  button.title = animationsPaused ? 'Enable animations' : 'Pause animations';
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

const catalogs = { pets: PETS, charms: CHARMS, eggs: EGGS, items: ITEMS, codes: CODES };
const categoryMeta = {
  pets: ['PET COLLECTION', 'Pet Values', 'Search pets...', 'PET DETAILS'],
  charms: ['CHARM COLLECTION', 'Charm Values', 'Search charms...', 'CHARM DETAILS'],
  eggs: ['EGG COLLECTION', 'Egg Values', 'Search eggs...', 'EGG DETAILS'],
  items: ['ITEM COLLECTION', 'Item Values', 'Search items...', 'ITEM DETAILS'],
  codes: ['BONUS CODES', 'Code Values', 'Search codes...', 'CODE DETAILS'],
};

const sortNames = {
  featured: 'Featured',
  name: 'Name A-Z',
  'best-desc': 'Best % high-low',
  'best-asc': 'Best % low-high',
  rarity: 'Rarity',
};

const state = {
  view: 'home',
  category: 'pets',
  variant: 'normal',
  query: '',
  sort: 'featured',
  modalItem: null,
  modalVariant: 'normal',
  modalRange: '24h',
  calcPickerSide: 'left',
  calcPickerCategory: 'pets',
  calcPickerQuery: '',
  calc: { left: [], right: [], leftTickets: 0, rightTickets: 0 },
};

let historyController = null;
let historyRequestId = 0;
let calcMotionCache = { leftTotal: null, rightTotal: null, diff: null, leftTickets: 0, rightTickets: 0, verdict: 'fair' };

const calcCategories = ['pets', 'charms', 'eggs', 'items'];

function calcFindItem(category, id) {
  return (catalogs[category] || []).find(item => item.id === id) || null;
}

function parseNumericValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/,/g, '').toUpperCase();
  const match = normalized.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(K|M|B|T|QA|QI|SX|SP|OC)?$/);
  if (!match) return null;
  const multipliers = { K:1e3, M:1e6, B:1e9, T:1e12, QA:1e15, QI:1e18, SX:1e21, SP:1e24, OC:1e27 };
  const numeric = Number(match[1]) * (multipliers[match[2]] || 1);
  return Number.isFinite(numeric) ? numeric : null;
}

function calcNumericValue(item, variant = 'normal') {
  return parseNumericValue(valueFor(item, variant)) ?? 0;
}

function switchView(view) {
  if (!['home', 'values', 'calculator'].includes(view)) return;
  state.view = view;
  render();
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
  if (value == null) return 'Set value';
  if (typeof value === 'string') return value;
  return new Intl.NumberFormat('en-US').format(value);
}

function formatItemValue(item, variant = state.variant) {
  if (!item.supportsVariants && item.displayValue) return item.displayValue;
  return formatValue(valueFor(item, variant));
}

function formatChartValue(value) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1).replace(/\.0$/, '')}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K`;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

function formatSignedValue(value) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '-'}${formatChartValue(Math.abs(value))}`;
}

function formatRelativeTime(input) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return 'Updated recently';
  const diffMs = Date.now() - date.getTime();
  const future = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / 60000);
  if (minutes < 1) return future ? 'Updated in a moment' : 'Updated just now';
  if (minutes < 60) return `Updated ${future ? 'in ' : ''}${minutes}m${future ? '' : ' ago'}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${future ? 'in ' : ''}${hours}h${future ? '' : ' ago'}`;
  const days = Math.round(hours / 24);
  return `Updated ${future ? 'in ' : ''}${days}d${future ? '' : ' ago'}`;
}

function refreshHomeUpdated() {
  const el = $('#homeUpdated');
  if (!el) return;
  el.textContent = formatRelativeTime(LAST_UPDATED);
}

function fallbackHistoryPoint(item, variant = state.modalVariant) {
  const value = parseNumericValue(valueFor(item, variant));
  return Number.isFinite(value) ? [{ timestamp: Date.now(), value }] : [];
}

function normalizeHistoryPoints(points = []) {
  return points
    .map(point => ({
      timestamp: Number(point.timestamp ?? point.captured_at),
      value: Number(point.value),
    }))
    .filter(point => Number.isFinite(point.timestamp) && Number.isFinite(point.value))
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
  historyArea.hidden = false;
  const currentValue = parseNumericValue(valueFor(item, state.modalVariant));
  const fallback = fallbackHistoryPoint(item, state.modalVariant);
  renderHistoryStats(fallback, currentValue);
  updateHistoryTimestamp(fallback);
  $('#historyHint').textContent = 'Connecting to value history…';
  setHistoryStatus('Loading', 'loading');

  historyController?.abort();
  historyController = new AbortController();
  const requestId = ++historyRequestId;

  try {
    const params = new URLSearchParams({
      category: state.category,
      id: item.id,
      variant: state.modalVariant,
      range: state.modalRange,
    });
    const response = await fetch(`/api/history?${params}`, { signal: historyController.signal, headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`History API ${response.status}`);
    const payload = await response.json();
    if (requestId !== historyRequestId || state.modalItem?.id !== item.id) return;

    const points = normalizeHistoryPoints(payload.points);
    const usablePoints = points.length ? points : fallback;
    const apiCurrent = Number.isFinite(payload.current) ? payload.current : currentValue;
    renderHistoryStats(usablePoints, apiCurrent);
    updateHistoryTimestamp(usablePoints);

    if (payload.available === false) {
      setHistoryStatus('D1 not connected', 'offline');
      $('#historyHint').textContent = 'Add a Cloudflare D1 binding named VALUES_DB. The frontend is already ready for shared history.';
    } else if (!Number.isFinite(apiCurrent)) {
      setHistoryStatus('Value not set', 'offline');
      $('#historyHint').textContent = 'This item has no numeric value yet. Set one in catalog.js and deploy again.';
    } else if (points.length <= 1) {
      setHistoryStatus('First snapshot', 'neutral');
      $('#historyHint').textContent = 'The first D1 snapshot is saved. Change the value and deploy again to create the first trend.';
    } else {
      const trendDelta = points.at(-1).value - points.at(-2).value;
      const trendMode = trendDelta > 0 ? 'up' : trendDelta < 0 ? 'down' : 'live';
      const trendLabel = trendDelta > 0 ? '▲ Rising' : trendDelta < 0 ? '▼ Falling' : `${points.length} snapshots`;
      setHistoryStatus(trendLabel, trendMode);
      $('#historyHint').textContent = `Showing ${state.modalRange.toUpperCase()} movement from Cloudflare D1. Change is calculated from the two latest snapshots.`;
    }
  } catch (error) {
    if (error?.name === 'AbortError') return;
    if (requestId !== historyRequestId) return;
    setHistoryStatus('Local preview', 'offline');
    $('#historyHint').textContent = 'Cloudflare API is not active in this preview. The current value is shown; deploy and connect D1 to collect history.';
  }
}

function formatExists(exists) {
  return exists == null ? '' : `${new Intl.NumberFormat('en-US').format(exists)} exist`;
}

function supportsVariant(item, variant) {
  if (variant === 'normal') return true;
  return Boolean(item.supportsVariants && item.variantImages?.[variant]);
}

function imageFor(item, variant = state.variant) {
  if (item.id === 'pop-cat') return 'assets/pets/pop-cat-normal-v30.webp';
  if (item.supportsVariants) return item.variantImages?.[variant] || item.variantImages?.normal || null;
  return item.image || null;
}

function valueFor(item, variant = state.variant) {
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

  if (query) {
    list = list.filter(item => [
      item.name,
      item.rarity,
      item.source,
      item.description,
      item.note,
      item.map,
      item.hatchChance,
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }

  if (state.sort === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name));
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
    <img class="pop-frame normal" src="assets/pets/pop-cat-normal-v30.webp" alt="Pop Cat" loading="lazy" decoding="async" fetchpriority="low">
    <img class="pop-frame scream" src="assets/pets/pop-cat-scream-v30.webp" alt="Pop Cat animated frame" loading="lazy" decoding="async" fetchpriority="low">
  </div>`;
}

function card(item, index = 0) {
  const color = rarityColor(item);
  const art = isAnimated(item)
    ? animatedPopMarkup('card')
    : `<img class="card-image" src="${imageFor(item)}" alt="${item.name}" loading="lazy" decoding="async" fetchpriority="low">`;

  return `<article class="value-card rarity-${raritySlug(item)}" data-id="${item.id}" data-rarity="${raritySlug(item)}" style="--rarity:${color};--rarity-gradient:${gradientFor(item)};--delay:${Math.min(index, 12) * 24}ms;">
    <button class="card-button" type="button" aria-label="Open ${item.name}">
      <div class="card-art">
        <div class="card-ambient"></div>
        <span class="render-reflection" aria-hidden="true"></span>
        <span class="render-floor" aria-hidden="true"></span>
        <div class="card-badges">
          <span class="rarity-badge"><i></i><span class="rarity-text">${rarityFor(item)}</span></span>
          ${item.bestPct != null ? `<span class="best-badge">${item.bestPct}% Best Pet</span>` : ''}
        </div>
        ${item.eventBadge ? `<span class="event-badge">${item.eventBadge}</span>` : ''}
        ${isAnimated(item) ? '<span class="animated-badge card-animated-badge">▶ Animated</span>' : ''}
        ${item.exists != null ? `<span class="exists-badge">${formatExists(item.exists)}</span>` : ''}
        ${art}
      </div>
      <div class="card-bottom">
        <div class="card-title">${item.name}</div>
        <div class="card-value-row">
          <span>VALUE</span>
          <span class="set-value"><img src="${ticket}" alt=""><strong>${formatItemValue(item)}</strong></span>
        </div>
      </div>
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

function renderCodes(list) {
  return `<div class="codes-list">${list.map((item, index) => {
    const status = String(item.status || 'active').toLowerCase();
    const expired = status === 'expired';
    return `
    <article class="code-row ${expired ? 'is-expired' : 'is-active'}" data-id="${item.id}" style="--delay:${Math.min(index, 12) * 34}ms;">
      <div class="code-row-main">
        <strong class="code-row-code">${item.code}</strong>
      </div>
      <span class="code-row-status"><i></i>${expired ? 'Expired' : 'Active'}</span>
      <button class="code-copy-button copy-code-btn" type="button" data-code="${item.code}" aria-label="${expired ? 'Expired code' : `Copy ${item.code}`}" ${expired ? 'disabled' : ''}>
        <span class="copy-icon">${expired ? '×' : '⧉'}</span>
        <strong>${expired ? 'Expired' : 'Copy code'}</strong>
      </button>
    </article>`;
  }).join('')}</div>`;
}

function render() {
  document.body.dataset.view = state.view;
  const homeView = $('#homeView');
  const valuesView = $('#valuesView');
  const calculatorView = $('#calculatorView');
  const categoryNav = $('#categoryNav');

  homeView.hidden = state.view !== 'home';
  valuesView.hidden = state.view !== 'values';
  calculatorView.hidden = state.view !== 'calculator';
  categoryNav.hidden = state.view !== 'values';

  refreshHomeUpdated();

  if (state.view === 'calculator') {
    renderCalculator();
    return;
  }
  if (state.view !== 'values') return;

  const list = filtered();
  const [kicker, title, placeholder] = categoryMeta[state.category];
  const petsMode = state.category === 'pets';

  $('#sectionKicker').textContent = kicker;
  $('#sectionTitle').textContent = title;
  $('#searchInput').placeholder = placeholder;
  $('#resultCount').textContent = `${list.length} ${list.length === 1 ? 'result' : 'results'}`;

  const variantTools = $('#variantTools');
  variantTools.hidden = !petsMode;
  $('.page-tools').classList.toggle('no-variants', !petsMode);

  const catalogLabel = $('#catalogLabel');
  catalogLabel.textContent = state.category === 'codes' ? '' : (petsMode ? 'Pet Collection' : title);
  catalogLabel.hidden = state.category === 'codes';
  $('.catalog-meta').classList.toggle('codes-meta', state.category === 'codes');

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

  const cardsGrid = $('#cardsGrid');
  cardsGrid.innerHTML = petsMode ? renderPets(list) : (state.category === 'codes' ? renderCodes(list) : renderCompact(list));
  if (!list.length) cardsGrid.innerHTML = '<div class="empty-results"><strong>No matches found</strong><p>Try another name or pet variant.</p><button type="button" id="clearFilters">Clear filters</button></div>';
  cardsGrid.classList.remove('category-swap');
  requestAnimationFrame(() => cardsGrid.classList.add('category-swap'));
  initCardTilt();
  observePerformanceNodes(cardsGrid);
}

function calcSideInfo(side) {
  const entries = state.calc[side] || [];
  const hasOC = entries.some(entry => {
    const item = calcFindItem(entry.category, entry.id);
    return typeof valueFor(item, entry.variant) === 'string';
  });
  const items = entries.reduce((sum, entry) => {
    const item = calcFindItem(entry.category, entry.id);
    return sum + calcNumericValue(item, entry.variant) * entry.qty;
  }, 0);
  const tickets = Math.max(0, Number(state.calc[`${side}Tickets`]) || 0);
  return { total: items + tickets, hasOC };
}

function calcEntryMarkup(side, entry) {
  const item = calcFindItem(entry.category, entry.id);
  if (!item) return '';
  const rawValue = valueFor(item, entry.variant);
  const numericValue = calcNumericValue(item, entry.variant) * entry.qty;
  const displayValue = typeof rawValue === 'string' ? rawValue : (item.displayValue ? formatChartValue(numericValue) : formatValue(numericValue));
  const image = imageFor(item, entry.variant);
  const variantName = entry.variant !== 'normal' ? entry.variant[0].toUpperCase() + entry.variant.slice(1) : '';
  return `<article class="trade-item-v40">
    <div class="trade-item-art-v40">
      <img src="${image}" alt="${item.name}" loading="lazy" decoding="async" fetchpriority="low">
      <span class="trade-item-qty-v40">x${entry.qty}</span>
    </div>
    <div class="trade-item-copy-v40">
      <strong>${item.name}</strong>
      <small>${variantName || rarityFor(item)}</small>
      <span><img src="${ticket}" alt="">${displayValue}</span>
    </div>
    <button class="trade-item-remove-v40" type="button" data-calc-remove="${side}" data-id="${entry.id}" data-variant="${entry.variant}" aria-label="Remove ${item.name}">×</button>
  </article>`;
}

function calcAddTile(side) {
  return `<button type="button" class="trade-add-v40" data-calc-open="${side}" aria-label="Add item to ${side} side">
    <span>+</span><strong>Add item</strong>
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
  void element.offsetWidth;
  element.classList.add(direction === 'up' ? 'metric-rise' : direction === 'down' ? 'metric-fall' : 'metric-neutral');
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

function renderCalculator() {
  $('#calcLeftList').innerHTML = state.calc.left.map(entry => calcEntryMarkup('left', entry)).join('') + calcAddTile('left');
  $('#calcRightList').innerHTML = state.calc.right.map(entry => calcEntryMarkup('right', entry)).join('') + calcAddTile('right');

  const leftInfo = calcSideInfo('left');
  const rightInfo = calcSideInfo('right');
  const left = leftInfo.total;
  const right = rightInfo.total;
  const diff = left - right;
  const gap = Math.abs(diff);
  const hasAnyOC = leftInfo.hasOC || rightInfo.hasOC;

  $('#calcLeftTickets').value = state.calc.leftTickets;
  $('#calcRightTickets').value = state.calc.rightTickets;
  animateMetric('#calcLeftTotal', leftInfo.hasOC ? `${formatValue(left)} + O/C` : formatValue(left), calcMotionCache.leftTotal == null ? 'neutral' : left > calcMotionCache.leftTotal ? 'up' : left < calcMotionCache.leftTotal ? 'down' : 'neutral');
  animateMetric('#calcRightTotal', rightInfo.hasOC ? `${formatValue(right)} + O/C` : formatValue(right), calcMotionCache.rightTotal == null ? 'neutral' : right > calcMotionCache.rightTotal ? 'up' : right < calcMotionCache.rightTotal ? 'down' : 'neutral');
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

  // Result is from My Offer perspective: giving more = L, receiving more = W.
  let verdictState = 'fair';
  if (diff > 0) {
    verdictState = 'lose';
    setTradeStatus('lose');
    centerVerdict.classList.add('is-lose');
    animateMetric(centerVerdict, `L -${formatValue(gap)}`, 'down');
    label.className = 'is-lose';
    animateMetric(label, `You give ${formatValue(gap)} more value${hasAnyOC ? ' · O/C excluded' : ''}`, 'down');
  } else if (diff < 0) {
    verdictState = 'win';
    setTradeStatus('win');
    centerVerdict.classList.add('is-win');
    animateMetric(centerVerdict, `W +${formatValue(gap)}`, 'up');
    label.className = 'is-win';
    animateMetric(label, `You receive ${formatValue(gap)} more value${hasAnyOC ? ' · O/C excluded' : ''}`, 'up');
  } else {
    verdictState = 'fair';
    setTradeStatus('fair');
    centerVerdict.classList.add('is-fair');
    animateMetric(centerVerdict, 'FAIR', 'neutral');
    label.className = 'is-fair';
    animateMetric(label, hasAnyOC ? 'Fair trade · O/C excluded' : 'Fair trade', 'neutral');
  }

  calcMotionCache.leftTotal = left;
  calcMotionCache.rightTotal = right;
  calcMotionCache.diff = gap;
  calcMotionCache.verdict = verdictState;
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
  state.calcPickerSide = side;
  state.calcPickerCategory = 'pets';
  state.calcPickerQuery = '';
  $('#calcPickerSearch').value = '';
  renderCalcPicker();
  $('#calcPickerModal').showModal();
}

function renderCalcPicker() {
  $$('#calcPickerTabs [data-calc-category]').forEach(button => {
    button.classList.toggle('active', button.dataset.calcCategory === state.calcPickerCategory);
  });
  const query = state.calcPickerQuery.trim().toLowerCase();
  const list = (catalogs[state.calcPickerCategory] || [])
    .filter(item => !query || `${item.name} ${item.rarity || ''}`.toLowerCase().includes(query));
  $('#calcPickerGrid').innerHTML = list.map(item => {
    const variants = state.calcPickerCategory === 'pets' && item.supportsVariants
      ? ['normal','golden','diamond'].filter(variant => item.variantImages?.[variant])
      : ['normal'];
    const chips = variants.map(variant => `<button type="button" class="calc-picker-variant" data-calc-pick="${item.id}" data-calc-variant="${variant}" data-calc-category-pick="${state.calcPickerCategory}">${variant === 'normal' ? 'Normal' : variant === 'golden' ? 'Golden' : 'Diamond'}</button>`).join('');
    return `<article class="calc-picker-card" data-rarity="${raritySlug(item)}" style="--picker-rarity:${rarityColor(item)};--rarity-gradient:${gradientFor(item)}">
      <div class="calc-picker-art"><img src="${imageFor(item)}" alt="${item.name}" loading="lazy" decoding="async" fetchpriority="low"></div>
      <div class="calc-picker-body">
        <strong class="calc-picker-name">${item.name}</strong>
        <div class="calc-picker-meta">
          <span class="calc-picker-rarity"><span class="rarity-text">${rarityFor(item)}</span></span>
          <small class="calc-picker-value"><img src="${ticket}" alt=""> ${formatItemValue(item)}</small>
        </div>
      </div>
      <div class="calc-picker-variants">${chips}</div>
    </article>`;
  }).join('') || '<div class="calc-picker-empty">No matches found.</div>';
}

function addCalcItem(side, category, id, variant = 'normal') {
  const item = calcFindItem(category, id);
  if (!item) return;
  const entries = state.calc[side];
  const existing = entries.find(entry => entry.category === category && entry.id === id && entry.variant === variant);
  if (existing) existing.qty += 1;
  else entries.push({ category, id, variant, qty: 1 });
  renderCalculator();
}

function removeCalcItem(side, id, variant) {
  const entries = state.calc[side];
  const existing = entries.find(entry => entry.id === id && entry.variant === variant);
  if (!existing) return;
  if (existing.qty > 1) existing.qty -= 1;
  else state.calc[side] = entries.filter(entry => !(entry.id === id && entry.variant === variant));
  renderCalculator();
}

function initCardTilt() {
  if (lowPowerDevice || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  $$('.card-button').forEach(button => {
    let frame;
    button.addEventListener('pointermove', event => {
      if (!motionAllowed() || event.pointerType === 'touch') return;
      const clientX = event.clientX, clientY = event.clientY;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
      if (!button.isConnected) return;
      const rect = button.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      button.style.setProperty('--mx', `${x * 100}%`);
      button.style.setProperty('--my', `${y * 100}%`);
      button.style.setProperty('--rx', `${(0.5 - y) * 6}deg`);
      button.style.setProperty('--ry', `${(x - 0.5) * 7}deg`);
      });
    });
    button.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      button.style.setProperty('--rx', '0deg');
      button.style.setProperty('--ry', '0deg');
    });
  });
}

function switchCategory(category) {
  if (!catalogs[category]) return;
  const main = $('.main');
  main.classList.remove('category-switching');
  requestAnimationFrame(() => main.classList.add('category-switching'));
  state.view = 'values';
  state.category = category;
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
  setTimeout(() => main.classList.remove('category-switching'), 380);
}

function dropSourcesMarkup(sources = []) {
  return sources.map(source => `<div class="drop-source-card">
    <img src="${source.image}" alt="${source.name}" loading="lazy" decoding="async" fetchpriority="low">
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
  $('#modalRarity').innerHTML = `<i></i><span class="rarity-text">${rarityFor(item)}</span>`;
  $('#modalBest').textContent = item.bestPct != null ? `${item.bestPct}% Best Pet` : '';
  $('#modalBest').hidden = item.bestPct == null;
  $('#modalEventBadge').textContent = item.eventBadge || '';
  $('#modalEventBadge').hidden = !item.eventBadge;
  $('#modalTitle').textContent = item.name;
  $('#modalDescription').textContent = item.description || item.source || '';
  $('#modalSource').textContent = item.source || '—';

  const isCode = state.category === 'codes';
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
  $('#modalExistsRow').hidden = isCode || item.exists == null;
  $('#modalExists').textContent = item.exists != null ? new Intl.NumberFormat('en-US').format(item.exists) : '';

  $('#modalDropArea').hidden = isCode || !item.dropSources?.length;
  $('#modalSourceGallery').innerHTML = item.dropSources?.length ? dropSourcesMarkup(item.dropSources) : '';
  $('#modalVariantArea').hidden = !(state.category === 'pets' && item.supportsVariants);
  $('#modalAnimatedBadge').hidden = !isAnimated(item);
  $('#modalNote').hidden = !(item.note || isCode);
  $('#modalNote').textContent = isCode ? 'Use the copy button on the code card, then redeem it in game.' : (item.note || '');

  $('#modalValueLabel').textContent = isCode ? 'Code' : 'Value';
  $('#modalValueIcon').src = isCode ? 'assets/ui/category-codes-ui.webp' : 'assets/items/value-ticket.png';
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
    modalImage.src = imageFor(item, state.modalVariant);
    modalImage.alt = item.name;
    modalImage.classList.remove('pop-in');
    void modalImage.offsetWidth;
    modalImage.classList.add('pop-in');
  }

  $('#modalValue').textContent = state.category === 'codes' ? item.code : formatItemValue(item, state.modalVariant);
  if (state.category !== 'codes') loadValueHistory();
}

function closeModal() {
  historyController?.abort();
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

document.addEventListener('click', event => {
  if (event.target.closest('#clearFilters')) {
    state.query = ''; state.variant = 'normal';
    $('#searchInput').value = ''; render(); $('#searchInput').focus(); return;
  }
  const copyButton = event.target.closest('.copy-code-btn');
  if (copyButton) {
    event.preventDefault();
    event.stopPropagation();
    copyText(copyButton.dataset.code || '').then(ok => {
      const strong = copyButton.querySelector('strong');
      if (!strong) return;
      const previous = strong.textContent;
      strong.textContent = ok ? 'Copied!' : 'Copy failed';
      setTimeout(() => { strong.textContent = previous; }, 1200);
    });
    return;
  }

  const viewTarget = event.target.closest('[data-view-target]');
  if (viewTarget) {
    toggleSortMenu(false);
    switchView(viewTarget.dataset.viewTarget);
    return;
  }

  const nav = event.target.closest('[data-category]');
  if (nav) {
    toggleSortMenu(false);
    switchCategory(nav.dataset.category);
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

  const calcRemove = event.target.closest('[data-calc-remove]');
  if (calcRemove) {
    removeCalcItem(calcRemove.dataset.calcRemove, calcRemove.dataset.id, calcRemove.dataset.variant);
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
  render();
});

$('#calcPickerSearch').addEventListener('input', event => {
  state.calcPickerQuery = event.target.value;
  renderCalcPicker();
});

$('#calcLeftTickets').addEventListener('input', event => {
  const next = Math.max(0, Number(event.target.value) || 0);
  flashTicketInput(event.target, next > state.calc.leftTickets ? 'up' : next < state.calc.leftTickets ? 'down' : 'neutral');
  state.calc.leftTickets = next;
  renderCalculator();
});

$('#calcRightTickets').addEventListener('input', event => {
  const next = Math.max(0, Number(event.target.value) || 0);
  flashTicketInput(event.target, next > state.calc.rightTickets ? 'up' : next < state.calc.rightTickets ? 'down' : 'neutral');
  state.calc.rightTickets = next;
  renderCalculator();
});

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

const savedTheme = readSetting('pet-universe-theme');
if (savedTheme === 'dark' || savedTheme === 'light') {
  document.documentElement.dataset.theme = savedTheme;
}

function syncTheme() {
  $('#themeLabel').textContent = document.documentElement.dataset.theme === 'dark' ? 'Dark mode' : 'Light mode';
}

$('#themeToggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  writeSetting('pet-universe-theme', next);
  syncTheme();
});

let petTapTimer;
$('#modalArtShell').addEventListener('click', () => {
  if (!motionAllowed()) return;
  const art = $('#modalArtShell');
  clearTimeout(petTapTimer); art.classList.remove('pet-tap'); void art.offsetWidth; art.classList.add('pet-tap');
  petTapTimer = setTimeout(() => art.classList.remove('pet-tap'), 700);
});
$('#motionToggle').addEventListener('click', () => {
  animationsPaused = !animationsPaused; syncMotion(); writeSetting('pet-universe-motion', animationsPaused ? 'off' : 'on');
});
reducedMotion.addEventListener('change', event => { if (event.matches) { animationsPaused = true; syncMotion(); } });
document.addEventListener('visibilitychange', () => { document.documentElement.toggleAttribute('data-page-hidden', document.hidden); });
document.addEventListener('pointerdown', event => {
  if (!motionAllowed() || lowPowerDevice || !event.target.closest('button')) return;
  const dialog = event.target.closest('dialog');
  for (let i = 0; i < 5; i++) {
    const spark = document.createElement('i'); spark.className = 'click-ember';
    const angle = Math.PI * 2 * i / 5;
    spark.style.cssText = `left:${event.clientX}px;top:${event.clientY}px;--sx:${Math.cos(angle)*25}px;--sy:${Math.sin(angle)*25}px`;
    if (dialog) { const rect = dialog.getBoundingClientRect(); spark.style.position = 'absolute'; spark.style.left = `${event.clientX-rect.left}px`; spark.style.top = `${event.clientY-rect.top+dialog.scrollTop}px`; }
    (dialog || document.body).append(spark); setTimeout(() => spark.remove(), 550);
  }
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
const performanceObserved = new WeakSet();
const performanceObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  for (const entry of entries) entry.target.classList.toggle('perf-offscreen', !entry.isIntersecting);
}, { rootMargin: '260px 0px 260px 0px', threshold: 0.01 }) : null;

function optimizeImage(img) {
  if (!(img instanceof HTMLImageElement)) return;
  img.decoding = 'async';
  img.draggable = false;
  if (!img.closest('.home-v40-orbit,.brand-icon')) img.loading = 'lazy';
}

function observePerformanceNodes(root = document) {
  const selector = '.value-card,.rarity-section,.calc-picker-card,.trade-item-v40,.credits-marquee,.home-v40-card';
  const nodes = root.matches?.(selector) ? [root] : [...root.querySelectorAll?.(selector) || []];
  for (const node of nodes) {
    if (performanceObserver && !performanceObserved.has(node)) {
      performanceObserved.add(node);
      performanceObserver.observe(node);
    }
  }
  if (root instanceof HTMLImageElement) optimizeImage(root);
  root.querySelectorAll?.('img').forEach(optimizeImage);
}

observePerformanceNodes(document);
const perfMutationObserver = new MutationObserver(records => {
  for (const record of records) for (const node of record.addedNodes) {
    if (node.nodeType === 1) observePerformanceNodes(node);
  }
});
perfMutationObserver.observe(document.body, { childList: true, subtree: true });

syncMotion();
syncTheme();
refreshHomeUpdated();
setInterval(refreshHomeUpdated, 60000);
render();
const runSnapshotSync = () => fetch('/api/snapshot', { method: 'POST', headers: { accept: 'application/json' } }).catch(() => {});
if ('requestIdleCallback' in window) requestIdleCallback(runSnapshotSync, { timeout: 2600 });
else setTimeout(runSnapshotSync, 900);


function enableAssetProtection() {
  const protectedSelector = '.brand-card img, .card-art, .card-art img, .modal-art-shell, .modal-art-shell img, .calc-picker-art, .calc-picker-art img, .home-v40-orbit img, .drop-source-card img';
  document.querySelectorAll('img').forEach(img => {
    img.setAttribute('draggable', 'false');
    img.setAttribute('loading', img.getAttribute('loading') || 'lazy');
  });
  document.addEventListener('dragstart', event => {
    if (event.target.closest(protectedSelector)) event.preventDefault();
  });
  document.addEventListener('contextmenu', event => {
    event.preventDefault();
  });
  document.addEventListener('copy', event => {
    if (document.activeElement && document.activeElement.closest && document.activeElement.closest(protectedSelector)) event.preventDefault();
  });
}

enableAssetProtection();
