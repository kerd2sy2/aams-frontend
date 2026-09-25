'use client';

import React, { useState, useMemo } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  Navigation,
  Users,
  Search,
  ArrowUpDown,
  Download,
  Flame,
  Bike
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ninjaSeedData from '@/lib/aams/ninja-identifiers-seed.json';
import { saveDailyReportsBatch } from '@/lib/aams/target-api';

interface NinjaOrderRecord {
  id: string;
  orderId: string;
  captainId: string;
  captainName: string;
  platform: string;
  status: 'DELIVERED' | 'CANCELED' | string;
  totalTimeMinutes: number;
  paymentMethod: string;
  pickupDistanceKm: number;
  deliveryDistanceKm: number;
  totalDistanceKm: number;
  createdAt: string;
}

interface CaptainSummary {
  captainId: string;
  captainNameAr?: string;
  captainNameEn?: string;
  avatar?: string;
  mobile?: string;
  totalOrders: number;
  deliveredOrders: number;
  canceledOrders: number;
  avgTimeMinutes: number;
  totalDistanceKm: number;
  avgDistanceKm: number;
}

export default function NinjaDailyReportPage() {
  const [reportDate, setReportDate] = useState<string>('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [orders, setOrders] = useState<NinjaOrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingDb, setSavingDb] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELIVERED' | 'CANCELED'>('ALL');
  const [viewMode, setViewMode] = useState<'CAPTAINS' | 'ORDERS'>('CAPTAINS');

  // Load saved reports from Next.js internal API database
  const loadSavedReports = React.useCallback(async (filterDate?: string) => {
    try {
      setLoading(true);
      const url =
        filterDate && filterDate !== 'ALL'
          ? `/api/reports/ninja?date=${encodeURIComponent(filterDate)}`
          : '/api/reports/ninja';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.availableDates) {
          setAvailableDates(data.availableDates);
        }
        if (data.orders && Array.isArray(data.orders) && data.orders.length > 0) {
          setOrders(data.orders);
          setReportDate(data.date || data.latestDate || '');
        }
      }
    } catch (err) {
      console.error('Failed to load saved ninja reports:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSavedReports();
  }, [loadSavedReports]);

  // Handle Date Filter Change
  const handleDateFilterChange = (dateVal: any) => {
    const val = dateVal || 'ALL';
    setSelectedDateFilter(val);
    if (val === 'ALL') {
      loadSavedReports();
    } else {
      loadSavedReports(val);
    }
  };

  // Handle CSV File Upload & Save directly to DB
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          toast.error('الملف فارغ أو غير صالح');
          setLoading(false);
          return;
        }

        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          toast.error('لا توجد بيانات كافية في الملف');
          setLoading(false);
          return;
        }

        const parsedOrders: NinjaOrderRecord[] = [];
        let detectedDate = '';

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',');
          if (parts.length < 7) continue;

          const orderId = parts[0]?.trim();
          const backendId = parts[1]?.trim();
          const captainId = parts[2]?.trim();
          const captainName = parts[3]?.trim();
          const platform = parts[4]?.trim() || 'Ninja Restaurant';
          const status = parts[5]?.trim()?.toUpperCase() || 'UNKNOWN';
          const timeMin = parseFloat(parts[6]) || 0;
          const payMethod = parts[7]?.trim() || 'PREPAID';
          const pickupKm = parseFloat(parts[16]) || 0;
          const deliveryKm = parseFloat(parts[17]) || 0;
          const createdAt = parts[20]?.trim() || '';

          if (!detectedDate && createdAt) {
            detectedDate = createdAt.split(' ')[0] || '';
          }

          parsedOrders.push({
            id: `${orderId}-${i}`,
            orderId: backendId || orderId,
            captainId,
            captainName,
            platform,
            status,
            totalTimeMinutes: timeMin,
            paymentMethod: payMethod,
            pickupDistanceKm: pickupKm,
            deliveryDistanceKm: deliveryKm,
            totalDistanceKm: +(pickupKm + deliveryKm).toFixed(2),
            createdAt
          });
        }

        setOrders(parsedOrders);
        if (detectedDate) {
          setReportDate(detectedDate);
          setSelectedDateFilter(detectedDate);
        }

        // Save to Database API
        setSavingDb(true);
        try {
          const saveRes = await fetch('/api/reports/ninja', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              reportDate: detectedDate || new Date().toISOString().split('T')[0],
              orders: parsedOrders
            })
          });

          if (saveRes.ok) {
            const saveJson = await saveRes.json();
            toast.success(
              saveJson.message ||
                `تم حفظ ${parsedOrders.length} طلب بنجاح في قاعدة البيانات ليوم ${detectedDate}`
            );
            // Refresh available dates list
            if (detectedDate && !availableDates.includes(detectedDate)) {
              setAvailableDates((prev) => [detectedDate, ...prev].sort().reverse());
            }
          } else {
            toast.error('حدث خطأ أثناء حفظ الملف في قاعدة البيانات');
          }
        } catch (dbErr: any) {
          console.error(dbErr);
          toast.error('تعذر الاتصال بخادم الحفظ');
        } finally {
          setSavingDb(false);
        }
      } catch (err: any) {
        toast.error('حدث خطأ أثناء قراءة ملف CSV');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file, 'utf-8');
  };

  // Build lookup map from Ninja seed data
  const ninjaSeedMap = useMemo(() => {
    const map = new Map<string, (typeof ninjaSeedData)[0]>();
    (ninjaSeedData as any[]).forEach((item) => {
      if (item.ninja_id) map.set(String(item.ninja_id).trim(), item);
    });
    return map;
  }, []);

  // Group by Captains
  const captainsSummary = useMemo(() => {
    const map = new Map<string, CaptainSummary>();

    orders.forEach((ord) => {
      const cId = ord.captainId || 'Unknown';
      const seedItem = ninjaSeedMap.get(String(cId).trim());

      const existing = map.get(cId) || {
        captainId: cId,
        captainNameAr: seedItem?.name_ar,
        captainNameEn: seedItem?.name_en || ord.captainName,
        avatar: seedItem?.avatar,
        mobile: seedItem?.mobile,
        totalOrders: 0,
        deliveredOrders: 0,
        canceledOrders: 0,
        avgTimeMinutes: 0,
        totalDistanceKm: 0,
        avgDistanceKm: 0
      };

      existing.totalOrders += 1;
      if (ord.status === 'DELIVERED') {
        existing.deliveredOrders += 1;
      } else if (ord.status === 'CANCELED') {
        existing.canceledOrders += 1;
      }
      existing.totalDistanceKm += ord.totalDistanceKm;
      existing.avgTimeMinutes += ord.totalTimeMinutes;

      map.set(cId, existing);
    });

    const list = Array.from(map.values()).map((cap) => {
      const delivered = cap.deliveredOrders || 1;
      return {
        ...cap,
        avgTimeMinutes: +(cap.avgTimeMinutes / delivered).toFixed(1),
        totalDistanceKm: +cap.totalDistanceKm.toFixed(1),
        avgDistanceKm: +(cap.totalDistanceKm / delivered).toFixed(1)
      };
    });

    // Automatically persist to target daily stats history so it reflects in Identifiers and Target
    if (orders.length > 0 && reportDate) {
      saveDailyReportsBatch(
        list.map((c) => ({
          date: reportDate,
          app: 'NINJA',
          identifier: c.captainId,
          captainName: c.captainNameAr || c.captainNameEn,
          deliveredOrders: c.deliveredOrders,
          totalOrders: c.totalOrders,
          totalDistanceKm: c.totalDistanceKm,
          avgDeliveryMinutes: c.avgTimeMinutes
        })),
        fileName
      );
    }

    return list.sort((a, b) => b.deliveredOrders - a.deliveredOrders);
  }, [orders, ninjaSeedMap, reportDate]);

  // Overall KPIs
  const totalOrdersCount = orders.length;
  const deliveredOrdersCount = orders.filter((o) => o.status === 'DELIVERED').length;
  const canceledOrdersCount = orders.filter((o) => o.status === 'CANCELED').length;
  const totalCaptainsCount = captainsSummary.length;

  const totalDeliveredDistance = orders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((acc, o) => acc + o.totalDistanceKm, 0);

  const avgDistancePerOrder =
    deliveredOrdersCount > 0 ? (totalDeliveredDistance / deliveredOrdersCount).toFixed(2) : '0';

  const totalDeliveredTime = orders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((acc, o) => acc + o.totalTimeMinutes, 0);

  const avgTimePerOrder =
    deliveredOrdersCount > 0 ? (totalDeliveredTime / deliveredOrdersCount).toFixed(1) : '0';

  // Filtered Captains
  const filteredCaptains = useMemo(() => {
    return captainsSummary.filter((cap) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          cap.captainId.toLowerCase().includes(q) ||
          (cap.captainNameAr && cap.captainNameAr.toLowerCase().includes(q)) ||
          (cap.captainNameEn && cap.captainNameEn.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [captainsSummary, searchQuery]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (statusFilter !== 'ALL' && ord.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          ord.captainId.toLowerCase().includes(q) ||
          ord.orderId.toLowerCase().includes(q) ||
          ord.captainName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  return (
    <PageContainer
      pageTitle='تقرير نينجا اليومي'
      pageDescription='استيراد وتحليل تقارير طلبات نينجا اليومية بصيغة CSV، تفريغ أوردرات الكباتن، تدقيق الكيلومترات، وسرعة التوصيل'
      pageHeaderAction={
        <div className='flex items-center gap-2'>
          {/* Hidden File Input */}
          <input
            id='ninja-csv-upload'
            type='file'
            accept='.csv,text/csv'
            className='hidden'
            onChange={handleFileUpload}
          />

          <label
            htmlFor='ninja-csv-upload'
            className={cn(
              buttonVariants({ variant: 'default', size: 'sm' }),
              'cursor-pointer gap-1.5 h-8 font-medium'
            )}
          >
            <Upload className='size-3.5' />
            <span>رفع ملف CSV نينجا</span>
          </label>

          <Link
            href='/dashboard/identifiers'
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-8 gap-1.5')}
          >
            <span>سجل المعرفات</span>
          </Link>
        </div>
      }
    >
      <div className='space-y-6'>
        {/* Upload Banner / Date Info */}
        <Card className='border-primary/20 bg-primary/5'>
          <CardContent className='p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4'>
            <div className='flex items-center gap-3'>
              <div className='bg-primary/20 text-primary p-2.5 rounded-xl shrink-0'>
                <FileSpreadsheet className='size-6' />
              </div>
              <div>
                <h3 className='font-bold text-sm text-foreground flex items-center gap-2'>
                  <span>تقرير تشغيل نينجا</span>
                  {fileName && (
                    <Badge variant='outline' className='font-mono text-xs font-normal'>
                      {fileName}
                    </Badge>
                  )}
                </h3>
                <p className='text-xs text-muted-foreground mt-0.5'>
                  {reportDate
                    ? `تاريخ بيانات التقرير: ${reportDate} · تم استخراج وتحليل بيانات كل كابتن تلقائياً`
                    : 'قم برفع ملف CSV اليومي الصادر من منصة نينجا لمعاينته وتفريغ إحصائيات الكباتن والطلبات'}
                </p>
              </div>
            </div>

            <div className='flex items-center gap-2 self-end sm:self-center'>
              <label
                htmlFor='ninja-csv-upload'
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'cursor-pointer gap-1.5 text-xs h-8'
                )}
              >
                <Upload className='size-3.5' />
                <span>اختر ملف آخر</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* KPIs Summary Cards */}
        <div className='grid grid-cols-2 md:grid-cols-5 gap-3'>
          {/* Delivered Orders */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                الطلبات المكتملة
              </CardTitle>
              <div className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex size-8 items-center justify-center rounded-lg'>
                <CheckCircle2 className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono'>
                {deliveredOrdersCount}
              </div>
              <p className='text-muted-foreground text-xs mt-1'>من إجمالي {totalOrdersCount} طلب</p>
            </CardContent>
          </Card>

          {/* Active Captains */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                الكباتن المشاركون
              </CardTitle>
              <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg'>
                <Users className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-primary font-mono'>
                {totalCaptainsCount}
              </div>
              <p className='text-muted-foreground text-xs mt-1'>كابتن نفذوا أوردرات باليوم</p>
            </CardContent>
          </Card>

          {/* Avg Orders per Captain */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                معدل الكابتن
              </CardTitle>
              <div className='bg-purple-500/10 text-purple-600 dark:text-purple-400 flex size-8 items-center justify-center rounded-lg'>
                <Bike className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400 font-mono'>
                {totalCaptainsCount > 0
                  ? (deliveredOrdersCount / totalCaptainsCount).toFixed(1)
                  : 0}
              </div>
              <p className='text-muted-foreground text-xs mt-1'>طلب لكل كابتن باليوم</p>
            </CardContent>
          </Card>

          {/* Avg Distance Per Order */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                متوسط مشوار الطلب
              </CardTitle>
              <div className='bg-sky-500/10 text-sky-600 dark:text-sky-400 flex size-8 items-center justify-center rounded-lg'>
                <Navigation className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400 font-mono'>
                {avgDistancePerOrder} <span className='text-xs font-normal'>كم</span>
              </div>
              <p className='text-muted-foreground text-xs mt-1'>استلام + تسليم للعميل</p>
            </CardContent>
          </Card>

          {/* Avg Delivery Duration */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                متوسط وقت التوصيل
              </CardTitle>
              <div className='bg-amber-500/10 text-amber-600 dark:text-amber-400 flex size-8 items-center justify-center rounded-lg'>
                <Clock className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono'>
                {avgTimePerOrder} <span className='text-xs font-normal'>دقيقة</span>
              </div>
              <p className='text-muted-foreground text-xs mt-1'>
                {canceledOrdersCount > 0 ? `${canceledOrdersCount} طلب ملغي` : 'سرعة ممتازة'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* View Switcher and Filters */}
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-3'>
          <div className='flex items-center gap-1.5'>
            <Button
              size='sm'
              variant={viewMode === 'CAPTAINS' ? 'default' : 'outline'}
              className='h-8 text-xs font-medium gap-1'
              onClick={() => setViewMode('CAPTAINS')}
            >
              <Users className='size-3.5' />
              <span>إحصائيات الكباتن ({totalCaptainsCount})</span>
            </Button>
            <Button
              size='sm'
              variant={viewMode === 'ORDERS' ? 'default' : 'outline'}
              className='h-8 text-xs font-medium gap-1'
              onClick={() => setViewMode('ORDERS')}
            >
              <FileSpreadsheet className='size-3.5' />
              <span>قائمة الطلبات بالتفصيل ({totalOrdersCount})</span>
            </Button>
          </div>

          <div className='flex items-center gap-2'>
            {/* Filter by Date */}
            {availableDates.length > 0 && (
              <div className='flex items-center gap-1.5'>
                <Clock className='size-3.5 text-muted-foreground' />
                <Select value={selectedDateFilter} onValueChange={handleDateFilterChange}>
                  <SelectTrigger className='h-8 w-36 text-xs font-mono'>
                    <SelectValue placeholder='تصفية باليوم' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ALL'>أحدث تقرير</SelectItem>
                    {availableDates.map((d) => (
                      <SelectItem key={d} value={d} className='font-mono'>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {viewMode === 'ORDERS' && (
              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger className='h-8 w-28 text-xs'>
                  <SelectValue placeholder='حالة الطلب' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>جميع الحالات</SelectItem>
                  <SelectItem value='DELIVERED'>تم التوصيل</SelectItem>
                  <SelectItem value='CANCELED'>ملغي</SelectItem>
                </SelectContent>
              </Select>
            )}

            <div className='relative w-full sm:w-64'>
              <Search className='text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2' />
              <Input
                placeholder='بحث برقم المعرف أو الطلب...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='h-8 ps-9 text-xs'
              />
            </div>
          </div>
        </div>

        {/* Data Tables */}
        {orders.length === 0 ? (
          <Card className='py-16 text-center border-dashed'>
            <CardContent className='flex flex-col items-center justify-center space-y-3'>
              <div className='p-3 bg-muted rounded-full text-muted-foreground'>
                <Upload className='size-8' />
              </div>
              <h3 className='font-bold text-base text-foreground'>لا توجد بيانات معروضة حالياً</h3>
              <p className='text-xs text-muted-foreground max-w-sm'>
                يرجى الضغط على زر &quot;رفع ملف CSV نينجا&quot; في أعلى الصفحة لاختيار ملف التقرير
                اليومي وتفريغه فوراً.
              </p>
              <label
                htmlFor='ninja-csv-upload'
                className={cn(
                  buttonVariants({ variant: 'default', size: 'sm' }),
                  'cursor-pointer mt-2'
                )}
              >
                اختيار ملف التقرير
              </label>
            </CardContent>
          </Card>
        ) : viewMode === 'CAPTAINS' ? (
          /* Captains Summary Table */
          <Card className='shadow-xs overflow-hidden'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  <TableHead className='font-semibold text-center w-12'>#</TableHead>
                  <TableHead className='font-semibold min-w-[220px]'>الكابتن والمعرف</TableHead>
                  <TableHead className='font-semibold text-center'>الطلبات المسلمة</TableHead>
                  <TableHead className='font-semibold text-center'>الملغية</TableHead>
                  <TableHead className='font-semibold text-center'>إجمالي الكيلومترات</TableHead>
                  <TableHead className='font-semibold text-center'>متوسط كم / طلب</TableHead>
                  <TableHead className='font-semibold text-center'>متوسط وقت التوصيل</TableHead>
                  <TableHead className='font-semibold text-center'>التقييم اليومي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCaptains.map((cap, idx) => {
                  const isTopPerformer = cap.deliveredOrders >= 20;

                  return (
                    <TableRow key={cap.captainId} className='hover:bg-muted/30'>
                      <TableCell className='text-center font-mono text-xs text-muted-foreground'>
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-3'>
                          <Avatar className='size-10 rounded-full border shadow-xs'>
                            {cap.avatar ? (
                              <AvatarImage
                                src={cap.avatar}
                                alt={cap.captainNameAr || cap.captainNameEn || cap.captainId}
                                className='object-cover'
                              />
                            ) : null}
                            <AvatarFallback className='text-xs font-bold bg-muted text-muted-foreground'>
                              {(cap.captainNameAr || cap.captainNameEn || 'C')
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className='flex items-center gap-1.5 font-bold text-sm text-foreground'>
                              <span>
                                {cap.captainNameAr || cap.captainNameEn || `كابتن ${cap.captainId}`}
                              </span>
                              {isTopPerformer && (
                                <Badge className='bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] px-1.5 py-0'>
                                  🔥 بطل اليوم
                                </Badge>
                              )}
                            </div>
                            <div className='flex items-center gap-2 mt-0.5'>
                              <Badge
                                variant='outline'
                                className='font-mono text-[10px] py-0 px-1.5'
                              >
                                ID: {cap.captainId}
                              </Badge>
                              {cap.captainNameEn && cap.captainNameAr && (
                                <span className='text-[11px] font-mono text-muted-foreground uppercase'>
                                  {cap.captainNameEn}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className='text-center font-mono font-bold text-emerald-600 text-sm'>
                        {cap.deliveredOrders}
                      </TableCell>
                      <TableCell className='text-center font-mono text-xs text-muted-foreground'>
                        {cap.canceledOrders > 0 ? (
                          <span className='text-destructive font-bold'>{cap.canceledOrders}</span>
                        ) : (
                          '0'
                        )}
                      </TableCell>
                      <TableCell className='text-center font-mono text-xs font-semibold'>
                        {cap.totalDistanceKm} كم
                      </TableCell>
                      <TableCell className='text-center font-mono text-xs text-muted-foreground'>
                        {cap.avgDistanceKm} كم
                      </TableCell>
                      <TableCell className='text-center font-mono text-xs'>
                        {cap.avgTimeMinutes} دقيقة
                      </TableCell>
                      <TableCell className='text-center'>
                        {cap.deliveredOrders >= 18 ? (
                          <Badge className='bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[10px]'>
                            أتم المستهدف ✅
                          </Badge>
                        ) : cap.deliveredOrders >= 12 ? (
                          <Badge className='bg-primary text-primary-foreground font-mono text-[10px]'>
                            أداء جيد
                          </Badge>
                        ) : (
                          <Badge
                            variant='outline'
                            className='font-mono text-[10px] text-muted-foreground'
                          >
                            أقل من المطلوب
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        ) : (
          /* Detailed Orders Table */
          <Card className='shadow-xs overflow-hidden'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  <TableHead className='font-semibold'>رقم الطلب</TableHead>
                  <TableHead className='font-semibold'>معرف الكابتن</TableHead>
                  <TableHead className='font-semibold text-center'>الحالة</TableHead>
                  <TableHead className='font-semibold text-center'>مدة التوصيل</TableHead>
                  <TableHead className='font-semibold text-center'>مسافة الاستلام</TableHead>
                  <TableHead className='font-semibold text-center'>مسافة التسليم</TableHead>
                  <TableHead className='font-semibold text-center'>إجمالي المسافة</TableHead>
                  <TableHead className='font-semibold text-center'>وقت الإنشاء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.slice(0, 100).map((ord) => (
                  <TableRow key={ord.id} className='hover:bg-muted/30'>
                    <TableCell className='font-mono text-xs font-semibold'>{ord.orderId}</TableCell>
                    <TableCell>
                      {(() => {
                        const seedItem = ninjaSeedMap.get(String(ord.captainId).trim());
                        return (
                          <div className='flex items-center gap-2'>
                            <Avatar className='size-7 rounded-full border shadow-xs'>
                              {seedItem?.avatar ? (
                                <AvatarImage
                                  src={seedItem.avatar}
                                  alt={seedItem.name_ar || ord.captainName}
                                  className='object-cover'
                                />
                              ) : null}
                              <AvatarFallback className='text-[10px] font-bold bg-muted text-muted-foreground'>
                                {(seedItem?.name_ar || seedItem?.name_en || 'C')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className='font-bold text-xs text-foreground'>
                                {seedItem?.name_ar ||
                                  seedItem?.name_en ||
                                  ord.captainName ||
                                  `كابتن ${ord.captainId}`}
                              </div>
                              <span className='font-mono text-[10px] text-muted-foreground'>
                                ID: {ord.captainId}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className='text-center'>
                      {ord.status === 'DELIVERED' ? (
                        <Badge className='bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-600/20 text-[10px]'>
                          تم التسليم
                        </Badge>
                      ) : (
                        <Badge variant='destructive' className='text-[10px]'>
                          {ord.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className='text-center font-mono text-xs'>
                      {ord.totalTimeMinutes ? `${ord.totalTimeMinutes} د` : '—'}
                    </TableCell>
                    <TableCell className='text-center font-mono text-xs text-muted-foreground'>
                      {ord.pickupDistanceKm} كم
                    </TableCell>
                    <TableCell className='text-center font-mono text-xs text-muted-foreground'>
                      {ord.deliveryDistanceKm} كم
                    </TableCell>
                    <TableCell className='text-center font-mono text-xs font-bold'>
                      {ord.totalDistanceKm} كم
                    </TableCell>
                    <TableCell
                      className='text-center font-mono text-xs text-muted-foreground'
                      dir='ltr'
                    >
                      {ord.createdAt}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredOrders.length > 100 && (
              <div className='p-3 text-center text-xs text-muted-foreground bg-muted/20 border-t'>
                يتم عرض أول 100 طلب من أصل {filteredOrders.length} طلب
              </div>
            )}
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
