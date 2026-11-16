import unittest
import sqlite3
import os
import sys
import math
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(__file__))
from db_helper import get_connection, run_migrations

def calculate_burn_rate_and_stockout(conn, item_id, lookback_days=30):
    cur = conn.cursor()
    cur.execute("SELECT quantity, min_quantity, cost_price_toman FROM inventory_items WHERE id = ?", (item_id,))
    item = cur.fetchone()
    if not item:
        return None

    cur.execute("""
        SELECT COALESCE(SUM(quantity), 0) as total_used
        FROM inventory_transactions
        WHERE item_id = ?
          AND transaction_type IN ('out', 'usage_appointment')
          AND created_at >= datetime('now', '-' || ? || ' days')
    """, (item_id, lookback_days))
    total_used = cur.fetchone()["total_used"]
    daily_burn_rate = total_used / float(lookback_days)

    if item["quantity"] <= 0:
        days_to_stockout = 0
    elif daily_burn_rate > 0:
        days_to_stockout = math.floor(item["quantity"] / daily_burn_rate)
    else:
        days_to_stockout = None

    return {
        "current_quantity": item["quantity"],
        "min_quantity": item["min_quantity"],
        "cost_price_toman": item["cost_price_toman"],
        "total_used": total_used,
        "daily_burn_rate": daily_burn_rate,
        "days_to_stockout": days_to_stockout
    }

