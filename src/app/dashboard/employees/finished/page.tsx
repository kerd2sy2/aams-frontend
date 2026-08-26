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
  TableCell,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import PageContainer from '@/components/layout/page-container';
import { formatRiyadh } from '@/lib/aams/riyadh-time';
import {
  Eye,
  CheckCircle2,
  FileText,
  ArrowLeft,
  Navigation,
  Package,
  Fuel,
} from 'lucide-react';

function getTodayStr() {
  return formatRiyadh(new Date(), 'yyyy-MM-dd');
}

export default function FinishedEmployeesPage() {
  const router = useRouter();
  const today = getTodayStr();

  const { data, isLoading } = useOfflineQuery({
    queryKey: ['employees-finished', today],
    queryFn: () => reportApi.getReports({ start_date: today, end_date: today, limit: 200 }),
    staleTime: 1000 * 60,
    refetchOnMount: true,
    cacheKey: 'employees_finished',
  });

  const finishedEmployees = useMemo(() => {
    const sessions = ((data?.data as WorkSessionDetail[]) || []).filter((s) => s.status === 'COMPLETED');
    return sessions.sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || '', 'ar'));
  }, [data?.data]);

  const totals = useMemo(() => {
    const t = { orders: 0, distance: 0, fuel: 0 };
    finishedEmployees.forEach((s) => {
      t.orders += s.orders_count || 0;
      t.distance += s.distance || 0;
      t.fuel += s.fuel_cost || 0;
    });
    return t;
  }, [finishedEmployees]);

  return (
    <PageContainer>
      <div className="space-y-6" dir="rtl">
        <PageHeader
          category="المناديب"
          title="المنتهي دوامهم"
          description="المناديب الذين أكملوا الدوام اليوم"
        />

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-border bg-muted/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-foreground">
                <CheckCircle2 className="size-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">أكملوا الشفت</p>
                <p className="text-2xl font-bold tabular-nums">
                  {isLoading ? '...' : finishedEmployees.length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-muted/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-foreground">
                <Package className="size-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                <p className="text-2xl font-bold tabular-nums">
                  {isLoading ? '...' : totals.orders.toLocaleString('ar-SA')}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-muted/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-foreground">
                <Navigation className="size-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المسافة (كم)</p>
                <p className="text-2xl font-bold tabular-nums">
                  {isLoading ? '...' : totals.distance.toLocaleString('ar-SA')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : !finishedEmployees.length ? (
          <Card className="p-10 md:p-14 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FileText className="size-8" />
            </div>
            <CardTitle className="text-lg">لا يوجد مناديب أنهوا الدوام اليوم</CardTitle>
            <CardDescription className="mt-1.5 max-w-xs mx-auto">
              لم يقم أي مندوب بإنهاء شفت العمل لليوم بعد.
            </CardDescription>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المندوب</TableHead>
                  <TableHead className="text-center">وقت البدء</TableHead>
                  <TableHead className="text-center">وقت الانتهاء</TableHead>
                  <TableHead className="text-center">الطلبات</TableHead>
                  <TableHead className="text-center">المسافة (كم)</TableHead>
                  <TableHead className="text-center">الوقود (ر.س)</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finishedEmployees.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-bold">
                      {s.employee_name || '-'}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums text-muted-foreground">
                      {s.start_time ? formatRiyadh(s.start_time, 'hh:mm a') : '-'}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums text-muted-foreground">
                      {s.end_time ? formatRiyadh(s.end_time, 'hh:mm a') : '-'}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums font-bold">
                      {s.orders_count || 0}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums font-bold">
                      {s.distance ? s.distance.toFixed(1) : '0'}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400">
                      {s.fuel_cost || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      <Link
                        href={`/dashboard/employees/${s.employee_id}`}
                        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5')}
                      >
                        <Eye className="size-4" />
                        تفاصيل
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
