import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { createWrangler, root, publicSite, waitForPublishedPrices, testMonitor } from './discord-tools.mjs';

const monitorKey = randomBytes(32).toString('base64url');
const wrangler = createWrangler([monitorKey]);
let privateDirectory;
try {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Wymagany jest Node.js 22 lub nowszy.');
  const directoryIndex = process.argv.indexOf('--config-directory');
  const directory = path.resolve(directoryIndex >= 0 ? process.argv[directoryIndex + 1] : path.join(root, '.cloudflare'));
  const configPath = path.join(directory, 'price-monitor.json');
  let config;
  try { config = JSON.parse(await readFile(configPath, 'utf8')); }
  catch { throw new Error('Brak .cloudflare/price-monitor.json. Zachowaj konfiguracje z poprzedniego folderu albo uruchom Setup-Discord.ps1.'); }
  if (!config.name || !config.d1_databases?.some(db => db.binding === 'MONITOR_DB' && db.database_id)) {
    throw new Error('Niekompletna konfiguracja monitora. Uruchom Setup-Discord.ps1; istniejaca baza o tej samej nazwie zostanie wykorzystana.');
  }
  const site = publicSite(config.vars?.SITE_URL);
  await waitForPublishedPrices(site);
  if (config.account_id && !process.env.CLOUDFLARE_ACCOUNT_ID) process.env.CLOUDFLARE_ACCOUNT_ID = config.account_id;
  if (!process.env.CLOUDFLARE_API_TOKEN) await wrangler(['login']);
  // Always deploy THIS project's module. Keep the existing database, remote
  // webhook secret and unrelated Worker settings; never inject old JS text.
  config.main = path.relative(directory, path.join(root, 'workers/price-monitor.js')).split(path.sep).join('/');
  config.compatibility_date = '2026-10-01';
  config.workers_dev = true;
  config.triggers = { ...config.triggers, crons: ['* * * * *'] };
  config.vars = { ...config.vars, SITE_URL: site };
  config.observability = { ...config.observability, enabled: true };
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
  privateDirectory = await mkdtemp(path.join(tmpdir(), 'pet-universe-repair-'));
  const secretsPath = path.join(privateDirectory, 'secrets.json');
  // --secrets-file preserves remote secrets omitted from this file.
  await writeFile(secretsPath, JSON.stringify({ MONITOR_KEY: monitorKey }), { mode: 0o600 });
  const output = await wrangler(['deploy', '--config', configPath, '--secrets-file', secretsPath]);
  const workerUrl = output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev\b/i)?.[0];
  if (!workerUrl) throw new Error('Worker wdrozony, ale nie znaleziono adresu workers.dev. Test nie zostal potwierdzony.');
  const health = await fetch(workerUrl + '/health', { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(15000) });
  const status = await health.json().catch(() => ({}));
  if (!health.ok || status.version !== 114) throw new Error('Nie potwierdzono nowej wersji monitora. Sprawdz wdrozenie Workers.');
  if (!status.configured) throw new Error('Na Workerze brakuje webhooka lub MONITOR_DB. Uruchom Setup-Discord.ps1, aby ustawic aktualny webhook.');
  await testMonitor(workerUrl, monitorKey);
  await writeFile(path.join(directory, 'monitor-info.json'), JSON.stringify({ url: workerUrl, site }, null, 2) + '\n');
  console.log('GOTOWE: wdrozono aktualny monitor i Discord przyjal test. Kolejne zmiany sprawdza cron co minute.');
} catch (error) {
  console.error(String(error.message || 'Naprawa nie powiodla sie.').split(monitorKey).join('[hidden]'));
  process.exitCode = 1;
} finally {
  if (privateDirectory) await rm(privateDirectory, { recursive: true, force: true });
}
