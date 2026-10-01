const UNITS = { K: 1e3, M: 1e6, B: 1e9, T: 1e12, QA: 1e15, QI: 1e18, SX: 1e21, SP: 1e24, OC: 1e27 };
const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 9 });
const percent = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

// Compare values, not spelling: 30000, "30K" and "30k" are the same price.
export function normalizePrice(value) {
  if (value == null || (typeof value === 'string' && /^(?:no\s*price|unpriced|unknown|n\/?a|[-—]|)$/i.test(value.trim()))) {
    return { key: 'unpriced', number: null, label: 'No Price' };
  }
  if (typeof value === 'string' && /^(?:o\s*\/\s*c|oc)$/i.test(value.trim())) {
    return { key: 'oc', number: null, label: 'O/C' };
  }
  let number = value;
  if (typeof value === 'string') {
    const match = value.trim().replace(/,/g, '').match(/^(\d+(?:\.\d+)?|\.\d+)\s*(K|M|B|T|QA|QI|SX|SP|OC)?$/i);
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

export function changePayload(before, after, observedAt) {
  const previous = before.price || normalizePrice(before.value);
  const current = after.price || normalizePrice(after.value);
  const variant = { normal: 'Normal', golden: 'Golden', diamond: 'Diamond' }[after.variant];
  const numeric = previous.number != null && current.number != null;
  const difference = numeric ? current.number - previous.number : null;
  const fields = [
    { name: 'Poprzednia cena', value: `**${previous.label}**`, inline: true },
    { name: 'Nowa cena', value: `**${current.label}**`, inline: true },
    { name: 'Wariant', value: `**${variant}**`, inline: true },
  ];
  if (difference != null) {
    const percentage = previous.number > 0 ? ` (${difference >= 0 ? '+' : ''}${percent.format(difference / previous.number * 100)}%)` : '';
    fields.push({ name: 'Zmiana', value: `**${difference >= 0 ? '+' : '−'}${normalizePrice(Math.abs(difference)).label}${percentage}**`, inline: true });
  }
  fields.push({ name: 'Kategoria / Rzadkość', value: `**${({ pets: 'Pet', charms: 'Charm', eggs: 'Egg', items: 'Item' })[after.category]} · ${after.rarity}**`, inline: true });
  fields.push({ name: 'Godzina zmiany · Polska', value: new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(observedAt)), inline: false });
  const embed = {
    title: `${after.name} · ${variant}`, description: `**${previous.label} → ${current.label}**\n${difference == null ? '🔄 Aktualizacja wyceny' : difference < 0 ? '📉 Spadek wartości' : '📈 Wzrost wartości'}`,
    color: difference == null ? 0xA66BFF : difference < 0 ? 0xF4728D : 0x5DE2AE,
    fields, timestamp: new Date(observedAt).toISOString(),
    footer: { text: 'Pet Universe Values • Ceny z Value List • czas wykrycia zmiany' },
  };
  if (after.image) embed.thumbnail = { url: after.image };
  return { username: 'Pet Universe Values', allowed_mentions: { parse: [] }, embeds: [embed] };
}

export function discordUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('DISCORD_WEBHOOK_URL is not configured.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'discord.com' || url.port || url.username || url.password || !/^\/api\/(?:v\d+\/)?webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url.pathname)) throw new Error('Invalid Discord webhook configuration.');
  url.hash = '';
  url.searchParams.set('wait', 'true');
  return url;
}
