import { useState, useEffect } from 'preact/hooks';
import { useApp } from '../context';
import { formatCurrency, toPersianDigits } from '../lib/currency';
import { formatJalaliDate, formatJalaliFullText } from '../lib/jalali';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category_id?: string;
  category_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  cost_price_toman: number;
  selling_price_toman: number;
  is_low_stock: number;
  expiry_date?: string;
  batch_number?: string;
}

interface ReorderSuggestion {
  itemId: string;
  itemName: string;
  sku: string;
  unit: string;
  categoryName?: string;
  supplierId?: string;
  supplierName?: string;
  supplierPhone?: string;
  currentQuantity: number;
  minQuantity: number;
  dailyBurnRate: number;
  daysToStockout: number | null;
  targetStock: number;
  suggestedQuantity: number;
  costPriceToman: number;
  estimatedCostToman: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
}

interface ServiceConsumption {
  id: string;
  service_id: string;
  service_name: string;
  item_id: string;
  item_name: string;
  item_sku?: string;
  current_stock?: number;
  item_unit?: string;
  quantity_used: number;
  unit?: string;
}

interface ValuationReport {
  totalItems: number;
  totalQuantity: number;
  totalCostValueToman: number;
  totalRetailValueToman: number;
  potentialProfitToman: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringSoonCount: number;
  categories: Array<{
    categoryId: string;
    categoryName: string;
    itemCount: number;
    totalQuantity: number;
    costValueToman: number;
    retailValueToman: number;
    profitToman: number;
  }>;
}

interface InventoryBatch {
  id: string;
  item_id: string;
  item_name: string;
  batch_number: string;
  expiry_date?: string;
  quantity: number;
  cost_price_toman: number;
  unit?: string;
  created_at: string;
}

interface Transaction {
  id: string;
  item_name: string;
  unit: string;
  transaction_type: 'in' | 'out' | 'adjustment' | 'usage_appointment';
  quantity: number;
  unit_cost_toman: number;
  notes?: string;
  created_at: string;
}

interface ServiceOption {
  id: string;
  name: string;
  price_toman: number;
}

