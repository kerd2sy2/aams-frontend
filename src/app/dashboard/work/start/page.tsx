'use client';

import { useState, useMemo, useRef, type FormEvent } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { employeeApi, workApi, inventoryApi, vehicleApi } from '@/lib/aams/services';
import { targetWebApi } from '@/lib/aams/target-api';
import {
  useOfflineQuery,
  offlineAwareFetch,
  clearOfflineMemoryCache
} from '@/hooks/use-offline-query';
import { useOfflineMutation } from '@/hooks/use-offline-mutation';
import { isNetworkError } from '@/lib/aams/network-utils';
import { BarcodeScannerModal } from '@/components/aams/barcode-scanner-modal';
import { WorkSkeleton } from '@/components/aams/skeletons';
import { useLocale } from '@/components/layout/locale-provider';
import type { Employee, OilChangeCheck, PaginatedResponse, Vehicle } from '@/types/aams';

function getApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { error?: string; message?: string }; status?: number };
    message?: string;
  };
  return (
    e.response?.data?.error ||
    e.response?.data?.message ||
    (e.response?.status ? `خطأ في الخادم (${e.response.status})` : '') ||
    (err instanceof Error ? err.message : '') ||
    fallback
  );
}

function normalizePlate(s: string): string {
  if (!s) return '';
  return s
    .replace(/[\s\-_/\\,.]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

function findMatchingVehicle(vehicles: Vehicle[] | undefined, input: string): Vehicle | undefined {
  if (!vehicles || !input.trim()) return undefined;
  const raw = input.trim();
  const digits = raw.replace(/\D/g, '');
  const norm = normalizePlate(raw);

  // 1. Exact match on plate_number or key_number
  let found = vehicles.find(
    (v) => v.plate_number === raw || (v.key_number && String(v.key_number).trim() === raw)
  );
  if (found) return found;

  // 2. Normalized plate match (ignoring spaces, unified Arabic letters)
  found = vehicles.find((v) => normalizePlate(v.plate_number) === norm);
  if (found) return found;

  // 3. Match by digits if length >= 3
  if (digits && digits.length >= 3) {
    found = vehicles.find((v) => {
      const vDigits = v.plate_number.replace(/\D/g, '');
      return vDigits === digits || (v.key_number && String(v.key_number).trim() === digits);
    });
    if (found) return found;

    // Partial digits match (e.g. plate digits contain input digits)
    found = vehicles.find((v) => v.plate_number.replace(/\D/g, '').includes(digits));
    if (found) return found;
  }

  // 4. Normalized contains
  if (norm.length >= 2) {
    found = vehicles.find((v) => normalizePlate(v.plate_number).includes(norm));
    if (found) return found;
  }

  return undefined;
}

export default function StartWorkPage() {
  const { t, locale, dir } = useLocale();
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [startKm, setStartKm] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [applicationId, setApplicationId] = useState('');
  const [applicationType, setApplicationType] = useState('');
  const [isCustomAppId, setIsCustomAppId] = useState(false);
  const [oilCheck, setOilCheck] = useState<OilChangeCheck | null>(null);
  const [checkingOil, setCheckingOil] = useState(false);
  const [notes, setNotes] = useState('');
  const [motorcycleNumber, setMotorcycleNumber] = useState('');
  const [lastEndKm, setLastEndKm] = useState<number | null>(null);
  const autoFilledRef = useRef(false);

  const { data: allEmployees } = useOfflineQuery<PaginatedResponse<Employee>>({
    queryKey: ['all-employees-cache'],
    queryFn: () => employeeApi.getAll({ limit: 200 }),
    cacheKey: 'employees_all',
    staleTime: 1000 * 60 * 5
  });

  const { data: allVehicles } = useOfflineQuery<{ data: Vehicle[]; total: number }>({
    queryKey: ['all-vehicles-cache'],
    queryFn: () => vehicleApi.getAll({ limit: 200 }),
    cacheKey: 'vehicles_all',
    staleTime: 1000 * 30,
    refetchOnMount: true
  });

  const { data: allIdentifiers } = useOfflineQuery<any[]>({
    queryKey: ['all-identifiers-cache'],
    queryFn: () => targetWebApi.listIdentifiers(),
    cacheKey: 'identifiers_all',
    staleTime: 1000 * 60 * 5
  });

  const appIdOptions = useMemo(() => {
    // Collect all valid IDs and their metadata (name_ar, name_en, is_blocked)
    const optionsMap = new Map<string, { id: string; label: string; is_blocked: boolean }>();

    // 1. From identifiers system
    if (Array.isArray(allIdentifiers)) {
      allIdentifiers.forEach((ident) => {
        const key = ident.ninja_id || ident.code || ident.name;
        if (!key) return;
        const displayName = ident.name_ar
          ? `${ident.name_ar} (${key})`
          : ident.name_en
            ? `${ident.name_en} (${key})`
            : key;

        optionsMap.set(key, {
          id: key,
          label: ident.is_blocked ? `${displayName} - [محظور]` : displayName,
          is_blocked: Boolean(ident.is_blocked)
        });
      });
    }

    // 2. From employees
    if (allEmployees?.data) {
      allEmployees.data.forEach((emp) => {
        if (emp.application_id && !optionsMap.has(emp.application_id)) {
          optionsMap.set(emp.application_id, {
            id: emp.application_id,
            label: `${emp.name} (${emp.application_id})`,
            is_blocked: false
          });
        }
      });
    }

    // Return non-blocked options first, or all with block indication
    return Array.from(optionsMap.values()).sort((a, b) => {
      if (a.is_blocked !== b.is_blocked) return a.is_blocked ? 1 : -1;
      return a.label.localeCompare(b.label);
    });
  }, [allEmployees, allIdentifiers]);

  const applyVehicleState = (vehicle: Vehicle) => {
    // 1. Counter
    if (vehicle.current_km > 0) {
      setLastEndKm(vehicle.current_km);
      setStartKm(String(vehicle.current_km));
    }

    // 2. Oil status
    const interval = vehicle.oil_interval_km || 950;
    const drivenSinceOil =
      vehicle.last_oil_change_km > 0
        ? Math.max(0, vehicle.current_km - vehicle.last_oil_change_km)
        : vehicle.total_distance || 0;
    const remaining = vehicle.remaining_oil_km ?? Math.max(0, interval - drivenSinceOil);
    const needsOil = Boolean(vehicle.needs_oil_change) || drivenSinceOil >= interval;

    setOilCheck({
      needs_oil_change: needsOil,
      total_distance: vehicle.total_distance || vehicle.current_km || 0,
      distance_since_oil: drivenSinceOil,
      oil_change_interval: interval,
      vehicle_type: vehicle.vehicle_type || vehicle.type || 'motorcycle',
      remaining_distance: remaining,
      interval: interval,
      percentage: Math.min(100, Math.round((drivenSinceOil / interval) * 100)),
      current_distance: vehicle.current_km,
      last_oil_change_distance: vehicle.last_oil_change_km || 0,
      has_active_maintenance_req: false,
      last_oil_change_date: ''
    } as any);
  };

  const dispenseOilMutation = useMutation({
    mutationFn: () => {
      if (!selectedEmployee) throw new Error('لا يوجد مندوب');
      const kmNum = Number(startKm) || lastEndKm || 0;
      return inventoryApi.dispenseOil({
        employee_id: selectedEmployee.id,
        plate_number: motorcycleNumber.trim() || undefined,
        current_km: kmNum > 0 ? kmNum : undefined,
        quantity: 1
      });
    },
    onSuccess: () => {
      const bikeLabel = motorcycleNumber.trim() || selectedEmployee?.name || '';
      toast.success(`تم صرف زيت للدباب ${bikeLabel}`);
      setOilCheck((prev) =>
        prev
          ? {
              ...prev,
              needs_oil_change: false,
              distance_since_oil: 0,
              remaining_distance: prev.oil_change_interval || 950
            }
          : null
      );
      checkOilForBike(undefined, motorcycleNumber);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['all-vehicles-cache'] });
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'فشل صرف الزيت'));
    }
  });

  const startMutation = useOfflineMutation({
    successMessage: selectedEmployee
      ? `تم بدء الشفت لـ ${selectedEmployee.name}`
      : 'تم بدء الشفت بنجاح',
    queueMessage: selectedEmployee
      ? `تم الحفظ محلياً لـ ${selectedEmployee.name} — ستتم المزامنة عند عودة الاتصال`
      : 'تم الحفظ محلياً — ستتم المزامنة عند عودة الاتصال',
    onSuccess: () => {
      clearOfflineMemoryCache();
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['reports-active-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['all-vehicles-cache'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-list'] });
      queryClient.invalidateQueries({ queryKey: ['employees-working'] });
      queryClient.invalidateQueries({ queryKey: ['all-employees-cache'] });
      resetForm();
    },
    onError: (msg) => toast.error(msg || 'فشل بدء الشفت')
  });

  function resetForm() {
    setSelectedEmployee(null);
    setStartKm('');
    setApplicationId('');
    setApplicationType('');
    setMotorcycleNumber('');
    setIsCustomAppId(false);
    setOilCheck(null);
    setLastEndKm(null);
    setNotes('');
    autoFilledRef.current = false;
    setSearchTerm('');
  }

  const fetchLatestKm = async (empId?: string, motoNumber?: string) => {
    const cleanMoto = (motoNumber || '').trim();
    if (!cleanMoto && !empId) return;

    // 1. Immediately check local vehicle cache for fastest UI response
    if (cleanMoto) {
      const matched = findMatchingVehicle(allVehicles?.data, cleanMoto);
      if (matched && matched.current_km > 0) {
        setLastEndKm(matched.current_km);
        setStartKm(String(matched.current_km));
      }
    }

    try {
      // 2. Query live server. When checking a motorcycle, never pass empId!
      const last = await workApi.getLastKM(cleanMoto ? undefined : empId, cleanMoto || undefined);
      const apiKm = Math.max(last?.last_end_km || 0, last?.last_start_km || 0);

      if (apiKm > 0) {
        setLastEndKm(apiKm);
        setStartKm(String(apiKm));
        return;
      }
    } catch {
      // ignore & keep local matched KM
    }
  };

  const checkOilForBike = async (empId?: string, motoNumber?: string) => {
    const cleanMoto = (motoNumber || '').trim();
    if (!cleanMoto && !empId) {
      setOilCheck(null);
      return;
    }

    // 1. Immediately apply oil check from local vehicle cache
    if (cleanMoto) {
      const matched = findMatchingVehicle(allVehicles?.data, cleanMoto);
      if (matched) {
        applyVehicleState(matched);
      }
    }

    // 2. Query live server for oil check (never pass empId if bike is specified)
    setCheckingOil(true);
    try {
      const oc = await workApi.checkOilChange(
        cleanMoto ? undefined : empId,
        cleanMoto || undefined
      );
      if (oc) {
        setOilCheck(oc);
      }
    } catch {
      // keep local vehicle oil state
    } finally {
      setCheckingOil(false);
    }
  };

  const handleMotorcycleChange = async (val: string) => {
    setMotorcycleNumber(val);
    const cleanMoto = val.trim();
    if (!cleanMoto) {
      setOilCheck(null);
      setLastEndKm(null);
      setStartKm('');
      return;
    }

    // Instantly apply state if matched in local cache
    const matched = findMatchingVehicle(allVehicles?.data, cleanMoto);
    if (matched) {
      applyVehicleState(matched);
    }

    // Query server for latest reading strictly for the motorcycle (no empId fallback)
    await Promise.all([fetchLatestKm(undefined, cleanMoto), checkOilForBike(undefined, cleanMoto)]);
  };

  const selectEmployee = async (emp: Employee) => {
    if (emp.job_role && emp.job_role !== 'DRIVER') {
      const roleLabel =
        emp.job_role === 'SUPERVISOR' ? 'مشرف' : emp.job_role === 'MANAGEMENT' ? 'إدارة' : 'عامل';
      toast.error(
        `الموظف «${emp.name}» مسجل بوظيفة (${roleLabel}). بدء الشفتات مخصص لمناديب التوصيل فقط.`
      );
      return;
    }

    setSelectedEmployee(emp);
    setApplicationId(emp.application_id || '');
    setApplicationType(emp.application_type || '');
    const defaultMoto = emp.motorcycle_number || '';
    setMotorcycleNumber(defaultMoto);
    setIsCustomAppId(false);
    setNotes('');
    setLastEndKm(null);
    setStartKm('');
    setOilCheck(null);
    autoFilledRef.current = false;

    try {
      const { today_count } = await workApi.getTodayCount(emp.id);
      if (today_count > 0) {
        toast.warning(`${emp.name} لديه ${today_count} شفت مكتمل اليوم`);
      }
    } catch {
      // تجاهل أخطاء عدّ الشفتات
    }

    if (defaultMoto) {
      await handleMotorcycleChange(defaultMoto);
    } else {
      await Promise.all([fetchLatestKm(emp.id, undefined), checkOilForBike(emp.id, undefined)]);
    }
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    try {
      setSearching(true);
      const results = await employeeApi.search(searchTerm.trim());
      if (results && results.length > 0) {
        selectEmployee(results[0]);
        toast.success(`تم اختيار: ${results[0].name}`);
      } else {
        toast.error('لم يتم العثور على موظف');
      }
    } catch (err) {
      if (isNetworkError(err) && allEmployees?.data) {
        const term = searchTerm.trim().toLowerCase();
        const found = allEmployees.data.filter(
          (emp) =>
            (!emp.job_role || emp.job_role === 'DRIVER') &&
            (emp.name.toLowerCase().includes(term) ||
              emp.national_id.includes(term) ||
              (emp.key_number ?? '').includes(term))
        );
        if (found.length > 0) {
          selectEmployee(found[0]);
          toast.success(`تم اختيار (محلياً): ${found[0].name}`);
        } else {
          toast.error('لم يتم العثور على موظف في البيانات المحلية');
        }
      } else {
        toast.error(getApiErrorMessage(err, 'حدث خطأ أثناء البحث'));
      }
    } finally {
      setSearching(false);
    }
  };

  const handleStartWork = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) {
      toast.error('اختر الموظف أولاً');
      return;
    }
    const kmVal = parseFloat(startKm);
    if (isNaN(kmVal) || kmVal < 0) {
      toast.error('أدخل قراءة عداد صحيحة');
      return;
    }

    await startMutation.execute(
      () =>
        workApi.startWork(
          selectedEmployee.id,
          kmVal,
          applicationId || undefined,
          applicationType || undefined,
          undefined,
          motorcycleNumber || undefined,
          notes || undefined
        ),
      {
        endpoint: '/work/start',
        method: 'POST',
        payload: {
          employee_id: selectedEmployee.id,
          start_km: kmVal,
          application_id: applicationId || undefined,
          application_type: applicationType || undefined,
          motorcycle_number: motorcycleNumber || undefined,
          notes: notes || undefined
        }
      }
    );
  };

  const empImageSrc = selectedEmployee?.personal_image || '';
  const oilWarningThreshold = Math.round((oilCheck?.oil_change_interval ?? 950) * 0.85);
  const matchedBike = findMatchingVehicle(allVehicles?.data, motorcycleNumber);
  const displayKeyNumber = matchedBike?.key_number || selectedEmployee?.key_number || '—';

  if (searching) return <WorkSkeleton />;

  return (
    <PageContainer pageTitle={t('بدء الدوام')} pageDescription={t('اختيار المندوب وبدء دوام جديد')}>
      <div className='flex flex-col gap-4' dir={dir}>
        {!selectedEmployee && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2.5 text-base font-semibold'>
                <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg'>
                  <Icons.qrCode className='size-4' />
                </div>
                {t('مسح / اختيار المندوب')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col items-stretch gap-3 sm:flex-row sm:items-center'>
                <form onSubmit={handleSearch} className='relative flex-1'>
                  <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 start-3' />
                  <Input
                    type='text'
                    placeholder={t('ابحث بالاسم، رقم الهوية، أو امسح الباركود...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className='h-11 ps-9 pe-24'
                    autoFocus
                  />
                  <Button
                    type='submit'
                    disabled={searching || !searchTerm.trim()}
                    size='sm'
                    className='absolute end-2 top-1/2 -translate-y-1/2'
                  >
                    {searching ? <Icons.spinner className='size-3.5 animate-spin' /> : t('Search')}
                  </Button>
                </form>
                <Button
                  type='button'
                  onClick={() => setScannerOpen(true)}
                  variant='outline'
                  className='h-11 gap-2'
                >
                  <Icons.qrCode className='size-4' />
                  <span className='hidden sm:inline'>{t('مسح كاميرا')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedEmployee && (
          <form onSubmit={handleStartWork} className='flex flex-col gap-4'>
            <Card>
              <CardContent className='flex flex-col gap-5'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex min-w-0 flex-1 items-center gap-3 sm:gap-4'>
                    <Avatar className='size-12 shrink-0 rounded-xl border sm:size-14'>
                      {empImageSrc ? (
                        <AvatarImage
                          src={empImageSrc}
                          alt={selectedEmployee.name}
                          className='rounded-xl'
                        />
                      ) : null}
                      <AvatarFallback className='rounded-xl'>
                        <Icons.user className='text-muted-foreground size-6' />
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0'>
                      <h3 className='text-foreground truncate text-base font-bold sm:text-lg'>
                        {selectedEmployee.name}
                      </h3>
                      <div className='mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5'>
                        <span className='text-muted-foreground flex items-center gap-1 font-mono text-xs'>
                          <Icons.key className='size-3' />
                          {selectedEmployee.national_id}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className='flex shrink-0 flex-col items-end gap-2'>
                    <Badge variant='secondary' className='text-xs font-medium'>
                      {t('بدء شفت جديد')}
                    </Badge>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={resetForm}
                      className='text-muted-foreground hover:text-foreground'
                      aria-label={t('Cancel')}
                    >
                      <Icons.close className='size-4' />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className='grid grid-cols-2 gap-3 lg:grid-cols-5'>
                  <div className='bg-muted/50 flex flex-col items-center gap-1 rounded-xl border p-3 text-center'>
                    <Icons.key className='text-muted-foreground size-4' />
                    <span className='text-muted-foreground text-[10px] font-medium'>
                      {t('رقم المفتاح')}
                    </span>
                    <span className='text-foreground font-mono text-base font-bold'>
                      {displayKeyNumber}
                    </span>
                  </div>

                  <div className='bg-muted/50 flex flex-col gap-1.5 rounded-xl border p-3'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-1.5'>
                        <Icons.bike className='text-muted-foreground size-3.5 shrink-0' />
                        <span className='text-muted-foreground text-[10px] font-medium'>
                          {t('رقم الدباب')}
                        </span>
                      </div>
                      {lastEndKm !== null && lastEndKm > 0 && (
                        <span className='text-primary text-[10px] font-mono font-bold'>
                          {lastEndKm.toLocaleString('en-US')} {t('KM')}
                        </span>
                      )}
                    </div>
                    <div className='flex gap-1.5 items-center'>
                      <Input
                        placeholder={t('رقم الدباب')}
                        value={motorcycleNumber}
                        onChange={(e) => handleMotorcycleChange(e.target.value)}
                        className='h-8 flex-1 rounded-lg font-mono text-xs'
                      />
                      {allVehicles?.data && allVehicles.data.length > 0 && (
                        <NativeSelect
                          value={matchedBike?.plate_number || ''}
                          onChange={(e) => {
                            if (e.target.value) handleMotorcycleChange(e.target.value);
                          }}
                          className='h-8 w-28 shrink-0 text-[11px]'
                        >
                          <option value=''>اختر دباب...</option>
                          {allVehicles.data.map((v) => (
                            <option key={v.id} value={v.plate_number}>
                              {v.key_number ? `مفتاح ${v.key_number} | ` : ''}
                              {v.plate_number} ({v.current_km} كم)
                            </option>
                          ))}
                        </NativeSelect>
                      )}
                    </div>
                  </div>

                  {checkingOil ? (
                    <div className='bg-muted/50 flex flex-col items-center gap-1 rounded-xl border p-3 text-center'>
                      <Icons.spinner className='text-muted-foreground size-4 animate-spin' />
                      <span className='text-muted-foreground text-[10px]'>{t('Loading...')}</span>
                    </div>
                  ) : oilCheck ? (
                    <div
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors',
                        oilCheck.needs_oil_change
                          ? 'bg-destructive/10 border-destructive/30'
                          : oilCheck.distance_since_oil >= oilWarningThreshold
                            ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20'
                            : 'bg-emerald-500/10 border-emerald-500/25'
                      )}
                    >
                      {oilCheck.needs_oil_change ? (
                        <Icons.warning className='text-destructive size-4' />
                      ) : (
                        <Icons.circleCheck className='text-emerald-600 dark:text-emerald-400 size-4' />
                      )}
                      <span className='text-muted-foreground text-[10px] font-medium'>
                        حالة الزيت
                      </span>
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          oilCheck.needs_oil_change
                            ? 'text-destructive'
                            : 'text-emerald-700 dark:text-emerald-400'
                        )}
                      >
                        {oilCheck.needs_oil_change
                          ? 'يحتاج تغيير'
                          : oilCheck.distance_since_oil >= oilWarningThreshold
                            ? 'يقترب الموعد'
                            : 'جيدة'}
                      </span>
                      <span className='text-muted-foreground font-mono text-[10px]'>
                        {oilCheck.needs_oil_change
                          ? `${oilCheck.distance_since_oil.toLocaleString('en-US')} كم`
                          : `باقي ${Math.round(
                              oilCheck.remaining_distance ??
                                Math.max(
                                  0,
                                  (oilCheck.oil_change_interval || 950) -
                                    oilCheck.distance_since_oil
                                )
                            ).toLocaleString('en-US')} كم`}
                      </span>
                      {oilCheck.needs_oil_change && (
                        <Button
                          type='button'
                          size='sm'
                          variant='destructive'
                          onClick={() => dispenseOilMutation.mutate()}
                          disabled={dispenseOilMutation.isPending}
                          className='mt-1 h-7 gap-1 rounded-lg px-2.5 text-[10px]'
                        >
                          {dispenseOilMutation.isPending ? (
                            <Icons.spinner className='size-3 animate-spin' />
                          ) : (
                            <Icons.droplet className='size-3' />
                          )}
                          صرف زيت
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className='bg-muted/50 flex flex-col items-center gap-1 rounded-xl border p-3 text-center'>
                      <Icons.droplet className='text-muted-foreground size-4' />
                      <span className='text-muted-foreground text-[10px]'>لا توجد بيانات</span>
                    </div>
                  )}

                  {/* Application ID */}
                  <div className='bg-muted/50 flex flex-col gap-1.5 rounded-xl border p-3'>
                    <div className='flex items-center gap-1.5'>
                      <Icons.smartphone className='text-muted-foreground size-3.5 shrink-0' />
                      <span className='text-muted-foreground text-[10px] font-medium'>
                        معرف التطبيق
                      </span>
                    </div>
                    <NativeSelect
                      value={isCustomAppId ? '__custom__' : applicationId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__custom__') {
                          setIsCustomAppId(true);
                          setApplicationId('');
                        } else {
                          setIsCustomAppId(false);
                          setApplicationId(val || '');
                        }
                      }}
                      className='w-full'
                    >
                      <option value=''>الافتراضي</option>
                      {appIdOptions.map((opt) => (
                        <option
                          key={opt.id}
                          value={opt.id}
                          disabled={opt.is_blocked}
                          className={opt.is_blocked ? 'text-destructive font-semibold' : ''}
                        >
                          {opt.label}
                        </option>
                      ))}
                      <option value='__custom__'>أخرى...</option>
                    </NativeSelect>
                    {isCustomAppId && (
                      <Input
                        placeholder='أدخل المعرف...'
                        value={applicationId}
                        onChange={(e) => setApplicationId(e.target.value)}
                        className='h-8 rounded-lg font-mono text-xs'
                      />
                    )}
                  </div>

                  {/* Application Type */}
                  <div className='bg-muted/50 flex flex-col gap-1.5 rounded-xl border p-3'>
                    <div className='flex items-center gap-1.5'>
                      <Icons.gauge className='text-muted-foreground size-3.5 shrink-0' />
                      <span className='text-muted-foreground text-[10px] font-medium'>
                        نوع التطبيق
                      </span>
                    </div>
                    <NativeSelect
                      value={applicationType}
                      onChange={(e) => setApplicationType(e.target.value)}
                      className='w-full'
                    >
                      <option value=''>الافتراضي</option>
                      <option value='ninja'>نينجا</option>
                      <option value='keeta'>كيتا</option>
                      <option value='hunger'>هنجر</option>
                      <option value='toyou'>تو يو</option>
                    </NativeSelect>
                  </div>
                </div>

                {/* KM + Notes Row */}
                <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                  {/* Start KM + Last KM */}
                  <div className='flex flex-col gap-2'>
                    <label className='text-foreground text-sm font-semibold'>
                      قراءة عداد البداية <span className='text-destructive'>*</span>
                    </label>
                    <div className='relative'>
                      <Input
                        type='text'
                        inputMode='decimal'
                        placeholder='أدخل قراءة العداد...'
                        value={startKm}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9.]/g, '');
                          if ((v.match(/\./g) || []).length <= 1) setStartKm(v);
                        }}
                        required
                        className='h-12 rounded-xl bg-muted pe-14 ps-4 font-mono text-lg font-bold'
                      />
                      <span className='text-muted-foreground absolute top-1/2 -translate-y-1/2 text-xs font-bold end-3'>
                        كم
                      </span>
                    </div>
                    <div className='bg-muted/50 flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-xs'>
                      <span className='text-muted-foreground flex items-center gap-1.5'>
                        <Icons.gauge className='size-3.5' />
                        آخر عداد:
                        <span className='text-foreground font-mono font-bold'>
                          {lastEndKm && lastEndKm > 0 ? lastEndKm.toLocaleString() : '—'}
                        </span>
                      </span>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => lastEndKm && lastEndKm > 0 && setStartKm(String(lastEndKm))}
                        disabled={!lastEndKm || lastEndKm <= 0}
                        className='h-6 rounded-md px-2 text-[10px] font-medium'
                      >
                        تعبئة تلقائية
                      </Button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className='flex flex-col gap-2 md:col-span-2'>
                    <label className='text-foreground flex items-center gap-1.5 text-sm font-semibold'>
                      <Icons.fileText className='text-muted-foreground size-4' />
                      ملاحظات الشفت (اختياري)
                    </label>
                    <textarea
                      placeholder='أي ملاحظات إضافية...'
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className='bg-muted min-h-[96px] w-full flex-1 resize-none rounded-xl border border-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
                    />
                  </div>
                </div>

                {/* Submit */}
                <LoadingButton
                  type='submit'
                  loading={startMutation.isLoading}
                  loadingLabel={t('جاري بدء الشفت...')}
                  disabled={!!oilCheck?.needs_oil_change}
                  size='lg'
                  className='h-12 w-full text-base font-bold'
                >
                  <Icons.play className='size-5' />
                  {t('تأكيد وبدء الشفت')}
                </LoadingButton>
              </CardContent>
            </Card>
          </form>
        )}

        {!selectedEmployee && !searching && (
          <Card className='border-dashed'>
            <CardContent className='flex flex-col items-center gap-3 py-12'>
              <div className='bg-muted flex size-14 items-center justify-center rounded-2xl'>
                <Icons.qrCode className='text-muted-foreground size-7' />
              </div>
              <div className='space-y-1 text-center'>
                <p className='text-muted-foreground text-sm font-semibold'>
                  {t('اختر مندوباً لبدء شفت جديد')}
                </p>
                <p className='text-muted-foreground text-xs'>
                  {t('امسح البطاقة أو ابحث بالاسم لبدء شفت عمل جديد')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onSelectEmployee={(emp) => {
          selectEmployee(emp);
          toast.success(`تم التحديد: ${emp.name}`);
        }}
      />
    </PageContainer>
  );
}
