'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsSkeleton } from '@/components/aams/skeletons';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { attendanceApi } from '@/lib/aams/services';
import type { AttendanceInfo, AttendanceResponse } from '@/types/aams';

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().split('T')[0];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', selectedDate],
    queryFn: () => attendanceApi.getAttendance(selectedDate)
  });

  const toggleMutation = useMutation({
    mutationFn: ({ employeeId, newStatus }: { employeeId: string; newStatus: string }) =>
      attendanceApi.toggle(employeeId, selectedDate, newStatus),
    onMutate: async ({ employeeId, newStatus }) => {
      setTogglingId(employeeId);
      await queryClient.cancelQueries({ queryKey: ['attendance', selectedDate] });
      const previous = queryClient.getQueryData<AttendanceResponse>(['attendance', selectedDate]);
      if (previous) {
        queryClient.setQueryData<AttendanceResponse>(['attendance', selectedDate], {
          ...previous,
          data: previous.data.map((e) =>
            e.employee_id === employeeId ? { ...e, status: newStatus } : e
          )
        });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['attendance', selectedDate], context.previous);
      }
      const message =
        (error as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'فشل حفظ الحضور';
      toast.error(message);
    },
    onSettled: () => {
      setTogglingId(null);
      queryClient.invalidateQueries({ queryKey: ['attendance', selectedDate] });
    }
  });

  const handleToggle = (employeeId: string, newStatus: string) => {
    toggleMutation.mutate({ employeeId, newStatus });
  };

  const filteredEmployees = useMemo(() => {
    if (!data?.data) return [];
    if (!searchQuery.trim()) return data.data;

    const q = searchQuery.toLowerCase();
    return data.data.filter(
      (e) =>
        e.employee_name.toLowerCase().includes(q) ||
        e.national_id.includes(q) ||
        e.branch_name.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const presentCount = useMemo(
    () => data?.data.filter((e) => e.status === 'present').length ?? 0,
    [data]
  );
  const absentCount = useMemo(
    () => data?.data.filter((e) => e.status === 'absent').length ?? 0,
    [data]
  );

  const presentEmployees = useMemo(
    () => filteredEmployees.filter((e) => e.status === 'present'),
    [filteredEmployees]
  );
  const absentEmployees = useMemo(
    () => filteredEmployees.filter((e) => e.status === 'absent'),
    [filteredEmployees]
  );

  return (
    <PageContainer
      pageTitle='الحضور والانصراف'
      pageDescription='متابعة حضور وانصراف المناديب يومياً'
      pageHeaderAction={
        <div className='flex items-center gap-2'>
          <Input
            type='date'
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className='h-9 w-[140px] text-sm font-medium md:w-[160px]'
          />
          <div className='ms-2 hidden items-center gap-3 sm:flex'>
            <Badge variant='outline' className='h-8 gap-1.5 px-3'>
              <Icons.userCheck className='size-3.5' />
              {presentCount} حاضر
            </Badge>
            <Badge variant='outline' className='h-8 gap-1.5 px-3'>
              <Icons.circleX className='size-3.5' />
              {absentCount} غائب
            </Badge>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <div className='space-y-5'>
          {/* Mobile stats */}
          <div className='flex gap-2 sm:hidden'>
            <Badge
              variant='outline'
              className='flex-1 justify-center gap-1.5 border-border bg-muted/50 py-1.5 text-foreground'
            >
              <Icons.userCheck className='size-3.5' />
              {presentCount} حاضر
            </Badge>
            <Badge
              variant='outline'
              className='flex-1 justify-center gap-1.5 border-border bg-muted/50 py-1.5 text-foreground'
            >
              <Icons.circleX className='size-3.5' />
              {absentCount} غائب
            </Badge>
          </div>

          {/* Search */}
          <div className='relative'>
            <Icons.search className='text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2' />
            <Input
              placeholder='بحث بالاسم أو الهوية...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='h-10 ps-9 text-sm'
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue='all' className='w-full'>
            <TabsList className='grid w-full grid-cols-3 sm:inline-flex sm:w-auto'>
              <TabsTrigger value='all' className='text-xs md:text-sm'>
                الكل ({filteredEmployees.length})
              </TabsTrigger>
              <TabsTrigger value='present' className='text-xs md:text-sm'>
                الحضور ({presentEmployees.length})
              </TabsTrigger>
              <TabsTrigger value='absent' className='text-xs md:text-sm'>
                الغياب ({absentEmployees.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value='all' className='mt-4'>
              {filteredEmployees.length === 0 ? (
                <p className='text-muted-foreground py-12 text-center text-sm'>لا توجد نتائج</p>
              ) : (
                <div className='space-y-2'>
                  {filteredEmployees.map((emp) => (
                    <EmployeeAttendanceCard
                      key={emp.employee_id}
                      employee={emp}
                      onToggle={handleToggle}
                      isToggling={togglingId === emp.employee_id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value='present' className='mt-4'>
              {presentEmployees.length === 0 ? (
                <p className='text-muted-foreground py-12 text-center text-sm'>
                  لا يوجد مناديب حضور
                </p>
              ) : (
                <div className='space-y-2'>
                  {presentEmployees.map((emp) => (
                    <EmployeeAttendanceCard
                      key={emp.employee_id}
                      employee={emp}
                      onToggle={handleToggle}
                      isToggling={togglingId === emp.employee_id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value='absent' className='mt-4'>
              {absentEmployees.length === 0 ? (
                <p className='text-muted-foreground py-12 text-center text-sm'>
                  لا يوجد مناديب غياب
                </p>
              ) : (
                <div className='space-y-2'>
                  {absentEmployees.map((emp) => (
                    <EmployeeAttendanceCard
                      key={emp.employee_id}
                      employee={emp}
                      onToggle={handleToggle}
                      isToggling={togglingId === emp.employee_id}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </PageContainer>
  );
}

function EmployeeAttendanceCard({
  employee,
  onToggle,
  isToggling
}: {
  employee: AttendanceInfo;
  onToggle: (empId: string, newStatus: string) => void;
  isToggling: boolean;
}) {
  return (
    <Card
      className={cn(
        'border-border/60 transition-all duration-200',
        employee.status === 'absent' && 'border-border bg-muted/50'
      )}
    >
      <CardContent className='flex items-center justify-between p-3 md:p-4'>
        <div className='flex min-w-0 items-center gap-3'>
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-2xl text-lg font-bold md:size-11',
              employee.status === 'present'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
            )}
          >
            {employee.employee_name.charAt(0)}
          </div>
          <div className='min-w-0'>
            <p className='truncate text-sm font-semibold leading-tight md:text-base'>
              {employee.employee_name}
            </p>
            <p className='text-muted-foreground truncate text-[11px] md:text-xs'>
              {employee.national_id}
              {employee.branch_name ? ` · ${employee.branch_name}` : ''}
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            onToggle(employee.employee_id, employee.status === 'absent' ? 'present' : 'absent')
          }
          disabled={isToggling}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 md:px-4 md:py-2 md:text-sm',
            employee.status === 'present'
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/40'
              : 'bg-muted text-foreground hover:bg-muted/80'
          )}
        >
          {isToggling ? (
            <Icons.spinner className='size-3.5 animate-spin' />
          ) : employee.status === 'present' ? (
            <Icons.check className='size-3.5' />
          ) : (
            <Icons.close className='size-3.5' />
          )}
          <span>{employee.status === 'present' ? 'حاضر' : 'غائب'}</span>
        </button>
      </CardContent>
    </Card>
  );
}
