import { PETS, CHARMS, EGGS, ITEMS, CODES, RARITY_ORDER } from './data/catalog.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const ticket = 'assets/items/value-ticket.png';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
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


const calcCategories = ['pets', 'charms', 'eggs', 'items'];

function calcFindItem(category, id) {
  return (catalogs[category] || []).find(item => item.id === id) || null;
}

function calcNumericValue(item, variant = 'normal') {
  const value = Number(valueFor(item, variant));
  return Number.isFinite(value) ? value : 0;
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

function formatHistoryTime(timestamp, range = state.modalRange) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  if (range === '1h' || range === '6h' || range === '24h') {
    return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  }
  if (range === '7d' || range === '30d') {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
  }
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: '2-digit' }).format(date);
}

function fallbackHistoryPoint(item, variant = state.modalVariant) {
  const value = valueFor(item, variant);
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
  const latest = Number.isFinite(currentValue) ? currentValue : null;
  $('#historyCurrent').textContent = Number.isFinite(latest) ? formatChartValue(latest) : '—';
  $('#historyCurrentMeta').textContent = Number.isFinite(latest) ? 'Current catalog value' : 'Numeric value not set';
  $('#historyHigh').textContent = values.length ? formatChartValue(Math.max(...values)) : '—';
  $('#historyLow').textContent = values.length ? formatChartValue(Math.min(...values)) : '—';

  const changeEl = $('#historyChange');
  const amountEl = $('#historyChangeAmount');
  changeEl.className = 'is-neutral';

  if (values.length < 2) {
    changeEl.textContent = '—';
    amountEl.textContent = values.length ? 'Waiting for a value change' : 'No numeric snapshot';
    return;
  }

  const first = values[0];
  const last = values.at(-1);
  const amount = last - first;
  const pct = first !== 0 ? (amount / Math.abs(first)) * 100 : null;
  const trendClass = amount > 0 ? 'is-up' : amount < 0 ? 'is-down' : 'is-neutral';
  const trendArrow = amount > 0 ? '▲' : amount < 0 ? '▼' : '•';
  changeEl.className = trendClass;
  changeEl.textContent = pct == null ? '—' : `${trendArrow} ${pct > 0 ? '+' : ''}${pct.toFixed(Math.abs(pct) >= 100 ? 0 : 1)}%`;
  amountEl.className = trendClass;
  amountEl.textContent = amount === 0 ? 'No change' : `${trendArrow} ${formatSignedValue(amount)} value`;
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

function hideHistoryTooltip() {
  const tooltip = $('#historyTooltip');
  if (tooltip) tooltip.hidden = true;
  const crosshair = $('#historyChart .history-crosshair');
  if (crosshair) crosshair.setAttribute('opacity', '0');
}

function bindHistoryChartInteraction(clean, coords, left, width, right) {
  const svg = $('#historyChart');
  const shell = $('#historyChartShell');
  const tooltip = $('#historyTooltip');
  const tooltipValue = $('#historyTooltipValue');
  const tooltipTime = $('#historyTooltipTime');
  if (!svg || !shell || !tooltip || !clean.length) return;

  const viewWidth = width;
  const plotRight = width - right;

  const showAtClientX = clientX => {
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return;
    const svgX = ((clientX - rect.left) / rect.width) * viewWidth;
    const clampedX = Math.max(left, Math.min(plotRight, svgX));

    let bestIndex = 0;
    let bestDistance = Infinity;
    coords.forEach(([x], index) => {
      const distance = Math.abs(x - clampedX);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    const [x, y] = coords[bestIndex];
    const point = clean[bestIndex];
    const crosshair = svg.querySelector('.history-crosshair');
    const focus = svg.querySelector('.history-focus-dot');
    if (crosshair) {
      crosshair.setAttribute('x1', x.toFixed(2));
      crosshair.setAttribute('x2', x.toFixed(2));
      crosshair.setAttribute('opacity', '1');
    }
    if (focus) {
      focus.setAttribute('cx', x.toFixed(2));
      focus.setAttribute('cy', y.toFixed(2));
      focus.setAttribute('opacity', '1');
    }

    tooltipValue.textContent = formatChartValue(point.value);
    tooltipTime.textContent = new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(point.timestamp));

    const shellRect = shell.getBoundingClientRect();
    const pageX = rect.left - shellRect.left + (x / viewWidth) * rect.width;
    const pageY = rect.top - shellRect.top + (y / 260) * rect.height;
    tooltip.hidden = false;
    const desiredLeft = Math.max(8, Math.min(shellRect.width - 138, pageX - 65));
    const desiredTop = Math.max(8, pageY - 72);
    tooltip.style.left = `${desiredLeft}px`;
    tooltip.style.top = `${desiredTop}px`;
  };

  svg.onpointermove = event => showAtClientX(event.clientX);
  svg.onpointerdown = event => showAtClientX(event.clientX);
  svg.onpointerleave = () => {
    tooltip.hidden = true;
    const crosshair = svg.querySelector('.history-crosshair');
    const focus = svg.querySelector('.history-focus-dot');
    if (crosshair) crosshair.setAttribute('opacity', '0');
    if (focus) focus.setAttribute('opacity', '0');
  };
}

function renderHistoryChart(points, item) {
  const svg = $('#historyChart');
  const empty = $('#historyEmpty');
  const clean = normalizeHistoryPoints(points);
  svg.innerHTML = '';
  hideHistoryTooltip();
  updateHistoryTimestamp(clean);

  if (!clean.length) {
    svg.hidden = true;
    empty.hidden = false;
    empty.innerHTML = `
      <div class="history-empty-icon">⌁</div>
      <strong>No numeric history yet</strong>
      <span>Set a numeric value in <code>public/data/catalog.js</code>. The first page visit after deploy will save it to D1 automatically.</span>`;
    return;
  }

  svg.hidden = false;
  empty.hidden = true;

  const width = 640;
  const height = 260;
  const left = 62;
  const right = 18;
  const top = 20;
  const bottom = 42;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const values = clean.map(point => point.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = Math.max(rawMax - rawMin, Math.max(Math.abs(rawMax), 1) * .08);
  const min = Math.max(0, rawMin - spread * .24);
  const max = rawMax + spread * .24;
  const timeMin = clean[0].timestamp;
  const timeMax = clean.at(-1).timestamp;
  const timeSpan = Math.max(timeMax - timeMin, 1);

  const xFor = time => clean.length === 1 ? left + plotW / 2 : left + ((time - timeMin) / timeSpan) * plotW;
  const yFor = value => top + (1 - ((value - min) / Math.max(max - min, 1))) * plotH;

  const grid = Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    const y = top + ratio * plotH;
    const value = max - ratio * (max - min);
    return `<g class="history-grid-line">
      <line x1="${left}" x2="${width-right}" y1="${y.toFixed(2)}" y2="${y.toFixed(2)}"/>
      <text x="${left-10}" y="${(y+4).toFixed(2)}" text-anchor="end">${formatChartValue(value)}</text>
    </g>`;
  }).join('');

  const labelIndices = clean.length === 1
    ? [0]
    : [0, Math.round((clean.length - 1) / 3), Math.round((clean.length - 1) * 2 / 3), clean.length - 1];
  const seen = new Set();
  const labels = labelIndices
    .filter(index => !seen.has(index) && seen.add(index))
    .map(index => {
      const point = clean[index];
      return `<text class="history-x-label" x="${xFor(point.timestamp).toFixed(2)}" y="${height-12}" text-anchor="${index === 0 && clean.length > 1 ? 'start' : index === clean.length - 1 && clean.length > 1 ? 'end' : 'middle'}">${formatHistoryTime(point.timestamp)}</text>`;
    }).join('');

  const coords = clean.map(point => [xFor(point.timestamp), yFor(point.value)]);
  const linePath = coords.map(([x, y], index) => `${index ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const areaPath = clean.length > 1
    ? `${linePath} L ${coords.at(-1)[0].toFixed(2)} ${(top+plotH).toFixed(2)} L ${coords[0][0].toFixed(2)} ${(top+plotH).toFixed(2)} Z`
    : '';
  const dots = coords.map(([x, y], index) => {
    const last = index === clean.length - 1;
    return `<circle class="history-point${last ? ' is-last' : ''}" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${last ? 5.5 : 3.2}"/>`;
  }).join('');

  const singleGuide = clean.length === 1
    ? `<line class="history-single-guide" x1="${left}" x2="${width-right}" y1="${coords[0][1].toFixed(2)}" y2="${coords[0][1].toFixed(2)}"/>`
    : '';
  const singleLabel = clean.length === 1
    ? `<g class="history-first-snapshot">
        <rect x="${Math.max(left, coords[0][0]-74).toFixed(2)}" y="${Math.max(top, coords[0][1]-48).toFixed(2)}" width="148" height="30" rx="11"/>
        <text x="${coords[0][0].toFixed(2)}" y="${Math.max(top+19, coords[0][1]-28).toFixed(2)}" text-anchor="middle">First snapshot · ${formatChartValue(clean[0].value)}</text>
      </g>`
    : '';

  const safeId = String(item?.id || 'value').replace(/[^a-z0-9_-]/gi, '');
  const trendDelta = clean.length > 1 ? clean.at(-1).value - clean[0].value : 0;
  const trendMode = trendDelta > 0 ? 'up' : trendDelta < 0 ? 'down' : 'neutral';
  const palette = trendMode === 'up'
    ? ['#4dff96', '#12d76e', '#6effb0']
    : trendMode === 'down'
      ? ['#ff7a7a', '#ff4343', '#ff9a9a']
      : paletteFor(item);
  const lineStops = palette.map((color, index) => {
    const offset = palette.length === 1 ? 0 : (index / (palette.length - 1)) * 100;
    return `<stop offset="${offset.toFixed(1)}%" stop-color="${color}"/>`;
  }).join('');

  svg.innerHTML = `
    <defs>
      <linearGradient id="historyLine-${safeId}" x1="0" y1="0" x2="1" y2="0">${lineStops}</linearGradient>
      <linearGradient id="historyArea-${safeId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${palette[0]}" stop-opacity=".30"/>
        <stop offset="100%" stop-color="${palette.at(-1)}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${grid}
    ${labels}
    ${singleGuide}
    ${areaPath ? `<path class="history-area is-${trendMode}" d="${areaPath}" fill="url(#historyArea-${safeId})"/>` : ''}
    ${clean.length > 1 ? `<path class="history-line is-${trendMode}" d="${linePath}" stroke="url(#historyLine-${safeId})"/>` : ''}
    ${coords.map(([x, y], index) => {
      const last = index === clean.length - 1;
      return `<circle class="history-point is-${trendMode}${last ? ' is-last' : ''}" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${last ? 5.8 : 3.4}"/>`;
    }).join('')}
    ${singleLabel}
    <line class="history-crosshair" x1="${left}" x2="${left}" y1="${top}" y2="${top+plotH}" opacity="0"/>
    <circle class="history-focus-dot is-${trendMode}" cx="${coords.at(-1)[0].toFixed(2)}" cy="${coords.at(-1)[1].toFixed(2)}" r="6" opacity="0"/>`;

  svg.setAttribute('aria-label', `${item?.name || 'Item'} value history. ${clean.length} snapshot${clean.length === 1 ? '' : 's'}.`);
  bindHistoryChartInteraction(clean, coords, left, width, right);
}

async function loadValueHistory() {
  const item = state.modalItem;
  if (!item || state.category === 'codes') return;

  const historyArea = $('#modalHistoryArea');
  historyArea.hidden = false;
  const currentValue = valueFor(item, state.modalVariant);
  const fallback = fallbackHistoryPoint(item, state.modalVariant);
  renderHistoryStats(fallback, currentValue);
  renderHistoryChart(fallback, item);
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
    renderHistoryChart(usablePoints, item);

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
      const trendDelta = points.at(-1).value - points[0].value;
      const trendMode = trendDelta > 0 ? 'up' : trendDelta < 0 ? 'down' : 'live';
      const trendLabel = trendDelta > 0 ? '▲ Rising' : trendDelta < 0 ? '▼ Falling' : `${points.length} snapshots`;
      setHistoryStatus(trendLabel, trendMode);
      $('#historyHint').textContent = `Showing ${state.modalRange.toUpperCase()} history from Cloudflare D1. Hover or tap the chart to inspect a snapshot.`;
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
  if (item.id === 'pop-cat') return 'assets/pets/pop-cat-normal-v30.png';
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
    <img class="pop-frame normal" src="assets/pets/pop-cat-normal-v30.png" alt="Pop Cat" loading="lazy">
    <img class="pop-frame scream" src="assets/pets/pop-cat-scream-v30.png" alt="Pop Cat animated frame" loading="lazy">
  </div>`;
}

