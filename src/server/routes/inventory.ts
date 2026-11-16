import { Hono } from 'hono';
import { InventoryService } from '../services/inventory';

export const inventoryRouter = new Hono();
const service = new InventoryService();

inventoryRouter.get('/items', (c) => {
  const categoryId = c.req.query('category_id');
  const lowStockOnly = c.req.query('low_stock') === 'true';
  const search = c.req.query('search');
  const items = service.listItems({ categoryId, lowStockOnly, search });
  return c.json({ success: true, count: items.length, data: items });
});

inventoryRouter.post('/items', async (c) => {
  try {
    const body = await c.req.json();
    const item = service.createItem(body);
    return c.json({ success: true, data: item }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

inventoryRouter.get('/items/:id', (c) => {
  const id = c.req.param('id');
  const item = service.getItemById(id);
  if (!item) return c.json({ success: false, error: 'Item not found' }, 404);
  return c.json({ success: true, data: item });
});

inventoryRouter.get('/low-stock', (c) => {
  const items = service.getLowStockAlerts();
  return c.json({ success: true, count: items.length, data: items });
});

inventoryRouter.post('/transactions', async (c) => {
  try {
    const body = await c.req.json();
    const result = service.recordTransaction(body);
    return c.json({ success: true, data: result }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

inventoryRouter.get('/transactions', (c) => {
  const itemId = c.req.query('item_id');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50;
  const transactions = service.listTransactions({ itemId, limit });
  return c.json({ success: true, count: transactions.length, data: transactions });
});

inventoryRouter.get('/suppliers', (c) => {
  const suppliers = service.listSuppliers();
  return c.json({ success: true, data: suppliers });
});

inventoryRouter.post('/suppliers', async (c) => {
  try {
    const body = await c.req.json();
    const supplier = service.createSupplier(body);
    return c.json({ success: true, data: supplier }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

inventoryRouter.get('/categories', (c) => {
  const categories = service.listCategories();
  return c.json({ success: true, data: categories });
});
