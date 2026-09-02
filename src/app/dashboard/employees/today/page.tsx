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
import { Eye, Bike, FileText, ArrowLeft, Users } from 'lucide-react';

import { useLocale } from '@/components/layout/locale-provider';

function getTodayStr() {
  return formatRiyadh(new Date(), 'yyyy-MM-dd');
}

export default function TodayEmployeesPage() {
  const router = useRouter();
  const { t, locale, dir } = useLocale();
  const today = getTodayStr();

  const { data, isLoading } = useOfflineQuery({
    queryKey: ['employees-today', today],
    queryFn: () => reportApi.getReports({ start_date: today, end_date: today, limit: 200 }),
    staleTime: 5 * 1000,
    refetchInterval: 8 * 1000,
    refetchOnMount: true,
    cacheKey: 'employees_today'
  });

  const todayEmployees = useMemo(() => {
    const sessions = (data?.data as WorkSessionDetail[]) || [];
    const seen = new Map<string, WorkSessionDetail>();
    sessions.forEach((s) => {
      if (!seen.has(s.employee_id)) {
        seen.set(s.employee_id, s);
      }
    });
    return Array.from(seen.values()).sort((a, b) =>
      (a.employee_name || '').localeCompare(b.employee_name || '', 'ar')
    );
  }, [data?.data]);

  return (
    <PageContainer>
      <div className='space-y-6' dir={dir}>
        <PageHeader
          category={t('Employees')}
          title={t("Today's Shifts")}
          description={t('المناديب الذين بدأوا شفت عمل اليوم')}
        />

        <Card className='border-primary/20 bg-primary/5'>
          <CardContent className='flex items-center gap-4 p-4'>
            <div className='flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary'>
              <Users className='size-6' />
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>{t('إجمالي مناديب اليوم')}</p>
              <p className='text-2xl font-bold tabular-nums'>
                {isLoading ? '...' : todayEmployees.length}
              </p>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : !todayEmployees.length ? (
          <Card className='p-10 md:p-14 text-center'>
            <div className='mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
              <FileText className='size-8' />
            </div>
            <CardTitle className='text-lg'>{t('لا يوجد شفتات مسجلة اليوم')}</CardTitle>
            <CardDescription className='mt-1.5 max-w-xs mx-auto'>
              {t('لم يتم تسجيل أي شفت عمل حتى الآن اليوم.')}
            </CardDescription>
            <Link
              href='/dashboard/work/start'
              className={cn(
                buttonVariants({ variant: 'default', size: 'lg' }),
                'mt-6 h-11 font-bold gap-2'
              )}
            >
              {t('بدء شفت جديد')}
            </Link>
          </Card>
        ) : (
          <Card className='overflow-hidden'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='text-start'>{t('Employee')}</TableHead>
                  <TableHead className='text-center'>{t('Status')}</TableHead>
                  <TableHead className='text-center'>{t('Start Date')}</TableHead>
                  <TableHead className='text-center'>{t('Orders')}</TableHead>
                  <TableHead className='text-center'>
                    {t('Distance')} ({t('KM')})
                  </TableHead>
                  <TableHead className='text-center'>{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayEmployees.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className='font-bold'>{s.employee_name || '-'}</TableCell>
                    <TableCell className='text-center'>
                      <Badge
                        variant={s.status === 'ACTIVE' ? 'default' : 'secondary'}
                        className='font-bold'
                      >
                        {s.status === 'ACTIVE' ? t('Working Now') : t('Completed')}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-center font-mono tabular-nums text-muted-foreground'>
                      {s.start_time ? formatRiyadh(s.start_time, 'hh:mm a') : '-'}
                    </TableCell>
                    <TableCell className='text-center font-mono tabular-nums font-bold'>
                      {s.orders_count || 0}
                    </TableCell>
                    <TableCell className='text-center font-mono tabular-nums font-bold'>
                      {s.distance ? s.distance.toFixed(1) : '0'}
                    </TableCell>
                    <TableCell className='text-center'>
                      <Link
                        href={`/dashboard/employees/${s.employee_id}`}
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
