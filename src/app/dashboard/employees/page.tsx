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
import { employeeApi } from '@/lib/aams/services';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { useLocale } from '@/components/layout/locale-provider';
import type { Employee, PaginatedResponse } from '@/types/aams';
import { Building2, Users, MapPin } from 'lucide-react';

interface BranchGroup {
  id: string;
  name: string;
  employees: Employee[];
}

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
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const canDelete = !getAdminUser()?.branch_id;

  const { data, isLoading } = useOfflineQuery<PaginatedResponse<Employee>>({
    queryKey: ['employees', search, page],
    queryFn: () =>
      employeeApi.getAll({ search, page, limit: 100, sort_by: 'key_number', order: 'asc' }),
    cacheKey: `employees_page_${page}_${search}`
  });

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

  const employees = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 0;

  // Group employees by branch
  const branchGroups = useMemo<BranchGroup[]>(() => {
    const map = new Map<string, BranchGroup>();

    employees.forEach((emp) => {
      const branchId = emp.branch?.id || emp.branch_id || 'unassigned';
      const branchName =
        emp.branch?.name ||
        (branchId === 'unassigned' ? 'بدون فرع / الإدارة العامة' : 'الفرع الرئيسي');

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
      return a.name.localeCompare(b.name, 'ar');
    });
  }, [employees]);

  const [openBranchIds, setOpenBranchIds] = useState<string[]>([]);
  const [hasInitializedBranches, setHasInitializedBranches] = useState(false);

  useEffect(() => {
    if (branchGroups.length > 0 && !hasInitializedBranches) {
      setOpenBranchIds(branchGroups.map((g) => g.id));
      setHasInitializedBranches(true);
    }
  }, [branchGroups, hasInitializedBranches]);

  return (
    <PageContainer pageTitle={t('Employees')} pageDescription={t('All Employees')}>
      <div className='flex flex-col gap-4' dir={dir}>
        {/* شريط البحث والإحصائيات */}
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
                placeholder='ابحث بالاسم، رقم الجوال، الهوية أو رقم الدراجة...'
                className='ps-9 text-right'
              />
            </div>
            <div className='flex items-center gap-3 flex-wrap justify-between sm:justify-end'>
              <div className='flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground'>
                <span className='flex items-center gap-1.5'>
                  <Users className='size-4 text-primary' />
                  الإجمالي:
                </span>
                <Badge variant='secondary' className='font-bold font-mono tabular-nums'>
                  {total}
                </Badge>
                <span>مندوب</span>

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
                  خريطة المناديب (الطائف)
                </Link>
                <Link
                  href='/dashboard/employees/cards'
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'gap-1.5 font-bold shadow-xs border-primary/30 text-primary hover:bg-primary/10'
                  )}
                >
                  <Icons.printer className='size-4' />
                  {t('Print ID Cards (CR80)')}
                </Link>
                <Link
                  href='/dashboard/employees/new'
                  className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5 font-bold shadow-xs')}
                >
                  <Icons.add className='size-4' />
                  {t('Add Employee')}
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card className='text-muted-foreground p-12 text-center text-sm shadow-xs'>
            <Icons.spinner className='text-primary mx-auto mb-3 size-7 animate-spin' />
            جاري تحميل المناديب وتصنيفهم حسب الفروع...
          </Card>
        ) : employees.length === 0 ? (
          <Card className='p-12 text-center shadow-xs'>
            <div className='bg-muted text-muted-foreground mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl'>
              <Icons.userCheck className='size-7' />
            </div>
            <CardTitle className='text-lg font-bold'>لا يوجد مناديب</CardTitle>
            <CardDescription className='mx-auto mt-1.5 max-w-xs text-xs'>
              {search
                ? 'لا توجد نتائج مطابقة لبحثك، جرّب كلمات بحث أخرى.'
                : 'لا يوجد مناديب مسجلون بعد في النظام.'}
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
                              ? 'المناديب غير المسندين لفرع محدد'
                              : `قائمة مناديب وموظفي ${group.name}`}
                          </p>
                        </div>
                      </div>

                      <div className='flex items-center gap-2 shrink-0'>
                        <Badge
                          variant='secondary'
                          className='font-mono font-bold text-xs gap-1.5 px-3 py-1 bg-muted/80'
                        >
                          <Users className='size-3.5 text-primary' />
                          <span>
                            {group.employees.length}{' '}
                            {group.employees.length === 1 ? 'مندوب' : 'مناديب'}
                          </span>
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
                            <TableHead className='text-center text-xs'>الوظيفة</TableHead>
                            <TableHead className='text-center text-xs'>الهوية الوطنية</TableHead>
                            <TableHead className='text-center text-xs'>رقم الدراجة</TableHead>
                            <TableHead className='text-center text-xs'>رقم المفتاح</TableHead>
                            <TableHead className='text-center text-xs'>التطبيق</TableHead>
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

                                <TableCell className='text-center font-semibold text-xs'>
                                  {emp.job_role === 'SUPERVISOR'
                                    ? 'مشرف'
                                    : emp.job_role === 'MANAGEMENT'
                                      ? 'إدارة'
                                      : emp.job_role === 'WORKER'
                                        ? 'عامل'
                                        : 'مندوب'}
                                </TableCell>

                                <TableCell className='text-center font-mono tabular-nums text-xs font-medium'>
                                  {emp.national_id || '—'}
                                </TableCell>

                                <TableCell className='text-center font-mono tabular-nums text-xs font-bold'>
                                  {emp.motorcycle_number || (
                                    <span className='text-muted-foreground font-normal'>—</span>
                                  )}
                                </TableCell>

                                <TableCell className='text-center text-muted-foreground font-mono tabular-nums text-xs'>
                                  {emp.key_number || '—'}
                                </TableCell>

                                <TableCell className='text-center'>
                                  <Badge
                                    variant='outline'
                                    className='font-mono text-[11px] font-bold bg-primary/5 border-primary/20 text-primary'
                                  >
                                    {formatAppName(emp.application_type, emp.application_id)}
                                  </Badge>
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
                                  <div className='flex items-center justify-center gap-0.5'>
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
                          onDelete={() => setDeleteTarget(emp)}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {/* الترقيم عند تعدد الصفحات */}
        <Pagination
          page={data?.page ?? 1}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      </div>

      {/* نافذة تأكيد الحذف */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent dir='rtl'>
          <DialogHeader className='text-right'>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `هل أنت متأكد من حذف «${deleteTarget.name}»؟ لا يمكن التراجع عن هذا الإجراء.`
                : 'هل أنت متأكد من حذف هذا الموظف؟'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2 sm:justify-start'>
            <Button variant='outline' onClick={() => setDeleteTarget(null)}>
              إلغاء
            </Button>
            <Button
              variant='destructive'
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className='font-bold'
            >
              {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function EmployeeAvatar({ emp }: { emp: Employee }) {
  return (
    <div className='bg-muted flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border'>
      {emp.personal_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={emp.personal_image}
          alt={emp.name}
          className='size-full object-cover'
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
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

function EmployeeMobileCard({
  emp,
  rowNum,
  onDelete,
  canDelete
}: {
  emp: Employee;
  rowNum: number;
  onDelete: () => void;
  canDelete: boolean;
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
              <div className='flex gap-1 mt-0.5'>
                <Badge variant='secondary' className='text-[10px]'>
                  {emp.job_role === 'SUPERVISOR'
                    ? 'مشرف'
                    : emp.job_role === 'MANAGEMENT'
                      ? 'إدارة'
                      : emp.job_role === 'WORKER'
                        ? 'عامل'
                        : 'مندوب'}
                </Badge>
              </div>
            </div>
            <div className='flex flex-col items-end gap-1 shrink-0'>
              <Badge
                variant='outline'
                className='text-[10px] font-bold bg-primary/5 border-primary/20 text-primary'
              >
                {formatAppName(emp.application_type, emp.application_id)}
              </Badge>
              <Badge
                variant='secondary'
                className={cn(
                  'text-[10px] font-bold',
                  emp.shift === 'evening'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                )}
              >
                {emp.shift === 'evening' ? '🌙 مساء' : '☀️ صباح'}
              </Badge>
            </div>
          </div>
          <div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
            <span className='font-mono tabular-nums'>{emp.national_id}</span>
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
            <Icons.trash className='size-3.5' />
            حذف
          </Button>
        )}
      </div>
    </Card>
  );
}

function Pagination({
  page,
  totalPages,
  onPrev,
  onNext
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className='flex items-center justify-between gap-3 border rounded-xl bg-card p-4 shadow-2xs'>
      <span className='text-muted-foreground text-xs font-medium tabular-nums'>
        الصفحة {page} من {totalPages}
      </span>
      <div className='flex items-center gap-2'>
        <Button variant='outline' size='sm' disabled={page <= 1} onClick={onPrev}>
          <Icons.chevronRight className='size-4' />
          <span className='hidden sm:inline'>السابقة</span>
        </Button>
        <Button variant='outline' size='sm' disabled={page >= totalPages} onClick={onNext}>
          <span className='hidden sm:inline'>التالية</span>
          <Icons.chevronLeft className='size-4' />
        </Button>
      </div>
    </div>
  );
}
