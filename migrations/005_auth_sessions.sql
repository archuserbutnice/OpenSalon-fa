-- Migration 005: Authentication and session management schema
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    staff_id TEXT,
    phone TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'staff', 'manager')),
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (staff_id) REFERENCES staff(id)
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Seed default initial Salon Owner
-- Default test password is 'admin123'
-- Hash created with SHA-256(password + salt)
INSERT OR IGNORE INTO users (
    id, staff_id, phone, email, name, role, password_hash, salt, is_active
) VALUES (
    'usr_owner_default',
    NULL,
    '09120000000',
    'admin@opensalon.local',
    'مدیر ارشد سالن رز',
    'owner',
    'fe80a2b3c1b2682ffa79533b004b40867afd6ac5c2bc8e4f8072144cd5d52f25', -- sha256('admin123' + 's@lt_opensalon_fa')
    's@lt_opensalon_fa',
    1
);
