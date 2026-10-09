// A browser's shared ID is the primary key: tabs and reloads cannot add people.
// SQLite triggers maintain one global total, avoiding a full COUNT scan on
// every heartbeat. Expiry cleanup and heartbeats run in the same D1 transaction.
export const VIEWER_HEARTBEAT_SECONDS = 15;
export const VIEWER_ACTIVE_SECONDS = 45;
export const VIEWER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const VIEWER_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS live_viewer_totals (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0)
  )`,
  `INSERT OR IGNORE INTO live_viewer_totals (id, total) VALUES (1, 0)`,
  `CREATE TABLE IF NOT EXISTS live_viewer_sessions (
    visitor_id TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_live_viewer_expiry ON live_viewer_sessions (expires_at)`,
  `CREATE TRIGGER IF NOT EXISTS live_viewer_join AFTER INSERT ON live_viewer_sessions
    BEGIN UPDATE live_viewer_totals SET total = total + 1 WHERE id = 1; END`,
  `CREATE TRIGGER IF NOT EXISTS live_viewer_leave AFTER DELETE ON live_viewer_sessions
    BEGIN UPDATE live_viewer_totals SET total = total - 1 WHERE id = 1; END`,
];

const initialized = new WeakMap();
async function ensureSchema(db) {
  if (!initialized.has(db)) {
    const pending = db.batch(VIEWER_SCHEMA.map(sql => db.prepare(sql)));
    initialized.set(db, pending);
    pending.catch(() => initialized.delete(db));
  }
  await initialized.get(db);
}

export async function readLiveViewers(db, visitorId = null, now = Date.now()) {
  await ensureSchema(db);
  const statements = [db.prepare('DELETE FROM live_viewer_sessions WHERE expires_at <= ?').bind(now)];
  if (visitorId) {
    statements.push(db.prepare(`INSERT INTO live_viewer_sessions (visitor_id, expires_at) VALUES (?, ?)
      ON CONFLICT(visitor_id) DO UPDATE SET expires_at = MAX(expires_at, excluded.expires_at)`)
      .bind(visitorId, now + VIEWER_ACTIVE_SECONDS * 1000));
  }
  statements.push(db.prepare('SELECT total FROM live_viewer_totals WHERE id = 1'));
  const results = await db.batch(statements);
  const count = results.at(-1)?.results?.[0]?.total;
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid viewer total');
  return count;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...extraHeaders,
  } });
}

async function readHeartbeat(request) {
  if (!request.body || Number(request.headers.get('content-length') || 0) > 256) throw new Error('Invalid body');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 256) { await reader.cancel(); throw new Error('Body too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (!data || typeof data.visitorId !== 'string' || !VIEWER_ID_PATTERN.test(data.visitorId)) throw new Error('Invalid visitor ID');
  return data.visitorId;
}

export async function handleLiveViewers(context) {
  const { request } = context;
  if (!['GET', 'POST'].includes(request.method)) {
    return json({ available: false, reason: 'method-not-allowed' }, 405, { allow: 'GET, POST' });
  }
  let visitorId = null;
  if (request.method === 'POST') {
    if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') {
      return json({ available: false, reason: 'invalid-origin' }, 403);
    }
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return json({ available: false, reason: 'invalid-content-type' }, 415);
    }
    try { visitorId = await readHeartbeat(request); }
    catch { return json({ available: false, reason: 'invalid-heartbeat' }, 400); }
  }
  const db = context.env?.VIEWERS_DB || context.env?.VALUES_DB;
  if (!db) return json({ available: false, reason: 'viewers-not-configured' }, 503);
  try {
    const count = await readLiveViewers(db, visitorId, context.now?.() ?? Date.now());
    return json({ available: true, count, heartbeatSeconds: VIEWER_HEARTBEAT_SECONDS, activeWindowSeconds: VIEWER_ACTIVE_SECONDS });
  } catch {
    return json({ available: false, reason: 'viewers-unavailable' }, 503);
  }
}
