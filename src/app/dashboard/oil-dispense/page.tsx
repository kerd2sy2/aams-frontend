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
import { Label } from '@/components/ui/label';
import { BarcodeScannerModal } from '@/components/aams/barcode-scanner-modal';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { inventoryApi, vehicleApi } from '@/lib/aams/services';
import type { Vehicle, InventoryItem } from '@/types/aams';

function errorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { error?: string; message?: string } };
    message?: string;
  };
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;
}

export default function OilDispensePage() {
  const queryClient = useQueryClient();
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [customKM, setCustomKM] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // Search vehicles (by plate_number, brand, key_number)
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['vehicles-search', vehicleSearch],
    queryFn: () => vehicleApi.getAll({ search: vehicleSearch.trim(), limit: 10 }),
    enabled: vehicleSearch.trim().length >= 1,
    staleTime: 1000 * 20
  });

  // Get available oil items in inventory
  const { data: oilItems, isLoading: loadingOilItems } = useQuery<InventoryItem[]>({
    queryKey: ['inventory-oil-items'],
    queryFn: () => inventoryApi.getItems('oil'),
    staleTime: 1000 * 60
  });

  // When a vehicle is selected, initialize the custom KM with vehicle's current_km
  const handleSelectVehicle = useCallback((veh: Vehicle) => {
    setSelectedVehicle(veh);
    setVehicleSearch('');
    setCustomKM(veh.current_km ? String(veh.current_km) : '');
    setNotes('');
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedVehicle(null);
    setVehicleSearch('');
    setCustomKM('');
    setNotes('');
  }, []);

  // Calculate oil metrics
  const effectiveCurrentKM = parseFloat(customKM) || selectedVehicle?.current_km || 0;
  const lastOilKM = selectedVehicle?.last_oil_change_km || 0;
  const distanceSinceOil = Math.max(0, effectiveCurrentKM - lastOilKM);
  const oilInterval = selectedVehicle?.vehicle_type === 'car' ? 10000 : 950;
  const oilWarningThreshold = Math.round(oilInterval * 0.85);
  const isOilNeeded = distanceSinceOil >= oilInterval;
  const isOilApproaching = !isOilNeeded && distanceSinceOil >= oilWarningThreshold;
  const progressPercentage = Math.min(100, Math.round((distanceSinceOil / oilInterval) * 100));

  // Dispense oil mutation
  const dispenseOilMut = useMutation({
    mutationFn: () => {
      if (!selectedVehicle) {
        throw new Error('يرجى اختيار الدباب أولاً');
      }
      return inventoryApi.dispenseOil({
        vehicle_id: selectedVehicle.id,
        plate_number: selectedVehicle.plate_number,
        current_km: effectiveCurrentKM,
        quantity: 1,
        item_id: selectedItemId || undefined,
        notes: notes.trim() || undefined,
        branch_id: selectedVehicle.branch_id || undefined
      });
    },
    onSuccess: () => {
      toast.success(
        `تم صرف الزيت وتحديث عداد الدباب (${selectedVehicle?.plate_number}) وخصمه من المخزن بنجاح`
      );
      // Update selected vehicle in-place
      if (selectedVehicle) {
        setSelectedVehicle({
          ...selectedVehicle,
          current_km: effectiveCurrentKM,
          last_oil_change_km: effectiveCurrentKM,
          needs_oil_change: false,
          remaining_oil_km: oilInterval
        });
      }
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-list'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-search'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-oil-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
    },
    onError: (err) => {
      toast.error(errorMessage(err, 'حدث خطأ أثناء صرف الزيت'));
    }
  });

  return (
    <PageContainer
      pageTitle='صرف غيار الزيت للدبابات'
      pageDescription='البحث بالدباب وصرف زيت المحرك وتحديث قراءة العداد والخصم من المخزن'
    >
      <div className='flex flex-col gap-5'>
        {/* Search & Scan Card */}
        <Card className='border-border/60 shadow-sm'>
          <CardContent className='space-y-4 p-4 sm:p-5'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
              <div className='relative flex-1'>
                <Icons.bike className='text-muted-foreground pointer-events-none absolute top-1/2 size-5 -translate-y-1/2 start-3.5' />
                <Input
                  type='text'
                  placeholder='ابحث برقم اللوحة / الدباب أو رقم المفتاح أو الماركة...'
                  value={vehicleSearch}
                  onChange={(e) => {
                    setVehicleSearch(e.target.value);
                    if (selectedVehicle) setSelectedVehicle(null);
                  }}
                  className='h-12 ps-11 pe-10 text-base font-medium'
                />
                {vehicleSearch && (
                  <button
                    type='button'
                    onClick={() => {
                      setVehicleSearch('');
                      setSelectedVehicle(null);
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
                className='h-12 gap-2 px-5 font-semibold'
              >
                <Icons.qrCode className='size-5' />
                <span>مسح باركود / QR</span>
              </Button>
            </div>

            {/* Search Results Dropdown */}
            {vehicleSearch.trim().length >= 1 && !selectedVehicle && (
              <div className='bg-card border-border overflow-hidden rounded-xl border shadow-lg'>
                {isSearching ? (
                  <div className='flex items-center justify-center py-8'>
                    <Icons.spinner className='text-muted-foreground size-6 animate-spin' />
                  </div>
                ) : searchResults?.data && searchResults.data.length > 0 ? (
                  <div className='divide-border divide-y'>
                    {searchResults.data.map((veh) => {
                      const vehDist = Math.max(
                        0,
                        (veh.current_km || 0) - (veh.last_oil_change_km || 0)
                      );
                      const vehInterval = veh.vehicle_type === 'car' ? 10000 : 950;
                      const vehNeedsOil = vehDist >= vehInterval;

                      return (
                        <button
                          key={veh.id}
                          type='button'
                          onClick={() => handleSelectVehicle(veh)}
                          className='hover:bg-muted/70 flex w-full items-center justify-between gap-4 p-4 text-right transition-colors'
                        >
                          <div className='flex items-center gap-3.5'>
                            <div className='bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl'>
                              <Icons.bike className='size-6' />
                            </div>
                            <div className='min-w-0'>
                              <div className='flex items-center gap-2'>
                                <span className='font-mono text-base font-bold tracking-wider'>
                                  {veh.plate_number}
                                </span>
                                {veh.brand && (
                                  <Badge variant='outline' className='text-xs'>
                                    {veh.brand} {veh.model_year || ''}
                                  </Badge>
                                )}
                              </div>
                              <div className='text-muted-foreground flex flex-wrap items-center gap-3 text-xs mt-1'>
                                {veh.key_number && (
                                  <span className='flex items-center gap-1 font-mono'>
                                    <Icons.key className='size-3' />
                                    مفتاح: {veh.key_number}
                                  </span>
                                )}
                                <span className='font-mono'>
                                  العداد: {(veh.current_km || 0).toLocaleString('en-US')} كم
                                </span>
                                {veh.branch?.name && (
                                  <span className='text-muted-foreground/80'>
                                    ({veh.branch.name})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className='flex shrink-0 items-center gap-2'>
                            <Badge
                              variant={vehNeedsOil ? 'destructive' : 'secondary'}
                              className='text-xs'
                            >
                              {vehNeedsOil ? 'يحتاج تغيير زيت' : 'الزيت جيد'}
                            </Badge>
                            <Icons.chevronLeft className='text-muted-foreground size-5' />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className='text-muted-foreground py-6 text-center text-sm'>
                    لا توجد نتائج بحث مطابقة
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Vehicle State */}
        {selectedVehicle ? (
          <Card className='border-border/80 shadow-md'>
            <CardContent className='space-y-6 p-5 sm:p-6'>
              {/* Vehicle Header Card */}
              <div className='flex flex-wrap items-start justify-between gap-4'>
                <div className='flex items-center gap-4'>
                  <div className='bg-primary/10 text-primary flex size-16 shrink-0 items-center justify-center rounded-2xl'>
                    <Icons.bike className='size-8' />
                  </div>
                  <div>
                    <div className='flex flex-wrap items-center gap-2.5'>
                      <h2 className='font-mono text-2xl font-black tracking-wider'>
                        {selectedVehicle.plate_number}
                      </h2>
                      <Badge variant='secondary' className='text-xs font-semibold'>
                        {selectedVehicle.brand || 'دباب'} {selectedVehicle.model_year || ''}
                      </Badge>
                      <Badge
                        variant={
                          selectedVehicle.status === 'AVAILABLE'
                            ? 'default'
                            : selectedVehicle.status === 'MAINTENANCE'
                              ? 'destructive'
                              : 'outline'
                        }
                        className='text-xs'
                      >
                        {selectedVehicle.status === 'AVAILABLE'
                          ? 'متاح'
                          : selectedVehicle.status === 'MAINTENANCE'
                            ? 'في الصيانة'
                            : 'قيد الاستخدام'}
                      </Badge>
                    </div>
                    <div className='text-muted-foreground flex flex-wrap items-center gap-3 text-xs mt-1.5'>
                      {selectedVehicle.key_number && (
                        <span className='flex items-center gap-1 font-mono font-medium'>
                          <Icons.key className='size-3.5 text-amber-500' />
                          رقم المفتاح: {selectedVehicle.key_number}
                        </span>
                      )}
                      {selectedVehicle.branch?.name && (
                        <span className='flex items-center gap-1'>
                          الفرع: {selectedVehicle.branch.name}
                        </span>
                      )}
                    </div>
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
                  <Icons.close className='size-5' />
                </Button>
              </div>

              {/* Oil Overdue Banner */}
              {isOilNeeded && (
                <div className='bg-destructive/10 border-destructive/30 flex items-center gap-3.5 rounded-2xl border-2 p-4 text-destructive'>
                  <Icons.warning className='size-6 shrink-0' />
                  <div className='min-w-0'>
                    <p className='text-sm font-black'>
                      تنبيه: الدباب تجاوز موعد غيار الزيت ({oilInterval.toLocaleString('en-US')}{' '}
                      كم)!
                    </p>
                    <p className='text-xs opacity-90 mt-0.5'>
                      المسافة المقطوعة منذ آخر غيار زيت:{' '}
                      <span className='font-mono font-bold'>
                        {distanceSinceOil.toLocaleString('en-US')} كم
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* 3-Column Stats Grid */}
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3.5'>
                {/* Total / Current Distance */}
                <div className='bg-muted/40 border-border/70 space-y-1.5 rounded-2xl border p-4 text-center'>
                  <Icons.gauge className='text-blue-600 dark:text-blue-400 mx-auto size-5' />
                  <p className='text-muted-foreground text-xs font-medium'>العداد الحالي للدباب</p>
                  <p className='text-blue-700 dark:text-blue-300 font-mono text-xl font-black'>
                    {effectiveCurrentKM.toLocaleString('en-US')}
                  </p>
                  <p className='text-muted-foreground text-[11px]'>كيلومتر</p>
                </div>

                {/* Distance Since Last Oil */}
                <div
                  className={cn(
                    'space-y-1.5 rounded-2xl border p-4 text-center',
                    isOilNeeded
                      ? 'bg-destructive/10 border-destructive/30'
                      : isOilApproaching
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-emerald-500/10 border-emerald-500/30'
                  )}
                >
                  <Icons.droplet
                    className={cn(
                      'mx-auto size-5',
                      isOilNeeded
                        ? 'text-destructive'
                        : isOilApproaching
                          ? 'text-amber-500'
                          : 'text-emerald-500'
                    )}
                  />
                  <p className='text-muted-foreground text-xs font-medium'>
                    المسافة منذ آخر غيار زيت
                  </p>
                  <p
                    className={cn(
                      'font-mono text-xl font-black',
                      isOilNeeded
                        ? 'text-destructive'
                        : isOilApproaching
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {distanceSinceOil.toLocaleString('en-US')}
                  </p>
                  <p className='text-muted-foreground text-[11px]'>
                    من أصل {oilInterval.toLocaleString('en-US')} كم
                  </p>
                </div>

                {/* Oil Status Badge */}
                <div
                  className={cn(
                    'flex flex-col items-center justify-center space-y-2 rounded-2xl border p-4 text-center',
                    isOilNeeded
                      ? 'bg-destructive/10 border-destructive/30'
                      : isOilApproaching
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-emerald-500/10 border-emerald-500/30'
                  )}
                >
                  {isOilNeeded ? (
                    <Icons.warning className='text-destructive size-6' />
                  ) : isOilApproaching ? (
                    <Icons.warning className='text-amber-500 size-6' />
                  ) : (
                    <Icons.circleCheck className='text-emerald-500 size-6' />
                  )}
                  <p className='text-muted-foreground text-xs font-medium'>حالة الزيت</p>
                  <Badge
                    variant={isOilNeeded ? 'destructive' : 'secondary'}
                    className='text-xs font-bold'
                  >
                    {isOilNeeded
                      ? 'يحتاج تغيير فوري'
                      : isOilApproaching
                        ? 'يقترب من الموعد'
                        : 'حالة الزيت جيدة'}
                  </Badge>
                </div>
              </div>

              {/* Progress Bar for Oil Life */}
              <div className='space-y-1.5'>
                <div className='flex justify-between text-xs text-muted-foreground'>
                  <span>استهلاك الزيت: {progressPercentage}%</span>
                  <span>الحد الأقصى: {oilInterval.toLocaleString('en-US')} كم</span>
                </div>
                <div className='bg-muted h-3 w-full overflow-hidden rounded-full'>
                  <div
                    className={cn(
                      'h-full transition-all duration-300',
                      isOilNeeded
                        ? 'bg-destructive'
                        : isOilApproaching
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    )}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              <Separator />

              {/* Dispense Details Form */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {/* Current KM Input */}
                <div className='space-y-2'>
                  <Label htmlFor='current-km' className='text-xs font-semibold'>
                    قراءة العداد الحالية (كم)
                  </Label>
                  <Input
                    id='current-km'
                    type='number'
                    min='0'
                    step='1'
                    value={customKM}
                    onChange={(e) => setCustomKM(e.target.value)}
                    placeholder='أدخل قراءة العداد الحالية...'
                    className='h-11 font-mono text-base font-semibold'
                  />
                  <p className='text-muted-foreground text-[11px]'>
                    قراءة العداد المسجلة:{' '}
                    {(selectedVehicle.current_km || 0).toLocaleString('en-US')} كم
                  </p>
                </div>

                {/* Available Oil Item in Inventory */}
                <div className='space-y-2'>
                  <Label htmlFor='oil-item' className='text-xs font-semibold'>
                    صنف الزيت المصروف من المخزن
                  </Label>
                  {loadingOilItems ? (
                    <div className='h-11 rounded-lg border bg-muted/40 animate-pulse' />
                  ) : oilItems && oilItems.length > 0 ? (
                    <select
                      id='oil-item'
                      value={selectedItemId}
                      onChange={(e) => setSelectedItemId(e.target.value)}
                      className='bg-background border-input ring-offset-background placeholder:text-muted-foreground focus:ring-ring flex h-11 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2'
                    >
                      <option value=''>صرف تلقائي من زيت المخزن المتاح</option>
                      {oilItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}{' '}
                          {item.quantity !== undefined ? `(المتاح: ${item.quantity})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className='bg-muted/40 text-muted-foreground flex h-11 items-center rounded-md border px-3 text-xs'>
                      صرف تلقائي من رصيد الزيت المتوفر
                    </div>
                  )}
                  <p className='text-muted-foreground text-[11px]'>
                    سيتم خصم 1 علبة/جركن زيت من رصيد المخزن تلقائياً
                  </p>
                </div>

                {/* Notes Input */}
                <div className='md:col-span-2 space-y-2'>
                  <Label htmlFor='notes' className='text-xs font-semibold'>
                    ملاحظات الصرف (اختياري)
                  </Label>
                  <Input
                    id='notes'
                    type='text'
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder='مثال: غيار زيت دوري / تبديل فلتر...'
                    className='h-11 text-sm'
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type='button'
                size='lg'
                disabled={dispenseOilMut.isPending}
                onClick={() => dispenseOilMut.mutate()}
                className='h-14 w-full gap-2.5 text-base font-bold shadow-md'
              >
                {dispenseOilMut.isPending ? (
                  <>
                    <Icons.spinner className='size-5 animate-spin' />
                    <span>جاري تسجيل وصرف الزيت وخصمه من المخزن...</span>
                  </>
                ) : (
                  <>
                    <Icons.droplet className='size-5' />
                    <span>تأكيد صرف وتغيير الزيت للدباب</span>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Empty State */
          <Card className='border-border/70 bg-muted/20 border-2 border-dashed text-center'>
            <CardContent className='space-y-4 p-8 sm:p-14'>
              <div className='bg-primary/10 text-primary mx-auto flex size-20 items-center justify-center rounded-3xl'>
                <Icons.bike className='size-10' />
              </div>
              <div className='space-y-2'>
                <h3 className='text-foreground/80 text-lg font-bold sm:text-xl'>
                  اختر الدباب لصرف وتغيير الزيت
                </h3>
                <p className='text-muted-foreground mx-auto max-w-md text-xs sm:text-sm leading-relaxed'>
                  استخدم شريط البحث أعلاه بالبحث برقم الدباب / اللوحة أو رقم المفتاح، أو اضغط على زر
                  &quot;مسح باركود / QR&quot; للتعرف الفوري على الدباب وتأكيد غيار الزيت وخصمه من
                  المخزن.
                </p>
              </div>
              <div className='flex items-center justify-center gap-3 pt-2'>
                <Badge variant='outline' className='gap-1.5 rounded-full px-3.5 py-1.5 text-xs'>
                  <Icons.qrCode className='text-emerald-500 size-4' />
                  <span>مسح سريع</span>
                </Badge>
                <Badge variant='outline' className='gap-1.5 rounded-full px-3.5 py-1.5 text-xs'>
                  <Icons.search className='text-blue-500 size-4' />
                  <span>بحث يدوي باللوحة أو المفتاح</span>
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Barcode / QR Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onSelectVehicle={handleSelectVehicle}
      />
    </PageContainer>
  );
}
