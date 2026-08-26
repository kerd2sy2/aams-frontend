'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { reportApi, employeeApi, workApi } from '@/lib/aams/services';
import { formatRiyadh } from '@/lib/aams/riyadh-time';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/aams/skeletons';
import { Icons } from '@/components/icons';
import type { Employee, PaginatedResponse, WorkSessionDetail } from '@/types/aams';

const PAGE_SIZE = 10;
const ALL_EMPLOYEES = '__all__';

function getErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { error?: string; message?: string }; status?: number };
    message?: string;
  };
  if (e?.response?.data?.error) return e.response.data.error;
  if (e?.response?.data?.message) return e.response.data.message;
  if (e?.response?.status) return `خطأ في الخادم (${e.response.status})`;
  if (e?.message) return e.message;
  return fallback;
}

async function downloadExcelFile(url: string, filename: string): Promise<void> {
  const token = localStorage.getItem('access_token');
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  if (!res.ok) throw new Error('فشل التحميل');
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  // Filter modal state
  const [filterOpen, setFilterOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [tempEmployeeId, setTempEmployeeId] = useState('');
  const [tempApplicationId, setTempApplicationId] = useState('');

  // Edit modal state
  const [editSession, setEditSession] = useState<WorkSessionDetail | null>(null);
  const [editStartKm, setEditStartKm] = useState('');
  const [editEndKm, setEditEndKm] = useState('');
  const [editOrdersCount, setEditOrdersCount] = useState('');
  const [editFuelCost, setEditFuelCost] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  // Export state
  const [isDownloading, setIsDownloading] = useState(false);

  // Active filters count
  const activeFilters = [startDate, endDate, employeeId, applicationId].filter(Boolean).length;

  const openFilterModal = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setTempEmployeeId(employeeId);
    setTempApplicationId(applicationId);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setEmployeeId(tempEmployeeId);
    setApplicationId(tempApplicationId);
    setPage(1);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setTempStartDate('');
    setTempEndDate('');
    setTempEmployeeId('');
    setTempApplicationId('');
    setStartDate('');
    setEndDate('');
    setEmployeeId('');
    setApplicationId('');
    setPage(1);
    setFilterOpen(false);
  };

  const { data: employeesData } = useOfflineQuery<PaginatedResponse<Employee>>({
    queryKey: ['all-employees-list'],
    queryFn: () => employeeApi.getAll({ limit: 100 }),
    cacheKey: 'employees_list'
  });

  const employees = employeesData?.data ?? [];

  const employeeMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const emp of employees) {
      map[emp.id] = emp.name;
    }
    return map;
  }, [employees]);

  const { data, isLoading } = useOfflineQuery<{
    data: WorkSessionDetail[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ['reports', startDate, endDate, employeeId, applicationId, page],
    queryFn: () =>
      reportApi.getReports({
        start_date: startDate,
        end_date: endDate,
        employee_id: employeeId,
        application_id: applicationId,
        page,
        limit: PAGE_SIZE
      }),
    cacheKey: `reports_${page}_${startDate}_${endDate}`
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const openEditModal = (session: WorkSessionDetail) => {
    setEditSession(session);
    setEditStartKm(String(session.start_km ?? ''));
    setEditEndKm(session.end_km && session.end_km > 0 ? String(session.end_km) : '');
    setEditOrdersCount(String(session.orders_count ?? 0));
    setEditFuelCost(String(session.fuel_cost ?? 0));
    setEditEmployeeId(session.employee_id);
    setEditStartTime(formatRiyadh(new Date(session.start_time), "yyyy-MM-dd'T'HH:mm"));
    setEditEndTime(
      session.end_time ? formatRiyadh(new Date(session.end_time), "yyyy-MM-dd'T'HH:mm") : ''
    );
  };

  const closeEditModal = () => {
    setEditSession(null);
  };

  const editMutation = useMutation({
    mutationFn: ({
      sessionId,
      payload
    }: {
      sessionId: string;
      payload: Parameters<typeof workApi.updateWorkSession>[1];
    }) => workApi.updateWorkSession(sessionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('تم تعديل الشفت بنجاح');
      closeEditModal();
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'حدث خطأ أثناء تعديل الشفت'));
    }
  });

  const handleEditSave = () => {
    if (!editSession) return;
    const session = editSession;

    const startKmVal = editStartKm ? parseFloat(editStartKm) : 0;
    const endKmVal = parseFloat(editEndKm) || 0;
    const effectiveStart = startKmVal > 0 ? startKmVal : session.start_km;

    if (endKmVal > 0 && endKmVal <= effectiveStart) {
      toast.error(`عداد النهاية يجب أن يكون أكبر من عداد البداية ${effectiveStart}`);
      return;
    }

    const payload: Parameters<typeof workApi.updateWorkSession>[1] = {
      employee_id: editEmployeeId !== session.employee_id ? editEmployeeId : undefined,
      start_km: startKmVal > 0 ? startKmVal : undefined,
      end_km: endKmVal,
      orders_count: parseInt(editOrdersCount) || 0,
      fuel_cost: parseFloat(editFuelCost) || 0,
      start_time: editStartTime ? new Date(editStartTime).toISOString() : undefined,
      end_time: editEndTime ? new Date(editEndTime).toISOString() : undefined
    };

    editMutation.mutate({ sessionId: session.id, payload });
  };

  const downloadExcel = async () => {
    if (!rows.length) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }
    setIsDownloading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      if (employeeId) params.set('employee_id', employeeId);
      if (applicationId) params.set('application_id', applicationId);
      await downloadExcelFile(
        `/api/v1/reports/export?${params.toString()}`,
        'تقرير_الشفتات.xlsx'
      );
      toast.success('تم تصدير ملف Excel بنجاح!');
    } catch {
      toast.error('حدث خطأ أثناء تصدير ملف Excel');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <PageContainer
      pageTitle='كشف الشفتات'
      pageDescription='فلترة وتصدير كشف الشفتات بصيغة Excel'
      pageHeaderAction={
        <div className='flex gap-2'>
          <Button variant='outline' onClick={openFilterModal} className='relative gap-2 font-semibold'>
            <Icons.adjustments className='size-4' />
            تصفية
            {activeFilters > 0 && (
              <Badge className='bg-primary text-primary-foreground absolute -top-2 -end-2 flex size-5 items-center justify-center rounded-full p-0 text-[10px]'>
                {activeFilters}
              </Badge>
            )}
          </Button>
          <Button
            onClick={downloadExcel}
            disabled={isDownloading}
            className='gap-2 bg-emerald-600 font-bold text-white hover:bg-emerald-700'
          >
            {isDownloading ? (
              <Icons.spinner className='size-4 animate-spin' />
            ) : (
              <Icons.fileTypeXls className='size-4' />
            )}
            تصدير Excel
          </Button>
        </div>
      }
    >
      <div className='flex flex-col gap-4'>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : !rows.length ? (
          <Card className='py-12 text-center'>
            <CardContent>
              <div className='bg-muted text-muted-foreground mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl'>
                <Icons.chartBar className='size-8' />
              </div>
              <h3 className='text-lg font-bold'>لا توجد تقارير</h3>
              <p className='text-muted-foreground mx-auto mt-1.5 max-w-xs text-sm'>
                لا توجد سجلات شفتات تطابق الفلترة المحددة. جرّب تعديل الفترات أو إزالة الفلاتر.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className='space-y-3 md:hidden'>
              {rows.map((row) => (
                <Card key={row.id}>
                  <CardContent>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='min-w-0'>
                        <p className='truncate text-base font-bold'>{row.employee_name}</p>
                        {row.branch_name && (
                          <Badge variant='outline' className='mt-0.5 text-[10px]'>
                            {row.branch_name}
                          </Badge>
                        )}
                        <p className='text-muted-foreground mt-0.5 font-mono text-xs tabular-nums'>
                          {formatRiyadh(new Date(row.start_time), 'yyyy-MM-dd · hh:mm a', {
                            locale: ar
                          })}
                        </p>
                      </div>
                      <Badge variant='secondary' className='shrink-0 font-bold'>
                        {row.working_duration}
                      </Badge>
                    </div>
                    <div className='mt-3 grid grid-cols-2 gap-2 text-xs font-semibold'>
                      <Field
                        label='نهاية الشفت'
                        value={
                          row.end_time
                            ? formatRiyadh(new Date(row.end_time), 'hh:mm a', { locale: ar })
                            : 'قائم الآن'
                        }
                        tone={row.end_time ? 'default' : 'amber'}
                      />
                      <Field label='المسافة' value={`${row.distance} كم`} tone='emerald' />
                      <Field label='عدد الطلبات' value={`${row.orders_count}`} />
                      <Field label='الوقود' value={`${row.fuel_cost} ر.س`} tone='rose' />
                      <Field label='عداد البداية' value={`${row.start_km} كم`} />
                      <Field label='عداد النهاية' value={`${row.end_km || '-'} كم`} />
                    </div>
                    {(row.application_id || row.notes) && (
                      <div className='mt-3 space-y-1 border-t pt-3'>
                        {row.application_id && (
                          <p className='text-muted-foreground text-xs font-semibold'>
                            التطبيق: <span className='font-mono'>{row.application_id}</span>
                          </p>
                        )}
                        {row.notes && (
                          <p className='text-muted-foreground text-xs font-semibold'>
                            ملاحظات: <span className='font-medium'>{row.notes}</span>
                          </p>
                        )}
                      </div>
                    )}
                    <div className='mt-3 border-t pt-3'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => openEditModal(row)}
                        className='h-9 w-full text-xs'
                      >
                        <Icons.edit className='size-3.5' />
                        تعديل الشفت
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop Table */}
            <Card className='hidden overflow-hidden md:block'>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='min-w-[110px] text-center'>المندوب</TableHead>
                      <TableHead className='min-w-[90px] text-center'>الفرع</TableHead>
                      <TableHead className='min-w-[100px] text-center'>التاريخ</TableHead>
                      <TableHead className='min-w-[95px] text-center'>وقت البداية</TableHead>
                      <TableHead className='min-w-[95px] text-center'>وقت النهاية</TableHead>
                      <TableHead className='min-w-[85px] text-center'>مدة العمل</TableHead>
                      <TableHead className='min-w-[95px] text-center'>عداد البداية</TableHead>
                      <TableHead className='min-w-[95px] text-center'>عداد النهاية</TableHead>
                      <TableHead className='min-w-[85px] text-center'>المسافة</TableHead>
                      <TableHead className='min-w-[75px] text-center'>الطلبات</TableHead>
                      <TableHead className='min-w-[80px] text-center'>الوقود</TableHead>
                      <TableHead className='min-w-[90px] text-center'>التطبيق</TableHead>
                      <TableHead className='min-w-[120px] text-center'>الملاحظات</TableHead>
                      <TableHead className='w-[55px] text-center'>تعديل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className='py-2.5 text-center font-bold'>
                          {row.employee_name}
                        </TableCell>
                        <TableCell className='py-2.5 text-center'>
                          {row.branch_name ? (
                            <Badge variant='outline' className='text-[10px]'>
                              {row.branch_name}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className='text-muted-foreground py-2.5 text-center font-mono text-xs tabular-nums'>
                          {formatRiyadh(new Date(row.start_time), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell className='text-muted-foreground py-2.5 text-center font-mono text-xs tabular-nums'>
                          {formatRiyadh(new Date(row.start_time), 'hh:mm a', { locale: ar })}
                        </TableCell>
                        <TableCell className='text-muted-foreground py-2.5 text-center font-mono text-xs tabular-nums'>
                          {row.end_time ? (
                            formatRiyadh(new Date(row.end_time), 'hh:mm a', { locale: ar })
                          ) : (
                            <Badge variant='secondary' className='font-bold text-xs'>
                              قائم الآن
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className='py-2.5 text-center'>
                          <Badge variant='secondary' className='font-bold text-xs tabular-nums'>
                            {row.working_duration}
                          </Badge>
                        </TableCell>
                        <TableCell className='py-2.5 text-center font-mono text-xs tabular-nums'>
                          {row.start_km}
                        </TableCell>
                        <TableCell className='py-2.5 text-center font-mono text-xs tabular-nums'>
                          {row.end_km}
                        </TableCell>
                        <TableCell className='py-2.5 text-center font-mono text-xs font-bold tabular-nums'>
                          {row.distance} كم
                        </TableCell>
                        <TableCell className='py-2.5 text-center text-xs font-bold tabular-nums'>
                          {row.orders_count}
                        </TableCell>
                        <TableCell className='py-2.5 text-center font-mono text-xs tabular-nums'>
                          {row.fuel_cost}
                        </TableCell>
                        <TableCell className='text-muted-foreground py-2.5 text-center font-mono text-xs'>
                          {row.application_id || '-'}
                        </TableCell>
                        <TableCell className='text-muted-foreground max-w-[120px] truncate py-2.5 text-center text-xs'>
                          {row.notes || '-'}
                        </TableCell>
                        <TableCell className='py-2.5 text-center'>
                          <Button
                            variant='ghost'
                            size='icon-xs'
                            onClick={() => openEditModal(row)}
                            className='text-muted-foreground hover:text-primary hover:bg-primary/10'
                            aria-label='تعديل الشفت'
                            title='تعديل الشفت'
                          >
                            <Icons.edit className='size-3.5' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {total > PAGE_SIZE && (
                <CardFooter className='justify-between'>
                  <span className='text-muted-foreground text-xs font-medium tabular-nums'>
                    إجمالي السجلات: {total} · صفحة {page}
                  </span>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <Icons.chevronRight className='size-4' /> السابقة
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      التالية <Icons.chevronLeft className='size-4' />
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>

            {/* Mobile Pagination */}
            {total > PAGE_SIZE && (
              <Card className='md:hidden'>
                <CardFooter className='justify-between'>
                  <span className='text-muted-foreground text-xs font-medium tabular-nums'>
                    صفحة {page}
                  </span>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <Icons.chevronRight className='size-4' /> السابقة
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      التالية <Icons.chevronLeft className='size-4' />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editSession} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-base font-bold'>
              <Icons.edit className='text-primary size-4' />
              تعديل شفت العمل
            </DialogTitle>
          </DialogHeader>

          <div className='space-y-4'>
            {/* Employee info header */}
            <div className='bg-muted flex items-center gap-3 rounded-xl p-3'>
              <div className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full'>
                <span className='text-sm font-bold'>{editSession?.employee_name?.charAt(0)}</span>
              </div>
              <div className='min-w-0'>
                <p className='truncate text-sm font-bold'>{editSession?.employee_name}</p>
                <p className='text-muted-foreground font-mono text-[10px]'>
                  {editSession
                    ? formatRiyadh(new Date(editSession.start_time), 'yyyy-MM-dd · hh:mm a', {
                        locale: ar
                      })
                    : ''}
                  {editSession?.end_time
                    ? ` → ${formatRiyadh(new Date(editSession.end_time), 'hh:mm a', { locale: ar })}`
                    : ''}
                </p>
              </div>
            </div>

            {/* Employee Change Selector */}
            <div className='space-y-1.5'>
              <Label className='flex items-center gap-1 text-xs font-semibold'>
                <span className='inline-block h-3 w-1 rounded-full bg-amber-500'></span>
                تغيير المندوب
              </Label>
              <Select
                value={editEmployeeId}
                onValueChange={(value) => setEditEmployeeId(value ?? '')}
                modal={false}
              >
                <SelectTrigger className='h-10 w-full'>
                  <SelectValue placeholder='اختر مندوباً آخر...'>
                    {employeeMap[editEmployeeId] ?? editSession?.employee_name ?? null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editEmployeeId !== editSession?.employee_id && (
                <p className='text-foreground text-[11px] font-semibold'>
                  سيتم نقل هذا الشفت إلى المندوب المحدد
                </p>
              )}
            </div>

            {/* Form Fields */}
            <div className='space-y-3'>
              <div className='space-y-3'>
                <div className='space-y-1.5'>
                  <Label className='flex items-center gap-1 text-xs font-semibold'>
                    <span className='inline-block h-3 w-1 rounded-full bg-emerald-500'></span>
                    تاريخ ووقت البداية
                  </Label>
                  <Input
                    type='datetime-local'
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className='h-10 font-mono text-xs'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label className='flex items-center gap-1 text-xs font-semibold'>
                    <span className='inline-block h-3 w-1 rounded-full bg-rose-500'></span>
                    تاريخ ووقت النهاية
                  </Label>
                  <Input
                    type='datetime-local'
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className='h-10 font-mono text-xs'
                  />
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>عداد البداية (كم)</Label>
                <Input
                  type='text'
                  inputMode='decimal'
                  value={editStartKm}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, '');
                    if ((v.match(/\./g) || []).length <= 1) {
                      setEditStartKm(v);
                    }
                  }}
                  className='h-10 font-mono'
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>عداد النهاية (كم)</Label>
                <Input
                  type='text'
                  inputMode='decimal'
                  value={editEndKm}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, '');
                    if ((v.match(/\./g) || []).length <= 1) {
                      setEditEndKm(v);
                    }
                  }}
                  placeholder={`أكبر من ${editSession?.start_km}`}
                  className='h-10 font-mono'
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>عدد الطلبات</Label>
                <Input
                  type='text'
                  inputMode='numeric'
                  value={editOrdersCount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, '');
                    setEditOrdersCount(v);
                  }}
                  className='h-10 font-mono'
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>تكلفة الوقود (ر.س)</Label>
                <Input
                  type='text'
                  inputMode='decimal'
                  value={editFuelCost}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, '');
                    if ((v.match(/\./g) || []).length <= 1) {
                      setEditFuelCost(v);
                    }
                  }}
                  className='h-10 font-mono'
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={closeEditModal} disabled={editMutation.isPending}>
              إلغاء
            </Button>
            <Button onClick={handleEditSave} disabled={editMutation.isPending} className='gap-2 font-bold'>
              {editMutation.isPending ? (
                <Icons.spinner className='size-4 animate-spin' />
              ) : (
                <Icons.save className='size-4' />
              )}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Modal */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-base font-bold'>
              <Icons.adjustments className='text-primary size-4' />
              تصفية التقارير
            </DialogTitle>
          </DialogHeader>

          <div className='space-y-4'>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>من تاريخ</Label>
                <Input
                  type='date'
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  className='h-10'
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>إلى تاريخ</Label>
                <Input
                  type='date'
                  value={tempEndDate}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  className='h-10'
                />
              </div>
              <div className='space-y-1.5 sm:col-span-2'>
                <Label className='text-xs font-semibold'>المندوب</Label>
                <Select
                  value={tempEmployeeId || ALL_EMPLOYEES}
                  onValueChange={(value) =>
                    setTempEmployeeId(value === ALL_EMPLOYEES ? '' : (value ?? ''))
                  }
                  modal={false}
                >
                  <SelectTrigger className='h-10 w-full'>
                    <SelectValue placeholder='جميع المناديب' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_EMPLOYEES}>جميع المناديب</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5 sm:col-span-2'>
                <Label className='text-xs font-semibold'>التطبيق (App ID)</Label>
                <Input
                  placeholder='مثال: APP-99'
                  value={tempApplicationId}
                  onChange={(e) => setTempApplicationId(e.target.value)}
                  className='h-10'
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={resetFilters} className='gap-1 text-xs'>
              <Icons.refresh className='size-3.5' />
              مسح الكل
            </Button>
            <div className='flex gap-2'>
              <Button variant='ghost' onClick={() => setFilterOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={applyFilters} className='gap-2 font-bold'>
                <Icons.search className='size-4' />
                تطبيق الفلترة
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function Field({
  label,
  value,
  tone = 'default'
}: {
  label: string;
  value: string;
  tone?: 'default' | 'amber' | 'emerald' | 'rose' | 'blue';
}) {
  const classMap: Record<string, string> = {
    default: '',
    amber: 'text-foreground font-bold',
    emerald: 'text-foreground',
    rose: 'text-foreground',
    blue: 'text-foreground'
  };
  const toneClasses = classMap[tone] || '';
  return (
    <div className='bg-muted rounded-lg px-2.5 py-2'>
      <p className='text-muted-foreground text-[10px] font-semibold uppercase tracking-wider'>
        {label}
      </p>
      <p className={cn('mt-0.5 truncate text-xs font-bold tabular-nums', toneClasses)}>{value}</p>
    </div>
  );
}
