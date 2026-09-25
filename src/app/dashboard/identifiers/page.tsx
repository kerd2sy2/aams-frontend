'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import { targetWebApi } from '@/lib/aams/target-api';
import { employeeApi } from '@/lib/aams/services';
import { useLocale } from '@/components/layout/locale-provider';
import { Icons } from '@/components/icons';
import type { IdentifierPerformance } from '@/types/target';
import type { Employee } from '@/types/aams';
import { Users, Link as LinkIcon, Plus, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function IdentifiersPage() {
  const { t, dir } = useLocale();

  // Current Month State (e.g. "2026-09")
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${m}`;
  });

  const [identifiers, setIdentifiers] = useState<IdentifierPerformance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LINKED' | 'UNLINKED'>('ALL');

  // Sheet States
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingIdentifier, setEditingIdentifier] = useState<IdentifierPerformance | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [identName, setIdentName] = useState('');
  const [identCode, setIdentCode] = useState('');
  const [identAppName, setIdentAppName] = useState('NINJA');
  const [identMonthlyTarget, setIdentMonthlyTarget] = useState('460');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('NONE');

  // Load Identifiers & Employees
  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [identsRes, empsRes] = await Promise.all([
          targetWebApi.listIdentifiers({ month: selectedMonth }).catch(() => []),
          employeeApi
            .getAll({ limit: 500 })
            .then((res) => res.data || [])
            .catch(() => [])
        ]);

        setIdentifiers(Array.isArray(identsRes) ? identsRes : []);
        setEmployees(Array.isArray(empsRes) ? empsRes : []);
      } catch (err: any) {
        toast.error('فشل في جلب بيانات المعرفات والمناديب');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedMonth]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Create Sheet
  const handleOpenCreate = () => {
    setEditingIdentifier(null);
    setIdentName('');
    setIdentCode('');
    setIdentAppName('NINJA');
    setIdentMonthlyTarget('460');
    setSelectedEmployeeId('NONE');
    setSheetOpen(true);
  };

  // Open Edit / Link Sheet
  const handleOpenEdit = (item: IdentifierPerformance) => {
    setEditingIdentifier(item);
    setIdentName(item.name || '');
    setIdentCode(item.code || '');
    setIdentAppName(item.app_name || 'NINJA');
    setIdentMonthlyTarget(String(item.monthly_target || 460));
    setSelectedEmployeeId(item.employee_id || 'NONE');
    setSheetOpen(true);
  };

  // Fast Link inline change
  const handleInlineLink = async (identifierId: string, empId: string | null) => {
    const finalEmpId = !empId || empId === 'NONE' ? null : empId;
    try {
      await targetWebApi.linkIdentifierToEmployee(identifierId, finalEmpId);
      toast.success(finalEmpId ? 'تم ربط المعرف بالمندوب بنجاح' : 'تم فك ربط المعرف');
      // Update local state
      setIdentifiers((prev) =>
        prev.map((item) => {
          if (item.id === identifierId) {
            const matchedEmp = employees.find((e) => e.id === finalEmpId);
            return {
              ...item,
              employee_id: finalEmpId,
              employee: matchedEmp
                ? {
                    id: matchedEmp.id,
                    name: matchedEmp.name,
                    key_number: matchedEmp.key_number,
                    employee_number: matchedEmp.employee_number,
                    national_id: matchedEmp.national_id,
                    phone: matchedEmp.phone
                  }
                : null
            };
          }
          return item;
        })
      );
    } catch (err: any) {
      toast.error('تعذر تحديث الربط بالمندوب');
    }
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identName.trim()) {
      toast.error('يرجى إدخال اسم المعرف');
      return;
    }

    setSubmitting(true);
    const empId = selectedEmployeeId === 'NONE' ? null : selectedEmployeeId;

    try {
      if (editingIdentifier) {
        await targetWebApi.updateIdentifier(editingIdentifier.id, {
          name: identName.trim(),
          code: identCode.trim(),
          app_name: identAppName,
          monthly_target: parseFloat(identMonthlyTarget) || 460,
          employee_id: empId
        });
        toast.success('تم تحديث بيانات المعرف بنجاح');
      } else {
        await targetWebApi.createIdentifier({
          name: identName.trim(),
          code: identCode.trim(),
          app_name: identAppName,
          monthly_target: parseFloat(identMonthlyTarget) || 460,
          employee_id: empId
        });
        toast.success('تمت إضافة المعرف الجديد بنجاح');
      }

      setSheetOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'حدث خطأ أثناء حفظ المعرف');
    } finally {
      setSubmitting(false);
    }
  };

  // Stats calculation
  const totalCount = identifiers.length;
  const linkedCount = identifiers.filter((i) => Boolean(i.employee_id)).length;
  const unlinkedCount = totalCount - linkedCount;
  const achievedTargetCount = identifiers.filter((i) => i.status === 'TARGET_ACHIEVED').length;

  // Filtered List
  const filteredIdentifiers = useMemo(() => {
    return identifiers.filter((item) => {
      // Status filter
      if (statusFilter === 'LINKED' && !item.employee_id) return false;
      if (statusFilter === 'UNLINKED' && item.employee_id) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = item.name?.toLowerCase().includes(q);
        const codeMatch = item.code?.toLowerCase().includes(q);
        const appMatch = item.app_name?.toLowerCase().includes(q);
        const empNameMatch = item.employee?.name?.toLowerCase().includes(q);
        const empKeyMatch = item.employee?.key_number?.toLowerCase().includes(q);
        return nameMatch || codeMatch || appMatch || empNameMatch || empKeyMatch;
      }

      return true;
    });
  }, [identifiers, statusFilter, searchQuery]);

  return (
    <PageContainer
      pageTitle='المعرفات وربط المناديب'
      pageDescription='إدارة المعرفات وربط كل معرف بالمندوب المسؤول عنه لحساب وتحقيق التارچت والمستهدفات'
      pageHeaderAction={
        <div className='flex items-center gap-2'>
          {/* Month Selector */}
          <Input
            type='month'
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className='h-8 w-36 text-xs font-mono'
          />

          {/* Refresh Button */}
          <Button
            variant='outline'
            size='sm'
            onClick={() => loadData(true)}
            disabled={refreshing}
            className='gap-1.5 h-8'
          >
            <Icons.refresh
              className={`size-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`}
            />
            <span className='hidden sm:inline'>{t('Refresh', 'تحديث')}</span>
          </Button>

          {/* Link to Target Dashboard */}
          <Link
            href='/dashboard/target'
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'h-8 gap-1.5 text-xs'
            )}
          >
            <Icons.chartBar className='size-3.5 text-primary' />
            <span className='hidden sm:inline'>لوحة متابعة التارچت</span>
          </Link>

          {/* Add Identifier Button */}
          <Button size='sm' onClick={handleOpenCreate} className='gap-1.5 h-8 font-semibold'>
            <Plus className='size-3.5' />
            <span>إضافة معرف جديد</span>
          </Button>
        </div>
      }
    >
      <div className='flex flex-1 flex-col gap-4' dir={dir}>
        {/* KPI Cards */}
        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-3 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-4 md:gap-4'>
          {/* Total Identifiers Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-sm ${
              statusFilter === 'ALL' ? 'ring-2 ring-primary bg-primary/10' : ''
            }`}
            onClick={() => setStatusFilter('ALL')}
          >
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                إجمالي المعرفات
              </CardTitle>
              <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg'>
                <Users className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-foreground font-mono'>
                {totalCount}
              </div>
              <p className='text-muted-foreground text-xs mt-1'>معرف مسجل لشهر {selectedMonth}</p>
            </CardContent>
          </Card>

          {/* Linked Identifiers Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-sm ${
              statusFilter === 'LINKED' ? 'ring-2 ring-emerald-500 bg-emerald-500/10' : ''
            }`}
            onClick={() => setStatusFilter('LINKED')}
          >
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                مرتبطة بمناديب
              </CardTitle>
              <div className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex size-8 items-center justify-center rounded-lg'>
                <CheckCircle2 className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono'>
                {linkedCount}
              </div>
              <p className='text-muted-foreground text-xs mt-1'>يتم رصد التارچت لهم تلقائياً</p>
            </CardContent>
          </Card>

          {/* Unlinked Identifiers Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-sm ${
              statusFilter === 'UNLINKED' ? 'ring-2 ring-amber-500 bg-amber-500/10' : ''
            }`}
            onClick={() => setStatusFilter('UNLINKED')}
          >
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                معرفات بدون مندوب
              </CardTitle>
              <div className='bg-amber-500/10 text-amber-600 dark:text-amber-400 flex size-8 items-center justify-center rounded-lg'>
                <AlertTriangle className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono'>
                {unlinkedCount}
              </div>
              <p className='text-muted-foreground text-xs mt-1'>تحتاج لتحديد المندوب المسؤول</p>
            </CardContent>
          </Card>

          {/* Target Achieved Card */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                محققو التارچت 🏆
              </CardTitle>
              <div className='bg-sky-500/10 text-sky-600 dark:text-sky-400 flex size-8 items-center justify-center rounded-lg'>
                <Clock className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400 font-mono'>
                {achievedTargetCount}
              </div>
              <p className='text-muted-foreground text-xs mt-1'>أتموا المستهدف الشهري بالكامل</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search Bar */}
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-xs font-semibold text-muted-foreground me-1'>حالة الربط:</span>
            <Button
              size='sm'
              variant={statusFilter === 'ALL' ? 'default' : 'outline'}
              className='h-8 text-xs'
              onClick={() => setStatusFilter('ALL')}
            >
              الكل ({totalCount})
            </Button>
            <Button
              size='sm'
              variant={statusFilter === 'LINKED' ? 'default' : 'outline'}
              className='h-8 text-xs'
              onClick={() => setStatusFilter('LINKED')}
            >
              مرتبط بمندوب ({linkedCount})
            </Button>
            <Button
              size='sm'
              variant={statusFilter === 'UNLINKED' ? 'default' : 'outline'}
              className='h-8 text-xs'
              onClick={() => setStatusFilter('UNLINKED')}
            >
              غير مرتبط ({unlinkedCount})
            </Button>
          </div>

          <div className='relative w-full sm:w-72'>
            <Icons.search className='text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2' />
            <Input
              placeholder='بحث باسم المعرف، الكود، أو المندوب...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='h-9 ps-9 text-xs'
            />
          </div>
        </div>

        {/* Table of Identifiers */}
        <Card className='shadow-xs overflow-hidden'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/50'>
                <TableHead className='font-semibold'>المعرف</TableHead>
                <TableHead className='font-semibold'>الكود / التطبيق</TableHead>
                <TableHead className='font-semibold min-w-[220px]'>
                  المندوب المرتبط (المسؤول عن التارچت)
                </TableHead>
                <TableHead className='font-semibold'>التارچت الشهري</TableHead>
                <TableHead className='font-semibold'>المحقق الفعلي</TableHead>
                <TableHead className='font-semibold'>نسبة الإنجاز</TableHead>
                <TableHead className='font-semibold'>الحالة</TableHead>
                <TableHead className='text-center font-semibold'>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className='text-center py-12'>
                    <Icons.spinner className='size-6 animate-spin mx-auto text-primary' />
                    <div className='text-xs text-muted-foreground mt-2'>
                      جاري تحميل بيانات المعرفات والمناديب...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredIdentifiers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className='text-center py-12 text-muted-foreground text-xs'
                  >
                    لا توجد معرفات مطابقة لمعايير البحث
                  </TableCell>
                </TableRow>
              ) : (
                filteredIdentifiers.map((item) => {
                  const isAchieved = item.status === 'TARGET_ACHIEVED';
                  const isOnTrack = item.status === 'ON_TRACK';
                  const isAtRisk = item.status === 'AT_RISK';

                  return (
                    <TableRow key={item.id} className='hover:bg-muted/30'>
                      {/* Identifier Name */}
                      <TableCell className='font-semibold text-foreground'>
                        <div className='flex items-center gap-2'>
                          <span className='text-sm'>{item.name}</span>
                        </div>
                      </TableCell>

                      {/* Code / App */}
                      <TableCell>
                        <div className='flex items-center gap-1.5'>
                          <Badge variant='outline' className='font-mono text-[11px] px-1.5 py-0'>
                            {item.app_name || 'تطبيق'}
                          </Badge>
                          {item.code && (
                            <span className='font-mono text-xs text-muted-foreground'>
                              #{item.code}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Employee Link Selector */}
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          <Select
                            value={item.employee_id || 'NONE'}
                            onValueChange={(val) => handleInlineLink(item.id, val)}
                          >
                            <SelectTrigger className='h-8 text-xs w-full'>
                              <SelectValue placeholder='اختر المندوب للربط'>
                                {item.employee_id
                                  ? (() => {
                                      const emp =
                                        item.employee ||
                                        employees.find((e) => e.id === item.employee_id);
                                      return emp
                                        ? `${emp.name} (${emp.key_number || emp.employee_number || 'بدون رقم'})`
                                        : 'اختر المندوب للربط';
                                    })()
                                  : 'غير مرتبط بمندوب (اضغط للربط)'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value='NONE'
                                className='text-muted-foreground font-semibold'
                              >
                                ✕ بدون ربط (غير معين)
                              </SelectItem>
                              {employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.name} ({emp.key_number || emp.employee_number || 'بدون رقم'})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>

                      {/* Monthly Target */}
                      <TableCell className='font-mono font-bold text-foreground'>
                        {item.monthly_target || 460}
                      </TableCell>

                      {/* Actual Month Orders */}
                      <TableCell className='font-mono font-bold text-primary'>
                        {item.month_orders || 0}
                      </TableCell>

                      {/* Achievement Progress */}
                      <TableCell className='min-w-[130px]'>
                        <div className='flex items-center gap-2'>
                          <Progress
                            value={Math.min(item.achievement_percent || 0, 100)}
                            className='h-2 flex-1'
                          />
                          <span className='text-xs font-mono font-bold'>
                            {item.achievement_percent || 0}%
                          </span>
                        </div>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell>
                        {isAchieved ? (
                          <Badge className='bg-primary text-primary-foreground font-mono text-xs'>
                            حقق التارچت 🏆
                          </Badge>
                        ) : isOnTrack ? (
                          <Badge className='bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs'>
                            يسير بالمعدل
                          </Badge>
                        ) : isAtRisk ? (
                          <Badge className='bg-amber-600 hover:bg-amber-700 text-white font-mono text-xs'>
                            على وشك
                          </Badge>
                        ) : (
                          <Badge variant='destructive' className='font-mono text-xs'>
                            غير مؤهل (متأخر)
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className='text-center'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => handleOpenEdit(item)}
                          className='h-8 px-2.5 gap-1 text-xs'
                        >
                          <LinkIcon className='size-3.5 text-primary' />
                          <span>تعديل وربط</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Create / Edit Identifier Sheet (Side Drawer) */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className='sm:max-w-lg w-full p-0 flex flex-col'>
            <SheetHeader className='p-6'>
              <SheetTitle className='flex items-center gap-2'>
                <Users className='size-5 text-primary' />
                {editingIdentifier ? 'تعديل المعرف وربط المندوب' : 'إضافة معرف جديد'}
              </SheetTitle>
              <SheetDescription>
                حدد اسم المعرف والتطبيق والتارچت الشهري والمندوب المسؤول عنه
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSubmit} className='flex-1 flex flex-col min-h-0'>
              <div className='flex-1 overflow-y-auto px-6 py-5 space-y-4'>
                {/* Identifier Name */}
                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium text-muted-foreground'>
                    اسم المعرف (كما يظهر بالشيت) *
                  </Label>
                  <Input
                    placeholder='مثال: أحمد عبد الله - طويق'
                    value={identName}
                    onChange={(e) => setIdentName(e.target.value)}
                    required
                  />
                </div>

                {/* Identifier Code & App */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-medium text-muted-foreground'>
                      كود المعرف (اختياري)
                    </Label>
                    <Input
                      placeholder='مثال: ID-9081'
                      value={identCode}
                      onChange={(e) => setIdentCode(e.target.value)}
                      className='font-mono'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-medium text-muted-foreground'>التطبيق</Label>
                    <Select
                      value={identAppName}
                      onValueChange={(val) => setIdentAppName(val || 'NINJA')}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='اختر التطبيق' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='NINJA'>نينجا (Ninja)</SelectItem>
                        <SelectItem value='KEETA'>كيتا (Keeta)</SelectItem>
                        <SelectItem value='TOYO'>تويو (Toyo)</SelectItem>
                        <SelectItem value='HUNGER'>هنقرستيشن</SelectItem>
                        <SelectItem value='JAHEZ'>جاهز</SelectItem>
                        <SelectItem value='OTHER'>أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Target Monthly Orders */}
                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium text-muted-foreground'>
                    المستهدف الشهري (التارچت بالطلبات) *
                  </Label>
                  <Input
                    type='number'
                    min='1'
                    placeholder='460'
                    value={identMonthlyTarget}
                    onChange={(e) => setIdentMonthlyTarget(e.target.value)}
                    className='font-mono'
                    required
                  />
                  <p className='text-[11px] text-muted-foreground'>
                    التارچت الافتراضي 460 طلب شهرياً (بمعدل ~18 طلب يومياً).
                  </p>
                </div>

                {/* Linked Employee */}
                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium text-muted-foreground'>
                    المندوب المسؤول عن هذا المعرف *
                  </Label>
                  <Select
                    value={selectedEmployeeId}
                    onValueChange={(val) => setSelectedEmployeeId(val || 'NONE')}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='اختر المندوب لربطه بالمعرف'>
                        {selectedEmployeeId !== 'NONE'
                          ? (() => {
                              const emp = employees.find((e) => e.id === selectedEmployeeId);
                              return emp
                                ? `${emp.name} (${emp.key_number || emp.employee_number || 'بدون رقم'})`
                                : 'اختر المندوب لربطه بالمعرف';
                            })()
                          : '✕ غير مرتبط بمندوب حتى الآن'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='NONE' className='text-muted-foreground font-semibold'>
                        ✕ بدون ربط (غير معين)
                      </SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} ({emp.key_number || emp.employee_number || 'بدون رقم'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className='text-[11px] text-muted-foreground'>
                    عند ربط المعرف بالمندوب، سيتم احتساب جميع طلبات هذا المعرف ضمن أداء وتارچت
                    المندوب في لوحة التارچت مباشرة.
                  </p>
                </div>
              </div>

              <SheetFooter className='p-4 border-t bg-muted/20 flex items-center justify-end gap-2'>
                <Button type='button' variant='outline' onClick={() => setSheetOpen(false)}>
                  إلغاء
                </Button>
                <Button type='submit' disabled={submitting} className='font-medium'>
                  {submitting
                    ? 'جارٍ الحفظ...'
                    : editingIdentifier
                      ? 'حفظ التعديلات'
                      : 'إضافة المعرف'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </PageContainer>
  );
}
