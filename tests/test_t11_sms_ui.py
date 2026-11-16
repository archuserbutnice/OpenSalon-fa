import unittest
import os

class TestSmsUiAndDryRun(unittest.TestCase):
    def setUp(self):
        self.ui_file = os.path.join(os.path.dirname(__file__), "..", "src", "client", "pages", "sms.tsx")
        self.assertTrue(os.path.exists(self.ui_file), "sms.tsx does not exist")
        with open(self.ui_file, "r", encoding="utf-8") as f:
            self.content = f.read()

    def test_dry_run_sandbox_toggle(self):
        # Must have sandbox toggle handler and dry-run banner
        self.assertIn("handleToggleSandbox", self.content)
        self.assertIn("is_sandbox", self.content)
        self.assertIn("DRY-RUN", self.content)

    def test_delivery_logs_elements(self):
        # Must display delivery logs, status filters, and phone search
        self.assertIn("activeTab === 'logs'", self.content)
        self.assertIn("logStatusFilter", self.content)
        self.assertIn("logSearchPhone", self.content)
        self.assertIn("provider_message_id", self.content)
        self.assertIn("segments", self.content)

    def test_queue_monitoring_elements(self):
        # Must display queue monitor and process batch button
        self.assertIn("activeTab === 'queue'", self.content)
        self.assertIn("handleProcessQueue", self.content)
        self.assertIn("/api/sms/queue/process", self.content)
        self.assertIn("queueStats", self.content)

    def test_live_persian_segment_counting(self):
        # Must include live segment counting logic with standard 70/67 limits
        self.assertIn("isPersian", self.content)
        self.assertIn("segmentCount", self.content)
        self.assertIn("remainingChars", self.content)

    def test_persian_formatting(self):
        # Must use Persian digits and Jalali date formatting
        self.assertIn("toPersianDigits", self.content)
        self.assertIn("formatJalaliDate", self.content)

if __name__ == "__main__":
    unittest.main()
