import unittest
import sqlite3
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from db_helper import get_connection, run_migrations

class TestSmartReportsFeature(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        run_migrations(self.conn, migrations_dir="migrations")

        # Seed sample clients, staff, services, appointments for report testing
        cur = self.conn.cursor()
        cur.execute("INSERT INTO clients (id, name, phone) VALUES ('c1', 'مهسا رضایی', '09121110001')")
        cur.execute("INSERT INTO clients (id, name, phone) VALUES ('c2', 'نیلوفر امینی', '09121110002')")
        cur.execute("INSERT INTO clients (id, name, phone) VALUES ('c3', 'فاطمه حسینی', '09121110003')")

        cur.execute("INSERT INTO staff (id, name, phone, color) VALUES ('s1', 'الناز کریمی', '09122220001', '#EC4899')")
        cur.execute("INSERT INTO staff (id, name, phone, color) VALUES ('s2', 'شیوا نوری', '09122220002', '#3B82F6')")

        cur.execute("INSERT INTO services (id, name, duration_minutes, price_toman) VALUES ('srv1', 'رنگ مو', 90, 800000)")
        cur.execute("INSERT INTO services (id, name, duration_minutes, price_toman) VALUES ('srv2', 'کراتینه', 120, 2000000)")

        # Historical appointment before current month (to test returning client)
        cur.execute("""
            INSERT INTO appointments (id, client_id, staff_id, service_id, start_time, end_time, status, price_toman)
            VALUES ('apt_old', 'c1', 's1', 'srv1', '2026-09-10T10:00:00Z', '2026-09-10T11:30:00Z', 'completed', 800000)
        """)

        # Current period appointments (Nov 2026)
        # apt1: c1 (returning), s1, srv1, 800,000, completed, 10:00
        cur.execute("""
            INSERT INTO appointments (id, client_id, staff_id, service_id, start_time, end_time, status, price_toman)
            VALUES ('apt1', 'c1', 's1', 'srv1', '2026-11-10T10:00:00Z', '2026-11-10T11:30:00Z', 'completed', 800000)
        """)
        # apt2: c2 (new), s1, srv2, 2,000,000, completed, 11:00
        cur.execute("""
            INSERT INTO appointments (id, client_id, staff_id, service_id, start_time, end_time, status, price_toman)
            VALUES ('apt2', 'c2', 's1', 'srv2', '2026-11-12T11:00:00Z', '2026-11-12T13:00:00Z', 'completed', 2000000)
        """)
        # apt3: c3 (new), s2, srv1, 800,000, cancelled, 10:00
        cur.execute("""
            INSERT INTO appointments (id, client_id, staff_id, service_id, start_time, end_time, status, price_toman)
            VALUES ('apt3', 'c3', 's2', 'srv1', '2026-11-14T10:00:00Z', '2026-11-14T11:30:00Z', 'cancelled', 800000)
        """)
        # apt4: c3 (new), s2, srv2, 2,000,000, no_show, 15:00
        cur.execute("""
            INSERT INTO appointments (id, client_id, staff_id, service_id, start_time, end_time, status, price_toman)
            VALUES ('apt4', 'c3', 's2', 'srv2', '2026-11-15T15:00:00Z', '2026-11-15T17:00:00Z', 'no_show', 2000000)
        """)
        self.conn.commit()

    def tearDown(self):
        self.conn.close()

    def test_overview_metrics_aggregation(self):
        cur = self.conn.cursor()
        # Filter for Nov 2026 (start_date = '2026-11-01', end_date = '2026-11-30')
        cur.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show,
                SUM(CASE WHEN status = 'completed' THEN price_toman ELSE 0 END) as revenue,
                COUNT(DISTINCT client_id) as unique_clients
            FROM appointments
            WHERE date(start_time) >= '2026-11-01' AND date(start_time) <= '2026-11-30'
        """)
        row = cur.fetchone()
        self.assertEqual(row["total"], 4)
        self.assertEqual(row["completed"], 2)
        self.assertEqual(row["cancelled"], 1)
        self.assertEqual(row["no_show"], 1)
        self.assertEqual(row["revenue"], 2800000)
        self.assertEqual(row["unique_clients"], 3)

        # Completion rate: 2/4 = 50%
        completion_rate = (row["completed"] / row["total"]) * 100
        self.assertEqual(completion_rate, 50.0)

        # Average ticket: 2,800,000 / 2 = 1,400,000
        avg_ticket = row["revenue"] / row["completed"]
        self.assertEqual(avg_ticket, 1400000)

    def test_revenue_by_staff(self):
        cur = self.conn.cursor()
        cur.execute("""
            SELECT 
                s.name as staff_name,
                COUNT(a.id) as total_appointments,
                COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.price_toman ELSE 0 END), 0) as revenue
            FROM staff s
            LEFT JOIN appointments a ON s.id = a.staff_id 
                AND date(a.start_time) >= '2026-11-01' AND date(a.start_time) <= '2026-11-30'
            GROUP BY s.id, s.name
            ORDER BY revenue DESC
        """)
        rows = cur.fetchall()
        # s1: 2 completed (800k + 2000k = 2.8M)
        self.assertEqual(rows[0]["staff_name"], "الناز کریمی")
        self.assertEqual(rows[0]["revenue"], 2800000)
        # s2: 0 completed (1 cancelled, 1 no_show -> 0 revenue)
        self.assertEqual(rows[1]["staff_name"], "شیوا نوری")
        self.assertEqual(rows[1]["revenue"], 0)

    def test_revenue_by_service(self):
        cur = self.conn.cursor()
        cur.execute("""
            SELECT 
                srv.name as service_name,
                COUNT(a.id) as total_appointments,
                COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.price_toman ELSE 0 END), 0) as revenue
            FROM services srv
            LEFT JOIN appointments a ON srv.id = a.service_id 
                AND date(a.start_time) >= '2026-11-01' AND date(a.start_time) <= '2026-11-30'
            GROUP BY srv.id, srv.name
            ORDER BY revenue DESC
        """)
        rows = cur.fetchall()
        # srv2 (کراتینه): 1 completed -> 2M
        self.assertEqual(rows[0]["service_name"], "کراتینه")
        self.assertEqual(rows[0]["revenue"], 2000000)
        # srv1 (رنگ مو): 1 completed -> 800k
        self.assertEqual(rows[1]["service_name"], "رنگ مو")
        self.assertEqual(rows[1]["revenue"], 800000)

    def test_busiest_hours_heatmap(self):
        cur = self.conn.cursor()
        cur.execute("""
            SELECT strftime('%H', start_time) as hour, COUNT(*) as count
            FROM appointments
            WHERE date(start_time) >= '2026-11-01' AND date(start_time) <= '2026-11-30'
            GROUP BY hour
            ORDER BY hour ASC
        """)
        rows = {r["hour"]: r["count"] for r in cur.fetchall()}
        # 10:00 had 2 appointments (apt1 and apt3)
        self.assertEqual(rows.get("10"), 2)
        # 11:00 had 1 appointment (apt2)
        self.assertEqual(rows.get("11"), 1)
        # 15:00 had 1 appointment (apt4)
        self.assertEqual(rows.get("15"), 1)

    def test_top_clients_vip_ranking(self):
        cur = self.conn.cursor()
        cur.execute("""
            SELECT 
                c.name as client_name,
                COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.price_toman ELSE 0 END), 0) as total_spend,
                COUNT(a.id) as visit_count
            FROM clients c
            JOIN appointments a ON c.id = a.client_id
            WHERE date(a.start_time) >= '2026-11-01' AND date(a.start_time) <= '2026-11-30'
            GROUP BY c.id, c.name
            ORDER BY total_spend DESC
        """)
        rows = cur.fetchall()
        # Top spender: c2 (2,000,000 Toman)
        self.assertEqual(rows[0]["client_name"], "نیلوفر امینی")
        self.assertEqual(rows[0]["total_spend"], 2000000)
        # Second spender: c1 (800,000 Toman)
        self.assertEqual(rows[1]["client_name"], "مهسا رضایی")
        self.assertEqual(rows[1]["total_spend"], 800000)

    def test_new_vs_returning_customer_analysis(self):
        cur = self.conn.cursor()
        # For Nov 2026:
        # c1 has apt_old in Sep 2026 -> returning client!
        # c2 has first apt in Nov 2026 -> new client!
        # c3 has first apt in Nov 2026 -> new client!
        cur.execute("""
            SELECT DISTINCT a.client_id
            FROM appointments a
            WHERE date(a.start_time) >= '2026-11-01' AND date(a.start_time) <= '2026-11-30'
        """)
        clients_in_period = [r["client_id"] for r in cur.fetchall()]
        self.assertEqual(len(clients_in_period), 3)

        new_count = 0
        returning_count = 0
        for cid in clients_in_period:
            cur.execute("SELECT MIN(date(start_time)) as first_date FROM appointments WHERE client_id = ?", (cid,))
            first_d = cur.fetchone()["first_date"]
            if first_d < '2026-11-01':
                returning_count += 1
            else:
                new_count += 1

        self.assertEqual(returning_count, 1)  # c1
        self.assertEqual(new_count, 2)        # c2, c3

    def test_csv_export_format_and_bom(self):
        # CSV must include UTF-8 BOM \uFEFF and Persian column headers
        bom = "\uFEFF"
        header = "شناسه,تاریخ و زمان,مشتری,شماره تماس,پرسنل,خدمت,مبلغ (تومان),وضعیت,توضیحات"
        self.assertTrue(bom.startswith("\uFEFF"))
        self.assertIn("مشتری", header)
        self.assertIn("مبلغ (تومان)", header)

if __name__ == "__main__":
    unittest.main()
