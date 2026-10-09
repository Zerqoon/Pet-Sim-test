// Used only by npm run dev/preview and tests. Production uses the D1 binding.
import { DatabaseSync } from 'node:sqlite';

export function createLocalViewersDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  return {
    prepare(query) {
      let values = [];
      const statement = {
        bind(...args) { values = args; return statement; },
        execute() {
          const prepared = sqlite.prepare(query);
          if (/^\s*SELECT\b/i.test(query)) return { success: true, results: prepared.all(...values), meta: { changes: 0 } };
          const result = prepared.run(...values);
          return { success: true, results: [], meta: { changes: Number(result.changes) } };
        },
        async run() { return statement.execute(); },
        async all() { return statement.execute(); },
        async first() { return statement.execute().results[0] || null; },
      };
      return statement;
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = statements.map(statement => statement.execute());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    close() { sqlite.close(); },
  };
}
