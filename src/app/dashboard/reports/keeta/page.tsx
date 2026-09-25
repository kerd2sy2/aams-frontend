'use client';

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Download,
  AlertTriangle,
  Flame,
  Bike
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import keetaSeedData from '@/lib/aams/keeta-identifiers-seed.json';
import { saveDailyReportsBatch } from '@/lib/aams/target-api';

interface KeetaRow {
  date: string;
  driverId: string;
  driverNameEn: string;
  driverNameAr?: string;
  vehicleType: string;
  onlineDurationStr: string;
  peakHoursStr: string;
  acceptedTasks: number;
  deliveredTasks: number;
  rejectedTasks: number;
  punctualityRate: number; // 0 - 1
  avgDeliveryDurationMinutes: number;
  delayedTasks: number;
  veryDelayedTasks: number;
  avatar?: string;
  mobile?: string;
}

export default function KeetaDailyReportPage() {
  const [data, setData] = useState<KeetaRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [reportDate, setReportDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [vehicleFilter, setVehicleFilter] = useState<'all' | 'car' | 'bike'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Build lookup map from Keeta seed
  const captainMap = useMemo(() => {
    const map = new Map<string, (typeof keetaSeedData)[0]>();
    keetaSeedData.forEach((item) => {
      map.set(item.keeta_id, item);
    });
    return map;
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processExcelFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('يرجى اختيار ملف Excel بصيغة .xlsx أو .xls');
      return;
    }
    processExcelFile(file);
  };

  const processExcelFile = async (file: File) => {
    setIsLoading(true);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Fix Keeta export range limitation
      if (sheet && !sheet['!ref']?.includes(':AB')) {
        // Expand ref to cover up to 100 rows and AB columns
        sheet['!ref'] = 'A1:AB100';
      }

      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
      if (!rows || rows.length === 0) {
        toast.error('الملف فارغ أو لا يحتوي على بيانات صالحة');
        setIsLoading(false);
        return;
      }

      const parsedRows: KeetaRow[] = [];
      let detectedDate = '';

      rows.forEach((r) => {
        const rawId = String(r['معرّف السائق'] || '').trim();
        if (!rawId || rawId === 'undefined') return;

        let dateVal = String(r['التاريخ'] || '').trim();
        if (dateVal.length === 8 && !dateVal.includes('-')) {
          dateVal = `${dateVal.slice(0, 4)}-${dateVal.slice(4, 6)}-${dateVal.slice(6, 8)}`;
        }
        if (dateVal && !detectedDate) {
          detectedDate = dateVal;
        }

        const name1 = String(r['اسم السائق'] || '').trim();
        const name2 = String(r['اسم السائق_1'] || '').trim();
        const combinedNameEn = `${name1} ${name2}`.trim();

        const seedInfo = captainMap.get(rawId);

        const accepted = Number(r[' أحجام المهام_المهام المقبولة'] || 0);
        const delivered = Number(r[' أحجام المهام_المهام التي تم تسليمها'] || 0);
        const rejected = Number(r[' أحجام المهام_ المهام المرفوضة'] || 0);
        const delayed = Number(r['تجربة التوصيل_مهام الطلبات المتأخرة'] || 0);
        const veryDelayed = Number(r['تجربة التوصيل_مهام الطلبات المتأخرة جدًا'] || 0);
        const punctuality = Number(
          r['تجربة التوصيل_نسبة الطلبات التي تم تسليمها في الوقت المحدد (D)'] || 0
        );
        const avgDelivery = Number(r['تجربة التوصيل_متوسط مدة التوصيل لكل طلب مكتمل'] || 0);

        parsedRows.push({
          date: dateVal,
          driverId: rawId,
          driverNameEn: seedInfo?.name_en || combinedNameEn,
          driverNameAr: seedInfo?.name_ar,
          vehicleType: String(r['نوع المركبة'] || 'دراجة'),
          onlineDurationStr: String(r['فترة الوردية_وقت اتصال السائقين عبر تطبيق السائق.'] || '-'),
          peakHoursStr: String(r['فترة الوردية_ساعات الاتصال في وقت الذروة'] || '-'),
          acceptedTasks: accepted,
          deliveredTasks: delivered,
          rejectedTasks: rejected,
          punctualityRate: punctuality,
          avgDeliveryDurationMinutes: avgDelivery,
          delayedTasks: delayed,
          veryDelayedTasks: veryDelayed,
          avatar: seedInfo?.avatar,
          mobile: seedInfo?.mobile
        });
      });

      setData(parsedRows);
      setReportDate(detectedDate);

      // Persist to target daily storage history
      if (parsedRows.length > 0 && detectedDate) {
        saveDailyReportsBatch(
          parsedRows.map((r) => ({
            date: r.date || detectedDate,
            app: 'KEETA',
            identifier: r.driverId,
            captainName: r.driverNameAr || r.driverNameEn,
            deliveredOrders: r.deliveredTasks,
            totalOrders: r.acceptedTasks,
            onlineDurationStr: r.onlineDurationStr,
            delayedOrders: r.delayedTasks,
            punctualityRate: r.punctualityRate,
            avgDeliveryMinutes: r.avgDeliveryDurationMinutes
          }))
        );
      }

      toast.success(`تم قراءة تقرير كيتا بنجاح: ${parsedRows.length} كابتن`);
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء قراءة ملف Excel: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsLoading(false);
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const totalDrivers = data.length;
    const totalAccepted = data.reduce((sum, r) => sum + r.acceptedTasks, 0);
    const totalDelivered = data.reduce((sum, r) => sum + r.deliveredTasks, 0);
    const totalRejected = data.reduce((sum, r) => sum + r.rejectedTasks, 0);
    const totalDelayed = data.reduce((sum, r) => sum + r.delayedTasks, 0);

    const completionRate = totalAccepted > 0 ? (totalDelivered / totalAccepted) * 100 : 0;
    const avgDuration =
      data.length > 0
        ? data.reduce((sum, r) => sum + r.avgDeliveryDurationMinutes, 0) / data.length
        : 0;

    const avgPunctuality =
      data.length > 0
        ? (data.reduce((sum, r) => sum + r.punctualityRate, 0) / data.length) * 100
        : 0;

    return {
      totalDrivers,
      totalAccepted,
      totalDelivered,
      totalRejected,
      totalDelayed,
      completionRate,
      avgDuration,
      avgPunctuality
    };
  }, [data]);

  // Filtered rows
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const matchSearch =
        row.driverId.includes(searchTerm) ||
        row.driverNameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.driverNameAr && row.driverNameAr.includes(searchTerm)) ||
        (row.mobile && row.mobile.includes(searchTerm));

      let matchVehicle = true;
      if (vehicleFilter === 'car') {
        matchVehicle =
          row.vehicleType.toLowerCase().includes('car') || row.vehicleType.includes('سيارة');
      } else if (vehicleFilter === 'bike') {
        matchVehicle =
          !row.vehicleType.toLowerCase().includes('car') && !row.vehicleType.includes('سيارة');
      }

      return matchSearch && matchVehicle;
    });
  }, [data, searchTerm, vehicleFilter]);

  const handleExportSummary = () => {
    if (data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(
      data.map((d) => ({
        'معرّف السائق': d.driverId,
        'الاسم بالعربي': d.driverNameAr || '',
        'الاسم بالإنجليزي': d.driverNameEn,
        'رقم الجوال': d.mobile || '',
        'نوع المركبة': d.vehicleType,
        'ساعات الاتصال': d.onlineDurationStr,
        'ساعات الذروة': d.peakHoursStr,
        'المهام المقبولة': d.acceptedTasks,
        'المهام المسلمة': d.deliveredTasks,
        'المهام المرفوضة': d.rejectedTasks,
        'المهام المتأخرة': d.delayedTasks,
        'نسبة التسليم بالوقت المحدد %': (d.punctualityRate * 100).toFixed(1) + '%',
        'متوسط وقت التوصيل (دقيقة)': d.avgDeliveryDurationMinutes.toFixed(1)
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير كيتا اليومي');
    XLSX.writeFile(wb, `Keeta_Report_${reportDate || 'export'}.xlsx`);
  };

  return (
    <PageContainer>
      <div className='space-y-6' dir='rtl'>
        {/* Header */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4'>
          <div>
            <div className='flex items-center gap-3'>
              <span className='text-3xl'>🛵</span>
              <div>
                <h1 className='text-2xl font-bold tracking-tight text-foreground'>
                  تقرير كيتا اليومي
                </h1>
                <p className='text-sm text-muted-foreground'>
                  رفع وتحليل تقارير شفتات وأداء كباتن كيتا (Excel) وحساب مؤشرات التسليم والالتزام
                </p>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <label
              htmlFor='keeta-excel-upload'
              className={cn(
                buttonVariants({ variant: 'default', size: 'sm' }),
                'cursor-pointer gap-1.5 h-8 font-medium bg-emerald-600 hover:bg-emerald-700 text-white'
              )}
            >
              <Upload className='size-3.5' />
              <span>رفع ملف إكسل كيتا</span>
            </label>

            <Link
              href='/dashboard/identifiers'
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-8 gap-1.5')}
            >
              <span>سجل المعرفات</span>
            </Link>

            {data.length > 0 && (
              <Button
                variant='outline'
                size='sm'
                onClick={handleExportSummary}
                className='h-8 gap-1.5'
              >
                <Download className='size-3.5' />
                <span>تصدير (Excel)</span>
              </Button>
            )}
          </div>
        </div>

        {/* Upload Card */}
        <Card
          className='border-dashed border-2 bg-muted/20 hover:bg-muted/30 transition-colors'
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <CardContent className='flex flex-col items-center justify-center p-8 text-center'>
            <div className='p-4 rounded-full bg-emerald-500/10 text-emerald-600 mb-3'>
              <FileSpreadsheet className='h-8 w-8' />
            </div>
            <h3 className='font-semibold text-lg mb-1'>اسحب وأفلت تقرير كيتا اليومي (Excel) هنا</h3>
            <p className='text-sm text-muted-foreground mb-4 max-w-md'>
              يدعم ملفات إكسل الصادرة من كيتا مباشرة (مثل: 20260925_085106_a589d6cd.xlsx)
            </p>

            <div className='flex items-center gap-3'>
              <input
                id='keeta-excel-upload'
                type='file'
                accept='.xlsx, .xls'
                className='hidden'
                onChange={handleFileUpload}
                disabled={isLoading}
              />
              <label
                htmlFor='keeta-excel-upload'
                className='inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background px-4 py-2 text-sm cursor-pointer gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              >
                <Upload className='h-4 w-4' />
                <span>{isLoading ? 'جاري التحميل والمعالجة...' : 'اختر ملف التقرير من جهازك'}</span>
              </label>
            </div>

            {fileName && (
              <div className='mt-4 flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800'>
                <FileSpreadsheet className='h-3.5 w-3.5' />
                <span>
                  الملف الحالي: <strong>{fileName}</strong>
                </span>
                {reportDate && <span>(تاريخ: {reportDate})</span>}
                <span>({data.length} كابتن)</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPIs Cards */}
        {data.length > 0 && (
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'>
            <Card className='border-border/60'>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between text-muted-foreground mb-1'>
                  <span className='text-xs font-medium'>كباتن الشفت</span>
                  <Users className='h-4 w-4 text-primary' />
                </div>
                <div className='text-2xl font-bold text-foreground'>{stats.totalDrivers}</div>
                <p className='text-[11px] text-muted-foreground mt-0.5'>كابتن مسجل بالتقرير</p>
              </CardContent>
            </Card>

            <Card className='border-border/60'>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between text-muted-foreground mb-1'>
                  <span className='text-xs font-medium'>المهام المقبولة</span>
                  <FileSpreadsheet className='h-4 w-4 text-blue-500' />
                </div>
                <div className='text-2xl font-bold text-blue-600'>{stats.totalAccepted}</div>
                <p className='text-[11px] text-muted-foreground mt-0.5'>طلب مقبول بالكامل</p>
              </CardContent>
            </Card>

            <Card className='border-border/60'>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between text-muted-foreground mb-1'>
                  <span className='text-xs font-medium'>تم تسليمها</span>
                  <CheckCircle2 className='h-4 w-4 text-emerald-500' />
                </div>
                <div className='text-2xl font-bold text-emerald-600'>{stats.totalDelivered}</div>
                <p className='text-[11px] text-emerald-600/80 mt-0.5'>
                  نسبة الإنجاز: {stats.completionRate.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card className='border-border/60'>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between text-muted-foreground mb-1'>
                  <span className='text-xs font-medium'>الالتزام بالوقت</span>
                  <Clock className='h-4 w-4 text-purple-500' />
                </div>
                <div className='text-2xl font-bold text-purple-600'>
                  {stats.avgPunctuality.toFixed(1)}%
                </div>
                <p className='text-[11px] text-muted-foreground mt-0.5'>في الوقت المحدد</p>
              </CardContent>
            </Card>

            <Card className='border-border/60'>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between text-muted-foreground mb-1'>
                  <span className='text-xs font-medium'>الطلبات المتأخرة</span>
                  <AlertTriangle className='h-4 w-4 text-amber-500' />
                </div>
                <div className='text-2xl font-bold text-amber-600'>{stats.totalDelayed}</div>
                <p className='text-[11px] text-muted-foreground mt-0.5'>طلب متأخر</p>
              </CardContent>
            </Card>

            <Card className='border-border/60'>
              <CardContent className='p-4'>
                <div className='flex items-center justify-between text-muted-foreground mb-1'>
                  <span className='text-xs font-medium'>متوسط مدة التوصيل</span>
                  <Clock className='h-4 w-4 text-cyan-500' />
                </div>
                <div className='text-2xl font-bold text-cyan-600'>
                  {stats.avgDuration.toFixed(1)} <span className='text-xs font-normal'>دقيقة</span>
                </div>
                <p className='text-[11px] text-muted-foreground mt-0.5'>لكل طلب مكتمل</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content Tabs & Table */}
        {data.length > 0 && (
          <Card>
            <CardHeader className='p-4 border-b'>
              <div className='flex flex-col md:flex-row items-center justify-between gap-4'>
                <div>
                  <CardTitle className='text-lg'>سجل أداء كباتن كيتا في الشفت</CardTitle>
                  <CardDescription>
                    عرض تفصيلي لكل كابتن مع صورته وساعات الاتصال والمهام المكتملة ومعدلات التأخير
                  </CardDescription>
                </div>

                <div className='flex flex-wrap items-center gap-2 w-full md:w-auto'>
                  {/* Vehicle Filters */}
                  <div className='flex items-center bg-muted p-1 rounded-lg'>
                    <Button
                      variant={vehicleFilter === 'all' ? 'default' : 'ghost'}
                      size='sm'
                      onClick={() => setVehicleFilter('all')}
                      className='text-xs h-7'
                    >
                      الكل ({data.length})
                    </Button>
                    <Button
                      variant={vehicleFilter === 'car' ? 'default' : 'ghost'}
                      size='sm'
                      onClick={() => setVehicleFilter('car')}
                      className='text-xs h-7'
                    >
                      سيارات
                    </Button>
                    <Button
                      variant={vehicleFilter === 'bike' ? 'default' : 'ghost'}
                      size='sm'
                      onClick={() => setVehicleFilter('bike')}
                      className='text-xs h-7'
                    >
                      دراجات
                    </Button>
                  </div>

                  {/* Search */}
                  <div className='relative w-full md:w-64'>
                    <Search className='absolute right-3 top-2.5 h-4 w-4 text-muted-foreground' />
                    <Input
                      placeholder='بحث بالمعرف أو الاسم أو الجوال...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className='pr-9 h-9 text-xs'
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className='p-0'>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-muted/40'>
                      <TableHead className='w-12 text-center'>#</TableHead>
                      <TableHead>الكابتن والمعرف</TableHead>
                      <TableHead>نوع المركبة</TableHead>
                      <TableHead>ساعات الشفت</TableHead>
                      <TableHead>ساعات الذروة</TableHead>
                      <TableHead className='text-center'>المقبولة</TableHead>
                      <TableHead className='text-center'>المسلمة</TableHead>
                      <TableHead className='text-center'>نسبة الإنجاز</TableHead>
                      <TableHead className='text-center'>الالتزام بالوقت</TableHead>
                      <TableHead className='text-center'>المتأخرة</TableHead>
                      <TableHead className='text-center'>متوسط التوصيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className='text-center py-8 text-muted-foreground'>
                          لا توجد نتائج مطابقة لبحثك
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((row, idx) => {
                        const completion =
                          row.acceptedTasks > 0
                            ? Math.round((row.deliveredTasks / row.acceptedTasks) * 100)
                            : 0;

                        return (
                          <TableRow key={row.driverId + idx} className='hover:bg-muted/30'>
                            <TableCell className='text-center text-xs text-muted-foreground'>
                              {idx + 1}
                            </TableCell>

                            {/* Driver Profile */}
                            <TableCell>
                              <div className='flex items-center gap-3'>
                                <Avatar className='h-10 w-10 border border-border'>
                                  {row.avatar ? (
                                    <AvatarImage src={row.avatar} alt={row.driverNameEn} />
                                  ) : null}
                                  <AvatarFallback className='bg-emerald-100 text-emerald-800 text-xs font-bold'>
                                    {row.driverNameEn.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className='font-semibold text-sm flex items-center gap-1.5'>
                                    <span>{row.driverNameAr || row.driverNameEn}</span>
                                    {row.driverNameAr && (
                                      <span className='text-[11px] text-muted-foreground font-normal'>
                                        ({row.driverNameEn})
                                      </span>
                                    )}
                                  </div>
                                  <div className='flex items-center gap-2 text-xs text-muted-foreground mt-0.5'>
                                    <Badge
                                      variant='outline'
                                      className='font-mono text-[10px] py-0 px-1.5'
                                    >
                                      {row.driverId}
                                    </Badge>
                                    {row.mobile && <span>📱 {row.mobile}</span>}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Vehicle */}
                            <TableCell>
                              <Badge variant='secondary' className='text-xs gap-1'>
                                {row.vehicleType.toLowerCase().includes('car') ? (
                                  <span>🚗 سيارة</span>
                                ) : (
                                  <span>🛵 دراجة</span>
                                )}
                              </Badge>
                            </TableCell>

                            {/* Shift Hours */}
                            <TableCell>
                              <div className='flex items-center gap-1 font-medium text-xs'>
                                <Clock className='h-3.5 w-3.5 text-muted-foreground' />
                                <span>{row.onlineDurationStr}</span>
                              </div>
                            </TableCell>

                            {/* Peak Hours */}
                            <TableCell>
                              <div className='flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium'>
                                <Flame className='h-3.5 w-3.5' />
                                <span>{row.peakHoursStr}</span>
                              </div>
                            </TableCell>

                            {/* Accepted Tasks */}
                            <TableCell className='text-center font-bold text-foreground'>
                              {row.acceptedTasks}
                            </TableCell>

                            {/* Delivered Tasks */}
                            <TableCell className='text-center'>
                              <Badge
                                variant='outline'
                                className='bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 font-bold'
                              >
                                {row.deliveredTasks}
                              </Badge>
                            </TableCell>

                            {/* Completion % */}
                            <TableCell className='text-center'>
                              <div className='flex flex-col items-center gap-1'>
                                <span
                                  className={`text-xs font-bold ${completion >= 90 ? 'text-emerald-600' : completion >= 80 ? 'text-blue-600' : 'text-amber-600'}`}
                                >
                                  {completion}%
                                </span>
                                <div className='w-14 bg-muted h-1.5 rounded-full overflow-hidden'>
                                  <div
                                    className={`h-full ${completion >= 90 ? 'bg-emerald-500' : completion >= 80 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                    style={{ width: `${completion}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>

                            {/* Punctuality % */}
                            <TableCell className='text-center'>
                              <span className='text-xs font-semibold text-purple-600 dark:text-purple-400'>
                                {(row.punctualityRate * 100).toFixed(1)}%
                              </span>
                            </TableCell>

                            {/* Delayed */}
                            <TableCell className='text-center'>
                              {row.delayedTasks > 0 ? (
                                <Badge variant='destructive' className='text-xs px-2 py-0'>
                                  {row.delayedTasks} متأخر
                                </Badge>
                              ) : (
                                <span className='text-xs text-muted-foreground'>-</span>
                              )}
                            </TableCell>

                            {/* Avg Delivery Duration */}
                            <TableCell className='text-center text-xs font-medium'>
                              {row.avgDeliveryDurationMinutes.toFixed(1)} دقيقة
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
