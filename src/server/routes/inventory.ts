import { Hono } from 'hono';
import { InventoryService } from '../services/inventory';

export const inventoryRouter = new Hono();
const service = new InventoryService();

// Items
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

// Reorder Suggestions & Valuation (Put before :id routes to prevent param clashes)
inventoryRouter.get('/reorder-suggestions', (c) => {
  const lookbackDays = c.req.query('lookback_days') ? parseInt(c.req.query('lookback_days')!, 10) : 30;
  const suggestions = service.getReorderSuggestions(lookbackDays);
  return c.json({ success: true, count: suggestions.length, data: suggestions });
});

inventoryRouter.get('/valuation', (c) => {
  const valuation = service.getValuationReport();
  return c.json({ success: true, data: valuation });
});

// Low stock alerts
inventoryRouter.get('/low-stock', (c) => {
  const items = service.getLowStockAlerts();
  return c.json({ success: true, count: items.length, data: items });
});

// Days to stockout
inventoryRouter.get('/days-to-stockout/:itemId', (c) => {
  try {
    const itemId = c.req.param('itemId');
    const lookback = c.req.query('lookback_days') ? parseInt(c.req.query('lookback_days')!, 10) : 30;
    const stats = service.calculateDaysToStockout(itemId, lookback);
    return c.json({ success: true, data: stats });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 404);
  }
});

// Service Consumptions
inventoryRouter.get('/consumption', (c) => {
  const serviceId = c.req.query('service_id');
  if (serviceId) {
    const list = service.getServiceConsumptions(serviceId);
    return c.json({ success: true, count: list.length, data: list });
  }
  const all = service.listAllServiceConsumptions();
  return c.json({ success: true, count: all.length, data: all });
});

inventoryRouter.get('/consumption/:serviceId', (c) => {
  const serviceId = c.req.param('serviceId');
  const list = service.getServiceConsumptions(serviceId);
  return c.json({ success: true, count: list.length, data: list });
});

inventoryRouter.post('/consumption', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.service_id || !body.item_id || body.quantity_used === undefined) {
      return c.json({ success: false, error: 'service_id, item_id, and quantity_used are required' }, 400);
    }
    const mapping = service.setServiceConsumption({
      serviceId: body.service_id,
      itemId: body.item_id,
      quantityUsed: Number(body.quantity_used),
      unit: body.unit
    });
    return c.json({ success: true, data: mapping }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

inventoryRouter.delete('/consumption/:id', (c) => {
  try {
    const id = c.req.param('id');
    const result = service.deleteServiceConsumption(id);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 404);
  }
});

// Process appointment consumption manually or on demand
inventoryRouter.post('/process-appointment-consumption/:appointmentId', (c) => {
  try {
    const appointmentId = c.req.param('appointmentId');
    const result = service.processAppointmentConsumption(appointmentId);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// Batches & Expiry
inventoryRouter.get('/batches/expiring', (c) => {
  const days = c.req.query('days') ? parseInt(c.req.query('days')!, 10) : 30;
  const list = service.getExpiringBatches(days);
  return c.json({ success: true, count: list.length, data: list });
});

inventoryRouter.get('/batches', (c) => {
  const itemId = c.req.query('item_id');
  const batches = service.listBatches(itemId);
  return c.json({ success: true, count: batches.length, data: batches });
});

inventoryRouter.post('/batches', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.item_id || !body.batch_number || body.quantity === undefined) {
      return c.json({ success: false, error: 'item_id, batch_number, and quantity are required' }, 400);
    }
    const batch = service.createBatch({
      itemId: body.item_id,
      batchNumber: body.batch_number,
      expiryDate: body.expiry_date,
      quantity: Number(body.quantity),
      costPriceToman: body.cost_price_toman !== undefined ? Number(body.cost_price_toman) : undefined
    });
    return c.json({ success: true, data: batch }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// Single Item by ID
inventoryRouter.get('/items/:id', (c) => {
  const id = c.req.param('id');
  const item = service.getItemById(id);
  if (!item) return c.json({ success: false, error: 'Item not found' }, 404);
  return c.json({ success: true, data: item });
});

// Transactions
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

// Suppliers
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

// Categories
inventoryRouter.get('/categories', (c) => {
  const categories = service.listCategories();
  return c.json({ success: true, data: categories });
});
