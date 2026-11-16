import { useState, useEffect } from 'preact/hooks';
import { useApp } from '../context';
import { formatCurrency, toPersianDigits } from '../lib/currency';
import { formatJalaliDate } from '../lib/jalali';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category_name?: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  cost_price_toman: number;
  selling_price_toman: number;
  is_low_stock: number;
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

export function InventoryPage() {
  const { t, settings } = useApp();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterLowStock, setFilterLowStock] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedItemForTx, setSelectedItemForTx] = useState<InventoryItem | null>(null);
  const [txQty, setTxQty] = useState<number>(1);
  const [txType, setTxType] = useState<'in' | 'out' | 'usage_appointment'>('in');
  const [txNotes, setTxNotes] = useState<string>('');

  // Sample mock data for preview/client mode
  const initialItems: InventoryItem[] = [
    {
      id: 'item_1',
      name: 'رنگ مو سری طبیعی شماره ۶',
      sku: 'COL-NAT-06',
      category_name: 'رنگ مو و اکسیدان',
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
      unit: 'بسته ۱۰۰تایی',
      quantity: 12,
      min_quantity: 3,
      cost_price_toman: 180000,
      selling_price_toman: 250000,
      is_low_stock: 0
    }
  ];

  useEffect(() => {
    // In browser environment this fetches from /api/inventory/items
    setItems(initialItems);
    setTransactions([
      {
        id: 'tx_1',
        item_name: 'رنگ مو سری طبیعی شماره ۶',
        unit: 'تیوپ',
        transaction_type: 'usage_appointment',
        quantity: 2,
        unit_cost_toman: 95000,
        notes: 'مصرف در نوبت رنگ و هایلایت خانم علوی',
        created_at: new Date().toISOString()
      }
    ]);
    setLoading(false);
  }, []);

  const filteredItems = items.filter(item => {
    if (filterLowStock && item.quantity > item.min_quantity) return false;
    if (searchTerm && !item.name.includes(searchTerm) && !item.sku.includes(searchTerm)) return false;
    return true;
  });

  const lowStockCount = items.filter(i => i.quantity <= i.min_quantity).length;
  const totalValuationToman = items.reduce((sum, i) => sum + (i.quantity * i.cost_price_toman), 0);

  const handleRecordTransaction = (e: any) => {
    e.preventDefault();
    if (!selectedItemForTx) return;

    const qty = Number(txQty);
    const newItems = items.map(item => {
      if (item.id === selectedItemForTx.id) {
        const updatedQty = txType === 'in' ? item.quantity + qty : item.quantity - qty;
        return {
          ...item,
          quantity: updatedQty,
          is_low_stock: updatedQty <= item.min_quantity ? 1 : 0
        };
      }
      return item;
    });

    const newTx: Transaction = {
      id: 'tx_' + Date.now(),
      item_name: selectedItemForTx.name,
      unit: selectedItemForTx.unit,
      transaction_type: txType,
      quantity: qty,
      unit_cost_toman: selectedItemForTx.cost_price_toman,
      notes: txNotes,
      created_at: new Date().toISOString()
    };

    setItems(newItems);
    setTransactions([newTx, ...transactions]);
    setSelectedItemForTx(null);
    setTxNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-500">تنوع اقلام موجودی</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{toPersianDigits(items.length)} قلم کالا</div>
          </div>
          <span className="text-3xl">📦</span>
        </div>

        <div className={`p-5 rounded-xl border shadow-sm flex items-center justify-between ${
          lowStockCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div>
            <div className="text-sm font-medium">هشدار کسری موجودی</div>
            <div className="text-2xl font-bold mt-1">
              {toPersianDigits(lowStockCount)} قلم نیازمند شارژ
            </div>
          </div>
          <span className="text-3xl">⚠️</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-500">ارزش کل موجودی انبار</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">
              {formatCurrency(totalValuationToman, { showRial: settings.displayRial, persianDigits: true })}
            </div>
          </div>
          <span className="text-3xl">💰</span>
        </div>
      </div>

      {/* Action and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="جستجوی نام یا شناسه کالا (SKU)..."
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

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-right">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">کد کالا</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">نام محصول</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">دسته‌بندی</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">موجودی</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">حداقل هشدار</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">قیمت خرید</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">قیمت فروش</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">عملیات</th>
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
                    {item.category_name}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {formatCurrency(item.cost_price_toman, { showRial: settings.displayRial, persianDigits: true })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                    {formatCurrency(item.selling_price_toman, { showRial: settings.displayRial, persianDigits: true })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                    <button
                      onClick={() => setSelectedItemForTx(item)}
                      className="text-pink-600 hover:text-pink-900 text-xs bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded"
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

      {/* Transaction Modal */}
      {selectedItemForTx && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-right">
            <h3 className="text-lg font-bold text-slate-900 mb-2">ثبت ورود یا خروج کالا</h3>
            <p className="text-sm text-slate-600 mb-4 font-medium">{selectedItemForTx.name} (موجودی فعلی: {toPersianDigits(selectedItemForTx.quantity)} {selectedItemForTx.unit})</p>

            <form onSubmit={handleRecordTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">نوع عملیات گردش</label>
                <select
                  value={txType}
                  onChange={(e: any) => setTxType(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                >
                  <option value="in">ورود کالا (خرید / شارژ انبار)</option>
                  <option value="out">خروج کالا (فروش مستقیم)</option>
                  <option value="usage_appointment">مصرف در سالن (نوبت مشتری)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">تعداد / مقدار ({selectedItemForTx.unit})</label>
                <input
                  type="number"
                  min="1"
                  value={txQty}
                  onInput={(e: any) => setTxQty(parseInt(e.target.value, 10))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">توضیحات و مرجع</label>
                <input
                  type="text"
                  placeholder="مثال: فاکتور شماره ۱۲ یا نوبت رنگ مو"
                  value={txNotes}
                  onInput={(e: any) => setTxNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
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

      {/* Recent Transactions Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">آخرین گردش‌های ثبت‌شده در انبار</h3>
        <div className="space-y-3">
          {transactions.map(tx => (
            <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  tx.transaction_type === 'in' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {tx.transaction_type === 'in' ? 'ورود' : tx.transaction_type === 'usage_appointment' ? 'مصرف سالن' : 'خروج'}
                </span>
                <span className="font-semibold text-slate-800">{tx.item_name}</span>
                <span className="text-slate-500 text-xs">({toPersianDigits(tx.quantity)} {tx.unit})</span>
                {tx.notes && <span className="text-slate-400 text-xs border-r pr-2">{tx.notes}</span>}
              </div>
              <div className="text-xs text-slate-500">
                {formatJalaliDate(new Date(tx.created_at))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
