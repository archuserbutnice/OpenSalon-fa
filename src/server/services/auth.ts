import { createHash, randomBytes } from 'crypto';
import { getDb } from '../db';
import { normalizeIranianPhone } from '../../client/lib/phone';

export interface User {
  id: string;
  staff_id: string | null;
  phone: string;
  email: string | null;
  name: string;
  role: 'owner' | 'staff' | 'manager';
  is_active: number;
  created_at: string;
}

export class AuthService {
  private db: any;

  constructor(db?: any) {
    this.db = db || getDb();
  }

  hashPassword(password: string, salt: string): string {
    return createHash('sha256').update(password + salt).digest('hex');
  }

  generateSalt(length: number = 16): string {
    return randomBytes(length).toString('hex');
  }

  generateToken(length: number = 32): string {
    return 'tok_' + randomBytes(length).toString('hex');
  }

  login(identifier: string, password: string, ip?: string, userAgent?: string) {
    if (!identifier || !password) {
      throw new Error('Identifier (phone or email) and password are required');
    }

    const normalizedPhone = normalizeIranianPhone(identifier);
    let user: any = null;

    if (normalizedPhone) {
      user = this.db.prepare('SELECT * FROM users WHERE phone = ?').get(normalizedPhone);
    }
    if (!user) {
      user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(identifier.trim().toLowerCase());
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    const calculatedHash = this.hashPassword(password, user.salt);
    if (calculatedHash !== user.password_hash) {
      throw new Error('Invalid credentials');
    }

    // 7 days expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const token = this.generateToken();

    this.db.prepare(`
      INSERT INTO sessions (token, user_id, role, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(token, user.id, user.role, ip || null, userAgent || null, expiresAt);

    return {
      token,
      expiresAt,
      user: {
        id: user.id,
        staffId: user.staff_id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role
      }
    };
  }

  validateSession(token: string): { user: User; token: string } | null {
    if (!token) return null;

    const row = this.db.prepare(`
      SELECT s.token, s.expires_at, u.id, u.staff_id, u.phone, u.email, u.name, u.role, u.is_active, u.created_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ?
    `).get(token);

    if (!row) return null;

    // Check expiration
    if (new Date(row.expires_at).getTime() < Date.now()) {
      this.revokeSession(token);
      return null;
    }

    if (!row.is_active) {
      return null;
    }

    return {
      token: row.token,
      user: {
        id: row.id,
        staff_id: row.staff_id,
        phone: row.phone,
        email: row.email,
        name: row.name,
        role: row.role,
        is_active: row.is_active,
        created_at: row.created_at
      }
    };
  }

  revokeSession(token: string): boolean {
    const res = this.db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return res.changes > 0;
  }

  createUser(data: {
    name: string;
    phone: string;
    password: string;
    role: 'owner' | 'staff' | 'manager';
    email?: string;
    staffId?: string;
  }): User {
    const normPhone = normalizeIranianPhone(data.phone);
    if (!normPhone) {
      throw new Error('Invalid Iranian mobile phone number');
    }

    const salt = this.generateSalt();
    const passwordHash = this.hashPassword(data.password, salt);
    const id = 'usr_' + Math.random().toString(36).substring(2, 10);

    this.db.prepare(`
      INSERT INTO users (id, staff_id, phone, email, name, role, password_hash, salt, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id,
      data.staffId || null,
      normPhone,
      data.email ? data.email.trim().toLowerCase() : null,
      data.name.trim(),
      data.role,
      passwordHash,
      salt
    );

    return this.db.prepare('SELECT id, staff_id, phone, email, name, role, is_active, created_at FROM users WHERE id = ?').get(id);
  }
}
