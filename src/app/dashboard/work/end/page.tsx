'use client';

import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { differenceInMinutes, differenceInHours } from 'date-fns';
import { ar } from 'date-fns/locale';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { employeeApi, workApi } from '@/lib/aams/services';
import { useOfflineQuery, clearOfflineMemoryCache } from '@/hooks/use-offline-query';
import { useOfflineMutation } from '@/hooks/use-offline-mutation';
import { isNetworkError } from '@/lib/aams/network-utils';
import { formatRiyadh } from '@/lib/aams/riyadh-time';
import { BarcodeScannerModal } from '@/components/aams/barcode-scanner-modal';
import { WorkSkeleton } from '@/components/aams/skeletons';
import { useLocale } from '@/components/layout/locale-provider';
import type { Employee, WorkSession, PaginatedResponse } from '@/types/aams';

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

export default function EndWorkPage() {
  const { t, locale, dir } = useLocale();
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [endKm, setEndKm] = useState('');
  const [ordersCount, setOrdersCount] = useState('0');
  const [fuelCost, setFuelCost] = useState('0');
  const [applicationId, setApplicationId] = useState('');
  const [applicationType, setApplicationType] = useState('');
  const [notes, setNotes] = useState('');

  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);

  const { data: allEmployees } = useOfflineQuery<PaginatedResponse<Employee>>({
    queryKey: ['all-employees-cache'],
    queryFn: () => employeeApi.getAll({ limit: 200 }),
    cacheKey: 'employees_all',
    staleTime: 1000 * 60 * 5
  });

  const endMutation = useOfflineMutation({
    successMessage: selectedEmployee
      ? `تم إنهاء ومصادقة شفت العمل بنجاح للموظف ${selectedEmployee.name}`
      : 'تم إنهاء ومصادقة شفت العمل بنجاح',
    queueMessage: selectedEmployee
      ? `تم حفظ إنهاء ومصادقة شفت العمل محلياً للموظف ${selectedEmployee.name} — ستتم المزامنة عند عودة الاتصال`
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
      queryClient.invalidateQueries({ queryKey: ['odometer-audits'] });
      queryClient.invalidateQueries({ queryKey: ['work-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      resetForm();
    },
    onError: (msg) => toast.error(msg || 'فشل إنهاء الشفت')
  });

  function resetForm() {
    setSelectedEmployee(null);
    setActiveSession(null);
    setEndKm('');
    setOrdersCount('0');
    setFuelCost('0');
    setApplicationId('');
    setApplicationType('');
    setNotes('');
    setSearchTerm('');
  }

  const fetchActiveSession = async (emp: Employee) => {
    if (emp.job_role && emp.job_role !== 'DRIVER') {
      const roleLabel =
        emp.job_role === 'SUPERVISOR' ? 'مشرف' : emp.job_role === 'MANAGEMENT' ? 'إدارة' : 'عامل';
      toast.error(
        `الموظف «${emp.name}» مسجل بوظيفة (${roleLabel}). إنهاء الشفتات مخصص لمناديب التوصيل فقط.`
      );
      return;
    }
    try {
      setSearching(true);
      const session = await workApi.getActiveSession(emp.id);
      if (session) {
        setSelectedEmployee(emp);
        setActiveSession(session);
        setApplicationId(session.application_id || emp.application_id || '');
        setApplicationType(session.application_type || emp.application_type || '');
        toast.success(`تم العثور على شفت عمل قائم للموظف ${emp.name}`);
      }
    } catch {
      toast.error(`الموظف ${emp.name} ليس لديه شفت عمل قائم حالياً`);
      setSelectedEmployee(null);
      setActiveSession(null);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    try {
      setSearching(true);
      const results = await employeeApi.search(searchTerm.trim());
      if (results && results.length > 0) {
        await fetchActiveSession(results[0]);
      } else {
        toast.error('لم يتم العثور على أي موظف بهذا الكود/الاسم');
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
          toast.warning('البحث محلي - لا يمكن التحقق من الشفت النشط بدون اتصال');
          setSelectedEmployee(found[0]);
          setApplicationId(found[0].application_id || '');
          setApplicationType(found[0].application_type || '');
          toast.success(`تم اختيار (محلياً): ${found[0].name}`, {
            description: 'ستحتاج لإدخال البيانات يدوياً'
          });
        } else {
          toast.error('لم يتم العثور على موظف في البيانات المحلية');
        }
      } else {
        toast.error(getApiErrorMessage(err, 'حدث خطأ أثناء البحث عن الموظف'));
      }
    } finally {
      setSearching(false);
    }
  };

  const handleEndWork = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !activeSession) {
      toast.error('يرجى اختيار موظف لديه شفت عمل قائم');
      return;
    }

    const endKmVal = parseFloat(endKm);
    if (isNaN(endKmVal) || endKmVal <= activeSession.start_km) {
      toast.error(
        `عداد النهاية (${endKmVal || 0}) يجب أن يكون أكبر من عداد البداية (${activeSession.start_km})`
      );
      return;
    }

    const payload = {
      employee_id: selectedEmployee.id,
      end_km: endKmVal,
      orders_count: parseInt(ordersCount) || 0,
      fuel_cost: parseFloat(fuelCost) || 0,
      application_id: applicationId || undefined,
      application_type: applicationType || undefined,
      notes: notes || undefined,
      is_reviewed: true,
      review_notes: 'تم تسجيل وإنهاء ومصادقة الدوام مباشرة عبر لوحة تحكم المشرف'
    };

    await endMutation.execute(() => workApi.endWork(payload), {
      endpoint: '/work/end',
      method: 'POST',
      payload
    });
  };

  const startKmNum = activeSession?.start_km || 0;
  const endKmNum = parseFloat(endKm) || 0;
  const calculatedDistance = endKmNum > startKmNum ? endKmNum - startKmNum : 0;

  let durationString = '—';
  if (activeSession?.start_time) {
    const startDt = new Date(activeSession.start_time);
    const now = new Date();
    const hrs = differenceInHours(now, startDt);
    const mins = differenceInMinutes(now, startDt) % 60;
    durationString = `${hrs} س : ${mins} د`;
  }

  const empImageSrc = selectedEmployee?.personal_image || '';
  const showForm = Boolean(selectedEmployee && activeSession);

  if (searching) return <WorkSkeleton />;

  return (
    <PageContainer
      pageTitle={t('إنهاء الدوام')}
      pageDescription={t('توثيق عداد النهاية وإقفال الدوام')}
    >
      <div className='flex flex-col gap-4' dir={dir}>
        {!showForm && (
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2.5 text-base font-semibold'>
                <div className='bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg'>
                  <Icons.qrCode className='size-4' />
                </div>
                {t('مسح / اختيار الموظف')}
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

        {showForm && (
          <form onSubmit={handleEndWork} className='flex flex-col gap-4'>
            <Card>
              <CardContent className='flex flex-col gap-5 pt-6'>
                {/* Employee Banner */}
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex min-w-0 flex-1 items-center gap-3 sm:gap-4'>
                    <Avatar className='size-12 shrink-0 rounded-xl border sm:size-14'>
                      {empImageSrc ? (
                        <AvatarImage
                          src={empImageSrc}
                          alt={selectedEmployee?.name || ''}
                          className='rounded-xl'
                        />
                      ) : null}
                      <AvatarFallback className='rounded-xl'>
                        <Icons.user className='text-muted-foreground size-6' />
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0'>
                      <h3 className='text-foreground truncate text-base font-bold sm:text-lg'>
                        {selectedEmployee?.name || ''}
                      </h3>
                      <div className='mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5'>
                        <span className='text-muted-foreground flex items-center gap-1 font-mono text-xs'>
                          <Icons.key className='size-3' />
                          {selectedEmployee?.national_id || '—'}
                        </span>
                        <span className='text-muted-foreground flex items-center gap-1 font-mono text-xs'>
                          <Icons.bike className='size-3' />
                          {selectedEmployee?.motorcycle_number || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className='flex shrink-0 flex-col items-end gap-2'>
                    <Badge variant='secondary' className='text-xs font-medium'>
                      {t('Open')}
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

                {/* Info Cards */}
                <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
                  {/* Key Number */}
                  <div className='bg-muted/50 flex flex-col items-center gap-1 rounded-xl border p-3 text-center'>
                    <Icons.key className='text-muted-foreground size-4' />
                    <span className='text-muted-foreground text-[10px] font-medium'>
                      {t('رقم المفتاح')}
                    </span>
                    <span className='text-foreground font-mono text-base font-bold'>
                      {selectedEmployee?.key_number || '—'}
                    </span>
                  </div>

                  {/* Duration */}
                  <div className='bg-muted/50 flex flex-col items-center gap-1 rounded-xl border p-3 text-center'>
                    <Icons.clock className='text-muted-foreground size-4' />
                    <span className='text-muted-foreground text-[10px] font-medium'>مدة العمل</span>
                    <span className='text-foreground font-mono text-sm font-bold'>
                      {durationString}
                    </span>
                  </div>

                  {/* Start KM */}
                  <div className='bg-muted/50 flex flex-col items-center gap-1 rounded-xl border p-3 text-center'>
                    <Icons.gauge className='text-muted-foreground size-4' />
                    <span className='text-muted-foreground text-[10px] font-medium'>
                      عداد البداية
                    </span>
                    <span className='text-foreground font-mono text-base font-bold'>
                      {startKmNum}
                      <span className='text-muted-foreground ms-0.5 text-[10px] font-medium'>
                        كم
                      </span>
                    </span>
                  </div>

                  {/* Start Time */}
                  <div className='bg-muted/50 flex flex-col items-center gap-1 rounded-xl border p-3 text-center'>
                    <Icons.clock className='text-muted-foreground size-4' />
                    <span className='text-muted-foreground text-[10px] font-medium'>
                      وقت البداية
                    </span>
                    <span className='text-foreground font-mono text-xs font-bold'>
                      {activeSession?.start_time
                        ? formatRiyadh(new Date(activeSession.start_time), 'hh:mm a', {
                            locale: ar
                          })
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* End KM + Orders + Fuel + Distance Row */}
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
                  {/* End KM */}
                  <div className='flex flex-col gap-2'>
                    <label className='text-foreground text-sm font-semibold'>
                      قراءة عداد النهاية <span className='text-destructive'>*</span>
                    </label>
                    <div className='relative'>
                      <Input
                        type='text'
                        inputMode='decimal'
                        placeholder={`أكبر من ${activeSession?.start_km ?? 0}`}
                        value={endKm}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9.]/g, '');
                          if ((v.match(/\./g) || []).length <= 1) setEndKm(v);
                        }}
                        required
                        className='h-12 rounded-xl bg-muted pe-14 ps-4 font-mono text-lg font-bold'
                      />
                      <span className='text-muted-foreground absolute top-1/2 -translate-y-1/2 text-xs font-bold end-3'>
                        كم
                      </span>
                    </div>
                  </div>

                  {/* Orders Count */}
                  <div className='flex flex-col gap-2'>
                    <label className='text-foreground flex items-center gap-1.5 text-sm font-semibold'>
                      <Icons.inventory className='text-muted-foreground size-4' />
                      عدد الطلبات
                    </label>
                    <Input
                      type='text'
                      inputMode='numeric'
                      value={ordersCount}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '');
                        setOrdersCount(v);
                      }}
                      className='h-12 rounded-xl bg-muted font-mono text-lg font-bold'
                    />
                  </div>

                  {/* Fuel Cost */}
                  <div className='flex flex-col gap-2'>
                    <label className='text-foreground flex items-center gap-1.5 text-sm font-semibold'>
                      <Icons.fuel className='text-muted-foreground size-4' />
                      الوقود (ر.س)
                    </label>
                    <Input
                      type='text'
                      inputMode='decimal'
                      value={fuelCost}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9.]/g, '');
                        if ((v.match(/\./g) || []).length <= 1) setFuelCost(v);
                      }}
                      className='h-12 rounded-xl bg-muted font-mono text-lg font-bold'
                    />
                  </div>

                  {/* Calculated Distance */}
                  <div className='flex flex-col gap-2'>
                    <label className='text-foreground flex items-center gap-1.5 text-sm font-semibold'>
                      <Icons.route className='text-muted-foreground size-4' />
                      المسافة المقطوعة
                    </label>
                    <div className='bg-muted flex h-12 items-center rounded-xl border border-input px-4'>
                      <span className='text-foreground font-mono text-lg font-bold'>
                        {calculatedDistance.toFixed(2)}
                        <span className='text-muted-foreground ms-1 text-sm font-medium'>كم</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className='flex flex-col gap-2'>
                  <label className='text-foreground flex items-center gap-1.5 text-sm font-semibold'>
                    <Icons.fileText className='text-muted-foreground size-4' />
                    ملاحظات الشفت (اختياري)
                  </label>
                  <textarea
                    placeholder='أي ملاحظات إضافية...'
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className='bg-muted min-h-[80px] w-full resize-none rounded-xl border border-input px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
                  />
                </div>

                {/* Direct Supervisor Certification Notice */}
                <div className='flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300'>
                  <Icons.check className='size-4 shrink-0 text-emerald-600 dark:text-emerald-400' />
                  <span>
                    {t(
                      'مصادقة معتمدة فورياً: إنهاء الدوام من لوحة تحكم المشرف يُعتمد ويُصدّق مباشرة دون الحاجة لمراجعة لاحقة.'
                    )}
                  </span>
                </div>

                {/* Submit */}
                <LoadingButton
                  type='submit'
                  loading={endMutation.isLoading}
                  loadingLabel={t('جاري إنهاء ومصادقة الشفت...')}
                  size='lg'
                  className='h-12 w-full text-base font-bold'
                >
                  <Icons.check className='size-5' />
                  {t('تأكيد وإنهاء الشفت (مصادق فورياً)')}
                </LoadingButton>
              </CardContent>
            </Card>
          </form>
        )}

        {!showForm && !searching && (
          <Card className='border-dashed'>
            <CardContent className='flex flex-col items-center gap-3 py-12'>
              <div className='bg-muted flex size-14 items-center justify-center rounded-2xl'>
                <Icons.qrCode className='text-muted-foreground size-7' />
              </div>
              <div className='space-y-1 text-center'>
                <p className='text-muted-foreground text-sm font-semibold'>
                  {t('اختر موظفاً لديه شفت عمل مفتوح')}
                </p>
                <p className='text-muted-foreground text-xs'>
                  {t('امسح البطاقة أو ابحث بالاسم لإقفال الشفت')}
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
          setEndKm('');
          fetchActiveSession(emp);
        }}
      />
    </PageContainer>
  );
}
