'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { reportApi } from '@/lib/aams/services';
import type { WorkSessionDetail } from '@/types/aams';
import { TableSkeleton } from '@/components/aams/skeletons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import PageContainer from '@/components/layout/page-container';
import { formatRiyadh } from '@/lib/aams/riyadh-time';
import { Eye, CheckCircle2, FileText, ArrowLeft, Navigation, Package, Fuel } from 'lucide-react';

import { useLocale } from '@/components/layout/locale-provider';

function getTodayStr() {
  return formatRiyadh(new Date(), 'yyyy-MM-dd');
}

export default function FinishedEmployeesPage() {
  const router = useRouter();
  const { t, locale, dir } = useLocale();
  const today = getTodayStr();

  const { data, isLoading } = useOfflineQuery({
    queryKey: ['employees-finished', today],
    queryFn: () => reportApi.getReports({ start_date: today, end_date: today, limit: 200 }),
    staleTime: 1000 * 60,
    refetchOnMount: true,
    cacheKey: 'employees_finished'
  });

  const finishedEmployees = useMemo(() => {
    const allSessions = (data?.data as WorkSessionDetail[]) || [];
    // Set of employees who currently have an active session in the field
    const activeEmployeeIds = new Set(
      allSessions.filter((s) => s.status === 'ACTIVE').map((s) => s.employee_id)
    );

    // Filter to completed sessions of employees who are not currently active
    const completedSessions = allSessions.filter(
      (s) => s.status === 'COMPLETED' && !activeEmployeeIds.has(s.employee_id)
    );

    // Group by employee_id: 1 row per driver
    const employeeMap = new Map<
      string,
      {
        employee_id: string;
        employee_name: string;
        motorcycle_number: string;
        application_id?: string;
        application_type?: string;
        shift_count: number;
        earliest_start: string;
        latest_end: string;
        total_orders: number;
        total_distance: number;
        total_fuel: number;
        last_session_id: string;
      }
    >();

    completedSessions.forEach((s) => {
      const empId = s.employee_id;
      if (!empId) return;

      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, {
          employee_id: empId,
          employee_name: s.employee_name || '—',
          motorcycle_number: s.motorcycle_number || '—',
          application_id: s.application_id,
          application_type: s.application_type,
          shift_count: 1,
          earliest_start: s.start_time,
          latest_end: s.end_time || s.start_time,
          total_orders: s.orders_count || 0,
          total_distance: s.distance || 0,
          total_fuel: s.fuel_cost || 0,
          last_session_id: s.id
        });
      } else {
        const item = employeeMap.get(empId)!;
        item.shift_count += 1;
        item.total_orders += s.orders_count || 0;
        item.total_distance += s.distance || 0;
        item.total_fuel += s.fuel_cost || 0;

        if (
          s.start_time &&
          (!item.earliest_start || new Date(s.start_time) < new Date(item.earliest_start))
        ) {
          item.earliest_start = s.start_time;
        }
        if (s.end_time && (!item.latest_end || new Date(s.end_time) > new Date(item.latest_end))) {
          item.latest_end = s.end_time;
          item.last_session_id = s.id;
        }
      }
    });

    return Array.from(employeeMap.values()).sort((a, b) =>
      a.employee_name.localeCompare(b.employee_name, 'ar')
    );
  }, [data?.data]);

  const totals = useMemo(() => {
    const t = { orders: 0, distance: 0, fuel: 0 };
    finishedEmployees.forEach((emp) => {
      t.orders += emp.total_orders || 0;
      t.distance += emp.total_distance || 0;
      t.fuel += emp.total_fuel || 0;
    });
    return t;
  }, [finishedEmployees]);

  return (
    <PageContainer>
      <div className='space-y-6' dir={dir}>
        <PageHeader
          category={t('Employees')}
          title={t('Finished Shift')}
          description={t('المناديب الذين أكملوا الدوام اليوم')}
        />

        {/* Summary cards */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          <Card className='border-border bg-muted/50'>
            <CardContent className='flex items-center gap-4 p-4'>
              <div className='flex size-12 items-center justify-center rounded-2xl bg-muted text-foreground'>
                <CheckCircle2 className='size-6 text-emerald-500' />
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>{t('أكملوا الشفت')}</p>
                <p className='text-2xl font-bold tabular-nums'>
                  {isLoading ? '...' : finishedEmployees.length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className='border-border bg-muted/50'>
            <CardContent className='flex items-center gap-4 p-4'>
              <div className='flex size-12 items-center justify-center rounded-2xl bg-muted text-foreground'>
                <Package className='size-6 text-blue-500' />
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>{t('Total Orders')}</p>
                <p className='text-2xl font-bold tabular-nums'>
                  {isLoading
                    ? '...'
                    : totals.orders.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className='border-border bg-muted/50'>
            <CardContent className='flex items-center gap-4 p-4'>
              <div className='flex size-12 items-center justify-center rounded-2xl bg-muted text-foreground'>
                <Navigation className='size-6 text-amber-500' />
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>{t('إجمالي المسافة (كم)')}</p>
                <p className='text-2xl font-bold tabular-nums'>
                  {isLoading
                    ? '...'
                    : totals.distance.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : !finishedEmployees.length ? (
          <Card className='p-10 md:p-14 text-center'>
            <div className='mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
              <FileText className='size-8' />
            </div>
            <CardTitle className='text-lg'>{t('لا يوجد مناديب أنهوا الدوام اليوم')}</CardTitle>
            <CardDescription className='mt-1.5 max-w-xs mx-auto'>
              {t('لم يقم أي مندوب بإنهاء شفت العمل لليوم بعد.')}
            </CardDescription>
          </Card>
        ) : (
          <Card className='overflow-hidden'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='text-start'>{t('Employee')}</TableHead>
                  <TableHead className='text-center'>{t('Start Date')}</TableHead>
                  <TableHead className='text-center'>{t('End Date')}</TableHead>
                  <TableHead className='text-center'>{t('Orders')}</TableHead>
                  <TableHead className='text-center'>
                    {t('Distance')} ({t('KM')})
                  </TableHead>
                  <TableHead className='text-center'>
                    {t('Fuel Cost')} ({t('SAR')})
                  </TableHead>
                  <TableHead className='text-center'>{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finishedEmployees.map((emp) => (
                  <TableRow key={emp.employee_id}>
                    <TableCell className='font-bold'>
                      <div className='flex items-center gap-2'>
                        <span>{emp.employee_name}</span>
                        {emp.shift_count > 1 && (
                          <Badge
                            variant='secondary'
                            className='text-[10px] font-mono px-1.5 py-0 bg-primary/10 text-primary border border-primary/20'
                          >
                            {emp.shift_count} شفتات
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='text-center font-mono tabular-nums text-muted-foreground'>
                      {emp.earliest_start ? formatRiyadh(emp.earliest_start, 'hh:mm a') : '-'}
                    </TableCell>
                    <TableCell className='text-center font-mono tabular-nums text-muted-foreground'>
                      {emp.latest_end ? formatRiyadh(emp.latest_end, 'hh:mm a') : '-'}
                    </TableCell>
                    <TableCell className='text-center font-mono tabular-nums font-bold'>
                      {emp.total_orders || 0}
                    </TableCell>
                    <TableCell className='text-center font-mono tabular-nums font-bold'>
                      {emp.total_distance ? emp.total_distance.toFixed(1) : '0'}
                    </TableCell>
                    <TableCell className='text-center font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400'>
                      {emp.total_fuel || 0}
                    </TableCell>
                    <TableCell className='text-center'>
                      <Link
                        href={`/dashboard/employees/${emp.employee_id}`}
                        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5')}
                      >
                        <Eye className='size-4' />
                        {t('Details')}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
