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
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { fuelLogApi, employeeApi, vehicleApi } from '@/lib/aams/services';
import type { FuelLog, Employee, Vehicle } from '@/types/aams';
import { formatRiyadhDate, getTodayRiyadh } from '@/lib/aams/riyadh-time';

export default function FuelLogsPage() {
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Stats
  const [stats, setStats] = useState({
    totalCost: 0,
    totalLiters: 0,
    totalCount: 0
  });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<FuelLog | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [employeeId, setEmployeeId] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [amount, setAmount] = useState('');
  const [liters, setLiters] = useState('');
  const [fuelDate, setFuelDate] = useState(getTodayRiyadh());
  const [stationName, setStationName] = useState('');
  const [invoiceImage, setInvoiceImage] = useState('');
  const [notes, setNotes] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fuelLogApi.getAll({
        search,
        start_date: startDate,
        end_date: endDate,
        limit: 200
      });
      setLogs(res.data || []);
      setStats({
        totalCost: res.total_cost || 0,
        totalLiters: res.total_liters || 0,
        totalCount: res.total_count || 0
      });
    } catch (err: any) {
      toast.error('فشل في جلب سجلات الوقود');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate]);

  useEffect(() => {
    // Load employees & vehicles for selectors
    employeeApi.getAll({ limit: 500 }).then(res => setEmployees(res.data || [])).catch(() => {});
    vehicleApi.getAll({ limit: 500 }).then(res => setVehicles(res.data || [])).catch(() => {});
  }, []);

  const handleOpenAdd = () => {
    setEditingLog(null);
    setEmployeeId('');
    setVehiclePlate('');
    setAmount('');
    setLiters('');
    setFuelDate(getTodayRiyadh());
    setStationName('');
    setInvoiceImage('');
    setNotes('');
    setModalOpen(true);
  };

  const handleOpenEdit = (log: FuelLog) => {
    setEditingLog(log);
    setEmployeeId(log.employee_id || '');
    setVehiclePlate(log.vehicle_plate || '');
    setAmount(log.amount?.toString() || '');
    setLiters(log.liters?.toString() || '');
    setFuelDate(log.fuel_date ? log.fuel_date.split('T')[0] : getTodayRiyadh());
    setStationName(log.station_name || '');
    setInvoiceImage(log.invoice_image_url || '');
    setNotes(log.notes || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح للتعبئة');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<FuelLog> = {
        employee_id: employeeId || undefined,
        vehicle_plate: vehiclePlate,
        amount: parseFloat(amount),
        liters: liters ? parseFloat(liters) : 0,
        fuel_date: fuelDate,
        station_name: stationName,
        invoice_image_url: invoiceImage,
        notes
      };

      if (editingLog) {
        await fuelLogApi.update(editingLog.id, payload);
        toast.success('تم تعديل سجل الوقود بنجاح');
      } else {
        await fuelLogApi.create(payload);
        toast.success('تم تسجيل تعبئة الوقود بنجاح');
      }

      setModalOpen(false);
      fetchLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'حدث خطأ أثناء حفظ السجل');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
    try {
      await fuelLogApi.delete(id);
      toast.success('تم حذف السجل بنجاح');
      fetchLogs();
    } catch (err: any) {
      toast.error('فشل في حذف السجل');
    }
  };

  const filteredLogs = logs.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.vehicle_plate?.toLowerCase().includes(s) ||
      l.employee?.name?.toLowerCase().includes(s) ||
      l.station_name?.toLowerCase().includes(s) ||
      l.notes?.toLowerCase().includes(s)
    );
  });

  const avgPerLiter = stats.totalLiters > 0 ? (stats.totalCost / stats.totalLiters).toFixed(2) : '0.00';

  return (
    <PageContainer>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Icons.fuel className="h-7 w-7 text-amber-500" />
              سجلات وتتبع الوقود
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              تتبع فواتير واستهلاك الوقود للمناديب وأسطول الدبابات بدقة
            </p>
          </div>
          <Button onClick={handleOpenAdd} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
            <Icons.add className="h-4 w-4" />
            تسجيل تعبئة وقود
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-amber-100 bg-amber-50/40 dark:border-amber-950/40 dark:bg-amber-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-200">إجمالي تكلفة الوقود</CardTitle>
              <Icons.dollarSign className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {stats.totalCost.toLocaleString('ar-SA')} <span className="text-sm font-normal text-slate-500">ر.س</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-blue-50/40 dark:border-blue-950/40 dark:bg-blue-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-200">إجمالي اللترات</CardTitle>
              <Icons.fuel className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {stats.totalLiters.toLocaleString('ar-SA')} <span className="text-sm font-normal text-slate-500">لتر</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/40 dark:border-emerald-950/40 dark:bg-emerald-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-200">متوسط السعر / لتر</CardTitle>
              <Icons.gauge className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {avgPerLiter} <span className="text-sm font-normal text-slate-500">ر.س/لتر</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">إجمالي العمليات</CardTitle>
              <Icons.receipt className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.totalCount} <span className="text-sm font-normal text-slate-500">عملية</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label className="text-xs text-slate-500">بحث (اسم، لوحة، محطة)</Label>
                <div className="relative mt-1">
                  <Icons.search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="ابحث في السجلات..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pr-9"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500">من تاريخ</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">إلى تاريخ</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); fetchLogs(); }} className="w-full">
                  إعادة ضبط
                </Button>
                <Button onClick={fetchLogs} className="w-full">
                  تطبيق الفلاتر
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>سجلات التعبئة</CardTitle>
            <CardDescription>عرض تفصيلي لكافة عمليات تزويد الوقود المسجلة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75 dark:bg-slate-900/50">
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">المندوب</TableHead>
                    <TableHead className="text-right">رقم اللوحة / الدباب</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">اللترات</TableHead>
                    <TableHead className="text-right">المحطة</TableHead>
                    <TableHead className="text-right">الفاتورة</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                        <Icons.spinner className="h-6 w-6 animate-spin mx-auto mb-2 text-amber-600" />
                        جارٍ تحميل سجلات الوقود...
                      </TableCell>
                    </TableRow>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                        لا توجد سجلات وقود مطابقة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map(log => (
                      <TableRow key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <TableCell className="font-medium whitespace-nowrap">
                          {formatRiyadhDate(log.fuel_date)}
                        </TableCell>
                        <TableCell>
                          {log.employee ? (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{log.employee.name}</span>
                              {log.employee.key_number && (
                                <Badge variant="outline" className="text-xs">
                                  #{log.employee.key_number}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.vehicle_plate ? (
                            <Badge variant="secondary" className="font-mono">
                              🛵 {log.vehicle_plate}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          {log.amount} ر.س
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {log.liters > 0 ? `${log.liters} لتر` : '-'}
                        </TableCell>
                        <TableCell>{log.station_name || '-'}</TableCell>
                        <TableCell>
                          {log.invoice_image_url ? (
                            <a
                              href={log.invoice_image_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <Icons.eye className="h-3.5 w-3.5" />
                              عرض الفاتورة
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs">لا يوجد</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{log.notes || '-'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(log)}
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            >
                              <Icons.edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(log.id)}
                              className="h-8 w-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                              <Icons.trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-[500px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingLog ? 'تعديل سجل الوقود' : 'تسجيل تعبئة وقود جديدة'}</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل التعبئة والمبلغ والمندوب والدباب المرتبط
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>المندوب</Label>
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
                  <Label>رقم اللوحة / الدباب</Label>
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
                  <Label>المبلغ (ر.س) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="مثال: 30"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>عدد اللترات</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="مثال: 13.5"
                    value={liters}
                    onChange={e => setLiters(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>تاريخ التعبئة</Label>
                  <Input
                    type="date"
                    value={fuelDate}
                    onChange={e => setFuelDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>اسم المحطة</Label>
                  <Input
                    placeholder="مثال: محطة الدريس"
                    value={stationName}
                    onChange={e => setStationName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>رابط صورة الفاتورة (اختياري)</Label>
                <Input
                  placeholder="https://..."
                  value={invoiceImage}
                  onChange={e => setInvoiceImage(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>ملاحظات</Label>
                <Textarea
                  placeholder="أي تفاصيل أو ملاحظات إضافية..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={submitting} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {submitting ? 'جارٍ الحفظ...' : editingLog ? 'حفظ التعديلات' : 'تسجيل التعبئة'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
