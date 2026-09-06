'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { targetWebApi } from '@/lib/aams/target-api';
import {
  TargetDashboardSummary,
  IdentifierPerformance,
  IdentifierDetails,
  DriverPerformance,
  TargetAlertItem,
  ImportBatchItem,
  TargetSettings
} from '@/types/target';
import {
  Target,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Users,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  Settings,
  Upload,
  Calendar,
  Search,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';

export default function TargetDashboardPage() {
  // Current Month State (e.g. "2026-09")
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${m}`;
  });

  // Main Tab State
  const [activeTab, setActiveTab] = useState<'identifiers' | 'drivers' | 'alerts' | 'sheets'>(
    'identifiers'
  );
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'TARGET_ACHIEVED' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND_TARGET'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<TargetDashboardSummary | null>(null);
  const [identifiers, setIdentifiers] = useState<IdentifierPerformance[]>([]);
  const [drivers, setDrivers] = useState<DriverPerformance[]>([]);
  const [alerts, setAlerts] = useState<TargetAlertItem[]>([]);
  const [batches, setBatches] = useState<ImportBatchItem[]>([]);

  // Dialogs
  const [selectedIdentifierId, setSelectedIdentifierId] = useState<string | null>(null);
  const [identifierDetails, setIdentifierDetails] = useState<IdentifierDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Settings Dialog
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<TargetSettings>({
    default_monthly_target: 460,
    default_daily_target: 17
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Sheet Delete Confirmation
  const [batchToDelete, setBatchToDelete] = useState<ImportBatchItem | null>(null);
  const [deletingBatch, setDeletingBatch] = useState(false);

  // Load All Dashboard Data
  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [sumRes, identsRes, driversRes, alertsRes, batchesRes] = await Promise.all([
          targetWebApi.getDashboard(selectedMonth).catch(() => null),
          targetWebApi.listIdentifiers({ month: selectedMonth }).catch(() => []),
          targetWebApi.listDrivers({ month: selectedMonth }).catch(() => []),
          targetWebApi.listAlerts().catch(() => []),
          targetWebApi.listBatches().catch(() => [])
        ]);

        if (sumRes) setSummary(sumRes);
        setIdentifiers(Array.isArray(identsRes) ? identsRes : []);
        setDrivers(Array.isArray(driversRes) ? driversRes : []);
        setAlerts(Array.isArray(alertsRes) ? alertsRes : []);
        setBatches(Array.isArray(batchesRes) ? batchesRes : []);
      } catch (err: any) {
        toast.error('تعذر تحميل بيانات التارچت: ' + (err?.message || 'خطأ في الاتصال'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedMonth]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Details Modal
  const handleOpenDetails = async (id: string) => {
    setSelectedIdentifierId(id);
    setLoadingDetails(true);
    try {
      const data = await targetWebApi.getIdentifierDetails(id, selectedMonth);
      setIdentifierDetails(data);
    } catch (err: any) {
      toast.error('فشل في جلب تفاصيل المعرف');
      setSelectedIdentifierId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open Settings Modal
  const handleOpenSettings = async () => {
    setSettingsOpen(true);
    try {
      const data = await targetWebApi.getTargetSettings();
      if (data) setSettings(data);
    } catch (err) {
      // Keep defaults
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await targetWebApi.updateTargetSettings(settings);
      toast.success('تم تحديث إعدادات التارچت الافتراضية بنجاح');
      setSettingsOpen(false);
      loadData(true);
    } catch (err: any) {
      toast.error('فشل في تحديث الإعدادات');
    } finally {
      setSavingSettings(false);
    }
  };

  // Resolve Alert
  const handleResolveAlert = async (alertId: string) => {
    try {
      await targetWebApi.resolveAlert(alertId);
      toast.success('تم تسوية التنبيه بنجاح');
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, is_resolved: true } : a)));
    } catch (err: any) {
      toast.error('فشل في تسوية التنبيه');
    }
  };

  // Confirm Delete Sheet / Batch
  const handleConfirmDeleteSheet = async () => {
    if (!batchToDelete) return;
    setDeletingBatch(true);
    try {
      // Use deleteBatch or deleteSheetByDate
      if (batchToDelete.order_date) {
        await targetWebApi.deleteSheetByDate(batchToDelete.order_date);
      } else {
        await targetWebApi.deleteBatch(batchToDelete.id);
      }

      toast.success(
        `تم حذف شيت تاريخ ${batchToDelete.order_date || batchToDelete.file_name} وجميع طلباته بنجاح!`
      );
      setBatchToDelete(null);
      // Reload entire dashboard
      await loadData(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'فشل في حذف الشيت';
      toast.error(msg);
    } finally {
      setDeletingBatch(false);
    }
  };

  // Month navigation
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m - 2, 1);
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${date.getFullYear()}-${newM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m, 1);
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${date.getFullYear()}-${newM}`);
  };

  // Filtered Identifiers
  const filteredIdentifiers = useMemo(() => {
    return identifiers.filter((item) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'TARGET_ACHIEVED' && item.status !== 'TARGET_ACHIEVED') return false;
        if (statusFilter === 'ON_TRACK' && item.status !== 'ON_TRACK') return false;
        if (
          statusFilter === 'AT_RISK' &&
          item.status !== 'AT_RISK' &&
          item.status !== 'BEHIND_TARGET'
        )
          return false;
        if (
          statusFilter === 'BEHIND_TARGET' &&
          item.status !== 'BEHIND_TARGET' &&
          item.status !== 'AT_RISK'
        )
          return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name?.toLowerCase().includes(q);
        const matchCode = item.code?.toLowerCase().includes(q);
        return Boolean(matchName || matchCode);
      }
      return true;
    });
  }, [identifiers, statusFilter, searchQuery]);

  // Filtered Drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return item.name?.toLowerCase().includes(q) || item.phone?.includes(q);
      }
      return true;
    });
  }, [drivers, searchQuery]);

  // Filtered Alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return item.identifier_name?.toLowerCase().includes(q) || item.alert_date?.includes(q);
      }
      return true;
    });
  }, [alerts, searchQuery]);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          b.order_date?.includes(q) ||
          b.file_name?.toLowerCase().includes(q) ||
          b.uploaded_by_name?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [batches, searchQuery]);

  // KPI Calculations
  const totalIdents = summary?.total_identifiers ?? identifiers.length;
  const achievedCount =
    summary?.target_achieved ?? identifiers.filter((i) => i.status === 'TARGET_ACHIEVED').length;
  const onTrackCount =
    summary?.on_track ?? identifiers.filter((i) => i.status === 'ON_TRACK').length;
  const behindCount =
    (summary?.behind_target ?? 0) + (summary?.at_risk ?? 0) ||
    identifiers.filter((i) => i.status === 'AT_RISK' || i.status === 'BEHIND_TARGET').length;
  const totalOrders =
    summary?.total_month_orders ?? identifiers.reduce((acc, i) => acc + (i.month_orders || 0), 0);
  const totalTargetGoal = totalIdents * (settings.default_monthly_target || 460);
  const overallProgress =
    totalTargetGoal > 0 ? Math.min(Math.round((totalOrders / totalTargetGoal) * 100), 100) : 0;
  const unresolvedAlertsCount = alerts.filter((a) => !a.is_resolved).length;

  return (
    <PageContainer>
      <div className='space-y-6 max-w-7xl mx-auto pb-16 text-right' dir='rtl'>
        {/* Top Header Bar */}
        <div className='flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b pb-4'>
          <div>
            <div className='flex items-center gap-3'>
              <div className='p-2.5 bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl'>
                <Target className='h-7 w-7' />
              </div>
              <div>
                <h1 className='text-2xl font-black tracking-tight text-foreground'>
                  لوحة متابعة وإنجاز التارچت (Target Dashboard)
                </h1>
                <p className='text-sm text-muted-foreground mt-0.5'>
                  متابعة مؤشرات الأداء اللوجستي للمعرفين والمناديب وإدارة تقارير الشيتات اليومية
                </p>
              </div>
            </div>
          </div>

          {/* Actions & Month Selector */}
          <div className='flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end'>
            {/* Month Picker Controls */}
            <div className='flex items-center bg-muted/60 dark:bg-muted/30 border rounded-lg p-1 gap-1'>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8'
                onClick={handlePrevMonth}
                title='الشهر السابق'
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
              <div className='flex items-center gap-1 px-2 font-mono font-bold text-sm'>
                <Calendar className='h-3.5 w-3.5 text-muted-foreground' />
                <span>{selectedMonth}</span>
              </div>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8'
                onClick={handleNextMonth}
                title='الشهر التالي'
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
            </div>

            {/* Refresh Button */}
            <Button
              variant='outline'
              size='sm'
              onClick={() => loadData(true)}
              disabled={refreshing}
              className='gap-2'
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin text-orange-500' : ''}`}
              />
              <span className='hidden sm:inline'>تحديث</span>
            </Button>

            {/* Target Settings */}
            <Button variant='outline' size='sm' onClick={handleOpenSettings} className='gap-2'>
              <Settings className='h-4 w-4 text-muted-foreground' />
              <span className='hidden sm:inline'>إعدادات التارچت</span>
            </Button>

            {/* Import Excel Link Button */}
            <Link href='/dashboard/target/import'>
              <Button
                size='sm'
                className='gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-sm'
              >
                <Upload className='h-4 w-4' />
                <span>استيراد ملف إكسل</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 1. KPI Summary Cards (Interactive - Matching Phone Experience) */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          {/* Total Identifiers Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md border-2 ${
              activeTab === 'identifiers' && statusFilter === 'ALL'
                ? 'border-orange-500/80 bg-orange-500/5'
                : 'hover:border-orange-200 dark:hover:border-orange-900'
            }`}
            onClick={() => {
              setActiveTab('identifiers');
              setStatusFilter('ALL');
            }}
          >
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div className='p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg'>
                  <Users className='h-5 w-5' />
                </div>
                <Badge variant='outline' className='font-mono text-xs'>
                  معرف
                </Badge>
              </div>
              <div className='mt-3'>
                <div className='text-2xl font-black text-foreground'>{totalIdents}</div>
                <div className='text-xs font-semibold text-muted-foreground mt-0.5'>
                  إجمالي المعرفين
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Target Achieved Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md border-2 ${
              activeTab === 'identifiers' && statusFilter === 'TARGET_ACHIEVED'
                ? 'border-emerald-500 bg-emerald-500/5'
                : 'hover:border-emerald-200 dark:hover:border-emerald-900'
            }`}
            onClick={() => {
              setActiveTab('identifiers');
              setStatusFilter('TARGET_ACHIEVED');
            }}
          >
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div className='p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg'>
                  <CheckCircle2 className='h-5 w-5' />
                </div>
                <Badge className='bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs'>
                  حقق التارچت
                </Badge>
              </div>
              <div className='mt-3'>
                <div className='text-2xl font-black text-emerald-600 dark:text-emerald-400'>
                  {achievedCount}
                </div>
                <div className='text-xs font-semibold text-muted-foreground mt-0.5'>
                  حققوا التارچت الشهري
                </div>
              </div>
            </CardContent>
          </Card>

          {/* On Track Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md border-2 ${
              activeTab === 'identifiers' && statusFilter === 'ON_TRACK'
                ? 'border-sky-500 bg-sky-500/5'
                : 'hover:border-sky-200 dark:hover:border-sky-900'
            }`}
            onClick={() => {
              setActiveTab('identifiers');
              setStatusFilter('ON_TRACK');
            }}
          >
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div className='p-2 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-lg'>
                  <TrendingUp className='h-5 w-5' />
                </div>
                <Badge className='bg-sky-600 hover:bg-sky-700 text-white font-mono text-xs'>
                  يسير بالمعدل
                </Badge>
              </div>
              <div className='mt-3'>
                <div className='text-2xl font-black text-sky-600 dark:text-sky-400'>
                  {onTrackCount}
                </div>
                <div className='text-xs font-semibold text-muted-foreground mt-0.5'>
                  يسير بالمعدل الطبيعي
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Behind / At Risk Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md border-2 ${
              activeTab === 'identifiers' &&
              (statusFilter === 'AT_RISK' || statusFilter === 'BEHIND_TARGET')
                ? 'border-rose-500 bg-rose-500/5'
                : 'hover:border-rose-200 dark:hover:border-rose-900'
            }`}
            onClick={() => {
              setActiveTab('identifiers');
              setStatusFilter('AT_RISK');
            }}
          >
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div className='p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg'>
                  <AlertTriangle className='h-5 w-5' />
                </div>
                <Badge variant='destructive' className='font-mono text-xs'>
                  في خطر / متأخر
                </Badge>
              </div>
              <div className='mt-3'>
                <div className='text-2xl font-black text-rose-600 dark:text-rose-400'>
                  {behindCount}
                </div>
                <div className='text-xs font-semibold text-muted-foreground mt-0.5'>
                  متأخر عن المعدل
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2. Secondary Progress & Goal Card */}
        <Card className='border shadow-sm bg-gradient-to-l from-orange-500/5 via-card to-card'>
          <CardContent className='p-5'>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-6 items-center'>
              <div className='md:col-span-2 space-y-2'>
                <div className='flex justify-between items-center text-sm'>
                  <span className='font-bold flex items-center gap-1.5 text-foreground'>
                    <Target className='h-4 w-4 text-orange-500' />
                    نسبة إنجاز التارچت الشهري العام
                  </span>
                  <span className='font-black font-mono text-orange-600 text-base'>
                    {overallProgress}%
                  </span>
                </div>
                <Progress value={overallProgress} className='h-3 bg-muted' />
                <div className='flex justify-between text-xs text-muted-foreground font-mono'>
                  <span>المحقق: {totalOrders.toLocaleString()} طلب</span>
                  <span>المستهدف العام: {totalTargetGoal.toLocaleString()} طلب</span>
                </div>
              </div>

              <div className='border-r pr-6 space-y-1'>
                <div className='text-xs text-muted-foreground font-medium'>إجمالي طلبات الشهر</div>
                <div className='text-xl font-black text-foreground font-mono'>
                  {totalOrders.toLocaleString()}
                  <span className='text-xs font-normal text-muted-foreground mr-1'>طلب</span>
                </div>
                <div className='text-xs text-muted-foreground'>المسجل خلال شهر {selectedMonth}</div>
              </div>

              <div className='border-r pr-6 space-y-1'>
                <div className='text-xs text-muted-foreground font-medium'>
                  تنبيهات العجز غير المسواة
                </div>
                <div className='text-xl font-black text-rose-600 font-mono'>
                  {unresolvedAlertsCount}
                  <span className='text-xs font-normal text-muted-foreground mr-1'>تنبيه</span>
                </div>
                <Button
                  variant='link'
                  size='sm'
                  onClick={() => setActiveTab('alerts')}
                  className='p-0 h-auto text-xs text-orange-600'
                >
                  معاينة التنبيهات وإجراء التسوية ←
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Main Tabs (Identifiers, Drivers, Alerts, Sheets & Delete) */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className='w-full'>
          <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-3'>
            <TabsList className='bg-muted/80 p-1 h-auto grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto'>
              <TabsTrigger value='identifiers' className='gap-2 py-2'>
                <Users className='h-4 w-4' />
                <span>المعرفين ({identifiers.length})</span>
              </TabsTrigger>
              <TabsTrigger value='drivers' className='gap-2 py-2'>
                <TrendingUp className='h-4 w-4' />
                <span>المناديب والطلبات ({drivers.length})</span>
              </TabsTrigger>
              <TabsTrigger value='alerts' className='gap-2 py-2'>
                <AlertTriangle className='h-4 w-4' />
                <span>تنبيهات العجز ({alerts.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value='sheets'
                className='gap-2 py-2 font-bold text-orange-600 dark:text-orange-400'
              >
                <FileSpreadsheet className='h-4 w-4' />
                <span>سجل الشيتات وحذفها ({batches.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* Quick Search */}
            <div className='relative w-full sm:w-72'>
              <Search className='absolute right-3 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='بحث بالاسم، الكود، أو التاريخ...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pr-9 text-xs h-9'
              />
            </div>
          </div>

          {/* TAB 1: IDENTIFIERS (المعرفين) */}
          <TabsContent value='identifiers' className='mt-4 space-y-4'>
            {/* Status Filter Chips */}
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-xs font-bold text-muted-foreground ml-2'>تصفية الحالة:</span>
              <Button
                size='sm'
                variant={statusFilter === 'ALL' ? 'default' : 'outline'}
                className={`h-7 text-xs ${statusFilter === 'ALL' ? 'bg-orange-600 text-white' : ''}`}
                onClick={() => setStatusFilter('ALL')}
              >
                الكل ({identifiers.length})
              </Button>
              <Button
                size='sm'
                variant={statusFilter === 'TARGET_ACHIEVED' ? 'default' : 'outline'}
                className={`h-7 text-xs ${statusFilter === 'TARGET_ACHIEVED' ? 'bg-emerald-600 text-white' : ''}`}
                onClick={() => setStatusFilter('TARGET_ACHIEVED')}
              >
                حقق التارچت ({achievedCount})
              </Button>
              <Button
                size='sm'
                variant={statusFilter === 'ON_TRACK' ? 'default' : 'outline'}
                className={`h-7 text-xs ${statusFilter === 'ON_TRACK' ? 'bg-sky-600 text-white' : ''}`}
                onClick={() => setStatusFilter('ON_TRACK')}
              >
                يسير بالمعدل ({onTrackCount})
              </Button>
              <Button
                size='sm'
                variant={statusFilter === 'AT_RISK' ? 'default' : 'outline'}
                className={`h-7 text-xs ${statusFilter === 'AT_RISK' ? 'bg-rose-600 text-white' : ''}`}
                onClick={() => setStatusFilter('AT_RISK')}
              >
                متأخر / في خطر ({behindCount})
              </Button>
            </div>

            {/* Identifiers Table */}
            <div className='rounded-xl border bg-card overflow-hidden shadow-sm'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/40'>
                    <TableHead className='text-right font-bold'>المعرف</TableHead>
                    <TableHead className='text-right font-bold'>الكود</TableHead>
                    <TableHead className='text-right font-bold'>التارچت الشهري</TableHead>
                    <TableHead className='text-right font-bold'>المحقق الفعلي</TableHead>
                    <TableHead className='text-right font-bold'>المتبقي</TableHead>
                    <TableHead className='text-right font-bold'>نسبة الإنجاز</TableHead>
                    <TableHead className='text-right font-bold'>الحالة</TableHead>
                    <TableHead className='text-center font-bold'>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className='text-center py-10'>
                        <RefreshCw className='h-6 w-6 animate-spin mx-auto text-orange-500' />
                        <div className='text-xs text-muted-foreground mt-2'>
                          جاري تحميل بيانات المعرفين...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredIdentifiers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className='text-center py-10 text-muted-foreground'>
                        لا توجد بيانات معرفين تطابق معايير البحث
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIdentifiers.map((item) => {
                      const remaining = Math.max(
                        (item.monthly_target || 460) - (item.month_orders || 0),
                        0
                      );
                      const isAchieved = item.status === 'TARGET_ACHIEVED';
                      const isOnTrack = item.status === 'ON_TRACK';

                      return (
                        <TableRow key={item.id} className='hover:bg-muted/30'>
                          <TableCell className='font-bold text-foreground'>
                            <div className='flex items-center gap-2'>
                              <span>{item.name}</span>
                              {item.app_name ? (
                                <Badge
                                  variant='outline'
                                  className='text-[10px] px-1.5 py-0 border-orange-300 bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
                                >
                                  {item.app_name}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className='font-mono text-xs text-muted-foreground'>
                            {item.code || '—'}
                          </TableCell>
                          <TableCell className='font-mono font-bold text-foreground'>
                            {item.monthly_target || 460}
                          </TableCell>
                          <TableCell className='font-mono font-bold text-orange-600'>
                            {item.month_orders || 0}
                          </TableCell>
                          <TableCell className='font-mono text-muted-foreground'>
                            {remaining === 0 ? (
                              <span className='text-emerald-600 font-bold'>اكتمل ✓</span>
                            ) : (
                              `${remaining} طلب`
                            )}
                          </TableCell>
                          <TableCell className='min-w-[140px]'>
                            <div className='flex items-center gap-2'>
                              <Progress
                                value={Math.min(item.achievement_percent || 0, 100)}
                                className='h-2 flex-1'
                              />
                              <span className='text-xs font-mono font-bold'>
                                {item.achievement_percent || 0}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isAchieved ? (
                              <Badge className='bg-emerald-600 text-white font-mono text-xs'>
                                حقق التارچت
                              </Badge>
                            ) : isOnTrack ? (
                              <Badge className='bg-sky-600 text-white font-mono text-xs'>
                                يسير بالمعدل
                              </Badge>
                            ) : (
                              <Badge variant='destructive' className='font-mono text-xs'>
                                متأخر
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className='text-center'>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleOpenDetails(item.id)}
                              className='h-8 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                            >
                              عرض التفاصيل
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* TAB 2: DRIVERS (المناديب) */}
          <TabsContent value='drivers' className='mt-4 space-y-4'>
            <div className='rounded-xl border bg-card overflow-hidden shadow-sm'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/40'>
                    <TableHead className='text-right font-bold'>اسم المندوب</TableHead>
                    <TableHead className='text-right font-bold'>رقم الجوال</TableHead>
                    <TableHead className='text-right font-bold'>إجمالي طلبات الشهر</TableHead>
                    <TableHead className='text-right font-bold'>طلبات اليوم</TableHead>
                    <TableHead className='text-right font-bold'>التطبيقات المسجل بها</TableHead>
                    <TableHead className='text-right font-bold'>المعرفين التابع لهم</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className='text-center py-10'>
                        <RefreshCw className='h-6 w-6 animate-spin mx-auto text-orange-500' />
                        <div className='text-xs text-muted-foreground mt-2'>
                          جاري تحميل بيانات المناديب...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredDrivers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className='text-center py-10 text-muted-foreground'>
                        لا توجد بيانات مناديب مسجلة في هذا الشهر
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDrivers.map((driver) => (
                      <TableRow key={driver.id} className='hover:bg-muted/30'>
                        <TableCell className='font-bold text-foreground'>{driver.name}</TableCell>
                        <TableCell className='font-mono text-xs text-muted-foreground'>
                          {driver.phone || '—'}
                        </TableCell>
                        <TableCell className='font-mono font-bold text-orange-600'>
                          {driver.month_orders || 0}
                        </TableCell>
                        <TableCell className='font-mono font-bold text-emerald-600'>
                          {driver.today_orders || 0}
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-wrap gap-1'>
                            {(driver.apps || []).map((app, idx) => (
                              <Badge
                                key={idx}
                                variant='outline'
                                className='text-[11px] bg-muted/30'
                              >
                                {app}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-wrap gap-1'>
                            {(driver.identifiers || []).map((ident, idx) => (
                              <Badge key={idx} variant='secondary' className='text-[11px]'>
                                {ident}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* TAB 3: ALERTS (تنبيهات العجز) */}
          <TabsContent value='alerts' className='mt-4 space-y-4'>
            <div className='rounded-xl border bg-card overflow-hidden shadow-sm'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/40'>
                    <TableHead className='text-right font-bold'>المعرف</TableHead>
                    <TableHead className='text-right font-bold'>تاريخ التنبيه</TableHead>
                    <TableHead className='text-right font-bold'>المستهدف اليومي</TableHead>
                    <TableHead className='text-right font-bold'>المحقق الفعلي</TableHead>
                    <TableHead className='text-right font-bold'>العجز</TableHead>
                    <TableHead className='text-right font-bold'>الحالة</TableHead>
                    <TableHead className='text-center font-bold'>إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className='text-center py-10'>
                        <RefreshCw className='h-6 w-6 animate-spin mx-auto text-orange-500' />
                        <div className='text-xs text-muted-foreground mt-2'>
                          جاري تحميل التنبيهات...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredAlerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className='text-center py-10 text-muted-foreground'>
                        لا توجد تنبيهات عجز مسجلة حالياً
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <TableRow key={alert.id} className='hover:bg-muted/30'>
                        <TableCell className='font-bold text-foreground'>
                          {alert.identifier_name}
                        </TableCell>
                        <TableCell className='font-mono text-xs text-muted-foreground'>
                          {alert.alert_date}
                        </TableCell>
                        <TableCell className='font-mono font-semibold'>
                          {alert.target_orders || 17} طلب
                        </TableCell>
                        <TableCell className='font-mono font-bold text-orange-600'>
                          {alert.actual_orders} طلب
                        </TableCell>
                        <TableCell className='font-mono font-bold text-rose-600'>
                          -{alert.deficit} طلب
                        </TableCell>
                        <TableCell>
                          {alert.is_resolved ? (
                            <Badge className='bg-emerald-600 text-white font-mono text-xs'>
                              تمت التسوية ✓
                            </Badge>
                          ) : (
                            <Badge variant='destructive' className='font-mono text-xs'>
                              عجز غير مسوى
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className='text-center'>
                          {!alert.is_resolved && (
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleResolveAlert(alert.id)}
                              className='h-7 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50'
                            >
                              تسوية التنبيه
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* TAB 4: SHEETS & DELETION (سجل الشيتات وحذفها) */}
          <TabsContent value='sheets' className='mt-4 space-y-4'>
            <Card className='border border-orange-200 dark:border-orange-900/50 bg-orange-500/5 shadow-sm'>
              <CardContent className='p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
                <div className='flex items-center gap-3'>
                  <div className='p-2 bg-orange-500 text-white rounded-lg'>
                    <Info className='h-5 w-5' />
                  </div>
                  <div>
                    <h3 className='font-bold text-foreground text-sm'>
                      إدارة وحذف الشيتات اليومية المرفوعة
                    </h3>
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      في حال وجود أي خطأ في ملف إكسل تم رفعه ليوم معين، يمكنك حذف شيت ذلك اليوم من
                      هنا وسيقوم النظام تلقائياً بمسح طلباته وإعادة حساب نسب التارچت فوراً.
                    </p>
                  </div>
                </div>

                <Link href='/dashboard/target/import'>
                  <Button
                    size='sm'
                    className='gap-2 bg-orange-600 hover:bg-orange-700 text-white shrink-0'
                  >
                    <Upload className='h-4 w-4' />
                    <span>رفع شيت جديد</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Sheets Table */}
            <div className='rounded-xl border bg-card overflow-hidden shadow-sm'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/40'>
                    <TableHead className='text-right font-bold'>تاريخ الشيت (اليوم)</TableHead>
                    <TableHead className='text-right font-bold'>اسم الملف</TableHead>
                    <TableHead className='text-right font-bold'>إجمالي الطلبات</TableHead>
                    <TableHead className='text-right font-bold'>عدد المعرفين</TableHead>
                    <TableHead className='text-right font-bold'>عدد المناديب</TableHead>
                    <TableHead className='text-right font-bold'>مَن قام بالرفع</TableHead>
                    <TableHead className='text-right font-bold'>وقت وتاريخ الرفع</TableHead>
                    <TableHead className='text-center font-bold text-rose-600'>حذف الشيت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className='text-center py-10'>
                        <RefreshCw className='h-6 w-6 animate-spin mx-auto text-orange-500' />
                        <div className='text-xs text-muted-foreground mt-2'>
                          جاري تحميل سجل الشيتات...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredBatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className='text-center py-10 text-muted-foreground'>
                        لا توجد شيتات مرفوعة مسجلة حالياً
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBatches.map((batch) => {
                      const createdDate = batch.created_at
                        ? new Date(batch.created_at).toLocaleString('ar-EG', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })
                        : '—';

                      return (
                        <TableRow key={batch.id} className='hover:bg-muted/30'>
                          <TableCell className='font-mono font-bold text-foreground text-sm'>
                            <span className='inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-md'>
                              <Calendar className='h-3.5 w-3.5' />
                              {batch.order_date || 'غير محدد'}
                            </span>
                          </TableCell>
                          <TableCell className='font-medium text-xs font-mono text-foreground'>
                            {batch.file_name}
                          </TableCell>
                          <TableCell className='font-mono font-bold text-orange-600 text-sm'>
                            {batch.total_orders?.toLocaleString() || 0} طلب
                          </TableCell>
                          <TableCell className='font-mono text-muted-foreground text-xs'>
                            {batch.identifiers_count || 0} معرف
                          </TableCell>
                          <TableCell className='font-mono text-muted-foreground text-xs'>
                            {batch.drivers_count || 0} مندوب
                          </TableCell>
                          <TableCell className='text-xs text-muted-foreground'>
                            {batch.uploaded_by_name || 'الأدمن'}
                          </TableCell>
                          <TableCell className='font-mono text-xs text-muted-foreground'>
                            {createdDate}
                          </TableCell>
                          <TableCell className='text-center'>
                            <Button
                              variant='destructive'
                              size='sm'
                              onClick={() => setBatchToDelete(batch)}
                              className='h-8 px-3 gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs shadow-xs'
                            >
                              <Trash2 className='h-3.5 w-3.5' />
                              <span>حذف شيت اليوم</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* 4. Delete Confirmation Dialog */}
        <AlertDialog
          open={Boolean(batchToDelete)}
          onOpenChange={(open) => !open && setBatchToDelete(null)}
        >
          <AlertDialogContent className='text-right' dir='rtl'>
            <AlertDialogHeader>
              <AlertDialogTitle className='text-rose-600 flex items-center gap-2 text-lg font-black'>
                <Trash2 className='h-5 w-5 text-rose-600' />
                تأكيد حذف شيت يوم ({batchToDelete?.order_date})
              </AlertDialogTitle>
              <AlertDialogDescription className='text-sm text-muted-foreground mt-2 leading-relaxed'>
                أنت على وشك حذف ملف الشيت:{' '}
                <strong className='font-mono text-foreground'>{batchToDelete?.file_name}</strong>{' '}
                الخاص بتاريخ{' '}
                <strong className='font-mono text-foreground'>{batchToDelete?.order_date}</strong>.
                <br />
                <br />
                ⚠️ <strong className='text-rose-600'>تحذير مهم:</strong> سيؤدي الحذف إلى إزالة جميع
                طلبات هذا اليوم (
                <strong className='font-mono text-foreground'>
                  {batchToDelete?.total_orders} طلب
                </strong>
                ) بالكامل من قاعدة البيانات، وحذف تنبيهات العجز التابعة له، وإعادة احتساب معدلات
                التارچت فوراً.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className='flex-row-reverse gap-2 mt-4'>
              <AlertDialogCancel disabled={deletingBatch}>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmDeleteSheet();
                }}
                disabled={deletingBatch}
                className='bg-rose-600 hover:bg-rose-700 text-white font-bold'
              >
                {deletingBatch ? 'جاري الحذف...' : 'نعم، احذف شيت هذا اليوم'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 5. Identifier Details Modal */}
        <Dialog
          open={Boolean(selectedIdentifierId)}
          onOpenChange={(open) => !open && setSelectedIdentifierId(null)}
        >
          <DialogContent className='max-w-2xl text-right' dir='rtl'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-lg font-black'>
                <Users className='h-5 w-5 text-orange-500' />
                تفاصيل إنجاز المعرف: {identifierDetails?.performance?.name}
              </DialogTitle>
              <DialogDescription>
                معدلات الطلبات، المناديب النشطين، وتوزيع التطبيقات لهذا الشهر
              </DialogDescription>
            </DialogHeader>

            {loadingDetails ? (
              <div className='py-12 text-center'>
                <RefreshCw className='h-6 w-6 animate-spin mx-auto text-orange-500' />
                <div className='text-xs text-muted-foreground mt-2'>جاري تحميل التفاصيل...</div>
              </div>
            ) : identifierDetails ? (
              <div className='space-y-4 mt-2 max-h-[70vh] overflow-y-auto pr-1'>
                {/* Stats row */}
                <div className='grid grid-cols-3 gap-3'>
                  <div className='p-3 bg-muted/40 rounded-lg border text-center'>
                    <div className='text-xs text-muted-foreground'>المحقق الفعلي</div>
                    <div className='text-lg font-black font-mono text-orange-600'>
                      {identifierDetails.performance.month_orders}
                    </div>
                  </div>
                  <div className='p-3 bg-muted/40 rounded-lg border text-center'>
                    <div className='text-xs text-muted-foreground'>المستهدف الشهري</div>
                    <div className='text-lg font-black font-mono text-foreground'>
                      {identifierDetails.performance.monthly_target}
                    </div>
                  </div>
                  <div className='p-3 bg-muted/40 rounded-lg border text-center'>
                    <div className='text-xs text-muted-foreground'>نسبة الإنجاز</div>
                    <div className='text-lg font-black font-mono text-emerald-600'>
                      {identifierDetails.performance.achievement_percent}%
                    </div>
                  </div>
                </div>

                {/* Linked Drivers */}
                <div>
                  <h4 className='font-bold text-sm text-foreground mb-2 flex items-center gap-1.5'>
                    <Users className='h-4 w-4 text-orange-500' />
                    المناديب المرتبطين ومساهماتهم (
                    {identifierDetails.drivers_breakdown?.length || 0})
                  </h4>
                  <div className='rounded-lg border bg-card overflow-hidden'>
                    <Table>
                      <TableHeader>
                        <TableRow className='bg-muted/30'>
                          <TableHead className='text-right text-xs font-bold'>
                            اسم المندوب
                          </TableHead>
                          <TableHead className='text-right text-xs font-bold'>الطلبات</TableHead>
                          <TableHead className='text-right text-xs font-bold'>المساهمة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(identifierDetails.drivers_breakdown || []).map((driver) => (
                          <TableRow key={driver.driver_id}>
                            <TableCell className='text-xs font-medium'>
                              {driver.driver_name}
                            </TableCell>
                            <TableCell className='text-xs font-mono font-bold text-orange-600'>
                              {driver.orders}
                            </TableCell>
                            <TableCell className='text-xs font-mono text-muted-foreground'>
                              {driver.percentage}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* App Breakdown */}
                <div>
                  <h4 className='font-bold text-sm text-foreground mb-2'>
                    توزيع الطلبات بحسب التطبيقات
                  </h4>
                  <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                    {Object.entries(identifierDetails.apps_breakdown || {}).map(
                      ([appName, count]) => (
                        <div
                          key={appName}
                          className='p-2.5 bg-muted/30 border rounded-lg text-center'
                        >
                          <div className='text-xs text-muted-foreground'>{appName}</div>
                          <div className='text-base font-bold font-mono text-foreground mt-0.5'>
                            {count} طلب
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* 6. Settings Modal */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className='max-w-md text-right' dir='rtl'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-lg font-black'>
                <Settings className='h-5 w-5 text-orange-500' />
                إعدادات التارچت الافتراضية
              </DialogTitle>
              <DialogDescription>ضبط حدود التارچت اليومي والشهري العامة للمعرفين</DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-2'>
              <div className='space-y-1.5'>
                <label className='text-xs font-bold text-foreground'>
                  المستهدف الشهري الافتراضي (طلب/شهر)
                </label>
                <Input
                  type='number'
                  value={settings.default_monthly_target}
                  onChange={(e) =>
                    setSettings({ ...settings, default_monthly_target: Number(e.target.value) })
                  }
                  className='font-mono'
                />
              </div>

              <div className='space-y-1.5'>
                <label className='text-xs font-bold text-foreground'>
                  المستهدف اليومي الافتراضي (طلب/يوم)
                </label>
                <Input
                  type='number'
                  value={settings.default_daily_target}
                  onChange={(e) =>
                    setSettings({ ...settings, default_daily_target: Number(e.target.value) })
                  }
                  className='font-mono'
                />
                <p className='text-[11px] text-muted-foreground'>
                  يتم توليد تنبيه عجز تلقائي لأي معرف يقل إجمالي طلباته اليومية عن هذا الحد (افتراضياً
                  17 طلب).
                </p>
              </div>
            </div>

            <DialogFooter className='flex-row-reverse gap-2 mt-3'>
              <Button variant='outline' onClick={() => setSettingsOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className='bg-orange-600 hover:bg-orange-700 text-white font-bold'
              >
                {savingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
