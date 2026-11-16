import { Hono } from 'hono';
import { MedianaService } from '../services/mediana';
import { SmsQueueEngine } from '../services/sms/queue';
import { SmsProviderRegistry } from '../services/sms/registry';
import { countSmsSegments } from '../services/sms/segments';

export const smsRouter = new Hono();
const service = new MedianaService();
const queueEngine = new SmsQueueEngine();
const registry = SmsProviderRegistry.getInstance();

// Providers list
smsRouter.get('/providers', (c) => {
  return c.json({
    success: true,
    default: registry.getDefaultName(),
    providers: registry.list()
  });
});

// Calculate segments
smsRouter.post('/calculate-segments', async (c) => {
  try {
    const body = await c.req.json();
    const text = body.text || '';
    const result = countSmsSegments(text);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// Config
smsRouter.get('/config', (c) => {
  const config = service.getConfig();
  const maskedApiKey = config.api_key ? config.api_key.substring(0, 4) + '****' + config.api_key.substring(config.api_key.length - 4) : '';
  return c.json({
    success: true,
    data: {
      ...config,
      api_key_masked: maskedApiKey
    }
  });
});

smsRouter.put('/config', async (c) => {
  try {
    const body = await c.req.json();
    const updated = service.updateConfig(body);
    return c.json({ success: true, data: updated });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// Send pattern (direct synchronous)
smsRouter.post('/send-pattern', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.recipient || !body.patternCode || !body.values) {
      return c.json({
        success: false,
        error: 'Missing required parameters: recipient, patternCode, and values are mandatory'
      }, 400);
    }
    const result = await service.sendPattern(body);
    return c.json({ success: true, data: result }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// Send direct (direct synchronous)
smsRouter.post('/send-direct', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.recipients || !body.messageText) {
      return c.json({
        success: false,
        error: 'Missing required parameters: recipients (array) and messageText are mandatory'
      }, 400);
    }
    const result = await service.sendDirect(body);
    return c.json({ success: true, data: result }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// --- Queue Engine Endpoints ---

smsRouter.get('/queue/stats', (c) => {
  const stats = queueEngine.getQueueStats();
  return c.json({ success: true, data: stats });
});

smsRouter.get('/queue', (c) => {
  const status = c.req.query('status');
  const recipient = c.req.query('recipient');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50;
  const items = queueEngine.listQueue({ status, recipient, limit });
  return c.json({ success: true, count: items.length, data: items });
});

smsRouter.post('/queue/enqueue-pattern', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.recipient || !body.patternCode || !body.values) {
      return c.json({ success: false, error: 'recipient, patternCode, and values are required' }, 400);
    }
    const result = queueEngine.enqueuePattern(body, {
      maxAttempts: body.maxAttempts,
      provider: body.provider
    });
    return c.json({ success: true, data: result }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

smsRouter.post('/queue/enqueue-direct', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.recipients || !body.messageText) {
      return c.json({ success: false, error: 'recipients and messageText are required' }, 400);
    }
    const result = queueEngine.enqueueDirect(body, {
      maxAttempts: body.maxAttempts,
      provider: body.provider
    });
    return c.json({ success: true, data: result }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

smsRouter.post('/queue/process', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const batchSize = body.batchSize || 10;
    const backoffBase = body.backoffBaseSeconds || 30;
    const result = await queueEngine.processBatch(batchSize, backoffBase);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

smsRouter.post('/queue/retry/:id', (c) => {
  try {
    const id = c.req.param('id');
    const result = queueEngine.retryItem(id);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 404);
  }
});

smsRouter.post('/queue/cancel/:id', (c) => {
  try {
    const id = c.req.param('id');
    const result = queueEngine.cancelItem(id);
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 404);
  }
});

// Logs & Templates
smsRouter.get('/logs', (c) => {
  const phone = c.req.query('phone');
  const status = c.req.query('status');
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50;
  const logs = service.getLogs({ phone, status, limit });
  return c.json({ success: true, count: logs.length, data: logs });
});

smsRouter.get('/templates', (c) => {
  const templates = service.getTemplates();
  return c.json({ success: true, data: templates });
});
