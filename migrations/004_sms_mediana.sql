-- Migration 004: SMS Mediana gateway schema
CREATE TABLE IF NOT EXISTS sms_configs (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'mediana',
    api_key TEXT NOT NULL,
    default_originator TEXT NOT NULL DEFAULT '+9810001',
    is_active INTEGER NOT NULL DEFAULT 1,
    is_sandbox INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sms_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pattern_code TEXT NOT NULL UNIQUE,
    description TEXT,
    sample_text TEXT,
    required_variables TEXT, -- JSON array of variable names e.g. ["name", "date", "time"]
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sms_logs (
    id TEXT PRIMARY KEY,
    recipient_phone TEXT NOT NULL, -- Normalized 09xxxxxxxxx
    message_type TEXT NOT NULL CHECK (message_type IN ('pattern', 'direct')),
    pattern_code TEXT,
    pattern_values_json TEXT,
    message_text TEXT,
    originator TEXT,
    provider TEXT NOT NULL DEFAULT 'mediana',
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
    provider_message_id TEXT,
    error_message TEXT,
    sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient ON sms_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON sms_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);

-- Seed default initial config (sandbox mode enabled by default)
INSERT OR IGNORE INTO sms_configs (id, provider, api_key, default_originator, is_active, is_sandbox) VALUES
    ('cfg_mediana_default', 'mediana', 'mediana_test_api_key_sandbox', '+9810001', 1, 1);

-- Seed approved standard pattern templates for beauty salon
INSERT OR IGNORE INTO sms_templates (id, name, pattern_code, description, sample_text, required_variables) VALUES
    (
        'tpl_confirm',
        'تایید نوبت سالن',
        'salon_appt_confirm',
        'ارسال پیامک تایید بلافاصله پس از ثبت نوبت مشتری',
        'مشتری گرامی %name%، نوبت شما برای خدمت %service% در تاریخ %date% ساعت %time% ثبت گردید. سالن زیبایی رز',
        '["name", "service", "date", "time"]'
    ),
    (
        'tpl_reminder',
        'یادآوری نوبت فردا',
        'salon_appt_reminder',
        'ارسال پیامک یادآوری روز قبل از موعد نوبت',
        'سلام %name% عزیز، نوبت شما برای فردا ساعت %time% رزرو شده است. در صورت نیاز به تغییر اطلاع دهید.',
        '["name", "time"]'
    ),
    (
        'tpl_otp',
        'کد تایید ورود (OTP)',
        'salon_auth_otp',
        'کد یکبار مصرف جهت احراز هویت مشتری یا پرسنل',
        'کد ورود شما به سالن زیبایی رز: %code%',
        '["code"]'
    );
