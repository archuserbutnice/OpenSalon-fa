import { Hono } from 'hono';
import { getDb } from '../db';
import { InventoryService } from '../services/inventory';

export const appointmentsRouter = new Hono();
const inventoryService = new InventoryService();

appointmentsRouter.get('/', (c) => {
  const db = getDb();
  const staffId = c.req.query('staff_id');
  const clientId = c.req.query('client_id');
  const status = c.req.query('status');
  const date = c.req.query('date'); // YYYY-MM-DD

  let sql = `
    SELECT 
      a.*,
      c.name as client_name,
      c.phone as client_phone,
      s.name as staff_name,
      s.color as staff_color,
      srv.name as service_name,
      srv.duration_minutes
    FROM appointments a
    JOIN clients c ON a.client_id = c.id
    JOIN staff s ON a.staff_id = s.id
    JOIN services srv ON a.service_id = srv.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (staffId) {
    sql += ' AND a.staff_id = ?';
    params.push(staffId);
  }
  if (clientId) {
    sql += ' AND a.client_id = ?';
    params.push(clientId);
  }
  if (status) {
    sql += ' AND a.status = ?';
    params.push(status);
  }
  if (date) {
    sql += ' AND date(a.start_time) = date(?)';
    params.push(date);
  }

  sql += ' ORDER BY a.start_time ASC';
  const appointments = db.prepare(sql).all(...params);
  return c.json({ success: true, count: appointments.length, data: appointments });
});

appointmentsRouter.post('/', async (c) => {
  const db = getDb();
  try {
    const body = await c.req.json();
    if (!body.client_id || !body.staff_id || !body.service_id || !body.start_time) {
      return c.json({
        success: false,
        error: 'client_id, staff_id, service_id, and start_time are required'
      }, 400);
    }

    // Verify foreign keys exist
    const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(body.client_id);
    if (!client) return c.json({ success: false, error: 'Client not found' }, 404);

    const staff = db.prepare('SELECT id FROM staff WHERE id = ?').get(body.staff_id);
    if (!staff) return c.json({ success: false, error: 'Staff not found' }, 404);

    const service = db.prepare('SELECT id, duration_minutes, price_toman FROM services WHERE id = ?').get(body.service_id);
    if (!service) return c.json({ success: false, error: 'Service not found' }, 404);

    const id = body.id || 'apt_' + Math.random().toString(36).substring(2, 10);
    
    // Calculate end_time if not provided
    let endTime = body.end_time;
    if (!endTime) {
      const startDate = new Date(body.start_time);
      const endDate = new Date(startDate.getTime() + (service.duration_minutes * 60 * 1000));
      endTime = endDate.toISOString();
    }

    const price = body.price_toman !== undefined ? Number(body.price_toman) : service.price_toman;
    const status = body.status || 'confirmed';

    db.prepare(`
      INSERT INTO appointments (id, client_id, staff_id, service_id, start_time, end_time, status, price_toman, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.client_id,
      body.staff_id,
      body.service_id,
      body.start_time,
      endTime,
      status,
      price,
      body.notes || null
    );

    if (status === 'completed') {
      try {
        inventoryService.processAppointmentConsumption(id);
      } catch (e) {
        console.error('Failed to process auto-decrement inventory on create:', e);
      }
    }

    const created = db.prepare(`
      SELECT 
        a.*,
        c.name as client_name,
        c.phone as client_phone,
        s.name as staff_name,
        srv.name as service_name
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN staff s ON a.staff_id = s.id
      JOIN services srv ON a.service_id = srv.id
      WHERE a.id = ?
    `).get(id);

    return c.json({ success: true, data: created }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

appointmentsRouter.get('/:id', (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const appointment = db.prepare(`
    SELECT 
      a.*,
      c.name as client_name,
      c.phone as client_phone,
      s.name as staff_name,
      srv.name as service_name
    FROM appointments a
    JOIN clients c ON a.client_id = c.id
    JOIN staff s ON a.staff_id = s.id
    JOIN services srv ON a.service_id = srv.id
    WHERE a.id = ?
  `).get(id);

  if (!appointment) {
    return c.json({ success: false, error: 'Appointment not found' }, 404);
  }
  return c.json({ success: true, data: appointment });
});

appointmentsRouter.put('/:id', async (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ success: false, error: 'Appointment not found' }, 404);
  }

  try {
    const body = await c.req.json();
    const staffId = body.staff_id || existing.staff_id;
    const serviceId = body.service_id || existing.service_id;
    const startTime = body.start_time || existing.start_time;
    const endTime = body.end_time || existing.end_time;
    const status = body.status || existing.status;
    const price = body.price_toman !== undefined ? Number(body.price_toman) : existing.price_toman;
    const notes = body.notes !== undefined ? body.notes : existing.notes;

    db.prepare(`
      UPDATE appointments
      SET staff_id = ?, service_id = ?, start_time = ?, end_time = ?, status = ?, price_toman = ?, notes = ?
      WHERE id = ?
    `).run(staffId, serviceId, startTime, endTime, status, price, notes, id);

    if (status === 'completed' && existing.status !== 'completed') {
      try {
        inventoryService.processAppointmentConsumption(id);
      } catch (e) {
        console.error('Failed to process auto-decrement inventory on complete:', e);
      }
    }

    const updated = db.prepare(`
      SELECT 
        a.*,
        c.name as client_name,
        s.name as staff_name,
        srv.name as service_name
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN staff s ON a.staff_id = s.id
      JOIN services srv ON a.service_id = srv.id
      WHERE a.id = ?
    `).get(id);

    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

appointmentsRouter.delete('/:id', (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ success: false, error: 'Appointment not found' }, 404);
  }

  db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
  return c.json({ success: true, message: 'Appointment deleted' });
});
