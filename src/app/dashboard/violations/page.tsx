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
import { violationApi, employeeApi, vehicleApi } from '@/lib/aams/services';
import type { TrafficViolation, Employee, Vehicle } from '@/types/aams';
import { formatRiyadhDate, getTodayRiyadh } from '@/lib/aams/riyadh-time';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  RECORDED: { label: 'مسجلة', variant: 'secondary' },
  DEDUCTED: { label: 'تم الخصم', variant: 'default' },
  DISPUTED: { label: 'معترض عليها', variant: 'outline' },
  PAID: { label: 'مسددة', variant: 'default' }
};

export default function ViolationsPage() {
  const [violations, setViolations] = useState<TrafficViolation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalAmount: 0,
    deductedAmount: 0,
    totalCount: 0
  });

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingViolation, setEditingViolation] = useState<TrafficViolation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [violationNumber, setViolationNumber] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('تجاوز سرعة');
  const [violationDate, setViolationDate] = useState(getTodayRiyadh());
  const [city, setCity] = useState('الرياض');
  const [status, setStatus] = useState('RECORDED');
  const [notes, setNotes] = useState('');

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const res = await violationApi.getAll({
        status: activeTab === 'ALL' ? undefined : activeTab,
        search,
        start_date: startDate,
        end_date: endDate,
        limit: 200
      });
      setViolations(res.data || []);
      setStats({
        totalAmount: res.total_amount || 0,
        deductedAmount: res.deducted_amount || 0,
        totalCount: res.total_count || 0
      });
    } catch (err: any) {
      toast.error('فشل في جلب قائمة المخالفات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, [activeTab, startDate, endDate]);

  useEffect(() => {
    employeeApi.getAll({ limit: 500 }).then(res => setEmployees(res.data || [])).catch(() => {});
    vehicleApi.getAll({ limit: 500 }).then(res => setVehicles(res.data || [])).catch(() => {});
  }, []);

  const handleOpenAdd = () => {
    setEditingViolation(null);
    setViolationNumber('');
    setEmployeeId('');
    setVehiclePlate('');
    setAmount('');
    setReason('تجاوز سرعة');
    setViolationDate(getTodayRiyadh());
    setCity('الرياض');
    setStatus('RECORDED');
    setNotes('');
    setModalOpen(true);
  };

  const handleOpenEdit = (v: TrafficViolation) => {
    setEditingViolation(v);
    setViolationNumber(v.violation_number || '');
    setEmployeeId(v.employee_id || '');
    setVehiclePlate(v.vehicle_plate || '');
    setAmount(v.amount?.toString() || '');
    setReason(v.reason || 'تجاوز سرعة');
    setViolationDate(v.violation_date ? v.violation_date.split('T')[0] : getTodayRiyadh());
    setCity(v.city || 'الرياض');
    setStatus(v.status || 'RECORDED');
    setNotes(v.notes || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح للمخالفة');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<TrafficViolation> = {
        violation_number: violationNumber,
        employee_id: employeeId || undefined,
        vehicle_plate: vehiclePlate,
        amount: parseFloat(amount),
        reason,
        violation_date: violationDate,
        city,
        status,
        notes
      };

      if (editingViolation) {
        await violationApi.update(editingViolation.id, payload);
        toast.success('تم تعديل بيانات المخالفة بنجاح');
      } else {
        await violationApi.create(payload);
        toast.success('تم تسجيل المخالفة بنجاح');
      }

      setModalOpen(false);
      fetchViolations();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'حدث خطأ أثناء حفظ المخالفة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await violationApi.update(id, { status: newStatus });
      toast.success(`تم تحديث حالة المخالفة إلى: ${STATUS_LABELS[newStatus]?.label || newStatus}`);
      fetchViolations();
    } catch (err: any) {
      toast.error('فشل في تحديث الحالة');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المخالفة؟')) return;
    try {
      await violationApi.delete(id);
      toast.success('تم حذف المخالفة بنجاح');
      fetchViolations();
    } catch (err: any) {
      toast.error('فشل في حذف المخالفة');
    }
  };

  const filteredViolations = violations.filter(v => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      v.violation_number?.toLowerCase().includes(s) ||
      v.vehicle_plate?.toLowerCase().includes(s) ||
      v.reason?.toLowerCase().includes(s) ||
      v.employee?.name?.toLowerCase().includes(s)
    );
  });

  const pendingAmount = stats.totalAmount - stats.deductedAmount;

  return (
    <PageContainer>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Icons.violation className="h-7 w-7 text-rose-500" />
              المخالفات المرورية
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              تسجيل ومتابعة المخالفات المرورية والخصم من مستحقات المناديب
            </p>
          </div>
          <Button onClick={handleOpenAdd} className="bg-rose-600 hover:bg-rose-700 text-white gap-2">
            <Icons.add className="h-4 w-4" />
            تسجيل مخالفة جديدة
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-rose-100 bg-rose-50/40 dark:border-rose-950/40 dark:bg-rose-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-rose-900 dark:text-rose-200">إجمالي مبالغ المخالفات</CardTitle>
              <Icons.dollarSign className="h-4 w-4 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                {stats.totalAmount.toLocaleString('ar-SA')} <span className="text-sm font-normal text-slate-500">ر.س</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/40 dark:border-emerald-950/40 dark:bg-emerald-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-200">المبالغ المخصومة / المسددة</CardTitle>
              <Icons.check className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {stats.deductedAmount.toLocaleString('ar-SA')} <span className="text-sm font-normal text-slate-500">ر.س</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-100 bg-amber-50/40 dark:border-amber-950/40 dark:bg-amber-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-200">المتبقي / بانتظار الخصم</CardTitle>
              <Icons.clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {pendingAmount.toLocaleString('ar-SA')} <span className="text-sm font-normal text-slate-500">ر.س</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">عدد المخالفات</CardTitle>
              <Icons.warning className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.totalCount} <span className="text-sm font-normal text-slate-500">مخالفة</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="grid grid-cols-4 w-full md:w-auto">
              <TabsTrigger value="ALL">الكل</TabsTrigger>
              <TabsTrigger value="RECORDED">مسجلة</TabsTrigger>
              <TabsTrigger value="DEDUCTED">تم الخصم</TabsTrigger>
              <TabsTrigger value="DISPUTED">معترض عليها</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <div className="relative w-full md:w-64">
              <Icons.search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="بحث برقم المخالفة أو المندوب..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <Button variant="outline" onClick={fetchViolations}>
              <Icons.refresh className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>جدول المخالفات</CardTitle>
            <CardDescription>قائمة المخالفات المرورية وحالة معالجتها</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75 dark:bg-slate-900/50">
                    <TableHead className="text-right">رقم المخالفة</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">السبب / المخالفة</TableHead>
                    <TableHead className="text-right">المندوب</TableHead>
                    <TableHead className="text-right">الدباب / اللوحة</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-center">تحديث الحالة</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                        <Icons.spinner className="h-6 w-6 animate-spin mx-auto mb-2 text-rose-600" />
                        جارٍ تحميل المخالفات...
                      </TableCell>
                    </TableRow>
                  ) : filteredViolations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                        لا توجد مخالفات مرورية مطابقة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredViolations.map(v => {
                      const st = STATUS_LABELS[v.status] || { label: v.status, variant: 'outline' };
                      return (
                        <TableRow key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                          <TableCell className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {v.violation_number || '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatRiyadhDate(v.violation_date)}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{v.reason}</span>
                            {v.city && <span className="text-xs text-slate-400 block">{v.city}</span>}
                          </TableCell>
                          <TableCell>
                            {v.employee ? (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{v.employee.name}</span>
                                {v.employee.key_number && (
                                  <Badge variant="outline" className="text-xs">
                                    #{v.employee.key_number}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {v.vehicle_plate ? (
                              <Badge variant="secondary" className="font-mono">
                                🛵 {v.vehicle_plate}
                              </Badge>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            {v.amount} ر.س
                          </TableCell>
                          <TableCell>
                            <Badge variant={st.variant}>
                              {st.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {v.status === 'RECORDED' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(v.id, 'DEDUCTED')}
                                className="h-7 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              >
                                خصم من المندوب
                              </Button>
                            ) : v.status === 'DEDUCTED' ? (
                              <span className="text-xs text-emerald-600 font-medium">✓ تم الخصم</span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(v.id, 'DEDUCTED')}
                                className="h-7 text-xs"
                              >
                                تسوية الخصم
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(v)}
                                className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              >
                                <Icons.edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(v.id)}
                                className="h-8 w-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              >
                                <Icons.trash className="h-4 w-4" />
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

        {/* Modal */}
        <Sheet open={modalOpen} onOpenChange={setModalOpen}>
          <SheetContent className="sm:max-w-[500px] overflow-y-auto" dir="rtl">
            <SheetHeader>
              <SheetTitle>{editingViolation ? 'تعديل بيانات المخالفة' : 'تسجيل مخالفة جديدة'}</SheetTitle>
              <SheetDescription>
                أدخل تفاصيل المخالفة والمبلغ والمندوب المعني
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>رقم المخالفة</Label>
                  <Input
                    placeholder="مثال: 10458829"
                    value={violationNumber}
                    onChange={e => setViolationNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>المبلغ (ر.س) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="مثال: 150"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>المندوب</Label>
                  <Select value={employeeId} onValueChange={(val) => setEmployeeId(val || '')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="اختر المندوب">
                        {employeeId
                          ? (() => {
                              const emp = employees.find(e => e.id === employeeId);
                              return emp ? `${emp.name} (${emp.key_number || emp.employee_number || 'بدون رقم'})` : 'اختر المندوب';
                            })()
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} ({emp.key_number || emp.employee_number || 'بدون رقم'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>الدباب / اللوحة</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="مثال: 2565"
                      value={vehiclePlate}
                      onChange={e => setVehiclePlate(e.target.value)}
                    />
                    {vehicles.length > 0 && (
                      <Select value={vehiclePlate} onValueChange={(val) => setVehiclePlate(val || '')}>
                        <SelectTrigger className="w-[110px]">
                          <SelectValue placeholder="الأسطول" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.map(v => (
                            <SelectItem key={v.id} value={v.plate_number}>
                              {v.plate_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>نوع المخالفة / السبب *</Label>
                  <Select value={reason} onValueChange={(val) => setReason(val || '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر السبب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="تجاوز سرعة">تجاوز سرعة</SelectItem>
                      <SelectItem value="قطع إشارة">قطع إشارة</SelectItem>
                      <SelectItem value="عدم ارتداء حزام الأمان">عدم ارتداء حزام الأمان</SelectItem>
                      <SelectItem value="استخدام الجوال أثناء القيادة">استخدام الجوال أثناء القيادة</SelectItem>
                      <SelectItem value="وقوف ممنوع">وقوف ممنوع</SelectItem>
                      <SelectItem value="عدم حمل رخصة قيادة">عدم حمل رخصة قيادة</SelectItem>
                      <SelectItem value="مخالفة أخرى">مخالفة أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>حالة المخالفة</Label>
                  <Select value={status} onValueChange={(val) => setStatus(val || '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECORDED">مسجلة (جديدة)</SelectItem>
                      <SelectItem value="DEDUCTED">تم الخصم من المندوب</SelectItem>
                      <SelectItem value="DISPUTED">معترض عليها</SelectItem>
                      <SelectItem value="PAID">مسددة بالكامل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>تاريخ المخالفة</Label>
                  <Input
                    type="date"
                    value={violationDate}
                    onChange={e => setViolationDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>المدينة</Label>
                  <Input
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="مثال: الرياض"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>ملاحظات</Label>
                <Textarea
                  placeholder="أي تفاصيل أو ملاحظات..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <SheetFooter className="gap-2 pt-6 mt-auto">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="w-full">
                  إلغاء
                </Button>
                <Button type="submit" disabled={submitting} className="bg-rose-600 hover:bg-rose-700 text-white w-full">
                  {submitting ? 'جارٍ الحفظ...' : editingViolation ? 'حفظ التعديلات' : 'تسجيل المخالفة'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </PageContainer>
  );
}