function card(item, index = 0) {
  const color = rarityColor(item);
  const art = isAnimated(item)
    ? animatedPopMarkup('card')
    : `<img class="card-image" src="${imageFor(item)}" alt="${item.name}" loading="lazy">`;

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
        ${isAnimated(item) ? '<span class="animated-badge card-animated-badge">▶ Animated</span>' : ''}
        ${item.exists != null ? `<span class="exists-badge">${formatExists(item.exists)}</span>` : ''}
        ${art}
      </div>
      <div class="card-bottom">
        <div class="card-title">${item.name}</div>
        <div class="card-value-row">
          <span>VALUE</span>
          <span class="set-value"><img src="${ticket}" alt=""><strong>${formatValue(valueFor(item))}</strong></span>
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
  void cardsGrid.offsetWidth;
  cardsGrid.classList.add('category-swap');
  initCardTilt();
}

function calcSideTotal(side) {
  const entries = state.calc[side] || [];
  const items = entries.reduce((sum, entry) => {
    const item = calcFindItem(entry.category, entry.id);
    return sum + calcNumericValue(item, entry.variant) * entry.qty;
  }, 0);
  return items + Math.max(0, Number(state.calc[`${side}Tickets`]) || 0);
}

function calcEntryMarkup(side, entry) {
  const item = calcFindItem(entry.category, entry.id);
  if (!item) return '';
  const value = calcNumericValue(item, entry.variant) * entry.qty;
  const image = imageFor(item, entry.variant);
  const variantName = entry.variant !== 'normal' ? entry.variant[0].toUpperCase() + entry.variant.slice(1) : '';
  return `<article class="trade-item-v40">
    <div class="trade-item-art-v40">
      <img src="${image}" alt="${item.name}">
      <span class="trade-item-qty-v40">x${entry.qty}</span>
    </div>
    <div class="trade-item-copy-v40">
      <strong>${item.name}</strong>
      <small>${variantName || rarityFor(item)}</small>
      <span><img src="${ticket}" alt="">${formatValue(value)}</span>
    </div>
    <button class="trade-item-remove-v40" type="button" data-calc-remove="${side}" data-id="${entry.id}" data-variant="${entry.variant}" aria-label="Remove ${item.name}">×</button>
  </article>`;
}

