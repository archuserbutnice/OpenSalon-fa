-- Migration 007: SMS Provider layer & queue engine

CREATE TABLE IF NOT EXISTS sms_queue (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'mediana',
    message_type TEXT NOT NULL CHECK (message_type IN ('pattern', 'direct')),
    recipient_phone TEXT NOT NULL,
    pattern_code TEXT,
    pattern_values_json TEXT,
    message_text TEXT,
    originator TEXT,
    segments INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    next_attempt_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_error TEXT,
    sms_log_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sms_queue_status_attempt ON sms_queue(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_sms_queue_recipient ON sms_queue(recipient_phone);

ALTER TABLE sms_logs ADD COLUMN segments INTEGER DEFAULT 1;
