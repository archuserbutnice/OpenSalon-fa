import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from test_t01_t02_baseline import (
    to_persian_digits,
    to_ascii_digits,
    normalize_iranian_phone,
    format_currency_toman,
    gregorian_to_jalali
)

class TestI18nAndLocalization(unittest.TestCase):
    def test_authentic_vazirmatn_fonts_bundled(self):
        font_dir = os.path.join(os.path.dirname(__file__), "..", "public", "fonts", "vazirmatn")
        required_fonts = [
            "Vazirmatn-Regular.woff2",
            "Vazirmatn-Medium.woff2",
            "Vazirmatn-Bold.woff2"
        ]
        for font_name in required_fonts:
            font_path = os.path.join(font_dir, font_name)
            self.assertTrue(os.path.exists(font_path), f"Font file missing: {font_name}")
            size = os.path.getsize(font_path)
            # Real WOFF2 fonts should be genuine binary font files (> 40 KB)
            self.assertGreater(size, 40 * 1024, f"Font file {font_name} is too small ({size} bytes); likely a placeholder")

    def test_persian_digits_conversion(self):
        self.assertEqual(to_persian_digits("0123456789"), "۰۱۲۳۴۵۶۷۸۹")
        self.assertEqual(to_ascii_digits("۰۱۲۳۴۵۶۷۸۹"), "0123456789")
        self.assertEqual(to_persian_digits(1405), "۱۴۰۵")

    def test_currency_toman_and_rial_toggle(self):
        # 185,000 Toman -> ۱۸۵،۰۰۰ تومان
        toman_str = format_currency_toman(185000, show_rial=False, persian_digits=True)
        self.assertEqual(toman_str, "۱۸۵،۰۰۰ تومان")

        # 185,000 Toman -> ۱،۸۵۰،۰۰۰ ریال (x10)
        rial_str = format_currency_toman(185000, show_rial=True, persian_digits=True)
        self.assertEqual(rial_str, "۱،۸۵۰،۰۰۰ ریال")

    def test_iranian_phone_normalization_edge_cases(self):
        self.assertEqual(normalize_iranian_phone("+98 912 345 6789"), "09123456789")
        self.assertEqual(normalize_iranian_phone("00989351112233"), "09351112233")
        self.assertEqual(normalize_iranian_phone("9120001122"), "09120001122")
        self.assertEqual(normalize_iranian_phone("۰۹۳۶۹۹۹۸۸۷۷"), "09369998877")
        self.assertIsNone(normalize_iranian_phone("02188776655")) # Landline
        self.assertIsNone(normalize_iranian_phone("abc0912"))     # Invalid

    def test_jalali_date_with_persian_digits(self):
        jy, jm, jd = gregorian_to_jalali(2026, 11, 16)
        formatted = f"{jy}/{jm:02d}/{jd:02d}"
        persian_formatted = to_persian_digits(formatted)
        self.assertTrue(persian_formatted.startswith("۱۴۰"))

if __name__ == "__main__":
    unittest.main()
