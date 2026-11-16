import unittest
import os
import re

class TestInventoryUiAndReorder(unittest.TestCase):
    def setUp(self):
        self.ui_file = os.path.join(os.path.dirname(__file__), "..", "src", "client", "pages", "inventory.tsx")
        self.assertTrue(os.path.exists(self.ui_file), "inventory.tsx does not exist")
        with open(self.ui_file, "r", encoding="utf-8") as f:
            self.content = f.read()

    def test_ui_contains_smart_inventory_subtabs(self):
        # Must contain items, reorder suggestions, consumption, valuation, batches, and transactions sub-tabs
        self.assertIn("activeSubTab === 'items'", self.content)
        self.assertIn("activeSubTab === 'reorder'", self.content)
        self.assertIn("activeSubTab === 'consumption'", self.content)
        self.assertIn("activeSubTab === 'valuation'", self.content)
        self.assertIn("activeSubTab === 'batches'", self.content)
        self.assertIn("activeSubTab === 'transactions'", self.content)

    def test_reorder_suggestions_ui_elements(self):
        # Must display urgency, days to stockout, daily burn rate, suggested quantity, and supplier contact
        self.assertIn("urgencyBadge", self.content)
        self.assertIn("dailyBurnRate", self.content)
        self.assertIn("daysToStockout", self.content)
        self.assertIn("suggestedQuantity", self.content)
        self.assertIn("supplierPhone", self.content)

    def test_service_consumption_ui_elements(self):
        # Must support mapping services to items and deleting mappings
        self.assertIn("showAddConsumptionModal", self.content)
        self.assertIn("handleDeleteConsumption", self.content)
        self.assertIn("/api/inventory/consumption", self.content)

    def test_batches_and_expiry_ui_elements(self):
        # Must support batch tracking and expiry date monitoring
        self.assertIn("showAddBatchModal", self.content)
        self.assertIn("batch_number", self.content)
        self.assertIn("isExpiringSoon", self.content)
        self.assertIn("/api/inventory/batches", self.content)

    def test_persian_localization_and_currency(self):
        # Must use Persian digits and formatCurrency
        self.assertIn("toPersianDigits", self.content)
        self.assertIn("formatCurrency", self.content)
        self.assertIn("formatJalaliDate", self.content)

if __name__ == "__main__":
    unittest.main()