export function InventoryPage() {
  const { t, settings } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'items' | 'reorder' | 'consumption' | 'valuation' | 'batches' | 'transactions'>('items');

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [consumptions, setConsumptions] = useState<ServiceConsumption[]>([]);
  const [valuation, setValuation] = useState<ValuationReport | null>(null);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);

  const [filterLowStock, setFilterLowStock] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [selectedItemForTx, setSelectedItemForTx] = useState<InventoryItem | null>(null);
  const [txQty, setTxQty] = useState<number>(1);
  const [txType, setTxType] = useState<'in' | 'out' | 'usage_appointment'>('in');
  const [txNotes, setTxNotes] = useState<string>('');

  // Consumption Modal
  const [showAddConsumptionModal, setShowAddConsumptionModal] = useState<boolean>(false);
  const [consServiceId, setConsServiceId] = useState<string>('');
  const [consItemId, setConsItemId] = useState<string>('');
  const [consQty, setConsQty] = useState<number>(1);
  const [consUnit, setConsUnit] = useState<string>('');

  // Batch Modal
  const [showAddBatchModal, setShowAddBatchModal] = useState<boolean>(false);
  const [batchItemId, setBatchItemId] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [batchExpiry, setBatchExpiry] = useState<string>('');
  const [batchQty, setBatchQty] = useState<number>(10);

  // Load data from API with fallbacks
  const loadAllData = async () => {
    setLoading(true);
    try {
      // Fetch items
      const resItems = await fetch('/api/inventory/items').then(r => r.json()).catch(() => null);
      if (resItems && resItems.success) {
        setItems(resItems.data);
      } else {
        // Fallback default sample data
        setItems([
          {
            id: 'item_1',
            name: 'رنگ مو سری طبیعی شماره ۶',
            sku: 'COL-NAT-06',
            category_name: 'رنگ مو و اکسیدان',
            supplier_name: 'پخش آرایشی البرز',
            supplier_phone: '09121112233',
            unit: 'تیوپ',
            quantity: 3,
            min_quantity: 5,
            cost_price_toman: 95000,
            selling_price_toman: 160000,
            is_low_stock: 1
          },
          {
            id: 'item_2',
            name: 'اکسیدان ۹ درصد ۴ لیتری',
            sku: 'OXI-09-4L',
            category_name: 'رنگ مو و اکسیدان',
            supplier_name: 'پخش آرایشی البرز',
            supplier_phone: '09121112233',
            unit: 'گالن',
            quantity: 8,
            min_quantity: 2,
            cost_price_toman: 280000,
            selling_price_toman: 420000,
            is_low_stock: 0
          },
          {
            id: 'item_3',
            name: 'ماسک مو تثبیت‌کننده کراتین ۵۰۰ میل',
            sku: 'KER-MSK-500',
            category_name: 'کراتین و مراقبت مو',
            supplier_name: 'پخش آرایشی البرز',
            supplier_phone: '09121112233',
            unit: 'قوطی',
            quantity: 1,
            min_quantity: 4,
            cost_price_toman: 350000,
            selling_price_toman: 590000,
            is_low_stock: 1
          },
          {
            id: 'item_4',
            name: 'حوله یکبار مصرف ۸۰ گرمی',
            sku: 'CON-TWL-80',
            category_name: 'لوازم مصرفی',
            supplier_name: 'تولیدی پاک سبلان',
            supplier_phone: '09124445566',
            unit: 'بسته ۱۰۰تایی',
            quantity: 12,
            min_quantity: 3,
            cost_price_toman: 180000,
            selling_price_toman: 250000,
            is_low_stock: 0
          }
        ]);
      }

      // Fetch Reorder Suggestions
      const resReorder = await fetch('/api/inventory/reorder-suggestions').then(r => r.json()).catch(() => null);
      if (resReorder && resReorder.success) {
        setReorderSuggestions(resReorder.data);
      } else {
        setReorderSuggestions([
          {
            itemId: 'item_1',
            itemName: 'رنگ مو سری طبیعی شماره ۶',
            sku: 'COL-NAT-06',
            unit: 'تیوپ',
            categoryName: 'رنگ مو و اکسیدان',
            supplierName: 'پخش آرایشی البرز',
            supplierPhone: '09121112233',
            currentQuantity: 3,
            minQuantity: 5,
            dailyBurnRate: 0.8,
            daysToStockout: 3,
            targetStock: 10,
            suggestedQuantity: 7,
            costPriceToman: 95000,
            estimatedCostToman: 665000,
            urgency: 'high',
            reason: 'اتمام موجودی در کمتر از ۳ روز'
          },
          {
            itemId: 'item_3',
            itemName: 'ماسک مو تثبیت‌کننده کراتین ۵۰۰ میل',
            sku: 'KER-MSK-500',
            unit: 'قوطی',
            categoryName: 'کراتین و مراقبت مو',
            supplierName: 'پخش آرایشی البرز',
            supplierPhone: '09121112233',
            currentQuantity: 1,
            minQuantity: 4,
            dailyBurnRate: 0.3,
            daysToStockout: 3,
            targetStock: 8,
            suggestedQuantity: 7,
            costPriceToman: 350000,
            estimatedCostToman: 2450000,
            urgency: 'high',
            reason: 'موجودی کمتر از نقطه سفارش (حداقل موجودی)'
          }
        ]);
      }

      // Fetch Consumptions
      const resCons = await fetch('/api/inventory/consumption').then(r => r.json()).catch(() => null);
      if (resCons && resCons.success) {
        setConsumptions(resCons.data);
      } else {
        setConsumptions([
          {
            id: 'sc_1',
            service_id: 'srv_1',
            service_name: 'رنگ و لایت تخصصی',
            item_id: 'item_1',
            item_name: 'رنگ مو سری طبیعی شماره ۶',
            quantity_used: 1,
            unit: 'تیوپ'
          },
          {
            id: 'sc_2',
            service_id: 'srv_1',
            service_name: 'رنگ و لایت تخصصی',
            item_id: 'item_2',
            item_name: 'اکسیدان ۹ درصد ۴ لیتری',
            quantity_used: 0.25,
            unit: 'گالن'
          }
        ]);
      }

      // Fetch Valuation
      const resVal = await fetch('/api/inventory/valuation').then(r => r.json()).catch(() => null);
      if (resVal && resVal.success) {
        setValuation(resVal.data);
      } else {
        setValuation({
          totalItems: 4,
          totalQuantity: 24,
          totalCostValueToman: 5045000,
          totalRetailValueToman: 7710000,
          potentialProfitToman: 2665000,
          lowStockCount: 2,
          outOfStockCount: 0,
          expiringSoonCount: 0,
          categories: [
            {
              categoryId: 'cat_care',
              categoryName: 'کراتین و مراقبت مو',
              itemCount: 1,
              totalQuantity: 1,
              costValueToman: 350000,
              retailValueToman: 590000,
              profitToman: 240000
            },
            {
              categoryId: 'cat_hair_color',
              categoryName: 'رنگ مو و اکسیدان',
              itemCount: 2,
              totalQuantity: 11,
              costValueToman: 2525000,
              retailValueToman: 3840000,
              profitToman: 1315000
            },
            {
              categoryId: 'cat_consumables',
              categoryName: 'لوازم مصرفی',
              itemCount: 1,
              totalQuantity: 12,
              costValueToman: 2160000,
              retailValueToman: 3000000,
              profitToman: 840000
            }
          ]
        });
      }

      // Fetch Batches
      const resBatches = await fetch('/api/inventory/batches').then(r => r.json()).catch(() => null);
      if (resBatches && resBatches.success) {
        setBatches(resBatches.data);
      } else {
        setBatches([
          {
            id: 'b_1',
            item_id: 'item_1',
            item_name: 'رنگ مو سری طبیعی شماره ۶',
            batch_number: 'BATCH-2026-03',
            expiry_date: '2026-12-30',
            quantity: 3,
            cost_price_toman: 95000,
            unit: 'تیوپ',
            created_at: new Date().toISOString()
          }
        ]);
      }

      // Fetch Transactions
      const resTx = await fetch('/api/inventory/transactions?limit=20').then(r => r.json()).catch(() => null);
      if (resTx && resTx.success) {
        setTransactions(resTx.data);
      } else {
        setTransactions([
          {
            id: 'tx_1',
            item_name: 'رنگ مو سری طبیعی شماره ۶',
            unit: 'تیوپ',
            transaction_type: 'usage_appointment',
            quantity: 2,
            unit_cost_toman: 95000,
            notes: 'مصرف خودکار در نوبت رنگ مو خانم علوی',
            created_at: new Date().toISOString()
          }
        ]);
      }

      // Fetch Services for mapping
      const resServices = await fetch('/api/services').then(r => r.json()).catch(() => null);
      if (resServices && resServices.success) {
        setServices(resServices.data);
      } else {
        setServices([
          { id: 'srv_1', name: 'رنگ و لایت تخصصی', price_toman: 1500000 },
          { id: 'srv_2', name: 'کراتینه و پروتئین تراپی', price_toman: 2500000 },
          { id: 'srv_3', name: 'کوپ ژورنالی', price_toman: 400000 }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const filteredItems = items.filter(item => {
    if (filterLowStock && item.quantity > item.min_quantity) return false;
    if (searchTerm && !item.name.includes(searchTerm) && !item.sku.includes(searchTerm)) return false;
    return true;
  });

  const lowStockCount = items.filter(i => i.quantity <= i.min_quantity).length;
  const criticalReorderCount = reorderSuggestions.filter(r => r.urgency === 'critical' || r.urgency === 'high').length;
  const totalValuationToman = valuation ? valuation.totalCostValueToman : items.reduce((sum, i) => sum + (i.quantity * i.cost_price_toman), 0);

  // Handle Record Transaction
  const handleRecordTransaction = async (e: any) => {
    e.preventDefault();
    if (!selectedItemForTx) return;

    const payload = {
      itemId: selectedItemForTx.id,
      transactionType: txType,
      quantity: Number(txQty),
      unitCostToman: selectedItemForTx.cost_price_toman,
      notes: txNotes
    };

    try {
      const res = await fetch('/api/inventory/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json()).catch(() => null);

      if (res && res.success) {
        await loadAllData();
      } else {
        // Fallback optimistic update
        const qty = Number(txQty);
        setItems(items.map(item => {
          if (item.id === selectedItemForTx.id) {
            const updatedQty = txType === 'in' ? item.quantity + qty : item.quantity - qty;
            return { ...item, quantity: updatedQty, is_low_stock: updatedQty <= item.min_quantity ? 1 : 0 };
          }
          return item;
        }));
        setTransactions([
          {
            id: 'tx_' + Date.now(),
            item_name: selectedItemForTx.name,
            unit: selectedItemForTx.unit,
            transaction_type: txType,
            quantity: qty,
            unit_cost_toman: selectedItemForTx.cost_price_toman,
            notes: txNotes,
            created_at: new Date().toISOString()
          },
          ...transactions
        ]);
      }
    } finally {
      setSelectedItemForTx(null);
      setTxNotes('');
    }
  };

  // Handle Add Service Consumption
  const handleAddConsumption = async (e: any) => {
    e.preventDefault();
    if (!consServiceId || !consItemId) return;

    const payload = {
      service_id: consServiceId,
      item_id: consItemId,
      quantity_used: Number(consQty),
      unit: consUnit
    };

    try {
      const res = await fetch('/api/inventory/consumption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json()).catch(() => null);

      if (res && res.success) {
        await loadAllData();
      } else {
        const srv = services.find(s => s.id === consServiceId);
        const itm = items.find(i => i.id === consItemId);
        setConsumptions([
          ...consumptions,
          {
            id: 'sc_' + Date.now(),
            service_id: consServiceId,
            service_name: srv ? srv.name : consServiceId,
            item_id: consItemId,
            item_name: itm ? itm.name : consItemId,
            quantity_used: Number(consQty),
            unit: consUnit || (itm ? itm.unit : 'عدد')
          }
        ]);
      }
    } finally {
      setShowAddConsumptionModal(false);
      setConsServiceId('');
      setConsItemId('');
      setConsQty(1);
      setConsUnit('');
    }
  };

  // Handle Delete Service Consumption
  const handleDeleteConsumption = async (id: string) => {
    if (!confirm('آیا از حذف این فرمول مصرف مطمئن هستید؟')) return;
    try {
      await fetch(`/api/inventory/consumption/${id}`, { method: 'DELETE' }).catch(() => null);
      setConsumptions(consumptions.filter(c => c.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Add Batch
  const handleAddBatch = async (e: any) => {
    e.preventDefault();
    if (!batchItemId || !batchNumber) return;

    const itm = items.find(i => i.id === batchItemId);
    const payload = {
      item_id: batchItemId,
      batch_number: batchNumber,
      expiry_date: batchExpiry || undefined,
      quantity: Number(batchQty),
      cost_price_toman: itm ? itm.cost_price_toman : 0
    };

    try {
      const res = await fetch('/api/inventory/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json()).catch(() => null);

      if (res && res.success) {
        await loadAllData();
      } else {
        setBatches([
          {
            id: 'b_' + Date.now(),
            item_id: batchItemId,
            item_name: itm ? itm.name : batchItemId,
            batch_number: batchNumber,
            expiry_date: batchExpiry,
            quantity: Number(batchQty),
            cost_price_toman: itm ? itm.cost_price_toman : 0,
            unit: itm ? itm.unit : 'عدد',
            created_at: new Date().toISOString()
          },
          ...batches
        ]);
      }
    } finally {
      setShowAddBatchModal(false);
      setBatchItemId('');
      setBatchNumber('');
      setBatchExpiry('');
      setBatchQty(10);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Items count */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">تنوع اقلام انبار</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">
              {toPersianDigits(items.length)} <span className="text-sm font-normal text-slate-500">قلم کالا</span>
            </div>
          </div>
          <span className="text-3xl p-2.5 bg-blue-50 text-blue-600 rounded-xl">📦</span>
        </div>

        {/* Card 2: Low stock warning */}
        <div className={`p-5 rounded-xl border shadow-sm flex items-center justify-between cursor-pointer transition ${
          lowStockCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-white border-slate-200 text-slate-800'
        }`} onClick={() => { setActiveSubTab('reorder'); }}>
          <div>
            <div className="text-xs font-semibold">هشدار نقطه سفارش</div>
            <div className="text-2xl font-bold mt-1">
              {toPersianDigits(lowStockCount)} <span className="text-sm font-normal">قلم کسری</span>
            </div>
          </div>
          <span className="text-3xl p-2.5 bg-amber-100 text-amber-600 rounded-xl">⚠️</span>
        </div>

        {/* Card 3: Reorder Suggestions */}
        <div className={`p-5 rounded-xl border shadow-sm flex items-center justify-between cursor-pointer transition ${
          criticalReorderCount > 0 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-white border-slate-200 text-slate-800'
        }`} onClick={() => setActiveSubTab('reorder')}>
          <div>
            <div className="text-xs font-semibold">پیشنهاد سفارش فوری</div>
            <div className="text-2xl font-bold mt-1">
              {toPersianDigits(criticalReorderCount)} <span className="text-sm font-normal">قلم بحرانی</span>
            </div>
          </div>
          <span className="text-3xl p-2.5 bg-red-100 text-red-600 rounded-xl">🚨</span>
        </div>

        {/* Card 4: Inventory Valuation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer"
             onClick={() => setActiveSubTab('valuation')}>
          <div>
            <div className="text-xs font-semibold text-slate-500">ارزش سرمایه در گردش انبار</div>
            <div className="text-xl font-bold text-slate-800 mt-1">
              {formatCurrency(totalValuationToman, { showRial: settings.displayRial, persianDigits: true })}
            </div>
          </div>
          <span className="text-3xl p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">💰</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 space-x-reverse overflow-x-auto pb-1 text-sm font-medium">
          <button
            onClick={() => setActiveSubTab('items')}
            className={`px-4 py-2.5 rounded-t-lg transition whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'items'
                ? 'border-b-2 border-pink-600 text-pink-600 font-bold bg-pink-50/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📦</span> فهرست اقلام انبار
          </button>

          <button
            onClick={() => setActiveSubTab('reorder')}
            className={`px-4 py-2.5 rounded-t-lg transition whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'reorder'
                ? 'border-b-2 border-pink-600 text-pink-600 font-bold bg-pink-50/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🔔</span> پیشنهادات سفارش هوشمند
            {reorderSuggestions.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-mono">
                {toPersianDigits(reorderSuggestions.length)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('consumption')}
            className={`px-4 py-2.5 rounded-t-lg transition whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'consumption'
                ? 'border-b-2 border-pink-600 text-pink-600 font-bold bg-pink-50/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🧪</span> فرمول مصرف خدمات (کسر خودکار)
          </button>

          <button
            onClick={() => setActiveSubTab('valuation')}
            className={`px-4 py-2.5 rounded-t-lg transition whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'valuation'
                ? 'border-b-2 border-pink-600 text-pink-600 font-bold bg-pink-50/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📊</span> گزارش ارزش‌گذاری و سود
          </button>

          <button
            onClick={() => setActiveSubTab('batches')}
            className={`px-4 py-2.5 rounded-t-lg transition whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'batches'
                ? 'border-b-2 border-pink-600 text-pink-600 font-bold bg-pink-50/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🏷️</span> سری ساخت و تاریخ انقضا
          </button>

          <button
            onClick={() => setActiveSubTab('transactions')}
            className={`px-4 py-2.5 rounded-t-lg transition whitespace-nowrap flex items-center gap-2 ${
              activeSubTab === 'transactions'
                ? 'border-b-2 border-pink-600 text-pink-600 font-bold bg-pink-50/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📋</span> دفتر گردش تراکنش‌ها
          </button>
        </nav>
      </div>

      {/* --- TAB 1: ITEMS CATALOG --- */}
      {activeSubTab === 'items' && (
        <div className="space-y-4">
          {/* Search & Actions Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="جستجوی نام، بارکد یا شناسه کالا (SKU)..."
                value={searchTerm}
                onInput={(e: any) => setSearchTerm(e.target.value)}
                className="w-full md:w-80 px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <button
                onClick={() => setFilterLowStock(!filterLowStock)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition ${
                  filterLowStock
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                }`}
              >
                {filterLowStock ? 'نمایش همه اقلام' : 'فقط اقلام دارای کسری ⚠️'}
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-right">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">کد کالا</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">نام کالا</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">دسته‌بندی</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">موجودی فعلی</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">حداقل هشدار</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">قیمت خرید</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">قیمت فروش</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-600">
                        {item.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {item.category_name || 'عمومی'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.quantity <= item.min_quantity
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {toPersianDigits(item.quantity)} {item.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {toPersianDigits(item.min_quantity)} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono">
                        {formatCurrency(item.cost_price_toman, { showRial: settings.displayRial, persianDigits: true })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium font-mono">
                        {formatCurrency(item.selling_price_toman, { showRial: settings.displayRial, persianDigits: true })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedItemForTx(item);
                            setTxType('in');
                            setTxQty(1);
                          }}
                          className="text-pink-600 hover:text-pink-900 text-xs bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded-lg border border-pink-200"
                        >
                          ثبت گردش ⇄
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: SMART REORDER SUGGESTIONS --- */}
      {activeSubTab === 'reorder' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <div className="font-bold">موتور پیشنهاد هوشمند سفارش بر اساس نرخ مصرف ۳۰ روز گذشته</div>
              <div className="text-xs text-amber-700 mt-1">
                سیستم با محاسبه میانگین مصرف روزانه در خدمات و فروش، تاریخ تخمینی اتمام موجودی را محاسبه کرده و بر اساس زمان تامین و نقطه سفارش، میزان خرید ایده‌آل را پیشنهاد می‌دهد.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reorderSuggestions.map(sug => {
              const urgencyClasses = {
                critical: 'border-red-400 bg-red-50/40 text-red-900',
                high: 'border-orange-400 bg-orange-50/40 text-orange-900',
                medium: 'border-amber-400 bg-amber-50/40 text-amber-900',
                low: 'border-blue-300 bg-blue-50/30 text-blue-900'
              }[sug.urgency] || 'border-slate-300 bg-white text-slate-800';

              const urgencyBadge = {
                critical: 'بحرانی - اتمام موجودی',
                high: 'فوری - زیر ۳ روز تا اتمام',
                medium: 'هشدار نقطه سفارش',
                low: 'بررسی پیشگیرانه'
              }[sug.urgency];

              return (
                <div key={sug.itemId} className={`rounded-xl border p-5 shadow-sm space-y-3 ${urgencyClasses}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white border shadow-xs">
                        {urgencyBadge}
                      </span>
                      <h4 className="font-bold text-base mt-2 text-slate-900">{sug.itemName}</h4>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">کد: {sug.sku}</div>
                    </div>
                    <span className="text-2xl">📦</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white/80 p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-500">موجودی فعلی:</span>{' '}
                      <span className="font-bold">{toPersianDigits(sug.currentQuantity)} {sug.unit}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">حداقل مجاز:</span>{' '}
                      <span className="font-bold">{toPersianDigits(sug.minQuantity)} {sug.unit}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">میانگین مصرف روزانه:</span>{' '}
                      <span className="font-bold font-mono">{toPersianDigits(sug.dailyBurnRate)} {sug.unit}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">روزهای باقیمانده:</span>{' '}
                      <span className="font-bold text-red-600">
                        {sug.daysToStockout !== null ? `${toPersianDigits(sug.daysToStockout)} روز` : 'نامشخص'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">میزان سفارش پیشنهادی:</span>
                      <span className="text-sm font-bold text-pink-600">
                        {toPersianDigits(sug.suggestedQuantity)} {sug.unit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>تخمین هزینه سفارش:</span>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(sug.estimatedCostToman, { showRial: settings.displayRial, persianDigits: true })}
                      </span>
                    </div>
                  </div>

                  {sug.supplierName && (
                    <div className="text-xs flex items-center justify-between pt-1">
                      <span className="text-slate-600">تامین‌کننده: <b>{sug.supplierName}</b></span>
                      {sug.supplierPhone && (
                        <a
                          href={`tel:${sug.supplierPhone}`}
                          className="text-pink-600 hover:text-pink-800 font-mono bg-white px-2 py-1 rounded border border-pink-200"
                        >
                          📞 {toPersianDigits(sug.supplierPhone)}
                        </a>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const itm = items.find(i => i.id === sug.itemId);
                      if (itm) {
                        setSelectedItemForTx(itm);
                        setTxType('in');
                        setTxQty(sug.suggestedQuantity);
                        setTxNotes(`شارژ بر اساس پیشنهاد هوشمند سفارش (${sug.reason})`);
                      }
                    }}
                    className="w-full mt-2 py-2 text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-lg shadow-sm transition"
                  >
                    ثبت فاکتور ورود کالا
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB 3: SERVICE CONSUMPTION MAPPINGS --- */}
      {activeSubTab === 'consumption' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-900">فرمول مصرف مواد در خدمات (کسر هوشمند خودکار)</h3>
              <p className="text-xs text-slate-500 mt-1">
                با تعیین اقلام مصرفی برای هر خدمت، به محض ثبت نوبت در وضعیت «انجام شده»، سیستم موجودی انبار را به صورت خودکار کسر می‌کند.
              </p>
            </div>
            <button
              onClick={() => setShowAddConsumptionModal(true)}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
            >
              + تعریف مصرف جدید برای خدمت
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-right">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">عنوان خدمت سالن</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">کالای مصرفی</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">میزان مصرف در هر نوبت</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {consumptions.map(cons => (
                  <tr key={cons.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                      {cons.service_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {cons.item_name}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-pink-600 font-bold">
                      {toPersianDigits(cons.quantity_used)} {cons.unit || cons.item_unit || 'واحد'}
                    </td>
                    <td className="px-6 py-4 text-left">
                      <button
                        onClick={() => handleDeleteConsumption(cons.id)}
                        className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100"
                      >
                        حذف ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 4: VALUATION REPORT --- */}
      {activeSubTab === 'valuation' && valuation && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold text-slate-500">ارزش کل موجودی بر مبنای قیمت خرید</div>
              <div className="text-2xl font-bold text-slate-800 mt-2">
                {formatCurrency(valuation.totalCostValueToman, { showRial: settings.displayRial, persianDigits: true })}
              </div>
              <div className="text-xs text-slate-400 mt-1">سرمایه راکد فعلی در قفسه‌ها</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold text-slate-500">ارزش کل ناخالص بر مبنای قیمت فروش</div>
              <div className="text-2xl font-bold text-emerald-600 mt-2">
                {formatCurrency(valuation.totalRetailValueToman, { showRial: settings.displayRial, persianDigits: true })}
              </div>
              <div className="text-xs text-slate-400 mt-1">در صورت فروش یا مصرف تمام اقلام</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold text-slate-500">سود ناخالص بالقوه انبار</div>
              <div className="text-2xl font-bold text-pink-600 mt-2">
                {formatCurrency(valuation.potentialProfitToman, { showRial: settings.displayRial, persianDigits: true })}
              </div>
              <div className="text-xs text-slate-400 mt-1">حاشیه سود تخمینی فروش کالاها</div>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-bold text-slate-800">
              تفکیک ارزش و حجم سرمایه به تفکیک دسته‌بندی
            </div>
            <table className="min-w-full divide-y divide-slate-200 text-right">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">دسته‌بندی</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">تنوع اقلام</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">مجموع موجودی</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">ارزش به قیمت خرید</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">ارزش به قیمت فروش</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">حاشیه سود</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {valuation.categories.map(cat => (
                  <tr key={cat.categoryId} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                      {cat.categoryName}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {toPersianDigits(cat.itemCount)} قلم
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">
                      {toPersianDigits(cat.totalQuantity)}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-800">
                      {formatCurrency(cat.costValueToman, { showRial: settings.displayRial, persianDigits: true })}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-emerald-700 font-bold">
                      {formatCurrency(cat.retailValueToman, { showRial: settings.displayRial, persianDigits: true })}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-pink-600 font-bold">
                      {formatCurrency(cat.profitToman, { showRial: settings.displayRial, persianDigits: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 5: BATCHES & EXPIRY --- */}
      {activeSubTab === 'batches' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-900">سری ساخت (بچ) و رهگیری تاریخ انقضای مواد</h3>
              <p className="text-xs text-slate-500 mt-1">
                مدیریت سری ساخت رنگ‌ها، مواد دکلره و کراتین جهت جلوگیری از فساد یا گذشتن تاریخ مصرف محصولات تخصصی سالن.
              </p>
            </div>
            <button
              onClick={() => setShowAddBatchModal(true)}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
            >
              + ثبت سری ساخت جدید
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-right">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">شماره بچ / ساخت</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">نام کالا</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">تعداد</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">تاریخ انقضا</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {batches.map(b => {
                  const isExpiringSoon = b.expiry_date && (new Date(b.expiry_date).getTime() - Date.now() < 30 * 86400 * 1000);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono font-bold text-xs text-slate-800">
                        {b.batch_number}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {b.item_name}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">
                        {toPersianDigits(b.quantity)} {b.unit || 'عدد'}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-600">
                        {b.expiry_date ? formatJalaliDate(new Date(b.expiry_date)) : 'ثبت نشده'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isExpiringSoon ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {isExpiringSoon ? 'نزدیک به انقضا ⚠️' : 'معتبر'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 6: TRANSACTIONS LEDGER --- */}
      {activeSubTab === 'transactions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900">دفتر گردش و سوابق ورود و خروج انبار</h3>
            <span className="text-xs text-slate-500">نمایش ۲۰ گردش اخیر</span>
          </div>

          <div className="space-y-3">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                    tx.transaction_type === 'in'
                      ? 'bg-green-100 text-green-700'
                      : tx.transaction_type === 'usage_appointment'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {tx.transaction_type === 'in' ? 'ورود به انبار' : tx.transaction_type === 'usage_appointment' ? 'مصرف در خدمت' : 'خروج کالا'}
                  </span>
                  <span className="font-semibold text-slate-800">{tx.item_name}</span>
                  <span className="text-slate-500 text-xs">({toPersianDigits(tx.quantity)} {tx.unit})</span>
                  {tx.notes && <span className="text-slate-400 text-xs border-r pr-2">{tx.notes}</span>}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {formatJalaliDate(new Date(tx.created_at))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- MODAL: RECORD TRANSACTION --- */}
      {selectedItemForTx && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-right">
            <h3 className="text-lg font-bold text-slate-900 mb-2">ثبت ورود یا خروج کالا</h3>
            <p className="text-sm text-slate-600 mb-4 font-medium">
              {selectedItemForTx.name} (موجودی فعلی: {toPersianDigits(selectedItemForTx.quantity)} {selectedItemForTx.unit})
            </p>

            <form onSubmit={handleRecordTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">نوع عملیات گردش</label>
                <select
                  value={txType}
                  onChange={(e: any) => setTxType(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                >
                  <option value="in">ورود کالا (خرید / شارژ انبار)</option>
                  <option value="out">خروج کالا (فروش مستقیم یا ضایعات)</option>
                  <option value="usage_appointment">مصرف در سالن (نوبت مشتری)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  تعداد / مقدار ({selectedItemForTx.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  value={txQty}
                  onInput={(e: any) => setTxQty(parseInt(e.target.value, 10))}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">توضیحات و شماره مرجع</label>
                <input
                  type="text"
                  placeholder="مثال: فاکتور شماره ۱۲ یا شارژ از انبار مرکزی"
                  value={txNotes}
                  onInput={(e: any) => setTxNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedItemForTx(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-pink-600 hover:bg-pink-700 text-white rounded-lg"
                >
                  ثبت تراکنش
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ADD SERVICE CONSUMPTION --- */}
      {showAddConsumptionModal && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-right">
            <h3 className="text-lg font-bold text-slate-900 mb-2">تعریف مصرف کالا برای خدمت</h3>
            <p className="text-xs text-slate-500 mb-4">
              با انتخاب خدمت و کالای مصرفی، در زمان اتمام نوبت، کالا کسر خواهد شد.
            </p>

            <form onSubmit={handleAddConsumption} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">انتخاب خدمت سالن</label>
                <select
                  value={consServiceId}
                  onChange={(e: any) => setConsServiceId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  required
                >
                  <option value="">-- لطفاً خدمت را انتخاب کنید --</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">انتخاب کالای انبار</label>
                <select
                  value={consItemId}
                  onChange={(e: any) => {
                    setConsItemId(e.target.value);
                    const itm = items.find(i => i.id === e.target.value);
                    if (itm) setConsUnit(itm.unit);
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  required
                >
                  <option value="">-- لطفاً کالا را انتخاب کنید --</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">میزان مصرف</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={consQty}
                    onInput={(e: any) => setConsQty(parseFloat(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">واحد اندازه‌گیری</label>
                  <input
                    type="text"
                    value={consUnit}
                    onInput={(e: any) => setConsUnit(e.target.value)}
                    placeholder="مثال: تیوپ، گرم"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddConsumptionModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-pink-600 hover:bg-pink-700 text-white rounded-lg"
                >
                  ثبت فرمول مصرف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ADD BATCH --- */}
      {showAddBatchModal && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-right">
            <h3 className="text-lg font-bold text-slate-900 mb-2">ثبت سری ساخت (بچ) کالا</h3>
            <p className="text-xs text-slate-500 mb-4">
              ثبت شماره بچ تولیدی و تاریخ انقضا برای پیگیری انبارداری تخصصی.
            </p>

            <form onSubmit={handleAddBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">انتخاب کالا</label>
                <select
                  value={batchItemId}
                  onChange={(e: any) => setBatchItemId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  required
                >
                  <option value="">-- لطفاً کالا را انتخاب کنید --</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">شماره سری ساخت (Batch No)</label>
                <input
                  type="text"
                  placeholder="مثال: BATCH-2026-04"
                  value={batchNumber}
                  onInput={(e: any) => setBatchNumber(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">تعداد موجود در این سری</label>
                  <input
                    type="number"
                    min="1"
                    value={batchQty}
                    onInput={(e: any) => setBatchQty(parseInt(e.target.value, 10))}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">تاریخ انقضا (میلادی ISO)</label>
                  <input
                    type="date"
                    value={batchExpiry}
                    onInput={(e: any) => setBatchExpiry(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-pink-600 hover:bg-pink-700 text-white rounded-lg"
                >
                  ثبت سری ساخت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
