import { Hono } from 'hono';
import { getDb } from '../db';

export const servicesRouter = new Hono();

servicesRouter.get('/', (c) => {
  const db = getDb();
  const category = c.req.query('category');
  const activeOnly = c.req.query('active') === 'true';

  let sql = 'SELECT * FROM services WHERE 1=1';
  const params: any[] = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (activeOnly) {
    sql += ' AND is_active = 1';
  }

  sql += ' ORDER BY name ASC';
  const services = db.prepare(sql).all(...params);
  return c.json({ success: true, count: services.length, data: services });
});

servicesRouter.post('/', async (c) => {
  const db = getDb();
  try {
    const body = await c.req.json();
    if (!body.name) {
      return c.json({ success: false, error: 'Service name is required' }, 400);
    }

    const id = body.id || 'srv_' + Math.random().toString(36).substring(2, 10);
    const sql = `
      INSERT INTO services (id, name, duration_minutes, price_toman, category, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.prepare(sql).run(
      id,
      body.name.trim(),
      Number(body.duration_minutes) || 30,
      Number(body.price_toman) || 0,
      body.category || 'general',
      body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1
    );

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    return c.json({ success: true, data: service }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

servicesRouter.get('/:id', (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  if (!service) {
    return c.json({ success: false, error: 'Service not found' }, 404);
  }
  return c.json({ success: true, data: service });
});

servicesRouter.put('/:id', async (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ success: false, error: 'Service not found' }, 404);
  }

  try {
    const body = await c.req.json();
    const name = body.name !== undefined ? body.name.trim() : existing.name;
    const duration = body.duration_minutes !== undefined ? Number(body.duration_minutes) : existing.duration_minutes;
    const price = body.price_toman !== undefined ? Number(body.price_toman) : existing.price_toman;
    const category = body.category !== undefined ? body.category : existing.category;
    const isActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active;

    db.prepare(`
      UPDATE services
      SET name = ?, duration_minutes = ?, price_toman = ?, category = ?, is_active = ?
      WHERE id = ?
    `).run(name, duration, price, category, isActive, id);

    const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

servicesRouter.delete('/:id', (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ success: false, error: 'Service not found' }, 404);
  }

  db.prepare('UPDATE services SET is_active = 0 WHERE id = ?').run(id);
  return c.json({ success: true, message: 'Service deactivated' });
});
