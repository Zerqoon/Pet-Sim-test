import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { discordUrl } from '../server/pricing.js';
import { createWrangler, parseJsonList, waitForPublishedPrices, testMonitor } from './discord-tools.mjs';

const root = path.resolve(import.meta.dirname, '..');
const secret = process.env.PET_UNIVERSE_WEBHOOK?.trim();
const site = new URL(process.env.PET_UNIVERSE_SITE || 'https://petuniverse-values.pl');
let privateDirectory;
const hide = value => String(value).split(secret || '\0').join('[hidden webhook]');

const wrangler = createWrangler([secret]);

try {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Wymagany jest Node.js 22 lub nowszy.');
  const webhook = discordUrl(secret);
  const webhookResponse = await fetch(webhook, { redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!webhookResponse.ok) throw new Error(`Discord nie przyjal adresu webhooka (HTTP ${webhookResponse.status}). Sprawdz, czy adres jest aktualny.`);
  const webhookInfo = await webhookResponse.json();
  if (webhookInfo.type !== 1) throw new Error('Ten adres nie jest webhookiem przychodzacym Discorda.');
  if (site.protocol !== 'https:' || site.username || site.password) throw new Error('Adres strony musi zaczynac sie od https://.');
  await waitForPublishedPrices(site.origin);
  console.log('Ceny z wdrozonej strony sa dostepne. Konfiguracja Cloudflare...');

  const configDirectory = path.join(root, '.cloudflare');
  const configPath = path.join(configDirectory, 'price-monitor.json');
  let previous = {};
  try { previous = JSON.parse(await readFile(configPath, 'utf8')); } catch {}
  if (!process.env.CLOUDFLARE_ACCOUNT_ID && previous.account_id) process.env.CLOUDFLARE_ACCOUNT_ID = previous.account_id;
  if (!process.env.CLOUDFLARE_API_TOKEN) await wrangler(['login']);
  if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
    const identity = await wrangler(['whoami']);
    const accounts = [...new Set(identity.match(/\b[a-f0-9]{32}\b/gi) || [])];
    if (accounts.length === 1) process.env.CLOUDFLARE_ACCOUNT_ID = accounts[0];
    else if (accounts.length > 1) {
      accounts.forEach((id, i) => console.log(`${i + 1}. ${id}`));
      const prompt = createInterface({ input: process.stdin, output: process.stdout });
      const answer = Number(await prompt.question('Numer konta Cloudflare dla tej strony: '));
      prompt.close();
      if (!Number.isInteger(answer) || !accounts[answer - 1]) throw new Error('Nieprawidlowy numer konta.');
      process.env.CLOUDFLARE_ACCOUNT_ID = accounts[answer - 1];
    } else throw new Error('Ustaw CLOUDFLARE_ACCOUNT_ID na Account ID widoczny w panelu Cloudflare, potem uruchom ponownie.');
  }
  const databaseName = 'pet-universe-price-monitor';
  let databases = parseJsonList(await wrangler(['d1', 'list', '--json'], { capture: true }));
  let database = databases.find(item => item.name === databaseName);
  if (!database) {
    await wrangler(['d1', 'create', databaseName, '--update-config=false']);
    databases = parseJsonList(await wrangler(['d1', 'list', '--json'], { capture: true }));
    database = databases.find(item => item.name === databaseName);
  }
  if (!database?.uuid) throw new Error('Nie znaleziono identyfikatora bazy D1.');
  const config = {
    name: 'pet-universe-price-monitor', account_id: process.env.CLOUDFLARE_ACCOUNT_ID,
    main: '../workers/price-monitor.js', compatibility_date: '2026-10-01', workers_dev: true,
    triggers: { crons: ['* * * * *'] }, vars: { SITE_URL: site.origin },
    d1_databases: [{ binding: 'MONITOR_DB', database_name: databaseName, database_id: database.uuid }],
    observability: { enabled: true },
  };
  await mkdir(configDirectory, { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
  const monitorKey = randomBytes(32).toString('base64url');
  privateDirectory = await mkdtemp(path.join(tmpdir(), 'pet-universe-secrets-'));
  const secretsPath = path.join(privateDirectory, 'secrets.json');
  await writeFile(secretsPath, JSON.stringify({ DISCORD_WEBHOOK_URL: secret, MONITOR_KEY: monitorKey }), { mode: 0o600 });
  const output = await wrangler(['deploy', '--config', configPath, '--secrets-file', secretsPath]);
  const workerUrl = output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev\b/i)?.[0];
  if (!workerUrl) throw new Error('Nie znaleziono adresu wdrozonego Workera. Test nie zostal potwierdzony.');
  await testMonitor(workerUrl, monitorKey);
  await writeFile(path.join(configDirectory, 'monitor-info.json'), JSON.stringify({ url: workerUrl, site: site.origin }, null, 2) + '\n');
  console.log('GOTOWE: monitor wdrozony, Discord potwierdzil test. Cron sprawdza ceny co minute.');
  console.log('Monitor zachowuje kolejke zmian i ponawia nieudane wiadomosci.');
  console.log('Nowy cron Cloudflare moze potrzebowac do 15 minut na pierwsze uruchomienie.');
} catch (error) {
  console.error(hide(error instanceof Error ? error.message : 'Konfiguracja nie powiodla sie.'));
  process.exitCode = 1;
} finally {
  if (privateDirectory) await rm(privateDirectory, { recursive: true, force: true });
}
