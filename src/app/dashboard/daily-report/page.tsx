'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter
} from '@/components/ui/table';
import { TableSkeleton } from '@/components/aams/skeletons';
import { Icons } from '@/components/icons';
import { reportApi, settingsApi } from '@/lib/aams/services';
import type { DailyReportResponse } from '@/types/aams';
import { QRCodeImage } from '@/components/aams/employee-codes';
import { Printer, Calendar, TrendingUp, Route, Fuel, Users, Building2, Layers } from 'lucide-react';

function formatArabicDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isToday(dateStr: string): boolean {
  const today = formatDateInput(new Date());
  return dateStr === today;
}

async function downloadExcelFile(url: string, filename: string): Promise<void> {
  const token = localStorage.getItem('access_token');
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  if (!res.ok) throw new Error('فشل التحميل');
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

export default function DailyReportPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateInput(new Date()));
  const [isDownloading, setIsDownloading] = useState(false);

  const { data, isLoading, isFetching } = useQuery<DailyReportResponse>({
    queryKey: ['daily-report', selectedDate],
    queryFn: () => reportApi.getDailyReport(selectedDate),
    refetchInterval: isToday(selectedDate) ? 60_000 : false
  });

  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsApi.getPublic(),
    staleTime: 10 * 60 * 1000
  });

  const brandName = settings?.site_name || 'AAMS LOGISTICS';
  const brandLogo = settings?.logo_url || '/logo.png';

  const goToPrevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatDateInput(d));
  };

  const goToNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(formatDateInput(d));
  };

  const goToToday = () => setSelectedDate(formatDateInput(new Date()));

  const downloadExcel = async () => {
    setIsDownloading(true);
    try {
      await downloadExcelFile(
        `/api/v1/reports/daily/export?date=${encodeURIComponent(selectedDate)}`,
        `التقرير_اليومي_${selectedDate}.xlsx`
      );
    } catch {
      // silent
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 10);
  };

  // Direct scannable URL to immediately open this supervisor daily report
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const directReportUrl = `${origin}/dashboard/daily-report?date=${selectedDate}`;

  return (
    <PageContainer
      pageTitle='تقرير المشرف اليومي'
      pageDescription='ملخص الدوام اليومي ومتابعة المناديب والعمليات'
      pageHeaderAction={
        <div className='no-print flex flex-wrap items-center gap-2'>
          <div className='bg-muted/50 flex items-center gap-1 rounded-xl p-1'>
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={goToPrevDay}
              aria-label='اليوم السابق'
              title='اليوم السابق'
            >
              <Icons.chevronRight className='size-4' />
            </Button>

            <input
              type='date'
              value={selectedDate}
              max={formatDateInput(new Date())}
              onChange={(e) => setSelectedDate(e.target.value)}
              className='border-border hover:border-primary focus:border-primary focus:ring-primary min-w-[130px] rounded-lg border bg-transparent px-2 py-1.5 text-center text-sm font-bold focus:ring-1 focus:outline-none'
            />

            <Button
              variant='ghost'
              size='icon-sm'
              onClick={goToNextDay}
              disabled={isToday(selectedDate)}
              aria-label='اليوم التالي'
              title='اليوم التالي'
            >
              <Icons.chevronLeft className='size-4' />
            </Button>
          </div>

          {!isToday(selectedDate) && (
            <Button variant='link' onClick={goToToday} className='text-xs font-bold whitespace-nowrap'>
              العودة لليوم
            </Button>
          )}

          <Button
            onClick={handlePrint}
            variant='outline'
            className='gap-1.5 text-xs font-bold'
          >
            <Printer className='size-4' />
            طباعة التقرير
          </Button>

          {data && data.rows.length > 0 && (
            <Button
              onClick={downloadExcel}
              disabled={isDownloading}
              className='gap-1.5 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700'
            >
              {isDownloading ? (
                <Icons.spinner className='size-4 animate-spin' />
              ) : (
                <Icons.download className='size-4' />
              )}
              تصدير Excel
            </Button>
          )}
        </div>
      }
    >
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .daily-report-wrapper {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
          .print-border {
            border: 1px solid #cbd5e1 !important;
          }
        }
      `}</style>

      {/* Main Report Container with Center Watermark */}
      <div className='daily-report-wrapper relative overflow-hidden bg-card/60 rounded-2xl border border-border/80 p-5 md:p-7 space-y-6 shadow-xs' dir='rtl'>
        
        {/* Subtle Watermark in Center */}
        {brandLogo && (
          <div className='absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brandLogo}
              alt='Watermark'
              className='w-80 h-80 object-contain opacity-[0.04] dark:opacity-[0.05] grayscale contrast-125 select-none'
            />
          </div>
        )}

        <div className='relative z-10 space-y-6'>
          {/* Executive Header Banner */}
          <div className='rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white p-5 shadow-sm'>
            <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
              
              {/* Brand & Title */}
              <div className='flex items-center gap-4 text-center sm:text-right'>
                {brandLogo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={brandLogo}
                    alt={brandName}
                    className='h-12 w-auto max-w-[50px] object-contain rounded-md bg-white/10 p-1 shrink-0'
                  />
                )}
                <div>
                  <h1 className='text-xl font-black tracking-wide text-white'>
                    {brandName}
                  </h1>
                  <div className='flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1'>
                    <span className='text-xs font-bold text-amber-400 bg-amber-400/15 px-2 py-0.5 rounded-md border border-amber-400/30'>
                      تقرير المشرف اليومي
                    </span>
                    <span className='text-xs text-slate-300 font-medium flex items-center gap-1'>
                      <Calendar className='size-3.5 text-blue-400' />
                      {formatArabicDate(selectedDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scannable QR Code */}
              <div className='flex items-center gap-2.5 bg-white/10 border border-white/20 rounded-xl p-2 shrink-0'>
                <div className='bg-white p-1 rounded-lg shadow-xs'>
                  <QRCodeImage value={directReportUrl} size={58} />
                </div>
                <div className='text-right leading-tight pr-1'>
                  <span className='text-[10px] font-mono text-slate-300 block'>DATE: {selectedDate}</span>
                  <span className='text-[9px] font-mono text-amber-300 block'>DAILY SHIFT REPORT</span>
                </div>
              </div>

            </div>
          </div>

          {isLoading || isFetching ? (
            <TableSkeleton rows={6} />
          ) : !data || data.rows.length === 0 ? (
            <Card className='p-12 text-center border-dashed'>
              <CardContent className='text-muted-foreground p-0 space-y-2'>
                <Calendar className='size-10 mx-auto text-muted-foreground/40' />
                <p className='text-base font-bold text-foreground'>لا توجد بيانات دوام مسجلة لهذا اليوم</p>
                <p className='text-xs font-mono text-muted-foreground'>({selectedDate})</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary Metric Cards */}
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <div className='bg-card rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex items-center gap-3.5'>
                  <div className='size-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0'>
                    <TrendingUp className='size-5' />
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground font-semibold'>إجمالي الطلبات</p>
                    <p className='text-xl font-black text-foreground font-mono tabular-nums mt-0.5'>
                      {data.total_orders.toLocaleString('ar-SA')}
                    </p>
                  </div>
                </div>

                <div className='bg-card rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex items-center gap-3.5'>
                  <div className='size-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0'>
                    <Route className='size-5' />
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground font-semibold'>إجمالي المسافة</p>
                    <p className='text-xl font-black text-foreground font-mono tabular-nums mt-0.5'>
                      {data.total_km.toFixed(1)} <span className='text-xs font-normal text-muted-foreground'>كم</span>
                    </p>
                  </div>
                </div>

                <div className='bg-card rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex items-center gap-3.5'>
                  <div className='size-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0'>
                    <Fuel className='size-5' />
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground font-semibold'>إجمالي الوقود</p>
                    <p className='text-xl font-black text-foreground font-mono tabular-nums mt-0.5'>
                      {data.total_fuel.toFixed(2)} <span className='text-xs font-normal text-muted-foreground'>ريال</span>
                    </p>
                  </div>
                </div>

                <div className='bg-card rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex items-center gap-3.5'>
                  <div className='size-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0'>
                    <Users className='size-5' />
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground font-semibold'>عدد المناديب</p>
                    <p className='text-xl font-black text-foreground font-mono tabular-nums mt-0.5'>
                      {data.rows.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Employees Table */}
              <Card className='overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xs'>
                <CardHeader className='py-3.5 px-4 bg-muted/40 border-b border-border flex flex-row items-center justify-between'>
                  <CardTitle className='text-sm font-bold flex items-center gap-2'>
                    <Users className='size-4 text-primary' />
                    تفاصيل دوام المناديب ({data.rows.length} مندوب)
                  </CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  <div className='overflow-x-auto'>
                    <Table>
                      <TableHeader className='bg-muted/20'>
                        <TableRow>
                          <TableHead className='font-bold text-xs'>الموظف</TableHead>
                          <TableHead className='font-bold text-xs text-center'>الفرع</TableHead>
                          <TableHead className='font-bold text-xs text-center'>التطبيق</TableHead>
                          <TableHead className='font-bold text-xs text-center'>الكيلومترات</TableHead>
                          <TableHead className='font-bold text-xs text-center'>الطلبات</TableHead>
                          <TableHead className='font-bold text-xs text-center'>الوقود</TableHead>
                          <TableHead className='font-bold text-xs text-center'>الشفتات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.rows.map((row) => (
                          <TableRow key={`${row.employee_id}-${row.app_type}`} className='hover:bg-muted/30'>
                            <TableCell className='font-bold text-sm text-foreground'>
                              {row.employee_name}
                            </TableCell>
                            <TableCell className='text-center'>
                              {row.branch_name ? (
                                <Badge variant='outline' className='text-[10px] font-semibold'>
                                  <Building2 className='size-2.5 mr-1 text-muted-foreground inline' />
                                  {row.branch_name}
                                </Badge>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className='text-center'>
                              <span className='bg-primary/10 text-primary border border-primary/20 rounded-md px-2 py-0.5 text-xs font-bold'>
                                {row.app_name || row.app_type || '—'}
                              </span>
                            </TableCell>
                            <TableCell className='text-center font-mono tabular-nums text-sm'>
                              {row.total_km.toFixed(1)} كم
                            </TableCell>
                            <TableCell className='text-center font-mono tabular-nums font-black text-sm text-emerald-600 dark:text-emerald-400'>
                              {row.total_orders}
                            </TableCell>
                            <TableCell className='text-center font-mono tabular-nums text-sm'>
                              {row.total_fuel.toFixed(2)}
                            </TableCell>
                            <TableCell className='text-center font-mono tabular-nums text-xs font-bold'>
                              {row.sessions_count}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter className='bg-muted/40 font-bold'>
                        <TableRow>
                          <TableCell colSpan={3} className='text-right font-black'>الإجمالي العام:</TableCell>
                          <TableCell className='text-center font-mono font-black'>{data.total_km.toFixed(1)} كم</TableCell>
                          <TableCell className='text-center font-mono font-black text-emerald-600 dark:text-emerald-400'>{data.total_orders}</TableCell>
                          <TableCell className='text-center font-mono font-black'>{data.total_fuel.toFixed(2)}</TableCell>
                          <TableCell className='text-center font-mono font-black'>{data.rows.reduce((acc, r) => acc + (r.sessions_count || 0), 0)}</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Per-App Summary Table */}
              {data.app_summaries.length > 0 && (
                <Card className='overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xs'>
                  <CardHeader className='py-3.5 px-4 bg-muted/40 border-b border-border'>
                    <CardTitle className='text-sm font-bold flex items-center gap-2'>
                      <Layers className='size-4 text-primary' />
                      ملخص توزيع التطبيقات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='p-0'>
                    <div className='overflow-x-auto'>
                      <Table>
                        <TableHeader className='bg-muted/20'>
                          <TableRow>
                            <TableHead className='font-bold text-xs'>التطبيق</TableHead>
                            <TableHead className='font-bold text-xs text-center'>عدد المناديب</TableHead>
                            <TableHead className='font-bold text-xs text-center'>إجمالي الطلبات</TableHead>
                            <TableHead className='font-bold text-xs text-center'>إجمالي الكيلومترات</TableHead>
                            <TableHead className='font-bold text-xs text-center'>إجمالي الوقود</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.app_summaries.map((s) => (
                            <TableRow key={s.app_type} className='hover:bg-muted/30'>
                              <TableCell className='font-bold text-sm'>
                                <span className='bg-primary/10 text-primary border border-primary/20 rounded-md px-2 py-0.5 text-xs font-black'>
                                  {s.app_name || s.app_type || 'غير محدد'}
                                </span>
                              </TableCell>
                              <TableCell className='text-center font-mono tabular-nums font-bold text-sm'>{s.count}</TableCell>
                              <TableCell className='text-center font-mono tabular-nums font-black text-sm text-emerald-600 dark:text-emerald-400'>{s.total_orders}</TableCell>
                              <TableCell className='text-center font-mono tabular-nums text-sm'>
                                {s.total_km.toFixed(1)} كم
                              </TableCell>
                              <TableCell className='text-center font-mono tabular-nums text-sm'>
                                {s.total_fuel.toFixed(2)} ريال
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
