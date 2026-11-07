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

/**
 * Returns the operational date range for delivery shifts.
 * The operational day cut-off is 10:00 AM (Riyadh timezone).
 * Before 10:00 AM: belongs to yesterday's cycle, so it returns yesterday as start and today as end.
 * From 10:00 AM onwards: returns today.
 */
export function getOperationalDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const tzDate = new TZDate(now, RIYADH_TZ);
  const hours = tzDate.getHours();

  if (hours < 10) {
    const yesterday = new Date(tzDate);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      startDate: dateFnsFormat(yesterday, 'yyyy-MM-dd'),
      endDate: dateFnsFormat(tzDate, 'yyyy-MM-dd')
    };
  }

  const todayStr = dateFnsFormat(tzDate, 'yyyy-MM-dd');
  return {
    startDate: todayStr,
    endDate: todayStr
  };
}
