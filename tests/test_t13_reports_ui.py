import unittest
import os

class TestReportsUiAndWidgets(unittest.TestCase):
    def setUp(self):
        self.ui_file = os.path.join(os.path.dirname(__file__), "..", "src", "client", "pages", "reports.tsx")
        self.app_file = os.path.join(os.path.dirname(__file__), "..", "src", "client", "app.tsx")
        self.assertTrue(os.path.exists(self.ui_file), "reports.tsx does not exist")
        self.assertTrue(os.path.exists(self.app_file), "app.tsx does not exist")

        with open(self.ui_file, "r", encoding="utf-8") as f:
            self.content = f.read()
        with open(self.app_file, "r", encoding="utf-8") as f:
            self.app_content = f.read()

    def test_app_mounts_reports_tab(self):
        self.assertIn("ReportsPage", self.app_content)
        self.assertIn("activeTab === 'reports'", self.app_content)

    def test_date_presets_and_filters(self):
        self.assertIn("applyPreset", self.content)
        self.assertIn("'today'", self.content)
        self.assertIn("'week'", self.content)
        self.assertIn("'month'", self.content)
        self.assertIn("'quarter'", self.content)
        self.assertIn("staffFilter", self.content)
        self.assertIn("serviceFilter", self.content)

    def test_kpi_overview_widgets(self):
        self.assertIn("overview.totalRevenueToman", self.content)
        self.assertIn("overview.averageTicketToman", self.content)
        self.assertIn("overview.completionRate", self.content)
        self.assertIn("overview.retentionRate", self.content)

    def test_breakdown_widgets(self):
        self.assertIn("staffRevenue", self.content)
        self.assertIn("serviceRevenue", self.content)
        self.assertIn("busiestHours", self.content)
        self.assertIn("topClients", self.content)

    def test_csv_export_action(self):
        self.assertIn("handleExportCsv", self.content)
        self.assertIn("/api/reports/export-csv", self.content)

    def test_persian_formatting_integration(self):
        self.assertIn("formatCurrency", self.content)
        self.assertIn("toPersianDigits", self.content)

if __name__ == "__main__":
    unittest.main()
