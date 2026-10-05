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
  const change = difference == null ? 'Value updated' : `${difference < 0 ? 'Down' : 'Up'} ${normalizePrice(Math.abs(difference)).label}${previous.number > 0 ? ` (${percent.format(Math.abs(difference / previous.number * 100))}%)` : ''}`;
  const safeName = after.name.replace(/[\\*_~`|<>@]/g, '').slice(0, 180);
  const embed = {
    title: `${safeName}${after.variant !== 'normal' ? ` · ${variant}` : ''}`,
    description: `**${previous.label} → ${current.label}**\n${change}`,
    color: difference == null ? 0xA66BFF : difference < 0 ? 0xF4728D : 0x5DE2AE,
    timestamp: new Date(changedAt).toISOString(),
    footer: { text: `Pet Universe Values • ${published ? 'Values updated' : 'Change detected'}` },
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
