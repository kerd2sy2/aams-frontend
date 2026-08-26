'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { investigationApi } from '@/lib/aams/services';
import { getAdminUser } from '@/lib/aams/auth';
import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatRiyadh } from '@/lib/aams/riyadh-time';

const TYPE_LABEL: Record<string, string> = { advance: 'سلفة', internet_advance: 'سلفة انترنت' };

function statusInfo(status?: string) {
  const s = status || 'pending';
  if (s === 'approved') return { label: 'موافق عليه', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
  if (s === 'rejected') return { label: 'مرفوض', color: 'bg-rose-100 text-rose-700 border-rose-300' };
  return { label: 'قيد الانتظار', color: 'bg-amber-100 text-amber-700 border-amber-300' };
}

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'قيد الانتظار' },
  { key: 'approved', label: 'موافق عليه' },
  { key: 'rejected', label: 'مرفوض' }
] as const;

export function ApprovalsPageContent() {
  const currentAdmin = useMemo(() => getAdminUser(), []);
  const isAdmin = currentAdmin?.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const { data: investigations, isLoading } = useQuery({
    queryKey: ['investigations'],
    queryFn: () => investigationApi.getAll()
  });

  const approvalMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      action === 'approve' ? investigationApi.approve(id) : investigationApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigations'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals-count'] });
      toast.success('تم تحديث حالة الطلب');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'فشل في تحديث حالة الطلب');
    }
  });

  const approvals = useMemo(() => {
    const list = (investigations || []).filter(
      (inv) => inv.type === 'advance' || inv.type === 'internet_advance'
    );
    const order: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };
    return list.slice().sort((a, b) => {
      const oa = order[a.status || 'pending'] ?? 0;
      const ob = order[b.status || 'pending'] ?? 0;
      if (oa !== ob) return oa - ob;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [investigations]);

  const filtered = useMemo(() => {
    if (filter === 'all') return approvals;
    return approvals.filter((inv) => (inv.status || 'pending') === filter);
  }, [approvals, filter]);

  const pendingCount = approvals.filter((inv) => (inv.status || 'pending') === 'pending').length;

  if (!isAdmin) {
    return (
      <PageContainer pageTitle='الطلبات' pageDescription='محاضر الموظفين'>
        <Card className='py-16 text-center'>
          <CardContent className='flex flex-col items-center'>
            <div className='bg-rose-100 text-rose-500 mb-6 flex size-20 items-center justify-center rounded-2xl dark:bg-rose-950/40'>
              <Icons.shieldAlert className='size-10' />
            </div>
            <h3 className='text-xl font-bold'>غير مصرح</h3>
            <p className='text-muted-foreground mt-2 text-sm'>
              هذه الصفحة متاحة للمدير (الأدمن) فقط
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer pageTitle='الطلبات' pageDescription='محاضر الموظفين'>
      <div className='flex flex-col gap-4'>
        {/* Pending count */}
        <div className='grid grid-cols-2 gap-4'>
          <Card className='border-amber-200 bg-amber-50/50'>
            <CardContent className='flex items-center gap-4 py-4'>
              <div className='bg-amber-100 text-amber-600 flex size-12 items-center justify-center rounded-xl'>
                <Icons.clipboardCheck className='size-6' />
              </div>
              <div>
                <p className='text-3xl font-black text-amber-700'>{pendingCount}</p>
                <p className='text-muted-foreground text-xs'>طلبات قيد الانتظار</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-center gap-4 py-4'>
              <div className='bg-blue-100 text-blue-600 flex size-12 items-center justify-center rounded-xl'>
                <Icons.dollarSign className='size-6' />
              </div>
              <div>
                <p className='text-3xl font-black'>{approvals.length}</p>
                <p className='text-muted-foreground text-xs'>إجمالي طلبات السلف</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className='flex flex-wrap items-center gap-2'>
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? 'default' : 'outline'}
              size='sm'
              onClick={() => setFilter(f.key)}
              className='rounded-full'
            >
              {f.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <Card>
            <CardContent className='text-muted-foreground py-12 text-center'>
              <Icons.spinner className='mx-auto mb-2 size-6 animate-spin' />
              جارٍ التحميل...
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className='py-16 text-center'>
            <CardContent className='flex flex-col items-center'>
              <div className='bg-muted/50 mb-6 flex size-20 items-center justify-center rounded-2xl shadow-inner'>
                <Icons.inbox className='size-10' />
              </div>
              <h3 className='text-xl font-bold'>لا توجد طلبات</h3>
              <p className='text-muted-foreground mt-2 text-sm'>
                لا توجد طلبات سلف في هذا التصنيف
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-4'>
            {filtered.map((inv) => {
              const s = statusInfo(inv.status);
              const who =
                s.label === 'موافق عليه'
                  ? inv.approved_by_name
                  : s.label === 'مرفوض'
                    ? inv.rejected_by_name
                    : '';
              const whoUsername =
                s.label === 'موافق عليه'
                  ? inv.approved_by_username
                  : s.label === 'مرفوض'
                    ? inv.rejected_by_username
                    : '';

              return (
                <Card key={inv.id} className='overflow-hidden'>
                  <CardContent className='py-4'>
                    <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                      <div className='flex min-w-0 items-start gap-3'>
                        <div
                          className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-xl',
                            inv.type === 'advance'
                              ? 'bg-green-100 text-green-600 dark:bg-green-950/40'
                              : 'bg-purple-100 text-purple-600 dark:bg-purple-950/40'
                          )}
                        >
                          {inv.type === 'advance' ? (
                            <Icons.dollarSign className='size-5' />
                          ) : (
                            <Icons.wifi className='size-5' />
                          )}
                        </div>
                        <div className='min-w-0'>
                          <p className='text-sm font-bold'>{inv.employee_name}</p>
                          <p className='text-muted-foreground text-xs'>رقم الهوية: {inv.national_id}</p>
                          <p className='text-muted-foreground text-xs'>المشرف: {inv.supervisor_name}</p>
                          <p className='text-muted-foreground font-mono text-xs'>
                            {formatRiyadh(new Date(inv.created_at), 'yyyy/MM/dd hh:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className='flex flex-wrap items-center gap-3'>
                        <Badge variant='outline'>{TYPE_LABEL[inv.type]}</Badge>
                        {inv.amount != null && (
                          <span className='text-xs font-bold'>{inv.amount.toLocaleString()} ريال</span>
                        )}
                        <Badge variant='outline' className={cn('border', s.color)}>
                          {s.label}
                        </Badge>
                        {who && (
                          <span className='text-muted-foreground text-xs'>
                            بواسطة: {who}
                            {whoUsername ? ` (@${whoUsername})` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className='mt-3 flex items-center gap-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        disabled={approvalMutation.isPending}
                        onClick={() => approvalMutation.mutate({ id: inv.id, action: 'approve' })}
                        className='gap-1 text-emerald-600 hover:bg-emerald-50'
                      >
                        <Icons.circleCheck className='size-4' /> موافقة
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        disabled={approvalMutation.isPending}
                        onClick={() => approvalMutation.mutate({ id: inv.id, action: 'reject' })}
                        className='gap-1 text-rose-600 hover:bg-rose-50'
                      >
                        <Icons.circleX className='size-4' /> رفض
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
