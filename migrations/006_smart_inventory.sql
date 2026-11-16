-- Migration 006: Smart Inventory (Service consumption mapping, batch/expiry tracking, appointment consumption logs)

CREATE TABLE IF NOT EXISTS service_consumptions (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity_used REAL NOT NULL DEFAULT 1,
    unit TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
    UNIQUE(service_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_service_consumptions_service ON service_consumptions(service_id);
CREATE INDEX IF NOT EXISTS idx_service_consumptions_item ON service_consumptions(item_id);

CREATE TABLE IF NOT EXISTS inventory_batches (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    expiry_date TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    cost_price_toman INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_item ON inventory_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON inventory_batches(expiry_date);

CREATE TABLE IF NOT EXISTS appointment_consumption_logs (
    id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_cost_toman INTEGER NOT NULL DEFAULT 0,
    transaction_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
    UNIQUE(appointment_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_appointment_consumption_apt ON appointment_consumption_logs(appointment_id);

ALTER TABLE inventory_items ADD COLUMN expiry_date TEXT;
ALTER TABLE inventory_items ADD COLUMN batch_number TEXT;
