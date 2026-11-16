import unittest
import sqlite3
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from db_helper import get_connection, run_migrations
from test_t01_t02_baseline import normalize_iranian_phone

class TestModularApiRoutes(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        run_migrations(self.conn, migrations_dir="migrations")

    def tearDown(self):
        self.conn.close()

    def test_clients_crud_and_phone_normalization(self):
        cur = self.conn.cursor()
        raw_phone = "+98-912-888-7766"
        norm_phone = normalize_iranian_phone(raw_phone)
        self.assertEqual(norm_phone, "09128887766")

        # Create
        cur.execute("""
            INSERT INTO clients (id, name, phone, email, notes)
            VALUES ('cli_1', 'زهرا کریمی', ?, 'zahra@example.com', 'مشتری وفادار')
        """, (norm_phone,))
        self.conn.commit()

        # Read
        cur.execute("SELECT * FROM clients WHERE id = 'cli_1'")
        client = cur.fetchone()
        self.assertIsNotNone(client)
        self.assertEqual(client["name"], "زهرا کریمی")
        self.assertEqual(client["phone"], "09128887766")

        # Update
        cur.execute("UPDATE clients SET name = 'زهرا کریمی نژاد' WHERE id = 'cli_1'")
        self.conn.commit()
        cur.execute("SELECT name FROM clients WHERE id = 'cli_1'")
        self.assertEqual(cur.fetchone()["name"], "زهرا کریمی نژاد")

        # Delete
        cur.execute("DELETE FROM clients WHERE id = 'cli_1'")
        self.conn.commit()
        cur.execute("SELECT * FROM clients WHERE id = 'cli_1'")
        self.assertIsNone(cur.fetchone())

    def test_staff_and_services_setup(self):
        cur = self.conn.cursor()
        # Create Staff
        cur.execute("""
            INSERT INTO staff (id, name, phone, role, color, is_active)
            VALUES ('stf_1', 'سارا حسینی', '09121234567', 'hair_stylist', '#ec4899', 1)
        """)
        # Create Service
        cur.execute("""
            INSERT INTO services (id, name, duration_minutes, price_toman, category, is_active)
            VALUES ('srv_1', 'کوتاهی ژورنالی', 45, 180000, 'haircut', 1)
        """)
        self.conn.commit()

        cur.execute("SELECT * FROM staff WHERE id = 'stf_1'")
        staff = cur.fetchone()
        self.assertEqual(staff["name"], "سارا حسینی")

        cur.execute("SELECT * FROM services WHERE id = 'srv_1'")
        service = cur.fetchone()
        self.assertEqual(service["price_toman"], 180000)

    def test_appointments_creation_and_joins(self):
        cur = self.conn.cursor()
        # Seed dependencies
        cur.execute("INSERT INTO clients (id, name, phone) VALUES ('cli_test', 'نیلوفر راد', '09351234567')")
        cur.execute("INSERT INTO staff (id, name, phone) VALUES ('stf_test', 'مریم احمدی', '09121112233')")
        cur.execute("INSERT INTO services (id, name, duration_minutes, price_toman) VALUES ('srv_test', 'براشینگ تخصصی', 30, 95000)")

        # Create appointment
        start_time = "2026-11-20T10:00:00Z"
        end_time = "2026-11-20T10:30:00Z"
        cur.execute("""
            INSERT INTO appointments (id, client_id, staff_id, service_id, start_time, end_time, status, price_toman)
            VALUES ('apt_1', 'cli_test', 'stf_test', 'srv_test', ?, ?, 'confirmed', 95000)
        """, (start_time, end_time))
        self.conn.commit()

        # Query appointment with join
        cur.execute("""
            SELECT 
                a.*,
                c.name as client_name,
                s.name as staff_name,
                srv.name as service_name
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN staff s ON a.staff_id = s.id
            JOIN services srv ON a.service_id = srv.id
            WHERE a.id = 'apt_1'
        """)
        appt = cur.fetchone()
        self.assertIsNotNone(appt)
        self.assertEqual(appt["client_name"], "نیلوفر راد")
        self.assertEqual(appt["staff_name"], "مریم احمدی")
        self.assertEqual(appt["service_name"], "براشینگ تخصصی")
        self.assertEqual(appt["price_toman"], 95000)

    def test_products_crud(self):
        cur = self.conn.cursor()
        cur.execute("""
            INSERT INTO products (id, name, sku, price_toman, cost_toman, stock_quantity)
            VALUES ('prd_1', 'روغن آرگان مراکشی', 'ARG-OIL-50', 250000, 160000, 15)
        """)
        self.conn.commit()

        cur.execute("SELECT * FROM products WHERE id = 'prd_1'")
        prd = cur.fetchone()
        self.assertEqual(prd["name"], "روغن آرگان مراکشی")
        self.assertEqual(prd["price_toman"], 250000)

    def test_settings_bulk_update(self):
        cur = self.conn.cursor()
        settings = {
            "salon_name": "سالن زیبایی ماهور",
            "display_rial": "1",
            "timezone": "Asia/Tehran"
        }
        for k, v in settings.items():
            cur.execute("""
                INSERT INTO salon_settings (key, value, updated_at)
                VALUES (?, ?, datetime('now'))
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
            """, (k, v))
        self.conn.commit()

        cur.execute("SELECT key, value FROM salon_settings")
        saved = {r["key"]: r["value"] for r in cur.fetchall()}
        self.assertEqual(saved["salon_name"], "سالن زیبایی ماهور")
        self.assertEqual(saved["display_rial"], "1")

if __name__ == "__main__":
    unittest.main()
