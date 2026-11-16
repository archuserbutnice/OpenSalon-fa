import { Hono } from 'hono';
import { AuthService } from '../services/auth';

export const authRouter = new Hono();
const service = new AuthService();

function extractToken(c: any): string | null {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return c.req.query('token') || null;
}

authRouter.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const result = service.login(
      body.identifier,
      body.password,
      c.req.header('x-forwarded-for') || undefined,
      c.req.header('user-agent') || undefined
    );
    return c.json({ success: true, data: result });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 401);
  }
});

authRouter.get('/me', (c) => {
  const token = extractToken(c);
  if (!token) {
    return c.json({ success: false, error: 'Authorization token required' }, 401);
  }

  const session = service.validateSession(token);
  if (!session) {
    return c.json({ success: false, error: 'Invalid or expired session' }, 401);
  }

  return c.json({
    success: true,
    data: {
      user: session.user,
      token: session.token
    }
  });
});

authRouter.post('/logout', (c) => {
  const token = extractToken(c);
  if (token) {
    service.revokeSession(token);
  }
  return c.json({ success: true, message: 'Logged out successfully' });
});

authRouter.post('/users', async (c) => {
  // Only authenticated owners can create users
  const token = extractToken(c);
  if (!token) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const session = service.validateSession(token);
  if (!session || session.user.role !== 'owner') {
    return c.json({ success: false, error: 'Forbidden: Owner role required' }, 403);
  }

  try {
    const body = await c.req.json();
    const newUser = service.createUser(body);
    return c.json({ success: true, data: newUser }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});
