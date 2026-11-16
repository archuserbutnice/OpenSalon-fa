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

export function SmsPage() {
  const { t } = useApp();
  const [activeTab, setActiveTab] = useState<'send_pattern' | 'send_direct' | 'logs' | 'config'>('send_pattern');

  // Send Pattern state
  const [patternPhone, setPatternPhone] = useState<string>('09123456789');
  const [selectedPattern, setSelectedPattern] = useState<string>('salon_appt_confirm');
  const [varName, setVarName] = useState<string>('خانم محمدی');
  const [varService, setVarService] = useState<string>('رنگ و لایت تخصصی');
  const [varDate, setVarDate] = useState<string>('۱۴۰۳/۰۸/۲۵');
  const [varTime, setVarTime] = useState<string>('۱۵:۳۰');

  // Send Direct state
  const [directPhone, setDirectPhone] = useState<string>('09123456789');
  const [directText, setDirectText] = useState<string>('مشتری گرامی، تخفیف ۲۰ درصدی خدمات کوتاهی مو تا پایان این هفته برای شما فعال شد.');

  // Config state
  const [apiKey, setApiKey] = useState<string>('mediana_test_api_key_sandbox');
  const [originator, setOriginator] = useState<string>('+9810001');
  const [isSandbox, setIsSandbox] = useState<boolean>(true);

  // Status & Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Mock Logs
  const [logs, setLogs] = useState<SmsLog[]>([
    {
      id: 'sms_1',
      recipient_phone: '09123456789',
      message_type: 'pattern',
      pattern_code: 'salon_appt_confirm',
      status: 'sent',
      provider_message_id: 'med_mock_9827341',
      created_at: new Date().toISOString()
    },
    {
      id: 'sms_2',
      recipient_phone: '09351234567',
      message_type: 'pattern',
      pattern_code: 'salon_auth_otp',
      status: 'sent',
      provider_message_id: 'med_mock_4398124',
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ]);

  const templates: SmsTemplate[] = [
    {
      id: 'tpl_1',
      name: 'تایید نوبت سالن',
      pattern_code: 'salon_appt_confirm',
      description: 'ارسال فوری پیامک تایید پس از ثبت نوبت',
      sample_text: 'مشتری گرامی %name%، نوبت شما برای خدمت %service% در تاریخ %date% ساعت %time% ثبت گردید.',
      required_variables: '["name", "service", "date", "time"]'
    },
    {
      id: 'tpl_2',
      name: 'یادآوری نوبت فردا',
      pattern_code: 'salon_appt_reminder',
      description: 'ارسال یادآوری به مشتری ۲۴ ساعت قبل از موعد نوبت',
      sample_text: 'سلام %name% عزیز، نوبت سالن زیبایی رز برای شما فردا ساعت %time% رزرو شده است.',
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
  ];

  const handleSendPattern = (e: any) => {
    e.preventDefault();
    const normalized = normalizeIranianPhone(patternPhone);
    if (!normalized) {
      setFeedback({ type: 'error', message: 'شماره موبایل وارد شده نامعتبر است. لطفاً شماره صحیح مانند ۰۹۱۲۳۴۵۶۷۸۹ وارد کنید.' });
      return;
    }

    const newLog: SmsLog = {
      id: 'sms_' + Date.now(),
      recipient_phone: normalized,
      message_type: 'pattern',
      pattern_code: selectedPattern,
      status: 'sent',
      provider_message_id: 'med_mock_' + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString()
    };

    setLogs([newLog, ...logs]);
    setFeedback({ type: 'success', message: `پیامک الگوی ${selectedPattern} با موفقیت به ${normalized} ارسال شد.` });
  };

  const handleSendDirect = (e: any) => {
    e.preventDefault();
    const normalized = normalizeIranianPhone(directPhone);
    if (!normalized) {
      setFeedback({ type: 'error', message: 'شماره موبایل وارد شده نامعتبر است.' });
      return;
    }

    const newLog: SmsLog = {
      id: 'sms_' + Date.now(),
      recipient_phone: normalized,
      message_type: 'direct',
      message_text: directText,
      status: 'sent',
      provider_message_id: 'med_mock_' + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString()
    };

    setLogs([newLog, ...logs]);
    setFeedback({ type: 'success', message: `پیامک متنی با موفقیت به ${normalized} ارسال گردید.` });
  };

  return (
    <div className="space-y-6">
      {/* Provider Status Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            📩
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">درگاه پیامک مدیانا (Mediana SMS)</h2>
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                isSandbox ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
              }`}>
                {isSandbox ? 'محیط آزمایشی (Sandbox)' : 'درگاه فعال (عملیاتی)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">خط ارسال‌کننده پیش‌فرض: {originator}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('send_pattern')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              activeTab === 'send_pattern' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700'
            }`}
          >
            ارسال پترن (الگو)
          </button>
          <button
            onClick={() => setActiveTab('send_direct')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              activeTab === 'send_direct' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700'
            }`}
          >
            ارسال مستقیم
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              activeTab === 'logs' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700'
            }`}
          >
            گزارشات ارسال ({toPersianDigits(logs.length)})
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              activeTab === 'config' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700'
            }`}
          >
            تنظیمات درگاه
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
          feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold mr-4">✕</button>
        </div>
      )}

      {/* Send Pattern Tab */}
      {activeTab === 'send_pattern' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4">ارسال پیامک با الگو (خدماتی / سریع)</h3>
            <p className="text-xs text-slate-500 mb-6">
              پیامک‌های پترن مدیانا حتی به شماره‌های مسدود در بلک‌لیست تبلیغاتی نیز تحویل داده می‌شوند.
            </p>

            <form onSubmit={handleSendPattern} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">شماره موبایل گیرنده (ایرانی)</label>
                <input
                  type="text"
                  value={patternPhone}
                  onInput={(e: any) => setPatternPhone(e.target.value)}
                  placeholder="مثال: 09123456789"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono text-left focus:ring-2 focus:ring-blue-500"
                  required
                />
                {patternPhone && (
                  <span className={`text-xs mt-1 block ${isValidIranianMobile(patternPhone) ? 'text-green-600' : 'text-red-500'}`}>
                    {isValidIranianMobile(patternPhone) ? `✓ شماره معتبر: ${normalizeIranianPhone(patternPhone)}` : '✗ شماره موبایل نامعتبر است'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">انتخاب الگوی پیامک</label>
                <select
                  value={selectedPattern}
                  onChange={(e: any) => setSelectedPattern(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                >
                  {templates.map(t => (
                    <option key={t.pattern_code} value={t.pattern_code}>
                      {t.name} ({t.pattern_code})
                    </option>
                  ))}
                </select>
              </div>

              {selectedPattern === 'salon_appt_confirm' && (
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">متغیر %name% (نام مشتری)</label>
                    <input
                      type="text"
                      value={varName}
                      onInput={(e: any) => setVarName(e.target.value)}
                      className="w-full border border-slate-300 rounded p-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">متغیر %service% (خدمت)</label>
                    <input
                      type="text"
                      value={varService}
                      onInput={(e: any) => setVarService(e.target.value)}
                      className="w-full border border-slate-300 rounded p-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">متغیر %date% (تاریخ شمسی)</label>
                    <input
                      type="text"
                      value={varDate}
                      onInput={(e: any) => setVarDate(e.target.value)}
                      className="w-full border border-slate-300 rounded p-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">متغیر %time% (ساعت)</label>
                    <input
                      type="text"
                      value={varTime}
                      onInput={(e: any) => setVarTime(e.target.value)}
                      className="w-full border border-slate-300 rounded p-1.5 text-sm"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
              >
                ارسال فوری پیامک پترن
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-800">پیش‌نمایش الگوهای تاییدشده</h4>
            <div className="space-y-3">
              {templates.map(t => (
                <div key={t.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-slate-900">{t.name}</div>
                  <div className="font-mono text-blue-600">{t.pattern_code}</div>
                  <div className="text-slate-600">{t.sample_text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Send Direct Tab */}
      {activeTab === 'send_direct' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto">
          <h3 className="text-base font-bold text-slate-900 mb-2">ارسال پیامک متنی / اطلاع‌رسانی</h3>
          <p className="text-xs text-slate-500 mb-6">ارسال متن دلخواه به یک یا چند گیرنده از طریق وب‌سرویس مدیانا.</p>

          <form onSubmit={handleSendDirect} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">شماره موبایل گیرنده</label>
              <input
                type="text"
                value={directPhone}
                onInput={(e: any) => setDirectPhone(e.target.value)}
                placeholder="09xxxxxxxxx"
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono text-left"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">متن پیامک</label>
              <textarea
                rows={4}
                value={directText}
                onInput={(e: any) => setDirectText(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                required
              />
              <div className="text-left text-xs text-slate-400 mt-1">
                تعداد کاراکتر: {toPersianDigits(directText.length)} (۱ صفحه فارسی)
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
            >
              ارسال مستقیم پیامک
            </button>
          </form>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-800">دفترچه گزارش پیامک‌های ارسالی</h3>
            <span className="text-xs text-slate-500">تعداد کل: {toPersianDigits(logs.length)}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-right">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">گیرنده</th>
                  <th className="px-6 py-3">نوع پیام</th>
                  <th className="px-6 py-3">کد الگو / متن</th>
                  <th className="px-6 py-3">شناسه پیام در مدیانا</th>
                  <th className="px-6 py-3">وضعیت</th>
                  <th className="px-6 py-3">زمان ثبت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-sm">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-xs">{toPersianDigits(log.recipient_phone)}</td>
                    <td className="px-6 py-3 text-xs">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {log.message_type === 'pattern' ? 'الگو (پترن)' : 'مستقیم'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-700">{log.pattern_code || log.message_text}</td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">{log.provider_message_id || '-'}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ ارسال شد
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500">
                      {formatJalaliDate(new Date(log.created_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Config Tab */}
      {activeTab === 'config' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-xl mx-auto space-y-4">
          <h3 className="text-base font-bold text-slate-900 mb-2">تنظیمات اتصال به وب‌سرویس مدیانا</h3>
          <p className="text-xs text-slate-500">کلید دسترسی و شماره خط اختصاصی سالن را جهت ارسال پیامک وارد نمایید.</p>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">کلید وب‌سرویس (API Key)</label>
            <input
              type="password"
              value={apiKey}
              onInput={(e: any) => setApiKey(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono text-left"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">خط پیش‌فرض ارسال‌کننده (Originator)</label>
            <input
              type="text"
              value={originator}
              onInput={(e: any) => setOriginator(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono text-left"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="sandbox_toggle"
              checked={isSandbox}
              onChange={(e: any) => setIsSandbox(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="sandbox_toggle" className="text-sm font-medium text-slate-700">
              فعال‌سازی حالت آزمایشی (Sandbox - عدم کسر شارژ واقعی)
            </label>
          </div>

          <button
            onClick={() => setFeedback({ type: 'success', message: 'تنظیمات درگاه مدیانا با موفقیت ذخیره شد.' })}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition mt-4"
          >
            ذخیره تنظیمات
          </button>
        </div>
      )}
    </div>
  );
}
