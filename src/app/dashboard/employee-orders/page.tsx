'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { reportApi, employeeApi, branchApi, workApi } from '@/lib/aams/services';
import { formatRiyadh } from '@/lib/aams/riyadh-time';
import { useLocale } from '@/components/layout/locale-provider';
import PageContainer from '@/components/layout/page-container';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { TableSkeleton } from '@/components/aams/skeletons';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ar } from 'date-fns/locale';
import {
  Package,
  CheckCircle2,
  Clock,
  Users,
  Route,
  Fuel,
  Trophy,
  Crown,
  Search,
  Download,
  Printer,
  RefreshCw,
  Calendar,
  Building2,
  Eye,
  ArrowUpRight,
  SlidersHorizontal,
  Sparkles,
  Bike
} from 'lucide-react';
import type { Branch, Employee, PaginatedResponse, WorkSessionDetail } from '@/types/aams';

type PeriodPreset = 'month' | 'today' | 'week' | 'custom' | 'all';
type ActivityFilter = 'all' | 'with_orders' | 'has_pending' | 'target_achieved' | 'zero_orders';
type SortByOption =
  | 'total_orders_desc'
  | 'approved_orders_desc'
  | 'pending_orders_desc'
  | 'distance_desc'
  | 'shifts_desc'
  | 'name_asc';

const MONTHLY_TARGET_ORDERS = 460;
const BASE_TARGET_SALARY = 2800;
const EXTRA_ORDER_BONUS_SAR = 6;

export interface EmployeeOrdersSummaryRow {
  employee_id: string;
  employee_name: string;
  employee_number: string;
  national_id: string;
  phone: string;
  personal_image: string;
  branch_id: string;
  branch_name: string;
  motorcycle_number: string;
  application_type: string;
  application_id: string;
  job_role: string;
  approved_orders: number;
  pending_orders: number;
  total_orders: number;
  approved_shifts_count: number;
  pending_shifts_count: number;
  active_shifts_count: number;
  total_shifts_count: number;
  working_days_count: number;
  total_distance_km: number;
  total_fuel_cost: number;
  avg_orders_per_day: number;
  target_percent: number;
  expected_salary: number;
  last_shift_date: string | null;
  sessions: WorkSessionDetail[];
}

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getAppLabel(appType?: string, appId?: string): string {
  const raw = (appType || appId || '').toLowerCase().trim();
  if (!raw) return 'غير محدد';
  if (raw.includes('keeta') || raw.includes('كيتا')) return 'كيتا (Keeta)';
  if (raw.includes('ninja') || raw.includes('نينجا')) return 'نينجا (Ninja)';
  if (raw.includes('hunger') || raw.includes('هنقر')) return 'هنقرستيشن';
  if (raw.includes('jahez') || raw.includes('جاهز')) return 'جاهز (Jahez)';
  if (raw.includes('toyou') || raw.includes('toyo') || raw.includes('تويو')) return 'تويو (ToYou)';
  if (raw.includes('mrsool') || raw.includes('مرسول')) return 'مرسول (Mrsool)';
  if (raw.includes('chef') || raw.includes('شيفز')) return 'ذا شيفز';
  return appType || appId || 'غير محدد';
}

function getAppBadgeClass(appType?: string, appId?: string): string {
  const raw = (appType || appId || '').toLowerCase().trim();
  if (raw.includes('keeta') || raw.includes('كيتا')) {
    return 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300';
  }
  if (raw.includes('ninja') || raw.includes('نينجا')) {
    return 'bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-300';
  }
  if (raw.includes('hunger') || raw.includes('هنقر')) {
    return 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30 dark:text-yellow-300';
  }
  if (raw.includes('jahez') || raw.includes('جاهز')) {
    return 'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-300';
  }
  return 'bg-primary/10 text-primary border-primary/20';
}

function calculateExpectedSalary(orders: number): number {
  if (orders <= 0) return 0;
  if (orders <= MONTHLY_TARGET_ORDERS) {
    return Math.round((orders / MONTHLY_TARGET_ORDERS) * BASE_TARGET_SALARY);
  }
  const extraOrders = orders - MONTHLY_TARGET_ORDERS;
  return BASE_TARGET_SALARY + extraOrders * EXTRA_ORDER_BONUS_SAR;
}

