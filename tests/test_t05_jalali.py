import unittest
import sys
import os
from datetime import datetime, date, timedelta

sys.path.insert(0, os.path.dirname(__file__))
from test_t01_t02_baseline import (
    gregorian_to_jalali,
    jalali_to_gregorian,
    to_persian_digits,
    to_ascii_digits
)

# Python implementations of extended T05 Jalali utils for automated testing

def is_jalali_leap_year(jy: int) -> bool:
    # Compare Farvardin 1 of jy and jy+1
    g1 = jalali_to_gregorian(jy, 1, 1)
    g2 = jalali_to_gregorian(jy + 1, 1, 1)
    d1 = date(g1[0], g1[1], g1[2])
    d2 = date(g2[0], g2[1], g2[2])
    return (d2 - d1).days == 366

def get_days_in_jalali_month(jy: int, jm: int) -> int:
    if jm < 1 or jm > 12:
        raise ValueError("Invalid month")
    if jm <= 6:
        return 31
    if jm <= 11:
        return 30
    return 30 if is_jalali_leap_year(jy) else 29

def get_iranian_day_of_week(d: date) -> int:
    # Python weekday(): Monday is 0, Sunday is 6, Saturday is 5
    # Target: Saturday = 0, Sunday = 1, ..., Friday = 6
    return (d.weekday() + 2) % 7

def is_iranian_weekend(d: date) -> bool:
    return get_iranian_day_of_week(d) == 6

def parse_jalali_date(s: str):
    if not s:
        return None
    ascii_str = to_ascii_digits(s.strip()).replace('-', '/')
    parts = ascii_str.split('/')
    if len(parts) != 3:
        return None
    try:
        jy, jm, jd = int(parts[0]), int(parts[1]), int(parts[2])
    except ValueError:
        return None
    if jm < 1 or jm > 12:
        return None
    max_days = get_days_in_jalali_month(jy, jm)
    if jd < 1 or jd > max_days:
        return None
    gy, gm, gd = jalali_to_gregorian(jy, jm, jd)
    return date(gy, gm, gd)

def format_jalali_relative(target: date, base: date) -> str:
    diff = (target - base).days
    if diff == 0:
        return 'امروز'
    if diff == -1:
        return 'دیروز'
    if diff == 1:
        return 'فردا'
    if diff == 2:
        return 'پس‌فردا'
    if diff < 0:
        return f"{to_persian_digits(abs(diff))} روز قبل"
    return f"{to_persian_digits(diff)} روز بعد"

class TestJalaliCalendarExtended(unittest.TestCase):
    def test_jalali_leap_years(self):
        # 1403 is known leap year
        self.assertTrue(is_jalali_leap_year(1403))
        # 1402 is not a leap year
        self.assertFalse(is_jalali_leap_year(1402))
        # 1399 was a leap year
        self.assertTrue(is_jalali_leap_year(1399))

    def test_days_in_jalali_months(self):
        # First 6 months: 31 days
        for m in range(1, 7):
            self.assertEqual(get_days_in_jalali_month(1403, m), 31)
        # Months 7 to 11: 30 days
        for m in range(7, 12):
            self.assertEqual(get_days_in_jalali_month(1403, m), 30)
        # Month 12 (Esfand)
        self.assertEqual(get_days_in_jalali_month(1403, 12), 30) # Leap year 1403
        self.assertEqual(get_days_in_jalali_month(1402, 12), 29) # Normal year 1402

    def test_parse_jalali_date_strings(self):
        # Valid date
        d = parse_jalali_date("1403/01/01")
        self.assertEqual(d, date(2024, 3, 20))

        # Persian digits input
        d_fa = parse_jalali_date("۱۴۰۳/۰۸/۲۵")
        self.assertIsNotNone(d_fa)

        # Invalid month
        self.assertIsNone(parse_jalali_date("1403/13/01"))

        # Invalid day for normal year Esfand (30th day in 1402)
        self.assertIsNone(parse_jalali_date("1402/12/30"))
        # Valid day for leap year Esfand (30th day in 1403)
        self.assertIsNotNone(parse_jalali_date("1403/12/30"))

    def test_iranian_week_schedule(self):
        # 2024-03-23 was Saturday -> Shanbeh (0)
        sat = date(2024, 3, 23)
        self.assertEqual(get_iranian_day_of_week(sat), 0)
        self.assertFalse(is_iranian_weekend(sat))

        # 2024-03-29 was Friday -> Jomeh (6, weekend)
        fri = date(2024, 3, 29)
        self.assertEqual(get_iranian_day_of_week(fri), 6)
        self.assertTrue(is_iranian_weekend(fri))

    def test_relative_date_formatting(self):
        base = date(1403, 8, 20)
        self.assertEqual(format_jalali_relative(base, base), 'امروز')
        self.assertEqual(format_jalali_relative(base + timedelta(days=1), base), 'فردا')
        self.assertEqual(format_jalali_relative(base - timedelta(days=1), base), 'دیروز')
        self.assertEqual(format_jalali_relative(base + timedelta(days=5), base), '۵ روز بعد')
        self.assertEqual(format_jalali_relative(base - timedelta(days=3), base), '۳ روز قبل')

if __name__ == "__main__":
    unittest.main()
