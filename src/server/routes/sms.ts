import { Hono } from 'hono';
import { MedianaService } from '../services/mediana';

export const smsRouter = new Hono();
const service = new MedianaService();

smsRouter.get('/config', (c) => {
  const config = service.getConfig();
  // Mask API key for security
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
