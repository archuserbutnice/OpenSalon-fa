import { Hono } from 'hono';
import { getDb } from '../db';
import { normalizeIranianPhone } from '../../client/lib/phone';

export const clientsRouter = new Hono();

clientsRouter.get('/', (c) => {
  const db = getDb();
  const search = c.req.query('search');

  let sql = 'SELECT * FROM clients';
  const params: any[] = [];

  if (search) {
    sql += ' WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY created_at DESC';
  const clients = db.prepare(sql).all(...params);
  return c.json({ success: true, count: clients.length, data: clients });
});

clientsRouter.post('/', async (c) => {
  const db = getDb();
  try {
    const body = await c.req.json();
    if (!body.name) {
      return c.json({ success: false, error: 'Client name is required' }, 400);
    }

    const rawPhone = body.phone || '';
    const normalizedPhone = normalizeIranianPhone(rawPhone);
    if (rawPhone && !normalizedPhone) {
      return c.json({ success: false, error: 'Invalid Iranian mobile phone number' }, 400);
    }

    const id = body.id || 'cli_' + Math.random().toString(36).substring(2, 10);
    const sql = `
      INSERT INTO clients (id, name, phone, email, notes)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.prepare(sql).run(
      id,
      body.name.trim(),
      normalizedPhone || rawPhone,
      body.email ? body.email.trim() : null,
      body.notes || null
    );

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    return c.json({ success: true, data: client }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

clientsRouter.get('/:id', (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  if (!client) {
    return c.json({ success: false, error: 'Client not found' }, 404);
  }
  return c.json({ success: true, data: client });
});

clientsRouter.put('/:id', async (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ success: false, error: 'Client not found' }, 404);
  }

  try {
    const body = await c.req.json();
    let phone = existing.phone;
    if (body.phone !== undefined) {
      const normalized = normalizeIranianPhone(body.phone);
      if (body.phone && !normalized) {
        return c.json({ success: false, error: 'Invalid Iranian mobile phone number' }, 400);
      }
      phone = normalized || body.phone;
    }

    const name = body.name !== undefined ? body.name.trim() : existing.name;
    const email = body.email !== undefined ? (body.email ? body.email.trim() : null) : existing.email;
    const notes = body.notes !== undefined ? body.notes : existing.notes;

    db.prepare(`
      UPDATE clients
      SET name = ?, phone = ?, email = ?, notes = ?
      WHERE id = ?
    `).run(name, phone, email, notes, id);

    const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

clientsRouter.delete('/:id', (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ success: false, error: 'Client not found' }, 404);
  }

  db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  return c.json({ success: true, message: 'Client deleted' });
});
