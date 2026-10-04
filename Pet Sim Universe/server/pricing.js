import { normalizePrice } from '../public/data/price-core.js';
export { normalizePrice, catalogPriceRows, priceRevision, validateFeed } from '../public/data/price-core.js';
const percent = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function changePayload(before, after, observedAt, updatedAt = null) {
  const published = updatedAt && Number.isFinite(Date.parse(updatedAt));
  const changedAt = published ? Date.parse(updatedAt) : observedAt;
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
  fields.push({ name: 'Godzina zmiany · Polska', value: new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(changedAt)), inline: false });
  const embed = {
    title: `${after.name} · ${variant}`, description: `**${previous.label} → ${current.label}**\n${difference == null ? '🔄 Aktualizacja wyceny' : difference < 0 ? '📉 Spadek wartości' : '📈 Wzrost wartości'}`,
    color: difference == null ? 0xA66BFF : difference < 0 ? 0xF4728D : 0x5DE2AE,
    fields, timestamp: new Date(changedAt).toISOString(),
    footer: { text: `Pet Universe Values • Ceny z Value List • ${published ? 'czas aktualizacji cen' : 'czas wykrycia zmiany'}` },
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
