'use client';

export function isNetworkError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;

  if (e.code === 'ERR_NETWORK') return true;
  if (e.code === 'ECONNABORTED') return true;
  if (e.code === 'ETIMEDOUT') return true;
  if (e.code === 'ERR_CONNECTION_REFUSED') return true;

  const msg = String(e.message || '').toLowerCase();
  if (msg.includes('network error')) return true;
  if (msg.includes('fetch failed')) return true;
  if (msg.includes('err_connection')) return true;
  if (msg.includes('failed to fetch')) return true;
  if (msg.includes('connection refused')) return true;

  if (!e.response && !e.status) {
    return true;
  }

  if (e.response || e.status) {
    return false;
  }

  return false;
}

export function isCurrentlyOffline(): boolean {
  if (typeof navigator === 'undefined') return false;
  return !navigator.onLine;
}
