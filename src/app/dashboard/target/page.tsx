'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageContainer from '@/components/layout/page-container';
import { TargetImportSheet } from '@/components/target/target-import-sheet';
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
import { useLocale } from '@/components/layout/locale-provider';
import { Icons } from '@/components/icons';
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
  FileSpreadsheet,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users
} from 'lucide-react';

export default function TargetDashboardPage() {
  const { t, dir } = useLocale();

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
    default_daily_target: 18
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Sheet Delete Confirmation
  const [batchToDelete, setBatchToDelete] = useState<ImportBatchItem | null>(null);
  const [deletingBatch, setDeletingBatch] = useState(false);

  // Import Excel Side Sheet
  const [importSheetOpen, setImportSheetOpen] = useState(false);

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
      if (batchToDelete.order_date) {
        await targetWebApi.deleteSheetByDate(batchToDelete.order_date);
      } else {
        await targetWebApi.deleteBatch(batchToDelete.id);
      }

      toast.success(
        `تم حذف شيت تاريخ ${batchToDelete.order_date || batchToDelete.file_name} وجميع طلباته بنجاح!`
      );
      setBatchToDelete(null);
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
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'TARGET_ACHIEVED') {
          if (item.status !== 'TARGET_ACHIEVED') return false;
        } else if (statusFilter === 'ON_TRACK') {
          if (item.status !== 'ON_TRACK' && item.status !== 'TARGET_ACHIEVED') return false;
        } else if (statusFilter === 'AT_RISK') {
          if (item.status !== 'AT_RISK') return false;
        } else if (statusFilter === 'BEHIND_TARGET') {
          if (item.status !== 'BEHIND_TARGET') return false;
        }
      }
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
  const atRiskCount = summary?.at_risk ?? identifiers.filter((i) => i.status === 'AT_RISK').length;
  const behindCount =
    summary?.behind_target ?? identifiers.filter((i) => i.status === 'BEHIND_TARGET').length;
  const qualifiedSum = onTrackCount + achievedCount;
  const totalOrders =
    summary?.total_month_orders ?? identifiers.reduce((acc, i) => acc + (i.month_orders || 0), 0);
  const totalTargetGoal =
    identifiers.reduce((acc, i) => acc + (i.monthly_target || 0), 0) ||
    totalIdents * (settings.default_monthly_target || 460);
  const overallProgress =
    totalTargetGoal > 0 ? Math.min(Math.round((totalOrders / totalTargetGoal) * 100), 100) : 0;
  const unresolvedAlertsCount = alerts.filter((a) => !a.is_resolved).length;

  return (
    <PageContainer
      pageTitle={t('Target Dashboard', 'لوحة متابعة وإنجاز التارچت')}
      pageDescription='متابعة مؤشرات أداء المعرفين والمناديب وإدارة تقارير الشيتات اليومية'
      pageHeaderAction={
        <div className='flex flex-wrap items-center gap-2'>
          {/* Month Selector */}
          <div className='flex items-center bg-muted/60 border rounded-lg p-0.5'>
            <Button
              variant='ghost'
              size='icon'
              className='size-7'
              onClick={handlePrevMonth}
              title='الشهر السابق'
            >
              <Icons.chevronRight className='size-3.5' />
            </Button>
            <div className='flex items-center gap-1.5 px-2 font-mono font-semibold text-xs'>
              <Calendar className='size-3.5 text-muted-foreground' />
              <span>{selectedMonth}</span>
            </div>
            <Button
              variant='ghost'
              size='icon'
              className='size-7'
              onClick={handleNextMonth}
              title='الشهر التالي'
            >
              <Icons.chevronLeft className='size-3.5' />
            </Button>
          </div>

          {/* Refresh Button */}
          <Button
            variant='outline'
            size='sm'
            onClick={() => loadData(true)}
            disabled={refreshing}
            className='gap-1.5 h-8'
          >
            <Icons.refresh
              className={`size-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`}
            />
            <span className='hidden sm:inline'>{t('Refresh', 'تحديث')}</span>
          </Button>

          {/* Target Settings */}
          <Button variant='outline' size='sm' onClick={handleOpenSettings} className='gap-1.5 h-8'>
            <Icons.settings className='size-3.5 text-muted-foreground' />
            <span className='hidden sm:inline'>إعدادات التارچت</span>
          </Button>

          {/* Import Excel Side Sheet Button */}
          <Button
            size='sm'
            onClick={() => setImportSheetOpen(true)}
            className='gap-1.5 h-8 shadow-xs font-semibold'
          >
            <Icons.upload className='size-3.5' />
            <span>استيراد ملف إكسل</span>
          </Button>
        </div>
      }
    >
      <div className='flex flex-1 flex-col gap-4' dir={dir}>
        {/* 1. Hero KPI Cards - Styled like DashboardView Hero Stats */}
        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-3 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-4 md:gap-4'>
          {/* Total Identifiers Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-sm ${
              activeTab === 'identifiers' && statusFilter === 'ALL'
                ? 'ring-2 ring-primary bg-primary/10'
                : ''
            }`}
            onClick={() => {
              setActiveTab('identifiers');
              setStatusFilter('ALL');
            }}
          >
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                إجمالي المعرفين
              </CardTitle>
              <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg'>
                <Users className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground font-mono'>
                {totalIdents}
              </div>
              <p className='text-muted-foreground text-xs mt-1'>معرف مسجل بنظام المتابعة</p>
            </CardContent>
          </Card>

          {/* On Track / Achieved Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-sm ${
              activeTab === 'identifiers' &&
              (statusFilter === 'ON_TRACK' || statusFilter === 'TARGET_ACHIEVED')
                ? 'ring-2 ring-emerald-500 bg-emerald-500/10'
                : ''
            }`}
            onClick={() => {
              setActiveTab('identifiers');
              setStatusFilter('ON_TRACK');
            }}
          >
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                يسير بالمعدل / أنجز
              </CardTitle>
              <div className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex size-8 items-center justify-center rounded-lg'>
                <CheckCircle2 className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono'>
                {qualifiedSum}
              </div>
              <p className='text-muted-foreground text-xs mt-1'>
                {onTrackCount} بالمعدل + {achievedCount} حقق التارچت 🏆
              </p>
            </CardContent>
          </Card>

          {/* At Risk Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-sm ${
              activeTab === 'identifiers' && statusFilter === 'AT_RISK'
                ? 'ring-2 ring-amber-500 bg-amber-500/10'
                : ''
            }`}
            onClick={() => {
              setActiveTab('identifiers');
              setStatusFilter('AT_RISK');
            }}
          >
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                على وشك (فرصة قائمة)
              </CardTitle>
              <div className='bg-amber-500/10 text-amber-600 dark:text-amber-400 flex size-8 items-center justify-center rounded-lg'>
                <Clock className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono'>
                {atRiskCount}
              </div>
              <p className='text-muted-foreground text-xs mt-1'>في المتناول لتحقيق التارچت</p>
            </CardContent>
          </Card>

          {/* Behind Target Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-sm ${
              activeTab === 'identifiers' && statusFilter === 'BEHIND_TARGET'
                ? 'ring-2 ring-destructive bg-destructive/10'
                : ''
            }`}
            onClick={() => {
              setActiveTab('identifiers');
              setStatusFilter('BEHIND_TARGET');
            }}
          >
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                متأخر عن التارچت
              </CardTitle>
              <div className='bg-destructive/10 text-destructive flex size-8 items-center justify-center rounded-lg'>
                <AlertTriangle className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-destructive font-mono'>
                {behindCount}
              </div>
              <p className='text-muted-foreground text-xs mt-1'>يحتاج لتكثيف الجهود والتوزيع</p>
            </CardContent>
          </Card>
        </div>

        {/* 2. Secondary Progress & Goal Overview */}
        <Card className='shadow-xs'>
          <CardContent className='p-4 sm:p-5'>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 items-center'>
              <div className='md:col-span-2 space-y-2'>
                <div className='flex justify-between items-center text-sm'>
                  <span className='font-semibold flex items-center gap-2 text-foreground'>
                    <Target className='size-4 text-primary' />
                    نسبة إنجاز التارچت الشهري العام
                  </span>
                  <span className='font-bold font-mono text-primary text-base'>
                    {overallProgress}%
                  </span>
                </div>
                <Progress value={overallProgress} className='h-2.5' />
                <div className='flex justify-between text-xs text-muted-foreground font-mono'>
                  <span>المحقق: {totalOrders.toLocaleString()} طلب</span>
                  <span>المستهدف العام: {totalTargetGoal.toLocaleString()} طلب</span>
                </div>
              </div>

              <div className='border-s ps-4 md:ps-6 space-y-1'>
                <div className='text-xs text-muted-foreground font-medium'>إجمالي طلبات الشهر</div>
                <div className='text-xl font-bold text-foreground font-mono'>
                  {totalOrders.toLocaleString()}
                  <span className='text-xs font-normal text-muted-foreground ms-1'>طلب</span>
                </div>
                <div className='text-xs text-muted-foreground'>المسجل خلال شهر {selectedMonth}</div>
              </div>

              <div className='border-s ps-4 md:ps-6 space-y-1'>
                <div className='text-xs text-muted-foreground font-medium'>
                  تنبيهات العجز غير المسواة
                </div>
                <div className='text-xl font-bold text-destructive font-mono'>
                  {unresolvedAlertsCount}
                  <span className='text-xs font-normal text-muted-foreground ms-1'>تنبيه</span>
                </div>
                <Button
                  variant='link'
                  size='sm'
                  onClick={() => setActiveTab('alerts')}
                  className='p-0 h-auto text-xs text-primary'
                >
                  معاينة التنبيهات وإجراء التسوية ←
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Main Tabs (Identifiers, Drivers, Alerts, Sheets) */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className='w-full'>
          <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-3'>
            <TabsList className='grid grid-cols-2 sm:inline-flex sm:w-auto h-9'>
              <TabsTrigger value='identifiers' className='gap-2 text-xs md:text-sm'>
                <Users className='size-3.5' />
                <span>المعرفين ({identifiers.length})</span>
              </TabsTrigger>
              <TabsTrigger value='drivers' className='gap-2 text-xs md:text-sm'>
                <Icons.trendingUp className='size-3.5' />
                <span>المناديب والطلبات ({drivers.length})</span>
              </TabsTrigger>
              <TabsTrigger value='alerts' className='gap-2 text-xs md:text-sm'>
                <AlertTriangle className='size-3.5' />
                <span>تنبيهات العجز ({alerts.length})</span>
              </TabsTrigger>
              <TabsTrigger value='sheets' className='gap-2 text-xs md:text-sm'>
                <FileSpreadsheet className='size-3.5' />
                <span>سجل الشيتات ({batches.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* Quick Search */}
            <div className='relative w-full sm:w-72'>
              <Icons.search className='text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2' />
              <Input
                placeholder='بحث بالاسم، الكود، أو التاريخ...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='h-9 ps-9 text-xs'
              />
            </div>
          </div>

          {/* TAB 1: IDENTIFIERS (المعرفين) */}
          <TabsContent value='identifiers' className='mt-4 space-y-4'>
            {/* Status Filter Chips */}
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-xs font-semibold text-muted-foreground me-1'>
                تصفية الحالة:
              </span>
              <Button
                size='sm'
                variant={statusFilter === 'ALL' ? 'default' : 'outline'}
                className='h-7 text-xs'
                onClick={() => setStatusFilter('ALL')}
              >
                الكل ({totalIdents})
              </Button>
              <Button
                size='sm'
                variant={statusFilter === 'ON_TRACK' ? 'default' : 'outline'}
                className='h-7 text-xs'
                onClick={() => setStatusFilter('ON_TRACK')}
              >
                بالمعدل ({qualifiedSum})
              </Button>
              <Button
                size='sm'
                variant={statusFilter === 'AT_RISK' ? 'default' : 'outline'}
                className='h-7 text-xs'
                onClick={() => setStatusFilter('AT_RISK')}
              >
                على وشك ({atRiskCount})
              </Button>
              <Button
                size='sm'
                variant={statusFilter === 'BEHIND_TARGET' ? 'default' : 'outline'}
                className='h-7 text-xs'
                onClick={() => setStatusFilter('BEHIND_TARGET')}
              >
                متأخرين ({behindCount})
              </Button>
              <Button
                size='sm'
                variant={statusFilter === 'TARGET_ACHIEVED' ? 'default' : 'outline'}
                className='h-7 text-xs'
                onClick={() => setStatusFilter('TARGET_ACHIEVED')}
              >
                حقق التارچت 🏆 ({achievedCount})
              </Button>
            </div>

            {/* Identifiers Table */}
            <Card className='shadow-xs overflow-hidden'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/50'>
                    <TableHead className='font-semibold'>المعرف</TableHead>
                    <TableHead className='font-semibold'>الكود</TableHead>
                    <TableHead className='font-semibold'>التارچت الشهري</TableHead>
                    <TableHead className='font-semibold'>المحقق الفعلي</TableHead>
                    <TableHead className='font-semibold'>المتبقي</TableHead>
                    <TableHead className='font-semibold'>نسبة الإنجاز</TableHead>
                    <TableHead className='font-semibold'>الحالة</TableHead>
                    <TableHead className='text-center font-semibold'>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className='text-center py-10'>
                        <Icons.spinner className='size-6 animate-spin mx-auto text-primary' />
                        <div className='text-xs text-muted-foreground mt-2'>
                          جاري تحميل بيانات المعرفين...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredIdentifiers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className='text-center py-10 text-muted-foreground text-xs'
                      >
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
                      const isAtRisk = item.status === 'AT_RISK';

                      return (
                        <TableRow key={item.id}>
                          <TableCell className='font-semibold text-foreground'>
                            <div className='flex items-center gap-2'>
                              <span>{item.name}</span>
                              {item.app_name ? (
                                <Badge variant='outline' className='text-[10px] px-1.5 py-0'>
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
                          <TableCell className='font-mono font-bold text-primary'>
                            {item.month_orders || 0}
                          </TableCell>
                          <TableCell className='font-mono text-muted-foreground'>
                            {remaining === 0 ? (
                              <span className='text-emerald-600 dark:text-emerald-400 font-bold'>
                                اكتمل ✓
                              </span>
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
                              <Badge className='bg-primary text-primary-foreground font-mono text-xs'>
                                حقق التارچت 🏆
                              </Badge>
                            ) : isOnTrack ? (
                              <Badge className='bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs'>
                                يسير بالمعدل
                              </Badge>
                            ) : isAtRisk ? (
                              <Badge className='bg-amber-600 hover:bg-amber-700 text-white font-mono text-xs'>
                                على وشك
                              </Badge>
                            ) : (
                              <Badge variant='destructive' className='font-mono text-xs'>
                                غير مؤهل (متأخر)
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className='text-center'>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleOpenDetails(item.id)}
                              className='h-8 text-xs'
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
            </Card>
          </TabsContent>

          {/* TAB 2: DRIVERS (المناديب) */}
          <TabsContent value='drivers' className='mt-4 space-y-4'>
            <Card className='shadow-xs overflow-hidden'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/50'>
                    <TableHead className='font-semibold'>اسم المندوب</TableHead>
                    <TableHead className='font-semibold'>رقم الجوال</TableHead>
                    <TableHead className='font-semibold'>إجمالي طلبات الشهر</TableHead>
                    <TableHead className='font-semibold'>طلبات اليوم</TableHead>
                    <TableHead className='font-semibold'>التطبيقات المسجل بها</TableHead>
                    <TableHead className='font-semibold'>المعرفين التابع لهم</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className='text-center py-10'>
                        <Icons.spinner className='size-6 animate-spin mx-auto text-primary' />
                        <div className='text-xs text-muted-foreground mt-2'>
                          جاري تحميل بيانات المناديب...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredDrivers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className='text-center py-10 text-muted-foreground text-xs'
                      >
                        لا توجد بيانات مناديب مسجلة في هذا الشهر
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDrivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className='font-semibold text-foreground'>
                          {driver.name}
                        </TableCell>
                        <TableCell className='font-mono text-xs text-muted-foreground'>
                          {driver.phone || '—'}
                        </TableCell>
                        <TableCell className='font-mono font-bold text-primary'>
                          {driver.month_orders || 0}
                        </TableCell>
                        <TableCell className='font-mono font-bold text-emerald-600 dark:text-emerald-400'>
                          {driver.today_orders || 0}
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-wrap gap-1'>
                            {(driver.apps || []).map((app, idx) => (
                              <Badge key={idx} variant='outline' className='text-[11px]'>
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
            </Card>
          </TabsContent>

          {/* TAB 3: ALERTS (تنبيهات العجز) */}
          <TabsContent value='alerts' className='mt-4 space-y-4'>
            <Card className='shadow-xs overflow-hidden'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/50'>
                    <TableHead className='font-semibold'>المعرف</TableHead>
                    <TableHead className='font-semibold'>تاريخ التنبيه</TableHead>
                    <TableHead className='font-semibold'>المستهدف اليومي</TableHead>
                    <TableHead className='font-semibold'>المحقق الفعلي</TableHead>
                    <TableHead className='font-semibold'>العجز</TableHead>
                    <TableHead className='font-semibold'>الحالة</TableHead>
                    <TableHead className='text-center font-semibold'>إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className='text-center py-10'>
                        <Icons.spinner className='size-6 animate-spin mx-auto text-primary' />
                        <div className='text-xs text-muted-foreground mt-2'>
                          جاري تحميل التنبيهات...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredAlerts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className='text-center py-10 text-muted-foreground text-xs'
                      >
                        لا توجد تنبيهات عجز مسجلة حالياً
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className='font-semibold text-foreground'>
                          {alert.identifier_name}
                        </TableCell>
                        <TableCell className='font-mono text-xs text-muted-foreground'>
                          {alert.alert_date}
                        </TableCell>
                        <TableCell className='font-mono font-medium'>
                          {alert.target_orders || 17} طلب
                        </TableCell>
                        <TableCell className='font-mono font-bold text-primary'>
                          {alert.actual_orders} طلب
                        </TableCell>
                        <TableCell className='font-mono font-bold text-destructive'>
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
                              className='h-7 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950'
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
            </Card>
          </TabsContent>

          {/* TAB 4: SHEETS & DELETION (سجل الشيتات وحذفها) */}
          <TabsContent value='sheets' className='mt-4 space-y-4'>
            <Card className='shadow-xs'>
              <CardContent className='p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
                <div className='flex items-center gap-3'>
                  <div className='bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg shrink-0'>
                    <Icons.info className='size-5' />
                  </div>
                  <div>
                    <h3 className='font-semibold text-foreground text-sm'>
                      إدارة وحذف الشيتات اليومية المرفوعة
                    </h3>
                    <p className='text-xs text-muted-foreground mt-0.5 leading-relaxed'>
                      في حال وجود أي خطأ في ملف إكسل تم رفعه ليوم معين، يمكنك حذف شيت ذلك اليوم من
                      هنا وسيقوم النظام تلقائياً بمسح طلباته وإعادة حساب نسب التارچت فوراً.
                    </p>
                  </div>
                </div>

                <Button
                  size='sm'
                  onClick={() => setImportSheetOpen(true)}
                  className='gap-1.5 shrink-0 font-semibold'
                >
                  <Icons.upload className='size-3.5' />
                  <span>رفع شيت جديد</span>
                </Button>
              </CardContent>
            </Card>

            {/* Sheets Table */}
            <Card className='shadow-xs overflow-hidden'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-muted/50'>
                    <TableHead className='font-semibold'>تاريخ الشيت (اليوم)</TableHead>
                    <TableHead className='font-semibold'>اسم الملف</TableHead>
                    <TableHead className='font-semibold'>إجمالي الطلبات</TableHead>
                    <TableHead className='font-semibold'>عدد المعرفين</TableHead>
                    <TableHead className='font-semibold'>عدد المناديب</TableHead>
                    <TableHead className='font-semibold'>مَن قام بالرفع</TableHead>
                    <TableHead className='font-semibold'>وقت وتاريخ الرفع</TableHead>
                    <TableHead className='text-center font-semibold text-destructive'>
                      حذف الشيت
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className='text-center py-10'>
                        <Icons.spinner className='size-6 animate-spin mx-auto text-primary' />
                        <div className='text-xs text-muted-foreground mt-2'>
                          جاري تحميل سجل الشيتات...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredBatches.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className='text-center py-10 text-muted-foreground text-xs'
                      >
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
                        <TableRow key={batch.id}>
                          <TableCell className='font-mono font-bold text-foreground text-xs'>
                            <Badge variant='outline' className='font-mono font-medium gap-1'>
                              <Calendar className='size-3' />
                              {batch.order_date || 'غير محدد'}
                            </Badge>
                          </TableCell>
                          <TableCell className='font-medium text-xs font-mono text-foreground'>
                            {batch.file_name}
                          </TableCell>
                          <TableCell className='font-mono font-bold text-primary text-xs'>
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
                              className='h-7 px-2.5 gap-1.5 text-xs'
                            >
                              <Trash2 className='size-3.5' />
                              <span>حذف</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 4. Delete Confirmation Dialog */}
        <AlertDialog
          open={Boolean(batchToDelete)}
          onOpenChange={(open) => !open && setBatchToDelete(null)}
        >
          <AlertDialogContent className='text-start' dir={dir}>
            <AlertDialogHeader>
              <AlertDialogTitle className='text-destructive flex items-center gap-2 text-base font-bold'>
                <Trash2 className='size-5 text-destructive' />
                تأكيد حذف شيت يوم ({batchToDelete?.order_date})
              </AlertDialogTitle>
              <AlertDialogDescription className='text-xs text-muted-foreground mt-2 leading-relaxed'>
                أنت على وشك حذف ملف الشيت:{' '}
                <strong className='font-mono text-foreground'>{batchToDelete?.file_name}</strong>{' '}
                الخاص بتاريخ{' '}
                <strong className='font-mono text-foreground'>{batchToDelete?.order_date}</strong>.
                <br />
                <br />
                ⚠️ <strong className='text-destructive'>تحذير مهم:</strong> سيؤدي الحذف إلى إزالة
                جميع طلبات هذا اليوم (
                <strong className='font-mono text-foreground'>
                  {batchToDelete?.total_orders} طلب
                </strong>
                ) بالكامل من قاعدة البيانات، وحذف تنبيهات العجز التابعة له، وإعادة احتساب معدلات
                التارچت فوراً.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className='gap-2 mt-4'>
              <AlertDialogCancel disabled={deletingBatch}>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmDeleteSheet();
                }}
                disabled={deletingBatch}
                className='bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold'
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
          <DialogContent className='max-w-2xl text-start' dir={dir}>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-base font-bold'>
                <Users className='size-5 text-primary' />
                تفاصيل إنجاز المعرف: {identifierDetails?.performance?.name}
              </DialogTitle>
              <DialogDescription className='text-xs'>
                معدلات الطلبات، المناديب النشطين، وتوزيع التطبيقات لهذا الشهر
              </DialogDescription>
            </DialogHeader>

            {loadingDetails ? (
              <div className='py-12 text-center'>
                <Icons.spinner className='size-6 animate-spin mx-auto text-primary' />
                <div className='text-xs text-muted-foreground mt-2'>جاري تحميل التفاصيل...</div>
              </div>
            ) : identifierDetails ? (
              <div className='space-y-4 mt-2 max-h-[70vh] overflow-y-auto pe-1'>
                {/* Stats row */}
                <div className='grid grid-cols-3 gap-3'>
                  <div className='p-3 bg-muted/40 rounded-lg border text-center'>
                    <div className='text-xs text-muted-foreground'>المحقق الفعلي</div>
                    <div className='text-lg font-bold font-mono text-primary'>
                      {identifierDetails.performance.month_orders}
                    </div>
                  </div>
                  <div className='p-3 bg-muted/40 rounded-lg border text-center'>
                    <div className='text-xs text-muted-foreground'>المستهدف الشهري</div>
                    <div className='text-lg font-bold font-mono text-foreground'>
                      {identifierDetails.performance.monthly_target}
                    </div>
                  </div>
                  <div className='p-3 bg-muted/40 rounded-lg border text-center'>
                    <div className='text-xs text-muted-foreground'>نسبة الإنجاز</div>
                    <div className='text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400'>
                      {identifierDetails.performance.achievement_percent}%
                    </div>
                  </div>
                </div>

                {/* Sub details: Drivers Breakdown */}
                <div className='space-y-2'>
                  <h4 className='text-xs font-semibold text-foreground'>
                    المناديب النشطين مع هذا المعرف:
                  </h4>
                  <div className='border rounded-lg p-2 max-h-48 overflow-y-auto divide-y'>
                    {!identifierDetails.drivers_breakdown ||
                    identifierDetails.drivers_breakdown.length === 0 ? (
                      <p className='text-center py-4 text-xs text-muted-foreground'>
                        لا يوجد مناديب مسجلين لهذا المعرف
                      </p>
                    ) : (
                      identifierDetails.drivers_breakdown.map((d, i) => (
                        <div
                          key={i}
                          className='flex justify-between items-center py-2 px-1 text-xs'
                        >
                          <span className='font-medium'>{d.driver_name}</span>
                          <span className='font-mono font-bold text-primary'>
                            {d.orders} طلب ({d.percentage || 0}%)
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button variant='outline' size='sm' onClick={() => setSelectedIdentifierId(null)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 6. Settings Modal */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className='max-w-md text-start' dir={dir}>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-base font-bold'>
                <Icons.settings className='size-5 text-primary' />
                إعدادات التارچت الافتراضية
              </DialogTitle>
              <DialogDescription className='text-xs'>
                ضبط حدود التارچت اليومي والشهري العامة للمعرفين
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-2'>
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-foreground'>
                  المستهدف الشهري الافتراضي (طلب/شهر)
                </label>
                <Input
                  type='number'
                  value={settings.default_monthly_target}
                  onChange={(e) =>
                    setSettings({ ...settings, default_monthly_target: Number(e.target.value) })
                  }
                  className='font-mono text-sm'
                />
              </div>

              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-foreground'>
                  المستهدف اليومي الافتراضي (طلب/يوم)
                </label>
                <Input
                  type='number'
                  value={settings.default_daily_target}
                  onChange={(e) =>
                    setSettings({ ...settings, default_daily_target: Number(e.target.value) })
                  }
                  className='font-mono text-sm'
                />
                <p className='text-[11px] text-muted-foreground leading-relaxed'>
                  يتم توليد تنبيه عجز تلقائي لأي معرف يقل إجمالي طلباته اليومية عن هذا الحد (افتراضياً
                  17 طلب).
                </p>
              </div>
            </div>

            <DialogFooter className='gap-2 mt-3'>
              <Button variant='outline' size='sm' onClick={() => setSettingsOpen(false)}>
                إلغاء
              </Button>
              <Button
                size='sm'
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className='font-semibold'
              >
                {savingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 7. Import Target Excel Side Sheet (from left) */}
        <TargetImportSheet
          open={importSheetOpen}
          onOpenChange={setImportSheetOpen}
          onImportSuccess={() => loadData(true)}
        />
      </div>
    </PageContainer>
  );
}
