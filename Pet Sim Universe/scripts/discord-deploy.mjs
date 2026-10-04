import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { discordUrl } from '../server/pricing.js';
import { parseJsonList, pause } from './discord-tools.mjs';

export function cleanMonitorConfig(original, deployment) {
  const config = structuredClone(original);
  config.vars = { ...config.vars, MONITOR_DEPLOYMENT: deployment };
  // Legacy configs may contain a placeholder or old key as a plaintext var.
  // It must never shadow the key installed through the Secrets API.
  delete config.vars.MONITOR_KEY;
  delete config.vars.DISCORD_WEBHOOK_URL;
  return config;
}

export async function waitForMonitor(url, key, deployment, {
  fetcher = fetch, timeout = 180000, delay = 3000, clock = Date.now, wait = pause,
} = {}) {
  const started = clock();
  let reason = 'brak odpowiedzi nowej wersji';
  do {
    try {
      const endpoint = new URL('/auth', url); endpoint.searchParams.set('check', String(clock()));
      const response = await fetcher(endpoint.href, { headers: { authorization: `Bearer ${key}` },
        cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(12000) });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.authorized && result.version === 115 && result.deployment === deployment) {
        if (!result.hasDatabase) throw new Error('CONFIG: Brak MONITOR_DB. Uruchom Setup-Discord.ps1.');
        if (!result.hasWebhook) throw new Error('CONFIG: Brak sekretu webhooka. Uruchom Setup-Discord.ps1.');
        console.log('Nowa wersja Workera i klucz administracyjny potwierdzone.');
        return result;
      }
      reason = response.status === 401 ? 'Worker nadal odrzuca nowy klucz (HTTP 401)'
        : response.ok ? 'odpowiada poprzednia wersja Workera' : `HTTP ${response.status}`;
    } catch (error) {
      if (error.message?.startsWith('CONFIG:')) throw error;
      reason = String(error.message || 'brak odpowiedzi').split(key).join('[hidden]');
    }
    if (clock() - started >= timeout) break;
    console.log('Czekam na aktywacje nowej wersji i sekretu w Cloudflare...');
    await wait(delay);
  } while (clock() - started < timeout);
  throw new Error(`Nie potwierdzono autoryzacji monitora: ${reason}. Ponow Upgrade-Discord.ps1. Test Discorda nie zostal wywolany.`);
}

export async function deployMonitor(wrangler, configPath, secrets, { fetcher = fetch, timeout, delay } = {}) {
  if (!secrets.MONITOR_KEY) throw new Error('Brak nowego klucza monitora.');
  const original = JSON.parse(await readFile(configPath, 'utf8'));
  const payload = { ...secrets };
  if (!payload.DISCORD_WEBHOOK_URL && original.vars?.DISCORD_WEBHOOK_URL) {
    // Move a real legacy webhook to encrypted storage without losing it.
    discordUrl(original.vars.DISCORD_WEBHOOK_URL);
    payload.DISCORD_WEBHOOK_URL = original.vars.DISCORD_WEBHOOK_URL;
  }
  const deployment = randomUUID();
  const config = cleanMonitorConfig(original, deployment);
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
  const directory = await mkdtemp(path.join(tmpdir(), 'pet-monitor-secrets-'));
  try {
    const secretsPath = path.join(directory, 'secrets.json');
    await writeFile(secretsPath, JSON.stringify(payload), { mode: 0o600 });
    // Deploy code first, then use the explicit Secrets API supported by Wrangler
    // 4.145. This does not rely on --secrets-file being merged during deploy.
    const output = await wrangler(['deploy', '--config', configPath, '--keep-vars=false']);
    const url = output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev\b/i)?.[0];
    if (!url) throw new Error('Nie znaleziono adresu wdrozonego Workera.');
    await wrangler(['secret', 'bulk', secretsPath, '--config', configPath]);
    const installed = parseJsonList(await wrangler(['secret', 'list', '--config', configPath, '--format', 'json'], { capture: true }));
    for (const name of ['MONITOR_KEY', 'DISCORD_WEBHOOK_URL']) {
      if (!installed.some(item => item.name === name && item.type === 'secret_text')) {
        throw new Error(`Nie potwierdzono sekretu ${name}. Uruchom Setup-Discord.ps1.`);
      }
    }
    await waitForMonitor(url, payload.MONITOR_KEY, deployment, { fetcher, ...(timeout === undefined ? {} : { timeout }), ...(delay === undefined ? {} : { delay }) });
    return { url, deployment };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
