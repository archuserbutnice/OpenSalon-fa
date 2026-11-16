import { render } from 'preact';
import { useState } from 'preact/hooks';
import './index.css';
import { AppProvider, useApp } from './context';
import { formatJalaliFullText } from './lib/jalali';
import { JalaliDatePicker } from './components/JalaliDatePicker';
import { InventoryPage } from './pages/inventory';
import { SmsPage } from './pages/sms';

export function Navigation({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  const { t, settings, updateSettings, activeDate, setActiveDate } = useApp();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-pink-600">✂️ {settings.salonName}</span>
            </div>
            <nav className="flex space-x-2 space-x-reverse">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  activeTab === 'calendar' ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('nav.calendar')}
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  activeTab === 'inventory' ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('nav.inventory')}
              </button>
              <button
                onClick={() => setActiveTab('sms')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  activeTab === 'sms' ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('nav.sms')}
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => updateSettings({ displayRial: !settings.displayRial })}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded border border-slate-300"
            >
              واحد پول: {settings.displayRial ? 'ریال' : 'تومان'}
            </button>
            <div className="hidden sm:block">
              <JalaliDatePicker value={activeDate} onChange={setActiveDate} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function AppContent() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'inventory' | 'sms'>('inventory');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navigation activeTab={activeTab} setActiveTab={(t) => setActiveTab(t as any)} />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'inventory' && <InventoryPage />}
        {activeTab === 'sms' && <SmsPage />}
        {activeTab === 'calendar' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center py-16">
            <h2 className="text-xl font-bold text-slate-800">تقویم نوبت‌دهی سالن</h2>
            <p className="text-slate-500 mt-2">برای مدیریت نوبت‌ها و پرسنل، تب انبار یا پیامک را بررسی کنید.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

render(<App />, document.getElementById('app')!);
