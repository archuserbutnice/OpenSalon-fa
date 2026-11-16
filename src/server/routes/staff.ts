import { Hono } from 'hono';
import { getDb } from '../db';
import { normalizeIranianPhone } from '../../client/lib/phone';

export const staffRouter = new Hono();

staffRouter.get('/', (c) => {
  const db = getDb();
  const activeOnly = c.req.query('active') === 'true';

  let sql = 'SELECT * FROM staff';
  const params: any[] = [];

  if (activeOnly) {
    sql += ' WHERE is_active = 1';
  }

  sql += ' ORDER BY name ASC';
  const staff = db.prepare(sql).all(...params);
  return c.json({ success: true, count: staff.length, data: staff });
});

staffRouter.post('/', async (c) => {
  const db = getDb();
  try {
    const body = await c.req.json();
    if (!body.name) {
      return c.json({ success: false, error: 'Staff name is required' }, 400);
    }

    const rawPhone = body.phone || '';
    const normalizedPhone = normalizeIranianPhone(rawPhone);

    const id = body.id || 'stf_' + Math.random().toString(36).substring(2, 10);
    const sql = `
      INSERT INTO staff (id, name, phone, email, role, color, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.prepare(sql).run(
      id,
      body.name.trim(),
      normalizedPhone || (rawPhone ? rawPhone.trim() : null),
      body.email ? body.email.trim() : null,
      body.role || 'stylist',
      body.color || '#ec4899',
      body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1
    );

    const staffMember = db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
    return c.json({ success: true, data: staffMember }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

staffRouter.get('/:id', (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
  if (!staff) {
    return c.json({ success: false, error: 'Staff member not found' }, 404);
  }
  return c.json({ success: true, data: staff });
});

staffRouter.put('/:id', async (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ success: false, error: 'Staff member not found' }, 404);
  }

  try {
    const body = await c.req.json();
    let phone = existing.phone;
    if (body.phone !== undefined) {
      const normalized = normalizeIranianPhone(body.phone);
      phone = normalized || body.phone;
    }

    const name = body.name !== undefined ? body.name.trim() : existing.name;
    const email = body.email !== undefined ? body.email : existing.email;
    const role = body.role !== undefined ? body.role : existing.role;
    const color = body.color !== undefined ? body.color : existing.color;
    const isActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active;

    db.prepare(`
      UPDATE staff
      SET name = ?, phone = ?, email = ?, role = ?, color = ?, is_active = ?
      WHERE id = ?
    `).run(name, phone, email, role, color, isActive, id);

    const updated = db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

staffRouter.delete('/:id', (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ success: false, error: 'Staff member not found' }, 404);
  }

  // Soft deactivate
  db.prepare('UPDATE staff SET is_active = 0 WHERE id = ?').run(id);
  return c.json({ success: true, message: 'Staff member deactivated' });
});
