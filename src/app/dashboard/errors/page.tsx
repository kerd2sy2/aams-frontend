'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getErrors,
  clearErrors,
  exportErrors,
  serializeErrorEntry,
  checkServerHealth,
  logError,
  type ErrorLogEntry,
  type ErrorType,
  type ServerHealthStatus
} from '@/lib/aams/error-logger';
import { PageHeader } from '@/components/layout/page-header';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatRiyadh } from '@/lib/aams/riyadh-time';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Bug,
  Copy,
  Trash2,
  RefreshCw,
  WifiOff,
  Wifi,
  Server,
  ClipboardList,
  Activity,
  CheckCircle2,
  XCircle,
  Search,
  Zap,
  type LucideIcon,
} from 'lucide-react';

const TYPE_META: Record<
  ErrorType,
  { label: string; icon: LucideIcon; cls: string; iconCls: string }
> = {
  api: { label: 'خطأ خادم (API)', icon: Server, cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300', iconCls: 'text-rose-500' },
  network: { label: 'انقطاع السيرفر / شبكة', icon: WifiOff, cls: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300', iconCls: 'text-red-500' },
  runtime: { label: 'خطأ برمجي (JS)', icon: Bug, cls: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300', iconCls: 'text-violet-500' },
  unhandled: { label: 'خطأ غير معالج', icon: AlertCircle, cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', iconCls: 'text-slate-500' },
  offline: { label: 'انقطع الاتصال', icon: WifiOff, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300', iconCls: 'text-amber-500' },
  online: { label: 'عاد الاتصال', icon: Wifi, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300', iconCls: 'text-emerald-500' },
};

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function ErrorsPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<ErrorLogEntry[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filterTab, setFilterTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Live Server Health state
  const [serverHealth, setServerHealth] = useState<ServerHealthStatus | null>(null);
  const [checkingServer, setCheckingServer] = useState(false);

  const refreshErrors = useCallback(() => {
    setErrors(getErrors());
  }, []);

  const runServerHealthCheck = useCallback(async () => {
    setCheckingServer(true);
    try {
      const status = await checkServerHealth();
      setServerHealth(status);
    } catch {
      // Handled in checkServerHealth
    } finally {
      setCheckingServer(false);
    }
  }, []);

  // Initial load + event listeners for real-time updates
  useEffect(() => {
    refreshErrors();
    runServerHealthCheck();

    // Listen to real-time error logging events
    const handleNewError = () => {
      refreshErrors();
    };

    window.addEventListener('aams_error_logged', handleNewError);
    window.addEventListener('storage', handleNewError);

    // Periodic live health check every 12 seconds
    const interval = setInterval(() => {
      runServerHealthCheck();
    }, 12000);

    return () => {
      window.removeEventListener('aams_error_logged', handleNewError);
      window.removeEventListener('storage', handleNewError);
      clearInterval(interval);
    };
  }, [refreshErrors, runServerHealthCheck]);

  // Filtered errors
  const filteredErrors = useMemo(() => {
    return errors.filter((e) => {
      // Tab filter
      if (filterTab === 'API' && e.type !== 'api') return false;
      if (filterTab === 'NETWORK' && e.type !== 'network' && e.type !== 'offline' && e.type !== 'online') return false;
      if (filterTab === 'RUNTIME' && e.type !== 'runtime' && e.type !== 'unhandled') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.message?.toLowerCase().includes(q) ||
          e.url?.toLowerCase().includes(q) ||
          e.statusText?.toLowerCase().includes(q) ||
          String(e.status || '').includes(q) ||
          e.responseData?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [errors, filterTab, searchQuery]);

  const stats = useMemo(() => {
    const total = errors.length;
    const network = errors.filter((e) => e.type === 'network' || e.type === 'offline').length;
    const api = errors.filter((e) => e.type === 'api').length;
    const runtime = errors.filter((e) => e.type === 'runtime' || e.type === 'unhandled').length;
    const online = errors.filter((e) => e.type === 'online').length;
    return { total, network, api, runtime, online };
  }, [errors]);

  const [showRaw, setShowRaw] = useState(false);
  const rawText = useMemo(() => exportErrors(), [errors]);

  const handleCopyAll = async () => {
    const text = exportErrors();
    if (!text) {
      toast.warning('لا توجد أخطاء لنسخها');
      return;
    }
    const ok = await copyText(text);
    if (ok) {
      toast.success('تم نسخ كل الأخطاء');
    } else {
      toast.error('تعذر النسخ تلقائياً، انسخ يدوياً من الحقل أدناه');
      setShowRaw(true);
    }
  };

  const handleCopyOne = async (e: ErrorLogEntry) => {
    const ok = await copyText(serializeErrorEntry(e));
    if (ok) {
      toast.success('تم نسخ بيانات الخطأ');
    } else {
      toast.error('تعذر النسخ');
    }
  };

  const handleClear = () => {
    if (!confirm('هل أنت متأكد من مسح جميع سجلات الأخطاء؟')) return;
    clearErrors();
    setErrors([]);
    setExpanded({});
    toast.success('تم مسح سجل الأخطاء بالكامل');
  };

  return (
    <PageContainer>
      <div className="space-y-6" dir="rtl">
        <PageHeader
          category="الإدارة"
          title="سجل الأخطاء ومراقبة الخادم"
          description="متابعة حية لحالة اتصال السيرفر وتسجيل فوري لكافة أخطاء النظام والشبكة"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyAll} className="gap-1.5 font-semibold">
                <Copy className="size-4" />
                نسخ الكل
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={errors.length === 0}
                className="gap-1.5 font-semibold text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
                مسح السجل
              </Button>
            </div>
          }
        />

        {/* Live Server Connection Card */}
        <Card className={cn(
          'border shadow-sm transition-all',
          serverHealth?.isOnline === true
            ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-950 dark:bg-emerald-950/20'
            : serverHealth?.isOnline === false
              ? 'border-rose-300 bg-rose-50/60 dark:border-rose-950 dark:bg-rose-950/30 animate-pulse'
              : 'border-border bg-card'
        )}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className={cn(
                  'size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner',
                  serverHealth?.isOnline === true
                    ? 'bg-emerald-500 text-white'
                    : serverHealth?.isOnline === false
                      ? 'bg-rose-600 text-white'
                      : 'bg-muted text-muted-foreground'
                )}>
                  {serverHealth?.isOnline === true ? (
                    <CheckCircle2 className="size-6" />
                  ) : serverHealth?.isOnline === false ? (
                    <XCircle className="size-6" />
                  ) : (
                    <Activity className="size-6 animate-spin" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      حالة الاتصال بالخادم (Backend API)
                    </h3>
                    {serverHealth?.isOnline === true ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 gap-1 text-xs">
                        <span className="size-2 rounded-full bg-white animate-ping" />
                        السيرفر متصل وشغال
                      </Badge>
                    ) : serverHealth?.isOnline === false ? (
                      <Badge variant="destructive" className="gap-1 text-xs font-bold">
                        <span className="size-2 rounded-full bg-white animate-ping" />
                        السيرفر متوقف أو انقطع الاتصال
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">جارٍ الفحص...</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                    {serverHealth && (
                      <>
                        <span>زمن الاستجابة: <strong className="font-mono text-foreground">{serverHealth.latencyMs} ms</strong></span>
                        <span>•</span>
                        <span>آخر تحقق: <span className="font-mono">{formatRiyadh(serverHealth.lastChecked, 'hh:mm:ss a', { locale: ar })}</span></span>
                        {serverHealth.error && (
                          <>
                            <span>•</span>
                            <span className="text-rose-600 font-medium">{serverHealth.error}</span>
                          </>
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant={serverHealth?.isOnline ? 'outline' : 'default'}
                  onClick={runServerHealthCheck}
                  disabled={checkingServer}
                  className={cn('gap-2', !serverHealth?.isOnline && 'bg-rose-600 hover:bg-rose-700 text-white')}
                >
                  <Activity className={cn('size-4', checkingServer && 'animate-spin')} />
                  {checkingServer ? 'جارٍ الفحص...' : 'فحص الاتصال الآن'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
                <ClipboardList className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-black tabular-nums">{stats.total}</p>
                <p className="text-xs text-muted-foreground">إجمالي السجلات</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
                <Server className="size-5 text-rose-500" />
              </div>
              <div>
                <p className="text-2xl font-black tabular-nums text-rose-600 dark:text-rose-400">{stats.api}</p>
                <p className="text-xs text-muted-foreground">أخطاء خادم (API)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center">
                <WifiOff className="size-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-black tabular-nums text-red-600 dark:text-red-400">{stats.network}</p>
                <p className="text-xs text-muted-foreground">انقطاع السيرفر / شبكة</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center">
                <Bug className="size-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-black tabular-nums text-violet-600 dark:text-violet-400">{stats.runtime}</p>
                <p className="text-xs text-muted-foreground">أخطاء برمجية</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <Tabs value={filterTab} onValueChange={setFilterTab} className="w-full md:w-auto">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="ALL">الكل ({stats.total})</TabsTrigger>
              <TabsTrigger value="NETWORK">انقطاع السيرفر والشبكة ({stats.network})</TabsTrigger>
              <TabsTrigger value="API">أخطاء الخادم ({stats.api})</TabsTrigger>
              <TabsTrigger value="RUNTIME">أخطاء التشغيل ({stats.runtime})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full md:w-72">
            <Search className="absolute right-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="بحث في الرسالة، المسار، الكود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
          </div>
        </div>

        {/* Fallback raw box */}
        {showRaw && rawText && (
          <Card className="border-border">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-semibold">انسخ النص التالي يدوياً:</p>
              <textarea
                readOnly
                value={rawText}
                onFocus={(e) => e.currentTarget.select()}
                dir="ltr"
                className="w-full h-40 font-mono text-xs bg-muted rounded-xl p-3 border border-border focus:outline-none"
              />
            </CardContent>
          </Card>
        )}

        {/* Errors list */}
        {filteredErrors.length === 0 ? (
          <Card className="text-center py-16 border-dashed border-2 border-border/60">
            <CardContent className="flex flex-col items-center">
              <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <AlertCircle className="size-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold">لا توجد أخطاء مسجلة حالياً</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
                {searchQuery || filterTab !== 'ALL'
                  ? 'لا توجد نتائج مطابقة لخيارات التصفية المحددة.'
                  : 'عند حدوث أي خطأ في الخادم أو انقطاع في الاتصال سيتم رصده وعرضه هنا لحظياً.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredErrors.map((e) => {
              const meta = TYPE_META[e.type] || TYPE_META.runtime;
              const Icon = meta.icon;
              const isExpanded = !!expanded[e.id];
              return (
                <Card key={e.id} className="border-border overflow-hidden shadow-xs hover:border-border/80 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner', meta.cls)}>
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={cn('text-xs font-bold px-2 py-0.5 border', meta.cls)}>
                            {meta.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatRiyadh(e.timestamp, 'yyyy/MM/dd - hh:mm:ss a', { locale: ar })}
                          </span>
                        </div>
                        <p className="text-sm font-semibold mt-2 break-words text-slate-900 dark:text-slate-100">{e.message}</p>
                        {e.url && (
                          <p className="text-xs text-muted-foreground font-mono mt-1 text-left dir-ltr break-all bg-muted/40 p-1.5 rounded-md border">
                            {e.method ? `${e.method} ` : ''}
                            {e.url}
                            {e.status ? ` — [Status: ${e.status}${e.statusText ? ' ' + e.statusText : ''}]` : ''}
                          </p>
                        )}
                        {(e.responseData || e.stack) && (
                          <button
                            onClick={() => setExpanded((p) => ({ ...p, [e.id]: !isExpanded }))}
                            className="text-xs text-primary font-medium mt-2 hover:underline cursor-pointer flex items-center gap-1"
                          >
                            {isExpanded ? 'إخفاء التفاصيل والاستجابة' : 'عرض تفاصيل الاستجابة والمكدس'}
                          </button>
                        )}
                        {isExpanded && (
                          <div className="mt-2.5 space-y-2">
                            {e.responseData && (
                              <div>
                                <p className="text-[11px] font-semibold text-muted-foreground mb-1">رد الخادم (Server Response):</p>
                                <pre dir="ltr" className="text-left text-[11px] font-mono bg-slate-950 text-slate-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto border">
                                  {e.responseData}
                                </pre>
                              </div>
                            )}
                            {e.stack && (
                              <div>
                                <p className="text-[11px] font-semibold text-muted-foreground mb-1">مكدس الخطأ (Stack Trace):</p>
                                <pre dir="ltr" className="text-left text-[11px] font-mono bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-40 overflow-y-auto border">
                                  {e.stack}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyOne(e)}
                        className="gap-1.5 shrink-0"
                        title="نسخ بيانات الخطأ"
                      >
                        <Copy className="size-4" />
                        <span className="hidden sm:inline">نسخ</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

