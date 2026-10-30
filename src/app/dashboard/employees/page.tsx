'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { cn, getWhatsAppURL } from '@/lib/utils';
import { getAdminUser } from '@/lib/aams/auth';
import { employeeApi, roleApi, branchApi } from '@/lib/aams/services';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { useLocale } from '@/components/layout/locale-provider';
import type { Employee, PaginatedResponse, Role, Branch } from '@/types/aams';
import {
  Building2,
  Users,
  MapPin,
  ShieldCheck,
  Briefcase,
  Crown,
  Bike,
  Trash2,
  Key
} from 'lucide-react';

interface BranchGroup {
  id: string;
  name: string;
  employees: Employee[];
}

type DepartmentFilter = 'ALL' | 'DRIVER' | 'SUPERVISOR' | 'CLEANER' | 'ACCOUNTANT' | 'OWNER';

const formatAppName = (appType?: string, appId?: string) => {
  let name = '';
  if (appType) {
    const a = appType.toLowerCase().trim();
    if (a === 'ninja' || a === 'نينجا') name = 'نينجا';
    else if (a === 'keeta' || a === 'كيتا') name = 'كيتا';
    else if (a === 'toyou' || a === 'تويو') name = 'تويو';
    else if (a === 'hungerstation' || a === 'هنقرستيشن') name = 'هنقرستيشن';
    else if (a === 'jahez' || a === 'جاهز') name = 'جاهز';
    else if (a === 'mrsool' || a === 'مرسول') name = 'مرسول';
    else if (a === 'shgardi' || a === 'شقرردي') name = 'شقرردي';
    else if (a === 'other' || a === 'عام') name = 'عام';
    else name = appType;
  }
  if (!name && appId) return appId;
  if (name && appId && appId !== name) return `${name} (${appId})`;
  return name || 'نينجا';
};

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t, dir } = useLocale();
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<DepartmentFilter>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  // Modal for quick role & permission assignment
  const [permissionTarget, setPermissionTarget] = useState<Employee | null>(null);
  const [modalJobRole, setModalJobRole] = useState('DRIVER');
  const [modalRoleId, setModalRoleId] = useState('');

  const canDelete = !getAdminUser()?.branch_id;

  const { data, isLoading } = useOfflineQuery<PaginatedResponse<Employee>>({
    queryKey: ['employees', search, page],
    queryFn: () =>
      employeeApi.getAll({ search, page, limit: 150, sort_by: 'key_number', order: 'asc' }),
    cacheKey: `employees_page_${page}_${search}`
  });

  // Fetch available system roles
  const { data: rolesData } = useOfflineQuery({
    queryKey: ['roles-list'],
    queryFn: () => roleApi.getAll(),
    cacheKey: 'roles_all'
  });
  const rolesList: Role[] = rolesData || [];

  // Fetch branches
  const { data: branchesData } = useOfflineQuery({
    queryKey: ['branches-list'],
    queryFn: () => branchApi.getAll(),
    cacheKey: 'branches_all'
  });
  const branchesList: Branch[] = branchesData || [];

  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    map.set('0b52c83c-4a37-4950-8040-fcb00fa718b3', 'الفرع الأول');
    map.set('33b1e65f-074c-4c51-af38-32e13c1fb9a6', 'الفرع الثاني');
    branchesList.forEach((b) => {
      if (b.id && b.name) {
        map.set(b.id, b.name);
      }
    });
    return map;
  }, [branchesList]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeeApi.delete(id),
    onSuccess: () => {
      toast.success('تم حذف الموظف بنجاح');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف الموظف');
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({
      empId,
      jobRole,
      roleId
    }: {
      empId: string;
      jobRole: string;
      roleId: string;
    }) => {
      const selectedRole = rolesList.find((r) => r.id === roleId);
      const perms = selectedRole?.permissions;
      return employeeApi.update(empId, {
        job_role: jobRole,
        role_id: roleId || undefined,
        role_name: selectedRole?.name || undefined,
        permissions: Array.isArray(perms) ? JSON.stringify(perms) : (perms as any) || undefined
      });
    },
    onSuccess: () => {
      toast.success('تم تحديث القسم والصلاحيات بنجاح!');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setPermissionTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'حدث خطأ أثناء تحديث الصلاحيات');
    }
  });

  const allEmployees = data?.data ?? [];

  // Branch counts for filter
  const branchCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: allEmployees.length,
      '0b52c83c-4a37-4950-8040-fcb00fa718b3': 0,
      '33b1e65f-074c-4c51-af38-32e13c1fb9a6': 0
    };
    allEmployees.forEach((emp) => {
      const bId = emp.branch?.id || emp.branch_id || 'unassigned';
      counts[bId] = (counts[bId] || 0) + 1;
    });
    return counts;
  }, [allEmployees]);

  // Department counts
  const deptCounts = useMemo(() => {
    const counts = {
      ALL: allEmployees.length,
      DRIVER: 0,
      SUPERVISOR: 0,
      CLEANER: 0,
      ACCOUNTANT: 0,
      OWNER: 0
    };
    allEmployees.forEach((emp) => {
      const r = (emp.job_role || 'DRIVER').toUpperCase();
      if (r === 'SUPERVISOR') counts.SUPERVISOR++;
      else if (r === 'CLEANER' || r === 'WORKER') counts.CLEANER++;
      else if (r === 'ACCOUNTANT') counts.ACCOUNTANT++;
      else if (r === 'OWNER' || r === 'MANAGEMENT') counts.OWNER++;
      else counts.DRIVER++;
    });
    return counts;
  }, [allEmployees]);

  // Filter employees by selected department and branch
  const filteredEmployees = useMemo(() => {
    return allEmployees.filter((emp) => {
      // Branch filter
      if (selectedBranch !== 'ALL') {
        const bId = emp.branch?.id || emp.branch_id || 'unassigned';
        if (bId !== selectedBranch) return false;
      }

      // Department filter
      if (selectedDept === 'ALL') return true;
      const r = (emp.job_role || 'DRIVER').toUpperCase();
      if (selectedDept === 'SUPERVISOR') return r === 'SUPERVISOR';
      if (selectedDept === 'CLEANER') return r === 'CLEANER' || r === 'WORKER';
      if (selectedDept === 'ACCOUNTANT') return r === 'ACCOUNTANT';
      if (selectedDept === 'OWNER') return r === 'OWNER' || r === 'MANAGEMENT';
      if (selectedDept === 'DRIVER')
        return (
          r === 'DRIVER' ||
          !['SUPERVISOR', 'CLEANER', 'WORKER', 'ACCOUNTANT', 'OWNER', 'MANAGEMENT'].includes(r)
        );
      return true;
    });
  }, [allEmployees, selectedDept, selectedBranch]);

  // Group filtered employees by branch
  const branchGroups = useMemo<BranchGroup[]>(() => {
    const map = new Map<string, BranchGroup>();

    filteredEmployees.forEach((emp) => {
      const branchId = emp.branch?.id || emp.branch_id || 'unassigned';
      let branchName = emp.branch?.name || branchMap.get(branchId);
      if (!branchName) {
        if (branchId === 'unassigned') {
          branchName = 'بدون فرع / الإدارة العامة';
        } else if (branchId === '0b52c83c-4a37-4950-8040-fcb00fa718b3') {
          branchName = 'الفرع الأول';
        } else if (branchId === '33b1e65f-074c-4c51-af38-32e13c1fb9a6') {
          branchName = 'الفرع الثاني';
        } else {
          branchName = 'الفرع الرئيسي';
        }
      }

      if (!map.has(branchId)) {
        map.set(branchId, {
          id: branchId,
          name: branchName,
          employees: []
        });
      }
      map.get(branchId)!.employees.push(emp);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.id === 'unassigned') return 1;
      if (b.id === 'unassigned') return -1;
      if (a.name.includes('الأول')) return -1;
      if (b.name.includes('الأول')) return 1;
      return a.name.localeCompare(b.name, 'ar');
    });
  }, [filteredEmployees, branchMap]);

  const [openBranchIds, setOpenBranchIds] = useState<string[]>([]);
  const [hasInitializedBranches, setHasInitializedBranches] = useState(false);

  useEffect(() => {
    if (branchGroups.length > 0 && !hasInitializedBranches) {
      setOpenBranchIds(branchGroups.map((g) => g.id));
      setHasInitializedBranches(true);
    }
  }, [branchGroups, hasInitializedBranches]);

  const openPermissionModal = (emp: Employee) => {
    setPermissionTarget(emp);
    setModalJobRole(emp.job_role || 'DRIVER');
    setModalRoleId(emp.role_id || '');
  };

  return (
    <PageContainer
      pageTitle={t('Employees')}
      pageDescription='إدارة كافة موظفي الشركة، تصنيف الأقسام وتوزيع الصلاحيات'
    >
      <div className='flex flex-col gap-5' dir={dir}>
        {/* شريط تبويبات الأقسام للعمل */}
        <div className='flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none'>
          {[
            {
              id: 'ALL',
              label: 'كافة الموظفين',
              icon: Users,
              count: deptCounts.ALL,
              color: 'text-foreground'
            },
            {
              id: 'DRIVER',
              label: 'المناديب',
              icon: Bike,
              count: deptCounts.DRIVER,
              color: 'text-sky-500'
            },
            {
              id: 'SUPERVISOR',
              label: 'المشرفين',
              icon: ShieldCheck,
              count: deptCounts.SUPERVISOR,
              color: 'text-blue-500'
            },
            {
              id: 'ACCOUNTANT',
              label: 'الحسابات والمالية',
              icon: Briefcase,
              count: deptCounts.ACCOUNTANT,
              color: 'text-emerald-500'
            },
            {
              id: 'OWNER',
              label: 'المالك والإدارة',
              icon: Crown,
              count: deptCounts.OWNER,
              color: 'text-amber-500'
            },
            {
              id: 'CLEANER',
              label: 'عمال النظافة',
              icon: Users,
              count: deptCounts.CLEANER,
              color: 'text-slate-500'
            }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedDept === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedDept(tab.id as DepartmentFilter)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer shadow-2xs',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card text-muted-foreground hover:bg-muted/80 hover:text-foreground border-border/70'
                )}
              >
                <Icon className={cn('size-4', isActive ? 'text-primary-foreground' : tab.color)} />
                <span>{tab.label}</span>
                <Badge
                  variant='secondary'
                  className={cn(
                    'font-mono tabular-nums px-1.5 py-0.2 text-[11px] rounded-md font-extrabold',
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tab.count}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* شريط اختيار الفرع */}
        <div className='flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none'>
          {[
            {
              id: 'ALL',
              label: 'كافة الفروع',
              count: branchCounts['ALL'] || 0,
              icon: Building2
            },
            {
              id: '0b52c83c-4a37-4950-8040-fcb00fa718b3',
              label: 'الفرع الأول',
              count: branchCounts['0b52c83c-4a37-4950-8040-fcb00fa718b3'] || 0,
              icon: Building2
            },
            {
              id: '33b1e65f-074c-4c51-af38-32e13c1fb9a6',
              label: 'الفرع الثاني',
              count: branchCounts['33b1e65f-074c-4c51-af38-32e13c1fb9a6'] || 0,
              icon: Building2
            },
            ...branchesList
              .filter(
                (b) =>
                  b.id !== '0b52c83c-4a37-4950-8040-fcb00fa718b3' &&
                  b.id !== '33b1e65f-074c-4c51-af38-32e13c1fb9a6'
              )
              .map((b) => ({
                id: b.id,
                label: b.name,
                count: branchCounts[b.id] || 0,
                icon: Building2
              }))
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedBranch === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedBranch(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer shadow-2xs',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card text-muted-foreground hover:bg-muted/80 hover:text-foreground border-border/70'
                )}
              >
                <Icon
                  className={cn('size-4', isActive ? 'text-primary-foreground' : 'text-primary')}
                />
                <span>{tab.label}</span>
                <Badge
                  variant='secondary'
                  className={cn(
                    'font-mono tabular-nums px-1.5 py-0.2 text-[11px] rounded-md font-extrabold',
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tab.count}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* شريط البحث والإحصائيات والإجراءات */}
        <Card className='shadow-xs'>
          <CardContent className='flex flex-col items-stretch justify-between gap-3 p-4 sm:flex-row sm:items-center'>
            <div className='relative w-full sm:max-w-md'>
              <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 start-2.5' />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder='ابحث بالاسم، رقم الجوال، الهوية الوطنية...'
                className='ps-9 text-right'
              />
            </div>
            <div className='flex items-center gap-3 flex-wrap justify-between sm:justify-end'>
              <div className='flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground'>
                <span className='flex items-center gap-1.5'>
                  <Users className='size-4 text-primary' />
                  النتائج:
                </span>
                <Badge variant='secondary' className='font-bold font-mono tabular-nums'>
                  {filteredEmployees.length}
                </Badge>
                <span>موظف</span>

                <span className='mx-1 text-border'>|</span>

                <span className='flex items-center gap-1.5'>
                  <Building2 className='size-4 text-primary' />
                  الفروع:
                </span>
                <Badge variant='outline' className='font-bold font-mono tabular-nums'>
                  {branchGroups.length}
                </Badge>
              </div>

              <div className='flex items-center gap-2'>
                <Link
                  href='/dashboard/employees/map'
                  className={cn(
                    buttonVariants({ variant: 'default', size: 'sm' }),
                    'gap-1.5 font-bold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white'
                  )}
                >
                  <MapPin className='size-4' />
                  خريطة المناديب
                </Link>
                <Link
                  href='/dashboard/employees/cards'
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'gap-1.5 font-bold shadow-xs border-primary/30 text-primary hover:bg-primary/10'
                  )}
                >
                  <Icons.printer className='size-4' />
                  طباعة البطاقات
                </Link>
                <Link
                  href='/dashboard/employees/new'
                  className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5 font-bold shadow-xs')}
                >
                  <Icons.add className='size-4' />
                  إضافة موظف
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className='text-muted-foreground p-12 text-center text-sm shadow-xs'>
            <Icons.spinner className='text-primary mx-auto mb-3 size-7 animate-spin' />
            جاري تحميل موظفي الشركة وتصنيفهم حسب الأقسام...
          </Card>
        ) : filteredEmployees.length === 0 ? (
          <Card className='p-12 text-center shadow-xs'>
            <div className='bg-muted text-muted-foreground mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl'>
              <Icons.userCheck className='size-7' />
            </div>
            <CardTitle className='text-lg font-bold'>لا يوجد موظفين في هذا القسم</CardTitle>
            <CardDescription className='mx-auto mt-1.5 max-w-xs text-xs'>
              {search
                ? 'لا توجد نتائج مطابقة لبحثك، جرّب كلمات بحث أخرى.'
                : 'لا يوجد موظفون مسجلون حالياً في هذا القسم المحدد.'}
            </CardDescription>
          </Card>
        ) : (
          <Accordion
            multiple
            value={openBranchIds}
            onValueChange={(val: any) => setOpenBranchIds(Array.isArray(val) ? val : [val])}
            className='flex flex-col gap-4 w-full'
          >
            {branchGroups.map((group) => {
              const isUnassigned = group.id === 'unassigned';

              return (
                <AccordionItem
                  key={group.id}
                  value={group.id}
                  className='border rounded-2xl bg-card shadow-xs overflow-hidden transition-all'
                >
                  <AccordionTrigger className='px-5 py-4 hover:no-underline hover:bg-muted/40 transition-colors'>
                    <div className='flex items-center justify-between gap-3 w-full pl-3'>
                      <div className='flex items-center gap-3 min-w-0'>
                        <div
                          className={cn(
                            'size-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs border',
                            isUnassigned
                              ? 'bg-muted text-muted-foreground border-border'
                              : 'bg-primary/10 text-primary border-primary/20'
                          )}
                        >
                          <Building2 className='size-5' />
                        </div>
                        <div className='text-right min-w-0'>
                          <h3 className='font-bold text-base text-foreground flex items-center gap-2'>
                            <span>{group.name}</span>
                          </h3>
                          <p className='text-xs text-muted-foreground mt-0.5'>
                            {isUnassigned
                              ? 'الموظفون غير المسندين لفرع محدد'
                              : `قائمة موظفي ${group.name}`}
                          </p>
                        </div>
                      </div>

                      <div className='flex items-center gap-2 shrink-0'>
                        <Badge
                          variant='secondary'
                          className='font-mono font-bold text-xs gap-1.5 px-3 py-1 bg-muted/80'
                        >
                          <Users className='size-3.5 text-primary' />
                          <span>{group.employees.length} موظف</span>
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className='pt-0 pb-0 border-t bg-card'>
                    {/* Desktop Table for this branch */}
                    <div className='hidden md:block overflow-x-auto'>
                      <Table>
                        <TableHeader>
                          <TableRow className='bg-muted/30 hover:bg-muted/30'>
                            <TableHead className='text-center w-12 text-xs'>#</TableHead>
                            <TableHead className='text-right text-xs min-w-[200px]'>
                              الموظف
                            </TableHead>
                            <TableHead className='text-center text-xs'>الفرع</TableHead>
                            <TableHead className='text-center text-xs'>القسم والوظيفة</TableHead>
                            <TableHead className='text-center text-xs'>الهوية الوطنية</TableHead>
                            <TableHead className='text-center text-xs'>الصلاحيات</TableHead>
                            <TableHead className='text-center text-xs'>المركبة / المفتاح</TableHead>
                            <TableHead className='text-center text-xs'>الوردية</TableHead>
                            <TableHead className='text-center text-xs'>الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.employees.map((emp, idx) => {
                            const phoneNum = emp.phone || emp.employee_number || '';
                            const waUrl = getWhatsAppURL(phoneNum, `السلام عليكم ${emp.name} `);
                            return (
                              <TableRow
                                key={emp.id}
                                className='group cursor-pointer hover:bg-primary/5 transition-colors'
                                onClick={() => router.push(`/dashboard/employees/${emp.id}`)}
                              >
                                <TableCell className='text-center text-muted-foreground font-mono text-xs w-12'>
                                  {idx + 1}
                                </TableCell>

                                <TableCell className='text-right min-w-[200px]'>
                                  <div className='flex items-center justify-start gap-3'>
                                    <EmployeeAvatar emp={emp} />
                                    <div className='min-w-0 text-right'>
                                      <span className='block font-bold text-sm text-foreground group-hover:text-primary transition-colors'>
                                        {emp.name}
                                      </span>
                                      {phoneNum && (
                                        <span
                                          className='text-muted-foreground block text-xs font-mono'
                                          dir='ltr'
                                        >
                                          {phoneNum}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>

                                <TableCell className='text-center'>
                                  <BranchBadge
                                    branchId={emp.branch?.id || emp.branch_id}
                                    branchName={
                                      emp.branch?.name ||
                                      branchMap.get(emp.branch?.id || emp.branch_id || '')
                                    }
                                  />
                                </TableCell>

                                <TableCell className='text-center'>
                                  <DepartmentBadge role={emp.job_role} />
                                </TableCell>

                                <TableCell className='text-center font-mono tabular-nums text-xs font-semibold'>
                                  {emp.national_id || '—'}
                                </TableCell>

                                <TableCell className='text-center'>
                                  <RoleBadge emp={emp} rolesList={rolesList} />
                                </TableCell>

                                <TableCell className='text-center font-mono tabular-nums text-xs font-medium'>
                                  {emp.motorcycle_number ? (
                                    <span className='font-bold text-foreground'>
                                      🏍️ {emp.motorcycle_number}
                                      {emp.key_number && ` (مفتاح ${emp.key_number})`}
                                    </span>
                                  ) : (
                                    <span className='text-muted-foreground'>—</span>
                                  )}
                                </TableCell>

                                <TableCell className='text-center'>
                                  <Badge
                                    variant='secondary'
                                    className={cn(
                                      'text-[11px] font-bold',
                                      emp.shift === 'evening'
                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                    )}
                                  >
                                    {emp.shift === 'evening' ? '🌙 مساء' : '☀️ صباح'}
                                  </Badge>
                                </TableCell>

                                <TableCell
                                  className='text-center'
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className='flex items-center justify-center gap-1'>
                                    {/* زر إدارة الصلاحيات والقسم */}
                                    <Button
                                      variant='outline'
                                      size='sm'
                                      onClick={() => openPermissionModal(emp)}
                                      className='gap-1 text-xs h-7 px-2 border-primary/30 text-primary hover:bg-primary/10'
                                      title='تعديل القسم والصلاحيات'
                                    >
                                      <ShieldCheck className='size-3.5' />
                                      الصلاحية
                                    </Button>

                                    {waUrl && (
                                      <IconLink
                                        href={waUrl}
                                        label='واتساب'
                                        className='text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400'
                                      >
                                        <Icons.whatsapp className='size-4' />
                                      </IconLink>
                                    )}
                                    <IconLink
                                      href={`/dashboard/employees/${emp.id}/card`}
                                      label='بطاقة الموظف'
                                    >
                                      <Icons.printer className='size-4' />
                                    </IconLink>
                                    <IconLink
                                      href={`/dashboard/employees/${emp.id}/edit`}
                                      label='تعديل'
                                    >
                                      <Icons.edit className='size-4' />
                                    </IconLink>
                                    {canDelete && (
                                      <Button
                                        variant='ghost'
                                        size='icon-sm'
                                        onClick={() => setDeleteTarget(emp)}
                                        aria-label='حذف'
                                        title='حذف'
                                        className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                                      >
                                        <Icons.trash className='size-4' />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile cards for this branch */}
                    <div className='p-3 space-y-2.5 md:hidden'>
                      {group.employees.map((emp, idx) => (
                        <EmployeeMobileCard
                          key={emp.id}
                          emp={emp}
                          rowNum={idx + 1}
                          canDelete={canDelete}
                          rolesList={rolesList}
                          branchMap={branchMap}
                          onDelete={() => setDeleteTarget(emp)}
                          onAssignPermissions={() => openPermissionModal(emp)}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {/* Modal ربط الموظف بصلاحيات وأقسام العمل */}
        <Dialog
          open={!!permissionTarget}
          onOpenChange={(open) => !open && setPermissionTarget(null)}
        >
          <DialogContent className='sm:max-w-md' dir='rtl'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-base font-bold'>
                <ShieldCheck className='size-5 text-primary' />
                ربط الموظف بالقسم والصلاحيات
              </DialogTitle>
              <DialogDescription className='text-xs'>
                تحديد قسم العمل وتعيين الصلاحيات الإدارية للموظف: <b>{permissionTarget?.name}</b>
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-2'>
              <div className='space-y-2'>
                <Label htmlFor='modal_role' className='text-xs font-bold'>
                  قسم العمل / المسمى الوظيفي
                </Label>
                <select
                  id='modal_role'
                  value={modalJobRole}
                  onChange={(e) => {
                    const val = e.target.value;
                    setModalJobRole(val);
                    if (val === 'SUPERVISOR') {
                      const matched = rolesList.find((r) => r.name === 'SUPERVISOR');
                      if (matched) setModalRoleId(matched.id);
                    } else if (val === 'ACCOUNTANT') {
                      const matched = rolesList.find((r) => r.name === 'ACCOUNTANT');
                      if (matched) setModalRoleId(matched.id);
                    } else if (val === 'OWNER') {
                      const matched = rolesList.find(
                        (r) => r.name === 'OWNER' || r.name === 'SUPER_ADMIN'
                      );
                      if (matched) setModalRoleId(matched.id);
                    } else {
                      setModalRoleId('');
                    }
                  }}
                  className='w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20'
                >
                  <option value='DRIVER'>🏍️ مندوب توصيل</option>
                  <option value='SUPERVISOR'>🛡️ مشرف وردية / ميداني</option>
                  <option value='ACCOUNTANT'>💼 حسابات / إدارة مالية</option>
                  <option value='OWNER'>👑 مالك المؤسسة</option>
                  <option value='CLEANER'>🧹 عامل نظافة</option>
                </select>
              </div>

              {modalJobRole !== 'DRIVER' && modalJobRole !== 'CLEANER' ? (
                <div className='space-y-2 p-3.5 rounded-xl border border-primary/20 bg-primary/5'>
                  <Label
                    htmlFor='modal_system_role'
                    className='text-xs font-bold flex items-center gap-1.5'
                  >
                    <Key className='size-3.5 text-primary' />
                    صلاحيات دور النظام (Role)
                  </Label>
                  <select
                    id='modal_system_role'
                    value={modalRoleId}
                    onChange={(e) => setModalRoleId(e.target.value)}
                    className='w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
                  >
                    <option value=''>-- بدون دور إداري خاص --</option>
                    {rolesList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.display_name} ({r.name})
                      </option>
                    ))}
                  </select>
                  {modalRoleId && (
                    <p className='text-[11px] text-muted-foreground mt-1'>
                      سيتم منح الموظف صلاحيات:{' '}
                      {rolesList.find((r) => r.id === modalRoleId)?.display_name}
                    </p>
                  )}
                </div>
              ) : (
                <p className='text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg'>
                  وظيفة المندوب وعامل النظافة لا تتطلب صلاحيات وصول إدارية للوحة التحكم.
                </p>
              )}
            </div>

            <DialogFooter className='gap-2 sm:gap-0'>
              <Button variant='outline' size='sm' onClick={() => setPermissionTarget(null)}>
                إلغاء
              </Button>
              <Button
                size='sm'
                disabled={updateRoleMutation.isPending}
                onClick={() => {
                  if (permissionTarget) {
                    updateRoleMutation.mutate({
                      empId: permissionTarget.id,
                      jobRole: modalJobRole,
                      roleId: modalRoleId
                    });
                  }
                }}
                className='font-bold gap-1.5'
              >
                {updateRoleMutation.isPending && (
                  <Icons.spinner className='size-3.5 animate-spin' />
                )}
                حفظ التعديلات
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* حوار تأكيد الحذف */}
        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent className='sm:max-w-md' dir='rtl'>
            <DialogHeader>
              <DialogTitle className='text-base font-bold text-destructive'>
                تأكيد حذف الموظف
              </DialogTitle>
              <DialogDescription className='text-xs'>
                هل أنت متأكد من حذف الموظف <b>{deleteTarget?.name}</b>؟ هذا الإجراء لا يمكن التراجع
                عنه.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className='gap-2 sm:gap-0'>
              <Button variant='outline' size='sm' onClick={() => setDeleteTarget(null)}>
                إلغاء
              </Button>
              <Button
                variant='destructive'
                size='sm'
                disabled={deleteMutation.isPending}
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                className='font-bold gap-1.5'
              >
                {deleteMutation.isPending && <Icons.spinner className='size-3.5 animate-spin' />}
                حذف الموظف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}

function DepartmentBadge({ role }: { role?: string }) {
  const r = (role || 'DRIVER').toUpperCase();
  if (r === 'OWNER' || r === 'MANAGEMENT') {
    return (
      <Badge className='font-bold text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 gap-1'>
        👑 مالك المؤسسة
      </Badge>
    );
  }
  if (r === 'SUPERVISOR') {
    return (
      <Badge className='font-bold text-[11px] bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800 gap-1'>
        🛡️ مشرف وردية
      </Badge>
    );
  }
  if (r === 'ACCOUNTANT') {
    return (
      <Badge className='font-bold text-[11px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 gap-1'>
        💼 حسابات
      </Badge>
    );
  }
  if (r === 'CLEANER' || r === 'WORKER') {
    return (
      <Badge className='font-bold text-[11px] bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-800 gap-1'>
        🧹 عامل نظافة
      </Badge>
    );
  }
  return (
    <Badge className='font-bold text-[11px] bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-800 gap-1'>
      🏍️ مندوب
    </Badge>
  );
}

function RoleBadge({ emp, rolesList }: { emp: Employee; rolesList: Role[] }) {
  if (emp.role_id || emp.role_name) {
    const matched = rolesList.find((r) => r.id === emp.role_id);
    const title = matched?.display_name || emp.role_name || 'صلاحيات إدارية';
    return (
      <Badge
        variant='outline'
        className='font-bold text-[10px] bg-primary/10 border-primary/30 text-primary gap-1'
      >
        <ShieldCheck className='size-3 text-primary' />
        {title}
      </Badge>
    );
  }
  return <span className='text-muted-foreground text-xs font-mono'>—</span>;
}

function EmployeeAvatar({ emp }: { emp: Employee }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div className='bg-muted relative size-9 shrink-0 overflow-hidden rounded-xl border border-border shadow-2xs flex items-center justify-center'>
      {emp.personal_image && !imgErr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={emp.personal_image}
          alt={emp.name}
          referrerPolicy='no-referrer'
          className='size-full object-cover'
          onError={() => setImgErr(true)}
        />
      ) : (
        <Icons.user className='text-muted-foreground size-5' />
      )}
    </div>
  );
}

function IconLink({
  href,
  label,
  children,
  className
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
        'text-muted-foreground',
        className
      )}
    >
      {children}
    </Link>
  );
}

function BranchBadge({
  branchId,
  branchName
}: {
  branchId?: string | null;
  branchName?: string | null;
}) {
  let name = branchName;
  if (!name) {
    if (branchId === '0b52c83c-4a37-4950-8040-fcb00fa718b3') name = 'الفرع الأول';
    else if (branchId === '33b1e65f-074c-4c51-af38-32e13c1fb9a6') name = 'الفرع الثاني';
    else if (!branchId || branchId === 'unassigned') name = 'بدون فرع';
    else name = 'الفرع الرئيسي';
  }

  const isFirst = name.includes('الأول') || branchId === '0b52c83c-4a37-4950-8040-fcb00fa718b3';
  const isSecond = name.includes('الثاني') || branchId === '33b1e65f-074c-4c51-af38-32e13c1fb9a6';

  return (
    <Badge
      variant='outline'
      className={cn(
        'font-bold text-[11px] gap-1 shrink-0',
        isFirst
          ? 'border-blue-400/40 bg-blue-500/10 text-blue-700 dark:text-blue-300'
          : isSecond
            ? 'border-purple-400/40 bg-purple-500/10 text-purple-700 dark:text-purple-300'
            : 'border-muted text-muted-foreground'
      )}
    >
      <Building2 className='size-3 shrink-0' />
      <span>{name}</span>
    </Badge>
  );
}

function EmployeeMobileCard({
  emp,
  rowNum,
  onDelete,
  onAssignPermissions,
  canDelete,
  rolesList,
  branchMap
}: {
  emp: Employee;
  rowNum: number;
  onDelete: () => void;
  onAssignPermissions: () => void;
  canDelete: boolean;
  rolesList: Role[];
  branchMap?: Map<string, string>;
}) {
  const router = useRouter();
  const phoneNum = emp.phone || emp.employee_number || '';
  const waUrl = getWhatsAppURL(phoneNum, `السلام عليكم يا ${emp.name} `);

  return (
    <Card
      className='cursor-pointer p-3.5 hover:bg-primary/5 transition-colors border shadow-2xs'
      onClick={() => router.push(`/dashboard/employees/${emp.id}`)}
    >
      <div className='flex items-start gap-3'>
        <span className='text-muted-foreground font-mono text-xs pt-2.5 w-5 shrink-0 text-center'>
          {rowNum}
        </span>
        <EmployeeAvatar emp={emp} />
        <div className='min-w-0 flex-1'>
          <div className='flex items-start justify-between gap-2'>
            <div className='min-w-0'>
              <p className='truncate text-sm font-bold leading-tight'>{emp.name}</p>
              <div className='flex items-center gap-1.5 mt-1 flex-wrap'>
                <BranchBadge
                  branchId={emp.branch?.id || emp.branch_id}
                  branchName={
                    emp.branch?.name ||
                    (branchMap ? branchMap.get(emp.branch?.id || emp.branch_id || '') : undefined)
                  }
                />
                <DepartmentBadge role={emp.job_role} />
                <RoleBadge emp={emp} rolesList={rolesList} />
              </div>
            </div>
          </div>
          <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
            <span className='font-mono tabular-nums font-bold text-foreground'>
              {emp.national_id}
            </span>
            {phoneNum && (
              <span className='font-mono tabular-nums text-foreground/90' dir='ltr'>
                📱 {phoneNum}
              </span>
            )}
            {emp.motorcycle_number && (
              <span className='font-mono tabular-nums font-semibold text-foreground'>
                🏍 {emp.motorcycle_number}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className='mt-3 flex flex-wrap gap-2 pt-2 border-t' onClick={(e) => e.stopPropagation()}>
        <Button
          variant='outline'
          size='sm'
          onClick={onAssignPermissions}
          className='gap-1 text-xs h-7 border-primary/30 text-primary hover:bg-primary/10'
        >
          <ShieldCheck className='size-3.5' />
          الصلاحيات والقسم
        </Button>
        {waUrl && (
          <a
            href={waUrl}
            target='_blank'
            rel='noopener noreferrer'
            className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5 text-xs h-7')}
          >
            <Icons.whatsapp className='size-3.5' />
            واتساب
          </a>
        )}
        <Link
          href={`/dashboard/employees/${emp.id}/card`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 text-xs h-7')}
        >
          <Icons.printer className='size-3.5' />
          بطاقة
        </Link>
        <Link
          href={`/dashboard/employees/${emp.id}/edit`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 text-xs h-7')}
        >
          <Icons.edit className='size-3.5' />
          تعديل
        </Link>
        {canDelete && (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => onDelete()}
            className='gap-1.5 text-xs text-destructive hover:bg-destructive/10 h-7'
          >
            <Trash2 className='size-3.5' />
            حذف
          </Button>
        )}
      </div>
    </Card>
  );
}
