import unittest
import sqlite3
import re
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from db_helper import get_connection, run_migrations

# Python implementations of client/lib utils for test verification

PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

def to_ascii_digits(s: str) -> str:
    if not s:
        return ""
    res = str(s)
    for i in range(10):
        res = res.replace(PERSIAN_DIGITS[i], str(i))
        res = res.replace(ARABIC_DIGITS[i], str(i))
    return res

def to_persian_digits(s) -> str:
    if s is None:
        return ""
    res = str(s)
    for i in range(10):
        res = res.replace(str(i), PERSIAN_DIGITS[i])
    return res

def normalize_iranian_phone(raw: str) -> str:
    if not raw:
        return None
    cleaned = to_ascii_digits(str(raw).strip())
    cleaned = re.sub(r'[^\d+]', '', cleaned)
    if cleaned.startswith('+98'):
        cleaned = '0' + cleaned[3:]
    elif cleaned.startswith('0098'):
        cleaned = '0' + cleaned[4:]
    elif cleaned.startswith('98') and len(cleaned) == 12:
        cleaned = '0' + cleaned[2:]
    elif cleaned.startswith('9') and len(cleaned) == 10:
        cleaned = '0' + cleaned

    if re.match(r'^09\d{9}$', cleaned):
        return cleaned
    return None

def gregorian_to_jalali(gy: int, gm: int, gd: int):
    g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    gy2 = (gy + 1) if (gm > 2) else gy
    days = 355666 + (365 * gy) + ((gy2 + 3) // 4) - ((gy2 + 99) // 100) + ((gy2 + 399) // 400) + gd + g_d_m[gm - 1]
    jy = -1595 + (33 * (days // 12053))
    days %= 12053
    jy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        jy += (days - 1) // 365
        days = (days - 1) % 365
    if days < 186:
        jm = 1 + (days // 31)
        jd = 1 + (days % 31)
    else:
        jm = 7 + ((days - 186) // 30)
        jd = 1 + ((days - 186) % 30)
    return jy, jm, jd

def jalali_to_gregorian(jy: int, jm: int, jd: int):
    jy2 = jy + 1595
    days = -355668 + (365 * jy2) + ((jy2 // 33) * 8) + (((jy2 % 33) + 3) // 4) + jd + (((jm - 1) * 31) if (jm < 7) else (((jm - 7) * 30) + 186))
    gy = 400 * (days // 146097)
    days %= 146097
    if days > 36524:
        days -= 1
        gy += 100 * (days // 36524)
        days %= 36524
        if days >= 365:
            days += 1
    gy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        gy += (days - 1) // 365
        days = (days - 1) % 365
    gd = days + 1
    sal_a = [0, 31, 29 if ((gy % 4 == 0 and gy % 100 != 0) or (gy % 400 == 0)) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    gm = 0
    for i in range(13):
        v = sal_a[i]
        if gd <= v:
            break
        gd -= v
        gm = i + 1
    return gy, gm, gd

def format_currency_toman(amount_toman: int, show_rial: bool = False, persian_digits: bool = True) -> str:
    val = amount_toman * 10 if show_rial else amount_toman
    unit = 'ریال' if show_rial else 'تومان'
    formatted = f"{val:,}".replace(',', '،')
    if persian_digits:
        formatted = to_persian_digits(formatted)
    return f"{formatted} {unit}"

class TestBaseline(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        run_migrations(self.conn, migrations_dir="migrations")

    def tearDown(self):
        self.conn.close()

    def test_migrations_applied(self):
        cur = self.conn.cursor()
        cur.execute("SELECT version FROM schema_migrations ORDER BY version")
        rows = [r["version"] for r in cur.fetchall()]
        self.assertIn("001_initial", rows)
        self.assertIn("002_localization", rows)

    def test_salon_settings_seeded(self):
        cur = self.conn.cursor()
        cur.execute("SELECT key, value FROM salon_settings")
        settings = {r["key"]: r["value"] for r in cur.fetchall()}
        self.assertEqual(settings.get("default_locale"), "fa")
        self.assertEqual(settings.get("calendar_type"), "jalali")
        self.assertEqual(settings.get("currency"), "toman")
        self.assertEqual(settings.get("week_start_day"), "saturday")

    def test_iranian_phone_normalization(self):
        self.assertEqual(normalize_iranian_phone("09123456789"), "09123456789")
        self.assertEqual(normalize_iranian_phone("+989123456789"), "09123456789")
        self.assertEqual(normalize_iranian_phone("00989123456789"), "09123456789")
        self.assertEqual(normalize_iranian_phone("9123456789"), "09123456789")
        self.assertEqual(normalize_iranian_phone("۰۹۱۲۳۴۵۶۷۸۹"), "09123456789")
        self.assertEqual(normalize_iranian_phone("+۹۸ ۹۱۲ ۳۴۵ ۶۷۸۹"), "09123456789")
        self.assertIsNone(normalize_iranian_phone("02188888888")) # landline
        self.assertIsNone(normalize_iranian_phone("12345"))       # too short

    def test_jalali_calendar_conversion(self):
        # 2024-03-20 is 1403/01/01 (Nowruz)
        jy, jm, jd = gregorian_to_jalali(2024, 3, 20)
        self.assertEqual((jy, jm, jd), (1403, 1, 1))

        # Reverse check
        gy, gm, gd = jalali_to_gregorian(1403, 1, 1)
        self.assertEqual((gy, gm, gd), (2024, 3, 20))

    def test_toman_currency_formatting(self):
        res_toman = format_currency_toman(250000, show_rial=False, persian_digits=True)
        self.assertEqual(res_toman, "۲۵۰،۰۰۰ تومان")

        res_rial = format_currency_toman(250000, show_rial=True, persian_digits=True)
        self.assertEqual(res_rial, "۲،۵۰۰،۰۰۰ ریال")

if __name__ == "__main__":
    unittest.main()
