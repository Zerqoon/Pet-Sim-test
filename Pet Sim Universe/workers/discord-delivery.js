export const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
export function messageGroups(events) {
  const groups = [];
  for (const event of events) {
    const embed = JSON.parse(event.payload).embeds[0];
    const size = [embed.title, embed.description, embed.footer?.text, embed.author?.name, ...(embed.fields || []).flatMap(f => [f.name, f.value])].reduce((n,s) => n + (s?.length || 0), 0);
    if (size > 5800) throw new Error('Discord embed is too large.');
    let group = groups.at(-1);
    if (!group || group.embeds.length >= 8 || group.size + size > 5800) { group = { ids: [], embeds: [], size: 0 }; groups.push(group); }
    group.ids.push(event.id); group.embeds.push(embed); group.size += size;
  }
  return groups;
}
export async function sendDiscord(fetcher, url, payload) {
  try {
    const response = await fetcher(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), redirect: 'manual', signal: AbortSignal.timeout(15000) });
    let retry = Number(response.headers.get('retry-after')) * 1000;
    const resetMs = response.headers.get('x-ratelimit-remaining') === '0' ? Number(response.headers.get('x-ratelimit-reset-after')) * 1000 : 0;
    if (response.status === 429) { const body = await response.json().catch(() => ({})); retry = Number(body.retry_after ?? (retry / 1000)) * 1000; }
    else await response.text().catch(() => {});
    return { ok: response.ok, status: response.status, retryMs: Number.isFinite(retry) && retry > 0 ? Math.max(1000,retry) : 60000, resetMs: Number.isFinite(resetMs) && resetMs > 0 ? resetMs : 0 };
  } catch { return { ok: false, status: 0, retryMs: 60000, resetMs: 0 }; }
}
