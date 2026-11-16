-- Migration 002: Persian localization settings and schema migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS salon_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO salon_settings (key, value) VALUES
    ('salon_name', 'سالن زیبایی رز'),
    ('default_locale', 'fa'),
    ('calendar_type', 'jalali'),
    ('currency', 'toman'),
    ('display_rial', '0'),
    ('week_start_day', 'saturday'),
    ('timezone', 'Asia/Tehran');
