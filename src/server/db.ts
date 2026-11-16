import Database from 'better-sqlite3';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

let dbInstance: any = null;

export function getDb(dbPath: string = 'data.db') {
  if (dbInstance) return dbInstance;

  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  runMigrations(dbInstance);
  return dbInstance;
}

export function runMigrations(db: any, migrationsDir: string = 'migrations') {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  if (!existsSync(migrationsDir)) return;

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    const row = db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(version);
    if (!row) {
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      db.transaction(() => {
        db.exec(sql);
        db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
      })();
    }
  }
}
