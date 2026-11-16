import { Hono } from 'hono';
import { getDb } from '../db';

export const settingsRouter = new Hono();

settingsRouter.get('/', (c) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM salon_settings').all();
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return c.json({ success: true, data: settings });
});

settingsRouter.put('/:key', async (c) => {
  const db = getDb();
  const key = c.req.param('key');
  try {
    const body = await c.req.json();
    const value = String(body.value !== undefined ? body.value : '');

    db.prepare(`
      INSERT INTO salon_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = datetime('now')
    `).run(key, value);

    return c.json({ success: true, data: { key, value } });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

settingsRouter.post('/bulk', async (c) => {
  const db = getDb();
  try {
    const body = await c.req.json();
    if (!body || typeof body !== 'object') {
      return c.json({ success: false, error: 'Expected object with key-value pairs' }, 400);
    }

    const updateMany = db.transaction((settingsObj: Record<string, any>) => {
      const stmt = db.prepare(`
        INSERT INTO salon_settings (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = datetime('now')
      `);
      for (const [k, v] of Object.entries(settingsObj)) {
        stmt.run(k, String(v));
      }
    });

    updateMany(body);

    const rows = db.prepare('SELECT key, value FROM salon_settings').all();
    const updatedSettings: Record<string, string> = {};
    for (const row of rows) {
      updatedSettings[row.key] = row.value;
    }

    return c.json({ success: true, data: updatedSettings });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
