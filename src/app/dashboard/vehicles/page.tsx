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
import { Switch } from '@/components/ui/switch';
import { Icons } from '@/components/icons';
import { ImageUploader } from '@/components/aams/image-uploader';
import { vehicleApi, employeeApi, branchApi } from '@/lib/aams/services';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import type { Vehicle, Employee, Branch } from '@/types/aams';
import { EmployeeSearchSelect } from '@/components/aams/employee-search-select';
import Link from 'next/link';
import { useLocale } from '@/components/layout/locale-provider';

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const { t, dir } = useLocale();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [oilChangingVehicle, setOilChangingVehicle] = useState<Vehicle | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [previewFallbackTried, setPreviewFallbackTried] = useState(false);
  const [previewLoadError, setPreviewLoadError] = useState(false);

  const defaultBranchId = '0b52c83c-4a37-4950-8040-fcb00fa718b3';

  const backendBaseUrl = (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ||
    'https://api.kerd2sy.com'
  ).replace(/\/+$/, '');

  function resolveRegistrationImageUrl(rawUrl?: string, useDirectBackend = false): string {
    if (!rawUrl) return '';
    const trimmed = rawUrl.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      return trimmed;
    }

    // Extract /uploads/... if present in relative or full URL (also stripping accidental /api/v1 prefix)
    const uploadsMatch = trimmed.match(/(?:\/api\/v1)?(\/uploads\/[^\s?#]+)/i);
    if (uploadsMatch && uploadsMatch[1]) {
      const cleanUploadsPath = uploadsMatch[1];
      return useDirectBackend ? `${backendBaseUrl}${cleanUploadsPath}` : cleanUploadsPath;
    }

    if (trimmed.startsWith('uploads/')) {
      const cleanUploadsPath = `/${trimmed}`;
      return useDirectBackend ? `${backendBaseUrl}${cleanUploadsPath}` : cleanUploadsPath;
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    const normalizedPath = trimmed.startsWith('/')
      ? trimmed.replace(/^\/api\/v1(\/uploads\/)/i, '$1')
      : `/uploads/${trimmed}`;
    return useDirectBackend ? `${backendBaseUrl}${normalizedPath}` : normalizedPath;
  }

  // Form State
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [brand, setBrand] = useState('');
  const [modelYear, setModelYear] = useState('');
  const [keyNumber, setKeyNumber] = useState('');
  const [branchId, setBranchId] = useState<string>(defaultBranchId);
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string>('');
  const [currentKm, setCurrentKm] = useState('');
  const [lastOilKm, setLastOilKm] = useState('');
  const [isOdometerBroken, setIsOdometerBroken] = useState(false);
  const [registrationImage, setRegistrationImage] = useState('');
  const [vehicleStatus, setVehicleStatus] = useState('AVAILABLE');
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useOfflineQuery<{ data: Vehicle[]; total: number }>({
    queryKey: ['vehicles-list'],
    queryFn: () => vehicleApi.getAll({ limit: 500 }),
    cacheKey: 'vehicles_cache',
    staleTime: 1000 * 30
  });

  const vehicles = data?.data || [];

  // Branches & Employees
  const { data: branches = [] } = useOfflineQuery<Branch[]>({
    queryKey: ['branches-list'],
    queryFn: () => branchApi.getAll(),
    cacheKey: 'branches_cache',
    staleTime: 1000 * 60 * 10
  });

  const { data: employeesData } = useOfflineQuery<{ data: Employee[] }>({
    queryKey: ['all-employees-cache'],
    queryFn: () => employeeApi.getAll({ limit: 1000 }),
    cacheKey: 'employees_all',
    staleTime: 1000 * 60 * 5
  });

  const employees = employeesData?.data || [];

  function getBranchName(bId?: string | null): string {
    if (!bId) return 'الفرع الأول';
    const b = branches.find((item) => item.id === bId);
    return b ? b.name : 'الفرع الأول';
  }

  function getAssignedEmployee(plate: string): Employee | undefined {
    if (!plate) return undefined;
    const clean = plate.trim().toLowerCase();
    return employees.find(
      (emp) => emp.motorcycle_number && emp.motorcycle_number.trim().toLowerCase() === clean
    );
  }

  // Metrics
  const metrics = useMemo(() => {
    const total = vehicles.length;
    const inUse = vehicles.filter((v) => v.status === 'IN_USE').length;
    const available = vehicles.filter((v) => v.status === 'AVAILABLE').length;
    const maintenance = vehicles.filter((v) => v.status === 'MAINTENANCE').length;
    const needsOil = vehicles.filter((v) => v.needs_oil_change).length;
    return { total, inUse, available, maintenance, needsOil };
  }, [vehicles]);

  // Filtered & Sorted List (Sorted by Key Number naturally)
  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter((v) => {
        if (branchFilter !== 'all') {
          const vBranch = v.branch_id || defaultBranchId;
          if (vBranch !== branchFilter) return false;
        }

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
          const assigned = getAssignedEmployee(v.plate_number);
          const empName = assigned?.name?.toLowerCase() || '';
          return (
            plate.includes(query) ||
            br.includes(query) ||
            key.includes(query) ||
            n.includes(query) ||
            empName.includes(query)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const ka = a.key_number?.trim() || '';
        const kb = b.key_number?.trim() || '';
        if (!ka && !kb) return a.plate_number.localeCompare(b.plate_number);
        if (!ka) return 1;
        if (!kb) return -1;
        return ka.localeCompare(kb, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [vehicles, statusFilter, branchFilter, search, employees, defaultBranchId]);

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
      toast.success('تم تسجيل تغيير الزيت للدباب وخصمه من المخزن وتحديث العداد بنجاح');
      setOilChangingVehicle(null);
      queryClient.invalidateQueries({ queryKey: ['vehicles-list'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
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
    setBranchId(defaultBranchId);
    setAssignedEmployeeId('');
    setCurrentKm('');
    setLastOilKm('');
    setIsOdometerBroken(false);
    setRegistrationImage('');
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
    setBranchId(vehicle.branch_id || defaultBranchId);
    const assigned = getAssignedEmployee(vehicle.plate_number);
    setAssignedEmployeeId(assigned?.id || '');
    setCurrentKm(String(vehicle.current_km ?? ''));
    setLastOilKm(String(vehicle.last_oil_change_km ?? ''));
    setIsOdometerBroken(Boolean(vehicle.is_odometer_broken));
    setRegistrationImage(vehicle.registration_image || '');
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
      branch_id: branchId || defaultBranchId,
      current_km: parseFloat(currentKm) || 0,
      last_oil_change_km: parseFloat(lastOilKm) || 0,
      is_odometer_broken: isOdometerBroken,
      registration_image: registrationImage.trim(),
      notes: notes.trim()
    }, {
      onSuccess: async () => {
        if (assignedEmployeeId) {
          try {
            await employeeApi.update(assignedEmployeeId, {
              motorcycle_number: plateNumber.trim(),
              key_number: keyNumber.trim()
            });
            queryClient.invalidateQueries({ queryKey: ['all-employees-cache'] });
          } catch (err) {
            console.error('Failed to link employee to vehicle', err);
          }
        }
      }
    });
  }

  function handleSubmitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingVehicle) return;

    const cleanPlate = plateNumber.trim();
    const cleanKey = keyNumber.trim();

    updateMutation.mutate({
      id: editingVehicle.id,
      updates: {
        plate_number: cleanPlate,
        vehicle_type: vehicleType,
        brand: brand.trim(),
        model_year: modelYear.trim(),
        key_number: cleanKey,
        branch_id: branchId || defaultBranchId,
        current_km: parseFloat(currentKm) || 0,
        last_oil_change_km: parseFloat(lastOilKm) || 0,
        is_odometer_broken: isOdometerBroken,
        registration_image: registrationImage.trim(),
        status: vehicleStatus,
        notes: notes.trim()
      }
    }, {
      onSuccess: async () => {
        const prevAssigned = getAssignedEmployee(editingVehicle.plate_number);
        try {
          if (assignedEmployeeId && assignedEmployeeId !== prevAssigned?.id) {
            if (prevAssigned) {
              await employeeApi.update(prevAssigned.id, { motorcycle_number: '' });
            }
            await employeeApi.update(assignedEmployeeId, {
              motorcycle_number: cleanPlate,
              key_number: cleanKey
            });
            queryClient.invalidateQueries({ queryKey: ['all-employees-cache'] });
          } else if (!assignedEmployeeId && prevAssigned) {
            await employeeApi.update(prevAssigned.id, { motorcycle_number: '' });
            queryClient.invalidateQueries({ queryKey: ['all-employees-cache'] });
          } else if (assignedEmployeeId && prevAssigned && assignedEmployeeId === prevAssigned.id) {
            if (prevAssigned.key_number !== cleanKey || prevAssigned.motorcycle_number !== cleanPlate) {
              await employeeApi.update(assignedEmployeeId, {
                motorcycle_number: cleanPlate,
                key_number: cleanKey
              });
              queryClient.invalidateQueries({ queryKey: ['all-employees-cache'] });
            }
          }
        } catch (err) {
          console.error('Failed to sync employee link', err);
        }
      }
    });
  }

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col gap-6' dir='rtl'>
        {/* Page Header */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>إدارة الدبابات والمركبات</h1>
            <p className='text-muted-foreground text-sm mt-1'>
              إدارة أسطول الدبابات والثوابت، تتبع عدادات الكيلومترات وتنبيهات غيار الزيت والصيانة
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

        {/* Compact Stats Row */}
        <div className='grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5'>
          <div className='rounded-xl border bg-card p-3 shadow-2xs'>
            <div className='flex items-center justify-between text-muted-foreground'>
              <span className='text-xs font-semibold'>إجمالي الأسطول</span>
              <Icons.bike className='size-4 text-muted-foreground/70' />
            </div>
            <div className='mt-1.5 flex items-baseline gap-1.5'>
              <span className='text-2xl font-bold font-mono tracking-tight'>{metrics.total}</span>
              <span className='text-[11px] text-muted-foreground font-medium'>مركبة</span>
            </div>
          </div>

          <div className='rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 shadow-2xs'>
            <div className='flex items-center justify-between text-emerald-700 dark:text-emerald-400'>
              <span className='text-xs font-semibold'>متاحة للعمل</span>
              <Icons.circleCheck className='size-4 text-emerald-600 dark:text-emerald-400' />
            </div>
            <div className='mt-1.5 flex items-baseline gap-1.5'>
              <span className='text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400'>
                {metrics.available}
              </span>
              <span className='text-[11px] text-muted-foreground font-medium'>جاهزة</span>
            </div>
          </div>

          <div className='rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 shadow-2xs'>
            <div className='flex items-center justify-between text-blue-700 dark:text-blue-400'>
              <span className='text-xs font-semibold'>في الميدان الآن</span>
              <Icons.play className='size-4 text-blue-600 dark:text-blue-400' />
            </div>
            <div className='mt-1.5 flex items-baseline gap-1.5'>
              <span className='text-2xl font-bold font-mono tracking-tight text-blue-600 dark:text-blue-400'>
                {metrics.inUse}
              </span>
              <span className='text-[11px] text-muted-foreground font-medium'>شفت جاري</span>
            </div>
          </div>

          <div className='rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 shadow-2xs'>
            <div className='flex items-center justify-between text-amber-700 dark:text-amber-400'>
              <span className='text-xs font-semibold'>في الصيانة</span>
              <Icons.wrench className='size-4 text-amber-600 dark:text-amber-400' />
            </div>
            <div className='mt-1.5 flex items-baseline gap-1.5'>
              <span className='text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400'>
                {metrics.maintenance}
              </span>
              <span className='text-[11px] text-muted-foreground font-medium'>تحت الصيانة</span>
            </div>
          </div>

          <div className='rounded-xl border border-destructive/20 bg-destructive/5 p-3 shadow-2xs'>
            <div className='flex items-center justify-between text-destructive'>
              <span className='text-xs font-semibold'>تحتاج غيار زيت</span>
              <Icons.droplet className='size-4 text-destructive' />
            </div>
            <div className='mt-1.5 flex items-baseline gap-1.5'>
              <span className='text-2xl font-bold font-mono tracking-tight text-destructive'>
                {metrics.needsOil}
              </span>
              <span className='text-[11px] text-muted-foreground font-medium'>تجاوزت المسافة</span>
            </div>
          </div>
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
                  { id: 'NEEDS_OIL', label: 'يحتاج زيت' }
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

            {/* Branch Filter Row */}
            <div className='flex flex-wrap items-center justify-between gap-3 pt-2 border-t'>
              <div className='flex items-center gap-2'>
                <span className='text-xs font-bold text-muted-foreground flex items-center gap-1.5'>
                  <Icons.building className='size-3.5 text-primary' />
                  الفرع:
                </span>
                <div className='flex items-center gap-1.5'>
                  <Button
                    variant={branchFilter === 'all' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setBranchFilter('all')}
                    className='text-xs h-7 px-3 font-medium'
                  >
                    جميع الفروع
                  </Button>
                  <Button
                    variant={branchFilter === '0b52c83c-4a37-4950-8040-fcb00fa718b3' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setBranchFilter('0b52c83c-4a37-4950-8040-fcb00fa718b3')}
                    className='text-xs h-7 px-3 font-medium'
                  >
                    الفرع الأول
                  </Button>
                  <Button
                    variant={branchFilter === '33b1e65f-074c-4c51-af38-32e13c1fb9a6' ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setBranchFilter('33b1e65f-074c-4c51-af38-32e13c1fb9a6')}
                    className='text-xs h-7 px-3 font-medium'
                  >
                    الفرع الثاني
                  </Button>
                </div>
              </div>
              <div className='text-xs text-muted-foreground flex items-center gap-1.5 font-medium'>
                <Icons.key className='size-3.5 text-primary' />
                <span>الترتيب التلقائي:</span>
                <span className='text-primary font-bold'>تصاعدياً حسب أرقام المفاتيح (طبيعي)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicles Table */}
        <Card className='shadow-xs'>
          <CardContent className='p-0 overflow-hidden'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader className='bg-muted/50'>
                  <TableRow>
                    <TableHead className='text-right w-24'>رقم المفتاح</TableHead>
                    <TableHead className='text-right'>رقم الدباب / اللوحة</TableHead>
                    <TableHead className='text-right'>الفرع</TableHead>
                    <TableHead className='text-right'>المندوب المعين</TableHead>
                    <TableHead className='text-right'>النوع والماركة</TableHead>
                    <TableHead className='text-right'>الاستمارة</TableHead>
                    <TableHead className='text-right'>العداد الحالي</TableHead>
                    <TableHead className='text-right'>حالة الزيت</TableHead>
                    <TableHead className='text-right'>الحالة التشغيلية</TableHead>
                    <TableHead className='text-center'>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className='h-32 text-center'>
                        <div className='flex flex-col items-center justify-center gap-2'>
                          <Icons.spinner className='size-6 animate-spin text-primary' />
                          <span className='text-sm text-muted-foreground'>
                            جاري تحميل أسطول الدبابات...
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredVehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className='h-32 text-center text-muted-foreground'>
                        لا توجد دبابات أو مركبات مطابقة لمعايير البحث
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVehicles.map((vehicle) => {
                      const drivenSinceOil = Math.max(
                        0,
                        vehicle.current_km - vehicle.last_oil_change_km
                      );
                      const isOilWarning = vehicle.needs_oil_change;
                      const assignedEmp = getAssignedEmployee(vehicle.plate_number);

                      return (
                        <TableRow key={vehicle.id} className='hover:bg-muted/40 transition-colors'>
                          {/* Key Number */}
                          <TableCell className='font-mono'>
                            {vehicle.key_number ? (
                              <Badge
                                variant='outline'
                                className='font-mono text-xs font-black bg-primary/10 text-primary border-primary/25 px-2.5 py-0.5'
                              >
                                {vehicle.key_number}
                              </Badge>
                            ) : (
                              <span className='text-muted-foreground text-xs'>—</span>
                            )}
                          </TableCell>

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

                          {/* Branch */}
                          <TableCell>
                            <Badge
                              variant='outline'
                              className='text-xs font-semibold bg-muted/40 text-foreground border-border'
                            >
                              {getBranchName(vehicle.branch_id)}
                            </Badge>
                          </TableCell>

                          {/* Assigned Employee */}
                          <TableCell>
                            {assignedEmp ? (
                              <div className='flex items-center gap-1.5'>
                                <div className='size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold'>
                                  <Icons.user className='size-3 text-primary' />
                                </div>
                                <div>
                                  <span className='font-bold text-xs text-foreground block'>
                                    {assignedEmp.name}
                                  </span>
                                  {assignedEmp.key_number && (
                                    <span className='text-[10px] text-muted-foreground font-mono'>
                                      (مفتاح: {assignedEmp.key_number})
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className='text-xs text-muted-foreground/60 italic'>
                                غير مخصص
                              </span>
                            )}
                          </TableCell>

                          {/* Brand & Type */}
                          <TableCell>
                            <div>
                              <p className='font-medium text-sm text-foreground'>
                                {vehicle.brand ||
                                  (vehicle.vehicle_type === 'car' ? 'سيارة' : 'دراجة نارية')}
                              </p>
                              {vehicle.model_year && (
                                <p className='text-xs text-muted-foreground font-mono'>
                                  موديل {vehicle.model_year}
                                </p>
                              )}
                            </div>
                          </TableCell>

                          {/* Registration Document */}
                          <TableCell>
                            {vehicle.registration_image ? (
                              <Button
                                variant='outline'
                                size='sm'
                                type='button'
                                onClick={() => {
                                  setPreviewFallbackTried(false);
                                  setPreviewLoadError(false);
                                  setPreviewImage({
                                    url: vehicle.registration_image!,
                                    title: `استمارة المركبة / الدباب (${vehicle.plate_number})`
                                  });
                                }}
                                className='h-7 px-2.5 text-xs gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 shadow-none'
                              >
                                <Icons.fileText className='size-3.5' />
                                <span>عرض الاستمارة</span>
                              </Button>
                            ) : (
                              <Badge
                                variant='outline'
                                className='text-[11px] text-muted-foreground border-dashed bg-muted/20'
                              >
                                غير مرفقة
                              </Badge>
                            )}
                          </TableCell>

                          {/* Current Odometer */}
                          <TableCell>
                            {vehicle.is_odometer_broken ? (
                              <div className='space-y-1'>
                                <Badge
                                  variant='outline'
                                  className='bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-bold gap-1'
                                >
                                  <Icons.warning className='size-3' />
                                  العداد تالف / معفى
                                </Badge>
                                <p className='text-[10px] text-muted-foreground'>
                                  معفى من التصوير والكيلومترات
                                </p>
                              </div>
                            ) : (
                              <>
                                <div className='font-mono font-bold text-foreground'>
                                  {(vehicle.current_km ?? 0).toLocaleString('en-US')}{' '}
                                  <span className='text-xs font-normal text-muted-foreground'>
                                    كم
                                  </span>
                                </div>
                                <div className='text-[10px] text-muted-foreground font-mono'>
                                  المسافة الكلية:{' '}
                                  {(vehicle.total_distance ?? 0).toLocaleString('en-US')} كم
                                </div>
                              </>
                            )}
                          </TableCell>

                          {/* Oil Status */}
                          <TableCell>
                            <div className='space-y-1'>
                              {isOilWarning ? (
                                <Badge
                                  variant='destructive'
                                  className='text-[11px] font-medium gap-1'
                                >
                                  <Icons.warning className='size-3' />
                                  يجب غيار الزيت! ({(drivenSinceOil ?? 0).toLocaleString(
                                    'en-US'
                                  )}{' '}
                                  كم)
                                </Badge>
                              ) : (
                                <div className='flex items-center gap-1.5'>
                                  <Badge
                                    variant='outline'
                                    className='text-xs font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                  >
                                    باقي {Math.round(vehicle.remaining_oil_km || 0)} كم
                                  </Badge>
                                </div>
                              )}
                              <p className='text-[10px] text-muted-foreground font-mono'>
                                آخر تغيير:{' '}
                                {(vehicle.last_oil_change_km ?? 0).toLocaleString('en-US')} كم
                              </p>
                            </div>
                          </TableCell>

                          {/* Operational Status */}
                          <TableCell>
                            {vehicle.status === 'IN_USE' ? (
                              <Badge
                                variant='secondary'
                                className='bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1'
                              >
                                <span className='size-1.5 rounded-full bg-blue-500 animate-pulse' />
                                قيد العمل (في شفت)
                              </Badge>
                            ) : vehicle.status === 'MAINTENANCE' ? (
                              <Badge
                                variant='outline'
                                className='bg-amber-500/10 text-amber-600 border-amber-500/20'
                              >
                                في الصيانة
                              </Badge>
                            ) : (
                              <Badge
                                variant='outline'
                                className='bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              >
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
                                  if (
                                    confirm(
                                      `هل أنت متأكد من حذف الدباب رقم ${vehicle.plate_number}؟`
                                    )
                                  ) {
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
          <SheetContent className='sm:max-w-lg w-full p-0 flex flex-col' dir='rtl'>
            <SheetHeader className='p-6'>
              <SheetTitle className='text-lg font-bold flex items-center gap-2'>
                <Icons.bike className='size-5 text-primary' />
                إضافة دباب / مركبة جديدة
              </SheetTitle>
              <SheetDescription className='text-xs'>
                سجل بيانات الدباب أو المركبة لتتبع عداد الكيلومترات بين المناديب تلقائياً
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSubmitCreate} className='flex-1 flex flex-col min-h-0'>
              <div className='flex-1 overflow-y-auto px-6 py-5 space-y-4'>
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

                <div className='grid grid-cols-2 gap-3'>
                  <div className='space-y-1'>
                    <label className='text-xs font-medium'>الفرع التابع له الدباب *</label>
                    <NativeSelect
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className='w-full'
                    >
                      <option value='0b52c83c-4a37-4950-8040-fcb00fa718b3'>الفرع الأول</option>
                      <option value='33b1e65f-074c-4c51-af38-32e13c1fb9a6'>الفرع الثاني</option>
                    </NativeSelect>
                  </div>

                  <div className='space-y-1'>
                    <label className='text-xs font-medium'>رقم المفتاح</label>
                    <Input
                      placeholder='مثال: 12 أو K-12'
                      value={keyNumber}
                      onChange={(e) => setKeyNumber(e.target.value)}
                      className='font-mono'
                    />
                  </div>
                </div>

                {/* Linked Employee */}
                <div className='space-y-1.5 p-3 rounded-lg border bg-muted/20'>
                  <label className='text-xs font-semibold flex items-center gap-1.5 text-foreground'>
                    <Icons.user className='size-3.5 text-primary' />
                    ربط الدباب بموظف / مندوب (اختياري)
                  </label>
                  <EmployeeSearchSelect
                    employees={employees}
                    value={assignedEmployeeId}
                    onChange={(val) => setAssignedEmployeeId(val || '')}
                    placeholder='ابحث عن الموظف (اكتب أول حرفين)...'
                  />
                  <p className='text-[10px] text-muted-foreground'>
                    عند تعيين المندوب، سيتم ربط رقم الدباب ورقم المفتاح به تلقائياً.
                  </p>
                </div>

                <div className='grid grid-cols-2 gap-3'>
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

                <div className='rounded-xl border p-3.5 bg-amber-500/5 border-amber-500/25 flex items-center justify-between gap-3'>
                  <div className='space-y-0.5'>
                    <p className='text-xs font-bold text-foreground flex items-center gap-1.5'>
                      <Icons.warning className='size-3.5 text-amber-500' />
                      عداد المسافات معطل / تالف
                    </p>
                    <p className='text-[11px] text-muted-foreground'>
                      عند التفعيل، يُعفى المندوب من تصوير وإدخال قراءة العداد عند بدء وإنهاء الشفت
                    </p>
                  </div>
                  <Switch checked={isOdometerBroken} onCheckedChange={setIsOdometerBroken} />
                </div>

                <div className='space-y-1.5'>
                  <ImageUploader
                    value={registrationImage}
                    onChange={setRegistrationImage}
                    label='صورة استمارة الدباب / المركبة'
                    category='registration'
                    description='ستظهر صورة الاستمارة تلقائياً في وثائق المندوب المرتبط بهذا الدباب في التطبيق'
                  />
                </div>

                <div className='space-y-1'>
                  <label className='text-xs font-medium'>ملاحظات</label>
                  <Input
                    placeholder='أي تفاصيل أو ملاحظات خاصة بالمركبة...'
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <SheetFooter className='p-4 border-t bg-muted/20 flex items-center justify-end gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setIsCreateOpen(false)}
                  disabled={createMutation.isPending}
                >
                  إلغاء
                </Button>
                <Button type='submit' disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الدباب'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        {/* Edit Vehicle Sheet (Side Drawer with Scroll) */}
        <Sheet open={!!editingVehicle} onOpenChange={(open) => !open && setEditingVehicle(null)}>
          <SheetContent className='sm:max-w-lg w-full p-0 flex flex-col' dir='rtl'>
            <SheetHeader className='p-6'>
              <SheetTitle className='text-lg font-bold flex items-center gap-2'>
                <Icons.edit className='size-5 text-primary' />
                تعديل بيانات الدباب ({editingVehicle?.plate_number})
              </SheetTitle>
              <SheetDescription className='text-xs'>
                تعديل مواصفات الدباب، قراءة العداد، الاستمارة، أو الحالة التشغيلية
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSubmitEdit} className='flex-1 flex flex-col min-h-0'>
              <div className='flex-1 overflow-y-auto px-6 py-5 space-y-4'>
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

                <div className='grid grid-cols-3 gap-3'>
                  <div className='space-y-1'>
                    <label className='text-xs font-medium'>نوع المركبة</label>
                    <NativeSelect
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className='w-full'
                    >
                      <option value='motorcycle'>دراجة نارية</option>
                      <option value='car'>سيارة</option>
                    </NativeSelect>
                  </div>

                  <div className='space-y-1'>
                    <label className='text-xs font-medium'>الماركة</label>
                    <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
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

                <div className='grid grid-cols-2 gap-3'>
                  <div className='space-y-1'>
                    <label className='text-xs font-medium'>الفرع التابع له الدباب *</label>
                    <NativeSelect
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className='w-full'
                    >
                      <option value='0b52c83c-4a37-4950-8040-fcb00fa718b3'>الفرع الأول</option>
                      <option value='33b1e65f-074c-4c51-af38-32e13c1fb9a6'>الفرع الثاني</option>
                    </NativeSelect>
                  </div>

                  <div className='space-y-1'>
                    <label className='text-xs font-medium'>رقم المفتاح</label>
                    <Input
                      value={keyNumber}
                      onChange={(e) => setKeyNumber(e.target.value)}
                      className='font-mono'
                    />
                  </div>
                </div>

                {/* Linked Employee */}
                <div className='space-y-1.5 p-3 rounded-lg border bg-muted/20'>
                  <label className='text-xs font-semibold flex items-center gap-1.5 text-foreground'>
                    <Icons.user className='size-3.5 text-primary' />
                    المندوب المعين لهذا الدباب
                  </label>
                  <EmployeeSearchSelect
                    employees={employees}
                    value={assignedEmployeeId}
                    onChange={(val) => setAssignedEmployeeId(val || '')}
                    placeholder='ابحث عن الموظف (اكتب أول حرفين)...'
                  />
                  <p className='text-[10px] text-muted-foreground'>
                    عند تعيين المندوب أو تغيير المفتاح، سيتم تحديث بيانات الموظف ومفتاحه تلقائياً.
                  </p>
                </div>

                <div className='grid grid-cols-2 gap-3'>
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

                <div className='rounded-xl border p-3.5 bg-amber-500/5 border-amber-500/25 flex items-center justify-between gap-3'>
                  <div className='space-y-0.5'>
                    <p className='text-xs font-bold text-foreground flex items-center gap-1.5'>
                      <Icons.warning className='size-3.5 text-amber-500' />
                      عداد المسافات معطل / تالف
                    </p>
                    <p className='text-[11px] text-muted-foreground'>
                      عند التفعيل، يُعفى المندوب من تصوير وإدخال قراءة العداد عند بدء وإنهاء الشفت
                    </p>
                  </div>
                  <Switch checked={isOdometerBroken} onCheckedChange={setIsOdometerBroken} />
                </div>

                <div className='space-y-1.5'>
                  <ImageUploader
                    value={registrationImage}
                    onChange={setRegistrationImage}
                    label='صورة استمارة الدباب / المركبة'
                    category='registration'
                    description='ستظهر صورة الاستمارة تلقائياً في وثائق المندوب المرتبط بهذا الدباب في التطبيق'
                  />
                </div>

                <div className='space-y-1'>
                  <label className='text-xs font-medium'>ملاحظات</label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>

              <SheetFooter className='p-4 border-t bg-muted/20 flex items-center justify-end gap-2'>
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
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        {/* Oil Change Confirmation Modal */}
        <Dialog
          open={!!oilChangingVehicle}
          onOpenChange={(open) => !open && setOilChangingVehicle(null)}
        >
          <DialogContent className='sm:max-w-[420px]' dir='rtl'>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold flex items-center gap-2 text-destructive'>
                <Icons.droplet className='size-5' />
                تسجيل غيار زيت للدباب ({oilChangingVehicle?.plate_number})
              </DialogTitle>
              <DialogDescription className='text-xs'>
                سيتم تصفير عداد الزيت وتحديث قراءة آخر غيار لتكون مساوية للعداد الحالي (
                {(oilChangingVehicle?.current_km ?? 0).toLocaleString('en-US')} كم) وخصم عبوة زيت
                واحدة من المخزن تلقائياً.
              </DialogDescription>
            </DialogHeader>

            <div className='bg-muted/40 p-4 rounded-xl border space-y-2 text-xs'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>العداد الحالي للدباب:</span>
                <span className='font-mono font-bold'>
                  {(oilChangingVehicle?.current_km ?? 0).toLocaleString('en-US')} كم
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>المسافة المقطوعة منذ آخر غيار:</span>
                <span className='font-mono font-bold text-destructive'>
                  {Math.max(
                    0,
                    (oilChangingVehicle?.current_km || 0) -
                      (oilChangingVehicle?.last_oil_change_km || 0)
                  ).toLocaleString('en-US')}{' '}
                  كم
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
                onClick={() =>
                  oilChangingVehicle && oilChangeMutation.mutate(oilChangingVehicle.id)
                }
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

        {/* Registration Image Preview Dialog */}
        <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
          <DialogContent className='sm:max-w-xl max-h-[90vh] overflow-y-auto' dir='rtl'>
            <DialogHeader>
              <DialogTitle className='text-base font-bold flex items-center gap-2'>
                <Icons.fileText className='size-5 text-primary' />
                {previewImage?.title || 'صورة استمارة المركبة'}
              </DialogTitle>
            </DialogHeader>
            <div className='flex flex-col items-center justify-center p-3 bg-muted/20 rounded-xl overflow-hidden min-h-[250px]'>
              {previewImage?.url ? (
                previewLoadError ? (
                  <div className='flex flex-col items-center justify-center gap-2 p-6 text-center'>
                    <Icons.warning className='size-8 text-amber-500' />
                    <p className='text-sm font-semibold text-foreground'>
                      تعذر عرض الصورة داخل النافذة
                    </p>
                    <p className='text-xs text-muted-foreground break-all max-w-md'>
                      {resolveRegistrationImageUrl(previewImage.url, true)}
                    </p>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveRegistrationImageUrl(previewImage.url, previewFallbackTried)}
                    alt='استمارة المركبة'
                    referrerPolicy='no-referrer'
                    onError={() => {
                      if (!previewFallbackTried) {
                        setPreviewFallbackTried(true);
                      } else {
                        setPreviewLoadError(true);
                      }
                    }}
                    className='max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-sm'
                  />
                )
              ) : null}
            </div>
            <DialogFooter className='flex items-center justify-between gap-2 sm:justify-between'>
              <Button type='button' variant='outline' onClick={() => setPreviewImage(null)}>
                إغلاق
              </Button>
              {previewImage?.url && (
                <a
                  href={resolveRegistrationImageUrl(previewImage.url, previewFallbackTried)}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline'
                >
                  <Icons.externalLink className='size-3.5' />
                  فتح الصورة في نافذة جديدة
                </a>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
