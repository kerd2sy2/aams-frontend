'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { getAdminUser } from '@/lib/aams/auth';
import { formatRiyadh } from '@/lib/aams/riyadh-time';
import { custodyApi, branchApi, authApi } from '@/lib/aams/services';
import type { CustodyLog } from '@/types/aams';

function money(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(2);
}

function formatDate(isoStr: string): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return isoStr;
  }
}

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: string } }; message?: string };
  return e?.response?.data?.error || e?.message || fallback;
}

const CATEGORY_NAMES: Record<string, string> = {
  fuel: 'الوقود',
  license: 'رخصة القيادة',
  spare_parts: 'قطع غيار',
  other: 'مصاريف أخرى',
  custody: 'مبلغ عهدة'
};

export default function CustodyLogsPage() {
  const queryClient = useQueryClient();
  const todayStr = useMemo(() => formatRiyadh(new Date(), 'yyyy-MM-dd'), []);
  const yesterdayStr = useMemo(
    () => formatRiyadh(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    []
  );

  const [branchId, setBranchId] = useState<string | null>(() => getAdminUser()?.branch_id ?? null);
  const isSuperAdmin = !branchId;

  // Fetch the current admin from the backend to get the real-time branch.
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me(),
    staleTime: 60_000
  });

  useEffect(() => {
    const me = meQuery.data;
    if (me?.branch_id) {
      setBranchId(me.branch_id);
    }
  }, [meQuery.data]);

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(todayStr); // Defaults to today
  const [actionType, setActionType] = useState<string>('');
  const [userQuery, setUserQuery] = useState<string>('');

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
    enabled: isSuperAdmin
  });

  const logsQuery = useQuery({
    queryKey: ['custody-logs', branchId, selectedDate, actionType, userQuery],
    queryFn: () =>
      custodyApi.getLogs({
        branch_id: branchId ?? undefined,
        date: selectedDate || undefined,
        action_type: actionType || undefined,
        created_by: userQuery || undefined,
        limit: 300
      })
  });

  const logs: CustodyLog[] = logsQuery.data?.data ?? [];

  // Delete Log Mutation (for deleting an accidentally added custody top-up or log)
  const deleteLogMut = useMutation({
    mutationFn: (logId: string) => custodyApi.deleteLog(logId),
    onSuccess: (data) => {
      toast.success(data.message || 'تم حذف/إلغاء الحركة بنجاح');
      queryClient.invalidateQueries({ queryKey: ['custody-logs'] });
      queryClient.invalidateQueries({ queryKey: ['custody'] });
    },
    onError: (err) => {
      toast.error(errorMessage(err, 'فشل حذف الحركة'));
    }
  });

  const handleDeleteLog = (log: CustodyLog) => {
    const isAddCustody = log.action_type === 'ADD_CUSTODY';
    const confirmMsg = isAddCustody
      ? `هل أنت متأكد من رغبتك في إغلاق/حذف العهدة المضافة بقيمة ${money(log.amount)} ريال؟ سيتم خصم المبلغ وإعادة احتساب العهدة.`
      : `هل أنت متأكد من حذف هذه الحركة؟`;

    if (window.confirm(confirmMsg)) {
      deleteLogMut.mutate(log.id);
    }
  };

  // KPI Calculations (Net Amounts)
  const totalAddedCustody = logs.reduce((acc, l) => {
    if (l.action_type === 'ADD_CUSTODY') return acc + l.amount;
    return acc;
  }, 0);

  const totalAddedExpenses = logs.reduce((acc, l) => {
    if (l.action_type === 'ADD_EXPENSE') return acc + l.amount;
    if (l.action_type === 'DELETE_EXPENSE') return acc - l.amount;
    return acc;
  }, 0);

  return (
    <PageContainer
      pageTitle='سجل حركة العهدة'
      pageDescription='عرض جميع حركات العهدة والمصاريف مع إمكانية التصفية باليوم وإلغاء العهدة الإضافية عند الخطأ'
      pageHeaderAction={
        <div className='flex items-center gap-2'>
          <Link
            href='/dashboard/custody'
            title='العودة'
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-xl')}
          >
            <Icons.arrowRight className='size-5' />
          </Link>
          <Button
            variant='outline'
            onClick={() => logsQuery.refetch()}
            disabled={logsQuery.isFetching}
            className='gap-2 rounded-xl font-bold'
          >
            <Icons.refresh className={cn('size-4', logsQuery.isFetching && 'animate-spin')} />
            <span>تحديث الحركات</span>
          </Button>
        </div>
      }
    >
      <div className='space-y-6'>
        {/* Branch Selector (Super Admin) */}
        {isSuperAdmin && (
          <Card>
            <CardContent className='flex flex-wrap items-center gap-4 p-4 pt-4'>
              <div className='text-muted-foreground flex items-center gap-2 text-sm font-semibold'>
                <Icons.building className='text-primary size-4' />
                <span>الفرع:</span>
              </div>
              <select
                value={branchId ?? ''}
                onChange={(e) => setBranchId(e.target.value || null)}
                className='border-input bg-background focus:ring-ring h-10 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2'
              >
                <option value=''>جميع الفروع</option>
                {(branchesQuery.data ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

        {/* Quick Summary KPIs for Selected View */}
        <div className='grid gap-4 sm:grid-cols-3'>
          <Card className='border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20'>
            <CardContent className='space-y-1 p-4 pt-4'>
              <p className='text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 text-xs font-semibold'>
                <Icons.wallet className='size-4' /> المبالغ المضافة للعهدة
              </p>
              <p className='text-emerald-700 dark:text-emerald-300 text-2xl font-black'>
                +{money(totalAddedCustody)} ريال
              </p>
            </CardContent>
          </Card>

          <Card className='border-amber-200 bg-amber-50/50 dark:bg-amber-950/20'>
            <CardContent className='space-y-1 p-4 pt-4'>
              <p className='text-amber-700 dark:text-amber-300 flex items-center gap-1.5 text-xs font-semibold'>
                <Icons.fileText className='size-4' /> إجمالي المصاريف المسجلة
              </p>
              <p className='text-amber-700 dark:text-amber-300 text-2xl font-black'>
                {money(totalAddedExpenses)} ريال
              </p>
            </CardContent>
          </Card>

          <Card className='bg-primary/5 border-primary/20'>
            <CardContent className='space-y-1 p-4 pt-4'>
              <p className='text-muted-foreground flex items-center gap-1.5 text-xs font-semibold'>
                <Icons.adjustments className='text-primary size-4' /> إجمالي الحركات المسجلة
              </p>
              <p className='text-2xl font-black'>{logs.length} حركة</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Filter Toolbar */}
        <Card>
          <CardContent className='space-y-4 p-4 pt-4'>
            <div className='border-b flex flex-wrap items-center justify-between gap-3 pb-3'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='text-muted-foreground flex items-center gap-1.5 text-xs font-bold'>
                  <Icons.calendar className='text-primary size-4' /> اختصار اليوم:
                </span>
                <Button
                  type='button'
                  variant={selectedDate === todayStr ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setSelectedDate(todayStr)}
                  className='rounded-xl font-bold'
                >
                  اليوم ({todayStr})
                </Button>
                <Button
                  type='button'
                  variant={selectedDate === yesterdayStr ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setSelectedDate(yesterdayStr)}
                  className='rounded-xl font-bold'
                >
                  أمس ({yesterdayStr})
                </Button>
                <Button
                  type='button'
                  variant={selectedDate === '' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setSelectedDate('')}
                  className='rounded-xl font-bold'
                >
                  جميع الأيام
                </Button>
              </div>

              {selectedDate && (
                <Badge variant='secondary' className='px-3 py-1 font-mono text-xs'>
                  تصفية اليوم: {selectedDate}
                </Badge>
              )}
            </div>

            <div className='grid gap-3 sm:grid-cols-3'>
              {/* Custom Date Input */}
              <div className='space-y-1'>
                <label className='text-muted-foreground text-xs font-semibold'>اختر يوم محدد</label>
                <Input
                  type='date'
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className='h-10 text-sm'
                />
              </div>

              {/* Action Type */}
              <div className='space-y-1'>
                <label className='text-muted-foreground text-xs font-semibold'>
                  تصفية بنوع الحركة
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className='border-input bg-background focus:ring-ring h-10 w-full rounded-lg border px-3 text-sm focus:outline-none focus:ring-2'
                >
                  <option value=''>جميع الحركات</option>
                  <option value='ADD_CUSTODY'>إضافة عهدة (فتح / زيادة)</option>
                  <option value='ADD_EXPENSE'>إضافة مصروف</option>
                  <option value='DELETE_EXPENSE'>حذف مصروف</option>
                  <option value='DELETE_CUSTODY'>حذف عهدة مضافة</option>
                </select>
              </div>

              {/* Search by User */}
              <div className='space-y-1'>
                <label className='text-muted-foreground text-xs font-semibold'>
                  تصفية بالمستخدم (مين ضاف/حذف)
                </label>
                <div className='relative'>
                  <Icons.search className='text-muted-foreground absolute end-3 top-3 size-4' />
                  <Input
                    type='text'
                    placeholder='اسم المستخدم...'
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    className='h-10 pe-9 text-sm'
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Chronological Movements Table */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center justify-between text-base'>
              <span className='flex items-center gap-2'>
                <Icons.fileText className='text-primary size-5' />
                جدول حركات العهدة الترتيبي ({logs.length})
              </span>
              {logsQuery.isFetching && (
                <Icons.spinner className='text-muted-foreground size-4 animate-spin' />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logsQuery.isLoading ? (
              <div className='space-y-3'>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className='h-12 w-full rounded-xl' />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className='space-y-3 rounded-2xl border-2 border-dashed py-12 text-center'>
                <Icons.fileText className='text-muted-foreground mx-auto size-12 opacity-40' />
                <div>
                  <p className='text-sm font-bold'>لا توجد حركات عهدة مسجلة بهذا التاريخ</p>
                  <p className='text-muted-foreground text-xs'>
                    اختر يوم آخر أو انقر على 'جميع الأيام' لعرض السجل بالكامل
                  </p>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setSelectedDate('')}
                  className='rounded-xl font-bold'
                >
                  عرض كافة الأيام
                </Button>
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='bg-muted/30 text-muted-foreground border-b text-xs font-bold'>
                      <th className='px-3 py-3 text-center'>#</th>
                      <th className='px-3 py-3'>التاريخ والوقت</th>
                      <th className='px-3 py-3'>نوع الحركة</th>
                      <th className='px-3 py-3'>البند</th>
                      <th className='px-3 py-3 text-left'>المبلغ</th>
                      <th className='px-3 py-3'>البيان / المستلم</th>
                      <th className='px-3 py-3'>المنفذ (مين ضاف/مسح)</th>
                      <th className='px-3 py-3 text-center'>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className='divide-border/60 divide-y'>
                    {logs.map((log, index) => {
                      const isAddCustody = log.action_type === 'ADD_CUSTODY';
                      const isAddExpense = log.action_type === 'ADD_EXPENSE';
                      const isDeleteExpense = log.action_type === 'DELETE_EXPENSE';
                      const isDeleteCustody = log.action_type === 'DELETE_CUSTODY';

                      return (
                        <tr key={log.id} className='hover:bg-muted/40 transition-colors'>
                          {/* Index */}
                          <td className='text-muted-foreground px-3 py-3 text-center font-mono text-xs font-bold'>
                            {logs.length - index}
                          </td>

                          {/* Timestamp */}
                          <td className='text-muted-foreground px-3 py-3 font-mono text-xs'>
                            {formatDate(log.created_at)}
                          </td>

                          {/* Action Badge */}
                          <td className='px-3 py-3'>
                            {isAddCustody && (
                              <Badge className='border-emerald-300 bg-emerald-100 font-bold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300'>
                                <Icons.plusCircle className='size-3.5' /> إضافة عهدة
                              </Badge>
                            )}
                            {isAddExpense && (
                              <Badge className='border-amber-300 bg-amber-100 font-bold text-amber-800 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300'>
                                <Icons.minus className='size-3.5' /> إضافة مصروف
                              </Badge>
                            )}
                            {isDeleteExpense && (
                              <Badge className='border-rose-300 bg-rose-100 font-bold text-rose-800 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300'>
                                <Icons.trash className='size-3.5' /> حذف مصروف
                              </Badge>
                            )}
                            {isDeleteCustody && (
                              <Badge className='border-slate-300 bg-slate-200 font-bold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'>
                                <Icons.warning className='size-3.5' /> إلغاء/حذف عهدة
                              </Badge>
                            )}
                          </td>

                          {/* Category */}
                          <td className='px-3 py-3 font-semibold'>
                            {CATEGORY_NAMES[log.category] || log.category}
                          </td>

                          {/* Amount */}
                          <td className='px-3 py-3 text-left font-black'>
                            <span
                              className={cn(
                                'text-base',
                                (isAddCustody || isDeleteExpense) && 'text-emerald-600 dark:text-emerald-400',
                                (isAddExpense || isDeleteCustody) && 'text-rose-600 dark:text-rose-400'
                              )}
                            >
                              {(isAddCustody || isDeleteExpense) ? '+' : (isAddExpense || isDeleteCustody) ? '-' : ''}
                              {money(log.amount)} ريال
                            </span>
                          </td>

                          {/* Description & Recipient */}
                          <td className='px-3 py-3 text-xs'>
                            <p className='font-bold'>{log.description || '-'}</p>
                            {log.recipient_name && (
                              <p className='text-muted-foreground mt-0.5'>
                                المستلم: {log.recipient_name}
                              </p>
                            )}
                          </td>

                          {/* Admin / Executor */}
                          <td className='px-3 py-3'>
                            <div className='flex items-center gap-1.5 text-xs font-bold'>
                              <Icons.user className='text-primary size-3.5 shrink-0' />
                              <span>{log.admin_name || log.admin_username || 'النظام'}</span>
                            </div>
                          </td>

                          {/* Action / Delete Button */}
                          <td className='px-3 py-3 text-center'>
                            {isAddCustody && (
                              <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                disabled={deleteLogMut.isPending}
                                onClick={() => handleDeleteLog(log)}
                                className='border-rose-200 rounded-xl px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40'
                                title='حذف هذا المبلغ المضاف بالخطأ من العهدة'
                              >
                                <Icons.trash className='size-3.5' />
                                <span>حذف العهدة</span>
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
