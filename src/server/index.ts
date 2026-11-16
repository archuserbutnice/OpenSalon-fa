import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { inventoryRouter } from './routes/inventory';
import { smsRouter } from './routes/sms';

const app = new Hono();

app.use('*', cors());

// Base health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    app: 'OpenSalon-fa',
    version: '1.0.0',
    locale: 'fa',
    calendar: 'jalali',
    currency: 'toman'
  });
});

// Mount feature routers under /api/...
app.route('/api/inventory', inventoryRouter);
app.route('/api/sms', smsRouter);

export default app;