export default function EmployeeTotalOrdersPage() {
  const { dir } = useLocale();
  const queryClient = useQueryClient();

  // Period state
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => formatDateInput(new Date()));

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedApp, setSelectedApp] = useState<string>('ALL');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [sortBy, setSortBy] = useState<SortByOption>('total_orders_desc');

  // Side Sheet state for viewing an employee's detailed shift breakdown
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [approvingAllForEmp, setApprovingAllForEmp] = useState(false);

  // Compute effective start_date and end_date for the API query
  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStr = formatDateInput(now);

    if (periodPreset === 'today') {
      return { start_date: todayStr, end_date: todayStr, label: `اليوم (${todayStr})` };
    }

    if (periodPreset === 'week') {
      const d = new Date(now);
      const day = d.getDay();
      const diffToSaturday = (day + 1) % 7;
      d.setDate(d.getDate() - diffToSaturday);
      const startStr = formatDateInput(d);
      return {
        start_date: startStr,
        end_date: todayStr,
        label: `هذا الأسبوع (${startStr} إلى ${todayStr})`
      };
    }

    if (periodPreset === 'month') {
      const [y, m] = selectedMonth.split('-').map(Number);
      const startStr = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return {
        start_date: startStr,
        end_date: endStr,
        label: `شهر ${selectedMonth}`
      };
    }

    if (periodPreset === 'custom') {
      return {
        start_date: customStartDate || undefined,
        end_date: customEndDate || undefined,
        label: `من ${customStartDate || 'البداية'} إلى ${customEndDate || 'اليوم'}`
      };
    }

    return { start_date: undefined, end_date: undefined, label: 'جميع الأوقات' };
  }, [periodPreset, selectedMonth, customStartDate, customEndDate]);

  // Month Navigation
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m - 2, 1);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m, 1);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  // 1. Fetch All Employees
  const {
    data: employeesRes,
    isLoading: isLoadingEmployees,
    refetch: refetchEmployees
  } = useOfflineQuery<PaginatedResponse<Employee>>({
    queryKey: ['all-employees-for-orders-summary'],
    queryFn: () => employeeApi.getAll({ limit: 1000 }),
    cacheKey: 'all_employees_orders_summary'
  });

  // 2. Fetch Branches
  const { data: branches = [] } = useOfflineQuery<Branch[]>({
    queryKey: ['branches-list'],
    queryFn: () => branchApi.getAll(),
    cacheKey: 'branches_list'
  });

  // 3. Fetch Work Sessions / Reports for the selected date range
  const {
    data: reportsRes,
    isLoading: isLoadingReports,
    isFetching: isFetchingReports,
    refetch: refetchReports
  } = useOfflineQuery<{
    data: WorkSessionDetail[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ['employee-orders-reports', dateRange.start_date, dateRange.end_date],
    queryFn: () =>
      reportApi.getReports({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        page: 1,
        limit: 5000
      }),
    cacheKey: `employee_orders_reports_${dateRange.start_date || 'all'}_${dateRange.end_date || 'all'}`
  });

  // Supervisor Single Shift Review Mutation
  const reviewMutation = useMutation({
    mutationFn: (sessionId: string) =>
      workApi.reviewWorkSession(sessionId, { is_reviewed: true, review_notes: '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-orders-reports'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('تم اعتماد الشفت والطلبات بنجاح');
    },
    onError: () => {
      toast.error('فشل في اعتماد الشفت');
    }
  });

  // Aggregate Orders & Shifts per Employee
  const aggregatedRows = useMemo<EmployeeOrdersSummaryRow[]>(() => {
    const employees = employeesRes?.data ?? [];
    const sessions = reportsRes?.data ?? [];

    const map = new Map<string, EmployeeOrdersSummaryRow>();
    const workingDaysTracker = new Map<string, Set<string>>();

    // Initialize from employee directory
    for (const emp of employees) {
      map.set(emp.id, {
        employee_id: emp.id,
        employee_name: emp.name || 'مندوب',
        employee_number: emp.employee_number || '',
        national_id: emp.national_id || '',
        phone: emp.phone || '',
        personal_image: emp.personal_image || '',
        branch_id: emp.branch_id || emp.branch?.id || '',
        branch_name: emp.branch?.name || 'غير محدد',
        motorcycle_number: emp.motorcycle_number || '',
        application_type: emp.application_type || '',
        application_id: emp.application_id || '',
        job_role: emp.job_role || 'DRIVER',
        approved_orders: 0,
        pending_orders: 0,
        total_orders: 0,
        approved_shifts_count: 0,
        pending_shifts_count: 0,
        active_shifts_count: 0,
        total_shifts_count: 0,
        working_days_count: 0,
        total_distance_km: 0,
        total_fuel_cost: 0,
        avg_orders_per_day: 0,
        target_percent: 0,
        expected_salary: 0,
        last_shift_date: null,
        sessions: []
      });
      workingDaysTracker.set(emp.id, new Set<string>());
    }

    // Aggregate sessions
    for (const s of sessions) {
      const empId = s.employee_id;
      if (!empId) continue;

      if (!map.has(empId)) {
        map.set(empId, {
          employee_id: empId,
          employee_name: s.employee_name || 'مندوب',
          employee_number: s.employee?.employee_number || '',
          national_id: s.national_id || s.employee?.national_id || '',
          phone: s.employee?.phone || '',
          personal_image: s.personal_image || s.employee?.personal_image || '',
          branch_id: s.employee?.branch_id || '',
          branch_name: s.branch_name || s.employee?.branch?.name || 'غير محدد',
          motorcycle_number: s.motorcycle_number || s.employee?.motorcycle_number || '',
          application_type: s.application_type || s.employee?.application_type || '',
          application_id: s.application_id || s.employee?.application_id || '',
          job_role: s.employee?.job_role || 'DRIVER',
          approved_orders: 0,
          pending_orders: 0,
          total_orders: 0,
          approved_shifts_count: 0,
          pending_shifts_count: 0,
          active_shifts_count: 0,
          total_shifts_count: 0,
          working_days_count: 0,
          total_distance_km: 0,
          total_fuel_cost: 0,
          avg_orders_per_day: 0,
          target_percent: 0,
          expected_salary: 0,
          last_shift_date: null,
          sessions: []
        });
        workingDaysTracker.set(empId, new Set<string>());
      }

      const row = map.get(empId)!;
      const daysSet = workingDaysTracker.get(empId)!;

      row.sessions.push(s);
      row.total_shifts_count += 1;

      const orders = Math.max(0, Number(s.orders_count) || 0);
      const dist = Math.max(
        0,
        Number(s.distance) ||
          (Number(s.end_km) > Number(s.start_km) ? Number(s.end_km) - Number(s.start_km) : 0)
      );
      const fuel = Math.max(0, Number(s.fuel_cost) || 0);

      if (s.status === 'ACTIVE') {
        row.active_shifts_count += 1;
      } else if (s.is_reviewed) {
        row.approved_shifts_count += 1;
        row.approved_orders += orders;
      } else {
        row.pending_shifts_count += 1;
        row.pending_orders += orders;
      }

      row.total_orders = row.approved_orders + row.pending_orders;
      row.total_distance_km = Math.round((row.total_distance_km + dist) * 10) / 10;
      row.total_fuel_cost = Math.round((row.total_fuel_cost + fuel) * 100) / 100;

      if (s.start_time) {
        const dayKey = s.start_time.slice(0, 10);
        daysSet.add(dayKey);
        if (!row.last_shift_date || s.start_time > row.last_shift_date) {
          row.last_shift_date = s.start_time;
        }
      }

      if (!row.application_id && s.application_id) {
        row.application_id = s.application_id;
      }
      if (!row.application_type && s.application_type) {
        row.application_type = s.application_type;
      }
      if (row.branch_name === 'غير محدد' && s.branch_name) {
        row.branch_name = s.branch_name;
      }
    }

    // Finalize derived metrics per employee
    for (const [empId, row] of map.entries()) {
      const daysCount = workingDaysTracker.get(empId)?.size ?? 0;
      row.working_days_count = daysCount;
      row.avg_orders_per_day =
        daysCount > 0 ? Math.round((row.total_orders / daysCount) * 10) / 10 : 0;
      row.target_percent = Math.min(
        100,
        Math.round((row.total_orders / MONTHLY_TARGET_ORDERS) * 100)
      );
      row.expected_salary = calculateExpectedSalary(row.approved_orders);
      // Sort employee sessions newest first
      row.sessions.sort((a, b) => (b.start_time || '').localeCompare(a.start_time || ''));
    }

    return Array.from(map.values());
  }, [employeesRes?.data, reportsRes?.data]);

  // Apply Search, Branch, Application, Activity Filters & Sorting
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = aggregatedRows.filter((row) => {
      // Search filter
      if (q) {
        const matchesName = row.employee_name.toLowerCase().includes(q);
        const matchesNationalId = row.national_id.toLowerCase().includes(q);
        const matchesEmpNumber = row.employee_number.toLowerCase().includes(q);
        const matchesPhone = row.phone.toLowerCase().includes(q);
        const matchesBike = row.motorcycle_number.toLowerCase().includes(q);
        const matchesAppId = row.application_id.toLowerCase().includes(q);
        if (
          !matchesName &&
          !matchesNationalId &&
          !matchesEmpNumber &&
          !matchesPhone &&
          !matchesBike &&
          !matchesAppId
        ) {
          return false;
        }
      }

      // Branch filter
      if (selectedBranch !== 'ALL') {
        if (row.branch_id !== selectedBranch && row.branch_name !== selectedBranch) {
          return false;
        }
      }

      // Application filter
      if (selectedApp !== 'ALL') {
        const combinedApp = `${row.application_type} ${row.application_id}`.toLowerCase();
        if (!combinedApp.includes(selectedApp.toLowerCase())) {
          return false;
        }
      }

      // Activity filter
      if (activityFilter === 'with_orders' && row.total_orders <= 0) return false;
      if (activityFilter === 'has_pending' && row.pending_orders <= 0 && row.pending_shifts_count <= 0)
        return false;
      if (activityFilter === 'target_achieved' && row.total_orders < MONTHLY_TARGET_ORDERS)
        return false;
      if (activityFilter === 'zero_orders' && row.total_orders > 0) return false;

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'total_orders_desc':
          if (b.total_orders !== a.total_orders) return b.total_orders - a.total_orders;
          return b.approved_orders - a.approved_orders;
        case 'approved_orders_desc':
          if (b.approved_orders !== a.approved_orders) return b.approved_orders - a.approved_orders;
          return b.total_orders - a.total_orders;
        case 'pending_orders_desc':
          if (b.pending_orders !== a.pending_orders) return b.pending_orders - a.pending_orders;
          return b.pending_shifts_count - a.pending_shifts_count;
        case 'distance_desc':
          return b.total_distance_km - a.total_distance_km;
        case 'shifts_desc':
          return b.total_shifts_count - a.total_shifts_count;
        case 'name_asc':
          return a.employee_name.localeCompare(b.employee_name, 'ar');
        default:
          return b.total_orders - a.total_orders;
      }
    });

    return filtered;
  }, [aggregatedRows, searchQuery, selectedBranch, selectedApp, activityFilter, sortBy]);

  // Summary KPIs across filtered rows
  const summaryStats = useMemo(() => {
    let totalApprovedOrders = 0;
    let totalPendingOrders = 0;
    let overallOrders = 0;
    let totalShifts = 0;
    let pendingShifts = 0;
    let totalDistance = 0;
    let totalFuel = 0;
    let activeEmployeesWithOrders = 0;
    let targetAchievedCount = 0;

    for (const r of filteredRows) {
      totalApprovedOrders += r.approved_orders;
      totalPendingOrders += r.pending_orders;
      overallOrders += r.total_orders;
      totalShifts += r.total_shifts_count;
      pendingShifts += r.pending_shifts_count;
      totalDistance += r.total_distance_km;
      totalFuel += r.total_fuel_cost;
      if (r.total_orders > 0) activeEmployeesWithOrders += 1;
      if (r.total_orders >= MONTHLY_TARGET_ORDERS) targetAchievedCount += 1;
    }

    const avgPerActiveEmp =
      activeEmployeesWithOrders > 0 ? Math.round(overallOrders / activeEmployeesWithOrders) : 0;

    return {
      totalApprovedOrders,
      totalPendingOrders,
      overallOrders,
      totalShifts,
      pendingShifts,
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalFuel: Math.round(totalFuel * 100) / 100,
      activeEmployeesWithOrders,
      targetAchievedCount,
      avgPerActiveEmp
    };
  }, [filteredRows]);

  // Selected Employee for the Side Sheet
  const selectedEmployee = useMemo(
    () => aggregatedRows.find((r) => r.employee_id === selectedEmployeeId) ?? null,
    [aggregatedRows, selectedEmployeeId]
  );

  // Bulk approve all pending shifts for the selected employee
  const handleApproveAllForEmployee = async (emp: EmployeeOrdersSummaryRow) => {
    const pendingList = emp.sessions.filter((s) => !s.is_reviewed && s.status !== 'ACTIVE');
    if (!pendingList.length) return;

    setApprovingAllForEmp(true);
    try {
      await Promise.all(
        pendingList.map((s) =>
          workApi.reviewWorkSession(s.id, { is_reviewed: true, review_notes: '' })
        )
      );
      await queryClient.invalidateQueries({ queryKey: ['employee-orders-reports'] });
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`تم اعتماد ${pendingList.length} شفت للمندوب ${emp.employee_name} بنجاح!`);
    } catch {
      toast.error('حدث خطأ أثناء اعتماد بعض الشفتات');
    } finally {
      setApprovingAllForEmp(false);
    }
  };

  // Export filtered table to Excel-compatible CSV (with UTF-8 BOM)
  const handleExportCSV = () => {
    if (!filteredRows.length) {
      toast.error('لا توجد بيانات لتصديرها');
      return;
    }

    const headers = [
      'الترتيب',
      'اسم الموظف',
      'رقم الهوية',
      'الرقم الوظيفي',
      'الفرع',
      'التطبيق',
      'معرف التطبيق',
      'رقم الدراجة',
      'أيام العمل الفعلية',
      'عدد الشفتات',
      'الطلبات المعتمدة',
      'الطلبات قيد المراجعة',
      'إجمالي الطلبات',
      'متوسط الطلبات يومياً',
      'نسبة التارجت (460)%',
      'الراتب المتوقع (ر.س)',
      'إجمالي المسافة (كم)',
      'إجمالي الوقود (ر.س)'
    ];

    const escapeCsv = (val: string | number) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines = [
      headers.map(escapeCsv).join(','),
      ...filteredRows.map((r, idx) =>
        [
          idx + 1,
          r.employee_name,
          r.national_id,
          r.employee_number || '-',
          r.branch_name,
          getAppLabel(r.application_type, r.application_id),
          r.application_id || '-',
          r.motorcycle_number || '-',
          r.working_days_count,
          r.total_shifts_count,
          r.approved_orders,
          r.pending_orders,
          r.total_orders,
          r.avg_orders_per_day,
          `${r.target_percent}%`,
          r.expected_salary,
          r.total_distance_km,
          r.total_fuel_cost
        ]
          .map(escapeCsv)
          .join(',')
      )
    ];

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvLines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `إجمالي_طلبات_الموظفين_${dateRange.label.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير جدول إجمالي طلبات الموظفين بنجاح!');
  };

  const handleRefresh = () => {
    refetchEmployees();
    refetchReports();
    toast.success('جاري تحديث البيانات...');
  };

  const isLoading = isLoadingEmployees || isLoadingReports;

  return (
    <PageContainer
      pageTitle='إجمالي طلبات الموظفين'
      pageDescription='متابعة تفصيلية لإجمالي الطلبات المعتمدة، الطلبات بانتظار المصادقة، أيام العمل، ونسبة تحقيق التارجت لكل موظف'
      pageHeaderAction={
        <div className='no-print flex flex-wrap items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleRefresh}
            disabled={isFetchingReports}
            className='gap-1.5 font-semibold'
          >
            <RefreshCw className={cn('size-4', isFetchingReports && 'animate-spin')} />
            تحديث
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => window.print()}
            className='gap-1.5 font-semibold'
          >
            <Printer className='size-4' />
            طباعة
          </Button>
          <Button
            size='sm'
            onClick={handleExportCSV}
            disabled={!filteredRows.length}
            className='gap-1.5 bg-emerald-600 font-bold text-white hover:bg-emerald-700'
          >
            <Download className='size-4' />
            تصدير Excel
          </Button>
        </div>
      }
    >
      <div className='flex flex-col gap-5' dir={dir}>
        {/* Period Filter Bar */}
        <Card className='no-print border-border/70 shadow-xs'>
          <CardContent className='p-4'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
              {/* Period Preset Buttons */}
              <div className='flex flex-wrap items-center gap-1.5'>
                <span className='text-muted-foreground me-1 flex items-center gap-1.5 text-xs font-bold'>
                  <Calendar className='size-4 text-primary' />
                  الفترة الزمنية:
                </span>
                {(
                  [
                    { id: 'month', label: 'حسب الشهر' },
                    { id: 'today', label: 'اليوم' },
                    { id: 'week', label: 'هذا الأسبوع' },
                    { id: 'custom', label: 'فترة مخصصة' },
                    { id: 'all', label: 'كل الأوقات' }
                  ] as const
                ).map((item) => (
                  <Button
                    key={item.id}
                    type='button'
                    size='sm'
                    variant={periodPreset === item.id ? 'default' : 'outline'}
                    onClick={() => setPeriodPreset(item.id)}
                    className='h-8 text-xs font-bold'
                  >
                    {item.label}
                  </Button>
                ))}
              </div>

              {/* Dynamic Date Picker based on periodPreset */}
              <div className='flex flex-wrap items-center gap-2'>
                {periodPreset === 'month' && (
                  <div className='bg-muted/50 flex items-center gap-1 rounded-xl border px-1.5 py-1'>
                    <Button
                      variant='ghost'
                      size='icon-xs'
                      onClick={handlePrevMonth}
                      title='الشهر السابق'
                    >
                      <Icons.chevronRight className='size-4' />
                    </Button>
                    <input
                      type='month'
                      value={selectedMonth}
                      onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                      className='bg-transparent px-2 py-0.5 text-center font-mono text-sm font-bold focus:outline-none'
                    />
                    <Button
                      variant='ghost'
                      size='icon-xs'
                      onClick={handleNextMonth}
                      title='الشهر التالي'
                    >
                      <Icons.chevronLeft className='size-4' />
                    </Button>
                  </div>
                )}

                {periodPreset === 'custom' && (
                  <div className='flex flex-wrap items-center gap-2'>
                    <div className='flex items-center gap-1.5'>
                      <span className='text-muted-foreground text-xs font-semibold'>من:</span>
                      <Input
                        type='date'
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className='h-8 w-[145px] font-mono text-xs'
                      />
                    </div>
                    <div className='flex items-center gap-1.5'>
                      <span className='text-muted-foreground text-xs font-semibold'>إلى:</span>
                      <Input
                        type='date'
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className='h-8 w-[145px] font-mono text-xs'
                      />
                    </div>
                  </div>
                )}

                <Badge variant='secondary' className='px-2.5 py-1 text-xs font-bold'>
                  {dateRange.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top 5 KPI Summary Cards */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5'>
          {/* 1. Overall Total Orders */}
          <Card className='border-primary/20 from-primary/5 to-card bg-gradient-to-br shadow-xs'>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground text-xs font-bold'>إجمالي كافة الطلبات</span>
                <div className='bg-primary/15 text-primary flex size-9 items-center justify-center rounded-xl'>
                  <Package className='size-5' />
                </div>
              </div>
              <div className='mt-2 flex items-baseline gap-1.5'>
                <span className='text-3xl font-black tabular-nums'>
                  {isLoading ? '—' : summaryStats.overallOrders.toLocaleString('ar-SA')}
                </span>
                <span className='text-muted-foreground text-xs font-semibold'>طلب</span>
              </div>
              <p className='text-muted-foreground mt-1.5 text-[11px] font-medium'>
                شامل الطلبات المعتمدة وقيد المراجعة
              </p>
            </CardContent>
          </Card>

          {/* 2. Approved Orders */}
          <Card className='border-emerald-500/25 from-emerald-500/5 to-card bg-gradient-to-br shadow-xs'>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-bold text-emerald-700 dark:text-emerald-400'>
                  الطلبات المعتمدة
                </span>
                <div className='flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'>
                  <CheckCircle2 className='size-5' />
                </div>
              </div>
              <div className='mt-2 flex items-baseline gap-1.5'>
                <span className='text-3xl font-black text-emerald-600 tabular-nums dark:text-emerald-400'>
                  {isLoading ? '—' : summaryStats.totalApprovedOrders.toLocaleString('ar-SA')}
                </span>
                <span className='text-muted-foreground text-xs font-semibold'>طلب معتمد</span>
              </div>
              <p className='text-muted-foreground mt-1.5 text-[11px] font-medium'>
                تمت المصادقة عليها من المشرفين
              </p>
            </CardContent>
          </Card>

          {/* 3. Pending Orders */}
          <Card className='border-amber-500/25 from-amber-500/5 to-card bg-gradient-to-br shadow-xs'>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-bold text-amber-700 dark:text-amber-400'>
                  طلبات قيد المراجعة
                </span>
                <div className='flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400'>
                  <Clock className='size-5' />
                </div>
              </div>
              <div className='mt-2 flex items-baseline gap-1.5'>
                <span className='text-3xl font-black text-amber-600 tabular-nums dark:text-amber-400'>
                  {isLoading ? '—' : summaryStats.totalPendingOrders.toLocaleString('ar-SA')}
                </span>
                <span className='text-muted-foreground text-xs font-semibold'>
                  ({summaryStats.pendingShifts} شفت)
                </span>
              </div>
              <p className='text-muted-foreground mt-1.5 text-[11px] font-medium'>
                بانتظار مراجعة ومصادقة المشرف
              </p>
            </CardContent>
          </Card>

          {/* 4. Active Employees with Orders */}
          <Card className='shadow-xs'>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground text-xs font-bold'>الموظفون النشطون</span>
                <div className='bg-blue-500/15 flex size-9 items-center justify-center rounded-xl text-blue-600 dark:text-blue-400'>
                  <Users className='size-5' />
                </div>
              </div>
              <div className='mt-2 flex items-baseline gap-1.5'>
                <span className='text-3xl font-black tabular-nums'>
                  {isLoading ? '—' : summaryStats.activeEmployeesWithOrders}
                </span>
                <span className='text-muted-foreground text-xs font-semibold'>
                  من {filteredRows.length} موظف
                </span>
              </div>
              <p className='text-muted-foreground mt-1.5 text-[11px] font-medium'>
                متوسط {summaryStats.avgPerActiveEmp} طلب لكل موظف نشط
              </p>
            </CardContent>
          </Card>

          {/* 5. Total Shifts & Distance */}
          <Card className='shadow-xs'>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground text-xs font-bold'>الشفتات والمسافة</span>
                <div className='bg-purple-500/15 flex size-9 items-center justify-center rounded-xl text-purple-600 dark:text-purple-400'>
                  <Route className='size-5' />
                </div>
              </div>
              <div className='mt-2 flex items-baseline gap-1.5'>
                <span className='text-3xl font-black tabular-nums'>
                  {isLoading ? '—' : summaryStats.totalShifts.toLocaleString('ar-SA')}
                </span>
                <span className='text-muted-foreground text-xs font-semibold'>شفت عمل</span>
              </div>
              <p className='text-muted-foreground mt-1.5 text-[11px] font-medium tabular-nums'>
                {summaryStats.totalDistance.toLocaleString('ar-SA')} كم ·{' '}
                {summaryStats.totalFuel.toLocaleString('ar-SA')} ر.س وقود
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search, Branch, App & Status Filters */}
        <Card className='no-print border-border/70 shadow-xs'>
          <CardContent className='space-y-3 p-4'>
            <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5'>
              {/* Search */}
              <div className='relative lg:col-span-2'>
                <Search className='text-muted-foreground pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2' />
                <Input
                  placeholder='ابحث بالاسم، رقم الهوية، الرقم الوظيفي، رقم الدراجة، أو معرف التطبيق...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='ps-9 text-sm'
                />
              </div>

              {/* Branch Filter */}
              <Select value={selectedBranch} onValueChange={(v) => setSelectedBranch(v || 'ALL')}>
                <SelectTrigger className='w-full text-xs font-semibold'>
                  <SelectValue placeholder='جميع الفروع' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>جميع الفروع</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* App Filter */}
              <Select value={selectedApp} onValueChange={(v) => setSelectedApp(v || 'ALL')}>
                <SelectTrigger className='w-full text-xs font-semibold'>
                  <SelectValue placeholder='جميع التطبيقات' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>جميع التطبيقات</SelectItem>
                  <SelectItem value='keeta'>كيتا (Keeta)</SelectItem>
                  <SelectItem value='ninja'>نينجا (Ninja)</SelectItem>
                  <SelectItem value='hunger'>هنقرستيشن (HungerStation)</SelectItem>
                  <SelectItem value='jahez'>جاهز (Jahez)</SelectItem>
                  <SelectItem value='toyo'>تويو (ToYou)</SelectItem>
                  <SelectItem value='mrsool'>مرسول (Mrsool)</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy((v as SortByOption) || 'total_orders_desc')}
              >
                <SelectTrigger className='w-full text-xs font-semibold'>
                  <SelectValue placeholder='الترتيب حسب' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='total_orders_desc'>الأعلى في إجمالي الطلبات</SelectItem>
                  <SelectItem value='approved_orders_desc'>الأعلى في الطلبات المعتمدة</SelectItem>
                  <SelectItem value='pending_orders_desc'>الأعلى في الطلبات المعلقة</SelectItem>
                  <SelectItem value='shifts_desc'>الأعلى في عدد الشفتات</SelectItem>
                  <SelectItem value='distance_desc'>الأعلى في المسافة المقطوعة</SelectItem>
                  <SelectItem value='name_asc'>الاسم أبجدياً (أ - ي)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Status Filter Pills */}
            <div className='flex flex-wrap items-center justify-between gap-2 border-t pt-3'>
              <div className='flex flex-wrap items-center gap-1.5'>
                <span className='text-muted-foreground me-1 flex items-center gap-1 text-xs font-semibold'>
                  <SlidersHorizontal className='size-3.5' />
                  تصفية سريعة:
                </span>
                {(
                  [
                    { id: 'all', label: `جميع الموظفين (${aggregatedRows.length})` },
                    {
                      id: 'with_orders',
                      label: `لديهم طلبات (${aggregatedRows.filter((r) => r.total_orders > 0).length})`
                    },
                    {
                      id: 'has_pending',
                      label: `بانتظار المصادقة (${aggregatedRows.filter((r) => r.pending_orders > 0 || r.pending_shifts_count > 0).length})`
                    },
                    {
                      id: 'target_achieved',
                      label: `حققوا التارجت 460+ (${aggregatedRows.filter((r) => r.total_orders >= MONTHLY_TARGET_ORDERS).length})`
                    },
                    {
                      id: 'zero_orders',
                      label: `بدون طلبات (${aggregatedRows.filter((r) => r.total_orders === 0).length})`
                    }
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type='button'
                    onClick={() => setActivityFilter(tab.id)}
                    className={cn(
                      'cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-bold transition-all',
                      activityFilter === tab.id
                        ? 'border-primary bg-primary text-primary-foreground shadow-2xs'
                        : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {(searchQuery ||
                selectedBranch !== 'ALL' ||
                selectedApp !== 'ALL' ||
                activityFilter !== 'all') && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedBranch('ALL');
                    setSelectedApp('ALL');
                    setActivityFilter('all');
                  }}
                  className='h-7 text-xs font-bold text-rose-600 hover:text-rose-700'
                >
                  إعادة ضبط الفلاتر
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content: Table & Mobile Cards */}
        {isLoading ? (
          <TableSkeleton rows={10} />
        ) : !filteredRows.length ? (
          <Card className='py-14 text-center'>
            <CardContent>
              <div className='bg-muted text-muted-foreground mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl'>
                <Package className='size-8' />
              </div>
              <h3 className='text-lg font-bold'>لا توجد نتائج مطابقة</h3>
              <p className='text-muted-foreground mx-auto mt-1.5 max-w-md text-sm'>
                لم يتم العثور على موظفين أو طلبات تطابق معايير البحث والفلترة الحالية. جرّب تغيير
                الفترة الزمنية أو إزالة الفلاتر.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className='space-y-3 md:hidden'>
              {filteredRows.map((row, idx) => {
                const rank = idx + 1;
                return (
                  <Card
                    key={row.employee_id}
                    className={cn(
                      'overflow-hidden transition-all',
                      row.pending_orders > 0 && 'border-amber-300 dark:border-amber-800'
                    )}
                  >
                    <CardContent className='space-y-3 p-4'>
                      <div className='flex items-start justify-between gap-2'>
                        <div className='flex items-center gap-2.5 min-w-0'>
                          <div className='bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-black'>
                            {rank === 1 && row.total_orders > 0 ? (
                              <Crown className='size-4 text-amber-500' />
                            ) : (
                              rank
                            )}
                          </div>
                          <Avatar className='size-10 border shrink-0'>
                            <AvatarImage src={row.personal_image} alt={row.employee_name} />
                            <AvatarFallback className='font-bold'>
                              {row.employee_name.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div className='min-w-0'>
                            <Link
                              href={`/dashboard/employees/${row.employee_id}`}
                              className='hover:text-primary block truncate text-sm font-bold'
                            >
                              {row.employee_name}
                            </Link>
                            <p className='text-muted-foreground font-mono text-xs'>
                              {row.national_id}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant='outline'
                          className={cn(
                            'shrink-0 text-[10px] font-bold',
                            getAppBadgeClass(row.application_type, row.application_id)
                          )}
                        >
                          {getAppLabel(row.application_type, row.application_id)}
                        </Badge>
                      </div>

                      <div className='grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2.5 text-center'>
                        <div>
                          <p className='text-muted-foreground text-[10px] font-semibold'>
                            المعتمدة ✅
                          </p>
                          <p className='text-base font-black text-emerald-600 tabular-nums dark:text-emerald-400'>
                            {row.approved_orders}
                          </p>
                        </div>
                        <div>
                          <p className='text-muted-foreground text-[10px] font-semibold'>
                            قيد المراجعة ⏳
                          </p>
                          <p className='text-base font-black text-amber-600 tabular-nums dark:text-amber-400'>
                            {row.pending_orders}
                          </p>
                        </div>
                        <div>
                          <p className='text-muted-foreground text-[10px] font-semibold'>
                            الإجمالي 📦
                          </p>
                          <p className='text-primary text-base font-black tabular-nums'>
                            {row.total_orders}
                          </p>
                        </div>
                      </div>

                      <div className='flex items-center justify-between text-xs'>
                        <span className='text-muted-foreground'>
                          أيام العمل: <strong className='text-foreground'>{row.working_days_count}</strong> · الشفتات:{' '}
                          <strong className='text-foreground'>{row.total_shifts_count}</strong>
                        </span>
                        <span className='font-mono font-bold tabular-nums'>
                          {row.total_distance_km} كم
                        </span>
                      </div>

                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setSelectedEmployeeId(row.employee_id)}
                        className='w-full gap-1.5 text-xs font-bold'
                      >
                        <Eye className='size-3.5' />
                        عرض كشف شفتات الموظف ({row.total_shifts_count})
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Desktop Table */}
            <Card className='hidden overflow-hidden md:block'>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-muted/40'>
                      <TableHead className='w-[55px] text-center font-bold'>#</TableHead>
                      <TableHead className='min-w-[210px] text-start font-bold'>الموظف</TableHead>
                      <TableHead className='min-w-[100px] text-center font-bold'>الفرع</TableHead>
                      <TableHead className='min-w-[120px] text-center font-bold'>التطبيق</TableHead>
                      <TableHead className='min-w-[95px] text-center font-bold'>
                        أيام العمل / الشفتات
                      </TableHead>
                      <TableHead className='min-w-[105px] text-center font-bold text-emerald-700 dark:text-emerald-400'>
                        الطلبات المعتمدة
                      </TableHead>
                      <TableHead className='min-w-[105px] text-center font-bold text-amber-700 dark:text-amber-400'>
                        قيد المراجعة
                      </TableHead>
                      <TableHead className='min-w-[115px] text-center font-bold'>
                        إجمالي الطلبات
                      </TableHead>
                      <TableHead className='min-w-[90px] text-center font-bold'>
                        المتوسط/يوم
                      </TableHead>
                      <TableHead className='min-w-[150px] text-center font-bold'>
                        التارجت (460) والراتب
                      </TableHead>
                      <TableHead className='min-w-[100px] text-center font-bold'>
                        المسافة / الوقود
                      </TableHead>
                      <TableHead className='no-print w-[115px] text-center font-bold'>
                        التفاصيل
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row, index) => {
                      const rank = index + 1;
                      const isTopThree = rank <= 3 && row.total_orders > 0;

                      return (
                        <TableRow
                          key={row.employee_id}
                          className={cn(
                            'hover:bg-muted/30 cursor-pointer transition-colors',
                            row.pending_orders > 0 && 'bg-amber-50/30 dark:bg-amber-950/10'
                          )}
                          onClick={() => setSelectedEmployeeId(row.employee_id)}
                        >
                          {/* Rank */}
                          <TableCell className='text-center font-mono text-xs font-bold'>
                            {rank === 1 && row.total_orders > 0 ? (
                              <span className='mx-auto flex size-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400'>
                                <Crown className='size-3.5' />
                              </span>
                            ) : isTopThree ? (
                              <span className='bg-primary/10 text-primary mx-auto flex size-6 items-center justify-center rounded-lg font-black'>
                                {rank}
                              </span>
                            ) : (
                              <span className='text-muted-foreground'>{rank}</span>
                            )}
                          </TableCell>

                          {/* Employee Info */}
                          <TableCell className='py-2.5'>
                            <div className='flex items-center gap-2.5'>
                              <Avatar className='size-9 border shrink-0'>
                                <AvatarImage
                                  src={row.personal_image}
                                  alt={row.employee_name}
                                  className='object-cover'
                                />
                                <AvatarFallback className='bg-muted text-xs font-bold'>
                                  {row.employee_name.slice(0, 1)}
                                </AvatarFallback>
                              </Avatar>
                              <div className='min-w-0'>
                                <div className='flex items-center gap-1.5'>
                                  <Link
                                    href={`/dashboard/employees/${row.employee_id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className='hover:text-primary truncate text-sm font-bold transition-colors'
                                  >
                                    {row.employee_name}
                                  </Link>
                                  {row.active_shifts_count > 0 && (
                                    <span
                                      className='size-2 rounded-full bg-emerald-500 animate-pulse'
                                      title='يعمل الآن في الميدان'
                                    />
                                  )}
                                </div>
                                <div className='text-muted-foreground flex items-center gap-2 font-mono text-[11px]'>
                                  <span>{row.national_id}</span>
                                  {row.motorcycle_number && (
                                    <span className='flex items-center gap-0.5 text-[10px]'>
                                      · <Bike className='size-3' /> {row.motorcycle_number}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Branch */}
                          <TableCell className='text-center'>
                            <Badge variant='outline' className='text-[11px] font-semibold'>
                              {row.branch_name}
                            </Badge>
                          </TableCell>

                          {/* Application */}
                          <TableCell className='text-center'>
                            <div className='flex flex-col items-center gap-0.5'>
                              <Badge
                                variant='outline'
                                className={cn(
                                  'text-[10px] font-bold',
                                  getAppBadgeClass(row.application_type, row.application_id)
                                )}
                              >
                                {getAppLabel(row.application_type, row.application_id)}
                              </Badge>
                              {row.application_id && (
                                <span className='text-muted-foreground font-mono text-[10px]'>
                                  {row.application_id}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Working Days & Shifts */}
                          <TableCell className='text-center'>
                            <div className='flex flex-col items-center'>
                              <span className='text-xs font-bold tabular-nums'>
                                {row.working_days_count} يوم
                              </span>
                              <span className='text-muted-foreground text-[11px] tabular-nums'>
                                {row.total_shifts_count} شفت
                              </span>
                            </div>
                          </TableCell>

                          {/* Approved Orders */}
                          <TableCell className='text-center'>
                            <span className='inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 font-mono text-sm font-black text-emerald-700 tabular-nums dark:text-emerald-400'>
                              {row.approved_orders.toLocaleString('ar-SA')}
                            </span>
                          </TableCell>

                          {/* Pending Orders */}
                          <TableCell className='text-center'>
                            {row.pending_orders > 0 || row.pending_shifts_count > 0 ? (
                              <div className='flex flex-col items-center'>
                                <span className='inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 py-0.5 font-mono text-sm font-black text-amber-700 tabular-nums dark:text-amber-400'>
                                  {row.pending_orders.toLocaleString('ar-SA')}
                                </span>
                                <span className='text-[10px] font-semibold text-amber-600 dark:text-amber-400'>
                                  {row.pending_shifts_count} شفت معلق
                                </span>
                              </div>
                            ) : (
                              <span className='text-muted-foreground font-mono text-xs'>0</span>
                            )}
                          </TableCell>

                          {/* Overall Total Orders */}
                          <TableCell className='text-center'>
                            <span
                              className={cn(
                                'inline-flex min-w-[54px] items-center justify-center rounded-xl px-3 py-1 font-mono text-base font-black tabular-nums',
                                row.total_orders > 0
                                  ? 'bg-primary/15 text-primary'
                                  : 'bg-muted text-muted-foreground text-xs'
                              )}
                            >
                              {row.total_orders.toLocaleString('ar-SA')}
                            </span>
                          </TableCell>

                          {/* Average Orders / Day */}
                          <TableCell className='text-center font-mono text-xs font-bold tabular-nums'>
                            {row.avg_orders_per_day > 0 ? `${row.avg_orders_per_day}` : '—'}
                          </TableCell>

                          {/* Monthly Target Progress & Expected Salary */}
                          <TableCell className='py-2.5'>
                            <div className='mx-auto flex max-w-[140px] flex-col gap-1'>
                              <div className='flex items-center justify-between text-[11px] font-bold'>
                                <span
                                  className={cn(
                                    row.target_percent >= 100
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-muted-foreground'
                                  )}
                                >
                                  {row.target_percent}%
                                </span>
                                <span className='font-mono text-[11px] text-emerald-700 dark:text-emerald-400'>
                                  {row.expected_salary.toLocaleString('ar-SA')} ر.س
                                </span>
                              </div>
                              <div className='bg-muted h-1.5 w-full overflow-hidden rounded-full'>
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all',
                                    row.target_percent >= 100
                                      ? 'bg-emerald-500'
                                      : row.target_percent >= 60
                                        ? 'bg-primary'
                                        : 'bg-amber-500'
                                  )}
                                  style={{ width: `${row.target_percent}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>

                          {/* Distance & Fuel */}
                          <TableCell className='text-center'>
                            <div className='flex flex-col items-center font-mono text-xs tabular-nums'>
                              <span className='font-bold'>{row.total_distance_km} كم</span>
                              <span className='text-muted-foreground text-[11px]'>
                                {row.total_fuel_cost} ر.س
                              </span>
                            </div>
                          </TableCell>

                          {/* Action: Open Employee Shifts Side Sheet */}
                          <TableCell
                            className='no-print text-center'
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => setSelectedEmployeeId(row.employee_id)}
                              className='h-8 gap-1 text-xs font-bold'
                            >
                              <Eye className='size-3.5' />
                              الشفتات ({row.total_shifts_count})
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter className='bg-muted/60 font-bold'>
                    <TableRow>
                      <TableCell colSpan={4} className='text-start text-sm font-black'>
                        الإجمالي الكلي ({filteredRows.length} موظف)
                      </TableCell>
                      <TableCell className='text-center font-mono text-xs font-black tabular-nums'>
                        {summaryStats.totalShifts.toLocaleString('ar-SA')} شفت
                      </TableCell>
                      <TableCell className='text-center font-mono text-sm font-black text-emerald-600 tabular-nums dark:text-emerald-400'>
                        {summaryStats.totalApprovedOrders.toLocaleString('ar-SA')}
                      </TableCell>
                      <TableCell className='text-center font-mono text-sm font-black text-amber-600 tabular-nums dark:text-amber-400'>
                        {summaryStats.totalPendingOrders.toLocaleString('ar-SA')}
                      </TableCell>
                      <TableCell className='text-primary text-center font-mono text-base font-black tabular-nums'>
                        {summaryStats.overallOrders.toLocaleString('ar-SA')}
                      </TableCell>
                      <TableCell className='text-center font-mono text-xs'>—</TableCell>
                      <TableCell className='text-center font-mono text-xs'>
                        حقق التارجت: {summaryStats.targetAchievedCount}
                      </TableCell>
                      <TableCell className='text-center font-mono text-xs font-bold tabular-nums'>
                        {summaryStats.totalDistance.toLocaleString('ar-SA')} كم
                      </TableCell>
                      <TableCell className='no-print' />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Employee Detailed Shifts Side Sheet (مديول من الجنب) */}
      <Sheet
        open={!!selectedEmployee}
        onOpenChange={(open) => !open && setSelectedEmployeeId(null)}
      >
        <SheetContent
          side={dir === 'rtl' ? 'left' : 'right'}
          className='flex w-full flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl'
        >
          {selectedEmployee && (
            <>
              <SheetHeader className='bg-muted/30 border-b p-5 text-start'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex items-center gap-3'>
                    <Avatar className='size-12 border'>
                      <AvatarImage
                        src={selectedEmployee.personal_image}
                        alt={selectedEmployee.employee_name}
                      />
                      <AvatarFallback className='text-base font-bold'>
                        {selectedEmployee.employee_name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <SheetTitle className='flex items-center gap-2 text-lg font-black'>
                        <span>{selectedEmployee.employee_name}</span>
                        <Badge variant='outline' className='text-xs'>
                          {selectedEmployee.branch_name}
                        </Badge>
                      </SheetTitle>
                      <SheetDescription className='mt-0.5 font-mono text-xs'>
                        الهوية: {selectedEmployee.national_id} · التطبيق:{' '}
                        {getAppLabel(
                          selectedEmployee.application_type,
                          selectedEmployee.application_id
                        )}{' '}
                        · {dateRange.label}
                      </SheetDescription>
                    </div>
                  </div>
                </div>

                {/* Employee Period Summary Mini Cards */}
                <div className='mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4'>
                  <div className='bg-background rounded-xl border p-2.5 text-center'>
                    <p className='text-muted-foreground text-[11px] font-semibold'>إجمالي الطلبات</p>
                    <p className='text-primary mt-0.5 font-mono text-xl font-black tabular-nums'>
                      {selectedEmployee.total_orders}
                    </p>
                  </div>
                  <div className='rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-center'>
                    <p className='text-[11px] font-semibold text-emerald-700 dark:text-emerald-400'>
                      المعتمدة ✅
                    </p>
                    <p className='mt-0.5 font-mono text-xl font-black text-emerald-600 tabular-nums dark:text-emerald-400'>
                      {selectedEmployee.approved_orders}
                    </p>
                  </div>
                  <div className='rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 text-center'>
                    <p className='text-[11px] font-semibold text-amber-700 dark:text-amber-400'>
                      بانتظار المصادقة ⏳
                    </p>
                    <p className='mt-0.5 font-mono text-xl font-black text-amber-600 tabular-nums dark:text-amber-400'>
                      {selectedEmployee.pending_orders}
                    </p>
                  </div>
                  <div className='bg-background rounded-xl border p-2.5 text-center'>
                    <p className='text-muted-foreground text-[11px] font-semibold'>
                      أيام العمل / الشفتات
                    </p>
                    <p className='mt-0.5 font-mono text-base font-black tabular-nums'>
                      {selectedEmployee.working_days_count} يوم /{' '}
                      {selectedEmployee.total_shifts_count} شفت
                    </p>
                  </div>
                </div>

                {/* Bulk Approve Button if employee has pending shifts */}
                {selectedEmployee.pending_shifts_count > 0 && (
                  <div className='mt-3 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5'>
                    <div className='text-xs font-bold text-amber-800 dark:text-amber-300'>
                      يوجد {selectedEmployee.pending_shifts_count} شفت مكتمل بانتظار مصادقة المشرف (
                      {selectedEmployee.pending_orders} طلب)
                    </div>
                    <Button
                      size='sm'
                      onClick={() => handleApproveAllForEmployee(selectedEmployee)}
                      disabled={approvingAllForEmp}
                      className='h-8 gap-1.5 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700'
                    >
                      {approvingAllForEmp ? (
                        <Icons.spinner className='size-3.5 animate-spin' />
                      ) : (
                        <CheckCircle2 className='size-3.5' />
                      )}
                      اعتماد الكل ({selectedEmployee.pending_shifts_count})
                    </Button>
                  </div>
                )}
              </SheetHeader>

              {/* Scrollable Shifts List */}
              <div className='flex-1 space-y-3 overflow-y-auto p-5'>
                {!selectedEmployee.sessions.length ? (
                  <div className='text-muted-foreground py-12 text-center text-sm'>
                    لا توجد شفتات مسجلة لهذا الموظف في الفترة المحددة.
                  </div>
                ) : (
                  selectedEmployee.sessions.map((session) => (
                    <div
                      key={session.id}
                      className={cn(
                        'rounded-xl border p-3.5 transition-colors',
                        !session.is_reviewed && session.status !== 'ACTIVE'
                          ? 'border-amber-400/50 bg-amber-50/40 dark:bg-amber-950/15'
                          : 'bg-card'
                      )}
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div>
                          <p className='font-mono text-xs font-bold tabular-nums'>
                            {formatRiyadh(new Date(session.start_time), 'EEEE yyyy-MM-dd', {
                              locale: ar
                            })}
                          </p>
                          <p className='text-muted-foreground mt-0.5 font-mono text-[11px] tabular-nums'>
                            من {formatRiyadh(new Date(session.start_time), 'hh:mm a', { locale: ar })}{' '}
                            {session.end_time
                              ? `إلى ${formatRiyadh(new Date(session.end_time), 'hh:mm a', { locale: ar })}`
                              : '— قائم الآن'}
                          </p>
                        </div>

                        <div className='flex items-center gap-1.5'>
                          {session.status === 'ACTIVE' ? (
                            <Badge className='bg-blue-500/15 text-blue-600 dark:text-blue-400'>
                              شفت قائم الآن
                            </Badge>
                          ) : session.is_reviewed ? (
                            <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'>
                              ✓ معتمد
                            </Badge>
                          ) : (
                            <>
                              <Badge
                                variant='outline'
                                className='border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                              >
                                بانتظار المصادقة
                              </Badge>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => reviewMutation.mutate(session.id)}
                                disabled={reviewMutation.isPending}
                                className='h-7 gap-1 border-emerald-500 px-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400'
                              >
                                <CheckCircle2 className='size-3' />
                                اعتماد
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className='mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2 text-center text-xs'>
                        <div>
                          <span className='text-muted-foreground block text-[10px]'>الطلبات</span>
                          <span className='font-mono text-sm font-black tabular-nums'>
                            {session.orders_count} طلب
                          </span>
                        </div>
                        <div>
                          <span className='text-muted-foreground block text-[10px]'>المسافة</span>
                          <span className='font-mono text-sm font-bold tabular-nums'>
                            {session.distance} كم
                          </span>
                        </div>
                        <div>
                          <span className='text-muted-foreground block text-[10px]'>الوقود</span>
                          <span className='font-mono text-sm font-bold tabular-nums'>
                            {session.fuel_cost} ر.س
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <SheetFooter className='bg-muted/20 flex-row items-center justify-between border-t p-4'>
                <Link
                  href={`/dashboard/employees/${selectedEmployee.employee_id}`}
                  className='text-primary flex items-center gap-1 text-xs font-bold hover:underline'
                >
                  <span>فتح ملف الموظف الكامل</span>
                  <ArrowUpRight className='size-3.5' />
                </Link>
                <Button variant='outline' size='sm' onClick={() => setSelectedEmployeeId(null)}>
                  إغلاق
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}

