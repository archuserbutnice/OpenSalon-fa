import unittest
import sqlite3
import hashlib
import os
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(__file__))
from db_helper import get_connection, run_migrations
from test_t01_t02_baseline import normalize_iranian_phone

def hash_password(password: str, salt: str) -> str:
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()

class TestAuthSessionsFeature(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        run_migrations(self.conn, migrations_dir="migrations")

    def tearDown(self):
        self.conn.close()

    def test_migration_005_applied(self):
        cur = self.conn.cursor()
        cur.execute("SELECT version FROM schema_migrations WHERE version = '005_auth_sessions'")
        self.assertIsNotNone(cur.fetchone())

        # Check seeded default owner
        cur.execute("SELECT * FROM users WHERE role = 'owner'")
        owner = cur.fetchone()
        self.assertIsNotNone(owner)
        self.assertEqual(owner["phone"], "09120000000")
        self.assertEqual(owner["email"], "admin@opensalon.local")

    def test_password_verification(self):
        cur = self.conn.cursor()
        cur.execute("SELECT password_hash, salt FROM users WHERE id = 'usr_owner_default'")
        row = cur.fetchone()

        # Correct password 'admin123'
        calc_hash = hash_password("admin123", row["salt"])
        self.assertEqual(calc_hash, row["password_hash"])

        # Incorrect password
        bad_hash = hash_password("wrong_pass", row["salt"])
        self.assertNotEqual(bad_hash, row["password_hash"])

    def test_session_lifecycle(self):
        cur = self.conn.cursor()
        token = "tok_test_session_123"
        user_id = "usr_owner_default"
        expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

        # 1. Create Session
        cur.execute("""
            INSERT INTO sessions (token, user_id, role, expires_at)
            VALUES (?, ?, 'owner', ?)
        """, (token, user_id, expires_at))
        self.conn.commit()

        # 2. Validate Session
        cur.execute("""
            SELECT s.token, u.name, u.role, u.phone
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > ?
        """, (token, datetime.now(timezone.utc).isoformat()))
        session = cur.fetchone()
        self.assertIsNotNone(session)
        self.assertEqual(session["role"], "owner")
        self.assertEqual(session["phone"], "09120000000")

        # 3. Revoke Session (Logout)
        cur.execute("DELETE FROM sessions WHERE token = ?", (token,))
        self.conn.commit()

        cur.execute("SELECT * FROM sessions WHERE token = ?", (token,))
        self.assertIsNone(cur.fetchone())

    def test_create_staff_user_with_normalized_phone(self):
        raw_phone = "+98-936-777-8899"
        norm_phone = normalize_iranian_phone(raw_phone)
        self.assertEqual(norm_phone, "09367778899")

        salt = "staff_salt_123"
        pwd_hash = hash_password("staffSecret", salt)

        cur = self.conn.cursor()
        cur.execute("""
            INSERT INTO users (id, phone, name, role, password_hash, salt, is_active)
            VALUES ('usr_staff_1', ?, 'پریسا رضایی', 'staff', ?, ?, 1)
        """, (norm_phone, pwd_hash, salt))
        self.conn.commit()

        cur.execute("SELECT * FROM users WHERE id = 'usr_staff_1'")
        user = cur.fetchone()
        self.assertEqual(user["name"], "پریسا رضایی")
        self.assertEqual(user["role"], "staff")
        self.assertEqual(user["phone"], "09367778899")

    def test_expired_session_rejected(self):
        cur = self.conn.cursor()
        token = "tok_expired_abc"
        user_id = "usr_owner_default"
        # Expired 1 day ago
        past_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()

        cur.execute("""
            INSERT INTO sessions (token, user_id, role, expires_at)
            VALUES (?, ?, 'owner', ?)
        """, (token, user_id, past_date))
        self.conn.commit()

        cur.execute("""
            SELECT * FROM sessions 
            WHERE token = ? AND expires_at > ?
        """, (token, datetime.now(timezone.utc).isoformat()))
        valid_session = cur.fetchone()
        self.assertIsNone(valid_session)

if __name__ == "__main__":
    unittest.main()
