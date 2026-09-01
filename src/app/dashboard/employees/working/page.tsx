'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { employeeApi, reportApi } from '@/lib/aams/services';
import type { Employee, WorkSessionDetail } from '@/types/aams';
import { TableSkeleton } from '@/components/aams/skeletons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import PageContainer from '@/components/layout/page-container';
import { formatRiyadh } from '@/lib/aams/riyadh-time';
import { ar } from 'date-fns/locale';
import {
  Eye,
  PlayCircle,
  Bike,
  FileText,
  ArrowLeft,
  User,
  Calendar,
  Clock,
  Search,
  Gauge,
  Sparkles
} from 'lucide-react';
import { useLocale } from '@/components/layout/locale-provider';

function getTodayStr() {
  return formatRiyadh(new Date(), 'yyyy-MM-dd');
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatRiyadh(d, 'yyyy-MM-dd');
}

interface WorkingEmployeeWithSession extends Employee {
  activeSession?: WorkSessionDetail;
  startTime?: string;
  startKM?: number;
  effectiveMotorcycle?: string;
  effectiveApp?: string;
}

interface DayGroup {
  dateKey: string;
  title: string;
  subTitle: string;
  isToday: boolean;
  isYesterday: boolean;
  employees: WorkingEmployeeWithSession[];
}

function EmployeeAvatar({
  emp,
  size = 'md'
}: {
  emp: WorkingEmployeeWithSession;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'size-9 rounded-xl',
    md: 'size-11 rounded-2xl',
    lg: 'size-14 rounded-2xl'
  }[size];

  const imageUrl = emp.personal_image || '';

  return (
    <div
      className={cn(
        sizes,
        'relative flex-shrink-0 overflow-hidden',
        imageUrl
          ? 'bg-muted border border-border'
          : 'bg-primary/10 text-primary border border-primary/20'
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={emp.name} className='size-full object-cover' />
      ) : (
        <div className='flex size-full items-center justify-center font-bold text-sm'>
          {emp.name?.slice(0, 2) || 'م'}
        </div>
      )}
    </div>
  );
}

