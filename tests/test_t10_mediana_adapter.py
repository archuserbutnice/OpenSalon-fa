import unittest
import sqlite3
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from db_helper import get_connection, run_migrations
from test_t01_t02_baseline import normalize_iranian_phone

class TestMedianaAdapter(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        run_migrations(self.conn, migrations_dir="migrations")

    def tearDown(self):
        self.conn.close()

    def test_documented_endpoints(self):
        # Must strictly adhere to documented Mediana API URLs
        send_pattern_url = "https://api.mediana.ir/sms/v1/send/pattern"
        send_sms_url = "https://api.mediana.ir/sms/v1/send/sms"

        ts_file = os.path.join(os.path.dirname(__file__), "..", "src", "server", "services", "mediana.ts")
        with open(ts_file, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn(send_pattern_url, content)
        self.assertIn(send_sms_url, content)
        self.assertIn("X-API-KEY", content)

    def test_template_required_variable_validation(self):
        cur = self.conn.cursor()
        cur.execute("SELECT * FROM sms_templates WHERE pattern_code = 'salon_appt_confirm'")
        tpl = cur.fetchone()
        self.assertIsNotNone(tpl)
        req_vars = json.loads(tpl["required_variables"])
        self.assertIn("name", req_vars)
        self.assertIn("service", req_vars)
        self.assertIn("date", req_vars)
        self.assertIn("time", req_vars)

        # Values missing 'date'
        bad_values = {"name": "نگین", "service": "میکاپ", "time": "۱۶:۰۰"}
        missing = [v for v in req_vars if v not in bad_values]
        self.assertEqual(missing, ["date"])

    def test_template_rendering(self):
        cur = self.conn.cursor()
        cur.execute("SELECT sample_text FROM sms_templates WHERE pattern_code = 'salon_auth_otp'")
        tpl = cur.fetchone()
        sample = tpl["sample_text"]

        code = "58291"
        rendered = sample.replace("%code%", code)
        self.assertIn(code, rendered)
        self.assertNotIn("%code%", rendered)

    def test_sandbox_mode_logging_and_segments(self):
        cur = self.conn.cursor()
        norm_phone = normalize_iranian_phone("09121234567")
        log_id = "sms_test_sb_1"
        mock_msg_id = "med_mock_test_abc"

        # Record pattern message with 1 segment
        cur.execute("""
            INSERT INTO sms_logs (
                id, recipient_phone, message_type, pattern_code, pattern_values_json,
                originator, provider, status, provider_message_id, segments, sent_at
            ) VALUES (?, ?, 'pattern', 'salon_auth_otp', '{"code":"12345"}', '+9810001', 'mediana', 'sent', ?, 1, datetime('now'))
        """, (log_id, norm_phone, mock_msg_id))
        self.conn.commit()

        cur.execute("SELECT * FROM sms_logs WHERE id = ?", (log_id,))
        log = cur.fetchone()
        self.assertIsNotNone(log)
        self.assertEqual(log["recipient_phone"], "09121234567")
        self.assertEqual(log["status"], "sent")
        self.assertEqual(log["provider"], "mediana")
        self.assertEqual(log["provider_message_id"], mock_msg_id)
        self.assertEqual(log["segments"], 1)

if __name__ == "__main__":
    unittest.main()
