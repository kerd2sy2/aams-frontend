'use client';

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BarcodeScannerModal } from '@/components/aams/barcode-scanner-modal';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { employeeApi, inventoryApi, workApi } from '@/lib/aams/services';
import type { Employee, OilChangeCheck } from '@/types/aams';

function errorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  };
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;
}

export default function OilDispensePage() {
  const queryClient = useQueryClient();
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Search employees (2+ chars)
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['employee-search', employeeSearch],
    queryFn: () => employeeApi.search(employeeSearch),
    enabled: employeeSearch.length >= 2,
    staleTime: 1000 * 30
  });

  // Check oil change status when an employee is selected
  const { data: oilCheck, isLoading: checkingOil } = useQuery<OilChangeCheck>({
    queryKey: ['oil-check', selectedEmployee?.id],
    queryFn: () => workApi.checkOilChange(selectedEmployee!.id),
    enabled: !!selectedEmployee,
    staleTime: 0
  });

  // Dispense oil mutation
  const dispenseOilMut = useMutation({
    mutationFn: () =>
      inventoryApi.dispenseOil({
        employee_id: selectedEmployee!.id,
        quantity: 1
      }),
    onSuccess: () => {
      toast.success('تم صرف جركن زيت واحد بنجاح');
      setSelectedEmployee(null);
      setEmployeeSearch('');
      queryClient.invalidateQueries({ queryKey: ['oil-check'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => {
      toast.error(errorMessage(err, 'حدث خطأ أثناء صرف الزيت'));
    }
  });

  const handleSelectEmployee = useCallback((emp: Employee) => {
    setSelectedEmployee(emp);
    setEmployeeSearch('');
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedEmployee(null);
    setEmployeeSearch('');
  }, []);

  const handleScannerSelect = useCallback(
    (emp: Employee) => {
      handleSelectEmployee(emp);
      toast.success(`تم التحديد: ${emp.name}`);
    },
    [handleSelectEmployee]
  );

  // Dynamic oil-change thresholds based on vehicle type
  const oilInterval = oilCheck?.oil_change_interval ?? 950;
  const oilWarningThreshold = Math.round(oilInterval * 0.85);
  const isOilNeeded = oilCheck?.needs_oil_change ?? false;
  const isOilApproaching =
    !isOilNeeded && (oilCheck?.distance_since_oil ?? 0) >= oilWarningThreshold;

  return (
    <PageContainer
      pageTitle='صرف الزيت'
      pageDescription='صرف زيت للمندوبين وتسجيل المسافة منذ آخر تغيير'
    >
      <div className='flex flex-col gap-4'>
        {/* Search & Scan Card */}
        <Card>
          <CardContent className='space-y-4 p-4 pt-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
              <div className='relative flex-1'>
                <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 start-3' />
                <Input
                  type='text'
                  placeholder='ابحث عن المندوب بالاسم أو الكود...'
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    if (selectedEmployee) setSelectedEmployee(null);
                  }}
                  className='h-11 ps-9 pe-10'
                />
                {employeeSearch && (
                  <button
                    type='button'
                    onClick={() => {
                      setEmployeeSearch('');
                      setSelectedEmployee(null);
                    }}
                    aria-label='مسح البحث'
                    className='text-muted-foreground hover:bg-muted hover:text-foreground absolute top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors end-2'
                  >
                    <Icons.close className='size-4' />
                  </button>
                )}
              </div>

              <Button
                type='button'
                onClick={() => setShowScanner(true)}
                className='gap-2 font-semibold'
              >
                <Icons.qrCode className='size-4' />
                <span>مسح الباركود</span>
              </Button>
            </div>

            {/* Search Results Dropdown */}
            {employeeSearch.length >= 2 && !selectedEmployee && (
              <div className='bg-card border-border overflow-hidden rounded-xl border'>
                {isSearching ? (
                  <div className='flex items-center justify-center py-6'>
                    <Icons.spinner className='text-muted-foreground size-5 animate-spin' />
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  searchResults.map((emp) => (
                    <button
                      key={emp.id}
                      type='button'
                      onClick={() => handleSelectEmployee(emp)}
                      className='hover:bg-muted border-border flex w-full items-center gap-3 border-b px-4 py-3 text-right transition-colors last:border-b-0'
                    >
                      <EmployeeAvatar emp={emp} className='size-10 rounded-xl' />
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm font-semibold'>{emp.name}</p>
                        <p className='text-muted-foreground flex items-center gap-1 truncate text-xs'>
                          <Icons.bike className='size-3' />
                          {emp.motorcycle_number || 'بدون دراجة'}
                        </p>
                      </div>
                      <Icons.key className='text-muted-foreground size-4 shrink-0' />
                    </button>
                  ))
                ) : (
                  <p className='text-muted-foreground py-4 text-center text-sm'>
                    لا توجد نتائج للبحث
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employee Selected State */}
        {selectedEmployee ? (
          <Card>
            <CardContent className='space-y-5 p-4 pt-4'>
              {/* Employee Header */}
              <div className='flex items-start justify-between gap-3'>
                <div className='flex min-w-0 flex-1 items-center gap-3'>
                  <EmployeeAvatar emp={selectedEmployee} className='size-14 rounded-2xl' />
                  <div className='min-w-0'>
                    <h3 className='truncate text-lg font-bold'>{selectedEmployee.name}</h3>
                    <p className='text-muted-foreground mt-0.5 flex items-center gap-1 text-xs'>
                      <Icons.bike className='size-3' />
                      الدراجة: {selectedEmployee.motorcycle_number || 'غير محدد'}
                    </p>
                  </div>
                </div>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={handleClearSelection}
                  aria-label='إلغاء التحديد'
                  className='text-muted-foreground hover:text-destructive shrink-0'
                >
                  <Icons.close className='size-4' />
                </Button>
              </div>

              <Separator />

              {/* Oil Stats Section */}
              {checkingOil ? (
                <div className='grid grid-cols-3 gap-3'>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className='bg-muted animate-pulse space-y-2 rounded-2xl p-4'>
                      <div className='bg-muted-foreground/20 mx-auto h-3 w-16 rounded' />
                      <div className='bg-muted-foreground/20 mx-auto h-6 w-12 rounded' />
                      <div className='bg-muted-foreground/20 mx-auto h-3 w-8 rounded' />
                    </div>
                  ))}
                </div>
              ) : oilCheck ? (
                <>
                  {/* Oil Warning Banner */}
                  {isOilNeeded && (
                    <div className='bg-muted/50 border-border flex items-center gap-3 rounded-2xl border-2 px-4 py-3'>
                      <Icons.warning className='text-amber-600 size-5 shrink-0' />
                      <div>
                        <p className='text-sm font-bold'>
                          تنبيه: المندوب تجاوز {oilInterval.toLocaleString('ar-SA')} كم بدون تغيير
                          زيت
                        </p>
                        <p className='text-xs'>
                          المسافة منذ آخر تغيير:{' '}
                          {oilCheck.distance_since_oil.toLocaleString('ar-SA')} كم
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 3-Column Stats Grid */}
                  <div className='grid grid-cols-3 gap-3'>
                    {/* Total Distance */}
                    <div className='bg-muted/50 border-border space-y-1 rounded-2xl border p-3.5 text-center'>
                      <Icons.gauge className='text-blue-600 dark:text-blue-400 mx-auto size-5' />
                      <p className='text-muted-foreground text-[10px] font-medium'>المسافة الكلية</p>
                      <p className='text-blue-700 dark:text-blue-300 text-lg font-black'>
                        {oilCheck.total_distance.toLocaleString('ar-SA')}
                      </p>
                      <p className='text-muted-foreground text-[10px]'>كم</p>
                    </div>

                    {/* Distance Since Oil Change */}
                    <div
                      className={cn(
                        'space-y-1 rounded-2xl border p-3.5 text-center',
                        isOilNeeded ? 'bg-destructive/10 border-border' : 'bg-muted/50 border-border'
                      )}
                    >
                      <Icons.droplet
                        className={cn(
                          'mx-auto size-5',
                          isOilNeeded
                            ? 'text-red-600 dark:text-red-400'
                            : isOilApproaching
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                        )}
                      />
                      <p className='text-muted-foreground text-[10px] font-medium'>
                        المسافة منذ آخر تغيير
                      </p>
                      <p
                        className={cn(
                          'text-lg font-black',
                          isOilNeeded
                            ? 'text-red-700 dark:text-red-300'
                            : isOilApproaching
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-emerald-700 dark:text-emerald-300'
                        )}
                      >
                        {oilCheck.distance_since_oil.toLocaleString('ar-SA')}
                      </p>
                      <p className='text-muted-foreground text-[10px]'>كم</p>
                    </div>

                    {/* Oil Status */}
                    <div
                      className={cn(
                        'flex flex-col items-center justify-center space-y-1 rounded-2xl border p-3.5 text-center',
                        isOilNeeded
                          ? 'bg-destructive/10 border-border'
                          : isOilApproaching
                            ? 'bg-muted/50 border-border'
                            : 'bg-muted border-border'
                      )}
                    >
                      {isOilNeeded ? (
                        <Icons.warning className='text-red-500 size-5' />
                      ) : isOilApproaching ? (
                        <Icons.warning className='text-amber-500 size-5' />
                      ) : (
                        <Icons.circleCheck className='text-emerald-500 size-5' />
                      )}
                      <p className='text-muted-foreground text-[10px] font-medium'>حالة الزيت</p>
                      <Badge
                        variant={isOilNeeded ? 'destructive' : 'default'}
                        className={cn(
                          'text-xs font-bold',
                          isOilNeeded
                            ? ''
                            : isOilApproaching
                              ? 'border-amber-500/20 bg-amber-500/10 text-foreground'
                              : 'border-emerald-500/20 bg-emerald-500/10 text-foreground'
                        )}
                      >
                        {isOilNeeded ? 'يحتاج تغيير' : isOilApproaching ? 'يقترب' : 'جيد'}
                      </Badge>
                    </div>
                  </div>
                </>
              ) : null}

              <Separator />

              {/* Dispense Button */}
              <Button
                type='button'
                size='lg'
                disabled={dispenseOilMut.isPending}
                onClick={() => dispenseOilMut.mutate()}
                className='w-full py-5 text-base font-bold'
              >
                {dispenseOilMut.isPending ? (
                  <>
                    <Icons.spinner className='size-5 animate-spin' />
                    <span>جاري الصرف...</span>
                  </>
                ) : (
                  <>
                    <Icons.droplet className='size-5' />
                    <span>تأكيد صرف الزيت</span>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Empty State */
          <Card className='border-border bg-muted border-2 border-dashed text-center'>
            <CardContent className='space-y-4 p-8 sm:p-12'>
              <div className='bg-muted-foreground/10 mx-auto flex size-16 items-center justify-center rounded-3xl sm:size-20'>
                <Icons.droplet className='text-muted-foreground size-8 sm:size-10' />
              </div>
              <div className='space-y-2'>
                <h3 className='text-foreground/70 text-base font-bold sm:text-lg'>
                  اختر المندوب لصرف الزيت
                </h3>
                <p className='text-muted-foreground mx-auto max-w-sm text-xs leading-relaxed sm:text-sm'>
                  استخدم شريط البحث أعلاه أو اضغط على زر &quot;مسح الباركود&quot; لمسح بطاقة
                  الموظف ثم تأكيد صرف جركن الزيت.
                </p>
              </div>
              <div className='flex items-center justify-center gap-2 pt-2'>
                <Badge variant='outline' className='gap-1.5 rounded-full px-3 py-1.5 text-[10px] sm:text-xs'>
                  <Icons.qrCode className='text-emerald-500 size-3.5' />
                  <span>مسح سريع</span>
                </Badge>
                <Badge variant='outline' className='gap-1.5 rounded-full px-3 py-1.5 text-[10px] sm:text-xs'>
                  <Icons.search className='text-blue-500 size-3.5' />
                  <span>بحث يدوي</span>
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onSelectEmployee={handleScannerSelect}
      />
    </PageContainer>
  );
}

function EmployeeAvatar({ emp, className }: { emp: Employee; className?: string }) {
  return (
    <div
      className={cn(
        'bg-muted flex shrink-0 items-center justify-center overflow-hidden border',
        className ?? 'size-10 rounded-xl'
      )}
    >
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
