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
import { ticketApi, employeeApi } from '@/lib/aams/services';
import type { SupportTicket, Employee } from '@/types/aams';
import { formatRiyadhDate } from '@/lib/aams/riyadh-time';

const CATEGORIES: Record<string, string> = {
  OPERATIONAL: 'تشغيلي / طلبات',
  FINANCIAL: 'مالي / مستحقات',
  VEHICLE: 'مركبات ودبابات',
  APPLICATION: 'تطبيق ونظام',
  OTHER: 'عام / أخرى'
};

const PRIORITY_BADGES: Record<string, { label: string; color: string }> = {
  LOW: { label: 'منخفض', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  MEDIUM: { label: 'متوسط', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' },
  HIGH: { label: 'عالي', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
  URGENT: { label: 'عاجل', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' }
};

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'مفتوحة (جديدة)', color: 'bg-blue-500 text-white' },
  IN_PROGRESS: { label: 'قيد المعالجة', color: 'bg-amber-500 text-white' },
  RESOLVED: { label: 'تم الحل', color: 'bg-emerald-500 text-white' },
  CLOSED: { label: 'مغلقة', color: 'bg-slate-500 text-white' }
};

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [employeeId, setEmployeeId] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('OPERATIONAL');
  const [priority, setPriority] = useState('MEDIUM');
  const [status, setStatus] = useState('OPEN');
  const [description, setDescription] = useState('');
  const [resolution, setResolution] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await ticketApi.getAll({
        status: activeTab === 'ALL' ? undefined : activeTab,
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
        search,
        limit: 200
      });
      setTickets(res.data || []);
    } catch (err: any) {
      toast.error('فشل في جلب تذاكر الدعم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [activeTab, categoryFilter]);

  useEffect(() => {
    employeeApi.getAll({ limit: 500 }).then(res => setEmployees(res.data || [])).catch(() => {});
  }, []);

  const handleOpenAdd = () => {
    setEditingTicket(null);
    setEmployeeId('');
    setSubject('');
    setCategory('OPERATIONAL');
    setPriority('MEDIUM');
    setStatus('OPEN');
    setDescription('');
    setResolution('');
    setModalOpen(true);
  };

  const handleOpenEdit = (t: SupportTicket) => {
    setEditingTicket(t);
    setEmployeeId(t.employee_id || '');
    setSubject(t.subject || '');
    setCategory(t.category || 'OPERATIONAL');
    setPriority(t.priority || 'MEDIUM');
    setStatus(t.status || 'OPEN');
    setDescription(t.description || '');
    setResolution(t.resolution || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) {
      toast.error('يرجى كتابة عنوان التذكرة وتفاصيل الشكوى');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<SupportTicket> = {
        employee_id: employeeId || undefined,
        subject,
        category,
        priority,
        status,
        description,
        resolution
      };

      if (editingTicket) {
        await ticketApi.update(editingTicket.id, payload);
        toast.success('تم تعديل التذكرة بنجاح');
      } else {
        await ticketApi.create(payload);
        toast.success('تم فتح تذكرة جديدة بنجاح');
      }

      setModalOpen(false);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'حدث خطأ أثناء حفظ التذكرة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await ticketApi.update(id, { status: newStatus });
      toast.success(`تم تحديث حالة التذكرة إلى: ${STATUS_BADGES[newStatus]?.label || newStatus}`);
      fetchTickets();
    } catch (err: any) {
      toast.error('فشل في تحديث حالة التذكرة');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه التذكرة؟')) return;
    try {
      await ticketApi.delete(id);
      toast.success('تم حذف التذكرة بنجاح');
      fetchTickets();
    } catch (err: any) {
      toast.error('فشل في حذف التذكرة');
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      t.ticket_number?.toLowerCase().includes(s) ||
      t.subject?.toLowerCase().includes(s) ||
      t.description?.toLowerCase().includes(s) ||
      t.employee?.name?.toLowerCase().includes(s)
    );
  });

  const openCount = tickets.filter(t => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

  return (
    <PageContainer>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Icons.ticket className="h-7 w-7 text-sky-500" />
              تذاكر الدعم والشكاوى
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              متابعة شكاوى وبلاغات المناديب والمشاكل التشغيلية والمالية
            </p>
          </div>
          <Button onClick={handleOpenAdd} className="bg-sky-600 hover:bg-sky-700 text-white gap-2">
            <Icons.add className="h-4 w-4" />
            فتح تذكرة جديدة
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-blue-100 bg-blue-50/40 dark:border-blue-950/40 dark:bg-blue-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-200">تذاكر جديدة ومفتوحة</CardTitle>
              <Icons.alertCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {openCount} <span className="text-sm font-normal text-slate-500">تذكرة</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-100 bg-amber-50/40 dark:border-amber-950/40 dark:bg-amber-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-200">قيد المعالجة والمتابعة</CardTitle>
              <Icons.clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {inProgressCount} <span className="text-sm font-normal text-slate-500">تذكرة</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/40 dark:border-emerald-950/40 dark:bg-emerald-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-200">تم حلها وإغلاقها</CardTitle>
              <Icons.check className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {resolvedCount} <span className="text-sm font-normal text-slate-500">تذكرة</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">إجمالي التذاكر</CardTitle>
              <Icons.ticket className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {tickets.length} <span className="text-sm font-normal text-slate-500">تذكرة</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs & Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="grid grid-cols-4 w-full md:w-auto">
              <TabsTrigger value="ALL">الكل</TabsTrigger>
              <TabsTrigger value="OPEN">مفتوحة</TabsTrigger>
              <TabsTrigger value="IN_PROGRESS">قيد المعالجة</TabsTrigger>
              <TabsTrigger value="RESOLVED">تم الحل</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <div className="relative w-full md:w-64">
              <Icons.search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="بحث برقم التذكرة أو الموضوع..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <Button variant="outline" onClick={fetchTickets}>
              <Icons.refresh className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة تذاكر الدعم</CardTitle>
            <CardDescription>عرض ومتابعة بلاغات المناديب وحلول المشاكل</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75 dark:bg-slate-900/50">
                    <TableHead className="text-right">رقم التذكرة</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الموضوع</TableHead>
                    <TableHead className="text-right">التصنيف</TableHead>
                    <TableHead className="text-right">المندوب</TableHead>
                    <TableHead className="text-right">الأولوية</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-center">تحديث سريع</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                        <Icons.spinner className="h-6 w-6 animate-spin mx-auto mb-2 text-sky-600" />
                        جارٍ تحميل تذاكر الدعم...
                      </TableCell>
                    </TableRow>
                  ) : filteredTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                        لا توجد تذاكر دعم مطابقة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTickets.map(t => {
                      const pri = PRIORITY_BADGES[t.priority] || { label: t.priority, color: 'bg-slate-100' };
                      const st = STATUS_BADGES[t.status] || { label: t.status, color: 'bg-slate-500 text-white' };
                      return (
                        <TableRow key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                          <TableCell className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {t.ticket_number}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatRiyadhDate(t.created_at)}
                          </TableCell>
                          <TableCell className="max-w-[220px]">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate" title={t.subject}>
                              {t.subject}
                            </span>
                            <span className="text-xs text-slate-400 block truncate">{t.description}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {CATEGORIES[t.category] || t.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {t.employee ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{t.employee.name}</span>
                                {t.employee.key_number && (
                                  <Badge variant="outline" className="text-xs">
                                    #{t.employee.key_number}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">الإدارة</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${pri.color}`}>
                              {pri.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>
                              {st.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {t.status === 'OPEN' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(t.id, 'IN_PROGRESS')}
                                className="h-7 text-xs text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                              >
                                بدء المعالجة
                              </Button>
                            )}
                            {t.status === 'IN_PROGRESS' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(t.id, 'RESOLVED')}
                                className="h-7 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              >
                                إتمام الحل
                              </Button>
                            )}
                            {(t.status === 'RESOLVED' || t.status === 'CLOSED') && (
                              <span className="text-xs text-emerald-600 font-medium">✓ تم الحل</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(t)}
                                className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              >
                                <Icons.edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(t.id)}
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
              <DialogTitle>{editingTicket ? `تعديل التذكرة #${editingTicket.ticket_number}` : 'فتح تذكرة دعم جديدة'}</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل التذكرة وتصنيف المشكلة ومستوى الأولوية
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>المندوب صاحب المشكلة (اختياري)</Label>
                <Select value={employeeId} onValueChange={(val) => setEmployeeId(val || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المندوب" />
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
                <Label>موضوع التذكرة *</Label>
                <Input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="مثال: مشكلة في صرف مستحقات الأسبوع الماضي"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>التصنيف *</Label>
                  <Select value={category} onValueChange={(val) => setCategory(val || '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="التصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPERATIONAL">تشغيلي / طلبات</SelectItem>
                      <SelectItem value="FINANCIAL">مالي / مستحقات</SelectItem>
                      <SelectItem value="VEHICLE">مركبات ودبابات</SelectItem>
                      <SelectItem value="APPLICATION">تطبيق ونظام</SelectItem>
                      <SelectItem value="OTHER">عام / أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                      <SelectItem value="URGENT">عاجل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>تفاصيل الشكوى / البلاغ *</Label>
                <Textarea
                  placeholder="اشرح المشكلة بالتفصيل..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  rows={3}
                />
              </div>

              {editingTicket && (
                <>
                  <div className="space-y-1.5">
                    <Label>حالة التذكرة</Label>
                    <Select value={status} onValueChange={(val) => setStatus(val || '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="الحالة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">مفتوحة</SelectItem>
                        <SelectItem value="IN_PROGRESS">قيد المعالجة</SelectItem>
                        <SelectItem value="RESOLVED">تم الحل</SelectItem>
                        <SelectItem value="CLOSED">مغلقة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>الحل / الإجراء المتخذ</Label>
                    <Textarea
                      placeholder="اكتب رد الدعم أو الإجراء الذي تم لحل المشكلة..."
                      value={resolution}
                      onChange={e => setResolution(e.target.value)}
                      rows={2}
                    />
                  </div>
                </>
              )}

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={submitting} className="bg-sky-600 hover:bg-sky-700 text-white">
                  {submitting ? 'جارٍ الحفظ...' : editingTicket ? 'حفظ التعديلات' : 'فتح التذكرة'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
