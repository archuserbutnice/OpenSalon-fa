import unittest
import sqlite3
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from db_helper import get_connection, run_migrations
from test_t01_t02_baseline import normalize_iranian_phone

class TestInventoryFeature(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        run_migrations(self.conn, migrations_dir="migrations")

    def tearDown(self):
        self.conn.close()

    def test_migration_003_applied(self):
        cur = self.conn.cursor()
        cur.execute("SELECT version FROM schema_migrations WHERE version = '003_inventory'")
        self.assertIsNotNone(cur.fetchone())

        # Check seeded categories and supplier
        cur.execute("SELECT COUNT(*) as count FROM inventory_categories")
        self.assertGreaterEqual(cur.fetchone()["count"], 4)

        cur.execute("SELECT * FROM suppliers WHERE id = 'sup_alborz'")
        sup = cur.fetchone()
        self.assertIsNotNone(sup)
        self.assertEqual(sup["phone"], "09121112233")

    def test_create_inventory_item(self):
        cur = self.conn.cursor()
        cur.execute("""
            INSERT INTO inventory_items (
                id, name, sku, category_id, supplier_id, unit, quantity, min_quantity,
                cost_price_toman, selling_price_toman, is_retail, is_backbar, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "item_test_1", "شامپو بدون سولفات ۵۰۰ میل", "SHM-SLF-500", "cat_care", "sup_alborz",
            "عدد", 10, 3, 120000, 190000, 1, 1, "مناسب موهای کراتین شده"
        ))
        self.conn.commit()

        cur.execute("SELECT * FROM inventory_items WHERE id = 'item_test_1'")
        item = cur.fetchone()
        self.assertIsNotNone(item)
        self.assertEqual(item["name"], "شامپو بدون سولفات ۵۰۰ میل")
        self.assertEqual(item["quantity"], 10)
        self.assertEqual(item["min_quantity"], 3)
        self.assertEqual(item["cost_price_toman"], 120000)

    def test_record_transactions_and_stock_updates(self):
        cur = self.conn.cursor()
        cur.execute("""
            INSERT INTO inventory_items (id, name, sku, unit, quantity, min_quantity, cost_price_toman)
            VALUES ('item_test_2', 'اکسیدان ۶ درصد', 'OXI-06-1L', 'بطری', 5, 2, 45000)
        """)
        self.conn.commit()

        # 1. Stock In: Add 5 bottles
        cur.execute("""
            INSERT INTO inventory_transactions (id, item_id, transaction_type, quantity, unit_cost_toman, notes)
            VALUES ('tx_1', 'item_test_2', 'in', 5, 45000, 'خرید فاکتور شماره ۱۰۱')
        """)
        cur.execute("UPDATE inventory_items SET quantity = quantity + 5 WHERE id = 'item_test_2'")
        self.conn.commit()

        cur.execute("SELECT quantity FROM inventory_items WHERE id = 'item_test_2'")
        self.assertEqual(cur.fetchone()["quantity"], 10)

        # 2. Salon Usage (Out): Use 3 bottles
        cur.execute("""
            INSERT INTO inventory_transactions (id, item_id, transaction_type, quantity, unit_cost_toman, reference_id)
            VALUES ('tx_2', 'item_test_2', 'usage_appointment', 3, 45000, 'appt_123')
        """)
        cur.execute("UPDATE inventory_items SET quantity = quantity - 3 WHERE id = 'item_test_2'")
        self.conn.commit()

        cur.execute("SELECT quantity FROM inventory_items WHERE id = 'item_test_2'")
        self.assertEqual(cur.fetchone()["quantity"], 7)

    def test_low_stock_detection(self):
        cur = self.conn.cursor()
        cur.execute("""
            INSERT INTO inventory_items (id, name, sku, unit, quantity, min_quantity, cost_price_toman)
            VALUES 
                ('item_low', 'پودر دکلره بنفش', 'DEC-PUR-500', 'بسته', 2, 5, 310000),
                ('item_ok', 'سرم آرگان ۱۰۰ میل', 'ARG-SRM-100', 'عدد', 8, 3, 180000)
        """)
        self.conn.commit()

        # Query low stock items where quantity <= min_quantity
        cur.execute("SELECT id, name FROM inventory_items WHERE quantity <= min_quantity")
        low_stock_items = [r["id"] for r in cur.fetchall()]
        self.assertIn("item_low", low_stock_items)
        self.assertNotIn("item_ok", low_stock_items)

    def test_supplier_phone_normalization(self):
        raw_phone = "+98 935 987 6543"
        norm = normalize_iranian_phone(raw_phone)
        self.assertEqual(norm, "09359876543")

        cur = self.conn.cursor()
        cur.execute("""
            INSERT INTO suppliers (id, name, phone, contact_person)
            VALUES ('sup_test', 'شرکت پخش گل سرخ', ?, 'خانم امینی')
        """, (norm,))
        self.conn.commit()

        cur.execute("SELECT phone FROM suppliers WHERE id = 'sup_test'")
        self.assertEqual(cur.fetchone()["phone"], "09359876543")

if __name__ == "__main__":
    unittest.main()
