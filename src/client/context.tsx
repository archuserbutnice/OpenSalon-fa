import { createContext } from 'preact';
import { useState, useContext } from 'preact/hooks';
import { Locale, setLocale as applyLocale, t } from './lib/i18n';

export interface AppSettings {
  salonName: string;
  locale: Locale;
  currency: 'toman' | 'rial';
  displayRial: boolean;
  calendarType: 'jalali' | 'gregorian';
  weekStartDay: 'saturday' | 'sunday';
  timezone: string;
}

interface AppContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  locale: Locale;
  setLocale: (loc: Locale) => void;
  activeDate: Date;
  setActiveDate: (d: Date) => void;
  t: typeof t;
}

const defaultSettings: AppSettings = {
  salonName: 'سالن زیبایی رز',
  locale: 'fa',
  currency: 'toman',
  displayRial: false,
  calendarType: 'jalali',
  weekStartDay: 'saturday',
  timezone: 'Asia/Tehran'
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: any }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [activeDate, setActiveDate] = useState<Date>(new Date());

  const handleSetLocale = (loc: Locale) => {
    applyLocale(loc);
    setSettings(prev => ({ ...prev, locale: loc }));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <AppContext.Provider value={{
      settings,
      updateSettings,
      locale: settings.locale,
      setLocale: handleSetLocale,
      activeDate,
      setActiveDate,
      t
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
