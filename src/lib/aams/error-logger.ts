// أداة تسجيل ومراقبة الأخطاء محلياً في المتصفح (localStorage)
// تُستخدم لعرض الأخطاء وحالة الخادم في صفحة "سجل الأخطاء"

export type ErrorType =
  | 'api' // خطأ من الخادم (استجابة برمز خطأ مثل 500/400/403/404)
  | 'network' // خطأ شبكة (تعذر الوصول للخادم - الخادم متوقف أو انقطع الاتصال)
  | 'runtime' // خطأ في كود الصفحة (JavaScript)
  | 'unhandled' // خطأ غير معالَج (Promise rejection)
  | 'offline' // انقطع اتصال الإنترنت أو السيرفر
  | 'online'; // عاد اتصال الإنترنت أو السيرفر

export interface ErrorLogEntry {
  id: string;
  timestamp: string; // ISO
  type: ErrorType;
  message: string;
  url?: string;
  method?: string;
  status?: number;
  statusText?: string;
  responseData?: string;
  stack?: string;
}

export interface ServerHealthStatus {
  isOnline: boolean;
  latencyMs: number;
  lastChecked: string;
  statusText: string;
  error?: string;
}

const STORAGE_KEY = 'aams_error_log';
const MAX_ENTRIES = 500;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/** قراءة كل الأخطاء المسجلة (الأحدث أولاً) */
export function getErrors(): ErrorLogEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** تسجيل خطأ جديد */
export function logError(entry: Omit<ErrorLogEntry, 'id' | 'timestamp'>): void {
  if (!isBrowser()) return;
  try {
    const list = getErrors();
    const full: ErrorLogEntry = {
      id:
        Math.random().toString(36).slice(2, 8) +
        Date.now().toString(36),
      timestamp: new Date().toISOString(),
      ...entry
    };
    list.unshift(full);
    if (list.length > MAX_ENTRIES) list.length = MAX_ENTRIES;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

    // إشعار حي لأي صفحة أو مكوّن يستمع للتحديثات
    window.dispatchEvent(new CustomEvent('aams_error_logged', { detail: full }));
  } catch {
    // تجاهل أخطاء التخزين
  }
}

/** مسح كل الأخطاء */
export function clearErrors(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('aams_error_logged', { detail: null }));
  } catch {
    // تجاهل
  }
}

/** تحويل خطأ واحد إلى نص قابل للنسخ */
export function serializeErrorEntry(e: ErrorLogEntry): string {
  const parts: string[] = [
    `[${e.timestamp}]`,
    `النوع: ${e.type}`,
    `الرسالة: ${e.message}`
  ];
  if (e.url) parts.push(`المسار: ${e.method ? e.method + ' ' : ''}${e.url}`);
  if (e.status) parts.push(`الحالة: ${e.status}${e.statusText ? ' ' + e.statusText : ''}`);
  if (e.responseData) parts.push(`رد الخادم: ${e.responseData}`);
  if (e.stack) parts.push(`المكدس: ${e.stack}`);
  return parts.join(' || ');
}

/** تصدير كل الأخطاء كنص واحد للنسخ */
export function exportErrors(): string {
  return getErrors()
    .map((e) => serializeErrorEntry(e))
    .join('\n');
}

// حالة اتصال الخادم السابقة
let lastServerStatus: boolean | null = null;

/** فحص حالة اتصال الخادم وقياس زمن الاستجابة */
export async function checkServerHealth(): Promise<ServerHealthStatus> {
  const start = performance.now();
  const nowIso = new Date().toISOString();
  try {
    // نطلب رابط الفحص الصحي مع منع التخزين المؤقت
    const res = await fetch(`/api/v1/health?t=${Date.now()}`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(6000)
    });
    const latencyMs = Math.round(performance.now() - start);

    if (res.ok) {
      if (lastServerStatus === false) {
        // كان السيرفر مفصولاً والآن عاد للعمل
        logError({
          type: 'online',
          message: `تمت استعادة الاتصال بالخادم بنجاح (زمن الاستجابة: ${latencyMs}ms)`,
          status: res.status,
          statusText: 'Server Reconnected'
        });
      }
      lastServerStatus = true;
      return {
        isOnline: true,
        latencyMs,
        lastChecked: nowIso,
        statusText: 'متصل ويعمل بكفاءة'
      };
    } else {
      const errorText = `استجاب الخادم برمز خطأ ${res.status}`;
      if (lastServerStatus !== false) {
        logError({
          type: 'network',
          message: `مشكلة في استجابة الخادم: ${errorText}`,
          status: res.status,
          statusText: res.statusText
        });
      }
      lastServerStatus = false;
      return {
        isOnline: false,
        latencyMs,
        lastChecked: nowIso,
        statusText: errorText,
        error: errorText
      };
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    const errorMsg = err?.message || 'تعذر الوصول إلى الخادم (انقطع الاتصال أو السيرفر متوقف)';

    if (lastServerStatus !== false) {
      logError({
        type: 'network',
        message: `انقطع الاتصال بالخادم: ${errorMsg}`,
        statusText: 'Server Disconnected / Offline'
      });
    }
    lastServerStatus = false;

    return {
      isOnline: false,
      latencyMs,
      lastChecked: nowIso,
      statusText: 'الخادم غير متصل أو لا يستجيب',
      error: errorMsg
    };
  }
}

let initialized = false;

/**
 * تثبيت التقاط الأخطاء العامة في المتصفح مرة واحدة.
 * يلتقط: أخطاء التشغيل، الأخطاء غير المعالجة، وانقطاع/عودة الاتصال.
 */
export function initGlobalErrorCapture(): void {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  // أخطاء التشغيل (Runtime JS errors)
  window.addEventListener('error', (ev) => {
    logError({
      type: 'runtime',
      message: ev.message || 'خطأ غير معروف في الصفحة',
      url: ev.filename ? `${ev.filename}:${ev.lineno}:${ev.colno}` : undefined,
      stack: ev.error?.stack
    });
  });

  // الأخطاء غير المعالجة (Unhandled promise rejections)
  window.addEventListener('unhandledrejection', (ev) => {
    const reason = ev.reason as { message?: string; stack?: string } | string | undefined;
    const msg =
      (typeof reason === 'object' && reason?.message) ||
      (typeof reason === 'string' ? reason : 'خطأ غير معالج (Unhandled rejection)');
    logError({
      type: 'unhandled',
      message: msg,
      stack: typeof reason === 'object' ? reason?.stack : undefined
    });
  });

  // انقطاع / عودة الاتصال بالإنترنت
  window.addEventListener('offline', () => {
    logError({ type: 'offline', message: 'انقطع اتصال الإنترنت في المتصفح' });
  });
  window.addEventListener('online', () => {
    logError({ type: 'online', message: 'عاد اتصال الإنترنت في المتصفح' });
    checkServerHealth().catch(() => {});
  });

  // فحص أولي لاتصال الخادم
  checkServerHealth().catch(() => {});
}
