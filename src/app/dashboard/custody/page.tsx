'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { getAdminUser } from '@/lib/aams/auth';
import { formatRiyadh } from '@/lib/aams/riyadh-time';
import { custodyApi, branchApi, authApi } from '@/lib/aams/services';
import type { CustodyDay } from '@/types/aams';

type CategoryKey = 'fuel' | 'license' | 'spare_parts' | 'other';

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}[] = [
  {
    key: 'fuel',
    label: 'وقود',
    icon: Icons.fuel,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
  },
  {
    key: 'license',
    label: 'رخصة',
    icon: Icons.fileText,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800'
  },
  {
    key: 'spare_parts',
    label: 'قطع غيار',
    icon: Icons.tool,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800'
  },
  {
    key: 'other',
    label: 'مصاريف أخرى',
    icon: Icons.clipboardList,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
  }
];

function money(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString('en-US') : n.toFixed(2);
}
function errMsg(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: string } }; message?: string };
  return e?.response?.data?.error || e?.message || fallback;
}

export default function CustodyPage() {
  const queryClient = useQueryClient();
  const todayStr = useMemo(() => formatRiyadh(new Date(), 'yyyy-MM-dd'), []);
  const amountRef = useRef<HTMLInputElement>(null);

  const [branchId, setBranchId] = useState<string | null>(() => getAdminUser()?.branch_id ?? null);
  const isSuperAdmin = !getAdminUser()?.branch_id;

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me(),
    staleTime: 10_000,
    refetchOnWindowFocus: true
  });
  useEffect(() => {
    if (meQuery.data?.branch_id) setBranchId(meQuery.data.branch_id);
  }, [meQuery.data]);

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
    enabled: isSuperAdmin,
    staleTime: 30_000
  });
  const custodyQuery = useQuery({
    queryKey: ['custody', branchId],
    queryFn: () => custodyApi.list(branchId ?? undefined),
    enabled: !!branchId,
    staleTime: 5000,
    refetchInterval: 8000,
    refetchOnWindowFocus: true
  });

  const days = custodyQuery.data ?? [];
  const todayDay = days.find((d) => d.date === todayStr) ?? null;
  const latestDay = days[0] ?? null;
  const carriedBalance = todayDay ? todayDay.opening_balance : (latestDay?.closing_balance ?? 0);

  // ── Open day form ──
  const [openAmount, setOpenAmount] = useState('');

  // ── Extra custody ──
  const [extraAmount, setExtraAmount] = useState('');
  const [showExtra, setShowExtra] = useState(false);

  // ── Add expense ──
  const [pinCategory, setPinCategory] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('fuel');
  const [expAmount, setExpAmount] = useState('');
  const [expDetail, setExpDetail] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['custody', branchId] });

  const createDayMut = useMutation({
    mutationFn: (added: number) =>
      custodyApi.create({ date: todayStr, added_amount: added, branch_id: branchId ?? undefined }),
    onSuccess: () => {
      toast.success('تم فتح عهدة اليوم');
      setOpenAmount('');
      invalidate();
    },
    onError: (err) => toast.error(errMsg(err, 'فشل فتح العهدة'))
  });

  const addExtraMut = useMutation({
    mutationFn: (added: number) =>
      custodyApi.addAmount({
        custody_day_id: todayDay!.id,
        added_amount: added,
        branch_id: branchId ?? undefined
      }),
    onSuccess: () => {
      toast.success('تمت إضافة المبلغ');
      setExtraAmount('');
      setShowExtra(false);
      invalidate();
    },
    onError: (err) => toast.error(errMsg(err, 'فشل إضافة المبلغ'))
  });

  const addExpMut = useMutation({
    mutationFn: (day: CustodyDay) =>
      custodyApi.addExpense(day.id, {
        category: activeCategory,
        amount: Number(expAmount),
        recipient_name: expDetail.trim()
      }),
    onSuccess: () => {
      toast.success('تمت إضافة المصروف');
      setExpAmount('');
      if (!pinCategory) setExpDetail('');
      else setExpDetail(''); // always clear detail; amount too
      invalidate();
      setTimeout(() => amountRef.current?.focus(), 100);
    },
    onError: (err) => toast.error(errMsg(err, 'فشل إضافة المصروف'))
  });

  const delExpMut = useMutation({
    mutationFn: (id: string) => custodyApi.deleteExpense(id),
    onSuccess: () => {
      toast.success('تم حذف المصروف');
      invalidate();
    },
    onError: (err) => toast.error(errMsg(err, 'فشل الحذف'))
  });

  const currentBranchName = (branchesQuery.data ?? []).find((b) => b.id === branchId)?.name;
  const activeCat = CATEGORIES.find((c) => c.key === activeCategory)!;

  return (
    <PageContainer
      pageTitle='العهدة'
      pageDescription='إدارة العهدة اليومية والمصاريف'
      pageHeaderAction={
        <Link
          href='/dashboard/custody/logs'
          className='inline-flex h-9 items-center gap-2 rounded-lg border border-primary/30 bg-background px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5'
        >
          <Icons.history className='size-4' />
          سجل الحركة
        </Link>
      }
    >
      <div className='space-y-5'>
        {/* ── Super-admin branch picker ── */}
        {isSuperAdmin && (
          <div className='flex flex-wrap items-center gap-3'>
            <Icons.building className='text-muted-foreground size-4 shrink-0' />
            <select
              value={branchId ?? ''}
              onChange={(e) => setBranchId(e.target.value || null)}
              className='border-input bg-background focus:ring-ring h-10 rounded-lg border px-3 text-sm font-semibold focus:outline-none focus:ring-2'
            >
              <option value='' disabled>
                اختر الفرع…
              </option>
              {(branchesQuery.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {branchId && currentBranchName && (
              <Badge
                variant='outline'
                className='border-primary/40 bg-primary/10 text-primary font-bold'
              >
                {currentBranchName}
              </Badge>
            )}
          </div>
        )}

        {/* ── No branch selected yet ── */}
        {isSuperAdmin && !branchId ? (
          <div className='border-muted-foreground/30 text-muted-foreground flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed py-16 text-center'>
            <Icons.wallet className='size-12 opacity-30' />
            <p className='font-semibold'>اختر الفرع أولاً</p>
          </div>
        ) : custodyQuery.isLoading ? (
          <div className='grid gap-4 sm:grid-cols-4'>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className='h-24 rounded-2xl' />
            ))}
          </div>
        ) : !todayDay ? (
          /* ── Open today's day ── */
          <Card className='border-2 border-dashed'>
            <CardContent className='space-y-4 p-5'>
              <div className='flex items-center gap-3'>
                <div className='bg-primary/10 flex size-11 items-center justify-center rounded-2xl'>
                  <Icons.calendar className='text-primary size-5' />
                </div>
                <div>
                  <p className='font-bold'>فتح عهدة اليوم</p>
                  <p className='text-muted-foreground text-xs'>
                    {todayStr} — الباقي من أمس:{' '}
                    <span className='font-bold'>{money(carriedBalance)} ريال</span> يُرحّل تلقائياً
                  </p>
                </div>
              </div>

              <div className='flex gap-3'>
                <Input
                  type='number'
                  inputMode='decimal'
                  min='0'
                  placeholder='مبلغ اليوم الجديد (ريال)'
                  value={openAmount}
                  onChange={(e) => setOpenAmount(e.target.value)}
                  className='h-12 text-base'
                />
                <Button
                  type='button'
                  size='lg'
                  disabled={createDayMut.isPending}
                  onClick={() => {
                    const v = Number(openAmount);
                    if (openAmount.trim() === '' || isNaN(v) || v < 0) {
                      toast.error('يرجى إدخال مبلغ صحيح');
                      return;
                    }
                    createDayMut.mutate(v);
                  }}
                  className='h-12 shrink-0 rounded-2xl font-bold'
                >
                  {createDayMut.isPending ? (
                    <Icons.spinner className='size-5 animate-spin' />
                  ) : (
                    <Icons.wallet className='size-5' />
                  )}
                  فتح
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── Balance summary ── */}
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
              {[
                { label: 'باقي أمس', value: todayDay.opening_balance, cls: 'text-foreground' },
                { label: 'مبلغ اليوم', value: todayDay.added_amount, cls: 'text-foreground' },
                {
                  label: 'المصاريف',
                  value: todayDay.total_expenses,
                  cls: 'text-rose-600 dark:text-rose-400'
                },
                {
                  label: 'الباقي',
                  value: todayDay.closing_balance,
                  cls:
                    todayDay.closing_balance >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                }
              ].map((s) => (
                <Card
                  key={s.label}
                  className={cn(
                    s.label === 'الباقي' &&
                      (todayDay.closing_balance >= 0
                        ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20'
                        : 'border-rose-200 bg-rose-50 dark:bg-rose-950/20')
                  )}
                >
                  <CardContent className='p-4'>
                    <p className='text-muted-foreground mb-1 text-xs'>{s.label}</p>
                    <p className={cn('text-xl font-black', s.cls)}>{money(s.value)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ── Add extra custody ── */}
            <div className='flex items-center gap-3'>
              <button
                type='button'
                onClick={() => setShowExtra(!showExtra)}
                className='text-primary hover:underline text-xs font-semibold'
              >
                {showExtra ? '✕ إلغاء' : '＋ إضافة عهدة إضافية لليوم'}
              </button>
            </div>
            {showExtra && (
              <div className='flex gap-3'>
                <Input
                  type='number'
                  inputMode='decimal'
                  min='1'
                  placeholder='المبلغ الإضافي (ريال)'
                  value={extraAmount}
                  onChange={(e) => setExtraAmount(e.target.value)}
                  className='h-11'
                />
                <Button
                  type='button'
                  disabled={addExtraMut.isPending}
                  onClick={() => {
                    const v = Number(extraAmount);
                    if (!v || v <= 0) {
                      toast.error('يرجى إدخال مبلغ صحيح');
                      return;
                    }
                    addExtraMut.mutate(v);
                  }}
                  className='h-11 shrink-0 rounded-xl font-bold'
                >
                  {addExtraMut.isPending ? (
                    <Icons.spinner className='size-4 animate-spin' />
                  ) : (
                    'إضافة'
                  )}
                </Button>
              </div>
            )}

            {/* ── Add expense form ── */}
            <Card>
              <CardContent className='space-y-4 p-4'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm font-bold'>إضافة مصروف</p>
                  {/* Pin toggle */}
                  <button
                    type='button'
                    onClick={() => setPinCategory(!pinCategory)}
                    title={pinCategory ? 'إلغاء التثبيت' : 'ثبّت التصنيف'}
                    className={cn(
                      'flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors',
                      pinCategory
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'text-muted-foreground border-border hover:bg-muted'
                    )}
                  >
                    <Icons.pin className='size-3.5' />
                    {pinCategory ? 'ثابت' : 'ثبّت التصنيف'}
                  </button>
                </div>

                {/* Category pills */}
                <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const active = activeCategory === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type='button'
                        onClick={() => setActiveCategory(cat.key)}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all',
                          active
                            ? `${cat.bg} ${cat.color} border-current`
                            : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                        )}
                      >
                        <Icon className={cn('size-4', active ? cat.color : '')} />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                {/* Amount + detail */}
                <div className='flex flex-col gap-2 sm:flex-row'>
                  <Input
                    ref={amountRef}
                    type='number'
                    inputMode='decimal'
                    min='0'
                    placeholder='المبلغ (ريال)'
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className='h-11'
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('exp-detail-input')?.focus();
                      }
                    }}
                  />
                  <Input
                    id='exp-detail-input'
                    type='text'
                    placeholder='تفاصيل (اختياري — اسم، وصف…)'
                    value={expDetail}
                    onChange={(e) => setExpDetail(e.target.value)}
                    className='h-11'
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const v = Number(expAmount);
                        if (!v || v <= 0) {
                          toast.error('يرجى إدخال مبلغ');
                          amountRef.current?.focus();
                          return;
                        }
                        addExpMut.mutate(todayDay);
                      }
                    }}
                  />
                  <Button
                    type='button'
                    disabled={addExpMut.isPending}
                    onClick={() => {
                      const v = Number(expAmount);
                      if (!v || v <= 0) {
                        toast.error('يرجى إدخال مبلغ');
                        amountRef.current?.focus();
                        return;
                      }
                      addExpMut.mutate(todayDay);
                    }}
                    className={cn(
                      'h-11 shrink-0 rounded-xl font-bold',
                      activeCat.bg,
                      activeCat.color,
                      'border border-current'
                    )}
                  >
                    {addExpMut.isPending ? (
                      <Icons.spinner className='size-4 animate-spin' />
                    ) : (
                      <Icons.add className='size-4' />
                    )}
                    إضافة
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ── Today's expenses list ── */}
            {todayDay.expenses.length > 0 && (
              <div className='space-y-2'>
                <p className='text-muted-foreground text-xs font-semibold'>
                  مصاريف اليوم ({todayDay.expenses.length})
                </p>
                <div className='space-y-2'>
                  {CATEGORIES.map((cat) => {
                    const list = todayDay.expenses.filter((e) => e.category === cat.key);
                    if (list.length === 0) return null;
                    const Icon = cat.icon;
                    const total = todayDay.totals[cat.key];
                    return (
                      <div key={cat.key}>
                        <div className='mb-1.5 flex items-center gap-2'>
                          <Icon className={cn('size-4', cat.color)} />
                          <span className={cn('text-xs font-bold', cat.color)}>{cat.label}</span>
                          <Badge variant='outline' className='ml-auto font-mono text-xs'>
                            {money(total)} ريال
                          </Badge>
                        </div>
                        <div className='space-y-1.5'>
                          {list.map((e) => (
                            <div
                              key={e.id}
                              className='bg-muted/40 flex items-center gap-3 rounded-xl px-3 py-2'
                            >
                              <div className='min-w-0 flex-1'>
                                <span className='font-bold'>{money(e.amount)}</span>
                                {e.recipient_name && (
                                  <span className='text-muted-foreground mr-2 text-xs'>
                                    {e.recipient_name}
                                  </span>
                                )}
                              </div>
                              <button
                                type='button'
                                disabled={delExpMut.isPending}
                                onClick={() => delExpMut.mutate(e.id)}
                                className='text-muted-foreground hover:text-rose-500 rounded-lg p-1 transition-colors'
                              >
                                <Icons.trash className='size-4' />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
