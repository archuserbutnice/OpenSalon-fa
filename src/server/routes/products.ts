import { Hono } from 'hono';
import { getDb } from '../db';

export const productsRouter = new Hono();

productsRouter.get('/', (c) => {
  const db = getDb();
  const search = c.req.query('search');

  let sql = 'SELECT * FROM products WHERE 1=1';
  const params: any[] = [];

  if (search) {
    sql += ' AND (name LIKE ? OR sku LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY name ASC';
  const products = db.prepare(sql).all(...params);
  return c.json({ success: true, count: products.length, data: products });
});

productsRouter.post('/', async (c) => {
  const db = getDb();
  try {
    const body = await c.req.json();
    if (!body.name) {
      return c.json({ success: false, error: 'Product name is required' }, 400);
    }

    const id = body.id || 'prd_' + Math.random().toString(36).substring(2, 10);
    const sql = `
      INSERT INTO products (id, name, sku, price_toman, cost_toman, stock_quantity)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.prepare(sql).run(
      id,
      body.name.trim(),
      body.sku ? body.sku.trim() : null,
      Number(body.price_toman) || 0,
      Number(body.cost_toman) || 0,
      Number(body.stock_quantity) || 0
    );

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return c.json({ success: true, data: product }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

productsRouter.get('/:id', (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) {
    return c.json({ success: false, error: 'Product not found' }, 404);
  }
  return c.json({ success: true, data: product });
});

productsRouter.put('/:id', async (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ success: false, error: 'Product not found' }, 404);
  }

  try {
    const body = await c.req.json();
    const name = body.name !== undefined ? body.name.trim() : existing.name;
    const sku = body.sku !== undefined ? body.sku : existing.sku;
    const price = body.price_toman !== undefined ? Number(body.price_toman) : existing.price_toman;
    const cost = body.cost_toman !== undefined ? Number(body.cost_toman) : existing.cost_toman;
    const stock = body.stock_quantity !== undefined ? Number(body.stock_quantity) : existing.stock_quantity;

    db.prepare(`
      UPDATE products
      SET name = ?, sku = ?, price_toman = ?, cost_toman = ?, stock_quantity = ?
      WHERE id = ?
    `).run(name, sku, price, cost, stock, id);

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

productsRouter.delete('/:id', (c) => {
  const db = getDb();
  const id = c.req.param('id');
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ success: false, error: 'Product not found' }, 404);
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return c.json({ success: true, message: 'Product deleted' });
});
