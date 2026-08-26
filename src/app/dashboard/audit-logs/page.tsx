'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { ar } from 'date-fns/locale';
import { Icons, type Icon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { getAdminUser } from '@/lib/aams/auth';
import { formatRiyadh } from '@/lib/aams/riyadh-time';
import { auditApi } from '@/lib/aams/services';
import type { AuditLog } from '@/types/aams';
import { toast } from 'sonner';
import { Trash2, AlertTriangle, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';

function getActionColor(action: string): {
  icon: Icon;
  iconBg: string;
  iconFg: string;
  gradient: string;
} {
  const a = action.toLowerCase();
  if (a.includes('login') || a.includes('دخول')) {
    return {
      icon: Icons.login,
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/50',
      iconFg: 'text-emerald-600 dark:text-emerald-400',
      gradient: 'from-emerald-500 to-teal-600'
    };
  }
  if (a.includes('delete') || a.includes('حذف') || a.includes('مسح')) {
    return {
      icon: Icons.trash,
      iconBg: 'bg-rose-100 dark:bg-rose-950/50',
      iconFg: 'text-rose-600 dark:text-rose-400',
      gradient: 'from-rose-500 to-pink-600'
    };
  }
  if (a.includes('create') || a.includes('add') || a.includes('إضافة')) {
    return {
      icon: Icons.plusCircle,
      iconBg: 'bg-blue-100 dark:bg-blue-950/50',
      iconFg: 'text-blue-600 dark:text-blue-400',
      gradient: 'from-blue-500 to-indigo-600'
    };
  }
  if (a.includes('update') || a.includes('edit') || a.includes('تعديل')) {
    return {
      icon: Icons.edit,
      iconBg: 'bg-amber-100 dark:bg-amber-950/50',
      iconFg: 'text-amber-600 dark:text-amber-400',
      gradient: 'from-amber-500 to-orange-600'
    };
  }
  return {
    icon: Icons.fileText,
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconFg: 'text-slate-500 dark:text-slate-400',
    gradient: 'from-slate-400 to-slate-600'
  };
}

export default function AuditLogsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dialog states
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // General manager only (no branch_id)
  const isGeneralMgr = !getAdminUser()?.branch_id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => auditApi.getLogs(page, 20),
    enabled: isGeneralMgr
  });

  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    if (!search.trim()) return data.data;
    const q = search.toLowerCase();
    return data.data.filter(
      (log: AuditLog) =>
        log.admin_name?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q) ||
        log.ip_address?.toLowerCase().includes(q)
    );
  }, [data, search]);

  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.ceil(total / limit);

  // Redirect and block rendering for unauthorized users
  useEffect(() => {
    if (!isGeneralMgr) {
      router.replace('/dashboard');
    }
  }, [isGeneralMgr, router]);

  if (!isGeneralMgr) {
    return null;
  }

  // Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredData.map((log: AuditLog) => log.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllSelected = filteredData.length > 0 && selectedIds.length === filteredData.length;

  // 1. Delete Single Log
  const handleDeleteSingle = async () => {
    if (!singleDeleteId) return;
    try {
      setIsDeleting(true);
      await auditApi.deleteLog(singleDeleteId);
      toast.success('تم حذف سجل العملية نهائياً من قاعدة البيانات');
      setSingleDeleteId(null);
      setSelectedIds(prev => prev.filter(id => id !== singleDeleteId));
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'تعذر حذف سجل العملية');
    } finally {
      setIsDeleting(false);
    }
  };

  // 2. Bulk Delete Selected Logs
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsDeleting(true);
      await auditApi.bulkDeleteLogs(selectedIds);
      toast.success(`تم حذف ${selectedIds.length} سجل نهائياً من قاعدة البيانات`);
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'تعذر حذف السجلات المحددة');
    } finally {
      setIsDeleting(false);
    }
  };

  // 3. Clear All Audit Logs
  const handleClearAll = async () => {
    try {
      setIsDeleting(true);
      await auditApi.clearAllLogs();
      toast.success('تم مسح وتفريغ سجل العمليات والرقابة بالكامل نهائياً');
      setSelectedIds([]);
      setIsClearAllOpen(false);
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'تعذر تفريغ سجل العمليات');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageContainer
      pageTitle='سجل العمليات والرقابة'
      pageDescription='توثيق لجميع عمليات المشرفين ونشاطات النظام مع إمكانية الإدارة والحذف'
      pageHeaderAction={
        <div className='flex items-center gap-2 flex-wrap'>
          <div className='bg-muted/60 flex items-center gap-3 rounded-2xl px-4 py-2 border'>
            <Icons.history className='text-violet-500 size-4' />
            <span className='text-muted-foreground text-xs font-medium'>الإجمالي:</span>
            <Badge variant='secondary' className='px-2.5 text-xs font-bold tabular-nums'>
              {total}
            </Badge>
            <span className='text-muted-foreground text-xs'>عملية</span>
          </div>

          <Button
            variant='outline'
            size='sm'
            onClick={() => refetch()}
            disabled={isLoading}
            className='h-9 px-3 gap-1.5 font-bold'
          >
            <RefreshCw className={cn('size-3.5', isLoading && 'animate-spin')} />
            تحديث
          </Button>

          {total > 0 && (
            <Button
              variant='destructive'
              size='sm'
              onClick={() => setIsClearAllOpen(true)}
              className='h-9 px-3 gap-1.5 font-bold shadow-xs bg-rose-600 hover:bg-rose-700 text-white'
            >
              <Trash2 className='size-3.5' />
              مسح السجل بالكامل (نهائياً)
            </Button>
          )}
        </div>
      }
    >
      <div className='flex flex-col gap-4' dir="rtl">
        {/* Search & Bulk Bar */}
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border shadow-xs'>
          <div className='relative flex-1 min-w-[240px]'>
            <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 start-3.5' />
            <Input
              placeholder='بحث في السجلات بالاسم أو الإجراء أو التفاصيل أو IP...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='h-10 ps-10 text-xs bg-muted/20'
            />
          </div>

          {selectedIds.length > 0 && (
            <div className='flex items-center gap-2 p-1 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 animate-in fade-in'>
              <span className='text-xs font-bold px-2 text-rose-700 dark:text-rose-300'>
                تم تحديد {selectedIds.length} سجل
              </span>
              <Button
                variant='destructive'
                size='sm'
                onClick={() => setIsBulkDeleteOpen(true)}
                disabled={isDeleting}
                className='h-7 text-xs font-bold gap-1 shadow-xs bg-rose-600 hover:bg-rose-700'
              >
                <Trash2 className='size-3' />
                حذف المحدد نهائياً
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <Card className='text-muted-foreground p-12 text-center text-sm'>
            <Icons.spinner className='text-primary mx-auto mb-3 size-7 animate-spin' />
            جاري تحميل سجل العمليات...
          </Card>
        ) : filteredData && filteredData.length > 0 ? (
          <>
            {/* Mobile Cards */}
            <div className='space-y-3 md:hidden'>
              {filteredData.map((log: AuditLog) => {
                const { icon: ActionIcon, iconFg, gradient } = getActionColor(log.action);
                const isSelected = selectedIds.includes(log.id);
                return (
                  <Card key={log.id} className={cn('overflow-hidden border', isSelected && 'border-rose-400 bg-rose-50/20')}>
                    <CardContent className='space-y-3 p-4 pt-4'>
                      {/* Top row: Checkbox + admin + action + delete */}
                      <div className='flex items-start justify-between gap-2'>
                        <div className='flex min-w-0 items-center gap-3'>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelect(log.id)}
                            aria-label="Select log"
                          />
                          <div
                            className={cn(
                              'flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-xs',
                              gradient
                            )}
                          >
                            <ActionIcon className='size-4' />
                          </div>
                          <div className='min-w-0'>
                            <p className='truncate text-sm font-bold'>{log.admin_name}</p>
                            <p className='text-muted-foreground mt-0.5 flex items-center gap-1 font-mono text-[10px]'>
                              <Icons.language className='size-3' />
                              {log.ip_address || '127.0.0.1'}
                            </p>
                          </div>
                        </div>

                        <div className='flex items-center gap-1'>
                          <Badge variant='outline' className='shrink-0 whitespace-nowrap text-[10px] font-bold'>
                            {log.action}
                          </Badge>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => setSingleDeleteId(log.id)}
                            className='size-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                            title='حذف هذا السجل نهائياً'
                          >
                            <Trash2 className='size-3.5' />
                          </Button>
                        </div>
                      </div>

                      {/* Details */}
                      {log.details && (
                        <div className='bg-muted/40 border-border/60 rounded-xl border p-2.5'>
                          <div className='flex items-start gap-2'>
                            <ActionIcon className={cn('mt-0.5 size-3.5 shrink-0', iconFg)} />
                            <p className='text-foreground/80 text-xs leading-relaxed'>
                              {log.details}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Footer: timestamp */}
                      <div className='border-border/60 flex items-center justify-between border-t pt-2 text-xs text-muted-foreground'>
                        <div className='flex items-center gap-1.5 font-mono text-[11px]'>
                          <Icons.clock className='text-violet-500 size-3' />
                          <span>
                            {formatRiyadh(new Date(log.created_at), 'hh:mm:ss a - yyyy/MM/dd')}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Desktop Table */}
            <Card className='hidden overflow-hidden md:block rounded-2xl border shadow-xs'>
              <Table>
                <TableHeader className='bg-muted/40'>
                  <TableRow>
                    <TableHead className='w-12 text-center'>
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className='text-right'>اسم المسؤول</TableHead>
                    <TableHead className='text-right'>نوع الإجراء</TableHead>
                    <TableHead className='text-right'>التفاصيل</TableHead>
                    <TableHead className='text-right'>التاريخ والوقت</TableHead>
                    <TableHead className='text-right'>عنوان IP</TableHead>
                    <TableHead className='text-center w-20'>حذف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((log: AuditLog) => {
                    const { icon: ActionIcon, gradient } = getActionColor(log.action);
                    const isSelected = selectedIds.includes(log.id);
                    return (
                      <TableRow key={log.id} className={cn('hover:bg-muted/30 transition-colors', isSelected && 'bg-rose-50/20')}>
                        <TableCell className='text-center'>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelect(log.id)}
                            aria-label="Select row"
                          />
                        </TableCell>

                        <TableCell className='font-bold text-sm'>
                          <div className='flex items-center gap-2.5'>
                            <div
                              className={cn(
                                'flex size-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-2xs',
                                gradient
                              )}
                            >
                              <ActionIcon className='size-3.5' />
                            </div>
                            <span>{log.admin_name}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant='outline' className='text-xs font-bold'>
                            {log.action}
                          </Badge>
                        </TableCell>

                        <TableCell className='text-foreground/80 max-w-md'>
                          {log.details ? (
                            <p className='line-clamp-2 text-xs leading-relaxed font-sans'>{log.details}</p>
                          ) : (
                            <span className='text-muted-foreground/50 text-xs italic'>—</span>
                          )}
                        </TableCell>

                        <TableCell className='text-muted-foreground font-mono text-xs'>
                          <div className='flex items-center gap-1.5'>
                            <Icons.clock className='text-violet-400 size-3' />
                            {formatRiyadh(new Date(log.created_at), 'hh:mm:ss a - yyyy/MM/dd', {
                              locale: ar
                            })}
                          </div>
                        </TableCell>

                        <TableCell className='text-muted-foreground font-mono text-xs'>
                          <div className='flex items-center gap-1.5'>
                            <Icons.language className='text-slate-400 size-3' />
                            {log.ip_address || '127.0.0.1'}
                          </div>
                        </TableCell>

                        <TableCell className='text-center'>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => setSingleDeleteId(log.id)}
                            className='size-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                            title='حذف السجل نهائياً'
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>

            {/* Pagination */}
            <Pagination
              page={page}
              total={total}
              totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => p + 1)}
            />
          </>
        ) : (
          /* Empty state */
          <Card className='border-border/60 border-2 border-dashed py-16 text-center rounded-2xl'>
            <CardContent className='flex flex-col items-center'>
              <div className='bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 mb-4 flex size-16 items-center justify-center rounded-2xl border border-emerald-200 dark:border-emerald-800'>
                <CheckCircle2 className='size-8' />
              </div>
              <h3 className='text-lg font-bold text-foreground'>سجل العمليات فارغ تماماً</h3>
              <p className='text-muted-foreground mx-auto mt-1 max-w-sm text-xs leading-relaxed'>
                لا توجد سجلات في قاعدة البيانات حالياً، أو تم مسح كافة السجلات السابقة بنجاح.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 1. Single Delete Modal */}
      <AlertDialog open={!!singleDeleteId} onOpenChange={(open) => !open && setSingleDeleteId(null)}>
        <AlertDialogContent dir="rtl" className="max-w-md">
          <AlertDialogHeader className="text-right space-y-2">
            <div className="size-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="size-5" />
            </div>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              تأكيد حذف سجل العملية نهائياً
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذه الخطوة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse justify-start gap-2 pt-2">
            <AlertDialogAction
              onClick={handleDeleteSingle}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
            >
              <Trash2 className="size-3.5" />
              حذف نهائي
            </AlertDialogAction>
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 2. Bulk Delete Modal */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent dir="rtl" className="max-w-md">
          <AlertDialogHeader className="text-right space-y-2">
            <div className="size-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="size-5" />
            </div>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              تأكيد حذف {selectedIds.length} سجل محدد
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              سيتم حذف كافة السجلات المحددة نهائياً وبلا رجعة من قاعدة البيانات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse justify-start gap-2 pt-2">
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
            >
              <Trash2 className="size-3.5" />
              حذف المحدد نهائياً
            </AlertDialogAction>
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 3. Clear All Logs Modal */}
      <AlertDialog open={isClearAllOpen} onOpenChange={setIsClearAllOpen}>
        <AlertDialogContent dir="rtl" className="max-w-md">
          <AlertDialogHeader className="text-right space-y-3">
            <div className="size-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="size-6" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              تفريغ ومسح سجل العمليات بالكامل
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              أنت على وشك <strong className="text-rose-600">حذف كافة سجلات العمليات والنشاطات ({total} سجل)</strong> نهائياً من قاعدة البيانات.
              <br />
              <span className="font-bold text-rose-600 block mt-2">
                ⚠️ تحذير: هذه العملية لا يمكن التراجع عنها وستقوم بتصفير سجل النشاط بالكامل.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse justify-start gap-2 pt-2">
            <AlertDialogAction
              onClick={handleClearAll}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
            >
              <Trash2 className="size-4" />
              تأكيد مسح كافة السجلات نهائياً
            </AlertDialogAction>
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

function Pagination({
  page,
  total,
  totalPages,
  onPrev,
  onNext
}: {
  page: number;
  total: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (!total || total <= 20) return null;

  return (
    <Card className="rounded-2xl border shadow-xs">
      <CardFooter className='justify-between py-3 px-4'>
        <span className='text-muted-foreground text-xs font-medium tabular-nums'>
          إجمالي العمليات: {total} · صفحة {page} من {totalPages}
        </span>
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='sm' disabled={page <= 1} onClick={onPrev} className='gap-1.5 h-8 text-xs font-semibold'>
            <Icons.chevronRight className='size-3.5' />
            <span className='hidden sm:inline'>السابقة</span>
          </Button>
          <Button
            variant='outline'
            size='sm'
            disabled={page >= totalPages}
            onClick={onNext}
            className='gap-1.5 h-8 text-xs font-semibold'
          >
            <span className='hidden sm:inline'>التالية</span>
            <Icons.chevronLeft className='size-3.5' />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
