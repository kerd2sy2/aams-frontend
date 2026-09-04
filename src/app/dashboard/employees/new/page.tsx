'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import * as z from 'zod';
import { employeeApi, branchApi, vehicleApi } from '@/lib/aams/services';
import { ImageUploader } from '@/components/aams/image-uploader';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import PageContainer from '@/components/layout/page-container';
import Link from 'next/link';
import {
  UserPlus,
  Loader2,
  Save,
  Building2,
  Bike,
  Car,
  Gauge,
  PlusCircle,
  Wrench,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

const employeeSchema = z.object({
  name: z.string().min(3, 'اسم الموظف يجب أن لا يقل عن 3 أحرف'),
  national_id: z.string().min(8, 'يرجى إدخال رقم هوية صحيح'),
  employee_number: z.string().optional(),
  key_number: z.string().optional(),
  motorcycle_number: z.string().optional(),
  application_id: z.string().optional()
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export default function NewEmployeePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Image states
  const [personalImage, setPersonalImage] = useState('');
  const [nationalIdImage, setNationalIdImage] = useState('');
  const [drivingLicenseImage, setDrivingLicenseImage] = useState('');
  const [passportImage, setPassportImage] = useState('');
  const [vehicleRegistrationImage, setVehicleRegistrationImage] = useState('');
  const [branchId, setBranchId] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [applicationType, setApplicationType] = useState('ninja');
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [shift, setShift] = useState('morning');
  const [jobRole, setJobRole] = useState('DRIVER');
  const [iqamaExpirationDate, setIqamaExpirationDate] = useState('');
  const [selectedVehiclePlate, setSelectedVehiclePlate] = useState('');
  const [isManualVehicle, setIsManualVehicle] = useState(false);

  const isDriver = jobRole === 'DRIVER';

  // Fetch registered fleet vehicles
  const { data: vehiclesData } = useOfflineQuery({
    queryKey: ['vehicles-list'],
    queryFn: () => vehicleApi.getAll({ limit: 500 }),
    cacheKey: 'vehicles_all',
    enabled: isDriver
  });

  const vehiclesList = useMemo(() => {
    return vehiclesData?.data || [];
  }, [vehiclesData]);

  // Check if current user is general manager
  const currentAdmin = useMemo(() => {
    if (typeof window === 'undefined') return { branch_id: null as string | null };
    try {
      return JSON.parse(localStorage.getItem('admin_user') || '{}');
    } catch {
      return { branch_id: null as string | null };
    }
  }, []);

  const isGeneralMgr = !currentAdmin.branch_id;

  // Fetch branches only for general manager
  const { data: branches } = useOfflineQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
    enabled: isGeneralMgr,
    cacheKey: 'branches_all'
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema)
  });

  const onSubmit = async (values: EmployeeFormValues) => {
    try {
      setLoading(true);
      const newEmp = await employeeApi.create({
        ...values,
        job_role: jobRole,
        iqama_expiration_date: iqamaExpirationDate || undefined,
        employee_number: employeeNumber,
        phone: employeeNumber,
        personal_image: personalImage,
        national_id_image: nationalIdImage,
        driving_license_image: isDriver ? drivingLicenseImage : '',
        passport_image: passportImage,
        vehicle_registration_image: isDriver ? vehicleRegistrationImage : '',
        application_type: isDriver ? applicationType : '',
        vehicle_type: isDriver ? vehicleType : '',
        motorcycle_number: isDriver ? selectedVehiclePlate || values.motorcycle_number || '' : '',
        key_number: isDriver ? values.key_number || '' : '',
        application_id: isDriver ? values.application_id || '' : '',
        shift: isDriver ? shift : 'morning',
        ...(isGeneralMgr && branchId ? { branch_id: branchId } : {})
      });

      toast.success(`تم إنشاء ملف الموظف ${newEmp.name} وتوليد الـ Barcode و الـ QR بنجاح!`);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      router.push(`/dashboard/employees`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'حدث خطأ أثناء إضافة الموظف');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className='space-y-6 w-full max-w-6xl mx-auto pb-10' dir='rtl'>
        <PageHeader
          title='إضافة موظف جديد'
          description='تسجيل بيانات الموظف، الهوية، وتوليد البطاقة الذكية'
          actions={
            <Button
              variant='outline'
              onClick={() => router.push('/dashboard/employees')}
              className='gap-2'
            >
              <ArrowRight className='size-4' />
              العودة للموظفين
            </Button>
          }
        />

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
          <Card>
            <CardHeader className='border-b border-border/40 pb-4'>
              <CardTitle className='text-lg flex items-center gap-2'>
                <UserPlus className='size-5 text-primary' />
                البيانات الأساسية
              </CardTitle>
            </CardHeader>
            <CardContent className='pt-6 space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>
                    اسم الموظف الرباعي <span className='text-destructive'>*</span>
                  </Label>
                  <Input id='name' placeholder='مثال: أحمد محمد علي حسن' {...register('name')} />
                  {errors.name && <p className='text-xs text-destructive'>{errors.name.message}</p>}
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='national_id'>
                    رقم الهوية الوطنية / الإقامة <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    id='national_id'
                    placeholder='10 أرقام'
                    dir='ltr'
                    className='font-mono text-right'
                    {...register('national_id')}
                  />
                  {errors.national_id && (
                    <p className='text-xs text-destructive'>{errors.national_id.message}</p>
                  )}
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-2'>
                <div className='space-y-2'>
                  <Label htmlFor='iqama_expiration_date'>تاريخ انتهاء الإقامة / الهوية</Label>
                  <Input
                    id='iqama_expiration_date'
                    type='date'
                    value={iqamaExpirationDate}
                    onChange={(e) => setIqamaExpirationDate(e.target.value)}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='job_role'>
                    الوظيفة <span className='text-destructive'>*</span>
                  </Label>
                  <select
                    id='job_role'
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    className='w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20'
                  >
                    <option value='DRIVER'>مندوب توصيل (سائق)</option>
                    <option value='SUPERVISOR'>مشرف وردية</option>
                    <option value='MANAGEMENT'>إدارة</option>
                    <option value='WORKER'>عامل</option>
                  </select>
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-2'>
                <div className='space-y-2'>
                  <Label htmlFor='employee_number'>رقم الجوال (معرف الموظف في النظام)</Label>
                  <Input
                    id='employee_number'
                    placeholder='مثال: 0501234567'
                    dir='ltr'
                    className='font-mono text-right'
                    value={employeeNumber}
                    onChange={(e) => setEmployeeNumber(e.target.value)}
                  />
                </div>

                {isGeneralMgr && (
                  <div className='space-y-2'>
                    <Label htmlFor='branch_id'>الفرع التابع له</Label>
                    <select
                      id='branch_id'
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className='w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
                    >
                      <option value=''>-- اختر الفرع --</option>
                      {(branches || []).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Courier-only Fleet & Vehicle Assignment Section */}
              {isDriver ? (
                <>
                  <div className='pt-3 border-t border-border/40 space-y-3'>
                    <div className='flex items-center justify-between'>
                      <Label className='text-sm font-semibold flex items-center gap-1.5'>
                        <Bike className='size-4 text-primary' />
                        اختيار الدباب / المركبة من الأسطول (خاص بالمندوب)
                      </Label>
                      <div className='flex items-center gap-3'>
                        <button
                          type='button'
                          onClick={() => {
                            setIsManualVehicle(!isManualVehicle);
                            if (!isManualVehicle) {
                              setSelectedVehiclePlate('');
                            }
                          }}
                          className='text-xs text-primary hover:underline font-medium cursor-pointer'
                        >
                          {isManualVehicle ? '← اختيار من دبابات الأسطول' : '+ إدخال رقم لوحة يدوي'}
                        </button>
                        <Link
                          href='/dashboard/vehicles'
                          target='_blank'
                          className='text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1'
                        >
                          <PlusCircle className='size-3.5' />
                          إدارة الأسطول
                        </Link>
                      </div>
                    </div>

                    {!isManualVehicle && vehiclesList.length > 0 ? (
                      <div className='space-y-3'>
                        <select
                          value={selectedVehiclePlate}
                          onChange={(e) => {
                            const plate = e.target.value;
                            setSelectedVehiclePlate(plate);
                            setValue('motorcycle_number', plate);
                            const matched = vehiclesList.find((v) => v.plate_number === plate);
                            if (matched) {
                              setVehicleType(matched.type === 'CAR' ? 'car' : 'motorcycle');
                            }
                          }}
                          className='w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20'
                        >
                          <option value=''>-- اختر الدباب / السيارة من الأسطول --</option>
                          {vehiclesList.map((v) => (
                            <option key={v.id} value={v.plate_number}>
                              {v.type === 'CAR' ? '🚗 سيارة' : '🏍️ دباب'} | لوحة: {v.plate_number}{' '}
                              {v.make ? `(${v.make} ${v.model || ''})` : ''} — العداد الحالي:{' '}
                              {v.current_km.toLocaleString('en-US')} كم
                            </option>
                          ))}
                        </select>

                        {selectedVehiclePlate &&
                          (() => {
                            const v = vehiclesList.find(
                              (veh) => veh.plate_number === selectedVehiclePlate
                            );
                            if (!v) return null;
                            return (
                              <div className='p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex flex-wrap items-center justify-between gap-3 text-xs'>
                                <div className='flex items-center gap-3'>
                                  <div className='size-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold'>
                                    {v.type === 'CAR' ? (
                                      <Car className='size-5' />
                                    ) : (
                                      <Bike className='size-5' />
                                    )}
                                  </div>
                                  <div>
                                    <p className='font-bold text-foreground text-sm'>
                                      {v.type === 'CAR' ? 'سيارة' : 'دباب'} لوحة:{' '}
                                      <span className='font-mono text-primary font-black'>
                                        {v.plate_number}
                                      </span>
                                    </p>
                                    <p className='text-muted-foreground text-[11px]'>
                                      {v.make} {v.model} {v.year ? `(${v.year})` : ''}{' '}
                                      {v.color ? `| اللون: ${v.color}` : ''}
                                    </p>
                                  </div>
                                </div>

                                <div className='flex items-center gap-3'>
                                  <div className='px-3 py-1.5 rounded-lg bg-background border font-mono'>
                                    <span className='text-muted-foreground text-[10px] block'>
                                      العداد التراكمي المشترك
                                    </span>
                                    <span className='font-bold text-foreground text-sm flex items-center gap-1'>
                                      <Gauge className='size-3.5 text-primary' />
                                      {v.current_km.toLocaleString('en-US')} كم
                                    </span>
                                  </div>

                                  <div className='px-3 py-1.5 rounded-lg bg-background border'>
                                    <span className='text-muted-foreground text-[10px] block'>
                                      حالة تغيير الزيت
                                    </span>
                                    <span className='font-medium text-xs flex items-center gap-1'>
                                      <Wrench className='size-3.5 text-amber-500' />
                                      {v.oil_interval_km &&
                                      v.current_km - (v.last_oil_change_km || 0) >=
                                        v.oil_interval_km ? (
                                        <span className='text-destructive font-bold'>
                                          يحتاج تغيير زيت
                                        </span>
                                      ) : (
                                        <span className='text-emerald-600 dark:text-emerald-400 font-bold'>
                                          سليم
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                      </div>
                    ) : (
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                          <Label htmlFor='vehicle_type'>نوع المركبة</Label>
                          <select
                            id='vehicle_type'
                            value={vehicleType}
                            onChange={(e) => setVehicleType(e.target.value)}
                            className='w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
                          >
                            <option value='motorcycle'>دراجة نارية (موتوسيكل)</option>
                            <option value='car'>سيارة</option>
                          </select>
                        </div>

                        <div className='space-y-2'>
                          <Label htmlFor='motorcycle_number'>
                            {vehicleType === 'car' ? 'رقم لوحة السيارة' : 'رقم لوحة الدباب'}
                          </Label>
                          <Input
                            id='motorcycle_number'
                            placeholder='مثال: 2565 أو 1234 أ ب ج'
                            {...register('motorcycle_number')}
                          />
                        </div>
                      </div>
                    )}

                    <div className='space-y-2'>
                      <Label htmlFor='key_number'>رقم المفتاح / الكود</Label>
                      <Input
                        id='key_number'
                        placeholder='مثال: 105'
                        dir='ltr'
                        className='font-mono text-right'
                        {...register('key_number')}
                      />
                    </div>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4 pt-2'>
                    <div className='space-y-2'>
                      <Label htmlFor='application_type'>التطبيق</Label>
                      <select
                        id='application_type'
                        value={applicationType}
                        onChange={(e) => setApplicationType(e.target.value)}
                        className='w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20'
                      >
                        <option value='ninja'>نينجا (Ninja)</option>
                        <option value='keeta'>كيتا (Keeta)</option>
                        <option value='toyou'>تويو (ToYou)</option>
                        <option value='hungerstation'>هنقرستيشن (HungerStation)</option>
                        <option value='jahez'>جاهز (Jahez)</option>
                        <option value='mrsool'>مرسول (Mrsool)</option>
                        <option value='shgardi'>شقرردي (Shgardi)</option>
                        <option value='other'>أخرى / عام</option>
                      </select>
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='application_id'>معرف التطبيق (ID داخل التطبيق)</Label>
                      <Input
                        id='application_id'
                        placeholder='مثال: 255865'
                        {...register('application_id')}
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='shift'>شفت العمل الافتراضي</Label>
                      <select
                        id='shift'
                        value={shift}
                        onChange={(e) => setShift(e.target.value)}
                        className='w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
                      >
                        <option value='morning'>صباحي</option>
                        <option value='evening'>مسائي</option>
                        <option value='night'>ليلي</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <div className='p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3 text-xs'>
                  <div className='size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0'>
                    <ShieldCheck className='size-5' />
                  </div>
                  <div>
                    <p className='font-bold text-foreground text-sm'>
                      بيانات الوظيفة:{' '}
                      {jobRole === 'SUPERVISOR'
                        ? 'مشرف وردية'
                        : jobRole === 'MANAGEMENT'
                          ? 'إدارة'
                          : 'عامل'}
                    </p>
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      الوظيفة المختارة إدارية/إشرافية ولا تتطلب تخصيص دراجة من الأسطول أو رقم مفتاح أو
                      تطبيق توصيل.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Uploads Card */}
          <Card>
            <CardHeader className='border-b border-border/40 pb-4'>
              <CardTitle className='text-lg flex items-center gap-2'>
                <Building2 className='size-5 text-primary' />
                المستندات والصور
              </CardTitle>
            </CardHeader>
            <CardContent className='pt-6'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                <ImageUploader
                  label='الصورة الشخصية'
                  value={personalImage}
                  onChange={setPersonalImage}
                  category='personal'
                  description='صورة الموظف'
                />

                <ImageUploader
                  label='صورة الهوية / الإقامة'
                  value={nationalIdImage}
                  onChange={setNationalIdImage}
                  category='national_id'
                  description='صورة الهوية'
                />

                <ImageUploader
                  label='صورة جواز السفر'
                  value={passportImage}
                  onChange={setPassportImage}
                  category='passport'
                  description='صورة جواز السفر'
                />

                {isDriver ? (
                  <>
                    <ImageUploader
                      label='صورة رخصة القيادة'
                      value={drivingLicenseImage}
                      onChange={setDrivingLicenseImage}
                      category='license'
                      description='صورة الرخصة'
                    />

                    <ImageUploader
                      label='صورة رخصة السير (الاستمارة)'
                      value={vehicleRegistrationImage}
                      onChange={setVehicleRegistrationImage}
                      category='registration'
                      description='استمارة المركبة / الدباب'
                    />
                  </>
                ) : (
                  <div className='flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 text-center text-muted-foreground bg-muted/20'>
                    <ShieldCheck className='size-8 text-muted-foreground/50 mb-2' />
                    <p className='text-xs font-semibold'>رخصة القيادة والسير غير مطلوبة</p>
                    <p className='text-[11px] text-muted-foreground mt-1'>
                      خاصة فقط بمناديب وسائقي التوصيل
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className='flex items-center justify-end gap-3 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => router.push('/dashboard/employees')}
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button type='submit' disabled={loading} className='gap-2 font-bold px-6 shadow-xs'>
              {loading ? (
                <>
                  <Loader2 className='size-4 animate-spin' />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className='size-4' />
                  حفظ الموظف وتوليد البطاقة
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
