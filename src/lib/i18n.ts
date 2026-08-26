/**
 * i18n — نظام الترجمة ثنائي اللغة
 *
 * لتعديل الترجمات:
 *  - النصوص العربية  → src/lib/locales/ar.ts
 *  - النصوص الإنجليزية → src/lib/locales/en.ts
 */
import ar from './locales/ar';
import en from './locales/en';

export type Locale = 'en' | 'ar';

export const LOCALES: Locale[] = ['en', 'ar'];
export const DEFAULT_LOCALE: Locale = 'ar';
export const LOCALE_COOKIE = 'locale';

export const messages: Record<Locale, Record<string, string>> = { en, ar };

export function translate(key: string, locale: Locale, fallback?: string): string {
  if (!key) return '';
  return messages[locale]?.[key] ?? fallback ?? key;
}
