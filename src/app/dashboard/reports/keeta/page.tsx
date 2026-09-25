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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

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
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');
  const [fileName, setFileName] = useState<string>('');
  const [reportDate, setReportDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [vehicleFilter, setVehicleFilter] = useState<'all' | 'car' | 'bike'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load saved reports from database API
  const loadSavedKeetaReports = React.useCallback(async (filterDate?: string) => {
    try {
      setIsLoading(true);
      const url =
        filterDate && filterDate !== 'ALL'
          ? `/api/reports/keeta?date=${encodeURIComponent(filterDate)}`
          : '/api/reports/keeta';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.availableDates) {
          setAvailableDates(json.availableDates);
        }
        if (json.records && Array.isArray(json.records) && json.records.length > 0) {
          setData(json.records);
          setReportDate(json.date || json.latestDate || '');
        }
      }
    } catch (err) {
      console.error('Failed to load saved keeta reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSavedKeetaReports();
  }, [loadSavedKeetaReports]);

  // Handle Date Filter Change
  const handleDateFilterChange = (dateVal: any) => {
    const val = dateVal || 'ALL';
    setSelectedDateFilter(val);
    if (val === 'ALL') {
      loadSavedKeetaReports();
    } else {
      loadSavedKeetaReports(val);
    }
  };

  // Build lookup map from Keeta seed
  const captainMap = useMemo(() => {
    const map = new Map<string, (typeof keetaSeedData)[0]>();
    keetaSeedData.forEach((item) => {
      map.set(item.keeta_id, item);
    });
    return map;
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    processExcelFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files
      ? Array.from(e.dataTransfer.files).filter(
          (f) => f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
        )
      : [];
    if (!files.length) {
      toast.error('يرجى اختيار ملفات Excel بصيغة .xlsx أو .xls');
      return;
    }
    processExcelFiles(files);
  };

  const processExcelFiles = async (files: File[]) => {
    setIsLoading(true);
    let allNewDates: string[] = [];
    let lastParsedRows: KeetaRow[] = [];
    let lastDetectedDate = '';
    let totalCaptainsProcessed = 0;
    let successfulFiles = 0;

    setFileName(
      files.length === 1 ? files[0].name : `${files.length} ملفات مرفوعة (أحدثها: ${files[0].name})`
    );

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Fix Keeta export range limitation
        if (sheet && !sheet['!ref']?.includes(':AB')) {
          sheet['!ref'] = 'A1:AB100';
        }

        const rows: any[] = XLSX.utils.sheet_to_json(sheet);
        if (!rows || rows.length === 0) continue;

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
          const punctualityRaw =
            r['تجربة التوصيل_نسبة الطلبات التي تم تسليمها في الوقت المحدد (D)'];
          const punctuality =
            punctualityRaw !== undefined && punctualityRaw !== '' && punctualityRaw !== null
              ? Number(punctualityRaw)
              : null;
          const avgDeliveryRaw = r['تجربة التوصيل_متوسط مدة التوصيل لكل طلب مكتمل'];
          const avgDelivery =
            avgDeliveryRaw !== undefined && avgDeliveryRaw !== '' && avgDeliveryRaw !== null
              ? Number(avgDeliveryRaw)
              : null;

          parsedRows.push({
            date: dateVal,
            driverId: rawId,
            driverNameEn: seedInfo?.name_en || combinedNameEn,
            driverNameAr: seedInfo?.name_ar,
            vehicleType: String(r['نوع المركبة'] || 'دراجة'),
            onlineDurationStr: String(
              r['فترة الوردية_وقت اتصال السائقين عبر تطبيق السائق.'] || '-'
            ),
            peakHoursStr: String(r['فترة الوردية_ساعات الاتصال في وقت الذروة'] || '-'),
            acceptedTasks: accepted,
            deliveredTasks: delivered,
            rejectedTasks: rejected,
            punctualityRate: punctuality as any,
            avgDeliveryDurationMinutes: avgDelivery as any,
            delayedTasks: delayed,
            veryDelayedTasks: veryDelayed,
            avatar: seedInfo?.avatar,
            mobile: seedInfo?.mobile
          });
        });

        if (parsedRows.length > 0) {
          const fileDate = detectedDate || new Date().toISOString().split('T')[0];
          if (!allNewDates.includes(fileDate)) {
            allNewDates.push(fileDate);
          }
          lastParsedRows = parsedRows;
          lastDetectedDate = fileDate;
          totalCaptainsProcessed += parsedRows.length;
          successfulFiles++;

          // 1. Save to database API
          try {
            await fetch('/api/reports/keeta', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: file.name,
                reportDate: fileDate,
                records: parsedRows
              })
            });
          } catch (dbErr) {
            console.error(`Failed to post ${file.name} to /api/reports/keeta:`, dbErr);
          }

          // 2. Also sync to Target API
          saveDailyReportsBatch(
            parsedRows.map((r) => ({
              date: r.date || fileDate,
              app: 'KEETA',
              identifier: r.driverId,
              captainName: r.driverNameAr || r.driverNameEn,
              deliveredOrders: r.deliveredTasks,
              totalOrders: r.acceptedTasks,
              onlineDurationStr: r.onlineDurationStr,
              delayedOrders: r.delayedTasks,
              punctualityRate: r.punctualityRate ?? undefined,
              avgDeliveryMinutes: r.avgDeliveryDurationMinutes ?? undefined
            })),
            file.name
          );
        }
      } catch (fileErr) {
        console.error(`Error processing file ${file.name}:`, fileErr);
      }
    }

    if (successfulFiles > 0) {
      setAvailableDates((prev) => {
        const combined = Array.from(new Set([...allNewDates, ...prev])).filter(Boolean);
        return combined.sort().reverse();
      });

      if (lastDetectedDate) {
        setReportDate(lastDetectedDate);
        setSelectedDateFilter(lastDetectedDate);
        setData(lastParsedRows);
      }

      toast.success(
        files.length === 1
          ? `تم حفظ تقرير كيتا بنجاح (${totalCaptainsProcessed} كابتن)`
          : `تم قراءة وحفظ ${successfulFiles} ملفات كيتا بنجاح في قاعدة البيانات (${totalCaptainsProcessed} سجل)`
      );
    } else {
      toast.error('لم يتم العثور على بيانات صالحة في الملفات المحددة');
    }

    setIsLoading(false);
  };

  // KPIs
  const stats = useMemo(() => {
    const totalDrivers = data.length;
    const totalAccepted = data.reduce((sum, r) => sum + (Number(r.acceptedTasks) || 0), 0);
    const totalDelivered = data.reduce((sum, r) => sum + (Number(r.deliveredTasks) || 0), 0);
    const totalRejected = data.reduce((sum, r) => sum + (Number(r.rejectedTasks) || 0), 0);
    const totalDelayed = data.reduce((sum, r) => sum + (Number(r.delayedTasks) || 0), 0);

    const completionRate = totalAccepted > 0 ? (totalDelivered / totalAccepted) * 100 : 0;

    const driversWithDuration = data.filter(
      (r) =>
        r.avgDeliveryDurationMinutes !== null &&
        r.avgDeliveryDurationMinutes !== undefined &&
        Number(r.avgDeliveryDurationMinutes) > 0
    );
    const avgDuration =
      driversWithDuration.length > 0
        ? driversWithDuration.reduce((sum, r) => sum + Number(r.avgDeliveryDurationMinutes), 0) /
          driversWithDuration.length
        : 0;

    const driversWithPunctuality = data.filter(
      (r) => r.punctualityRate !== null && r.punctualityRate !== undefined
    );
    const avgPunctuality =
      driversWithPunctuality.length > 0
        ? (driversWithPunctuality.reduce((sum, r) => sum + Number(r.punctualityRate), 0) /
            driversWithPunctuality.length) *
          100
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
    const query = (searchTerm || '').trim().toLowerCase();
    return data.filter((row) => {
      const driverIdStr = String(row.driverId || '').trim();
      const nameEnStr = String(row.driverNameEn || '').toLowerCase();
      const nameArStr = String(row.driverNameAr || '').toLowerCase();
      const mobileStr = String(row.mobile || '').trim();

      const matchSearch =
        !query ||
        driverIdStr.includes(query) ||
        nameEnStr.includes(query) ||
        nameArStr.includes(query) ||
        mobileStr.includes(query);

      const vType = String(row.vehicleType || '').toLowerCase();
      const isCar = vType.includes('car') || vType.includes('سيارة');

      let matchVehicle = true;
      if (vehicleFilter === 'car') {
        matchVehicle = isCar;
      } else if (vehicleFilter === 'bike') {
        matchVehicle = !isCar;
      }

      return matchSearch && matchVehicle;
    });
  }, [data, searchTerm, vehicleFilter]);

  const handleExportSummary = () => {
    if (data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(
      data.map((d) => ({
        'معرّف السائق': d.driverId || '',
        'الاسم بالعربي': d.driverNameAr || '',
        'الاسم بالإنجليزي': d.driverNameEn || '',
        'رقم الجوال': d.mobile || '',
        'نوع المركبة': d.vehicleType || '',
        'ساعات الاتصال': d.onlineDurationStr || '',
        'ساعات الذروة': d.peakHoursStr || '',
        'المهام المقبولة': Number(d.acceptedTasks) || 0,
        'المهام المسلمة': Number(d.deliveredTasks) || 0,
        'المهام المرفوضة': Number(d.rejectedTasks) || 0,
        'المهام المتأخرة': Number(d.delayedTasks) || 0,
        'نسبة التسليم بالوقت المحدد %':
          d.punctualityRate !== null && d.punctualityRate !== undefined
            ? `${(Number(d.punctualityRate) * 100).toFixed(1)}%`
            : '-',
        'متوسط وقت التوصيل (دقيقة)':
          d.avgDeliveryDurationMinutes !== null && d.avgDeliveryDurationMinutes !== undefined
            ? Number(d.avgDeliveryDurationMinutes).toFixed(1)
            : '-'
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
              <span>رفع ملفات كيتا (Excel)</span>
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
            <h3 className='font-semibold text-lg mb-1'>
              اسحب وأفلت تقارير كيتا (Excel) هنا (ملف واحد أو عدة ملفات)
            </h3>
            <p className='text-sm text-muted-foreground mb-4 max-w-md'>
              يدعم رفع أكثر من ملف في وقت واحد، حيث يتم حفظ كل ملف بتاريخه تلقائياً في قاعدة البيانات
            </p>

            <div className='flex items-center gap-3'>
              <input
                id='keeta-excel-upload'
                type='file'
                accept='.xlsx, .xls'
                multiple
                className='hidden'
                onChange={handleFileUpload}
                disabled={isLoading}
              />
              <label
                htmlFor='keeta-excel-upload'
                className='inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background px-4 py-2 text-sm cursor-pointer gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              >
                <Upload className='h-4 w-4' />
                <span>
                  {isLoading ? 'جاري التحميل والمعالجة...' : 'اختر ملف أو عدة ملفات من جهازك'}
                </span>
              </label>
            </div>

            {fileName && (
              <div className='mt-4 flex flex-wrap items-center justify-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800'>
                <FileSpreadsheet className='h-3.5 w-3.5' />
                <span>
                  الملف الحالي: <strong>{fileName}</strong>
                </span>
                {reportDate && <span>(تاريخ: {reportDate})</span>}
                <span>({data.length} كابتن)</span>
                <Badge className='bg-emerald-600 text-white text-[10px] py-0 px-1.5 gap-1'>
                  <CheckCircle2 className='size-2.5' />
                  <span>محفوظ في الداتابيز</span>
                </Badge>
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
                  نسبة الإنجاز: {(Number(stats.completionRate) || 0).toFixed(1)}%
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
                  {(Number(stats.avgPunctuality) || 0).toFixed(1)}%
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
                  {(Number(stats.avgDuration) || 0).toFixed(1)}{' '}
                  <span className='text-xs font-normal'>دقيقة</span>
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
                  {/* Date Filter */}
                  {availableDates.length > 0 && (
                    <div className='flex items-center gap-1.5'>
                      <Clock className='size-3.5 text-muted-foreground' />
                      <Select
                        value={selectedDateFilter || 'ALL'}
                        onValueChange={handleDateFilterChange}
                      >
                        <SelectTrigger className='h-8 w-36 text-xs font-mono'>
                          <SelectValue placeholder='تصفية باليوم' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='ALL'>أحدث تقرير</SelectItem>
                          {availableDates.filter(Boolean).map((d) => (
                            <SelectItem key={d} value={d} className='font-mono'>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

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
                  <div className='relative w-full md:w-60'>
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
                        const accepted = Number(row.acceptedTasks) || 0;
                        const delivered = Number(row.deliveredTasks) || 0;
                        const completion =
                          accepted > 0 ? Math.round((delivered / accepted) * 100) : 0;

                        const driverId = String(row.driverId || '');
                        const nameEn = String(row.driverNameEn || '').trim();
                        const nameAr = String(row.driverNameAr || '').trim();
                        const displayName = nameAr || nameEn || `كابتن ${driverId}`;
                        const initials = (nameEn || nameAr || driverId || 'KT')
                          .slice(0, 2)
                          .toUpperCase();

                        const vType = String(row.vehicleType || '').toLowerCase();
                        const isCar = vType.includes('car') || vType.includes('سيارة');

                        return (
                          <TableRow key={driverId + '_' + idx} className='hover:bg-muted/30'>
                            <TableCell className='text-center text-xs text-muted-foreground'>
                              {idx + 1}
                            </TableCell>

                            {/* Driver Profile */}
                            <TableCell>
                              <div className='flex items-center gap-3'>
                                <Avatar className='h-10 w-10 border border-border'>
                                  {row.avatar ? (
                                    <AvatarImage src={row.avatar} alt={displayName} />
                                  ) : null}
                                  <AvatarFallback className='bg-emerald-100 text-emerald-800 text-xs font-bold'>
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className='font-semibold text-sm flex items-center gap-1.5'>
                                    <span>{displayName}</span>
                                    {nameAr && nameEn && (
                                      <span className='text-[11px] text-muted-foreground font-normal'>
                                        ({nameEn})
                                      </span>
                                    )}
                                  </div>
                                  <div className='flex items-center gap-2 text-xs text-muted-foreground mt-0.5'>
                                    <Badge
                                      variant='outline'
                                      className='font-mono text-[10px] py-0 px-1.5'
                                    >
                                      {driverId}
                                    </Badge>
                                    {row.mobile && <span>📱 {row.mobile}</span>}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Vehicle */}
                            <TableCell>
                              <Badge variant='secondary' className='text-xs gap-1'>
                                {isCar ? <span>🚗 سيارة</span> : <span>🛵 دراجة</span>}
                              </Badge>
                            </TableCell>

                            {/* Shift Hours */}
                            <TableCell>
                              <div className='flex items-center gap-1 font-medium text-xs'>
                                <Clock className='h-3.5 w-3.5 text-muted-foreground' />
                                <span>{row.onlineDurationStr || '-'}</span>
                              </div>
                            </TableCell>

                            {/* Peak Hours */}
                            <TableCell>
                              <div className='flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium'>
                                <Flame className='h-3.5 w-3.5' />
                                <span>{row.peakHoursStr || '-'}</span>
                              </div>
                            </TableCell>

                            {/* Accepted Tasks */}
                            <TableCell className='text-center font-bold text-foreground'>
                              {accepted}
                            </TableCell>

                            {/* Delivered Tasks */}
                            <TableCell className='text-center'>
                              <Badge
                                variant='outline'
                                className='bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 font-bold'
                              >
                                {delivered}
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
                                    style={{ width: `${Math.min(100, completion)}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>

                            {/* Punctuality % */}
                            <TableCell className='text-center'>
                              <span className='text-xs font-semibold text-purple-600 dark:text-purple-400'>
                                {row.punctualityRate !== null && row.punctualityRate !== undefined
                                  ? `${(Number(row.punctualityRate) * 100).toFixed(1)}%`
                                  : '-'}
                              </span>
                            </TableCell>

                            {/* Delayed */}
                            <TableCell className='text-center'>
                              {Number(row.delayedTasks) > 0 ? (
                                <Badge variant='destructive' className='text-xs px-2 py-0'>
                                  {row.delayedTasks} متأخر
                                </Badge>
                              ) : (
                                <span className='text-xs text-muted-foreground'>-</span>
                              )}
                            </TableCell>

                            {/* Avg Delivery Duration */}
                            <TableCell className='text-center text-xs font-medium'>
                              {row.avgDeliveryDurationMinutes !== null &&
                              row.avgDeliveryDurationMinutes !== undefined
                                ? `${Number(row.avgDeliveryDurationMinutes).toFixed(1)} دقيقة`
                                : '-'}
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
