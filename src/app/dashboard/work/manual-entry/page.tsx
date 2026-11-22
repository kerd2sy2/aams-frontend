'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { employeeApi, reportApi, workApi } from '@/lib/aams/services';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { useLocale } from '@/components/layout/locale-provider';
import { cn } from '@/lib/utils';
import type { Employee, PaginatedResponse, WorkSessionDetail } from '@/types/aams';
import {
  Search,
  Plus,
  Trash2,
  Save,
  Calendar,
  Package,
  Route,
  Fuel,
  CheckCircle2,
  Clock,
  UserCheck,
  Edit3,
  RefreshCw,
  Bike,
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface EntryRow {
  id: string;
  date: string; // YYYY-MM-DD
  orders_count: string;
  distance: string;
  fuel_cost: string;
  notes: string;
}

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysToDateStr(dateStr: string, days: number): string {
  try {
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3) return formatDateInput(new Date());
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + days);
    return formatDateInput(d);
  } catch {
    return formatDateInput(new Date());
  }
}

function formatArabicDayName(dateStr: string): string {
  try {
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3) return dateStr;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('ar-SA', {
      weekday: 'short',
      month: 'numeric',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function extractSessionDateKey(s: WorkSessionDetail): string {
  if (!s.start_time) return '';
  try {
    const d = new Date(s.start_time);
    if (isNaN(d.getTime())) return String(s.start_time).slice(0, 10);
    // Always format in Asia/Riyadh (UTC+3) to match backend day boundaries
    const riyadhMs = d.getTime() + 3 * 60 * 60 * 1000;
    const rd = new Date(riyadhMs);
    const y = rd.getUTCFullYear();
    const m = String(rd.getUTCMonth() + 1).padStart(2, '0');
    const day = String(rd.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return String(s.start_time).slice(0, 10);
  }
}

function summarizeDaySessions(existingList?: WorkSessionDetail[]) {
  if (!existingList || existingList.length === 0) return null;
  const orders = existingList.reduce((sum, s) => sum + Number(s.orders_count ?? 0), 0);
  const distance = existingList.reduce((sum, s) => sum + Number(s.distance ?? 0), 0);
  const fuel = existingList.reduce((sum, s) => sum + Number(s.fuel_cost ?? 0), 0);
  const latest = existingList[existingList.length - 1];
  return {
    orders,
    distance: Math.round(distance * 10) / 10,
    fuel: Math.round(fuel * 100) / 100,
    notes: latest?.notes || ''
  };
}

function parseKeyNumber(keyStr?: string | null): number | null {
  if (!keyStr) return null;
  const match = String(keyStr).match(/\d+/);
  if (match) {
    const n = parseInt(match[0], 10);
    return isNaN(n) ? null : n;
  }
  return null;
}

function compareEmployeesByKey(a: Employee, b: Employee): number {
  const keyA = parseKeyNumber(a.key_number);
  const keyB = parseKeyNumber(b.key_number);

  if (keyA !== null && keyB !== null) {
    if (keyA !== keyB) return keyA - keyB;
    return (a.name || '').localeCompare(b.name || '', 'ar');
  }
  if (keyA !== null && keyB === null) return -1;
  if (keyA === null && keyB !== null) return 1;

  return (a.name || '').localeCompare(b.name || '', 'ar');
}

function generateMonthRows(
  monthStr: string,
  sessionsMap?: Map<string, WorkSessionDetail[]>
): EntryRow[] {
  const [y, m] = monthStr.split('-').map(Number);
  if (!y || !m) return [];

  const now = new Date();
  const currentY = now.getFullYear();
  const currentM = now.getMonth() + 1;
  const currentD = now.getDate();

  let targetEndDay: number;
  if (y === currentY && m === currentM) {
    // الشهر الحالي: العرض حتى اليوم السابق لليوم الحالي (مثلاً اليوم 16 يعرض حتى 15، اليوم 9 يعرض حتى 8)
    targetEndDay = Math.max(1, currentD - 1);
  } else if (y < currentY || (y === currentY && m < currentM)) {
    // شهر سابق: عرض جميع أيام الشهر
    targetEndDay = new Date(y, m, 0).getDate();
  } else {
    // شهر مستقبلي: يوم واحد كبداية
    targetEndDay = 1;
  }

  const generatedRows: EntryRow[] = [];
  for (let d = 1; d <= targetEndDay; d++) {
    const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const summary = summarizeDaySessions(sessionsMap?.get(dateKey));

    generatedRows.push({
      id: `row-${dateKey}-${d}`,
      date: dateKey,
      orders_count: summary ? String(summary.orders) : '',
      distance: summary ? String(summary.distance) : '',
      fuel_cost: summary ? String(summary.fuel) : '',
      notes: summary?.notes || ''
    });
  }

  return generatedRows;
}

export default function ManualOrdersEntryPage() {
  const { dir } = useLocale();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [rows, setRows] = useState<EntryRow[]>(() => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return generateMonthRows(currentMonthStr);
  });

  // 1. Fetch all employees for fast search
  const { data: employeesRes, isLoading: isLoadingEmployees } = useOfflineQuery<
    PaginatedResponse<Employee>
  >({
    queryKey: ['all-employees-manual-entry'],
    queryFn: () => employeeApi.getAll({ limit: 1000 }),
    cacheKey: 'employees_manual_entry',
    staleTime: 60 * 1000
  });

  const allEmployees = useMemo(() => {
    const list = employeesRes?.data || (Array.isArray(employeesRes) ? employeesRes : []);
    return list
      .filter((e: Employee) => {
        const role = String(e.job_role || '').toUpperCase();
        return !role.includes('ADMIN');
      })
      .sort(compareEmployeesByKey);
  }, [employeesRes]);

  const filteredEmployees = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allEmployees;
    return allEmployees.filter(
      (e) =>
        (e.name && e.name.toLowerCase().includes(q)) ||
        (e.national_id && String(e.national_id).includes(q)) ||
        (e.phone && String(e.phone).includes(q)) ||
        (e.motorcycle_number && e.motorcycle_number.toLowerCase().includes(q)) ||
        (e.key_number && String(e.key_number).toLowerCase().includes(q)) ||
        (e.employee_number && String(e.employee_number).toLowerCase().includes(q))
    );
  }, [allEmployees, searchTerm]);

  // 2. Fetch existing recorded sessions for the selected employee
  const monthBounds = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    if (!y || !m) return { start_date: undefined, end_date: undefined };
    const start_date = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end_date = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start_date, end_date };
  }, [selectedMonth]);

  const {
    data: employeeReportsRes,
    isLoading: isLoadingHistory,
    refetch: refetchEmployeeHistory
  } = useQuery({
    queryKey: [
      'employee-recorded-sessions',
      selectedEmployee?.id,
      monthBounds.start_date,
      monthBounds.end_date
    ],
    queryFn: () =>
      reportApi.getReports({
        employee_id: selectedEmployee!.id,
        start_date: monthBounds.start_date,
        end_date: monthBounds.end_date,
        limit: 500
      }),
    enabled: Boolean(selectedEmployee?.id)
  });

  const recordedSessions = useMemo<WorkSessionDetail[]>(() => {
    const raw = employeeReportsRes?.data || [];
    return [...raw].sort((a, b) => {
      const tA = a.start_time ? new Date(a.start_time).getTime() : 0;
      const tB = b.start_time ? new Date(b.start_time).getTime() : 0;
      return tA - tB;
    });
  }, [employeeReportsRes]);

  // Map date (YYYY-MM-DD) -> existing session(s) for instant duplicate / pre-recorded detection
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, WorkSessionDetail[]>();
    recordedSessions.forEach((s) => {
      const key = extractSessionDateKey(s);
      if (!key) return;
      const arr = map.get(key) || [];
      arr.push(s);
      map.set(key, arr);
    });
    return map;
  }, [recordedSessions]);

  // Pre-fill existing values when a row's date matches an already recorded day
  const handleDateChange = (rowId: string, newDate: string) => {
    const summary = summarizeDaySessions(sessionsByDate.get(newDate));

    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        if (summary) {
          return {
            ...r,
            date: newDate,
            orders_count: String(summary.orders),
            distance: String(summary.distance),
            fuel_cost: String(summary.fuel),
            notes: summary.notes || r.notes
          };
        }
        return { ...r, date: newDate };
      })
    );
  };

  // Update row field
  const handleRowChange = (rowId: string, field: keyof EntryRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)));
  };

  // Add Next Day Row (+1 day after the last row's date)
  const handleAddNextDayRow = () => {
    setRows((prev) => {
      const lastRow = prev[prev.length - 1];
      const baseDate = lastRow?.date || `${selectedMonth}-01`;
      const nextDate = addDaysToDateStr(baseDate, 1);

      const summary = summarizeDaySessions(sessionsByDate.get(nextDate));

      return [
        ...prev,
        {
          id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: nextDate,
          orders_count: summary ? String(summary.orders) : '',
          distance: summary ? String(summary.distance) : '',
          fuel_cost: summary ? String(summary.fuel) : '',
          notes: summary?.notes || ''
        }
      ];
    });
  };

  // Quick helper: Generate all remaining days of the month or 7 days starting from row 1
  const handleAddWeekDays = () => {
    setRows((prev) => {
      const lastRow = prev[prev.length - 1];
      let curDate = lastRow?.date || `${selectedMonth}-01`;
      const added: EntryRow[] = [];
      for (let i = 1; i <= 7; i++) {
        curDate = addDaysToDateStr(curDate, 1);
        const summary = summarizeDaySessions(sessionsByDate.get(curDate));
        added.push({
          id: `row-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
          date: curDate,
          orders_count: summary ? String(summary.orders) : '',
          distance: summary ? String(summary.distance) : '',
          fuel_cost: summary ? String(summary.fuel) : '',
          notes: summary?.notes || ''
        });
      }
      return [...prev, ...added];
    });
  };

  const handleRemoveRow = (rowId: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== rowId) : prev));
  };

  // Load an existing session into the entry table for editing
  const handleLoadSessionToEdit = (session: WorkSessionDetail) => {
    const dateKey = extractSessionDateKey(session);
    if (!dateKey) return;

    setRows((prev) => {
      const existingIdx = prev.findIndex((r) => r.date === dateKey);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          orders_count: String(session.orders_count ?? 0),
          distance: String(session.distance ?? 0),
          fuel_cost: String(session.fuel_cost ?? 0),
          notes: session.notes || ''
        };
        return updated;
      }

      // If first row is empty, replace it
      if (
        prev.length === 1 &&
        prev[0].orders_count === '' &&
        prev[0].distance === '' &&
        prev[0].fuel_cost === ''
      ) {
        return [
          {
            id: prev[0].id,
            date: dateKey,
            orders_count: String(session.orders_count ?? 0),
            distance: String(session.distance ?? 0),
            fuel_cost: String(session.fuel_cost ?? 0),
            notes: session.notes || ''
          }
        ];
      }

      return [
        ...prev,
        {
          id: `row-${Date.now()}`,
          date: dateKey,
          orders_count: String(session.orders_count ?? 0),
          distance: String(session.distance ?? 0),
          fuel_cost: String(session.fuel_cost ?? 0),
          notes: session.notes || ''
        }
      ];
    });

    toast.info(`تم تحميل بيانات يوم ${dateKey} للتعديل`);
  };

  // When selecting an employee or when session history finishes loading:
  useEffect(() => {
    if (!selectedEmployee) return;
    setRows((prev) => {
      if (prev.length === 0 || !prev[0]?.date.startsWith(selectedMonth)) {
        return generateMonthRows(selectedMonth, sessionsByDate);
      }
      return prev.map((r) => {
        const existingList = sessionsByDate.get(r.date);
        const existing =
          existingList && existingList.length > 0 ? existingList[existingList.length - 1] : null;
        if (existing && r.orders_count === '' && r.distance === '' && r.fuel_cost === '') {
          return {
            ...r,
            orders_count: String(existing.orders_count ?? 0),
            distance: String(existing.distance ?? 0),
            fuel_cost: String(existing.fuel_cost ?? 0),
            notes: existing.notes || r.notes
          };
        }
        return r;
      });
    });
  }, [selectedEmployee, sessionsByDate, selectedMonth]);

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setRows(generateMonthRows(selectedMonth, sessionsByDate));
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployee) throw new Error('يرجى اختيار المندوب أولاً');

      const validEntries = rows
        .filter(
          (r) =>
            r.date &&
            (r.orders_count.trim() !== '' || r.distance.trim() !== '' || r.fuel_cost.trim() !== '')
        )
        .map((r) => ({
          date: r.date,
          orders_count: Math.max(0, parseInt(r.orders_count || '0', 10) || 0),
          distance: Math.max(0, parseFloat(r.distance || '0') || 0),
          fuel_cost: Math.max(0, parseFloat(r.fuel_cost || '0') || 0),
          application_type: selectedEmployee.application_type || '',
          notes: r.notes.trim() || 'إدخال يدوي من لوحة التحكم'
        }));

      if (validEntries.length === 0) {
        throw new Error('يرجى إدخال عدد الطلبات أو المسافة أو البنزين ليوم واحد على الأقل');
      }

      return workApi.saveManualEntries({
        employee_id: selectedEmployee.id,
        entries: validEntries
      });
    },
    onSuccess: (res) => {
      toast.success(res.message || `تم حفظ بيانات (${res.count}) أيام عمل بنجاح`);
      refetchEmployeeHistory();
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['daily-report'] });
      queryClient.invalidateQueries({ queryKey: ['employee-orders-reports'] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'حدث خطأ أثناء حفظ البيانات';
      toast.error(msg);
    }
  });

  // Recorded summary stats for the selected month
  const recordedStats = useMemo(() => {
    let totalOrders = 0;
    let totalKm = 0;
    let totalFuel = 0;
    const uniqueDays = new Set<string>();

    recordedSessions.forEach((s) => {
      totalOrders += Number(s.orders_count ?? 0);
      totalKm += Number(s.distance ?? 0);
      totalFuel += Number(s.fuel_cost ?? 0);
      const dk = extractSessionDateKey(s);
      if (dk) uniqueDays.add(dk);
    });

    return {
      daysCount: uniqueDays.size,
      shiftsCount: recordedSessions.length,
      totalOrders,
      totalKm,
      totalFuel
    };
  }, [recordedSessions]);

  // Current form totals
  const formTotals = useMemo(() => {
    let orders = 0;
    let km = 0;
    let fuel = 0;
    rows.forEach((r) => {
      orders += parseInt(r.orders_count || '0', 10) || 0;
      km += parseFloat(r.distance || '0') || 0;
      fuel += parseFloat(r.fuel_cost || '0') || 0;
    });
    return { orders, km, fuel };
  }, [rows]);

  return (
    <PageContainer
      pageTitle='تسجيل طلبات المناديب (يدوي)'
      pageDescription='إدخال وتعديل الطلبات اليومية، المسافة المقطوعة، وتكلفة البنزين للمندوب يومياً بالتتابع مع عرض سجلاته المسجلة مسبقاً'
    >
      <div className='flex flex-col gap-6' dir={dir}>
        {/* 1. Employee Search & Selection Card */}
        <Card className='border-border/80 shadow-xs'>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2 text-base font-bold'>
              <UserCheck className='text-primary size-5' />
              1. اختر المندوب
            </CardTitle>
            <CardDescription className='text-xs'>
              ابحث باسم المندوب، رقم الهوية، رقم الجوال، رقم اللوحة، أو رقم المفتاح لعرض سجله وإضافة
              أيام عمل جديدة
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
              <div className='relative flex-1'>
                <Search className='text-muted-foreground pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2' />
                <Input
                  placeholder='اكتب اسم المندوب أو رقم الإقامة أو اللوحة...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='pe-9'
                />
              </div>

              <div className='flex items-center gap-2'>
                <Calendar className='text-muted-foreground size-4 shrink-0' />
                <span className='text-muted-foreground text-xs font-medium whitespace-nowrap'>
                  شهر العرض:
                </span>
                <Input
                  type='month'
                  value={selectedMonth}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      setSelectedMonth(val);
                      setRows(generateMonthRows(val, sessionsByDate));
                    }
                  }}
                  className='w-[165px] font-mono text-sm'
                />
              </div>
            </div>

            {/* Selected Employee Banner */}
            {selectedEmployee ? (
              <div className='bg-primary/5 border-primary/30 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-3.5'>
                <div className='flex items-center gap-3'>
                  <Avatar className='border-primary/20 size-12 border'>
                    <AvatarImage
                      src={selectedEmployee.personal_image}
                      alt={selectedEmployee.name}
                    />
                    <AvatarFallback className='bg-primary/10 text-primary font-bold'>
                      {selectedEmployee.name?.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h3 className='text-base font-bold'>{selectedEmployee.name}</h3>
                      {selectedEmployee.branch?.name && (
                        <Badge variant='secondary' className='text-xs'>
                          {selectedEmployee.branch.name}
                        </Badge>
                      )}
                      {selectedEmployee.application_type && (
                        <Badge variant='outline' className='text-xs'>
                          {selectedEmployee.application_type}
                        </Badge>
                      )}
                    </div>
                    <div className='text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-xs'>
                      {selectedEmployee.national_id && (
                        <span>الهوية: {selectedEmployee.national_id}</span>
                      )}
                      {selectedEmployee.motorcycle_number && (
                        <span className='flex items-center gap-1 font-medium text-foreground'>
                          <Bike className='size-3.5' />
                          الدباب: {selectedEmployee.motorcycle_number}
                        </span>
                      )}
                      {selectedEmployee.key_number && (
                        <Badge
                          variant='outline'
                          className='font-mono font-bold text-primary border-primary/40'
                        >
                          مفتاح #{selectedEmployee.key_number}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setSelectedEmployee(null);
                    setSearchTerm('');
                  }}
                >
                  تغيير المندوب
                </Button>
              </div>
            ) : (
              /* Employee Quick Selection Grid — Ordered by Key Number */
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-h-[380px] overflow-y-auto p-1'>
                {isLoadingEmployees ? (
                  <p className='text-muted-foreground col-span-full py-4 text-center text-xs'>
                    جاري تحميل قائمة المناديب...
                  </p>
                ) : filteredEmployees.length === 0 ? (
                  <p className='text-muted-foreground col-span-full py-4 text-center text-xs'>
                    لا يوجد مندوب مطابق للبحث
                  </p>
                ) : (
                  filteredEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      type='button'
                      onClick={() => handleSelectEmployee(emp)}
                      className='hover:border-primary/50 hover:bg-muted/50 flex items-center justify-between gap-2.5 rounded-xl border p-2.5 text-start transition-all'
                    >
                      <div className='flex items-center gap-2.5 min-w-0 flex-1'>
                        <Avatar className='size-9 shrink-0'>
                          <AvatarImage src={emp.personal_image} alt={emp.name} />
                          <AvatarFallback className='text-xs font-bold'>
                            {emp.name?.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className='min-w-0 flex-1'>
                          <p className='truncate text-sm font-bold'>{emp.name}</p>
                          <p className='text-muted-foreground truncate text-xs'>
                            {emp.motorcycle_number
                              ? `دباب: ${emp.motorcycle_number}`
                              : emp.national_id || emp.phone || '—'}
                          </p>
                        </div>
                      </div>
                      {emp.key_number ? (
                        <Badge
                          variant='outline'
                          className='shrink-0 border-primary/40 bg-primary/10 text-primary font-mono text-xs font-bold'
                        >
                          #{emp.key_number}
                        </Badge>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Main Split Workspace when an Employee is selected */}
        {selectedEmployee && (
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
            {/* Left/Right Column (7 cols): Sequential Daily Entry Table */}
            <Card className='border-border/80 shadow-xs lg:col-span-7'>
              <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-2 border-b pb-4'>
                <div>
                  <CardTitle className='flex items-center gap-2 text-base font-bold'>
                    <Sparkles className='text-primary size-5' />
                    2. إدخال البيانات اليومية بالتتابع
                  </CardTitle>
                  <CardDescription className='mt-1 text-xs'>
                    يتم تلقائياً عرض الأيام حتى يوم أمس — استخدم زر &quot;إضافة يوم إضافي (+1)&quot;
                    لإضافة اليوم الحالي أو أيام أخرى عند انتهاء الوردية
                  </CardDescription>
                </div>

                <div className='flex flex-wrap items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleAddNextDayRow}
                    className='border-primary/40 text-primary hover:bg-primary/10 gap-1.5 font-bold shadow-xs'
                  >
                    <Plus className='size-4' />
                    إضافة يوم إضافي (+1)
                  </Button>

                  <Button
                    type='button'
                    variant='secondary'
                    size='sm'
                    onClick={handleAddWeekDays}
                    className='gap-1 text-xs font-bold'
                  >
                    +7 أيام متتالية
                  </Button>
                </div>
              </CardHeader>

              <CardContent className='space-y-4 pt-4'>
                <div className='overflow-x-auto rounded-xl border'>
                  <Table>
                    <TableHeader>
                      <TableRow className='bg-muted/50'>
                        <TableHead className='w-[42px] text-center'>#</TableHead>
                        <TableHead className='min-w-[155px]'>التاريخ (اليوم)</TableHead>
                        <TableHead className='min-w-[110px]'>عدد الطلبات</TableHead>
                        <TableHead className='min-w-[115px]'>المسافة (كم)</TableHead>
                        <TableHead className='min-w-[115px]'>البنزين (ر.س)</TableHead>
                        <TableHead className='min-w-[130px]'>ملاحظات</TableHead>
                        <TableHead className='w-[50px]'></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, idx) => {
                        const existingForDay = sessionsByDate.get(row.date);
                        const hasExisting = Boolean(existingForDay && existingForDay.length > 0);
                        const existingTotalOrders = existingForDay
                          ? existingForDay.reduce((sum, s) => sum + Number(s.orders_count ?? 0), 0)
                          : 0;

                        return (
                          <TableRow
                            key={row.id}
                            className={cn(hasExisting && 'bg-amber-500/5 dark:bg-amber-500/10')}
                          >
                            <TableCell className='text-muted-foreground text-center font-mono text-xs font-bold'>
                              {idx + 1}
                            </TableCell>

                            <TableCell>
                              <div className='space-y-1'>
                                <Input
                                  type='date'
                                  value={row.date}
                                  onChange={(e) => handleDateChange(row.id, e.target.value)}
                                  className='h-9 font-mono text-xs font-bold'
                                />
                                <div className='flex items-center justify-between px-1'>
                                  <span className='text-muted-foreground text-[11px]'>
                                    {formatArabicDayName(row.date)}
                                  </span>
                                  {hasExisting && (
                                    <Badge
                                      variant='outline'
                                      className={cn(
                                        'px-1.5 py-0 text-[10px]',
                                        existingForDay && existingForDay.length > 1
                                          ? 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
                                          : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                      )}
                                      title={
                                        existingForDay && existingForDay.length > 1
                                          ? `يوجد ${existingForDay.length} شفتات في هذا اليوم بإجمالي ${existingTotalOrders} طلب — عند الحفظ سيتم دمجها في سجل واحد`
                                          : 'المندوب لديه بيانات مسجلة في هذا اليوم — سيتم تحديثها عند الحفظ'
                                      }
                                    >
                                      {existingForDay && existingForDay.length > 1
                                        ? `${existingForDay.length} شفتات (${existingTotalOrders} طلب)`
                                        : `مسجل (${existingTotalOrders} طلب)`}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Input
                                type='number'
                                min='0'
                                placeholder='0'
                                value={row.orders_count}
                                onChange={(e) =>
                                  handleRowChange(row.id, 'orders_count', e.target.value)
                                }
                                className='h-9 text-center font-mono text-sm font-bold'
                              />
                            </TableCell>

                            <TableCell>
                              <Input
                                type='number'
                                min='0'
                                step='0.1'
                                placeholder='0'
                                value={row.distance}
                                onChange={(e) =>
                                  handleRowChange(row.id, 'distance', e.target.value)
                                }
                                className='h-9 text-center font-mono text-sm'
                              />
                            </TableCell>

                            <TableCell>
                              <Input
                                type='number'
                                min='0'
                                step='0.5'
                                placeholder='0.00'
                                value={row.fuel_cost}
                                onChange={(e) =>
                                  handleRowChange(row.id, 'fuel_cost', e.target.value)
                                }
                                className='h-9 text-center font-mono text-sm'
                              />
                            </TableCell>

                            <TableCell>
                              <Input
                                type='text'
                                placeholder='اختياري...'
                                value={row.notes}
                                onChange={(e) => handleRowChange(row.id, 'notes', e.target.value)}
                                className='h-9 text-xs'
                              />
                            </TableCell>

                            <TableCell className='text-center'>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon-sm'
                                disabled={rows.length <= 1}
                                onClick={() => handleRemoveRow(row.id)}
                                className='text-destructive hover:bg-destructive/10'
                                title='حذف السطر'
                              >
                                <Trash2 className='size-4' />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow className='bg-muted/60 font-bold'>
                        <TableCell colSpan={2} className='text-xs'>
                          إجمالي المدخلات في الجدول ({rows.length} أيام)
                        </TableCell>
                        <TableCell className='text-center font-mono text-sm text-emerald-600 dark:text-emerald-400'>
                          {formTotals.orders} طلب
                        </TableCell>
                        <TableCell className='text-center font-mono text-sm text-sky-600 dark:text-sky-400'>
                          {formTotals.km.toFixed(1)} كم
                        </TableCell>
                        <TableCell className='text-center font-mono text-sm text-amber-600 dark:text-amber-400'>
                          {formTotals.fuel.toFixed(2)} ر.س
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>

                {/* Action Bar */}
                <div className='flex flex-wrap items-center justify-between gap-3 pt-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleAddNextDayRow}
                    className='gap-1.5 font-bold'
                  >
                    <Plus className='size-4' />
                    إضافة المزيد (اليوم التالي تلقائياً)
                  </Button>

                  <Button
                    type='button'
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className='min-w-[180px] gap-2 font-bold'
                  >
                    <Save className='size-4' />
                    {saveMutation.isPending ? 'جاري الحفظ والاعتماد...' : 'حفظ واعتماد البيانات'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right/Left Column (5 cols): Previously Recorded Sessions for this Employee */}
            <Card className='border-border/80 shadow-xs lg:col-span-5'>
              <CardHeader className='flex flex-row items-center justify-between border-b pb-4'>
                <div>
                  <CardTitle className='flex items-center gap-2 text-base font-bold'>
                    <CheckCircle2 className='size-5 text-emerald-600' />
                    سجل طلبات المندوب المسجلة مسبقاً
                  </CardTitle>
                  <CardDescription className='mt-1 text-xs'>
                    الأيام والطلبات التي سجلها المندوب أو المشرف في شهر ({selectedMonth}) لضمان دقة
                    البيانات وعدم التكرار
                  </CardDescription>
                </div>

                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  onClick={() => refetchEmployeeHistory()}
                  title='تحديث السجل'
                >
                  <RefreshCw className={cn('size-4', isLoadingHistory && 'animate-spin')} />
                </Button>
              </CardHeader>

              <CardContent className='space-y-4 pt-4'>
                {/* Summary Mini KPIs for Employee's Recorded Month */}
                <div className='grid grid-cols-3 gap-2.5'>
                  <div className='bg-emerald-500/10 border-emerald-500/20 rounded-xl border p-2.5 text-center'>
                    <div className='text-muted-foreground flex items-center justify-center gap-1 text-[11px]'>
                      <Package className='size-3.5 text-emerald-600' />
                      إجمالي الطلبات
                    </div>
                    <p className='mt-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400'>
                      {recordedStats.totalOrders}
                    </p>
                    <span className='text-muted-foreground text-[10px]'>
                      في {recordedStats.daysCount} يوم عمل
                    </span>
                  </div>

                  <div className='bg-sky-500/10 border-sky-500/20 rounded-xl border p-2.5 text-center'>
                    <div className='text-muted-foreground flex items-center justify-center gap-1 text-[11px]'>
                      <Route className='size-3.5 text-sky-600' />
                      المسافة المقطوعة
                    </div>
                    <p className='mt-1 font-mono text-lg font-bold text-sky-600 dark:text-sky-400'>
                      {recordedStats.totalKm.toFixed(0)} كم
                    </p>
                    <span className='text-muted-foreground text-[10px]'>إجمالي الكيلومترات</span>
                  </div>

                  <div className='bg-amber-500/10 border-amber-500/20 rounded-xl border p-2.5 text-center'>
                    <div className='text-muted-foreground flex items-center justify-center gap-1 text-[11px]'>
                      <Fuel className='size-3.5 text-amber-600' />
                      إجمالي البنزين
                    </div>
                    <p className='mt-1 font-mono text-lg font-bold text-amber-600 dark:text-amber-400'>
                      {recordedStats.totalFuel.toFixed(1)} ر.س
                    </p>
                    <span className='text-muted-foreground text-[10px]'>تكلفة الوقود</span>
                  </div>
                </div>

                {/* Recorded Sessions List */}
                {isLoadingHistory ? (
                  <p className='text-muted-foreground py-8 text-center text-xs'>
                    جاري فحص سجلات المندوب السابقة...
                  </p>
                ) : recordedSessions.length === 0 ? (
                  <div className='bg-muted/30 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center'>
                    <AlertCircle className='text-muted-foreground size-7' />
                    <p className='text-sm font-bold'>
                      لا توجد طلبات مسجلة لهذا المندوب في هذا الشهر
                    </p>
                    <p className='text-muted-foreground max-w-xs text-xs'>
                      يمكنك البدء بإدخال أيام العمل من يوم 1 في الجدول المجاور والضغط على إضافة
                      اليوم التالي
                    </p>
                  </div>
                ) : (
                  <div className='max-h-[460px] overflow-y-auto rounded-xl border'>
                    <Table>
                      <TableHeader>
                        <TableRow className='bg-muted/50'>
                          <TableHead>التاريخ</TableHead>
                          <TableHead className='text-center'>الطلبات</TableHead>
                          <TableHead className='text-center'>المسافة</TableHead>
                          <TableHead className='text-center'>البنزين</TableHead>
                          <TableHead className='text-center'>الحالة</TableHead>
                          <TableHead className='w-[50px]'></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recordedSessions.map((sess) => {
                          const dateKey = extractSessionDateKey(sess);
                          return (
                            <TableRow key={sess.id}>
                              <TableCell className='font-mono text-xs font-bold'>
                                <div>{dateKey}</div>
                                <div className='text-muted-foreground text-[10px] font-normal'>
                                  {formatArabicDayName(dateKey)}
                                </div>
                              </TableCell>
                              <TableCell className='text-center font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400'>
                                {sess.orders_count ?? 0}
                              </TableCell>
                              <TableCell className='text-center font-mono text-xs'>
                                {Number(sess.distance ?? 0).toFixed(0)} كم
                              </TableCell>
                              <TableCell className='text-center font-mono text-xs'>
                                {Number(sess.fuel_cost ?? 0).toFixed(1)} ر.س
                              </TableCell>
                              <TableCell className='text-center'>
                                {sess.is_reviewed ? (
                                  <Badge
                                    variant='outline'
                                    className='border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300'
                                  >
                                    معتمد
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant='outline'
                                    className='border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300'
                                  >
                                    <Clock className='me-1 size-3' />
                                    بانتظار الاعتماد
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className='text-center'>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='icon-sm'
                                  onClick={() => handleLoadSessionToEdit(sess)}
                                  title='تحميل هذا اليوم في جدول الإدخال لتعديله'
                                >
                                  <Edit3 className='size-3.5' />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