function calcAddTile(side) {
  return `<button type="button" class="trade-add-v40" data-calc-open="${side}" aria-label="Add item to ${side} side">
    <span>+</span><strong>Add item</strong>
  </button>`;
}

function renderCalculator() {
  $('#calcLeftList').innerHTML = state.calc.left.map(entry => calcEntryMarkup('left', entry)).join('') + calcAddTile('left');
  $('#calcRightList').innerHTML = state.calc.right.map(entry => calcEntryMarkup('right', entry)).join('') + calcAddTile('right');

  const left = calcSideTotal('left');
  const right = calcSideTotal('right');
  const diff = left - right;

  $('#calcLeftTotal').textContent = formatValue(left);
  $('#calcRightTotal').textContent = formatValue(right);
  $('#calcDifference').textContent = `${diff > 0 ? '+' : diff < 0 ? '-' : ''}${formatValue(Math.abs(diff))}`;

  const verdict = $('#calcVerdict');
  const label = $('#calcDifferenceLabel');
  verdict.className = 'calculator-v40-verdict';
  if (diff > 0) {
    verdict.classList.add('is-win');
    verdict.textContent = `W +${formatValue(diff)}`;
    label.className = 'is-win';
    label.textContent = `Left side W by ${formatValue(diff)} tickets`;
  } else if (diff < 0) {
    verdict.classList.add('is-lose');
    verdict.textContent = `L -${formatValue(Math.abs(diff))}`;
    label.className = 'is-lose';
    label.textContent = `Left side L by ${formatValue(Math.abs(diff))} tickets`;
  } else {
    verdict.textContent = 'Even trade';
    label.className = '';
    label.textContent = 'Even trade';
  }
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
    return `<article class="calc-picker-card" style="--picker-rarity:${rarityColor(item)};--rarity-gradient:${gradientFor(item)}">
      <div class="calc-picker-art"><img src="${imageFor(item)}" alt="${item.name}"></div>
      <strong>${item.name}</strong>
      <span class="calc-picker-rarity"><span class="rarity-text">${rarityFor(item)}</span></span>
      <small><img src="${ticket}" alt=""> ${formatValue(valueFor(item))}</small>
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
  void main.offsetWidth;
  main.classList.add('category-switching');
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
    <img src="${source.image}" alt="${source.name}">
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
  $('#modalValueIcon').src = isCode ? 'assets/ui/category-codes.png' : 'assets/items/value-ticket.png';
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

  $('#modalValue').textContent = state.category === 'codes' ? item.code : formatValue(valueFor(item, state.modalVariant));
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
  state.calc.leftTickets = Math.max(0, Number(event.target.value) || 0);
  renderCalculator();
});

$('#calcRightTickets').addEventListener('input', event => {
  state.calc.rightTickets = Math.max(0, Number(event.target.value) || 0);
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
  if (!motionAllowed() || !event.target.closest('button')) return;
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
syncMotion();
syncTheme();
render();
fetch('/api/snapshot', { method: 'POST', headers: { accept: 'application/json' } }).catch(() => {});
