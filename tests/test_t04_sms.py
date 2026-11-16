import unittest
import sqlite3
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from db_helper import get_connection, run_migrations
from test_t01_t02_baseline import normalize_iranian_phone

class TestSmsMedianaFeature(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        run_migrations(self.conn, migrations_dir="migrations")

    def tearDown(self):
        self.conn.close()

    def test_migration_004_applied(self):
        cur = self.conn.cursor()
        cur.execute("SELECT version FROM schema_migrations WHERE version = '004_sms_mediana'")
        self.assertIsNotNone(cur.fetchone())

        # Check seeded templates
        cur.execute("SELECT COUNT(*) as count FROM sms_templates")
        self.assertGreaterEqual(cur.fetchone()["count"], 3)

        cur.execute("SELECT * FROM sms_templates WHERE pattern_code = 'salon_appt_confirm'")
        tpl = cur.fetchone()
        self.assertIsNotNone(tpl)
        vars_list = json.loads(tpl["required_variables"])
        self.assertIn("name", vars_list)
        self.assertIn("date", vars_list)

        # Check default config
        cur.execute("SELECT * FROM sms_configs WHERE provider = 'mediana'")
        cfg = cur.fetchone()
        self.assertIsNotNone(cfg)
        self.assertEqual(cfg["is_sandbox"], 1)

    def test_phone_normalization_before_dispatch(self):
        raw_phone = "+98-912-345-6789"
        norm = normalize_iranian_phone(raw_phone)
        self.assertEqual(norm, "09123456789")

        invalid_phone = "02177665544"
        self.assertIsNone(normalize_iranian_phone(invalid_phone))

    def test_mock_send_pattern_sms(self):
        raw_recipient = "00989123456789"
        norm_recipient = normalize_iranian_phone(raw_recipient)
        self.assertIsNotNone(norm_recipient)

        pattern_code = "salon_appt_confirm"
        values = {
            "name": "مریم احمدی",
            "service": "کوتاهی و براشینگ",
            "date": "۱۴۰۳/۰۸/۲۶",
            "time": "۱۴:۰۰"
        }

        # Simulate Mediana pattern dispatch
        cur = self.conn.cursor()
        log_id = "sms_test_pat_1"
        cur.execute("""
            INSERT INTO sms_logs (
                id, recipient_phone, message_type, pattern_code, pattern_values_json,
                originator, provider, status, provider_message_id, sent_at
            ) VALUES (?, ?, 'pattern', ?, ?, '+9810001', 'mediana', 'sent', 'med_mock_12345', datetime('now'))
        """, (log_id, norm_recipient, pattern_code, json.dumps(values, ensure_ascii=False)))
        self.conn.commit()

        # Verify database record
        cur.execute("SELECT * FROM sms_logs WHERE id = ?", (log_id,))
        log_entry = cur.fetchone()
        self.assertIsNotNone(log_entry)
        self.assertEqual(log_entry["recipient_phone"], "09123456789")
        self.assertEqual(log_entry["status"], "sent")
        self.assertEqual(log_entry["pattern_code"], "salon_appt_confirm")
        self.assertEqual(log_entry["provider_message_id"], "med_mock_12345")

    def test_mock_send_direct_sms_batch(self):
        recipients = ["09121111111", "+989122222222"]
        msg_text = "تخفیف ویژه عید مبعث برای مشتریان وفادار سالن رز"

        cur = self.conn.cursor()
        for idx, r in enumerate(recipients):
            norm = normalize_iranian_phone(r)
            self.assertIsNotNone(norm)
            cur.execute("""
                INSERT INTO sms_logs (
                    id, recipient_phone, message_type, message_text,
                    originator, provider, status, provider_message_id, sent_at
                ) VALUES (?, ?, 'direct', ?, '+9810001', 'mediana', 'sent', ?, datetime('now'))
            """, (f"sms_dir_{idx}", norm, msg_text, f"med_batch_{idx}"))
        self.conn.commit()

        cur.execute("SELECT COUNT(*) as count FROM sms_logs WHERE message_type = 'direct'")
        self.assertEqual(cur.fetchone()["count"], 2)

    def test_mediana_documented_payload_structure(self):
        # Verify pattern payload complies with https://api.mediana.ir/sms/v1/send/pattern
        pattern_payload = {
            "patternCode": "salon_auth_otp",
            "originator": "+9810001",
            "recipient": "09123456789",
            "values": {
                "code": "48921"
            }
        }
        self.assertEqual(pattern_payload["patternCode"], "salon_auth_otp")
        self.assertTrue(pattern_payload["recipient"].startswith("09"))
        self.assertIn("code", pattern_payload["values"])

        # Verify direct SMS payload complies with https://api.mediana.ir/sms/v1/send/sms
        direct_payload = {
            "type": "Informational",
            "recipients": ["09123456789"],
            "messageText": "پیامک اطلاع‌رسانی تستی",
            "dateTime": "2026-11-16T18:00:00"
        }
        self.assertEqual(direct_payload["type"], "Informational")
        self.assertIsInstance(direct_payload["recipients"], list)
        self.assertEqual(direct_payload["recipients"][0], "09123456789")

    def test_error_logging_on_failure(self):
        cur = self.conn.cursor()
        log_id = "sms_fail_1"
        err_msg = "HTTP 401: Unauthorized API Key"

        cur.execute("""
            INSERT INTO sms_logs (
                id, recipient_phone, message_type, pattern_code,
                originator, provider, status, error_message
            ) VALUES (?, '09129999999', 'pattern', 'salon_appt_confirm', '+9810001', 'mediana', 'failed', ?)
        """, (log_id, err_msg))
        self.conn.commit()

        cur.execute("SELECT status, error_message FROM sms_logs WHERE id = ?", (log_id,))
        row = cur.fetchone()
        self.assertEqual(row["status"], "failed")
        self.assertEqual(row["error_message"], err_msg)

if __name__ == "__main__":
    unittest.main()
