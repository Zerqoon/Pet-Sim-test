export async function onRequestGet(context) {
  const hasDb = Boolean(context.env.VALUES_DB);
  let database = hasDb ? 'connected' : 'missing';
  let rows = null;

  if (hasDb) {
    try {
      await context.env.VALUES_DB.prepare(`
        CREATE TABLE IF NOT EXISTS value_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL,
          item_id TEXT NOT NULL,
          variant TEXT NOT NULL DEFAULT 'normal',
          value REAL NOT NULL,
          captured_at INTEGER NOT NULL
        )
      `).run();
      const result = await context.env.VALUES_DB.prepare('SELECT COUNT(*) AS count FROM value_history').first();
      rows = Number(result?.count || 0);
    } catch (error) {
      database = 'error';
      rows = null;
    }
  }

  return new Response(JSON.stringify({
    ok: database !== 'error',
    database,
    binding: 'VALUES_DB',
    snapshots: rows,
    timestamp: Date.now(),
  }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
