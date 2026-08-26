import { TZDate } from '@date-fns/tz';
import { format as dateFnsFormat } from 'date-fns';
import type { FormatOptions, Locale } from 'date-fns';

const RIYADH_TZ = 'Asia/Riyadh';

export function formatRiyadh(
  date: string | Date | number | null | undefined,
  formatStr: string,
  options?: FormatOptions & { locale?: Locale }
): string {
  if (date === null || date === undefined) return '';
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return '';
  const tzDate = new TZDate(parsed, RIYADH_TZ);
  return dateFnsFormat(tzDate, formatStr, options);
}

export function formatRiyadhDate(date: string | Date | number | null | undefined): string {
  return formatRiyadh(date, 'yyyy-MM-dd');
}

export function getTodayRiyadh(): string {
  const now = new Date();
  const tzDate = new TZDate(now, RIYADH_TZ);
  return dateFnsFormat(tzDate, 'yyyy-MM-dd');
}

