-- Migration 003: Inventory management schema
CREATE TABLE IF NOT EXISTS inventory_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    category_id TEXT,
    supplier_id TEXT,
    unit TEXT NOT NULL DEFAULT 'عدد',
    quantity INTEGER NOT NULL DEFAULT 0,
    min_quantity INTEGER NOT NULL DEFAULT 5,
    cost_price_toman INTEGER NOT NULL DEFAULT 0,
    selling_price_toman INTEGER NOT NULL DEFAULT 0,
    is_retail INTEGER NOT NULL DEFAULT 1,
    is_backbar INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES inventory_categories(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in', 'out', 'adjustment', 'usage_appointment')),
    quantity INTEGER NOT NULL,
    unit_cost_toman INTEGER NOT NULL DEFAULT 0,
    reference_id TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (item_id) REFERENCES inventory_items(id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier ON inventory_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created ON inventory_transactions(created_at);

-- Initial Categories
INSERT OR IGNORE INTO inventory_categories (id, name, description) VALUES
    ('cat_hair_color', 'رنگ مو و اکسیدان', 'انواع رنگ مو، دکلره و اکسیدان‌های تخصصی'),
    ('cat_care', 'کراتین و مراقبت مو', 'شامپو، ماسک مو، سرم و مواد کراتینه و احیا'),
    ('cat_skin', 'مراقبت پوست', 'محصولات فیشیال، کرم‌ها و پاک‌کننده‌ها'),
    ('cat_consumables', 'لوازم مصرفی', 'حوله یکبار مصرف، فویل، پیش‌بند و دستکش');

-- Initial Supplier
INSERT OR IGNORE INTO suppliers (id, name, contact_person, phone, address) VALUES
    ('sup_alborz', 'پخش آرایشی البرز', 'آقای رضایی', '09121112233', 'تهران، خیابان منوچهری، پاساژ مرجان');