def process_appointment_consumption(conn, appointment_id):
    cur = conn.cursor()
    cur.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,))
    apt = cur.fetchone()
    if not apt or apt["status"] != "completed":
        return {"processed": False, "reason": "Not completed"}

    cur.execute("SELECT COUNT(*) as count FROM appointment_consumption_logs WHERE appointment_id = ?", (appointment_id,))
    if cur.fetchone()["count"] > 0:
        return {"processed": False, "reason": "Already processed"}

    cur.execute("""
        SELECT sc.*, i.name as item_name, i.cost_price_toman
        FROM service_consumptions sc
        JOIN inventory_items i ON sc.item_id = i.id
        WHERE sc.service_id = ?
    """, (apt["service_id"],))
    mappings = cur.fetchall()

    items_consumed = []
    for m in mappings:
        qty_to_deduct = int(math.ceil(m["quantity_used"]))
        tx_id = f"tx_auto_{appointment_id}_{m['item_id']}"
        log_id = f"log_{appointment_id}_{m['item_id']}"

        cur.execute("""
            INSERT INTO inventory_transactions (
                id, item_id, transaction_type, quantity, unit_cost_toman, reference_id, notes
            ) VALUES (?, ?, 'usage_appointment', ?, ?, ?, ?)
        """, (tx_id, m["item_id"], qty_to_deduct, m["cost_price_toman"], appointment_id, f"Auto usage apt {appointment_id}"))

        cur.execute("""
            UPDATE inventory_items
            SET quantity = quantity - ?, updated_at = datetime('now')
            WHERE id = ?
        """, (qty_to_deduct, m["item_id"]))

        cur.execute("""
            INSERT INTO appointment_consumption_logs (
                id, appointment_id, item_id, quantity, unit_cost_toman, transaction_id
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (log_id, appointment_id, m["item_id"], qty_to_deduct, m["cost_price_toman"], tx_id))

        items_consumed.append({"item_id": m["item_id"], "quantity": qty_to_deduct})

    conn.commit()
    return {"processed": True, "items_consumed": items_consumed}

class TestSmartInventoryFeature(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        run_migrations(self.conn, migrations_dir="migrations")

        # Seed baseline client, staff, and service for tests
        cur = self.conn.cursor()
        cur.execute("""
            INSERT INTO clients (id, name, phone)
            VALUES ('cli_smart_1', 'زهرا تهرانی', '09121234567')
        """)
        cur.execute("""
            INSERT INTO staff (id, name, phone, color)
            VALUES ('stf_smart_1', 'مریم احمدی', '09129876543', '#EC4899')
        """)
        cur.execute("""
            INSERT INTO services (id, name, duration_minutes, price_toman)
            VALUES ('srv_color', 'رنگ و لایت تخصصی', 120, 1500000)
        """)
        cur.execute("""
            INSERT INTO inventory_items (
                id, name, sku, category_id, supplier_id, unit, quantity, min_quantity,
                cost_price_toman, selling_price_toman
            ) VALUES 
                ('item_color_tube', 'تیوپ رنگ مو بلوند', 'COL-BLN-01', 'cat_hair_color', 'sup_alborz', 'تیوپ', 10, 4, 85000, 140000),
                ('item_oxidant_1l', 'اکسیدان ۹ درصد ۱ لیتری', 'OXI-09-1L', 'cat_hair_color', 'sup_alborz', 'بطری', 8, 3, 40000, 75000)
        """)
        self.conn.commit()

    def tearDown(self):
        self.conn.close()

    def test_migration_006_applied(self):
        cur = self.conn.cursor()
        cur.execute("SELECT version FROM schema_migrations WHERE version = '006_smart_inventory'")
        self.assertIsNotNone(cur.fetchone())

        # Verify new tables exist
        for tbl in ["service_consumptions", "inventory_batches", "appointment_consumption_logs"]:
            cur.execute(f"SELECT COUNT(*) FROM {tbl}")
            self.assertEqual(cur.fetchone()[0], 0)

        # Verify columns added to inventory_items
        cur.execute("PRAGMA table_info(inventory_items)")
        col_names = [r["name"] for r in cur.fetchall()]
        self.assertIn("expiry_date", col_names)
        self.assertIn("batch_number", col_names)

    def test_service_consumption_mapping(self):
        cur = self.conn.cursor()
        # Map 1 tube of color and 1 bottle of oxidant to srv_color
        cur.execute("""
            INSERT INTO service_consumptions (id, service_id, item_id, quantity_used, unit)
            VALUES 
                ('sc_1', 'srv_color', 'item_color_tube', 1.0, 'تیوپ'),
                ('sc_2', 'srv_color', 'item_oxidant_1l', 0.5, 'بطری')
        """)
        self.conn.commit()

        cur.execute("""
            SELECT sc.*, i.name as item_name
            FROM service_consumptions sc
            JOIN inventory_items i ON sc.item_id = i.id
            WHERE sc.service_id = 'srv_color'
            ORDER BY sc.id ASC
        """)
        rows = cur.fetchall()
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["item_id"], "item_color_tube")
        self.assertEqual(rows[0]["quantity_used"], 1.0)
        self.assertEqual(rows[1]["item_id"], "item_oxidant_1l")
        self.assertEqual(rows[1]["quantity_used"], 0.5)

    def test_auto_decrement_on_appointment_completion(self):
        cur = self.conn.cursor()
        # 1. Setup consumption mapping: srv_color uses 2 tubes of color
        cur.execute("""
            INSERT INTO service_consumptions (id, service_id, item_id, quantity_used, unit)
            VALUES ('sc_1', 'srv_color', 'item_color_tube', 2.0, 'تیوپ')
        """)

        # 2. Create appointment in 'confirmed' status
        cur.execute("""
            INSERT INTO appointments (id, client_id, staff_id, service_id, start_time, end_time, status, price_toman)
            VALUES ('apt_smart_test', 'cli_smart_1', 'stf_smart_1', 'srv_color', '2026-11-17T10:00:00Z', '2026-11-17T12:00:00Z', 'confirmed', 1500000)
        """)
        self.conn.commit()

        # Before completion, stock must still be 10
        cur.execute("SELECT quantity FROM inventory_items WHERE id = 'item_color_tube'")
        self.assertEqual(cur.fetchone()["quantity"], 10)

        # 3. Change status to completed and trigger consumption
        cur.execute("UPDATE appointments SET status = 'completed' WHERE id = 'apt_smart_test'")
        self.conn.commit()

        res = process_appointment_consumption(self.conn, 'apt_smart_test')
        self.assertTrue(res["processed"])
        self.assertEqual(len(res["items_consumed"]), 1)
        self.assertEqual(res["items_consumed"][0]["quantity"], 2)

        # Stock must now be 8
        cur.execute("SELECT quantity FROM inventory_items WHERE id = 'item_color_tube'")
        self.assertEqual(cur.fetchone()["quantity"], 8)

        # Transaction recorded
        cur.execute("SELECT * FROM inventory_transactions WHERE reference_id = 'apt_smart_test'")
        tx = cur.fetchone()
        self.assertIsNotNone(tx)
        self.assertEqual(tx["transaction_type"], "usage_appointment")
        self.assertEqual(tx["quantity"], 2)

        # 4. Test Idempotency: Running again must NOT double-decrement
        res2 = process_appointment_consumption(self.conn, 'apt_smart_test')
        self.assertFalse(res2["processed"])
        self.assertEqual(res2["reason"], "Already processed")

        cur.execute("SELECT quantity FROM inventory_items WHERE id = 'item_color_tube'")
        self.assertEqual(cur.fetchone()["quantity"], 8)

    def test_deterministic_days_to_stockout(self):
        cur = self.conn.cursor()
        # Item has 30 in stock
        cur.execute("UPDATE inventory_items SET quantity = 30 WHERE id = 'item_color_tube'")
        # Insert 15 units of usage over the last 30 days
        past_date = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
        cur.execute("""
            INSERT INTO inventory_transactions (id, item_id, transaction_type, quantity, created_at)
            VALUES ('tx_hist_1', 'item_color_tube', 'usage_appointment', 15, ?)
        """, (past_date,))
        self.conn.commit()

        stats = calculate_burn_rate_and_stockout(self.conn, 'item_color_tube', lookback_days=30)
        self.assertEqual(stats["total_used"], 15)
        self.assertAlmostEqual(stats["daily_burn_rate"], 0.5)
        # 30 units / 0.5 units/day = 60 days
        self.assertEqual(stats["days_to_stockout"], 60)

    def test_reorder_suggestion_rules(self):
        cur = self.conn.cursor()
        # Item 1: Stock is 2 (min is 4) -> Below min quantity
        cur.execute("UPDATE inventory_items SET quantity = 2 WHERE id = 'item_color_tube'")
        self.conn.commit()

        stats = calculate_burn_rate_and_stockout(self.conn, 'item_color_tube', lookback_days=30)
        # Below min -> Needs reorder
        is_reorder_needed = (stats["current_quantity"] <= stats["min_quantity"])
        self.assertTrue(is_reorder_needed)

        # Suggested target stock: max(min * 2 = 8, 30-day burn = 0, 5) = 8
        target_stock = max(stats["min_quantity"] * 2, 5)
        suggested_reorder_qty = target_stock - stats["current_quantity"]
        self.assertEqual(suggested_reorder_qty, 6)
        self.assertEqual(suggested_reorder_qty * stats["cost_price_toman"], 6 * 85000)

    def test_inventory_valuation_report(self):
        cur = self.conn.cursor()
        # item_color_tube: 10 * 85,000 cost = 850,000; 10 * 140,000 retail = 1,400,000
        # item_oxidant_1l: 8 * 40,000 cost = 320,000; 8 * 75,000 retail = 600,000
        # Total cost: 1,170,000; Total retail: 2,000,000; Profit: 830,000
        cur.execute("""
            SELECT 
                COUNT(*) as total_items,
                SUM(quantity) as total_qty,
                SUM(quantity * cost_price_toman) as total_cost,
                SUM(quantity * selling_price_toman) as total_retail
            FROM inventory_items
        """)
        row = cur.fetchone()
        self.assertEqual(row["total_items"], 2)
        self.assertEqual(row["total_qty"], 18)
        self.assertEqual(row["total_cost"], 1170000)
        self.assertEqual(row["total_retail"], 2000000)
        self.assertEqual(row["total_retail"] - row["total_cost"], 830000)

    def test_batches_and_expiry(self):
        cur = self.conn.cursor()
        expiry = (datetime.now(timezone.utc) + timedelta(days=15)).strftime("%Y-%m-%d")
        cur.execute("""
            INSERT INTO inventory_batches (id, item_id, batch_number, expiry_date, quantity, cost_price_toman)
            VALUES ('batch_01', 'item_color_tube', 'BATCH-2026-A', ?, 12, 85000)
        """, (expiry,))
        self.conn.commit()

        # Query expiring in 30 days
        cur.execute("""
            SELECT * FROM inventory_batches
            WHERE expiry_date IS NOT NULL
              AND date(expiry_date) <= date('now', '+30 days')
        """)
        batches = cur.fetchall()
        self.assertEqual(len(batches), 1)
        self.assertEqual(batches[0]["batch_number"], "BATCH-2026-A")
        self.assertEqual(batches[0]["quantity"], 12)

if __name__ == "__main__":
    unittest.main()
