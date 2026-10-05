import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { createWrangler, root, publicSite, waitForPublishedPrices, testMonitor, writeMonitorSettings } from './discord-tools.mjs';
import { deployMonitor } from './discord-deploy.mjs';

const monitorKey = randomBytes(32).toString('base64url');
let bundled = {};
try { bundled = JSON.parse(await readFile(path.join(root,'private-setup/admin-secrets.private.json'),'utf8')); } catch {}
const webhook = bundled.DISCORD_WEBHOOK_URL;
const wrangler = createWrangler([monitorKey,webhook]);
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
  const expectedIndex=process.argv.indexOf('--expected-project');
  const expectedRoot=expectedIndex>=0?path.resolve(process.argv[expectedIndex+1]):root;
  await waitForPublishedPrices(site,{expectedRoot});
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
  const { url: workerUrl } = await deployMonitor(wrangler, configPath, { MONITOR_KEY: monitorKey, ...(webhook ? {DISCORD_WEBHOOK_URL:webhook} : {}) });
  await testMonitor(workerUrl, monitorKey);
  await writeMonitorSettings(workerUrl);
  await writeFile(path.join(directory, 'monitor-info.json'), JSON.stringify({ url: workerUrl, site }, null, 2) + '\n');
  console.log('GOTOWE: wdrozono aktualny monitor i Discord przyjal test. Kolejne zmiany sprawdza cron co minute.');
} catch (error) {
  console.error(String(error.message || 'Naprawa nie powiodla sie.').split(monitorKey).join('[hidden]').split(webhook || '\0').join('[hidden]'));
  process.exitCode = 1;
}