export default function WorkingEmployeesPage() {
  const router = useRouter();
  const { t, locale, dir } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch employees list
  const { data: employeesData, isLoading: employeesLoading } = useOfflineQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeeApi.getAll({ limit: 1000 }),
    staleTime: 30 * 1000,
    cacheKey: 'employees_all'
  });

  // Fetch active sessions report
  const { data: reportsData, isLoading: reportsLoading } = useOfflineQuery({
    queryKey: ['active-work-sessions'],
    queryFn: () => reportApi.getReports({ limit: 1000 }),
    staleTime: 15 * 1000,
    cacheKey: 'active_sessions_reports'
  });

  const isLoading = employeesLoading || reportsLoading;

  // Filter employees with active sessions
  const enrichedEmployees = useMemo(() => {
    if (!employeesData?.data) return [];

    const employees = employeesData.data;
    const reports = reportsData?.data || [];

    const activeReportsMap = new Map<string, WorkSessionDetail>();
    reports.forEach((rep: WorkSessionDetail) => {
      if (!rep.end_km && !rep.end_time && rep.employee_id) {
        activeReportsMap.set(rep.employee_id, rep);
      }
    });

    const working = employees.filter((emp: Employee) => {
      const s = (emp as any).status;
      return s === 'working' || s === 'in_duty' || activeReportsMap.has(emp.id);
    });

    return working.map((emp: Employee) => {
      const activeSession = activeReportsMap.get(emp.id);
      return {
        ...emp,
        activeSession,
        startTime: activeSession?.start_time || (emp as any).work_start_time,
        startKM: activeSession?.start_km ?? (emp as any).current_km,
        effectiveMotorcycle: (activeSession as any)?.motorcycle_number || emp.motorcycle_number,
        effectiveApp: (activeSession as any)?.application_id || emp.application_id
      };
    });
  }, [employeesData, reportsData]);

  // Apply search query
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return enrichedEmployees;
    const q = searchQuery.toLowerCase().trim();
    return enrichedEmployees.filter((emp) => {
      return (
        emp.name?.toLowerCase().includes(q) ||
        emp.national_id?.includes(q) ||
        emp.key_number?.toLowerCase().includes(q) ||
        emp.effectiveMotorcycle?.toLowerCase().includes(q) ||
        emp.effectiveApp?.toLowerCase().includes(q)
      );
    });
  }, [enrichedEmployees, searchQuery]);

  // Group working employees by start date
  const dayGroups = useMemo(() => {
    const todayStr = getTodayStr();
    const yesterdayStr = getYesterdayStr();

    const groupsMap = new Map<string, WorkingEmployeeWithSession[]>();

    filteredEmployees.forEach((emp) => {
      let dateKey = todayStr;
      if (emp.startTime) {
        try {
          dateKey = formatRiyadh(emp.startTime, 'yyyy-MM-dd');
        } catch {
          dateKey = todayStr;
        }
      }

      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, []);
      }
      groupsMap.get(dateKey)!.push(emp);
    });

    // Sort dates descending
    const sortedKeys = Array.from(groupsMap.keys()).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((dateKey) => {
      const emps = groupsMap.get(dateKey)!;
      emps.sort((a, b) => {
        const ka = String(a.key_number || '');
        const kb = String(b.key_number || '');
        return ka.localeCompare(kb, undefined, { numeric: true });
      });

      const isToday = dateKey === todayStr;
      const isYesterday = dateKey === yesterdayStr;

      let title = `شفتات يوم ${formatRiyadh(dateKey, 'EEEE d MMMM yyyy', { locale: ar })}`;
      let subTitle = formatRiyadh(dateKey, 'yyyy/MM/dd');

      if (isToday) {
        title = `شفتات اليوم (${formatRiyadh(dateKey, 'EEEE d MMMM', { locale: ar })})`;
      } else if (isYesterday) {
        title = `شفتات أمس (${formatRiyadh(dateKey, 'EEEE d MMMM', { locale: ar })})`;
      }

      return {
        dateKey,
        title,
        subTitle,
        isToday,
        isYesterday,
        employees: emps
      };
    });
  }, [filteredEmployees]);

  const totalWorkingCount = enrichedEmployees.length;

  return (
    <PageContainer>
      <div className='space-y-6 max-w-7xl mx-auto' dir={dir}>
        <PageHeader
          category={t('Employees')}
          title={t('Working Now')}
          description={t('المناديب المتواجدون حالياً في شفت عمل مرتبين ومقسمين حسب تاريخ بدء الشفت')}
        />

        {/* Stats & Search Bar */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <Card className='border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent'>
            <CardContent className='flex items-center gap-4 p-4'>
              <div className='flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm'>
                <PlayCircle className='size-6' />
              </div>
              <div>
                <p className='text-xs font-semibold text-muted-foreground'>
                  {t('المناديب في الخدمة الآن')}
                </p>
                <p className='text-2xl font-black tabular-nums tracking-tight'>
                  {isLoading ? '...' : totalWorkingCount}{' '}
                  <span className='text-xs font-medium text-muted-foreground'>{t('Delegate')}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className='border-border bg-muted/40'>
            <CardContent className='flex items-center gap-4 p-4'>
              <div className='flex size-12 items-center justify-center rounded-2xl bg-muted text-foreground border border-border'>
                <Calendar className='size-6 text-primary' />
              </div>
              <div>
                <p className='text-xs font-semibold text-muted-foreground'>{t('الأيام المفتوحة')}</p>
                <p className='text-2xl font-black tabular-nums tracking-tight'>
                  {isLoading ? '...' : dayGroups.length}{' '}
                  <span className='text-xs font-medium text-muted-foreground'>
                    {dayGroups.length > 1 ? 'أيام مختلفة' : 'يوم واحد'}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className='flex items-center'>
            <div className='relative w-full'>
              <Search className='absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
              <Input
                placeholder={t('بحث بالاسم، رقم الهوية، رقم الدراجة، المفتاح...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='h-12 pr-10 pl-4 bg-background border-border rounded-xl text-sm'
              />
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <TableSkeleton rows={6} />
        ) : !enrichedEmployees.length ? (
          <Card className='p-10 md:p-14 text-center border-dashed border-2'>
            <div className='mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
              <FileText className='size-8' />
            </div>
            <CardTitle className='text-lg'>{t('لا يوجد مناديب عاملين حالياً')}</CardTitle>
            <CardDescription className='mt-1.5 max-w-xs mx-auto'>
              {t('لا يوجد مناديب في شفت عمل حالياً. يمكنك بدء شفت جديد من صفحة بدء العمل.')}
            </CardDescription>
            <Link
              href='/dashboard/work/start'
              className={cn(
                buttonVariants({ variant: 'default', size: 'lg' }),
                'mt-6 h-11 font-bold gap-2'
              )}
            >
              {t('بدء شفت جديد')}
            </Link>
          </Card>
        ) : (
          /* Day Groups List */
          <div className='space-y-8'>
            {dayGroups.map((group) => (
              <div key={group.dateKey} className='space-y-4'>
                {/* Day Header Divider */}
                <div className='flex items-center gap-3 pt-2'>
                  <div
                    className={cn(
                      'flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-sm font-black shadow-xs shrink-0',
                      group.isToday
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : group.isYesterday
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                          : 'bg-muted/70 border-border text-foreground'
                    )}
                  >
                    <Calendar className='size-4' />
                    <span>{group.title}</span>
                    <Badge
                      variant={group.isToday ? 'default' : 'secondary'}
                      className='mr-1 px-2 py-0.5 text-xs font-mono font-bold'
                    >
                      {group.employees.length} {group.employees.length === 1 ? 'مندوب' : 'مناديب'}
                    </Badge>
                  </div>
                  <div className='flex-1 h-px bg-gradient-to-l from-transparent via-border to-border' />
                </div>

                {/* Mobile Cards View */}
                <div className='md:hidden space-y-3'>
                  {group.employees.map((emp) => (
                    <Card
                      key={emp.id}
                      className='overflow-hidden border-border/80 shadow-xs hover:border-primary/40 transition-colors'
                    >
                      <CardContent className='p-4 flex items-start gap-3.5'>
                        <EmployeeAvatar emp={emp} size='lg' />
                        <div className='min-w-0 flex-1 space-y-1.5'>
                          <div className='flex items-center justify-between gap-2'>
                            <p className='font-bold text-foreground text-sm truncate'>{emp.name}</p>
                            <Link
                              href={`/dashboard/employees/${emp.id}`}
                              className={cn(
                                buttonVariants({ variant: 'ghost', size: 'icon' }),
                                'size-8 shrink-0'
                              )}
                              aria-label='عرض التفاصيل'
                              title='عرض التفاصيل'
                            >
                              <Eye className='size-4' />
                            </Link>
                          </div>

                          <div className='flex flex-wrap items-center gap-1.5'>
                            {emp.effectiveMotorcycle && (
                              <Badge variant='secondary' className='gap-1 font-bold text-xs'>
                                <Bike className='size-3' />
                                {emp.effectiveMotorcycle}
                              </Badge>
                            )}
                            {emp.effectiveApp && (
                              <Badge variant='outline' className='font-bold text-xs'>
                                {emp.effectiveApp}
                              </Badge>
                            )}
                            <Badge
                              variant='outline'
                              className='font-mono text-xs text-muted-foreground'
                            >
                              مفتاح: {emp.key_number || '-'}
                            </Badge>
                          </div>

                          {emp.startTime && (
                            <div className='flex items-center gap-1 text-xs text-muted-foreground pt-0.5 font-mono'>
                              <Clock className='size-3 text-primary shrink-0' />
                              <span>
                                بدء الدوام: {formatRiyadh(emp.startTime, 'hh:mm a', { locale: ar })}
                              </span>
                              {emp.startKM != null && (
                                <span className='mr-2'>
                                  ({emp.startKM.toLocaleString('ar-SA')} كم)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table View */}
                <Card className='hidden md:block overflow-hidden border-border shadow-xs'>
                  <Table>
                    <TableHeader>
                      <TableRow className='bg-muted/40 hover:bg-muted/40'>
                        <TableHead className='text-right font-bold text-xs text-muted-foreground min-w-[200px]'>
                          المندوب
                        </TableHead>
                        <TableHead className='text-right font-bold text-xs text-muted-foreground'>
                          الهوية الوطنية
                        </TableHead>
                        <TableHead className='text-right font-bold text-xs text-muted-foreground'>
                          رقم الدراجة
                        </TableHead>
                        <TableHead className='text-right font-bold text-xs text-muted-foreground'>
                          المفتاح
                        </TableHead>
                        <TableHead className='text-right font-bold text-xs text-muted-foreground'>
                          التطبيق
                        </TableHead>
                        <TableHead className='text-center font-bold text-xs text-muted-foreground'>
                          وقت بدء الشفت
                        </TableHead>
                        <TableHead className='text-center font-bold text-xs text-muted-foreground'>
                          عداد البدء
                        </TableHead>
                        <TableHead className='text-center font-bold text-xs text-muted-foreground'>
                          الإجراءات
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.employees.map((emp) => (
                        <TableRow key={emp.id} className='hover:bg-muted/30 transition-colors'>
                          <TableCell className='min-w-[200px]'>
                            <div className='flex items-center gap-3'>
                              <EmployeeAvatar emp={emp} size='md' />
                              <div>
                                <p className='font-bold text-foreground text-sm'>{emp.name}</p>
                                {emp.branch?.name && (
                                  <p className='text-[11px] text-muted-foreground'>
                                    {emp.branch.name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className='font-mono tabular-nums text-sm'>
                            {emp.national_id}
                          </TableCell>
                          <TableCell>
                            <Badge variant='secondary' className='gap-1.5 font-bold font-mono'>
                              <Bike className='size-3.5 text-muted-foreground' />
                              {emp.effectiveMotorcycle || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className='font-mono tabular-nums font-bold text-foreground'>
                            {emp.key_number || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant='outline' className='font-bold'>
                              {emp.effectiveApp || 'عام'}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-center'>
                            {emp.startTime ? (
                              <Badge
                                variant='outline'
                                className='font-mono text-xs gap-1 py-1 px-2.5 bg-background'
                              >
                                <Clock className='size-3 text-primary' />
                                {formatRiyadh(emp.startTime, 'hh:mm a', { locale: ar })}
                              </Badge>
                            ) : (
                              <span className='text-muted-foreground text-xs'>-</span>
                            )}
                          </TableCell>
                          <TableCell className='text-center font-mono tabular-nums text-sm font-semibold text-muted-foreground'>
                            {emp.startKM != null
                              ? `${emp.startKM.toLocaleString('ar-SA')} كم`
                              : '-'}
                          </TableCell>
                          <TableCell className='text-center'>
                            <Link
                              href={`/dashboard/employees/${emp.id}`}
                              className={cn(
                                buttonVariants({ variant: 'ghost', size: 'sm' }),
                                'gap-1.5 hover:text-primary'
                              )}
                            >
                              <Eye className='size-4' />
                              <span>تفاصيل</span>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
