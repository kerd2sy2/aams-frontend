'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
import {
  Users,
  Link as LinkIcon,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Ban,
  ShieldCheck,
  Edit2,
  Check,
  X,
  Phone,
  CreditCard,
  Building2,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';

export default function IdentifiersPage() {
  const { t, dir } = useLocale();

  const [identifiers, setIdentifiers] = useState<IdentifierPerformance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'BLOCKED' | 'LINKED' | 'UNLINKED'
  >('ALL');
  const [appFilter, setAppFilter] = useState<'ALL' | 'NINJA' | 'KEETA' | 'OTHER'>('ALL');

  // Inline Editing State for Arabic Name
  const [editingArId, setEditingArId] = useState<string | null>(null);
  const [editingArValue, setEditingArValue] = useState<string>('');
  const [savingAr, setSavingAr] = useState(false);

  // Sheet States
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingIdentifier, setEditingIdentifier] = useState<IdentifierPerformance | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [identName, setIdentName] = useState('');
  const [identNameAr, setIdentNameAr] = useState('');
  const [identNameEn, setIdentNameEn] = useState('');
  const [identCode, setIdentCode] = useState('');
  const [identNinjaId, setIdentNinjaId] = useState('');
  const [identNationalId, setIdentNationalId] = useState('');
  const [identMobile, setIdentMobile] = useState('');
  const [identAvatar, setIdentAvatar] = useState('');
  const [identAppName, setIdentAppName] = useState('NINJA');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('NONE');
  const [identIsBlocked, setIdentIsBlocked] = useState(false);
  const [identBlockedReason, setIdentBlockedReason] = useState('');

  // Load Identifiers & Employees
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [identsRes, empsRes] = await Promise.all([
        targetWebApi.listIdentifiers().catch(() => []),
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Create Sheet
  const handleOpenCreate = () => {
    setEditingIdentifier(null);
    setIdentName('');
    setIdentNameAr('');
    setIdentNameEn('');
    setIdentCode('');
    setIdentNinjaId('');
    setIdentNationalId('');
    setIdentMobile('');
    setIdentAvatar('');
    setIdentAppName('NINJA');
    setSelectedEmployeeId('NONE');
    setIdentIsBlocked(false);
    setIdentBlockedReason('');
    setSheetOpen(true);
  };

  // Open Edit / Link Sheet
  const handleOpenEdit = (item: IdentifierPerformance) => {
    setEditingIdentifier(item);
    setIdentName(item.name || item.name_ar || item.name_en || '');
    setIdentNameAr(item.name_ar || '');
    setIdentNameEn(item.name_en || '');
    setIdentCode(item.code || '');
    setIdentNinjaId(item.ninja_id || item.code || '');
    setIdentNationalId(item.national_id || '');
    setIdentMobile(item.mobile || '');
    setIdentAvatar(item.avatar || '');
    setIdentAppName(item.app_name || 'NINJA');
    setSelectedEmployeeId(item.employee_id || 'NONE');
    setIdentIsBlocked(Boolean(item.is_blocked));
    setIdentBlockedReason(item.blocked_reason || '');
    setSheetOpen(true);
  };

  // Fast inline edit save for Arabic Name
  const startInlineEditAr = (item: IdentifierPerformance) => {
    setEditingArId(item.id);
    setEditingArValue(item.name_ar || item.name || '');
  };

  const cancelInlineEditAr = () => {
    setEditingArId(null);
    setEditingArValue('');
  };

  const saveInlineEditAr = async (item: IdentifierPerformance) => {
    const val = editingArValue.trim();
    if (!val) {
      toast.error('يرجى كتابة الاسم بالعربي');
      return;
    }

    setSavingAr(true);
    try {
      await targetWebApi.updateIdentifier(item.id, {
        name_ar: val,
        name: val,
        name_en: item.name_en,
        code: item.code,
        ninja_id: item.ninja_id,
        is_blocked: item.is_blocked
      });

      setIdentifiers((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, name_ar: val, name: val } : i))
      );
      toast.success('تم حفظ الاسم بالعربي بنجاح');
      setEditingArId(null);
    } catch {
      toast.error('فشل حفظ الاسم بالعربي');
    } finally {
      setSavingAr(false);
    }
  };

  // Toggle Block / Unblock directly
  const handleToggleBlock = async (item: IdentifierPerformance) => {
    const nextBlocked = !item.is_blocked;
    try {
      await targetWebApi.toggleBlockIdentifier(
        item.id,
        nextBlocked,
        nextBlocked ? 'تم الحظر بواسطة الإدارة' : ''
      );

      setIdentifiers((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                is_blocked: nextBlocked,
                blocked_reason: nextBlocked ? 'تم الحظر بواسطة الإدارة' : '',
                is_active: !nextBlocked
              }
            : i
        )
      );

      if (nextBlocked) {
        toast.warning(
          `تم حظر المعرف (${item.ninja_id || item.code || item.name}) لن يظهر في ربط الشفتات`
        );
      } else {
        toast.success(`تم فك حظر المعرف (${item.ninja_id || item.code || item.name}) بنجاح`);
      }
    } catch {
      toast.error('فشل تغيير حالة الحظر للمعرف');
    }
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
    const finalName = identNameAr.trim() || identName.trim() || identNameEn.trim();
    if (!finalName) {
      toast.error('يرجى إدخال اسم المعرف (بالعربي أو بالإنجليزي)');
      return;
    }

    setSubmitting(true);
    const empId = selectedEmployeeId === 'NONE' ? null : selectedEmployeeId;

    try {
      const payload = {
        name: finalName,
        name_ar: identNameAr.trim(),
        name_en: identNameEn.trim(),
        code: identCode.trim() || identNinjaId.trim(),
        ninja_id: identNinjaId.trim() || identCode.trim(),
        national_id: identNationalId.trim(),
        mobile: identMobile.trim(),
        avatar: identAvatar.trim(),
        app_name: identAppName,
        employee_id: empId,
        is_blocked: identIsBlocked,
        blocked_reason: identIsBlocked ? identBlockedReason.trim() || 'محظور من الإدارة' : ''
      };

      if (editingIdentifier) {
        await targetWebApi.updateIdentifier(editingIdentifier.id, payload);
        toast.success('تم تحديث بيانات المعرف بنجاح');
      } else {
        await targetWebApi.createIdentifier(payload);
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
  const ninjaCount = identifiers.filter((i) =>
    (i.app_name || '').toUpperCase().includes('NINJA')
  ).length;
  const keetaCount = identifiers.filter((i) =>
    (i.app_name || '').toUpperCase().includes('KEETA')
  ).length;
  const blockedCount = identifiers.filter((i) => Boolean(i.is_blocked)).length;
  const activeCount = totalCount - blockedCount;
  const linkedCount = identifiers.filter((i) => Boolean(i.employee_id)).length;
  const unlinkedCount = totalCount - linkedCount;

  // Filtered List
  const filteredIdentifiers = useMemo(() => {
    return identifiers.filter((item) => {
      // App filter
      if (appFilter !== 'ALL') {
        const itemApp = (item.app_name || '').toUpperCase();
        if (appFilter === 'NINJA' && !itemApp.includes('NINJA')) return false;
        if (appFilter === 'KEETA' && !itemApp.includes('KEETA')) return false;
        if (appFilter === 'OTHER' && (itemApp.includes('NINJA') || itemApp.includes('KEETA')))
          return false;
      }

      // Status filter
      if (statusFilter === 'BLOCKED' && !item.is_blocked) return false;
      if (statusFilter === 'ACTIVE' && item.is_blocked) return false;
      if (statusFilter === 'LINKED' && !item.employee_id) return false;
      if (statusFilter === 'UNLINKED' && item.employee_id) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = item.name?.toLowerCase().includes(q);
        const nameArMatch = item.name_ar?.toLowerCase().includes(q);
        const nameEnMatch = item.name_en?.toLowerCase().includes(q);
        const codeMatch = item.code?.toLowerCase().includes(q);
        const ninjaMatch = item.ninja_id?.toLowerCase().includes(q);
        const natMatch = item.national_id?.toLowerCase().includes(q);
        const mobileMatch = item.mobile?.toLowerCase().includes(q);
        const appMatch = item.app_name?.toLowerCase().includes(q);
        const empNameMatch = item.employee?.name?.toLowerCase().includes(q);
        const empKeyMatch = item.employee?.key_number?.toLowerCase().includes(q);

        return (
          nameMatch ||
          nameArMatch ||
          nameEnMatch ||
          codeMatch ||
          ninjaMatch ||
          natMatch ||
          mobileMatch ||
          appMatch ||
          empNameMatch ||
          empKeyMatch
        );
      }

      return true;
    });
  }, [identifiers, statusFilter, appFilter, searchQuery]);

  return (
    <PageContainer
      pageTitle='سجل المعرفات والتطبيقات'
      pageDescription='إدارة جميع معرفات كباتن التطبيقات (نينجا وكيتا)، تعديل الأسماء بالعربي والإنجليزي، ربط المندوب، والتحكم في حظر المعرفات'
      pageHeaderAction={
        <div className='flex items-center gap-2'>
          {/* Refresh Button */}
          <Button
            variant='outline'
            size='sm'
            onClick={() => loadData(true)}
            disabled={refreshing}
            className='gap-1.5 h-8'
          >
            <Icons.spinner className={cn('size-3.5', refreshing && 'animate-spin')} />
            تحديث
          </Button>

          {/* Add Identifier Button */}
          <Button size='sm' onClick={handleOpenCreate} className='gap-1.5 h-8 font-medium'>
            <Plus className='size-4' />
            إضافة معرف جديد
          </Button>
        </div>
      }
    >
      <div className='space-y-6'>
        {/* KPI Summary Cards */}
        <div className='grid grid-cols-2 md:grid-cols-5 gap-3'>
          {/* Total Identifiers Card */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                إجمالي المعرفات
              </CardTitle>
              <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg'>
                <Users className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight font-mono'>{totalCount}</div>
              <p className='text-muted-foreground text-xs mt-1'>
                {ninjaCount} نينجا · {keetaCount} كيتا
              </p>
            </CardContent>
          </Card>

          {/* Active Identifiers Card */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                معرفات نشطة (متاحة)
              </CardTitle>
              <div className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex size-8 items-center justify-center rounded-lg'>
                <ShieldCheck className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono'>
                {activeCount}
              </div>
              <p className='text-muted-foreground text-xs mt-1'>تظهر في منسدلة بدء الدوام</p>
            </CardContent>
          </Card>

          {/* Blocked Identifiers Card */}
          <Card className={cn(blockedCount > 0 && 'border-destructive/40 bg-destructive/5')}>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-destructive'>
                معرفات محظورة 🚫
              </CardTitle>
              <div className='bg-destructive/10 text-destructive flex size-8 items-center justify-center rounded-lg'>
                <Ban className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-destructive font-mono'>
                {blockedCount}
              </div>
              <p className='text-muted-foreground text-xs mt-1'>محجوبة وممنوعة من الدوام</p>
            </CardContent>
          </Card>

          {/* Linked Identifiers Card */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                مرتبط بمندوب
              </CardTitle>
              <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg'>
                <UserCheck className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-primary font-mono'>
                {linkedCount}
              </div>
              <p className='text-muted-foreground text-xs mt-1'>
                {totalCount > 0 ? Math.round((linkedCount / totalCount) * 100) : 0}% معينة لمندوب
              </p>
            </CardContent>
          </Card>

          {/* Unlinked Identifiers Card */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-xs font-medium text-muted-foreground'>
                غير مرتبطة (معلقة)
              </CardTitle>
              <div className='bg-amber-500/10 text-amber-600 dark:text-amber-400 flex size-8 items-center justify-center rounded-lg'>
                <AlertTriangle className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono'>
                {unlinkedCount}
              </div>
              <p className='text-muted-foreground text-xs mt-1'>متاحة لتعيين مندوب</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search Bar */}
        <div className='flex flex-col gap-3 border-b pb-3'>
          <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3'>
            {/* App Filter Buttons */}
            <div className='flex flex-wrap items-center gap-1.5'>
              <span className='text-xs font-semibold text-muted-foreground me-1'>التطبيق:</span>
              <Button
                size='sm'
                variant={appFilter === 'ALL' ? 'default' : 'outline'}
                className='h-8 text-xs'
                onClick={() => setAppFilter('ALL')}
              >
                جميع التطبيقات ({totalCount})
              </Button>
              <Button
                size='sm'
                variant={appFilter === 'NINJA' ? 'default' : 'outline'}
                className='h-8 text-xs font-semibold'
                onClick={() => setAppFilter('NINJA')}
              >
                🥷 نينجا ({ninjaCount})
              </Button>
              <Button
                size='sm'
                variant={appFilter === 'KEETA' ? 'default' : 'outline'}
                className='h-8 text-xs font-semibold'
                onClick={() => setAppFilter('KEETA')}
              >
                🛵 كيتا ({keetaCount})
              </Button>
            </div>

            <div className='relative w-full sm:w-80'>
              <Icons.search className='text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2' />
              <Input
                placeholder='بحث بالاسم العربي، الإنجليزي، الهوية، أو المعرف...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='h-9 ps-9 text-xs'
              />
            </div>
          </div>

          {/* Status Filter Buttons */}
          <div className='flex flex-wrap items-center gap-1.5'>
            <span className='text-xs font-semibold text-muted-foreground me-1'>الحالة:</span>
            <Button
              size='sm'
              variant={statusFilter === 'ALL' ? 'secondary' : 'ghost'}
              className='h-7 text-xs px-2.5'
              onClick={() => setStatusFilter('ALL')}
            >
              الكل
            </Button>
            <Button
              size='sm'
              variant={statusFilter === 'ACTIVE' ? 'secondary' : 'ghost'}
              className='h-7 text-xs px-2.5 text-emerald-600'
              onClick={() => setStatusFilter('ACTIVE')}
            >
              النشطة ({activeCount})
            </Button>
            <Button
              size='sm'
              variant={statusFilter === 'BLOCKED' ? 'destructive' : 'ghost'}
              className='h-7 text-xs px-2.5'
              onClick={() => setStatusFilter('BLOCKED')}
            >
              المحظورة 🚫 ({blockedCount})
            </Button>
            <Button
              size='sm'
              variant={statusFilter === 'LINKED' ? 'secondary' : 'ghost'}
              className='h-7 text-xs px-2.5'
              onClick={() => setStatusFilter('LINKED')}
            >
              مرتبط بمندوب ({linkedCount})
            </Button>
            <Button
              size='sm'
              variant={statusFilter === 'UNLINKED' ? 'secondary' : 'ghost'}
              className='h-7 text-xs px-2.5 text-amber-600'
              onClick={() => setStatusFilter('UNLINKED')}
            >
              غير مرتبط ({unlinkedCount})
            </Button>
          </div>
        </div>

        {/* Table of Identifiers */}
        <Card className='shadow-xs overflow-hidden'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/50'>
                <TableHead className='font-semibold w-[60px] text-center'>الصورة</TableHead>
                <TableHead className='font-semibold min-w-[200px]'>
                  الاسم بالعربي (قابل للتعديل)
                </TableHead>
                <TableHead className='font-semibold min-w-[170px]'>الاسم بالإنجليزي</TableHead>
                <TableHead className='font-semibold'>معرّف التطبيق</TableHead>
                <TableHead className='font-semibold'>رقم الهوية / الجوال</TableHead>
                <TableHead className='font-semibold min-w-[210px]'>المندوب المرتبط</TableHead>
                <TableHead className='font-semibold text-center'>حظر المعرف</TableHead>
                <TableHead className='font-semibold text-center'>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className='text-center py-12'>
                    <Icons.spinner className='size-6 animate-spin mx-auto text-primary' />
                    <div className='text-xs text-muted-foreground mt-2'>
                      جاري تحميل بيانات المعرفات والصور...
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
                  const isBlocked = Boolean(item.is_blocked);
                  const isEditingThisAr = editingArId === item.id;
                  const isNinja = (item.app_name || '').toUpperCase().includes('NINJA');
                  const isKeeta = (item.app_name || '').toUpperCase().includes('KEETA');

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        'hover:bg-muted/30 transition-colors',
                        isBlocked && 'bg-destructive/5 dark:bg-destructive/10'
                      )}
                    >
                      {/* Captain Photo (Avatar) */}
                      <TableCell className='text-center p-2'>
                        <Avatar className='size-11 rounded-full border shadow-xs mx-auto'>
                          {item.avatar ? (
                            <AvatarImage
                              src={item.avatar}
                              alt={item.name_en || item.name || 'Captain'}
                              className='object-cover'
                            />
                          ) : null}
                          <AvatarFallback className='text-xs font-bold bg-muted text-muted-foreground'>
                            {(item.name_ar || item.name_en || 'C').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>

                      {/* Arabic Name with Inline Quick Edit */}
                      <TableCell className='font-medium text-foreground'>
                        {isEditingThisAr ? (
                          <div className='flex items-center gap-1.5'>
                            <Input
                              value={editingArValue}
                              onChange={(e) => setEditingArValue(e.target.value)}
                              className='h-8 text-xs font-semibold'
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveInlineEditAr(item);
                                if (e.key === 'Escape') cancelInlineEditAr();
                              }}
                            />
                            <Button
                              size='icon'
                              variant='default'
                              className='size-7 shrink-0'
                              onClick={() => saveInlineEditAr(item)}
                              disabled={savingAr}
                            >
                              <Check className='size-3.5' />
                            </Button>
                            <Button
                              size='icon'
                              variant='ghost'
                              className='size-7 shrink-0'
                              onClick={cancelInlineEditAr}
                            >
                              <X className='size-3.5' />
                            </Button>
                          </div>
                        ) : (
                          <div className='flex items-center justify-between group gap-2'>
                            <div className='flex items-center gap-1.5'>
                              {isBlocked && (
                                <Badge variant='destructive' className='text-[10px] px-1 py-0'>
                                  محظور
                                </Badge>
                              )}
                              <span
                                className={cn(
                                  'text-sm font-semibold',
                                  isBlocked && 'text-muted-foreground line-through'
                                )}
                              >
                                {item.name_ar || item.name || '—'}
                              </span>
                            </div>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity'
                              onClick={() => startInlineEditAr(item)}
                              title='تعديل الاسم بالعربي'
                            >
                              <Edit2 className='size-3' />
                            </Button>
                          </div>
                        )}
                      </TableCell>

                      {/* English Name */}
                      <TableCell>
                        <span className='font-mono text-xs uppercase text-muted-foreground font-medium'>
                          {item.name_en || '—'}
                        </span>
                      </TableCell>

                      {/* Application Identifier & App Badge */}
                      <TableCell>
                        <div className='flex flex-col gap-1'>
                          <div className='flex items-center gap-1.5'>
                            <Badge
                              variant='outline'
                              className={cn(
                                'font-mono text-[10px] px-1.5 py-0 font-bold',
                                isNinja &&
                                  'border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10',
                                isKeeta &&
                                  'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                              )}
                            >
                              {isNinja
                                ? '🥷 NINJA'
                                : isKeeta
                                  ? '🛵 KEETA'
                                  : item.app_name || 'تطبيق'}
                            </Badge>
                          </div>
                          <span className='font-mono text-xs font-bold text-foreground'>
                            {item.ninja_id || item.code || item.id}
                          </span>
                        </div>
                      </TableCell>

                      {/* National ID & Mobile */}
                      <TableCell>
                        <div className='space-y-0.5 text-xs font-mono text-muted-foreground'>
                          {item.national_id && (
                            <div className='flex items-center gap-1'>
                              <CreditCard className='size-3 text-muted-foreground' />
                              <span>{item.national_id}</span>
                            </div>
                          )}
                          {item.mobile && (
                            <div className='flex items-center gap-1 text-[11px]'>
                              <Phone className='size-3 text-muted-foreground' />
                              <span dir='ltr'>+966 {item.mobile}</span>
                            </div>
                          )}
                          {!item.national_id && !item.mobile && (
                            <span className='text-muted-foreground'>—</span>
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

                      {/* Block / Active Status Toggle */}
                      <TableCell className='text-center'>
                        <Button
                          variant={isBlocked ? 'destructive' : 'outline'}
                          size='sm'
                          onClick={() => handleToggleBlock(item)}
                          className={cn(
                            'h-7 px-2.5 text-[11px] gap-1 font-medium transition-colors',
                            !isBlocked && 'hover:border-destructive hover:text-destructive'
                          )}
                          title={
                            isBlocked
                              ? 'اضغط لفك الحظر عن المعرف'
                              : 'اضغط لحظر هذا المعرف ومنعه بالدوام'
                          }
                        >
                          {isBlocked ? (
                            <>
                              <Ban className='size-3.5' />
                              <span>محظور (فك الحظر)</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className='size-3.5 text-emerald-600' />
                              <span>متاح (حظر)</span>
                            </>
                          )}
                        </Button>
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
                          <span>تعديل</span>
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
            <SheetHeader className='p-6 border-b'>
              <SheetTitle className='flex items-center gap-2'>
                <Users className='size-5 text-primary' />
                {editingIdentifier ? 'تعديل المعرف وبيانات الكابتن' : 'إضافة معرف جديد'}
              </SheetTitle>
              <SheetDescription>
                تعديل الاسم بالعربي والإنجليزي، معرف التطبيق، الصورة، ربط المندوب، والتحكم في الحظر
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSubmit} className='flex-1 flex flex-col min-h-0'>
              <div className='flex-1 overflow-y-auto px-6 py-5 space-y-4'>
                {/* Arabic Name (Most Important) */}
                <div className='space-y-1.5 bg-primary/5 p-3 rounded-lg border border-primary/20'>
                  <Label className='text-xs font-bold text-primary flex items-center gap-1.5'>
                    <span>الاسم بالعربي (الاسم المعروض) *</span>
                  </Label>
                  <Input
                    placeholder='مثال: طارق جمعة'
                    value={identNameAr}
                    onChange={(e) => setIdentNameAr(e.target.value)}
                    className='font-medium'
                    required
                  />
                  <p className='text-[11px] text-muted-foreground'>
                    يمكنك تعديل هذا الاسم بحرية ليطابق اسم المندوب في ملفاتك وسجلاتك.
                  </p>
                </div>

                {/* English Name */}
                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium text-muted-foreground'>
                    الاسم بالإنجليزي (كما في التطبيق)
                  </Label>
                  <Input
                    placeholder='مثال: TAREQ GOMAA'
                    value={identNameEn}
                    onChange={(e) => setIdentNameEn(e.target.value)}
                    className='font-mono uppercase'
                  />
                </div>

                {/* Application ID & App */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-medium text-muted-foreground'>
                      معرّف التطبيق (الكود) *
                    </Label>
                    <Input
                      placeholder='مثال: 302707'
                      value={identNinjaId}
                      onChange={(e) => setIdentNinjaId(e.target.value)}
                      className='font-mono font-bold'
                      required
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

                {/* Captain Avatar URL */}
                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium text-muted-foreground'>
                    رابط صورة المندوب / الكابتن (URL)
                  </Label>
                  <div className='flex items-center gap-2'>
                    <Avatar className='size-10 rounded-full border shrink-0'>
                      {identAvatar ? <AvatarImage src={identAvatar} /> : null}
                      <AvatarFallback>صورة</AvatarFallback>
                    </Avatar>
                    <Input
                      placeholder='https://...'
                      value={identAvatar}
                      onChange={(e) => setIdentAvatar(e.target.value)}
                      className='text-xs font-mono flex-1'
                      dir='ltr'
                    />
                  </div>
                </div>

                {/* National ID & Mobile */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-medium text-muted-foreground'>
                      رقم الهوية الوطنية / الإقامة
                    </Label>
                    <Input
                      placeholder='مثال: 2641911119'
                      value={identNationalId}
                      onChange={(e) => setIdentNationalId(e.target.value)}
                      className='font-mono'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-medium text-muted-foreground'>رقم الجوال</Label>
                    <Input
                      placeholder='مثال: 530913962'
                      value={identMobile}
                      onChange={(e) => setIdentMobile(e.target.value)}
                      className='font-mono'
                      dir='ltr'
                    />
                  </div>
                </div>

                {/* Block Status Toggle */}
                <div className='border rounded-lg p-3 bg-muted/30 space-y-2'>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-0.5'>
                      <Label className='text-xs font-bold flex items-center gap-1.5 text-foreground'>
                        <Ban className='size-3.5 text-destructive' />
                        حظر هذا المعرف
                      </Label>
                      <p className='text-[11px] text-muted-foreground'>
                        عند تفعيل الحظر، يتم حجب المعرف من منسدلة بدء الدوام ولن يمكن ربطه بالشفتات.
                      </p>
                    </div>
                    <Button
                      type='button'
                      variant={identIsBlocked ? 'destructive' : 'outline'}
                      size='sm'
                      onClick={() => setIdentIsBlocked(!identIsBlocked)}
                      className='h-8 text-xs font-medium'
                    >
                      {identIsBlocked ? 'محظور حالياً' : 'متاح (غير محظور)'}
                    </Button>
                  </div>

                  {identIsBlocked && (
                    <div className='pt-2'>
                      <Input
                        placeholder='سبب الحظر (مثال: انتهاء الإقامة / موقوف مؤقتاً)...'
                        value={identBlockedReason}
                        onChange={(e) => setIdentBlockedReason(e.target.value)}
                        className='text-xs h-8'
                      />
                    </div>
                  )}
                </div>

                {/* Linked Employee */}
                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium text-muted-foreground'>
                    المندوب المرتبط بهذا المعرف
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
