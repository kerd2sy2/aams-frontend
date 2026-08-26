'use client';

import * as React from 'react';
import { LOCALE_COOKIE, messages, type Locale } from '@/lib/i18n';

type LocaleContextValue = {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
};

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

export function useLocale() {
  const context = React.useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider.');
  }
  return context;
}

export function LocaleProvider({
  initialLocale,
  children
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);
  const dir: 'ltr' | 'rtl' = locale === 'ar' ? 'rtl' : 'ltr';

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }, []);

  const t = React.useCallback(
    (key: string, fallback?: string) => {
      if (!key) return '';
      return messages[locale]?.[key] ?? fallback ?? key;
    },
    [locale]
  );

  React.useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = dir;
  }, [locale, dir]);

  const value = React.useMemo(
    () => ({ locale, dir, setLocale, t }),
    [locale, dir, setLocale, t]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
