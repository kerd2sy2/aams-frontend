'use client';

import React, { useEffect, useState } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { violationApi, employeeApi } from '@/lib/aams/services';
import type { TrafficViolation, Employee } from '@/types/aams';
import { formatRiyadhDate, getTodayRiyadh } from '@/lib/aams/riyadh-time';

const STATUS_LABELS: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
  }
> = {
  RECORDED: { label: 'مسجل', variant: 'secondary' },
  PARTIAL: {
    label: 'مخصوم جزئياً',
    variant: 'outline',
    className: 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/30 font-semibold'
  },
  DEDUCTED: { label: 'تم الخصم بالكامل', variant: 'default' },
  DISPUTED: { label: 'معترض عليه', variant: 'outline' },
  PAID: { label: 'مسدد بالكامل', variant: 'default' }
};

const PENALTY_REASONS = [
  'تأخير عن الدوام',
  'غياب بدون إذن',
  'عدم الالتزام بالزي الرسمي',
  'تلف أو فقدان عهدة',
  'إهمال في العمل أو تسليم الطلبات',
  'مخالفة تعليمات المشرف',
  'سوء التعامل مع العميل',
  'جزاء إداري عام',
  'خصم مالي مباشر',
  'جزاء آخر'
];

export default function PenaltiesPage() {
  const [penalties, setPenalties] = useState<TrafficViolation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Main Create/Edit Sheet
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPenalty, setEditingPenalty] = useState<TrafficViolation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Partial Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payingPenalty, setPayingPenalty] = useState<TrafficViolation | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Form fields
  const [penaltyNumber, setPenaltyNumber] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [reason, setReason] = useState('تأخير عن الدوام');
  const [penaltyDate, setPenaltyDate] = useState(getTodayRiyadh());
  const [status, setStatus] = useState('RECORDED');
  const [notes, setNotes] = useState('');

  const fetchPenalties = async () => {
    setLoading(true);
    try {
      const res = await violationApi.getAll({
        status: activeTab === 'ALL' ? undefined : activeTab,
        search,
        start_date: startDate,
        end_date: endDate,
        limit: 300
      });

      // Filter to penalties or show all recorded administrative records
      const allItems = res.data || [];
      const penaltyItems = allItems.filter(
        (v) =>
          PENALTY_REASONS.includes(v.reason) ||
          v.reason?.includes('جزاء') ||
          v.reason?.includes('خصم') ||
          v.reason?.includes('تأخير') ||
          v.reason?.includes('غياب') ||
          v.reason?.includes('زي') ||
          v.reason?.includes('عهدة')
      );

      // If user has specific items or wants to see all penalties
      setPenalties(penaltyItems.length > 0 ? penaltyItems : allItems);
    } catch (err: any) {
      toast.error('فشل في جلب قائمة الجزاءات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPenalties();
  }, [activeTab, startDate, endDate]);

  useEffect(() => {
    employeeApi
      .getAll({ limit: 500 })
      .then((res) => setEmployees(res.data || []))
      .catch(() => {});
  }, []);

  const handleOpenAdd = () => {
    setEditingPenalty(null);
    setPenaltyNumber('');
    setEmployeeId('');
    setAmount('');
    setPaidAmount('');
    setReason('تأخير عن الدوام');
    setPenaltyDate(getTodayRiyadh());
    setStatus('RECORDED');
    setNotes('');
    setModalOpen(true);
  };

  const handleOpenEdit = (p: TrafficViolation) => {
    setEditingPenalty(p);
    setPenaltyNumber(p.violation_number || '');
    setEmployeeId(p.employee_id || '');
    setAmount(p.amount?.toString() || '');
    setPaidAmount((p.paid_amount || 0).toString());
    setReason(p.reason || 'جزاء إداري عام');
    setPenaltyDate(p.violation_date ? p.violation_date.split('T')[0] : getTodayRiyadh());
    setStatus(p.status || 'RECORDED');
    setNotes(p.notes || '');
    setModalOpen(true);
  };

  const handleOpenPayment = (p: TrafficViolation) => {
    setPayingPenalty(p);
    const remaining = Math.max(0, (p.amount || 0) - (p.paid_amount || 0));
    setPaymentAmount(remaining > 0 ? remaining.toString() : '');
    setPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPenalty) return;
    const payVal = parseFloat(paymentAmount);
    if (!payVal || payVal <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح للدفعة');
      return;
    }

    setPaymentSubmitting(true);
    try {
      await violationApi.update(payingPenalty.id, {
        add_payment: payVal
      });
      toast.success(`تم تسجيل خصم دفعة بقيمة ${payVal.toLocaleString('ar-SA')} ر.س بنجاح`);
      setPaymentModalOpen(false);
      fetchPenalties();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'فشل في تسجيل الدفعة');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح للجزاء');
      return;
    }
    if (!employeeId) {
      toast.error('يرجى اختيار الموظف أو المندوب المعني بالجزاء');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<TrafficViolation> = {
        violation_number: penaltyNumber || `PEN-${Date.now().toString().slice(-6)}`,
        employee_id: employeeId,
        amount: parseFloat(amount),
        paid_amount: paidAmount ? parseFloat(paidAmount) : 0,
        reason,
        violation_date: penaltyDate,
        status,
        notes
      };

      if (editingPenalty) {
        await violationApi.update(editingPenalty.id, payload);
        toast.success('تم تعديل بيانات الجزاء بنجاح');
      } else {
        await violationApi.create(payload);
        toast.success('تم تسجيل الجزاء الإداري بنجاح وإرساله لتطبيق المندوب');
      }

      setModalOpen(false);
      fetchPenalties();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'حدث خطأ أثناء حفظ الجزاء');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الجزاء؟')) return;
    try {
      await violationApi.delete(id);
      toast.success('تم حذف الجزاء بنجاح');
      fetchPenalties();
    } catch (err: any) {
      toast.error('فشل في حذف الجزاء');
    }
  };

  const filteredPenalties = penalties.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.violation_number?.toLowerCase().includes(s) ||
      p.reason?.toLowerCase().includes(s) ||
      p.employee?.name?.toLowerCase().includes(s) ||
      p.employee?.key_number?.toLowerCase().includes(s)
    );
  });

  const totalAmount = filteredPenalties.reduce((sum, p) => sum + (p.amount || 0), 0);
  const deductedAmount = filteredPenalties.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
  const pendingAmount = Math.max(0, totalAmount - deductedAmount);

  return (
    <PageContainer
      pageTitle='الجزاءات والخصومات الإدارية'
      pageDescription='تسجيل ومتابعة الجزاءات والخصومات المالية للمناديب والموظفين مع نظام التجزئة والتقسيط'
      pageHeaderAction={
        <Button
          onClick={handleOpenAdd}
          className='gap-2 font-bold shadow-xs bg-amber-600 hover:bg-amber-700 text-white'
        >
          <Icons.add className='size-4' />
          تسجيل جزاء جديد
        </Button>
      }
    >
      <div className='flex flex-1 flex-col gap-4' dir='rtl'>
        {/* Stats Cards */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Card className='border-amber-100 bg-amber-50/40 dark:border-amber-950/40 dark:bg-amber-950/20'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-amber-900 dark:text-amber-200'>
                إجمالي مبالغ الجزاءات
              </CardTitle>
              <Icons.dollarSign className='h-4 w-4 text-amber-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-amber-700 dark:text-amber-400'>
                {totalAmount.toLocaleString('ar-SA')}{' '}
                <span className='text-sm font-normal text-slate-500'>ر.س</span>
              </div>
            </CardContent>
          </Card>

          <Card className='border-emerald-100 bg-emerald-50/40 dark:border-emerald-950/40 dark:bg-emerald-950/20'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-emerald-900 dark:text-emerald-200'>
                المبالغ المخصومة / المسددة
              </CardTitle>
              <Icons.check className='h-4 w-4 text-emerald-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-emerald-700 dark:text-emerald-400'>
                {deductedAmount.toLocaleString('ar-SA')}{' '}
                <span className='text-sm font-normal text-slate-500'>ر.س</span>
              </div>
            </CardContent>
          </Card>

          <Card className='border-rose-100 bg-rose-50/40 dark:border-rose-950/40 dark:bg-rose-950/20'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-rose-900 dark:text-rose-200'>
                المتبقي بانتظار الخصم
              </CardTitle>
              <Icons.clock className='h-4 w-4 text-rose-600' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-rose-700 dark:text-rose-400'>
                {pendingAmount.toLocaleString('ar-SA')}{' '}
                <span className='text-sm font-normal text-slate-500'>ر.س</span>
              </div>
            </CardContent>
          </Card>

          <Card className='border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium text-slate-600 dark:text-slate-400'>
                عدد الجزاءات
              </CardTitle>
              <Icons.warning className='h-4 w-4 text-slate-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-slate-900 dark:text-slate-100'>
                {filteredPenalties.length}{' '}
                <span className='text-sm font-normal text-slate-500'>جزاء</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs & Search */}
        <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full md:w-auto'>
            <TabsList className='grid grid-cols-5 w-full md:w-auto'>
              <TabsTrigger value='ALL'>الكل</TabsTrigger>
              <TabsTrigger value='RECORDED'>مسجل</TabsTrigger>
              <TabsTrigger value='PARTIAL'>مخصوم جزئياً</TabsTrigger>
              <TabsTrigger value='DEDUCTED'>تم الخصم</TabsTrigger>
              <TabsTrigger value='DISPUTED'>معترض عليه</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className='flex gap-2'>
            <div className='relative w-full md:w-64'>
              <Icons.search className='absolute right-3 top-2.5 h-4 w-4 text-slate-400' />
              <Input
                placeholder='بحث باسم الموظف أو رقم الجزاء...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='pr-9'
              />
            </div>
            <Button variant='outline' onClick={fetchPenalties}>
              <Icons.refresh className='h-4 w-4' />
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>جدول الجزاءات الإدارية والمالية</CardTitle>
            <CardDescription>
              قائمة الجزاءات والخصومات المطبقة على المناديب وحالة السداد
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='rounded-md border overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-slate-50/75 dark:bg-slate-900/50'>
                    <TableHead className='text-right'>رقم الجزاء</TableHead>
                    <TableHead className='text-right'>التاريخ</TableHead>
                    <TableHead className='text-right'>نوع الجزاء / السبب</TableHead>
                    <TableHead className='text-right'>الموظف / المندوب</TableHead>
                    <TableHead className='text-right'>المبلغ الكلي</TableHead>
                    <TableHead className='text-right'>المخصوم / المتبقي</TableHead>
                    <TableHead className='text-right'>الحالة</TableHead>
                    <TableHead className='text-center'>تجزئة / خصم دفعة</TableHead>
                    <TableHead className='text-center'>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className='h-32 text-center text-slate-500'>
                        <Icons.spinner className='h-6 w-6 animate-spin mx-auto mb-2 text-amber-600' />
                        جارٍ تحميل الجزاءات...
                      </TableCell>
                    </TableRow>
                  ) : filteredPenalties.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className='h-32 text-center text-slate-500'>
                        لا توجد جزاءات مسجلة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPenalties.map((p) => {
                      const st = STATUS_LABELS[p.status] || { label: p.status, variant: 'outline' };
                      const totalAmt = p.amount || 0;
                      const paidAmt = p.paid_amount || 0;
                      const remAmt = Math.max(0, totalAmt - paidAmt);
                      const percent =
                        totalAmt > 0 ? Math.min(100, Math.round((paidAmt / totalAmt) * 100)) : 0;

                      return (
                        <TableRow
                          key={p.id}
                          className='hover:bg-slate-50/50 dark:hover:bg-slate-900/50'
                        >
                          <TableCell className='font-mono font-bold text-slate-900 dark:text-slate-100'>
                            {p.violation_number || '-'}
                          </TableCell>
                          <TableCell className='whitespace-nowrap'>
                            {formatRiyadhDate(p.violation_date)}
                          </TableCell>
                          <TableCell>
                            <span className='font-semibold text-slate-800 dark:text-slate-200'>
                              {p.reason}
                            </span>
                            {p.notes && (
                              <span className='text-xs text-slate-400 block max-w-xs truncate'>
                                {p.notes}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {p.employee ? (
                              <div className='flex items-center gap-2'>
                                <span className='font-semibold'>{p.employee.name}</span>
                                {p.employee.key_number && (
                                  <Badge variant='outline' className='text-xs font-mono'>
                                    #{p.employee.key_number}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className='text-slate-400'>-</span>
                            )}
                          </TableCell>
                          <TableCell className='font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap'>
                            {totalAmt.toLocaleString('ar-SA')} ر.س
                          </TableCell>
                          <TableCell className='min-w-[140px]'>
                            <div className='flex flex-col gap-1 text-xs'>
                              <div className='flex justify-between'>
                                <span className='text-emerald-600 font-semibold'>
                                  مخصوم: {paidAmt.toLocaleString('ar-SA')}
                                </span>
                                <span className='text-amber-600 font-semibold'>
                                  متبقي: {remAmt.toLocaleString('ar-SA')}
                                </span>
                              </div>
                              <div className='h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden'>
                                <div
                                  className='h-full bg-emerald-500 rounded-full transition-all'
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={st.variant} className={st.className}>
                              {st.label}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-center'>
                            {remAmt > 0 ? (
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => handleOpenPayment(p)}
                                className='h-7 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30'
                              >
                                خصم دفعة ({remAmt} ر.س)
                              </Button>
                            ) : (
                              <span className='text-xs text-emerald-600 font-semibold'>
                                ✓ تم الخصم بالكامل
                              </span>
                            )}
                          </TableCell>
                          <TableCell className='text-center'>
                            <div className='flex items-center justify-center gap-1'>
                              <Button
                                variant='ghost'
                                size='icon'
                                onClick={() => handleOpenEdit(p)}
                                className='h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                              >
                                <Icons.edit className='h-4 w-4' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='icon'
                                onClick={() => handleDelete(p.id)}
                                className='h-8 w-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                              >
                                <Icons.trash className='h-4 w-4' />
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

        {/* Partial Payment Dialog */}
        <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <DialogContent className='sm:max-w-md' dir='rtl'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-emerald-600'>
                <Icons.check className='h-5 w-5' />
                تسجيل دفعة / تجزئة خصم الجزاء
              </DialogTitle>
              <DialogDescription>يمكنك خصم جزء من مبلغ الجزاء أو تسويته بالكامل.</DialogDescription>
            </DialogHeader>

            {payingPenalty && (
              <form onSubmit={handlePaymentSubmit} className='space-y-4 py-2'>
                <div className='rounded-lg bg-slate-50 dark:bg-slate-900/60 p-3 space-y-2 border text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-slate-500'>رقم الجزاء:</span>
                    <span className='font-mono font-bold'>
                      {payingPenalty.violation_number || '-'}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-slate-500'>الموظف / المندوب:</span>
                    <span className='font-semibold'>{payingPenalty.employee?.name || '-'}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-slate-500'>إجمالي المبلغ:</span>
                    <span className='font-bold text-rose-600'>{payingPenalty.amount} ر.س</span>
                  </div>
                  <div className='flex justify-between border-t pt-1'>
                    <span className='text-slate-500'>المخصوم سابقاً:</span>
                    <span className='font-bold text-emerald-600'>
                      {payingPenalty.paid_amount || 0} ر.س
                    </span>
                  </div>
                  <div className='flex justify-between font-bold'>
                    <span className='text-slate-700 dark:text-slate-300'>المتبقي حالياً:</span>
                    <span className='text-amber-600'>
                      {Math.max(0, (payingPenalty.amount || 0) - (payingPenalty.paid_amount || 0))}{' '}
                      ر.س
                    </span>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label className='text-xs font-semibold'>
                    المبلغ المراد خصمه الآن (ر.س) <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    type='number'
                    step='0.01'
                    placeholder='أدخل المبلغ...'
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    className='font-mono font-bold text-lg text-start'
                  />
                  <div className='flex gap-2 pt-1'>
                    {[25, 50, 100].map((quickVal) => (
                      <Button
                        key={quickVal}
                        type='button'
                        size='sm'
                        variant='outline'
                        onClick={() => setPaymentAmount(quickVal.toString())}
                        className='text-xs h-7'
                      >
                        +{quickVal} ر.س
                      </Button>
                    ))}
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      onClick={() => {
                        const rem = Math.max(
                          0,
                          (payingPenalty.amount || 0) - (payingPenalty.paid_amount || 0)
                        );
                        setPaymentAmount(rem.toString());
                      }}
                      className='text-xs h-7 text-emerald-600 border-emerald-300 hover:bg-emerald-50'
                    >
                      كامل المتبقي
                    </Button>
                  </div>
                </div>

                <DialogFooter className='gap-2 sm:gap-0 pt-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setPaymentModalOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type='submit'
                    disabled={paymentSubmitting}
                    className='bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                  >
                    {paymentSubmitting ? 'جارٍ الحفظ...' : 'تأكيد الخصم'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Create / Edit Sheet */}
        <Sheet open={modalOpen} onOpenChange={setModalOpen}>
          <SheetContent className='sm:max-w-lg w-full p-0 flex flex-col'>
            <SheetHeader>
              <div className='flex items-center gap-3'>
                <div className='size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0'>
                  <Icons.warning className='size-5' />
                </div>
                <div className='min-w-0 flex-1'>
                  <SheetTitle>
                    {editingPenalty ? 'تعديل بيانات الجزاء الإداري' : 'تسجيل جزاء إداري / مالي جديد'}
                  </SheetTitle>
                  <SheetDescription>
                    حدد الموظف ونوع الجزاء والمبلغ المطلوب خصمه وتفاصيل الواقعة
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <form onSubmit={handleSubmit} className='flex-1 flex flex-col min-h-0'>
              <div className='flex-1 overflow-y-auto px-6 py-5 space-y-4'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>
                    الموظف / المندوب المعني <span className='text-destructive'>*</span>
                  </Label>
                  <Select value={employeeId} onValueChange={(val) => setEmployeeId(val || '')}>
                    <SelectTrigger className='w-full h-10'>
                      <SelectValue placeholder='اختر الموظف / المندوب'>
                        {employeeId
                          ? (() => {
                              const emp = employees.find((e) => e.id === employeeId);
                              return emp
                                ? `${emp.name} (${emp.key_number || emp.employee_number || 'بدون رقم'})`
                                : 'اختر الموظف';
                            })()
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} ({emp.key_number || emp.employee_number || 'بدون رقم'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>
                      نوع الجزاء / السبب <span className='text-destructive'>*</span>
                    </Label>
                    <Select value={reason} onValueChange={(val) => setReason(val || '')}>
                      <SelectTrigger className='h-10'>
                        <SelectValue placeholder='اختر السبب' />
                      </SelectTrigger>
                      <SelectContent>
                        {PENALTY_REASONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>
                      المبلغ الإجمالي للجزاء (ر.س) <span className='text-destructive'>*</span>
                    </Label>
                    <Input
                      type='number'
                      step='0.01'
                      placeholder='مثال: 50'
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className='h-10 text-start font-mono font-bold'
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>المبلغ المخصوم حالياً (ر.س)</Label>
                    <Input
                      type='number'
                      step='0.01'
                      placeholder='0.00'
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className='h-10 text-start font-mono text-emerald-600 font-bold'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>حالة الجزاء</Label>
                    <Select value={status} onValueChange={(val) => setStatus(val || '')}>
                      <SelectTrigger className='h-10'>
                        <SelectValue placeholder='الحالة' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='RECORDED'>مسجل (جديد)</SelectItem>
                        <SelectItem value='PARTIAL'>مخصوم جزئياً</SelectItem>
                        <SelectItem value='DEDUCTED'>تم الخصم بالكامل</SelectItem>
                        <SelectItem value='DISPUTED'>معترض عليه</SelectItem>
                        <SelectItem value='PAID'>مسدد بالكامل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>رقم الإشعار / الجزاء (اختياري)</Label>
                    <Input
                      placeholder='مثال: PEN-1049'
                      value={penaltyNumber}
                      onChange={(e) => setPenaltyNumber(e.target.value)}
                      className='h-10 text-start font-mono'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>تاريخ الجزاء</Label>
                    <Input
                      type='date'
                      value={penaltyDate}
                      onChange={(e) => setPenaltyDate(e.target.value)}
                      className='h-10'
                    />
                  </div>
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>ملاحظات وتفاصيل الواقعة</Label>
                  <Textarea
                    placeholder='أي تفاصيل أو مبررات إدارية...'
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className='resize-none rounded-lg'
                  />
                </div>
              </div>

              <SheetFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setModalOpen(false)}
                  className='h-10 px-5 font-medium'
                >
                  إلغاء
                </Button>
                <Button
                  type='submit'
                  disabled={submitting}
                  className='h-10 px-6 font-bold shadow-xs bg-amber-600 hover:bg-amber-700 text-white'
                >
                  {submitting ? 'جارٍ الحفظ...' : editingPenalty ? 'حفظ التعديلات' : 'تسجيل الجزاء'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </PageContainer>
  );
}
