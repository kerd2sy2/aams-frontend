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
import { maintenanceRequestApi, employeeApi, vehicleApi } from '@/lib/aams/services';
import type { MaintenanceRequest, Employee, Vehicle } from '@/types/aams';
import { formatRiyadhDate } from '@/lib/aams/riyadh-time';

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  LOW: { label: 'منخفض', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  MEDIUM: { label: 'متوسط', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' },
  HIGH: { label: 'عالي', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
  URGENT: { label: 'عاجل / حرج', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' }
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'مفتوح (جديد)', color: 'bg-blue-500 text-white' },
  IN_PROGRESS: { label: 'قيد الإصلاح', color: 'bg-amber-500 text-white' },
  RESOLVED: { label: 'تم الإصلاح', color: 'bg-emerald-500 text-white' },
  CLOSED: { label: 'مغلق', color: 'bg-slate-500 text-white' }
};

export default function MaintenanceRequestsPage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<MaintenanceRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [workshopName, setWorkshopName] = useState('');
  const [status, setStatus] = useState('OPEN');
  const [notes, setNotes] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await maintenanceRequestApi.getAll({
        status: activeTab === 'ALL' ? undefined : activeTab,
        priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
        search,
        limit: 200
      });
      setRequests(res.data || []);
    } catch (err: any) {
      toast.error('فشل في جلب طلبات الصيانة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab, priorityFilter]);

  useEffect(() => {
    employeeApi.getAll({ limit: 500 }).then(res => setEmployees(res.data || [])).catch(() => {});
    vehicleApi.getAll({ limit: 500 }).then(res => setVehicles(res.data || [])).catch(() => {});
  }, []);

  const handleOpenAdd = () => {
    setEditingReq(null);
    setVehiclePlate('');
    setEmployeeId('');
    setIssueDescription('');
    setPriority('MEDIUM');
    setEstimatedCost('');
    setActualCost('');
    setWorkshopName('');
    setStatus('OPEN');
    setNotes('');
    setModalOpen(true);
  };

  const handleOpenEdit = (req: MaintenanceRequest) => {
    setEditingReq(req);
    setVehiclePlate(req.vehicle_plate || '');
    setEmployeeId(req.employee_id || '');
    setIssueDescription(req.issue_description || '');
    setPriority(req.priority || 'MEDIUM');
    setEstimatedCost(req.estimated_cost?.toString() || '');
    setActualCost(req.actual_cost?.toString() || '');
    setWorkshopName(req.workshop_name || '');
    setStatus(req.status || 'OPEN');
    setNotes(req.notes || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehiclePlate || !issueDescription) {
      toast.error('يرجى تحديد رقم اللوحة ووصف العطل');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<MaintenanceRequest> = {
        vehicle_plate: vehiclePlate,
        employee_id: employeeId || undefined,
        issue_description: issueDescription,
        priority,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : 0,
        actual_cost: actualCost ? parseFloat(actualCost) : 0,
        workshop_name: workshopName,
        status,
        notes
      };

      if (editingReq) {
        await maintenanceRequestApi.update(editingReq.id, payload);
        toast.success('تم تعديل طلب الصيانة بنجاح');
      } else {
        await maintenanceRequestApi.create(payload);
        toast.success('تم إنشاء طلب الصيانة بنجاح');
      }

      setModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'حدث خطأ أثناء حفظ الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await maintenanceRequestApi.update(id, { status: newStatus });
      toast.success(`تم تحديث حالة الصيانة إلى: ${STATUS_LABELS[newStatus]?.label || newStatus}`);
      fetchRequests();
    } catch (err: any) {
      toast.error('فشل في تحديث الحالة');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    try {
      await maintenanceRequestApi.delete(id);
      toast.success('تم حذف الطلب بنجاح');
      fetchRequests();
    } catch (err: any) {
      toast.error('فشل في حذف الطلب');
    }
  };

  const filteredRequests = requests.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.vehicle_plate?.toLowerCase().includes(s) ||
      r.issue_description?.toLowerCase().includes(s) ||
      r.workshop_name?.toLowerCase().includes(s) ||
      r.employee?.name?.toLowerCase().includes(s)
    );
  });

  const totalCost = requests.reduce((acc, r) => acc + (r.actual_cost || r.estimated_cost || 0), 0);
  const openCount = requests.filter(r => r.status === 'OPEN').length;
  const inProgressCount = requests.filter(r => r.status === 'IN_PROGRESS').length;
  const resolvedCount = requests.filter(r => r.status === 'RESOLVED' || r.status === 'CLOSED').length;

  return (
    <PageContainer>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Icons.tool className="h-7 w-7 text-indigo-500" />
              طلبات صيانة الأسطول
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              متابعة أعطال الدبابات والمركبات وتكاليف الإصلاح في الورش
            </p>
          </div>
          <Button onClick={handleOpenAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <Icons.add className="h-4 w-4" />
            إنشاء طلب صيانة
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-blue-100 bg-blue-50/40 dark:border-blue-950/40 dark:bg-blue-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-200">طلبات جديدة ومفتوحة</CardTitle>
              <Icons.alertCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {openCount} <span className="text-sm font-normal text-slate-500">طلب</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-100 bg-amber-50/40 dark:border-amber-950/40 dark:bg-amber-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-200">قيد الإصلاح بالورشة</CardTitle>
              <Icons.wrench className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {inProgressCount} <span className="text-sm font-normal text-slate-500">مركبة</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/40 dark:border-emerald-950/40 dark:bg-emerald-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-200">تم الإصلاح والجاهزية</CardTitle>
              <Icons.check className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {resolvedCount} <span className="text-sm font-normal text-slate-500">طلب</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">إجمالي تكاليف الصيانة</CardTitle>
              <Icons.dollarSign className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalCost.toLocaleString('ar-SA')} <span className="text-sm font-normal text-slate-500">ر.س</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs & Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="grid grid-cols-4 w-full md:w-auto">
              <TabsTrigger value="ALL">الكل</TabsTrigger>
              <TabsTrigger value="OPEN">مفتوح</TabsTrigger>
              <TabsTrigger value="IN_PROGRESS">قيد الإصلاح</TabsTrigger>
              <TabsTrigger value="RESOLVED">تم الحل</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <div className="relative w-full md:w-64">
              <Icons.search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="بحث باللوحة أو العطل..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <Button variant="outline" onClick={fetchRequests}>
              <Icons.refresh className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>سجل بلاغات وأعطال الصيانة</CardTitle>
            <CardDescription>متابعة تفاصيل الإصلاح وقطع الغيار والتكاليف</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75 dark:bg-slate-900/50">
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الدباب / اللوحة</TableHead>
                    <TableHead className="text-right">المندوب المُبلغ</TableHead>
                    <TableHead className="text-right">وصف العطل</TableHead>
                    <TableHead className="text-right">الأولوية</TableHead>
                    <TableHead className="text-right">الورشة / الفني</TableHead>
                    <TableHead className="text-right">التكلفة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-center">إجراء سريع</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-slate-500">
                        <Icons.spinner className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                        جارٍ تحميل طلبات الصيانة...
                      </TableCell>
                    </TableRow>
                  ) : filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-slate-500">
                        لا توجد طلبات صيانة مطابقة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map(r => {
                      const pri = PRIORITY_LABELS[r.priority] || { label: r.priority, color: 'bg-slate-100' };
                      const st = STATUS_LABELS[r.status] || { label: r.status, color: 'bg-slate-500 text-white' };
                      return (
                        <TableRow key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                          <TableCell className="whitespace-nowrap">
                            {formatRiyadhDate(r.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono">
                              🛵 {r.vehicle_plate}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {r.employee ? (
                              <span className="font-medium text-slate-900 dark:text-slate-100">{r.employee.name}</span>
                            ) : (
                              <span className="text-slate-400">الإدارة</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[240px]">
                            <span className="font-medium text-slate-800 dark:text-slate-200 block truncate" title={r.issue_description}>
                              {r.issue_description}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${pri.color}`}>
                              {pri.label}
                            </span>
                          </TableCell>
                          <TableCell>{r.workshop_name || '-'}</TableCell>
                          <TableCell className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {r.actual_cost > 0 ? `${r.actual_cost} ر.س` : r.estimated_cost > 0 ? `~${r.estimated_cost} ر.س` : '-'}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>
                              {st.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {r.status === 'OPEN' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(r.id, 'IN_PROGRESS')}
                                className="h-7 text-xs text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                              >
                                تحويل للورشة
                              </Button>
                            )}
                            {r.status === 'IN_PROGRESS' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(r.id, 'RESOLVED')}
                                className="h-7 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              >
                                تأكيد الإصلاح
                              </Button>
                            )}
                            {(r.status === 'RESOLVED' || r.status === 'CLOSED') && (
                              <span className="text-xs text-emerald-600 font-medium">✓ جاهز للعمل</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(r)}
                                className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              >
                                <Icons.edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(r.id)}
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
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-[500px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingReq ? 'تعديل طلب الصيانة' : 'إنشاء طلب صيانة جديد'}</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل العطل والدباب والتكلفة التقديرية أو الفعلية
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>رقم اللوحة / الدباب *</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="مثال: 2565"
                      value={vehiclePlate}
                      onChange={e => setVehiclePlate(e.target.value)}
                      required
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

                <div className="space-y-1.5">
                  <Label>المندوب المُبلغ (اختياري)</Label>
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
              </div>

              <div className="space-y-1.5">
                <Label>وصف العطل / المشكلة *</Label>
                <Textarea
                  placeholder="مثال: مشكلة في الفرامل الخلفية وصوت في المحرك..."
                  value={issueDescription}
                  onChange={e => setIssueDescription(e.target.value)}
                  required
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>مستوى الأولوية</Label>
                  <Select value={priority} onValueChange={(val) => setPriority(val || '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="الأولوية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">منخفض</SelectItem>
                      <SelectItem value="MEDIUM">متوسط</SelectItem>
                      <SelectItem value="HIGH">عالي</SelectItem>
                      <SelectItem value="URGENT">حرج / عاجل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>حالة الطلب</Label>
                  <Select value={status} onValueChange={(val) => setStatus(val || '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">مفتوح (جديد)</SelectItem>
                      <SelectItem value="IN_PROGRESS">قيد الإصلاح</SelectItem>
                      <SelectItem value="RESOLVED">تم الإصلاح</SelectItem>
                      <SelectItem value="CLOSED">مغلق</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>التكلفة التقديرية</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={estimatedCost}
                    onChange={e => setEstimatedCost(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>التكلفة الفعلية</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={actualCost}
                    onChange={e => setActualCost(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>اسم الورشة</Label>
                  <Input
                    placeholder="مثال: ورشة الأمانة"
                    value={workshopName}
                    onChange={e => setWorkshopName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>ملاحظات إضافية</Label>
                <Textarea
                  placeholder="قطع الغيار المستبدلة أو تفاصيل الفاتورة..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {submitting ? 'جارٍ الحفظ...' : editingReq ? 'حفظ التعديلات' : 'إنشاء الطلب'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
