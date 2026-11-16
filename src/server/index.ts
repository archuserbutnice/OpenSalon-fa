import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { clientsRouter } from './routes/clients';
import { staffRouter } from './routes/staff';
import { servicesRouter } from './routes/services';
import { appointmentsRouter } from './routes/appointments';
import { productsRouter } from './routes/products';
import { inventoryRouter } from './routes/inventory';
import { smsRouter } from './routes/sms';
import { settingsRouter } from './routes/settings';
import { authRouter } from './routes/auth';

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

// Modular REST API routes
app.route('/api/clients', clientsRouter);
app.route('/api/staff', staffRouter);
app.route('/api/services', servicesRouter);
app.route('/api/appointments', appointmentsRouter);
app.route('/api/products', productsRouter);
app.route('/api/inventory', inventoryRouter);
app.route('/api/sms', smsRouter);
app.route('/api/settings', settingsRouter);
app.route('/api/auth', authRouter);

export default app;
