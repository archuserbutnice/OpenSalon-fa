import { useState, useEffect } from 'preact/hooks';
import { useApp } from '../context';
import { toPersianDigits } from '../lib/currency';
import { formatJalaliDate } from '../lib/jalali';
import { normalizeIranianPhone, isValidIranianMobile } from '../lib/phone';

interface SmsLog {
  id: string;
  recipient_phone: string;
  message_type: 'pattern' | 'direct';
  pattern_code?: string;
  message_text?: string;
  status: 'queued' | 'sent' | 'failed';
  provider_message_id?: string;
  error_message?: string;
  segments?: number;
  sent_at?: string;
  created_at: string;
}

interface SmsQueueItem {
  id: string;
  provider: string;
  message_type: 'pattern' | 'direct';
  recipient_phone: string;
  pattern_code?: string;
  message_text?: string;
  segments: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  last_error?: string;
  created_at: string;
}

interface SmsTemplate {
  id: string;
  name: string;
  pattern_code: string;
  description: string;
  sample_text: string;
  required_variables: string;
}

interface SmsConfig {
  id: string;
  provider: string;
  api_key: string;
  api_key_masked?: string;
  default_originator: string;
  is_active: number;
  is_sandbox: number;
}

export function SmsPage() {
  const { t } = useApp();
  const [activeTab, setActiveTab] = useState<'logs' | 'queue' | 'send_pattern' | 'send_direct' | 'config'>('logs');

  // Config & Dry-run State
  const [config, setConfig] = useState<SmsConfig>({
    id: 'cfg_mediana_default',
    provider: 'mediana',
    api_key: 'mediana_test_api_key_sandbox',
    default_originator: '+9810001',
    is_active: 1,
    is_sandbox: 1
  });
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // Logs & Filter State
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [logStatusFilter, setLogStatusFilter] = useState<string>('all');
  const [logSearchPhone, setLogSearchPhone] = useState<string>('');

  // Queue State
  const [queueItems, setQueueItems] = useState<SmsQueueItem[]>([]);
  const [queueStats, setQueueStats] = useState({ pending: 0, processing: 0, completed: 0, failed: 0, total: 0 });
  const [processingQueue, setProcessingQueue] = useState<boolean>(false);

  // Send Pattern state
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [patternPhone, setPatternPhone] = useState<string>('09123456789');
  const [selectedPattern, setSelectedPattern] = useState<string>('salon_appt_confirm');
  const [patternValues, setPatternValues] = useState<Record<string, string>>({
    name: 'خانم محمدی',
    service: 'رنگ و لایت تخصصی',
    date: '۱۴۰۳/۰۸/۲۵',
    time: '۱۵:۳۰',
    code: '48291'
  });

  // Send Direct state
  const [directPhone, setDirectPhone] = useState<string>('09123456789');
  const [directText, setDirectText] = useState<string>('مشتری گرامی، تخفیف ۲۰ درصدی خدمات کوتاهی مو تا پایان این هفته برای شما فعال شد. سالن زیبایی رز');

  // Feedback state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Live Segment Counter Calculation
  const isPersian = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(directText);
  const charLength = directText.length;
  let segmentCount = 1;
  let maxPerPart = isPersian ? 70 : 160;
  let remainingChars = maxPerPart - charLength;

  if (isPersian) {
    if (charLength <= 70) {
      segmentCount = charLength === 0 ? 0 : 1;
      remainingChars = 70 - charLength;
    } else {
      segmentCount = Math.ceil(charLength / 67);
      remainingChars = (segmentCount * 67) - charLength;
      maxPerPart = 67;
    }
  } else {
    if (charLength <= 160) {
      segmentCount = charLength === 0 ? 0 : 1;
      remainingChars = 160 - charLength;
    } else {
      segmentCount = Math.ceil(charLength / 153);
      remainingChars = (segmentCount * 153) - charLength;
      maxPerPart = 153;
    }
  }

  // Load Initial Data
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Config
      const resConfig = await fetch('/api/sms/config').then(r => r.json()).catch(() => null);
      if (resConfig && resConfig.success) {
        setConfig(resConfig.data);
      }

      // 2. Logs
      const resLogs = await fetch('/api/sms/logs?limit=50').then(r => r.json()).catch(() => null);
      if (resLogs && resLogs.success) {
        setLogs(resLogs.data);
      } else {
        setLogs([
          {
            id: 'sms_1',
            recipient_phone: '09123456789',
            message_type: 'pattern',
            pattern_code: 'salon_appt_confirm',
            message_text: 'مشتری گرامی خانم محمدی، نوبت شما برای خدمت رنگ و لایت تخصصی ثبت گردید.',
            status: 'sent',
            segments: 1,
            provider_message_id: 'med_mock_9827341',
            sent_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          },
          {
            id: 'sms_2',
            recipient_phone: '09351234567',
            message_type: 'pattern',
            pattern_code: 'salon_auth_otp',
            message_text: 'کد ورود شما به سالن زیبایی رز: 58291',
            status: 'sent',
            segments: 1,
            provider_message_id: 'med_mock_4398124',
            sent_at: new Date(Date.now() - 3600000).toISOString(),
            created_at: new Date(Date.now() - 3600000).toISOString()
          }
        ]);
      }

      // 3. Queue stats & items
      const resStats = await fetch('/api/sms/queue/stats').then(r => r.json()).catch(() => null);
      if (resStats && resStats.success) {
        setQueueStats(resStats.data);
      }
      const resQueue = await fetch('/api/sms/queue?limit=50').then(r => r.json()).catch(() => null);
      if (resQueue && resQueue.success) {
        setQueueItems(resQueue.data);
      }

      // 4. Templates
      const resTpl = await fetch('/api/sms/templates').then(r => r.json()).catch(() => null);
      if (resTpl && resTpl.success && resTpl.data.length > 0) {
        setTemplates(resTpl.data);
      } else {
        setTemplates([
          {
            id: 'tpl_1',
            name: 'تایید نوبت سالن',
            pattern_code: 'salon_appt_confirm',
            description: 'ارسال فوری پیامک تایید پس از ثبت نوبت',
            sample_text: 'مشتری گرامی %name%، نوبت شما برای خدمت %service% در تاریخ %date% ساعت %time% ثبت گردید. سالن زیبایی رز',
            required_variables: '["name", "service", "date", "time"]'
          },
          {
            id: 'tpl_2',
            name: 'یادآوری نوبت فردا',
            pattern_code: 'salon_appt_reminder',
            description: 'ارسال یادآوری به مشتری ۲۴ ساعت قبل از موعد نوبت',
            sample_text: 'سلام %name% عزیز، نوبت شما برای فردا ساعت %time% رزرو شده است. سالن زیبایی رز',
            required_variables: '["name", "time"]'
          },
          {
            id: 'tpl_3',
            name: 'کد تایید ورود (OTP)',
            pattern_code: 'salon_auth_otp',
            description: 'کد یکبار مصرف جهت احراز هویت ورود',
            sample_text: 'کد ورود شما به سالن زیبایی رز: %code%',
            required_variables: '["code"]'
          }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Toggle Dry-run / Sandbox Mode
  const handleToggleSandbox = async (newVal: boolean) => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/sms/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSandbox: newVal })
      }).then(r => r.json()).catch(() => null);

      if (res && res.success) {
        setConfig(res.data);
        setFeedback({
          type: 'success',
          message: newVal
            ? 'حالت شبیه‌ساز (Dry-Run / Sandbox) با موفقیت فعال شد. هیچ پیامک واقعی ارسال نخواهد شد.'
            : 'درگاه در حالت زنده قرار گرفت. ارسال‌ها واقعی خواهند بود.'
        });
      } else {
        setConfig({ ...config, is_sandbox: newVal ? 1 : 0 });
        setFeedback({
          type: 'success',
          message: newVal ? 'حالت شبیه‌ساز فعال شد.' : 'حالت زنده فعال شد.'
        });
      }
    } finally {
      setSavingConfig(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  // Update Full Config
  const handleSaveConfig = async (e: any) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch('/api/sms/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.api_key,
          defaultOriginator: config.default_originator,
          isSandbox: config.is_sandbox === 1
        })
      }).then(r => r.json()).catch(() => null);

      if (res && res.success) {
        setConfig(res.data);
        setFeedback({ type: 'success', message: 'تنظیمات درگاه مدیانا با موفقیت ذخیره شد.' });
      } else {
        setFeedback({ type: 'error', message: res?.error || 'خطا در ذخیره تنظیمات' });
      }
    } finally {
      setSavingConfig(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Handle Send Pattern
  const handleSendPattern = async (e: any) => {
    e.preventDefault();
    const normalized = normalizeIranianPhone(patternPhone);
    if (!normalized) {
      setFeedback({ type: 'error', message: 'شماره موبایل وارد شده معتبر نمی‌باشد (فرمت صحیح: ۰۹xxxxxxxxx)' });
      return;
    }

    try {
      const res = await fetch('/api/sms/send-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: normalized,
          patternCode: selectedPattern,
          values: patternValues
        })
      }).then(r => r.json()).catch(() => null);

      if (res && res.success) {
        setFeedback({
          type: 'success',
          message: `پیامک خدماتی با موفقیت ${config.is_sandbox === 1 ? 'در محیط شبیه‌ساز (Sandbox) ثبت' : 'ارسال'} شد. شناسه: ${res.data.messageId || res.data.providerMessageId}`
        });
        loadData();
      } else {
        setFeedback({ type: 'error', message: res?.error || 'خطا در ارسال پیامک پترن' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
    setTimeout(() => setFeedback(null), 6000);
  };

  // Handle Send Direct
  const handleSendDirect = async (e: any) => {
    e.preventDefault();
    const normalized = normalizeIranianPhone(directPhone);
    if (!normalized) {
      setFeedback({ type: 'error', message: 'شماره موبایل وارد شده معتبر نمی‌باشد' });
      return;
    }

    try {
      const res = await fetch('/api/sms/send-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: [normalized],
          messageText: directText
        })
      }).then(r => r.json()).catch(() => null);

      if (res && res.success) {
        setFeedback({
          type: 'success',
          message: `پیامک مستقیم با موفقیت ${config.is_sandbox === 1 ? 'در محیط شبیه‌ساز (Sandbox) ثبت' : 'ارسال'} شد.`
        });
        loadData();
      } else {
        setFeedback({ type: 'error', message: res?.error || 'خطا در ارسال مستقیم' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
    setTimeout(() => setFeedback(null), 6000);
  };

  // Handle Process Queue Batch
  const handleProcessQueue = async () => {
    setProcessingQueue(true);
    try {
      const res = await fetch('/api/sms/queue/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 20 })
      }).then(r => r.json()).catch(() => null);

      if (res && res.success) {
        setFeedback({
          type: 'success',
          message: `پردازش صف انجام شد: ${toPersianDigits(res.data.succeeded)} موفق، ${toPersianDigits(res.data.failed)} ناموفق.`
        });
        loadData();
      }
    } finally {
      setProcessingQueue(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Render Template Preview
  const currentTemplate = templates.find(t => t.pattern_code === selectedPattern);
  let renderedPreview = currentTemplate ? currentTemplate.sample_text : '';
  if (renderedPreview) {
    for (const [k, v] of Object.entries(patternValues)) {
      renderedPreview = renderedPreview.replace(new RegExp(`%${k}%`, 'g'), v || `[${k}]`);
    }
  }

  // Filtered Logs
  const filteredLogs = logs.filter(log => {
    if (logStatusFilter !== 'all' && log.status !== logStatusFilter) return false;
    if (logSearchPhone && !log.recipient_phone.includes(logSearchPhone)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Dry-Run / Sandbox Toggle */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-center gap-4 transition shadow-sm ${
        config.is_sandbox === 1
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{config.is_sandbox === 1 ? '🧪' : '🚀'}</span>
          <div>
            <div className="font-bold flex items-center gap-2 text-sm sm:text-base">
              <span>{config.is_sandbox === 1 ? 'حالت شبیه‌ساز پیامک (Dry-Run / Sandbox) فعال است' : 'درگاه پیامک در حالت زنده (Live Production) فعال است'}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                config.is_sandbox === 1 ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
              }`}>
                {config.is_sandbox === 1 ? 'DRY-RUN' : 'LIVE'}
              </span>
            </div>
            <div className="text-xs mt-0.5 opacity-90">
              {config.is_sandbox === 1
                ? 'در این حالت پیامک‌های خدماتی و مستقیم بدون اتصال به مخابرات و بدون کسر هزینه شبیه‌سازی و لاگ می‌شوند.'
                : 'پیامک‌ها مستقیماً از طریق درگاه رسمی مدیانا به شماره مشترکین ارسال خواهند شد.'}
            </div>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-3 bg-white/80 p-2 rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-700">تغییر وضعیت:</span>
          <button
            onClick={() => handleToggleSandbox(config.is_sandbox !== 1)}
            disabled={savingConfig}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              config.is_sandbox === 1
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            {config.is_sandbox === 1 ? 'فعال‌سازی حالت زنده' : 'بازگشت به شبیه‌ساز'}
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-3 ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'
        }`}>
          <span>{feedback.type === 'success' ? '✅' : '❌'}</span>
          <div>{feedback.message}</div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">کل پیامک‌های ارسالی</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">
              {toPersianDigits(logs.filter(l => l.status === 'sent').length)} <span className="text-xs text-slate-500">پیامک</span>
            </div>
          </div>
          <span className="text-3xl p-2.5 bg-blue-50 text-blue-600 rounded-xl">📤</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">پیامک‌های در صف انتظار</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              {toPersianDigits(queueStats.pending)} <span className="text-xs text-slate-500">در صف</span>
            </div>
          </div>
          <span className="text-3xl p-2.5 bg-amber-50 text-amber-600 rounded-xl">⏳</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">خطاهای ارسال</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              {toPersianDigits(logs.filter(l => l.status === 'failed').length + queueStats.failed)} <span className="text-xs text-slate-500">مورد</span>
            </div>
          </div>
          <span className="text-3xl p-2.5 bg-red-50 text-red-600 rounded-xl">⚠️</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">خط ارسال پیش‌فرض</div>
            <div className="text-lg font-bold font-mono text-slate-800 mt-1">
              {toPersianDigits(config.default_originator)}
            </div>
          </div>
          <span className="text-3xl p-2.5 bg-purple-50 text-purple-600 rounded-xl">📟</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 space-x-reverse overflow-x-auto pb-1 text-sm font-medium">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2.5 rounded-t-lg transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'logs'
                ? 'border-b-2 border-pink-600 text-pink-600 font-bold bg-pink-50/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📜</span> لاگ و سوابق تحویل پیامک
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2.5 rounded-t-lg transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'queue'
                ? 'border-b-2 border-pink-600 text-pink-600 font-bold bg-pink-50/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>⏱️</span> صف ارسال و مدیریت خطاها
            {queueStats.pending > 0 && (
              <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-mono">
                {toPersianDigits(queueStats.pending)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('send_pattern')}
            className={`px-4 py-2.5 rounded-t-lg transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'send_pattern'
                ? 'border-b-2 border-pink-600 text-pink-600 font-bold bg-pink-50/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>⚡</span> ارسال پترن خدماتی (تایید / یادآوری / OTP)
          </button>

          <button
            onClick={() => setActiveTab('send_direct')}
            className={`px-4 py-2.5 rounded-t-lg transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'send_direct'
                ? 'border-b-2 border-pink-600 text-pink-600 font-bold bg-pink-50/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>✉️</span> ارسال مستقیم و پیامک متنی
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2.5 rounded-t-lg transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'config'
                ? 'border-b-2 border-pink-600 text-pink-600 font-bold bg-pink-50/50'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>⚙️</span> تنظیمات درگاه و کلید API
          </button>
        </nav>
      </div>

      {/* --- TAB 1: DELIVERY LOGS --- */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="جستجو با شماره گیرنده (مثال: 0912)..."
                value={logSearchPhone}
                onInput={(e: any) => setLogSearchPhone(e.target.value)}
                className="w-full md:w-72 px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono"
              />
              <select
                value={logStatusFilter}
                onChange={(e: any) => setLogStatusFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="sent">ارسال موفق</option>
                <option value="failed">ناموفق / خطا</option>
                <option value="queued">در صف</option>
              </select>
            </div>
            <button
              onClick={loadData}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg border border-slate-300 flex items-center gap-1.5"
            >
              <span>🔄</span> به‌روزرسانی لاگ‌ها
            </button>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-right">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">شماره گیرنده</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">نوع پیامک</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">متن / پترن پیامک</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">تعداد پارت</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">وضعیت تحویل</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">شناسه پیگیری</th>
                    <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">تاریخ و ساعت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-slate-900">
                        {toPersianDigits(log.recipient_phone)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                        {log.message_type === 'pattern' ? (
                          <span className="bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-medium">
                            خدماتی ({log.pattern_code})
                          </span>
                        ) : (
                          <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-medium">
                            ارسال مستقیم
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-700 max-w-xs truncate">
                        {log.message_text || log.pattern_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-mono">
                        {toPersianDigits(log.segments || 1)} پیامک
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.status === 'sent'
                            ? 'bg-green-100 text-green-800'
                            : log.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {log.status === 'sent' ? 'ارسال شده' : log.status === 'failed' ? 'خطا در ارسال' : 'در صف'}
                        </span>
                        {log.error_message && (
                          <div className="text-2xs text-red-500 mt-0.5 max-w-xs truncate" title={log.error_message}>
                            {log.error_message}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">
                        {log.provider_message_id || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                        {formatJalaliDate(new Date(log.created_at))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: QUEUE MONITOR --- */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-900">صف ارسال خودکار پیامک‌ها (Retry & Backoff)</h3>
              <p className="text-xs text-slate-500 mt-1">
                پیامک‌های زمان‌بندی‌شده و مواردی که با قطعی موقت درگاه مواجه شده‌اند، به صورت خودکار با تاخیر فزاینده (Exponential Backoff) مجدداً ارسال می‌شوند.
              </p>
            </div>
            <button
              onClick={handleProcessQueue}
              disabled={processingQueue}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <span>▶️</span> {processingQueue ? 'در حال ارسال...' : 'پردازش دستی صف پیامک‌ها'}
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 text-right">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">شماره گیرنده</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">نوع پیام</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">تعداد دفعات تلاش</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">وضعیت در صف</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">آخرین خطا</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500">تاریخ تلاش بعدی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {queueItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                      هیچ پیامی در صف انتظار وجود ندارد. همه پیام‌ها پردازش شده‌اند.
                    </td>
                  </tr>
                ) : (
                  queueItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-slate-900">
                        {toPersianDigits(item.recipient_phone)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                        {item.message_type === 'pattern' ? `پترن (${item.pattern_code})` : 'ارسال مستقیم'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-700">
                        تلاش {toPersianDigits(item.attempts)} از {toPersianDigits(item.max_attempts)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : item.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status === 'completed' ? 'ارسال شد' : item.status === 'failed' ? 'توقف تلاش (خطا)' : 'در انتظار ارسال'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-red-600 max-w-xs truncate">
                        {item.last_error || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                        {item.next_attempt_at ? formatJalaliDate(new Date(item.next_attempt_at)) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 3: SEND PATTERN SMS --- */}
      {activeTab === 'send_pattern' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">ارسال پیامک بر اساس الگوهای خدماتی تایید شده</h3>
            <p className="text-xs text-slate-500">
              پیامک‌های الگویی بدون تاخیر و به تمامی شماره‌ها حتی خطوط بلک‌لیست تبلیغاتی تحویل داده می‌شوند.
            </p>

            <form onSubmit={handleSendPattern} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">انتخاب الگوی پیامک</label>
                <select
                  value={selectedPattern}
                  onChange={(e: any) => setSelectedPattern(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                >
                  {templates.map(tpl => (
                    <option key={tpl.pattern_code} value={tpl.pattern_code}>
                      {tpl.name} ({tpl.pattern_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">شماره موبایل گیرنده</label>
                <input
                  type="text"
                  value={patternPhone}
                  onInput={(e: any) => setPatternPhone(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono"
                  placeholder="09121234567"
                  required
                />
              </div>

              {/* Dynamic Variables Inputs */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-700">متغیرهای الگو:</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-2xs text-slate-600 mb-1">نام مشتری (name)</label>
                    <input
                      type="text"
                      value={patternValues.name || ''}
                      onInput={(e: any) => setPatternValues({ ...patternValues, name: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                  {selectedPattern.includes('confirm') && (
                    <div>
                      <label className="block text-2xs text-slate-600 mb-1">عنوان خدمت (service)</label>
                      <input
                        type="text"
                        value={patternValues.service || ''}
                        onInput={(e: any) => setPatternValues({ ...patternValues, service: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                      />
                    </div>
                  )}
                  {selectedPattern.includes('confirm') && (
                    <div>
                      <label className="block text-2xs text-slate-600 mb-1">تاریخ نوبت (date)</label>
                      <input
                        type="text"
                        value={patternValues.date || ''}
                        onInput={(e: any) => setPatternValues({ ...patternValues, date: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-2xs text-slate-600 mb-1">ساعت نوبت (time)</label>
                    <input
                      type="text"
                      value={patternValues.time || ''}
                      onInput={(e: any) => setPatternValues({ ...patternValues, time: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-bold shadow-sm transition"
              >
                ارسال فوری پیامک خدماتی
              </button>
            </form>
          </div>

          {/* Live Template Preview */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-2">پیش‌نمایش زنده متن پیامک</h4>
              <p className="text-xs text-slate-500 mb-4">
                پیامک دریافتی توسط مشتری با جایگذاری متغیرها به شکل زیر خواهد بود:
              </p>

              <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm relative text-right">
                <div className="text-xs font-mono text-slate-400 mb-2">فرستنده: {config.default_originator}</div>
                <div className="text-sm font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">
                  {renderedPreview}
                </div>
                <div className="text-2xs text-slate-400 mt-4 text-left">
                  {toPersianDigits(renderedPreview.length)} کاراکتر • ۱ پارت پیامک خدماتی
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 bg-white p-3.5 rounded-lg border border-slate-200 mt-6">
              💡 پترن‌های خدماتی مدیانا بدون مسدودی بر اساس قوانین سازمان تنظیم مقررات مخابرات به دست همه مشتریان می‌رسند.
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: SEND DIRECT SMS & LIVE SEGMENT CALCULATOR --- */}
      {activeTab === 'send_direct' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">ارسال مستقیم و پیامک متنی</h3>
            <p className="text-xs text-slate-500">
              ارسال مستقیم به شماره‌های دلخواه یا اطلاع‌رسانی جشنواره‌های تخفیف سالن.
            </p>

            <form onSubmit={handleSendDirect} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">شماره موبایل گیرنده</label>
                <input
                  type="text"
                  value={directPhone}
                  onInput={(e: any) => setDirectPhone(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono"
                  placeholder="09121234567"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">متن پیامک</label>
                <textarea
                  rows={4}
                  value={directText}
                  onInput={(e: any) => setDirectText(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm leading-relaxed"
                  required
                />
              </div>

              {/* Segment Calculator Live Widget */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-600">طول پیام: </span>
                  <span className="font-bold font-mono text-slate-900">{toPersianDigits(charLength)}</span> کاراکتر{' '}
                  <span className="text-slate-400">({isPersian ? 'فارسی' : 'لاتین'})</span>
                </div>
                <div>
                  <span className="text-slate-600">تعداد پیامک مصرفی: </span>
                  <span className="font-bold text-pink-600 font-mono text-sm">{toPersianDigits(segmentCount)}</span> پارت
                </div>
                <div className="text-slate-500">
                  {toPersianDigits(remainingChars)} کاراکتر تا پارت بعدی
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-bold shadow-sm transition"
              >
                ارسال پیامک مستقیم
              </button>
            </form>
          </div>

          {/* Guidelines */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">استاندارد محاسبه طول پیامک مخابرات ایران</h4>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">پیامک‌های فارسی (Unicode):</div>
                پارت اول حداکثر <b>۷۰ کاراکتر</b> است. در صورت فراتر رفتن، هر پارت بر اساس <b>۶۷ کاراکتر</b> محاسبه می‌شود.
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">پیامک‌های انگلیسی (GSM-7):</div>
                پارت اول حداکثر <b>۱۶۰ کاراکتر</b> است. در صورت فراتر رفتن، هر پارت بر اساس <b>۱۵۳ کاراکتر</b> محاسبه می‌شود.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: GATEWAY CONFIG --- */}
      {activeTab === 'config' && (
        <div className="max-w-2xl bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">تنظیمات درگاه پیامک مدیانا (Mediana.ir)</h3>
            <p className="text-xs text-slate-500 mt-1">
              کلید اختصاصی API و خط ارسال پیامک سالن خود را در این بخش پیکربندی فرمایید.
            </p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">کلید وب‌سرویس مدیانا (X-API-KEY)</label>
              <input
                type="text"
                value={config.api_key}
                onInput={(e: any) => setConfig({ ...config, api_key: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono"
                placeholder="mediana_test_api_key_sandbox"
                required
              />
              <div className="text-2xs text-slate-400 mt-1">
                از پنل کاربری مدیانا بخش «وب‌سرویس و API» کلید خود را کپی کنید.
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">شماره خط ارسال‌کننده پیش‌فرض (Originator)</label>
              <input
                type="text"
                value={config.default_originator}
                onInput={(e: any) => setConfig({ ...config, default_originator: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono"
                placeholder="+9810001"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-bold shadow-sm transition"
              >
                {savingConfig ? 'در حال ذخیره‌سازی...' : 'ذخیره تنظیمات درگاه'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
