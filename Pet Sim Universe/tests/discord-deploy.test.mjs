import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { cleanMonitorConfig, deployMonitor, waitForMonitor } from '../scripts/discord-deploy.mjs';
import worker from '../workers/price-monitor.js';

const oldHook = 'https://discord.com/api/webhooks/123456789012345678/test_token';
const originalConfig = () => ({
  name: 'pet-universe-price-monitor', main: '../workers/price-monitor.js',
  vars: { SITE_URL: 'https://petuniverse-values.pl', MONITOR_KEY: 'old-placeholder', DISCORD_WEBHOOK_URL: oldHook },
  d1_databases: [{ binding: 'MONITOR_DB', database_name: 'pet-price-monitor', database_id: 'existing-database-id' }],
  triggers: { crons: ['* * * * *'] },
});

test('legacy plaintext credentials are removed while the existing database and site are retained', () => {
  const original = originalConfig();
  const cleaned = cleanMonitorConfig(original, 'current-deployment');
  assert.deepEqual(cleaned.vars, { SITE_URL: original.vars.SITE_URL, MONITOR_DEPLOYMENT: 'current-deployment' });
  assert.deepEqual(cleaned.d1_databases, original.d1_databases);
  assert.deepEqual(cleaned.triggers, original.triggers);
  assert.equal(original.vars.MONITOR_KEY, 'old-placeholder', 'cleanup does not mutate its input');
});

test('authorization preflight waits through 401 and the previous deployment without sending Discord messages', async () => {
  let time = 0;
  const replies = [
    new Response('Unauthorized.', { status: 401 }),
    Response.json({ authorized: true, version: 116, deployment: 'previous', hasDatabase: true, hasWebhook: true }),
    Response.json({ authorized: true, version: 116, deployment: 'current', hasDatabase: true, hasWebhook: true }),
  ];
  const calls = [];
  const result = await waitForMonitor('https://monitor.example', 'new-key', 'current', {
    timeout: 1000, delay: 1, clock: () => time, wait: async delay => { time += delay; },
    fetcher: async (url, options) => {
      calls.push(new URL(url).pathname);
      assert.equal(options.headers.authorization, 'Bearer new-key');
      assert.equal(options.redirect, 'manual');
      assert.equal(options.cache, 'no-store');
      return replies.shift();
    },
  });
  assert.equal(result.authorized, true);
  assert.deepEqual(calls, ['/auth', '/auth', '/auth']);
});

test('persistent 401 and missing bindings fail before the Discord test, with no key disclosure', async () => {
  await assert.rejects(() => waitForMonitor('https://monitor.example', 'private-key', 'current', {
    timeout: 0, fetcher: async () => new Response('Unauthorized.', { status: 401 }),
  }), error => /HTTP 401/.test(error.message) && /Test Discorda nie zostal wywolany/.test(error.message) && !error.message.includes('private-key'));
  await assert.rejects(() => waitForMonitor('https://monitor.example', 'private-key', 'current', {
    timeout: 0, fetcher: async () => Response.json({ authorized: true, version: 116, deployment: 'current', hasDatabase: true, hasWebhook: false }),
  }), /Brak sekretu webhooka/);
});

test('deployment cleans legacy vars, installs real secrets, verifies them and retains D1', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'pet-deploy-test-'));
  const configPath = path.join(folder, 'wrangler.json');
  const original = originalConfig();
  await writeFile(configPath, JSON.stringify(original));
  const calls = [];
  let secretFile;
  const wrangler = async args => {
    calls.push(args.slice(0, 2).join(' '));
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    assert.equal(config.vars.MONITOR_KEY, undefined);
    assert.equal(config.vars.DISCORD_WEBHOOK_URL, undefined);
    assert.deepEqual(config.d1_databases, original.d1_databases);
    assert.ok(config.vars.MONITOR_DEPLOYMENT);
    if (args[0] === 'deploy') {
      assert.ok(args.includes('--keep-vars=false'));
      return 'Deployed pet-universe-price-monitor\nhttps://pet-universe-price-monitor.account.workers.dev\n';
    }
    if (args[1] === 'bulk') {
      secretFile = args[2];
      assert.deepEqual(JSON.parse(await readFile(secretFile, 'utf8')), { MONITOR_KEY: 'actual-new-key', DISCORD_WEBHOOK_URL: oldHook });
      return 'Secrets uploaded.';
    }
    assert.deepEqual(args.slice(-2), ['--format', 'json']);
    return JSON.stringify([{ name: 'MONITOR_KEY', type: 'secret_text' }, { name: 'DISCORD_WEBHOOK_URL', type: 'secret_text' }]);
  };
  try {
    const result = await deployMonitor(wrangler, configPath, { MONITOR_KEY: 'actual-new-key' }, {
      timeout: 0, fetcher: async (url, options) => {
        calls.push(new URL(url).pathname);
        assert.equal(new URL(url).pathname, '/auth');
        assert.equal(options.headers.authorization, 'Bearer actual-new-key');
        const config = JSON.parse(await readFile(configPath, 'utf8'));
        return Response.json({ authorized: true, version: 116, deployment: config.vars.MONITOR_DEPLOYMENT, hasDatabase: true, hasWebhook: true });
      },
    });
    assert.equal(result.url, 'https://pet-universe-price-monitor.account.workers.dev');
    assert.deepEqual(calls, ['deploy --config', 'secret bulk', 'secret list', '/auth']);
    await assert.rejects(access(secretFile), /ENOENT/);
    assert.ok(!JSON.stringify(JSON.parse(await readFile(configPath, 'utf8'))).includes(oldHook));
  } finally { await rm(folder, { recursive: true, force: true }); }
});

test('repair preserves the existing encrypted webhook; a missing secret aborts before any network test', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'pet-deploy-secret-test-'));
  const configPath = path.join(folder, 'wrangler.json');
  const config = originalConfig();
  delete config.vars.DISCORD_WEBHOOK_URL;
  await writeFile(configPath, JSON.stringify(config));
  let secretFile;
  try {
    await assert.rejects(() => deployMonitor(async args => {
      if (args[0] === 'deploy') return 'https://monitor.account.workers.dev';
      if (args[1] === 'bulk') {
        secretFile = args[2];
        assert.deepEqual(JSON.parse(await readFile(secretFile, 'utf8')), { MONITOR_KEY: 'new-key' });
        return '';
      }
      return JSON.stringify([{ name: 'MONITOR_KEY', type: 'secret_text' }]);
    }, configPath, { MONITOR_KEY: 'new-key' }, { fetcher: async () => { assert.fail('a missing secret must fail before /auth or /test'); } }), /Nie potwierdzono sekretu DISCORD_WEBHOOK_URL/);
    await assert.rejects(access(secretFile), /ENOENT/);
  } finally { await rm(folder, { recursive: true, force: true }); }
});

test('Worker authorization endpoint checks the key and deployment without accessing D1 or Discord', async () => {
  const env = { MONITOR_KEY: 'new-key', MONITOR_DEPLOYMENT: 'current', DISCORD_WEBHOOK_URL: oldHook,
    MONITOR_DB: { prepare() { assert.fail('authorization must not run price monitoring'); } } };
  const request = key => new Request('https://monitor.example/auth', { headers: { authorization: `Bearer ${key}` } });
  assert.equal((await worker.fetch(request('wrong'), env)).status, 401);
  const response = await worker.fetch(request('new-key'), env);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result, { authorized: true, version: 116, deployment: 'current', hasWebhook: true, hasDatabase: true });
  assert.ok(!JSON.stringify(result).includes('new-key'));
});
