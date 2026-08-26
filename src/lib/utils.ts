import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns true if the current logged-in admin has no branch_id (i.e., is a super admin) */
export function isSuperAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('admin_user');
    if (!stored) return false;
    const admin = JSON.parse(stored);
    return !admin.branch_id;
  } catch {
    return false;
  }
}

export function formatBytes(
  bytes: number,
  opts: {
    decimals?: number;
    sizeType?: 'accurate' | 'normal';
  } = {}
) {
  const { decimals = 0, sizeType = 'normal' } = opts;

  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const accurateSizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(decimals)} ${
    sizeType === 'accurate' ? (accurateSizes[i] ?? 'Bytest') : (sizes[i] ?? 'Bytes')
  }`;
}

/** تنظيف رقم الجوال السعودي وإعادته بصيغة دولية (9665xxxxxxxx) أو null لو غير صالح. */
export function normalizeSaudiPhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const digitsOnly = String(raw).replace(/[^0-9+]/g, '');
  if (!digitsOnly) return null;

  let cleaned = digitsOnly;
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  if (cleaned.startsWith('966')) cleaned = cleaned.slice(3);
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  if (cleaned.length !== 9) return null;
  return `966${cleaned}`;
}

/** توليد رابط محادثة WhatsApp مباشر لرقم جوال سعودي. */
export function getWhatsAppURL(
  phoneRaw: string | undefined | null,
  message?: string
): string | undefined {
  const international = normalizeSaudiPhone(phoneRaw);
  if (!international) return undefined;
  const base = `https://wa.me/${international}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}
