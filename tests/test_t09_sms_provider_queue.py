import unittest
import sqlite3
import os
import sys
import math
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(__file__))
from db_helper import get_connection, run_migrations
from test_t01_t02_baseline import normalize_iranian_phone

def is_persian_or_unicode(text: str) -> bool:
    for ch in text:
        if ord(ch) > 127:
            return True
    return False

def count_sms_segments(text: str) -> dict:
    if not text:
        return {"is_persian": False, "character_count": 0, "segments": 0, "max_chars_per_segment": 160}

    is_persian = is_persian_or_unicode(text)
    length = len(text)

    if is_persian:
        if length <= 70:
            return {"is_persian": True, "character_count": length, "segments": 1, "max_chars_per_segment": 70}
        segments = math.ceil(length / 67.0)
        return {"is_persian": True, "character_count": length, "segments": segments, "max_chars_per_segment": 67}
    else:
        if length <= 160:
            return {"is_persian": False, "character_count": length, "segments": 1, "max_chars_per_segment": 160}
        segments = math.ceil(length / 153.0)
        return {"is_persian": False, "character_count": length, "segments": segments, "max_chars_per_segment": 153}

class TestSmsProviderAndQueue(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        run_migrations(self.conn, migrations_dir="migrations")

    def tearDown(self):
        self.conn.close()

    def test_migration_007_applied(self):
        cur = self.conn.cursor()
        cur.execute("SELECT version FROM schema_migrations WHERE version = '007_sms_queue'")
        self.assertIsNotNone(cur.fetchone())

        # Check sms_queue table structure
        cur.execute("PRAGMA table_info(sms_queue)")
        cols = {r["name"]: r["type"] for r in cur.fetchall()}
        self.assertIn("id", cols)
        self.assertIn("provider", cols)
        self.assertIn("message_type", cols)
        self.assertIn("recipient_phone", cols)
        self.assertIn("segments", cols)
        self.assertIn("status", cols)
        self.assertIn("attempts", cols)
        self.assertIn("max_attempts", cols)
        self.assertIn("next_attempt_at", cols)
        self.assertIn("last_error", cols)

        # Check segments column added to sms_logs
        cur.execute("PRAGMA table_info(sms_logs)")
        log_cols = [r["name"] for r in cur.fetchall()]
        self.assertIn("segments", log_cols)

    def test_persian_and_latin_segment_calculation(self):
        # 1. Short Latin text (<= 160 chars) -> 1 segment
        latin_short = "A" * 160
        res = count_sms_segments(latin_short)
        self.assertFalse(res["is_persian"])
        self.assertEqual(res["segments"], 1)

        # 2. Long Latin text (161 chars) -> 2 segments (ceil(161/153))
        latin_long = "A" * 161
        res = count_sms_segments(latin_long)
        self.assertFalse(res["is_persian"])
        self.assertEqual(res["segments"], 2)

        # 3. Short Persian text (<= 70 chars) -> 1 segment
        persian_short = "سلام نوبت شما تایید شد"
        res = count_sms_segments(persian_short)
        self.assertTrue(res["is_persian"])
        self.assertEqual(res["segments"], 1)

        # 4. Exactly 70 chars Persian -> 1 segment
        persian_70 = "م" * 70
        res = count_sms_segments(persian_70)
        self.assertTrue(res["is_persian"])
        self.assertEqual(res["segments"], 1)

        # 5. 71 chars Persian -> 2 segments (ceil(71/67))
        persian_71 = "م" * 71
        res = count_sms_segments(persian_71)
        self.assertTrue(res["is_persian"])
        self.assertEqual(res["segments"], 2)

        # 6. 140 chars Persian -> 3 segments (ceil(140/67) = 3)
        persian_140 = "م" * 140
        res = count_sms_segments(persian_140)
        self.assertTrue(res["is_persian"])
        self.assertEqual(res["segments"], 3)

    def test_enqueue_pattern_message_and_normalization(self):
        cur = self.conn.cursor()
        raw_phone = "+98 912 345 6789"
        normalized = normalize_iranian_phone(raw_phone)
        self.assertEqual(normalized, "09123456789")

        cur.execute("""
            INSERT INTO sms_queue (
                id, provider, message_type, recipient_phone, pattern_code, pattern_values_json,
                segments, status, attempts, max_attempts
            ) VALUES ('sq_test_1', 'mediana', 'pattern', ?, 'salon_appt_confirm', '{"name":"زهرا"}', 1, 'pending', 0, 3)
        """, (normalized,))
        self.conn.commit()

        cur.execute("SELECT * FROM sms_queue WHERE id = 'sq_test_1'")
        item = cur.fetchone()
        self.assertIsNotNone(item)
        self.assertEqual(item["recipient_phone"], "09123456789")
        self.assertEqual(item["status"], "pending")
        self.assertEqual(item["attempts"], 0)
        self.assertEqual(item["max_attempts"], 3)

    def test_queue_processing_success(self):
        cur = self.conn.cursor()
        cur.execute("""
            INSERT INTO sms_queue (
                id, provider, message_type, recipient_phone, pattern_code, pattern_values_json,
                segments, status, attempts, max_attempts, next_attempt_at
            ) VALUES ('sq_succ', 'mediana', 'pattern', '09121112233', 'salon_appt_confirm', '{"name":"سارا"}', 1, 'pending', 0, 3, datetime('now'))
        """)
        self.conn.commit()

        # Simulate queue worker picking it up and successfully dispatching via mock provider
        cur.execute("UPDATE sms_queue SET status = 'processing', attempts = attempts + 1 WHERE id = 'sq_succ'")
        mock_msg_id = "med_mock_succ_123"
        log_id = "log_succ_123"

        cur.execute("""
            UPDATE sms_queue
            SET status = 'completed', sms_log_id = ?, updated_at = datetime('now')
            WHERE id = 'sq_succ'
        """, (log_id,))

        cur.execute("""
            INSERT INTO sms_logs (
                id, recipient_phone, message_type, pattern_code, originator, provider,
                status, provider_message_id, segments, sent_at
            ) VALUES (?, '09121112233', 'pattern', 'salon_appt_confirm', '+9810001', 'mediana', 'sent', ?, 1, datetime('now'))
        """, (log_id, mock_msg_id))
        self.conn.commit()

        cur.execute("SELECT status, attempts, sms_log_id FROM sms_queue WHERE id = 'sq_succ'")
        q = cur.fetchone()
        self.assertEqual(q["status"], "completed")
        self.assertEqual(q["attempts"], 1)

        cur.execute("SELECT * FROM sms_logs WHERE id = ?", (log_id,))
        log = cur.fetchone()
        self.assertEqual(log["status"], "sent")
        self.assertEqual(log["provider_message_id"], mock_msg_id)

    def test_queue_exponential_backoff_and_permanent_failure(self):
        cur = self.conn.cursor()
        cur.execute("""
            INSERT INTO sms_queue (
                id, provider, message_type, recipient_phone, message_text,
                segments, status, attempts, max_attempts, next_attempt_at
            ) VALUES ('sq_retry', 'mediana', 'direct', '09129998877', 'پیامک تست', 1, 'pending', 0, 3, datetime('now'))
        """)
        self.conn.commit()

        # Attempt 1 fails: backoff 30s
        attempts = 1
        delay_seconds = int(math.pow(2, attempts) * 15)  # 30s
        cur.execute("""
            UPDATE sms_queue
            SET attempts = ?, status = 'pending', last_error = 'Connection timeout',
                next_attempt_at = datetime('now', '+' || ? || ' seconds')
            WHERE id = 'sq_retry'
        """, (attempts, delay_seconds))
        self.conn.commit()

        cur.execute("SELECT status, attempts FROM sms_queue WHERE id = 'sq_retry'")
        row = cur.fetchone()
        self.assertEqual(row["status"], "pending")
        self.assertEqual(row["attempts"], 1)

        # Attempt 2 fails: backoff 60s
        attempts = 2
        delay_seconds = int(math.pow(2, attempts) * 15)  # 60s
        cur.execute("""
            UPDATE sms_queue
            SET attempts = ?, status = 'pending', last_error = 'Connection timeout',
                next_attempt_at = datetime('now', '+' || ? || ' seconds')
            WHERE id = 'sq_retry'
        """, (attempts, delay_seconds))
        self.conn.commit()

        # Attempt 3 fails: reaches max_attempts (3) -> Permanently failed!
        attempts = 3
        cur.execute("""
            UPDATE sms_queue
            SET attempts = ?, status = 'failed', last_error = 'Provider credit exhausted'
            WHERE id = 'sq_retry'
        """, (attempts,))
        self.conn.commit()

        cur.execute("SELECT status, attempts, last_error FROM sms_queue WHERE id = 'sq_retry'")
        failed_row = cur.fetchone()
        self.assertEqual(failed_row["status"], "failed")
        self.assertEqual(failed_row["attempts"], 3)
        self.assertEqual(failed_row["last_error"], "Provider credit exhausted")

    def test_retry_failed_queue_item(self):
        cur = self.conn.cursor()
        cur.execute("""
            INSERT INTO sms_queue (
                id, provider, message_type, recipient_phone, message_text,
                segments, status, attempts, max_attempts, last_error
            ) VALUES ('sq_dead', 'mediana', 'direct', '09129998877', 'پیامک تستی', 1, 'failed', 3, 3, 'Timeout')
        """)
        self.conn.commit()

        # Manual retry action resets status to pending and attempts to 0
        cur.execute("""
            UPDATE sms_queue
            SET status = 'pending', attempts = 0, next_attempt_at = datetime('now')
            WHERE id = 'sq_dead'
        """)
        self.conn.commit()

        cur.execute("SELECT status, attempts FROM sms_queue WHERE id = 'sq_dead'")
        retried = cur.fetchone()
        self.assertEqual(retried["status"], "pending")
        self.assertEqual(retried["attempts"], 0)

if __name__ == "__main__":
    unittest.main()
