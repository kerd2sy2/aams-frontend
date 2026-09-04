'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportApi, workApi } from '@/lib/aams/services';
import type { WorkSessionDetail } from '@/types/aams';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  IconGauge,
  IconCamera,
  IconCheck,
  IconAlertTriangle,
  IconClock,
  IconSearch,
  IconFilter,
  IconEye,
  IconBike,
  IconPhoto,
  IconCalendar,
  IconArrowsDiff,
  IconUser,
  IconRefresh,
  IconEdit,
  IconInfoCircle
} from '@tabler/icons-react';

export default function OdometerAuditView() {
  const queryClient = useQueryClient();

  // Filters State - Default to 'pending' to load uncertified requests first and immediately
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed'>('pending');
  const [editedOnly, setEditedOnly] = useState(false);
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month' | 'all'>('all');

  // Dialog State for Single Image Preview
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    reading: number;
    employeeName: string;
  } | null>(null);

  // Dialog State for Side-by-Side Comparison
  const [comparisonSession, setComparisonSession] = useState<WorkSessionDetail | null>(null);

  // Dialog State for Review / Audit Action & Editing
  const [reviewModalSession, setReviewModalSession] = useState<WorkSessionDetail | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [editOrdersCount, setEditOrdersCount] = useState<number>(0);
  const [editStartKM, setEditStartKM] = useState<number>(0);
  const [editEndKM, setEditEndKM] = useState<number>(0);
  const [editFuelCost, setEditFuelCost] = useState<number>(0);

  // Fetch sessions - prioritized by pending status
  const {
    data: reportsData,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['odometer-audits', dateFilter, statusFilter],
    queryFn: async () => {
      let startDate: string | undefined;
      let endDate: string | undefined;
      const now = new Date();

      if (dateFilter === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        startDate = todayStr;
        endDate = todayStr;
      } else if (dateFilter === '7days') {
        const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = last7.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
      } else if (dateFilter === 'month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = firstDay.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
      }

      const res = await reportApi.getReports({
        start_date: startDate,
        end_date: endDate,
        is_reviewed:
          statusFilter === 'pending' ? false : statusFilter === 'reviewed' ? true : undefined,
        limit: statusFilter === 'pending' ? 100 : 50
      });
      return res?.data || [];
    }
  });

  const sessions: WorkSessionDetail[] = useMemo(() => {
    return Array.isArray(reportsData) ? reportsData : [];
  }, [reportsData]);

  // Review & Edit mutation
  const reviewMutation = useMutation({
    mutationFn: async ({
      sessionId,
      isReviewed,
      notes,
      ordersCount,
      startKM,
      endKM,
      fuelCost
    }: {
      sessionId: string;
      isReviewed: boolean;
      notes?: string;
      ordersCount?: number;
      startKM?: number;
      endKM?: number;
      fuelCost?: number;
    }) => {
      return workApi.reviewWorkSession(sessionId, {
        is_reviewed: isReviewed,
        review_notes: notes,
        orders_count: ordersCount,
        start_km: startKM,
        end_km: endKM,
        fuel_cost: fuelCost
      });
    },
    onSuccess: () => {
      toast.success('تمت مصادقة وحفظ تعديلات الشفت بنجاح ✅');
      queryClient.invalidateQueries({ queryKey: ['odometer-audits'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setReviewModalSession(null);
      setReviewNotes('');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر تصديق الشفت');
    }
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const total = sessions.length;
    const reviewed = sessions.filter((s) => s.is_reviewed).length;
    const pending = total - reviewed;
    const edited = sessions.filter((s) => s.is_edited_by_supervisor).length;

    return { total, reviewed, pending, edited };
  }, [sessions]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    const list = sessions.filter((s) => {
      // Search match
      if (search.trim()) {
        const q = search.toLowerCase();
        const empName = (s.employee_name || s.employee?.name || '').toLowerCase();
        const nationalId = (s.national_id || s.employee?.national_id || '').toLowerCase();
        const bikeNum = (s.motorcycle_number || '').toLowerCase();
        if (!empName.includes(q) && !nationalId.includes(q) && !bikeNum.includes(q)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'pending' && s.is_reviewed) return false;
      if (statusFilter === 'reviewed' && !s.is_reviewed) return false;

      // Edited filter
      if (editedOnly && !s.is_edited_by_supervisor) return false;

      return true;
    });

    // Sort uncertified (pending review) first, then by start time descending
    return list.sort((a, b) => {
      if (!a.is_reviewed && b.is_reviewed) return -1;
      if (a.is_reviewed && !b.is_reviewed) return 1;
      return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
    });
  }, [sessions, search, statusFilter, editedOnly]);

  const handleOpenReview = (session: WorkSessionDetail) => {
    setReviewModalSession(session);
    setReviewNotes(session.review_notes || '');
    setEditOrdersCount(session.orders_count || 0);
    setEditStartKM(session.start_km || 0);
    setEditEndKM(session.end_km || 0);
    setEditFuelCost(session.fuel_cost || 0);
  };

  const handleConfirmReview = (isReviewed: boolean) => {
    if (!reviewModalSession) return;
    reviewMutation.mutate({
      sessionId: reviewModalSession.id,
      isReviewed,
      notes: reviewNotes,
      ordersCount: Number(editOrdersCount),
      startKM: Number(editStartKM),
      endKM: Number(editEndKM),
      fuelCost: Number(editFuelCost)
    });
  };

  return (
    <div className='space-y-6 pb-12' dir='rtl'>
      {/* Header */}
      <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/50 pb-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-foreground flex items-center gap-2'>
            <IconGauge className='h-7 w-7 text-primary' />
            مراجعة وتصديق عدادات الشفتات
          </h1>
          <p className='text-sm text-muted-foreground mt-1'>
            لوحة مخصصة للمشرفين لمراجعة وتعديل ومصادقة الطلبات والعدادات الميدانية
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => refetch()}
            className='flex items-center gap-1.5'
            disabled={isLoading}
          >
            <IconRefresh className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث البيانات
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card className='border-border/60 bg-card shadow-xs'>
          <CardContent className='p-5 flex items-center justify-between'>
            <div>
              <p className='text-xs font-medium text-muted-foreground'>إجمالي الشفتات المسجلة</p>
              <h3 className='text-2xl font-bold text-foreground mt-1'>{stats.total}</h3>
            </div>
            <div className='h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary'>
              <IconGauge className='h-6 w-6' />
            </div>
          </CardContent>
        </Card>

        <Card className='border-border/60 bg-card shadow-xs'>
          <CardContent className='p-5 flex items-center justify-between'>
            <div>
              <p className='text-xs font-medium text-amber-500'>بانتظار مصادقة المشرف</p>
              <h3 className='text-2xl font-bold text-amber-500 mt-1'>{stats.pending}</h3>
            </div>
            <div className='h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500'>
              <IconClock className='h-6 w-6' />
            </div>
          </CardContent>
        </Card>

        <Card className='border-border/60 bg-card shadow-xs'>
          <CardContent className='p-5 flex items-center justify-between'>
            <div>
              <p className='text-xs font-medium text-emerald-500'>تمت المصادقة والاعتماد</p>
              <h3 className='text-2xl font-bold text-emerald-500 mt-1'>{stats.reviewed}</h3>
            </div>
            <div className='h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500'>
              <IconCheck className='h-6 w-6' />
            </div>
          </CardContent>
        </Card>

        <Card className='border-border/60 bg-card shadow-xs'>
          <CardContent className='p-5 flex items-center justify-between'>
            <div>
              <p className='text-xs font-medium text-indigo-500'>شفتات عُدلت بواسطة المشرف</p>
              <h3 className='text-2xl font-bold text-indigo-500 mt-1'>{stats.edited}</h3>
            </div>
            <div className='h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500'>
              <IconEdit className='h-6 w-6' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className='border-border/60 bg-card/50 shadow-xs'>
        <CardContent className='p-4 flex flex-col md:flex-row items-center gap-3 justify-between'>
          <div className='flex flex-1 items-center gap-2 w-full md:w-auto'>
            <div className='relative flex-1 max-w-sm'>
              <IconSearch className='absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='ابحث بالاسم، الهوية، أو رقم الدباب...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='pr-9 text-sm'
              />
            </div>

            {/* Date Filters */}
            <div className='flex items-center gap-1 bg-muted/60 p-1 rounded-lg'>
              <Button
                variant={dateFilter === 'today' ? 'default' : 'ghost'}
                size='xs'
                onClick={() => setDateFilter('today')}
              >
                اليوم
              </Button>
              <Button
                variant={dateFilter === '7days' ? 'default' : 'ghost'}
                size='xs'
                onClick={() => setDateFilter('7days')}
              >
                7 أيام
              </Button>
              <Button
                variant={dateFilter === 'month' ? 'default' : 'ghost'}
                size='xs'
                onClick={() => setDateFilter('month')}
              >
                الشهر الحالي
              </Button>
              <Button
                variant={dateFilter === 'all' ? 'default' : 'ghost'}
                size='xs'
                onClick={() => setDateFilter('all')}
              >
                الكل
              </Button>
            </div>
          </div>

          <div className='flex items-center gap-2 w-full md:w-auto justify-end'>
            {/* Status Filter */}
            <div className='flex items-center gap-1 bg-muted/60 p-1 rounded-lg'>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'ghost'}
                size='xs'
                onClick={() => setStatusFilter('pending')}
                className={
                  statusFilter === 'pending'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'text-amber-500 hover:text-amber-600'
                }
              >
                بانتظار المصادقة (الأولوية)
              </Button>
              <Button
                variant={statusFilter === 'all' ? 'default' : 'ghost'}
                size='xs'
                onClick={() => setStatusFilter('all')}
              >
                الكل
              </Button>
              <Button
                variant={statusFilter === 'reviewed' ? 'default' : 'ghost'}
                size='xs'
                onClick={() => setStatusFilter('reviewed')}
                className='text-emerald-500 hover:text-emerald-600'
              >
                مصادق عليه ✅
              </Button>
            </div>

            {/* Edited only toggle */}
            <Button
              variant={editedOnly ? 'default' : 'outline'}
              size='sm'
              onClick={() => setEditedOnly(!editedOnly)}
              className='flex items-center gap-1.5 text-xs'
            >
              <IconEdit className='h-3.5 w-3.5' />
              {editedOnly ? 'عرض الكل' : 'المعدل من المشرف فقط'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className='border-border/60 shadow-xs overflow-hidden'>
        <CardHeader className='p-4 border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between'>
          <div>
            <CardTitle className='text-base font-semibold'>
              سجل شفتات العمل ومراجعة وتصديق الطلبات
            </CardTitle>
            <CardDescription className='text-xs'>
              عرض {filteredSessions.length} من أصل {sessions.length} شفت
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/40 hover:bg-muted/40'>
                  <TableHead className='text-right'>المندوب والفرع</TableHead>
                  <TableHead className='text-right'>الدباب</TableHead>
                  <TableHead className='text-center'>عداد البداية والصورة</TableHead>
                  <TableHead className='text-center'>عداد النهاية والصورة</TableHead>
                  <TableHead className='text-center'>المسافة والطلبات والوقود</TableHead>
                  <TableHead className='text-center'>حالة المصادقة والتعديل</TableHead>
                  <TableHead className='text-center'>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className='h-32 text-center text-muted-foreground'>
                      جاري تحميل بيانات الشفتات والعدادات...
                    </TableCell>
                  </TableRow>
                ) : filteredSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className='h-32 text-center text-muted-foreground'>
                      لا توجد شفتات مطابقة لمعايير البحث الحالية
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSessions.map((session) => {
                    return (
                      <TableRow key={session.id} className='hover:bg-muted/30 transition-colors'>
                        {/* Employee & Branch */}
                        <TableCell>
                          <div className='font-semibold text-foreground'>
                            {session.employee_name || session.employee?.name || 'مندوب غير محدد'}
                          </div>
                          <div className='text-xs text-muted-foreground mt-0.5 flex items-center gap-2'>
                            <span>
                              هوية: {session.national_id || session.employee?.national_id || '—'}
                            </span>
                            {(session.branch_name || session.employee?.branch?.name) && (
                              <Badge variant='outline' className='text-[10px] px-1 py-0'>
                                {session.branch_name || session.employee?.branch?.name}
                              </Badge>
                            )}
                          </div>
                          <div className='text-[11px] text-muted-foreground mt-1 flex items-center gap-1'>
                            <IconCalendar className='h-3 w-3' />
                            {new Date(session.start_time).toLocaleDateString('ar-SA')}{' '}
                            {new Date(session.start_time).toLocaleTimeString('ar-SA', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </TableCell>

                        {/* Motorcycle */}
                        <TableCell>
                          <div className='flex flex-col gap-1'>
                            <div className='flex items-center gap-1.5 text-xs'>
                              <Badge variant='secondary' className='text-xs font-mono font-bold'>
                                {session.motorcycle_number ||
                                  session.employee?.motorcycle_number ||
                                  '—'}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>

                        {/* Start KM & Photo */}
                        <TableCell className='text-center'>
                          <div className='font-bold text-foreground font-mono'>
                            {session.start_km.toLocaleString()} كم
                          </div>
                          {session.original_start_km &&
                            session.original_start_km !== session.start_km && (
                              <span className='text-[10px] text-muted-foreground line-through block'>
                                الأصل: {session.original_start_km}
                              </span>
                            )}
                          {session.start_km_image ? (
                            <Button
                              variant='outline'
                              size='xs'
                              onClick={() =>
                                setPreviewImage({
                                  url: session.start_km_image!,
                                  title: 'صورة عداد البداية',
                                  reading: session.start_km,
                                  employeeName:
                                    session.employee_name || session.employee?.name || ''
                                })
                              }
                              className='mt-1.5 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10'
                            >
                              <IconPhoto className='h-3.5 w-3.5' />
                              عرض الصورة
                            </Button>
                          ) : (
                            <span className='text-[11px] text-muted-foreground block mt-1'>
                              لا توجد صورة
                            </span>
                          )}
                        </TableCell>

                        {/* End KM & Photo */}
                        <TableCell className='text-center'>
                          {session.status === 'COMPLETED' ? (
                            <>
                              <div className='font-bold text-foreground font-mono'>
                                {session.end_km.toLocaleString()} كم
                              </div>
                              {session.original_end_km &&
                                session.original_end_km !== session.end_km && (
                                  <span className='text-[10px] text-muted-foreground line-through block'>
                                    الأصل: {session.original_end_km}
                                  </span>
                                )}
                              {session.end_km_image ? (
                                <Button
                                  variant='outline'
                                  size='xs'
                                  onClick={() =>
                                    setPreviewImage({
                                      url: session.end_km_image!,
                                      title: 'صورة عداد النهاية',
                                      reading: session.end_km,
                                      employeeName:
                                        session.employee_name || session.employee?.name || ''
                                    })
                                  }
                                  className='mt-1.5 text-xs gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                                >
                                  <IconPhoto className='h-3.5 w-3.5' />
                                  عرض الصورة
                                </Button>
                              ) : (
                                <span className='text-[11px] text-muted-foreground block mt-1'>
                                  لا توجد صورة
                                </span>
                              )}
                            </>
                          ) : (
                            <Badge
                              variant='outline'
                              className='text-amber-500 border-amber-500/30 text-xs'
                            >
                              الشفت قائم الآن 🟢
                            </Badge>
                          )}
                        </TableCell>

                        {/* Distance & Orders */}
                        <TableCell className='text-center'>
                          <div className='font-bold text-primary font-mono text-sm'>
                            {session.distance > 0 ? `${session.distance.toFixed(1)} كم` : '—'}
                          </div>
                          <div className='text-xs text-foreground font-medium mt-0.5'>
                            {session.orders_count} طلبات | {session.fuel_cost} ر.س
                          </div>
                          {session.original_orders_count &&
                            session.original_orders_count !== session.orders_count && (
                              <div className='text-[10px] text-muted-foreground line-through'>
                                الطلبات الأصلية: {session.original_orders_count}
                              </div>
                            )}
                        </TableCell>

                        {/* Review Status & Supervisor Edit Badges */}
                        <TableCell className='text-center'>
                          <div className='flex flex-col items-center gap-1'>
                            {session.is_reviewed ? (
                              <Badge className='bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs gap-1'>
                                <IconCheck className='h-3 w-3' />
                                مصادق عليه ومحفوظ ✅
                              </Badge>
                            ) : (
                              <Badge
                                variant='outline'
                                className='text-amber-500 border-amber-500/30 text-xs gap-1'
                              >
                                <IconClock className='h-3 w-3' />
                                بانتظار مصادقة المشرف ⏳
                              </Badge>
                            )}

                            {/* Supervisor modification badge */}
                            {session.is_edited_by_supervisor && (
                              <Badge
                                variant='secondary'
                                className='bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 text-[10px] gap-1'
                              >
                                <IconEdit className='h-2.5 w-2.5' />
                                تم التعديل بواسطة {session.edited_by_name || 'المشرف'}
                              </Badge>
                            )}

                            {session.review_notes && (
                              <span className='text-[10px] text-muted-foreground line-clamp-1 max-w-[140px] italic'>
                                "{session.review_notes}"
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className='text-center'>
                          <div className='flex items-center justify-center gap-1.5'>
                            {/* Side-by-side comparison button */}
                            {(session.start_km_image || session.end_km_image) && (
                              <Button
                                variant='outline'
                                size='xs'
                                onClick={() => setComparisonSession(session)}
                                title='مقارنة الصورتين جنباً إلى جنب'
                                className='text-xs gap-1'
                              >
                                <IconArrowsDiff className='h-3.5 w-3.5 text-blue-500' />
                                مقارنة
                              </Button>
                            )}

                            {/* Review & Edit button */}
                            <Button
                              variant={session.is_reviewed ? 'outline' : 'default'}
                              size='xs'
                              onClick={() => handleOpenReview(session)}
                              className='text-xs gap-1'
                            >
                              <IconEdit className='h-3.5 w-3.5' />
                              {session.is_reviewed ? 'تعديل / إعادة تدقيق' : 'مصادقة وتعديل'}
                            </Button>
                          </div>
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

      {/* ================= DIALOG 1: SINGLE IMAGE PREVIEW ================= */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className='max-w-xl' dir='rtl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <IconPhoto className='h-5 w-5 text-primary' />
              {previewImage?.title} — {previewImage?.employeeName}
            </DialogTitle>
            <DialogDescription>
              قراءة العداد المسجلة بالنظام:{' '}
              <span className='font-bold text-foreground font-mono'>
                {previewImage?.reading} كم
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className='rounded-xl overflow-hidden border border-border/60 bg-black/5 flex items-center justify-center my-2 max-h-[450px]'>
            {previewImage?.url ? (
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className='w-full h-auto max-h-[440px] object-contain rounded-lg'
              />
            ) : (
              <div className='p-12 text-muted-foreground text-sm'>لا توجد صورة متوفرة</div>
            )}
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setPreviewImage(null)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG 2: SIDE-BY-SIDE COMPARISON ================= */}
      <Dialog open={!!comparisonSession} onOpenChange={() => setComparisonSession(null)}>
        <DialogContent className='max-w-4xl' dir='rtl'>
          <DialogHeader>
            <DialogTitle className='flex items-center justify-between'>
              <span className='flex items-center gap-2'>
                <IconArrowsDiff className='h-5 w-5 text-primary' />
                مقارنة وتدقيق عدادات الشفت —{' '}
                {comparisonSession?.employee_name || comparisonSession?.employee?.name}
              </span>
              <Badge variant='secondary' className='font-mono text-xs'>
                المسافة: {comparisonSession?.distance.toFixed(1)} كم
              </Badge>
            </DialogTitle>
            <DialogDescription>
              تدقيق بصري لصور عداد البداية وعداد النهاية لمطابقة القراءات المدخلة من المندوب
            </DialogDescription>
          </DialogHeader>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 my-2'>
            {/* Start Odometer Box */}
            <div className='border border-border/60 rounded-xl p-3 bg-muted/10 flex flex-col'>
              <div className='flex items-center justify-between mb-2'>
                <span className='font-bold text-sm text-foreground flex items-center gap-1.5'>
                  <span className='h-2.5 w-2.5 rounded-full bg-blue-500 inline-block' />
                  عداد البداية (Start KM)
                </span>
                <Badge variant='outline' className='font-mono font-bold'>
                  {comparisonSession?.start_km} كم
                </Badge>
              </div>
              <div className='rounded-lg overflow-hidden border border-border/40 bg-black/5 flex-1 flex items-center justify-center min-h-[260px] max-h-[300px]'>
                {comparisonSession?.start_km_image ? (
                  <img
                    src={comparisonSession.start_km_image}
                    alt='Start KM'
                    className='w-full h-full object-contain'
                  />
                ) : (
                  <div className='text-xs text-muted-foreground p-6'>
                    لم يتم رفع صورة لعداد البداية
                  </div>
                )}
              </div>
            </div>

            {/* End Odometer Box */}
            <div className='border border-border/60 rounded-xl p-3 bg-muted/10 flex flex-col'>
              <div className='flex items-center justify-between mb-2'>
                <span className='font-bold text-sm text-foreground flex items-center gap-1.5'>
                  <span className='h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block' />
                  عداد النهاية (End KM)
                </span>
                <Badge variant='outline' className='font-mono font-bold'>
                  {comparisonSession?.end_km} كم
                </Badge>
              </div>
              <div className='rounded-lg overflow-hidden border border-border/40 bg-black/5 flex-1 flex items-center justify-center min-h-[260px] max-h-[300px]'>
                {comparisonSession?.end_km_image ? (
                  <img
                    src={comparisonSession.end_km_image}
                    alt='End KM'
                    className='w-full h-full object-contain'
                  />
                ) : (
                  <div className='text-xs text-muted-foreground p-6'>
                    لم يتم رفع صورة لعداد النهاية
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Shift Details Footer Banner */}
          <div className='bg-muted/30 border border-border/40 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-2'>
            <span>
              <strong>رقم الدباب:</strong> {comparisonSession?.motorcycle_number || '—'}
            </span>
            <span>
              <strong>الطلبات المنجزة:</strong> {comparisonSession?.orders_count}
            </span>
            <span>
              <strong>تكلفة الوقود:</strong> {comparisonSession?.fuel_cost} ر.س
            </span>
          </div>

          <DialogFooter className='gap-2'>
            <Button variant='outline' onClick={() => setComparisonSession(null)}>
              إغلاق
            </Button>
            <Button
              variant='default'
              onClick={() => {
                const s = comparisonSession;
                setComparisonSession(null);
                if (s) handleOpenReview(s);
              }}
              className='gap-1.5'
            >
              <IconCheck className='h-4 w-4' />
              مصادقة وتعديل الشفت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG 3: REVIEW & SUPERVISOR EDIT MODAL ================= */}
      <Dialog open={!!reviewModalSession} onOpenChange={() => setReviewModalSession(null)}>
        <DialogContent className='max-w-lg' dir='rtl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <IconCheck className='h-5 w-5 text-emerald-500' />
              مراجعة وتعديل ومصادقة شفت المندوب
            </DialogTitle>
            <DialogDescription>
              {reviewModalSession?.employee_name || reviewModalSession?.employee?.name} | دباب:{' '}
              {reviewModalSession?.motorcycle_number || '—'}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 my-2'>
            {/* Odometer Photos Thumbnail helper */}
            {(reviewModalSession?.start_km_image || reviewModalSession?.end_km_image) && (
              <div className='flex gap-2 p-2 bg-muted/30 rounded-lg border border-border/40 text-xs'>
                {reviewModalSession.start_km_image && (
                  <div className='flex items-center gap-1.5 flex-1'>
                    <img
                      src={reviewModalSession.start_km_image}
                      alt='Start'
                      className='h-10 w-10 object-cover rounded border'
                    />
                    <span>صورة البداية ({reviewModalSession.start_km})</span>
                  </div>
                )}
                {reviewModalSession.end_km_image && (
                  <div className='flex items-center gap-1.5 flex-1'>
                    <img
                      src={reviewModalSession.end_km_image}
                      alt='End'
                      className='h-10 w-10 object-cover rounded border'
                    />
                    <span>صورة النهاية ({reviewModalSession.end_km})</span>
                  </div>
                )}
              </div>
            )}

            {/* Editable Fields Grid */}
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='text-xs font-semibold text-foreground mb-1 block'>
                  عدد الطلبات المنجزة
                </label>
                <Input
                  type='number'
                  value={editOrdersCount}
                  onChange={(e) => setEditOrdersCount(Number(e.target.value))}
                  className='font-mono text-sm'
                />
                {reviewModalSession?.original_orders_count && (
                  <span className='text-[10px] text-muted-foreground'>
                    المدخل الأصلي: {reviewModalSession.original_orders_count}
                  </span>
                )}
              </div>

              <div>
                <label className='text-xs font-semibold text-foreground mb-1 block'>
                  تكلفة الوقود (ر.س)
                </label>
                <Input
                  type='number'
                  step='0.1'
                  value={editFuelCost}
                  onChange={(e) => setEditFuelCost(Number(e.target.value))}
                  className='font-mono text-sm'
                />
              </div>

              <div>
                <label className='text-xs font-semibold text-foreground mb-1 block'>
                  قراءة عداد البداية (كم)
                </label>
                <Input
                  type='number'
                  value={editStartKM}
                  onChange={(e) => setEditStartKM(Number(e.target.value))}
                  className='font-mono text-sm'
                />
              </div>

              <div>
                <label className='text-xs font-semibold text-foreground mb-1 block'>
                  قراءة عداد النهاية (كم)
                </label>
                <Input
                  type='number'
                  value={editEndKM}
                  onChange={(e) => setEditEndKM(Number(e.target.value))}
                  className='font-mono text-sm'
                />
              </div>
            </div>

            {/* Calculated Distance Feedback */}
            <div className='bg-primary/5 border border-primary/20 rounded-lg p-2.5 flex items-center justify-between text-xs'>
              <span className='text-muted-foreground'>المسافة المحسوبة بعد التدقيق:</span>
              <span className='font-bold text-primary font-mono text-sm'>
                {editEndKM > editStartKM ? `${(editEndKM - editStartKM).toFixed(1)} كم` : '0 كم'}
              </span>
            </div>

            <div>
              <label className='text-xs font-semibold text-foreground mb-1 block'>
                ملاحظات المشرف على المصادقة / سبب التعديل (اختياري)
              </label>
              <Textarea
                placeholder='أدخل أي ملاحظات حول قراءة العدادات أو سبب تعديل الطلبات...'
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={2}
                className='text-sm'
              />
            </div>
          </div>

          <DialogFooter className='gap-2'>
            <Button
              variant='outline'
              onClick={() => handleConfirmReview(false)}
              disabled={reviewMutation.isPending}
              className='text-rose-500 hover:text-rose-600'
            >
              تعيين كـ غير مصادق
            </Button>
            <Button
              variant='default'
              onClick={() => handleConfirmReview(true)}
              disabled={reviewMutation.isPending}
              className='gap-1 bg-emerald-600 hover:bg-emerald-700 text-white'
            >
              <IconCheck className='h-4 w-4' />
              مصادقة واعتماد وتثبيت التعديلات ✅
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
