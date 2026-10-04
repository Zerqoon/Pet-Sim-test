import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadCurrentPrices, readDataModule, rowsFromPrices } from '../public/data/value-loader.js';
import { priceRevision } from '../public/data/price-core.js';
import { PETS, CHARMS, EGGS, ITEMS } from '../public/data/catalog.js';
const PRICE_CATALOGS = { pets: PETS, charms: CHARMS, eggs: EGGS, items: ITEMS };

export const root = path.resolve(import.meta.dirname, '..');
export const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export function createWrangler(secrets = []) {
  const hide = value => secrets.filter(Boolean).reduce((text, secret) => text.split(secret).join('[hidden]'), String(value));
  const npxCli = process.env.PET_UNIVERSE_NPX_CLI || path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npx-cli.js');
  return function wrangler(args, { capture = false, input = null } = {}) {
    const command = existsSync(npxCli) ? process.execPath : process.platform === 'win32' ? null : 'npx';
    if (!command) throw new Error('Nie znaleziono npx-cli.js. Zainstaluj Node.js 22 z npm.');
    const argumentsList = [...(command === process.execPath ? [npxCli] : []), '--yes', 'wrangler@4', ...args];
    return new Promise((resolve, reject) => {
      const child = spawn(command, argumentsList, { cwd: root, shell: false,
        stdio: [input == null ? 'inherit' : 'pipe', 'pipe', 'pipe'],
        env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
      let output = '';
      child.stdout.on('data', bytes => { output += bytes; if (!capture) process.stdout.write(hide(bytes)); });
      child.stderr.on('data', bytes => process.stderr.write(hide(bytes)));
      child.once('error', () => reject(new Error('Nie udalo sie uruchomic Wrangler. Sprawdz Node.js i internet.')));
      child.once('close', code => code === 0 ? resolve(output) : reject(new Error(`Wrangler zakonczyl sie bledem (${code}).`)));
      if (input != null) { child.stdin.on('error', () => {}); child.stdin.end(input); }
    });
  };
}

export function parseJsonList(text) {
  try { return JSON.parse(text); } catch {
    const start = text.indexOf('[\n');
    if (start >= 0) return JSON.parse(text.slice(start));
    throw new Error('Nie udalo sie odczytac listy baz D1.');
  }
}

export function publicSite(value) {
  const url = new URL(value || 'https://petuniverse-values.pl');
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Adres strony musi zaczynac sie od https://.');
  return url.origin;
}

export async function waitForPublishedPrices(site, { fetcher = fetch, timeout = 600000, delay = 10000 } = {}) {
  const local = readDataModule(await readFile(path.join(root, 'public/data/prices.js'), 'utf8'), 'PRICES');
  const localRevision = await priceRevision(rowsFromPrices(PRICE_CATALOGS, local));
  const started = Date.now();
  let reason = 'brak aktualnych cen';
  console.log('Sprawdzam, czy Cloudflare opublikowal ceny z tej paczki...');
  do {
    try {
      const latest = await loadCurrentPrices(site, { catalogs: PRICE_CATALOGS, fetcher });
      if (latest.revision === localRevision) {
        console.log(`Ceny potwierdzone: ${latest.rows.length}, ${latest.source}, aktualizacja ${latest.updatedAt || 'niezapisana'}.`);
        return latest;
      }
      reason = 'strona nadal ma poprzednia wersje cen';
    } catch (error) { reason = error.message; }
    if (Date.now() - started >= timeout) break;
    console.log('Czekam na udane wdrozenie Pages; ponowny odczyt za 10 sekund.');
    await pause(delay);
  } while (Date.now() - started < timeout);
  throw new Error(`Nie potwierdzono wdrozenia: ${reason}. Uruchom Upload-GitHub.ps1 i sprawdz build npm run build w Pages.`);
}

export async function testMonitor(url, key, { fetcher = fetch, timeout = 180000, delay = 3000 } = {}) {
  const started = Date.now();
  do {
    const response = await fetcher(new URL('/test', url).href, {
      method: 'POST', headers: { authorization: `Bearer ${key}` }, redirect: 'manual',
      signal: AbortSignal.timeout(150000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Test monitora: HTTP ${response.status}. ${result.error || 'Brak potwierdzenia Discorda.'}`);
    if (!result.busy) {
      if (!result.testSent || !result.checked) throw new Error('Worker nie potwierdzil odczytu cen i wiadomosci testowej.');
      console.log(`Discord potwierdzil wiadomosc testowa. Ceny: ${result.checked}, zmiany: ${result.changed}, wyslane: ${result.sent}, kolejka: ${result.pending}.`);
      return result;
    }
    console.log('Cron wlasnie odczytuje ceny. Czekam na zakonczenie...');
    await pause(delay);
  } while (Date.now() - started < timeout);
  throw new Error('Monitor jest zajety. Ponow Upgrade-Discord.ps1 za chwile.');
}

export async function writeMonitorSettings(address) {
  const url = new URL(address);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.workers.dev') || url.username || url.password || url.port) throw new Error('Invalid monitor address.');
  await writeFile(path.join(root,'public/data/monitor-settings.js'), `// Public monitor address. No prices or secrets.\nexport const MONITOR = ${JSON.stringify({url:url.origin})};\n`);
}
