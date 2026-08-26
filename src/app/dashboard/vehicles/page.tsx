'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { NativeSelect } from '@/components/ui/native-select';
import { Icons } from '@/components/icons';
import { vehicleApi } from '@/lib/aams/services';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import type { Vehicle } from '@/types/aams';
import Link from 'next/link';
import { useLocale } from '@/components/layout/locale-provider';

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const { t, dir } = useLocale();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [oilChangingVehicle, setOilChangingVehicle] = useState<Vehicle | null>(null);

  // Form State
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [brand, setBrand] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [keyNumber, setKeyNumber] = useState('');
  const [currentKm, setCurrentKm] = useState('');
  const [lastOilKm, setLastOilKm] = useState('');
  const [vehicleStatus, setVehicleStatus] = useState('AVAILABLE');
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useOfflineQuery<{ data: Vehicle[]; total: number }>({
    queryKey: ['vehicles-list'],
    queryFn: () => vehicleApi.getAll({ limit: 500 }),
    cacheKey: 'vehicles_cache',
    staleTime: 1000 * 30
  });

  const vehicles = data?.data || [];

  // Metrics
  const metrics = useMemo(() => {
    const total = vehicles.length;
    const inUse = vehicles.filter((v) => v.status === 'IN_USE').length;
    const available = vehicles.filter((v) => v.status === 'AVAILABLE').length;
    const maintenance = vehicles.filter((v) => v.status === 'MAINTENANCE').length;
    const needsOil = vehicles.filter((v) => v.needs_oil_change).length;
    return { total, inUse, available, maintenance, needsOil };
  }, [vehicles]);

  // Filtered List
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (statusFilter === 'AVAILABLE' && v.status !== 'AVAILABLE') return false;
      if (statusFilter === 'IN_USE' && v.status !== 'IN_USE') return false;
      if (statusFilter === 'MAINTENANCE' && v.status !== 'MAINTENANCE') return false;
      if (statusFilter === 'NEEDS_OIL' && !v.needs_oil_change) return false;

      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const plate = v.plate_number?.toLowerCase() || '';
        const br = v.brand?.toLowerCase() || '';
        const key = v.key_number?.toLowerCase() || '';
        const n = v.notes?.toLowerCase() || '';
        return plate.includes(query) || br.includes(query) || key.includes(query) || n.includes(query);
      }
      return true;
    });
  }, [vehicles, statusFilter, search]);

  const createMutation = useMutation({
    mutationFn: (newVehicle: Partial<Vehicle>) => vehicleApi.create(newVehicle),
    onSuccess: () => {
      toast.success('تمت إضافة الدباب/المركبة بنجاح');
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['vehicles-list'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'فشل في حفظ المركبة');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Vehicle> }) =>
      vehicleApi.update(id, updates),
    onSuccess: () => {
      toast.success('تم تحديث بيانات الدباب بنجاح');
      setEditingVehicle(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['vehicles-list'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'فشل في تحديث المركبة');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vehicleApi.delete(id),
    onSuccess: () => {
      toast.success('تم حذف الدباب بنجاح');
      queryClient.invalidateQueries({ queryKey: ['vehicles-list'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'فشل في حذف المركبة');
    }
  });

  const oilChangeMutation = useMutation({
    mutationFn: (id: string) => vehicleApi.recordOilChange(id),
    onSuccess: () => {
      toast.success('تم تسجيل تغيير الزيت وتصفير العداد بنجاح');
      setOilChangingVehicle(null);
      queryClient.invalidateQueries({ queryKey: ['vehicles-list'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'فشل في تسجيل تغيير الزيت');
    }
  });

  function resetForm() {
    setPlateNumber('');
    setVehicleType('motorcycle');
    setBrand('');
    setModelYear('');
    setKeyNumber('');
    setCurrentKm('');
    setLastOilKm('');
    setVehicleStatus('AVAILABLE');
    setNotes('');
  }

  function handleOpenEdit(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
    setPlateNumber(vehicle.plate_number || '');
    setVehicleType(vehicle.vehicle_type || 'motorcycle');
    setBrand(vehicle.brand || '');
    setModelYear(vehicle.model_year || '');
    setKeyNumber(vehicle.key_number || '');
    setCurrentKm(String(vehicle.current_km ?? ''));
    setLastOilKm(String(vehicle.last_oil_change_km ?? ''));
    setVehicleStatus(vehicle.status || 'AVAILABLE');
    setNotes(vehicle.notes || '');
  }

  function handleSubmitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!plateNumber.trim()) {
      toast.error('رقم اللوحة / الدباب مطلوب');
      return;
    }

    createMutation.mutate({
      plate_number: plateNumber.trim(),
      vehicle_type: vehicleType,
      brand: brand.trim(),
      model_year: modelYear.trim(),
      key_number: keyNumber.trim(),
      current_km: parseFloat(currentKm) || 0,
      last_oil_change_km: parseFloat(lastOilKm) || 0,
      notes: notes.trim()
    });
  }

  function handleSubmitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingVehicle) return;

    updateMutation.mutate({
      id: editingVehicle.id,
      updates: {
        plate_number: plateNumber.trim(),
        vehicle_type: vehicleType,
        brand: brand.trim(),
        model_year: modelYear.trim(),
        key_number: keyNumber.trim(),
        current_km: parseFloat(currentKm) || 0,
        last_oil_change_km: parseFloat(lastOilKm) || 0,
        status: vehicleStatus,
        notes: notes.trim()
      }
    });
  }

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col gap-6' dir='rtl'>
        {/* Page Header */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>إدارة الدبابات والمركبات 🛵</h1>
            <p className='text-muted-foreground text-sm mt-1'>
              إدارة أسطول الدبابات والثوابت، تتبع عدادات الكيلومترات المشتركة وتنبيهات غيار الزيت والصيانة
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className='gap-2 shadow-xs'
          >
            <Icons.add className='size-4' />
            إضافة دباب جديد
          </Button>
        </div>

        {/* Stats Row */}
        <div className='grid grid-cols-2 gap-4 lg:grid-cols-5'>
          <Card className='shadow-xs'>
            <CardHeader className='flex-row items-center justify-between pb-2 space-y-0'>
              <CardDescription className='text-xs'>إجمالي الأسطول</CardDescription>
              <div className='bg-primary/10 text-primary p-2 rounded-lg'>
                <Icons.bike className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <p className='text-2xl font-bold tabular-nums'>{metrics.total}</p>
              <p className='text-muted-foreground text-xs mt-1'>مركبة مسجلة</p>
            </CardContent>
          </Card>

          <Card className='shadow-xs border-emerald-500/30 bg-emerald-500/5'>
            <CardHeader className='flex-row items-center justify-between pb-2 space-y-0'>
              <CardDescription className='text-xs'>متاحة للعمل</CardDescription>
              <div className='bg-emerald-500/10 text-emerald-600 p-2 rounded-lg'>
                <Icons.circleCheck className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <p className='text-2xl font-bold text-emerald-600 tabular-nums'>{metrics.available}</p>
              <p className='text-muted-foreground text-xs mt-1'>جاهزة للاستخدام</p>
            </CardContent>
          </Card>

          <Card className='shadow-xs border-blue-500/30 bg-blue-500/5'>
            <CardHeader className='flex-row items-center justify-between pb-2 space-y-0'>
              <CardDescription className='text-xs'>في الميدان الآن</CardDescription>
              <div className='bg-blue-500/10 text-blue-600 p-2 rounded-lg'>
                <Icons.play className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <p className='text-2xl font-bold text-blue-600 tabular-nums'>{metrics.inUse}</p>
              <p className='text-muted-foreground text-xs mt-1'>شفتات جارية</p>
            </CardContent>
          </Card>

          <Card className='shadow-xs border-amber-500/30 bg-amber-500/5'>
            <CardHeader className='flex-row items-center justify-between pb-2 space-y-0'>
              <CardDescription className='text-xs'>في الصيانة</CardDescription>
              <div className='bg-amber-500/10 text-amber-600 p-2 rounded-lg'>
                <Icons.wrench className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <p className='text-2xl font-bold text-amber-600 tabular-nums'>{metrics.maintenance}</p>
              <p className='text-muted-foreground text-xs mt-1'>تحت الصيانة</p>
            </CardContent>
          </Card>

          <Card className='shadow-xs border-destructive/30 bg-destructive/5'>
            <CardHeader className='flex-row items-center justify-between pb-2 space-y-0'>
              <CardDescription className='text-xs'>تحتاج غيار زيت</CardDescription>
              <div className='bg-destructive/10 text-destructive p-2 rounded-lg'>
                <Icons.droplet className='size-4' />
              </div>
            </CardHeader>
            <CardContent>
              <p className='text-2xl font-bold text-destructive tabular-nums'>{metrics.needsOil}</p>
              <p className='text-muted-foreground text-xs mt-1'>تجاوزت المسافة</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Actions Bar */}
        <Card className='shadow-xs'>
          <CardContent className='p-4 space-y-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              {/* Search Bar */}
              <div className='relative flex-1 max-w-md'>
                <Icons.search className='text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 size-4' />
                <Input
                  placeholder='بحث برقم الدباب، الماركة، رقم المفتاح...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className='pr-9'
                />
              </div>

              {/* Status Filter Buttons */}
              <div className='flex flex-wrap items-center gap-1.5'>
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'AVAILABLE', label: 'متاح' },
                  { id: 'IN_USE', label: 'في شفت' },
                  { id: 'MAINTENANCE', label: 'صيانة' },
                  { id: 'NEEDS_OIL', label: 'يحتاج زيت ⚠️' }
                ].map((tab) => (
                  <Button
                    key={tab.id}
                    variant={statusFilter === tab.id ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setStatusFilter(tab.id)}
                    className='text-xs h-8'
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Vehicles Table */}
            <div className='rounded-lg border overflow-hidden'>
              <Table>
                <TableHeader className='bg-muted/50'>
                  <TableRow>
                    <TableHead className='text-right'>رقم الدباب / اللوحة</TableHead>
                    <TableHead className='text-right'>النوع والماركة</TableHead>
                    <TableHead className='text-right'>رقم المفتاح</TableHead>
                    <TableHead className='text-right'>العداد الحالي</TableHead>
                    <TableHead className='text-right'>حالة الزيت</TableHead>
                    <TableHead className='text-right'>الحالة التشغيلية</TableHead>
                    <TableHead className='text-center'>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className='h-32 text-center'>
                        <div className='flex flex-col items-center justify-center gap-2'>
                          <Icons.spinner className='size-6 animate-spin text-primary' />
                          <span className='text-sm text-muted-foreground'>جاري تحميل أسطول الدبابات...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredVehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className='h-32 text-center text-muted-foreground'>
                        لا توجد دبابات أو مركبات مطابقة لمعايير البحث
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVehicles.map((vehicle) => {
                      const drivenSinceOil = Math.max(0, vehicle.current_km - vehicle.last_oil_change_km);
                      const isOilWarning = vehicle.needs_oil_change;

                      return (
                        <TableRow key={vehicle.id} className='hover:bg-muted/40 transition-colors'>
                          {/* Plate Number */}
                          <TableCell className='font-bold font-mono text-base text-foreground'>
                            <div className='flex items-center gap-2'>
                              <div className='bg-primary/10 text-primary p-1.5 rounded-md'>
                                {vehicle.vehicle_type === 'car' ? (
                                  <Icons.truck className='size-4' />
                                ) : (
                                  <Icons.bike className='size-4' />
                                )}
                              </div>
                              <span className='font-mono font-bold text-foreground'>
                                {vehicle.plate_number}
                              </span>
                            </div>
                          </TableCell>

                          {/* Brand & Type */}
                          <TableCell>
                            <div>
                              <p className='font-medium text-sm text-foreground'>
                                {vehicle.brand || (vehicle.vehicle_type === 'car' ? 'سيارة' : 'دراجة نارية')}
                              </p>
                              {vehicle.model_year && (
                                <p className='text-xs text-muted-foreground font-mono'>
                                  موديل {vehicle.model_year}
                                </p>
                              )}
                            </div>
                          </TableCell>

                          {/* Key Number */}
                          <TableCell className='font-mono text-sm'>
                            {vehicle.key_number ? (
                              <Badge variant='outline' className='font-mono'>
                                🔑 {vehicle.key_number}
                              </Badge>
                            ) : (
                              <span className='text-muted-foreground text-xs'>—</span>
                            )}
                          </TableCell>

                          {/* Current Odometer */}
                          <TableCell>
                            <div className='font-mono font-bold text-foreground'>
                              {vehicle.current_km.toLocaleString('en-US')}{' '}
                              <span className='text-xs font-normal text-muted-foreground'>كم</span>
                            </div>
                            <div className='text-[10px] text-muted-foreground font-mono'>
                              المسافة الكلية: {vehicle.total_distance.toLocaleString('en-US')} كم
                            </div>
                          </TableCell>

                          {/* Oil Status */}
                          <TableCell>
                            <div className='space-y-1'>
                              {isOilWarning ? (
                                <Badge variant='destructive' className='text-[11px] font-medium gap-1'>
                                  <Icons.warning className='size-3' />
                                  يجب غيار الزيت! ({drivenSinceOil.toLocaleString('en-US')} كم)
                                </Badge>
                              ) : (
                                <div className='flex items-center gap-1.5'>
                                  <Badge variant='outline' className='text-xs font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/20'>
                                    باقي {Math.round(vehicle.remaining_oil_km || 0)} كم
                                  </Badge>
                                </div>
                              )}
                              <p className='text-[10px] text-muted-foreground font-mono'>
                                آخر تغيير: {vehicle.last_oil_change_km.toLocaleString('en-US')} كم
                              </p>
                            </div>
                          </TableCell>

                          {/* Operational Status */}
                          <TableCell>
                            {vehicle.status === 'IN_USE' ? (
                              <Badge variant='secondary' className='bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1'>
                                <span className='size-1.5 rounded-full bg-blue-500 animate-pulse' />
                                قيد العمل (في شفت)
                              </Badge>
                            ) : vehicle.status === 'MAINTENANCE' ? (
                              <Badge variant='outline' className='bg-amber-500/10 text-amber-600 border-amber-500/20'>
                                في الصيانة
                              </Badge>
                            ) : (
                              <Badge variant='outline' className='bg-emerald-500/10 text-emerald-600 border-emerald-500/20'>
                                متاح للاستخدام
                              </Badge>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className='text-center'>
                            <div className='flex items-center justify-center gap-1'>
                              {/* Oil Change Button */}
                              <Button
                                size='sm'
                                variant={isOilWarning ? 'destructive' : 'ghost'}
                                onClick={() => setOilChangingVehicle(vehicle)}
                                title='تسجيل تغيير زيت وتصفير العداد'
                                className='h-8 px-2 text-xs gap-1'
                              >
                                <Icons.droplet className='size-3.5' />
                                <span className='hidden xl:inline'>غيار زيت</span>
                              </Button>

                              {/* Edit Button */}
                              <Button
                                size='icon'
                                variant='ghost'
                                onClick={() => handleOpenEdit(vehicle)}
                                className='size-8 text-muted-foreground hover:text-foreground'
                                title='تعديل'
                              >
                                <Icons.edit className='size-3.5' />
                              </Button>

                              {/* Delete Button */}
                              <Button
                                size='icon'
                                variant='ghost'
                                onClick={() => {
                                  if (confirm(`هل أنت متأكد من حذف الدباب رقم ${vehicle.plate_number}؟`)) {
                                    deleteMutation.mutate(vehicle.id);
                                  }
                                }}
                                className='size-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10'
                                title='حذف'
                              >
                                <Icons.trash className='size-3.5' />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create Vehicle Sheet */}
        <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <SheetContent className='w-full sm:max-w-md overflow-y-auto' dir='rtl'>
            <SheetHeader>
              <SheetTitle className='text-lg font-bold flex items-center gap-2'>
                <Icons.bike className='size-5 text-primary' />
                إضافة دباب / مركبة جديدة
              </SheetTitle>
              <SheetDescription className='text-xs'>
                سجل بيانات الدباب أو المركبة لتتبع عداد الكيلومترات بين المناديب تلقائياً
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSubmitCreate} className='space-y-4 pt-2'>
              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1'>
                  <label className='text-xs font-medium'>رقم اللوحة / الدباب *</label>
                  <Input
                    placeholder='مثال: 2565 أو 1234 أ ب ج'
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    required
                    className='font-mono'
                  />
                </div>

                <div className='space-y-1'>
                  <label className='text-xs font-medium'>نوع المركبة</label>
                  <NativeSelect
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className='w-full'
                  >
                    <option value='motorcycle'>دراجة نارية (دباب)</option>
                    <option value='car'>سيارة</option>
                  </NativeSelect>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1'>
                  <label className='text-xs font-medium'>الماركة / الشركة</label>
                  <Input
                    placeholder='مثال: هوندا، ياماها، سوزوكي'
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>

                <div className='space-y-1'>
                  <label className='text-xs font-medium'>سنة الصنع (الموديل)</label>
                  <Input
                    placeholder='مثال: 2024'
                    value={modelYear}
                    onChange={(e) => setModelYear(e.target.value)}
                    className='font-mono'
                  />
                </div>
              </div>

              <div className='grid grid-cols-3 gap-3'>
                <div className='space-y-1'>
                  <label className='text-xs font-medium'>رقم المفتاح</label>
                  <Input
                    placeholder='مثال: K-12'
                    value={keyNumber}
                    onChange={(e) => setKeyNumber(e.target.value)}
                    className='font-mono'
                  />
                </div>

                <div className='space-y-1'>
                  <label className='text-xs font-medium'>العداد الحالي (كم)</label>
                  <Input
                    type='number'
                    step='any'
                    placeholder='123456'
                    value={currentKm}
                    onChange={(e) => setCurrentKm(e.target.value)}
                    className='font-mono'
                  />
                </div>

                <div className='space-y-1'>
                  <label className='text-xs font-medium'>عداد آخر زيت (كم)</label>
                  <Input
                    type='number'
                    step='any'
                    placeholder='123000'
                    value={lastOilKm}
                    onChange={(e) => setLastOilKm(e.target.value)}
                    className='font-mono'
                  />
                </div>
              </div>

              <div className='space-y-1'>
                <label className='text-xs font-medium'>ملاحظات</label>
                <Input
                  placeholder='أي تفاصيل أو ملاحظات خاصة بالمركبة...'
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <SheetFooter className='gap-2 sm:gap-0 pt-6 mt-auto'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setIsCreateOpen(false)}
                  disabled={createMutation.isPending}
                  className='w-full'
                >
                  إلغاء
                </Button>
                <Button type='submit' disabled={createMutation.isPending} className='w-full'>
                  {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الدباب'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        {/* Edit Vehicle Dialog */}
        <Dialog open={!!editingVehicle} onOpenChange={(open) => !open && setEditingVehicle(null)}>
          <DialogContent className='sm:max-w-[480px]' dir='rtl'>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold flex items-center gap-2'>
                <Icons.edit className='size-5 text-primary' />
                تعديل بيانات الدباب ({editingVehicle?.plate_number})
              </DialogTitle>
              <DialogDescription className='text-xs'>
                تعديل مواصفات الدباب، قراءة العداد، أو الحالة التشغيلية
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitEdit} className='space-y-4 pt-2'>
              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1'>
                  <label className='text-xs font-medium'>رقم اللوحة / الدباب *</label>
                  <Input
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    required
                    className='font-mono'
                  />
                </div>

                <div className='space-y-1'>
                  <label className='text-xs font-medium'>الحالة التشغيلية</label>
                  <NativeSelect
                    value={vehicleStatus}
                    onChange={(e) => setVehicleStatus(e.target.value)}
                    className='w-full'
                  >
                    <option value='AVAILABLE'>متاح للاستخدام</option>
                    <option value='IN_USE'>في شفت عمل</option>
                    <option value='MAINTENANCE'>في الصيانة</option>
                  </NativeSelect>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1'>
                  <label className='text-xs font-medium'>الماركة</label>
                  <Input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>

                <div className='space-y-1'>
                  <label className='text-xs font-medium'>الموديل</label>
                  <Input
                    value={modelYear}
                    onChange={(e) => setModelYear(e.target.value)}
                    className='font-mono'
                  />
                </div>
              </div>

              <div className='grid grid-cols-3 gap-3'>
                <div className='space-y-1'>
                  <label className='text-xs font-medium'>رقم المفتاح</label>
                  <Input
                    value={keyNumber}
                    onChange={(e) => setKeyNumber(e.target.value)}
                    className='font-mono'
                  />
                </div>

                <div className='space-y-1'>
                  <label className='text-xs font-medium'>العداد الحالي (كم)</label>
                  <Input
                    type='number'
                    step='any'
                    value={currentKm}
                    onChange={(e) => setCurrentKm(e.target.value)}
                    className='font-mono'
                  />
                </div>

                <div className='space-y-1'>
                  <label className='text-xs font-medium'>عداد آخر زيت (كم)</label>
                  <Input
                    type='number'
                    step='any'
                    value={lastOilKm}
                    onChange={(e) => setLastOilKm(e.target.value)}
                    className='font-mono'
                  />
                </div>
              </div>

              <div className='space-y-1'>
                <label className='text-xs font-medium'>ملاحظات</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <DialogFooter className='gap-2 sm:gap-0 pt-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setEditingVehicle(null)}
                  disabled={updateMutation.isPending}
                >
                  إلغاء
                </Button>
                <Button type='submit' disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'جاري التحديث...' : 'حفظ التعديلات'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Oil Change Confirmation Modal */}
        <Dialog open={!!oilChangingVehicle} onOpenChange={(open) => !open && setOilChangingVehicle(null)}>
          <DialogContent className='sm:max-w-[420px]' dir='rtl'>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold flex items-center gap-2 text-destructive'>
                <Icons.droplet className='size-5' />
                تسجيل غيار زيت للدباب ({oilChangingVehicle?.plate_number})
              </DialogTitle>
              <DialogDescription className='text-xs'>
                سيتم تصفير عداد الزيت وتعيين قراءة آخر غيار زيت لتكون مساوية للعداد الحالي ({oilChangingVehicle?.current_km.toLocaleString('en-US')} كم).
              </DialogDescription>
            </DialogHeader>

            <div className='bg-muted/40 p-4 rounded-xl border space-y-2 text-xs'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>العداد الحالي للدباب:</span>
                <span className='font-mono font-bold'>{oilChangingVehicle?.current_km.toLocaleString('en-US')} كم</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>المسافة المقطوعة منذ آخر غيار:</span>
                <span className='font-mono font-bold text-destructive'>
                  {Math.max(0, (oilChangingVehicle?.current_km || 0) - (oilChangingVehicle?.last_oil_change_km || 0)).toLocaleString('en-US')} كم
                </span>
              </div>
            </div>

            <DialogFooter className='gap-2 sm:gap-0 pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOilChangingVehicle(null)}
                disabled={oilChangeMutation.isPending}
              >
                إلغاء
              </Button>
              <Button
                type='button'
                variant='destructive'
                onClick={() => oilChangingVehicle && oilChangeMutation.mutate(oilChangingVehicle.id)}
                disabled={oilChangeMutation.isPending}
                className='gap-1.5'
              >
                {oilChangeMutation.isPending ? (
                  <Icons.spinner className='size-4 animate-spin' />
                ) : (
                  <Icons.droplet className='size-4' />
                )}
                تأكيد غيار الزيت
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
