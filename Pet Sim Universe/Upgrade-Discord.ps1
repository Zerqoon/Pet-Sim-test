param([string]$ProjectPath = $PSScriptRoot)
$ErrorActionPreference = "Stop"
try {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Zainstaluj Node.js 22 z npm." }
    $config = Join-Path $ProjectPath ".cloudflare\price-monitor.json"
    if (-not (Test-Path -LiteralPath $config)) { throw "Brak konfiguracji monitora: $config. Podaj folder projektu parametrem -ProjectPath." }
    $workerPath = Join-Path $ProjectPath "workers\price-monitor.js"
    if (-not (Test-Path -LiteralPath (Join-Path $ProjectPath "server\pricing.js"))) { throw "Brakuje server/pricing.js w tym projekcie." }
    $workerCode = @'
import { changePayload, discordUrl, validateFeed } from '../server/pricing.js';

export const MONITOR_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS monitor_prices (item_key TEXT PRIMARY KEY, price_key TEXT NOT NULL, payload TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS monitor_outbox (id TEXT PRIMARY KEY, payload TEXT NOT NULL, created_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at INTEGER NOT NULL DEFAULT 0, sent_at INTEGER, last_status INTEGER)`,
  `CREATE INDEX IF NOT EXISTS monitor_pending ON monitor_outbox (sent_at, next_attempt_at, created_at)`,
  `CREATE TABLE IF NOT EXISTS monitor_locks (name TEXT PRIMARY KEY, token TEXT NOT NULL, expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS monitor_meta (name TEXT PRIMARY KEY, value TEXT NOT NULL)`,
];

function siteOrigin(value) {
  const url = new URL(value || 'https://petuniverse-values.pl');
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('SITE_URL must be a public HTTPS URL.');
  return url.origin;
}

export async function runMonitor(env, { fetcher = fetch, clock = Date.now } = {}) {
  if (!env.MONITOR_DB) throw new Error('MONITOR_DB binding is missing.');
  const webhook = discordUrl(env.DISCORD_WEBHOOK_URL);
  const site = siteOrigin(env.SITE_URL);
  const db = env.MONITOR_DB;
  await db.batch(MONITOR_SCHEMA.map(sql => db.prepare(sql)));
  const now = clock();
  const token = crypto.randomUUID();
  const lock = await db.prepare(`INSERT INTO monitor_locks (name, token, expires_at) VALUES ('prices', ?, ?)
    ON CONFLICT(name) DO UPDATE SET token = excluded.token, expires_at = excluded.expires_at WHERE monitor_locks.expires_at < ?`)
    .bind(token, now + 180000, now).run();
  if (!lock.meta?.changes) return { busy: true, sent: 0 };

  try {
    const feedUrl = new URL('/api/price-feed', site);
    feedUrl.searchParams.set('check', String(now));
    const response = await fetcher(feedUrl.href, { headers: { accept: 'application/json', 'cache-control': 'no-cache' }, cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`Price feed HTTP ${response.status}.`);
    const feed = await response.json();
    const rows = validateFeed(feed, site);
    const stored = await db.prepare('SELECT item_key, price_key, payload FROM monitor_prices').all();
    const previous = new Map(stored.results.map(row => [row.item_key, row]));
    const seeded = await db.prepare("SELECT value FROM monitor_meta WHERE name = 'initialized'").first();
    const statements = [];
    const priceWrites = [];
    const events = [];
    let changed = 0;
    for (const row of rows) {
      const old = previous.get(row.key);
      const payload = JSON.stringify(row);
      if (seeded && old && old.price_key !== row.price.key) {
        changed++;
        events.push([crypto.randomUUID(), JSON.stringify(changePayload(JSON.parse(old.payload), row, now)), now]);
      }
      if (!old || old.payload !== payload) {
        priceWrites.push([row.key, row.price.key, payload]);
      }
    }
    // Removing an item and reintroducing it later seeds it instead of comparing
    // against an obsolete price. Price changes and the outbox commit together.
    const keys = new Set(rows.map(row => row.key));
    // JSON expansion keeps the whole catalog within D1's Free query budget.
    // Outbox and snapshot are still committed in the same atomic transaction.
    if (events.length) statements.push(db.prepare(`INSERT INTO monitor_outbox (id,payload,created_at)
      SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]') FROM json_each(?)`).bind(JSON.stringify(events)));
    if (priceWrites.length) statements.push(db.prepare(`INSERT INTO monitor_prices (item_key,price_key,payload)
      SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]') FROM json_each(?) WHERE true
      ON CONFLICT(item_key) DO UPDATE SET price_key=excluded.price_key,payload=excluded.payload`).bind(JSON.stringify(priceWrites)));
    const removed = [...previous.keys()].filter(key => !keys.has(key));
    if (removed.length) statements.push(db.prepare('DELETE FROM monitor_prices WHERE item_key IN (SELECT value FROM json_each(?))').bind(JSON.stringify(removed)));
    if (!seeded) statements.push(db.prepare("INSERT INTO monitor_meta (name,value) VALUES ('initialized',?)").bind(String(now)));
    statements.push(db.prepare("INSERT INTO monitor_meta (name,value) VALUES ('last_check',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(String(now)));
    if (statements.length) await db.batch(statements);

    // Keep accepted messages; retry failed ones on a later cron tick. Never
    // create a new change just because Discord is temporarily unavailable.
    const cooldown = await db.prepare("SELECT value FROM monitor_meta WHERE name='discord_retry_after'").first();
    const queue = Number(cooldown?.value || 0) > clock() ? { results: [] }
      : await db.prepare('SELECT * FROM monitor_outbox WHERE sent_at IS NULL AND next_attempt_at <= ? ORDER BY created_at, rowid LIMIT 8').bind(clock()).all();
    let sent = 0;
    for (const event of queue.results) {
      let result;
      let status = 0;
      let retryAfter = Math.min(3600000, 60000 * 2 ** Math.min(event.attempts, 6));
      try {
        result = await fetcher(webhook.href, { method: 'POST', headers: { 'content-type': 'application/json' }, body: event.payload, redirect: 'manual', signal: AbortSignal.timeout(15000) });
        status = result.status;
        if (status === 429) {
          const rate = await result.json().catch(() => ({}));
          retryAfter = Math.max(60000, Number(rate.retry_after || result.headers.get('retry-after') || 60) * 1000);
          if (!Number.isFinite(retryAfter)) retryAfter = 60000;
        }
      } catch { /* Network errors contain no useful public details or secrets. */ }
      if (result?.ok) {
        // Drain the response before the next fetch to free a Worker connection.
        await result.text().catch(() => '');
        await db.prepare('UPDATE monitor_outbox SET sent_at=?, last_status=? WHERE id=?').bind(clock(), status, event.id).run();
        sent++;
      } else {
        await db.prepare('UPDATE monitor_outbox SET attempts=attempts+1, next_attempt_at=?, last_status=? WHERE id=?').bind(clock() + retryAfter, status, event.id).run();
        await db.prepare("INSERT INTO monitor_meta (name,value) VALUES ('discord_retry_after',?) ON CONFLICT(name) DO UPDATE SET value=excluded.value").bind(String(clock() + retryAfter)).run();
        // Respect the shared Discord rate limit / outage for the whole queue.
        break;
      }
    }
    await db.prepare('DELETE FROM monitor_outbox WHERE sent_at IS NOT NULL AND sent_at < ?').bind(clock() - 30 * 86400000).run();
    const pending = await db.prepare('SELECT COUNT(*) AS count FROM monitor_outbox WHERE sent_at IS NULL').first();
    return { initialized: !seeded, checked: rows.length, changed, sent, pending: pending.count, checkedAt: new Date(now).toISOString() };
  } finally {
    await db.prepare("DELETE FROM monitor_locks WHERE name='prices' AND token=?").bind(token).run();
  }
}

function matchesKey(request, key) {
  if (!key) return false;
  const incoming = request.headers.get('authorization') || '';
  const expected = `Bearer ${key}`;
  if (incoming.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= incoming.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}

function safeError(error, env) {
  let message = String(error?.message || 'Monitor failed.');
  for (const secret of [env.DISCORD_WEBHOOK_URL, env.MONITOR_KEY]) if (secret) message = message.split(secret).join('[hidden]');
  return message.replace(/https:\/\/[^\s]+/g, '[URL]').slice(0, 500);
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runMonitor(env).then(result => console.log(JSON.stringify(result))).catch(error => {
      console.error(safeError(error, env));
      throw new Error('Price monitor failed.');
    }));
  },
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/health' && request.method === 'GET') return json({ version: 90, configured: Boolean(env.MONITOR_DB && env.DISCORD_WEBHOOK_URL && env.MONITOR_KEY) });
    if (path !== '/check' && path !== '/test') return json({ error: 'Not found.' }, 404);
    if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
    if (!matchesKey(request, env.MONITOR_KEY)) return json({ error: 'Unauthorized.' }, 401);
    try {
      const result = await runMonitor(env);
      if (path === '/test' && !result.busy) {
        const response = await fetch(discordUrl(env.DISCORD_WEBHOOK_URL).href, {
          method: 'POST', headers: { 'content-type': 'application/json' }, redirect: 'manual',
          signal: AbortSignal.timeout(15000), body: JSON.stringify({ allowed_mentions: { parse: [] }, embeds: [{
            title: 'Pet Universe — test monitora', description: 'Monitor odczytał ceny i połączył się z Discordem. To test po naprawie, bez zmiany cen.',
            color: 3066993, timestamp: new Date().toISOString()
          }] })
        });
        if (!response.ok) throw new Error(`Discord test HTTP ${response.status}.`);
        await response.text();
        result.testSent = true;
      }
      return json(result);
    }
    catch (error) { return json({ error: safeError(error, env) }, 503); }
  },
};
'@
    $helperCode = @'
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {tmpdir} from 'node:os';
const root=process.argv[2];
const cfg=path.join(root,'.cloudflare','price-monitor.json');
const config=JSON.parse(await readFile(cfg,'utf8'));
const npx=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npx-cli.js');
if(!existsSync(npx)) throw Error('Nie znaleziono npm. Zainstaluj Node.js 22 z npm.');
if(config.account_id) process.env.CLOUDFLARE_ACCOUNT_ID=config.account_id;
function cli(args,input){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[npx,'--yes','wrangler@4',...args],{cwd:root,shell:false,stdio:['pipe','pipe','pipe'],env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
 let output='';child.stdout.on('data',b=>{output+=b;process.stdout.write(b)});child.stderr.on('data',b=>process.stderr.write(b));
 child.on('error',reject);child.on('close',c=>c===0?resolve(output):reject(Error(`Wrangler: blad ${c}.`)));
 child.stdin.end(input||'');
});}
const temp=await mkdtemp(path.join(tmpdir(),'pet-monitor-repair-'));
try {
 const key=randomBytes(32).toString('base64url');
 await cli(['secret','put','MONITOR_KEY','--config',cfg],key+'\n');
 const output=await cli(['deploy','--config',cfg]);
 const url=output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev\b/i)?.[0];
 if(!url)throw Error('Nie znaleziono adresu Worker w wyniku wdrozenia.');
 const deadline=Date.now()+200000;
 let result;
 do {
  const response=await fetch(url+'/test',{method:'POST',headers:{authorization:`Bearer ${key}`},signal:AbortSignal.timeout(60000)});
  result=await response.json();
  if(!response.ok)throw Error(`HTTP ${response.status}: ${result.error||JSON.stringify(result)}`);
  if(!result.busy)break;
  console.log('Poprzedni odczyt trzyma blokade. Ponawiam za 10 sekund...');
  await new Promise(resolve=>setTimeout(resolve,10000));
 }while(Date.now()<deadline);
 if(result.busy)throw Error('Monitor nadal zajety. Uruchom naprawe ponownie; nie potwierdzono odczytu.');
 if(!result.checked||!result.testSent)throw Error('Nie potwierdzono odczytu cen i testu Discord.');
 console.log(`\nPOTWIERDZONE: odczytano ${result.checked} cen. Discord przyjal wiadomosc testowa.`);
 console.log(`Zmiany: ${result.changed}; wyslane: ${result.sent}; oczekujace: ${result.pending}.`);
 console.log('Teraz zmien cene w prices.js na GitHub i poczekaj na udane wdrozenie strony.');
}finally{await rm(temp,{recursive:true,force:true});}
'@
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    Copy-Item -LiteralPath $workerPath -Destination ($workerPath + ".before-fix") -Force
    [System.IO.File]::WriteAllText($workerPath, $workerCode, $utf8)
    $helperPath = Join-Path ([System.IO.Path]::GetTempPath()) ("Pet-Monitor-Repair-" + [guid]::NewGuid().ToString("N") + ".mjs")
    [System.IO.File]::WriteAllText($helperPath, $helperCode, $utf8)
    try {
        & node $helperPath $ProjectPath
        if ($LASTEXITCODE -ne 0) { throw "Naprawa nie zostala potwierdzona. Blad jest powyzej." }
    } finally { Remove-Item -LiteralPath $helperPath -Force -ErrorAction SilentlyContinue }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
