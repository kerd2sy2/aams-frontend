'use client';

import React, { useEffect, useState } from 'react';
import PageContainer from '@/components/layout/page-container';
import { useLocale } from '@/components/layout/locale-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { leaveApi, employeeApi } from '@/lib/aams/services';
import type { LeaveRequest, Employee } from '@/types/aams';
import { formatRiyadhDate, getTodayRiyadh } from '@/lib/aams/riyadh-time';
import { hasPermission } from '@/lib/aams/permissions';

const LEAVE_TYPES: Record<string, string> = {
  ANNUAL: 'إجازة سنوية',
  SICK: 'إجازة مرضية',
  EMERGENCY: 'إجازة طارئة',
  UNPAID: 'إجازة بدون راتب'
};

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { label: 'بانتظار الموافقة', variant: 'secondary' },
  APPROVED: { label: 'مقبولة', variant: 'default' },
  REJECTED: { label: 'مرفوضة', variant: 'destructive' }
};

export default function LeavesPage() {
  const { t, dir } = useLocale();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const canManageLeaves = hasPermission('leaves.manage');

  // Filters
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('ANNUAL');
  const [startDate, setStartDate] = useState(getTodayRiyadh());
  const [endDate, setEndDate] = useState(getTodayRiyadh());
  const [daysCount, setDaysCount] = useState('1');
  const [reason, setReason] = useState('');

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await leaveApi.getAll({
        status: activeTab === 'ALL' ? undefined : activeTab,
        search,
        limit: 200
      });
      setLeaves(res.data || []);
    } catch (err: any) {
      toast.error('فشل في جلب طلبات الإجازات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [activeTab]);

  useEffect(() => {
    employeeApi.getAll({ limit: 500 }).then(res => setEmployees(res.data || [])).catch(() => {});
  }, []);

  const handleOpenAdd = () => {
    setEmployeeId('');
    setLeaveType('ANNUAL');
    setStartDate(getTodayRiyadh());
    setEndDate(getTodayRiyadh());
    setDaysCount('1');
    setReason('');
    setModalOpen(true);
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (new Date(val) > new Date(endDate)) {
      setEndDate(val);
      setDaysCount('1');
    } else {
      calcDays(val, endDate);
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    calcDays(startDate, val);
  };

  const calcDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    setDaysCount(diffDays.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !startDate || !endDate) {
      toast.error('يرجى اختيار المندوب وتحديد التواريخ');
      return;
    }

    setSubmitting(true);
    try {
      await leaveApi.create({
        employee_id: employeeId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days_count: parseInt(daysCount) || 1,
        reason
      });
      toast.success('تم تقديم طلب الإجازة بنجاح');
      setModalOpen(false);
      fetchLeaves();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'حدث خطأ أثناء تقديم الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await leaveApi.updateStatus(id, newStatus);
      toast.success(`تم تحديث حالة الإجازة إلى: ${STATUS_LABELS[newStatus]?.label || newStatus}`);
      fetchLeaves();
    } catch (err: any) {
      toast.error('فشل في تحديث حالة الإجازة');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من مسح هذا الطلب؟ سيتم نقله إلى الأرشيف.')) return;
    try {
      await leaveApi.delete(id);
      toast.success('تم حذف الطلب ونقله للأرشيف بنجاح');
      fetchLeaves();
    } catch (err: any) {
      toast.error('فشل في حذف الطلب');
    }
  };

  const filteredLeaves = leaves.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return l.employee?.name?.toLowerCase().includes(s) || l.reason?.toLowerCase().includes(s);
  });

  const pendingCount = leaves.filter(l => l.status === 'PENDING').length;
  const approvedCount = leaves.filter(l => l.status === 'APPROVED').length;
  const rejectedCount = leaves.filter(l => l.status === 'REJECTED').length;

  return (
    <PageContainer>
      <div className="space-y-6" dir={dir}>
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Icons.leaves className="h-7 w-7 text-emerald-500" />
              {t('Leave Requests', 'طلبات الإجازات للمناديب')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('Leave Requests', 'تنظيم ومتابعة إجازات المناديب والموافقة عليها')}
            </p>
          </div>
          <Button onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Icons.add className="h-4 w-4" />
            {t('Leave Request', 'تقديم طلب إجازة')}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-amber-100 bg-amber-50/40 dark:border-amber-950/40 dark:bg-amber-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-200">بانتظار الموافقة</CardTitle>
              <Icons.clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {pendingCount} <span className="text-sm font-normal text-slate-500">طلب</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/40 dark:border-emerald-950/40 dark:bg-emerald-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-200">إجازات مقبولة</CardTitle>
              <Icons.check className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {approvedCount} <span className="text-sm font-normal text-slate-500">إجازة</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-rose-100 bg-rose-50/40 dark:border-rose-950/40 dark:bg-rose-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-rose-900 dark:text-rose-200">طلبات مرفوضة</CardTitle>
              <Icons.close className="h-4 w-4 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                {rejectedCount} <span className="text-sm font-normal text-slate-500">طلب</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">إجمالي الطلبات</CardTitle>
              <Icons.calendarTime className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {leaves.length} <span className="text-sm font-normal text-slate-500">طلب</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="grid grid-cols-4 w-full md:w-auto">
              <TabsTrigger value="ALL">الكل</TabsTrigger>
              <TabsTrigger value="PENDING">معلق</TabsTrigger>
              <TabsTrigger value="APPROVED">مقبول</TabsTrigger>
              <TabsTrigger value="REJECTED">مرفوض</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <div className="relative w-full md:w-64">
              <Icons.search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="بحث باسم المندوب..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <Button variant="outline" onClick={fetchLeaves}>
              <Icons.refresh className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>سجل الإجازات</CardTitle>
            <CardDescription>طلبات الإجازات المقدمة وحالة الموافقة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75 dark:bg-slate-900/50">
                    <TableHead className="text-right">المندوب</TableHead>
                    <TableHead className="text-right">نوع الإجازة</TableHead>
                    <TableHead className="text-right">من تاريخ</TableHead>
                    <TableHead className="text-right">إلى تاريخ</TableHead>
                    <TableHead className="text-right">المدة</TableHead>
                    <TableHead className="text-right">السبب</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-center">إجراء الاعتماد</TableHead>
                    <TableHead className="text-center">أرشفة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                        <Icons.spinner className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
                        جارٍ تحميل طلبات الإجازات...
                      </TableCell>
                    </TableRow>
                  ) : filteredLeaves.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                        لا توجد طلبات إجازة مطابقة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeaves.map(l => {
                      const st = STATUS_LABELS[l.status] || { label: l.status, variant: 'outline' };
                      return (
                        <TableRow key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                          <TableCell>
                            {l.employee ? (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{l.employee.name}</span>
                                {l.employee.key_number && (
                                  <Badge variant="outline" className="text-xs">
                                    #{l.employee.key_number}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {LEAVE_TYPES[l.leave_type] || l.leave_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-mono">{l.start_date}</TableCell>
                          <TableCell className="whitespace-nowrap font-mono">{l.end_date}</TableCell>
                          <TableCell className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {l.days_count} يوم
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{l.reason || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={st.variant}>
                              {st.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {l.status === 'PENDING' ? (
                              canManageLeaves ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusChange(l.id, 'APPROVED')}
                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    موافقة
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleStatusChange(l.id, 'REJECTED')}
                                    className="h-7 text-xs"
                                  >
                                    رفض
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">تحتاج لصلاحية</span>
                              )
                            ) : (
                              <span className="text-xs text-slate-400">
                                {l.approved_by_name ? `بواسطة: ${l.approved_by_name}` : 'تمت المعالجة'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {canManageLeaves ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(l.id)}
                                className="h-8 w-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                title="حذف الطلب (نقل للأرشيف)"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
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
          <SheetContent side="left" className="sm:max-w-[480px] overflow-y-auto" dir="rtl">
            <SheetHeader className="text-right">
              <SheetTitle className="text-xl font-bold pr-4">تقديم طلب إجازة جديد</SheetTitle>
              <SheetDescription className="pr-4">
                أدخل تفاصيل الإجازة والمندوب وفترة الإجازة
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>المندوب *</Label>
                <Select value={employeeId} onValueChange={(val) => setEmployeeId(val || '')}>
                  <SelectTrigger className="w-full text-right">
                    <SelectValue placeholder="اختر المندوب">
                      {employeeId ? employees.find(emp => emp.id === employeeId)?.name : 'اختر المندوب'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id} className="text-right">
                        {emp.name} ({emp.key_number || emp.employee_number || 'بدون رقم'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>نوع الإجازة *</Label>
                <Select value={leaveType} onValueChange={(val) => setLeaveType(val || '')}>
                  <SelectTrigger className="w-full text-right">
                    <SelectValue placeholder="نوع الإجازة">
                      {LEAVE_TYPES[leaveType] || 'نوع الإجازة'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="ANNUAL" className="text-right">إجازة سنوية</SelectItem>
                    <SelectItem value="SICK" className="text-right">إجازة مرضية</SelectItem>
                    <SelectItem value="EMERGENCY" className="text-right">إجازة طارئة</SelectItem>
                    <SelectItem value="UNPAID" className="text-right">إجازة بدون راتب</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>من تاريخ *</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => handleStartDateChange(e.target.value)}
                    className="text-right"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>إلى تاريخ *</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => handleEndDateChange(e.target.value)}
                    className="text-right"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>عدد الأيام المحسوبة</Label>
                <Input
                  type="number"
                  value={daysCount}
                  onChange={e => setDaysCount(e.target.value)}
                  min="1"
                  className="text-right"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>السبب أو الملاحظات</Label>
                <Textarea
                  placeholder="سبب طلب الإجازة أو الملاحظات..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="text-right resize-none"
                  rows={3}
                />
              </div>

              <SheetFooter className="flex flex-row justify-end gap-2 pt-6">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {submitting ? 'جارٍ التقديم...' : 'تقديم طلب الإجازة'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </PageContainer>
  );
}
