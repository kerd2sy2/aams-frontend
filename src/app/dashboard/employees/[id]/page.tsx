'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { employeeApi } from '@/lib/aams/services';
import { DetailSkeleton } from '@/components/aams/skeletons';
import { QRCodeImage } from '@/components/aams/employee-codes';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getWhatsAppURL } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import PageContainer from '@/components/layout/page-container';
import {
  User,
  Bike,
  Key,
  Printer,
  Edit,
  Trash2,
  ArrowRight,
  QrCode,
  FileCheck,
  IdCard,
  Car,
  X,
  Copy,
  Check,
  MessageCircle,
  AlertTriangle,
  Phone,
  Building2,
  Calendar,
  Gauge,
  Wrench,
  Clock,
  ShieldCheck,
  ExternalLink,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';

export default function EmployeeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lastResetPassword, setLastResetPassword] = useState<string | null>(null);

  const {
    data: employee,
    isLoading,
    isError
  } = useOfflineQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeApi.getById(id),
    cacheKey: `employee_${id}`
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (newPass: string) => employeeApi.resetPassword(id, newPass),
    onSuccess: () => {
      toast.success('تم تحديث وتعيين كلمة مرور المندوب بنجاح!');
      setLastResetPassword(newPassword);
      setPasswordModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'فشل في تحديث كلمة المرور');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => employeeApi.delete(id),
    onSuccess: () => {
      toast.success('تم حذف الموظف بنجاح');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      router.push('/dashboard/employees');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف الموظف');
    }
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('تم النسخ إلى الحافظة');
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <DetailSkeleton />
      </PageContainer>
    );
  }

  if (isError || !employee || !employee.id) {
    return (
      <PageContainer>
        <div className='p-8 text-center text-destructive space-y-4' dir='rtl'>
          <p className='font-bold text-lg'>الموظف غير موجود أو متعذر التحميل</p>
          <Button onClick={() => router.push('/dashboard/employees')}>
            العودة لقائمة الموظفين
          </Button>
        </div>
      </PageContainer>
    );
  }

  const personalImg = employee.personal_image || '';
  const nationalImg = employee.national_id_image || '';
  const licenseImg = employee.driving_license_image || '';
  const passportImg = employee.passport_image || '';
  const vehicleRegImg = employee.vehicle_registration_image || '';

  const waUrl = employee.employee_number ? getWhatsAppURL(employee.employee_number) : null;

  const totalDistanceNum =
    Number(
      employee.total_distance ?? (employee as any).total_km ?? (employee as any).distance ?? 0
    ) || 0;
  const lastOilDistanceNum =
    Number(
      employee.last_oil_change_distance ??
        (employee as any).oil_change_km ??
        (employee as any).distance_since_oil ??
        0
    ) || 0;

  const roleLabel =
    employee.job_role === 'SUPERVISOR'
      ? 'مشرف وردية'
      : employee.job_role === 'MANAGEMENT'
        ? 'إدارة'
        : employee.job_role === 'WORKER'
          ? 'عامل'
          : 'مندوب توصيل';

  const formatAppName = (appType?: string) => {
    if (!appType) return 'نينجا (Ninja)';
    const a = appType.toLowerCase().trim();
    if (a === 'ninja' || a === 'نينجا') return 'نينجا (Ninja)';
    if (a === 'keeta' || a === 'كيتا') return 'كيتا (Keeta)';
    if (a === 'toyou' || a === 'تويو') return 'تويو (ToYou)';
    if (a === 'hungerstation' || a === 'هنقرستيشن') return 'هنقرستيشن (HungerStation)';
    if (a === 'jahez' || a === 'جاهز') return 'جاهز (Jahez)';
    if (a === 'mrsool' || a === 'مرسول') return 'مرسول (Mrsool)';
    if (a === 'shgardi' || a === 'شقرردي') return 'شقرردي (Shgardi)';
    if (a === 'other' || a === 'عام') return 'عام';
    return appType;
  };

  return (
    <PageContainer>
      <div className='space-y-6 w-full max-w-7xl mx-auto pb-10' dir='rtl'>
        {/* Top Header & Actions */}
        <PageHeader
          category='لوحة التحكم / الموظفين'
          title={employee.name || 'مندوب'}
          description={`رقم الهوية: ${employee.national_id || '-'} ${employee.employee_number ? `| الجوال: ${employee.employee_number}` : ''}`}
          actions={
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => router.push('/dashboard/employees')}
                className='gap-1.5'
              >
                <ArrowRight className='size-4' />
                رجوع
              </Button>
              {waUrl && (
                <a href={waUrl} target='_blank' rel='noopener noreferrer'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                  >
                    <MessageCircle className='size-4' />
                    واتساب
                  </Button>
                </a>
              )}
              <Link href={`/dashboard/employees/${id}/card`}>
                <Button variant='outline' size='sm' className='gap-1.5'>
                  <Printer className='size-4' />
                  طباعة البطاقة
                </Button>
              </Link>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  setNewPassword('');
                  setShowPassword(false);
                  setPasswordModalOpen(true);
                }}
                className='gap-1.5 border-primary/30 text-primary hover:bg-primary/10'
              >
                <KeyRound className='size-4' />
                تغيير كلمة المرور
              </Button>
              <Link href={`/dashboard/employees/${id}/edit`}>
                <Button size='sm' className='gap-1.5 font-bold shadow-xs'>
                  <Edit className='size-4' />
                  تعديل
                </Button>
              </Link>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setDeleteModalOpen(true)}
                className='gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/20'
              >
                <Trash2 className='size-4' />
                حذف
              </Button>
            </div>
          }
        />

        {/* Main 2-Column Responsive Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
          {/* Main Info Column (8 cols) */}
          <div className='lg:col-span-8 space-y-6'>
            {/* Hero Profile Card */}
            <Card className='overflow-hidden border-border shadow-xs'>
              <CardContent className='p-6'>
                <div className='flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-right'>
                  <div
                    className='relative size-28 sm:size-32 rounded-2xl bg-muted overflow-hidden shrink-0 border-2 border-border shadow-md flex items-center justify-center cursor-pointer group'
                    onClick={() =>
                      personalImg && setLightbox({ src: personalImg, alt: employee.name })
                    }
                  >
                    {personalImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={personalImg}
                        alt={employee.name}
                        className='size-full object-cover transition-transform duration-300 group-hover:scale-105'
                      />
                    ) : (
                      <User className='size-14 text-muted-foreground' />
                    )}
                  </div>

                  <div className='space-y-3 flex-1 min-w-0'>
                    <div>
                      <div className='flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1.5'>
                        <h2 className='text-2xl sm:text-3xl font-black tracking-tight text-foreground'>
                          {employee.name}
                        </h2>
                        <Badge variant='default' className='font-bold text-xs bg-primary/90'>
                          {roleLabel}
                        </Badge>
                        <Badge
                          variant='outline'
                          className='font-bold text-xs bg-primary/5 text-primary border-primary/20'
                        >
                          تطبيق: {formatAppName(employee.application_type || 'ninja')}
                        </Badge>
                        {employee.branch?.name && (
                          <Badge variant='secondary' className='gap-1 text-xs font-bold'>
                            <Building2 className='size-3' />
                            {employee.branch.name}
                          </Badge>
                        )}
                      </div>
                      <p className='text-sm text-muted-foreground'>
                        مسجل في النظام برقم المعرف:{' '}
                        <span className='font-mono font-bold text-foreground'>
                          {(employee.id || '').slice(0, 8)}
                        </span>
                      </p>
                    </div>

                    <div className='flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1'>
                      {employee.national_id && (
                        <button
                          type='button'
                          onClick={() => copyToClipboard(employee.national_id, 'nid')}
                          className='inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/60 hover:bg-muted text-xs font-mono font-bold transition-colors border border-border/60'
                          title='انقر لنسخ رقم الهوية'
                        >
                          <IdCard className='size-3.5 text-primary' />
                          <span>الهوية: {employee.national_id}</span>
                          {copiedField === 'nid' ? (
                            <Check className='size-3 text-emerald-500' />
                          ) : (
                            <Copy className='size-3 text-muted-foreground opacity-70' />
                          )}
                        </button>
                      )}

                      {employee.employee_number && (
                        <button
                          type='button'
                          onClick={() => copyToClipboard(employee.employee_number, 'phone')}
                          className='inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/60 hover:bg-muted text-xs font-mono font-bold transition-colors border border-border/60'
                          title='انقر لنسخ رقم الجوال'
                        >
                          <Phone className='size-3.5 text-primary' />
                          <span>الجوال: {employee.employee_number}</span>
                          {copiedField === 'phone' ? (
                            <Check className='size-3 text-emerald-500' />
                          ) : (
                            <Copy className='size-3 text-muted-foreground opacity-70' />
                          )}
                        </button>
                      )}

                      {employee.application_id && (
                        <button
                          type='button'
                          onClick={() => copyToClipboard(employee.application_id, 'appid')}
                          className='inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/60 hover:bg-muted text-xs font-mono font-bold transition-colors border border-border/60'
                          title='انقر لنسخ معرف التطبيق'
                        >
                          <span className='size-2 rounded-full bg-primary inline-block' />
                          <span>معرف التطبيق: {employee.application_id}</span>
                          {copiedField === 'appid' ? (
                            <Check className='size-3 text-emerald-500' />
                          ) : (
                            <Copy className='size-3 text-muted-foreground opacity-70' />
                          )}
                        </button>
                      )}

                      {employee.motorcycle_number && (
                        <Badge variant='outline' className='gap-1 font-bold text-xs py-1 px-3'>
                          <Bike className='size-3.5 text-primary' />
                          لوحة:{' '}
                          <span className='font-mono font-black'>{employee.motorcycle_number}</span>
                        </Badge>
                      )}

                      {employee.key_number && (
                        <Badge variant='outline' className='gap-1 font-bold text-xs py-1 px-3'>
                          <Key className='size-3.5 text-amber-500' />
                          مفتاح: <span className='font-mono'>{employee.key_number}</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats Grid */}
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
              <Card className='border-border shadow-2xs'>
                <CardContent className='p-4 text-right space-y-1'>
                  <div className='flex items-center justify-between text-muted-foreground'>
                    <span className='text-xs font-medium'>إجمالي المسافة</span>
                    <Gauge className='size-4 text-primary' />
                  </div>
                  <p className='text-xl font-black font-mono tabular-nums text-foreground'>
                    {totalDistanceNum.toLocaleString('en-US')}{' '}
                    <span className='text-xs font-normal text-muted-foreground'>كم</span>
                  </p>
                </CardContent>
              </Card>

              <Card className='border-border shadow-2xs'>
                <CardContent className='p-4 text-right space-y-1'>
                  <div className='flex items-center justify-between text-muted-foreground'>
                    <span className='text-xs font-medium'>آخر غيار زيت</span>
                    <Wrench className='size-4 text-amber-500' />
                  </div>
                  <p className='text-xl font-black font-mono tabular-nums text-foreground'>
                    {lastOilDistanceNum.toLocaleString('en-US')}{' '}
                    <span className='text-xs font-normal text-muted-foreground'>كم</span>
                  </p>
                </CardContent>
              </Card>

              <Card className='border-border shadow-2xs'>
                <CardContent className='p-4 text-right space-y-1'>
                  <div className='flex items-center justify-between text-muted-foreground'>
                    <span className='text-xs font-medium'>نوع المركبة</span>
                    {employee.vehicle_type === 'car' ? (
                      <Car className='size-4 text-primary' />
                    ) : (
                      <Bike className='size-4 text-primary' />
                    )}
                  </div>
                  <p className='text-base sm:text-lg font-bold text-foreground'>
                    {employee.vehicle_type === 'car' ? 'سيارة' : 'دراجة نارية'}
                  </p>
                </CardContent>
              </Card>

              <Card className='border-border shadow-2xs'>
                <CardContent className='p-4 text-right space-y-1'>
                  <div className='flex items-center justify-between text-muted-foreground'>
                    <span className='text-xs font-medium'>شفت العمل</span>
                    <Clock className='size-4 text-primary' />
                  </div>
                  <p className='text-base sm:text-lg font-bold text-foreground'>
                    {employee.shift === 'evening'
                      ? 'مسائي'
                      : employee.shift === 'night'
                        ? 'ليلي'
                        : 'صباحي'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Official Attached Documents Gallery */}
            <Card className='border-border shadow-xs'>
              <CardHeader className='pb-4 border-b border-border/40'>
                <CardTitle className='text-lg flex items-center gap-2'>
                  <FileCheck className='size-5 text-primary' />
                  المستندات والوثائق الرسمية المرفقة
                </CardTitle>
              </CardHeader>
              <CardContent className='pt-6'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {/* National ID Document */}
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between text-xs font-bold text-foreground'>
                      <span className='flex items-center gap-1.5'>
                        <IdCard className='size-4 text-primary' />
                        صورة الهوية الوطنية / الإقامة
                      </span>
                      {nationalImg && (
                        <span className='text-emerald-600 dark:text-emerald-400 font-medium'>
                          مرفوع ✓
                        </span>
                      )}
                    </div>
                    {nationalImg ? (
                      <div
                        className='rounded-xl overflow-hidden border border-border h-44 bg-muted/20 cursor-pointer flex items-center justify-center relative group'
                        onClick={() => setLightbox({ src: nationalImg, alt: 'الهوية الوطنية' })}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={nationalImg}
                          alt='الهوية الوطنية'
                          className='size-full object-contain p-2 group-hover:scale-105 transition-transform'
                        />
                        <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1'>
                          <ExternalLink className='size-4' />
                          تكبير الصورة
                        </div>
                      </div>
                    ) : (
                      <div className='h-44 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground text-xs gap-1 bg-muted/5'>
                        <IdCard className='size-8 opacity-40' />
                        <span>لم يتم رفع صورة الهوية</span>
                      </div>
                    )}
                  </div>

                  {/* Driving License */}
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between text-xs font-bold text-foreground'>
                      <span className='flex items-center gap-1.5'>
                        <FileCheck className='size-4 text-primary' />
                        صورة رخصة القيادة
                      </span>
                      {licenseImg && (
                        <span className='text-emerald-600 dark:text-emerald-400 font-medium'>
                          مرفوع ✓
                        </span>
                      )}
                    </div>
                    {licenseImg ? (
                      <div
                        className='rounded-xl overflow-hidden border border-border h-44 bg-muted/20 cursor-pointer flex items-center justify-center relative group'
                        onClick={() => setLightbox({ src: licenseImg, alt: 'رخصة القيادة' })}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={licenseImg}
                          alt='رخصة القيادة'
                          className='size-full object-contain p-2 group-hover:scale-105 transition-transform'
                        />
                        <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1'>
                          <ExternalLink className='size-4' />
                          تكبير الصورة
                        </div>
                      </div>
                    ) : (
                      <div className='h-44 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground text-xs gap-1 bg-muted/5'>
                        <FileCheck className='size-8 opacity-40' />
                        <span>لم يتم رفع صورة الرخصة</span>
                      </div>
                    )}
                  </div>

                  {/* Passport Document */}
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between text-xs font-bold text-foreground'>
                      <span className='flex items-center gap-1.5'>
                        <IdCard className='size-4 text-primary' />
                        صورة جواز السفر
                      </span>
                      {passportImg && (
                        <span className='text-emerald-600 dark:text-emerald-400 font-medium'>
                          مرفوع ✓
                        </span>
                      )}
                    </div>
                    {passportImg ? (
                      <div
                        className='rounded-xl overflow-hidden border border-border h-44 bg-muted/20 cursor-pointer flex items-center justify-center relative group'
                        onClick={() => setLightbox({ src: passportImg, alt: 'جواز السفر' })}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={passportImg}
                          alt='جواز السفر'
                          className='size-full object-contain p-2 group-hover:scale-105 transition-transform'
                        />
                        <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1'>
                          <ExternalLink className='size-4' />
                          تكبير الصورة
                        </div>
                      </div>
                    ) : (
                      <div className='h-44 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground text-xs gap-1 bg-muted/5'>
                        <IdCard className='size-8 opacity-40' />
                        <span>لم يتم رفع صورة جواز السفر</span>
                      </div>
                    )}
                  </div>

                  {/* Vehicle Registration */}
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between text-xs font-bold text-foreground'>
                      <span className='flex items-center gap-1.5'>
                        <FileCheck className='size-4 text-primary' />
                        صورة رخصة السير (الاستمارة)
                      </span>
                      {vehicleRegImg && (
                        <span className='text-emerald-600 dark:text-emerald-400 font-medium'>
                          مرفوع ✓
                        </span>
                      )}
                    </div>
                    {vehicleRegImg ? (
                      <div
                        className='rounded-xl overflow-hidden border border-border h-44 bg-muted/20 cursor-pointer flex items-center justify-center relative group'
                        onClick={() =>
                          setLightbox({ src: vehicleRegImg, alt: 'رخصة السير (الاستمارة)' })
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vehicleRegImg}
                          alt='رخصة السير (الاستمارة)'
                          className='size-full object-contain p-2 group-hover:scale-105 transition-transform'
                        />
                        <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1'>
                          <ExternalLink className='size-4' />
                          تكبير الصورة
                        </div>
                      </div>
                    ) : (
                      <div className='h-44 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground text-xs gap-1 bg-muted/5'>
                        <FileCheck className='size-8 opacity-40' />
                        <span>لم يتم رفع صورة رخصة السير</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Column (4 cols) */}
          <div className='lg:col-span-4 space-y-6'>
            {/* Dedicated QR & ID Card */}
            <Card className='border-border shadow-xs'>
              <CardHeader className='pb-3 border-b border-border/40'>
                <CardTitle className='text-base flex items-center gap-2'>
                  <QrCode className='size-4 text-primary' />
                  رمز الاستجابة السريعة (UUID QR)
                </CardTitle>
              </CardHeader>
              <CardContent className='pt-5 flex flex-col items-center text-center space-y-4'>
                <div className='bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800'>
                  <QRCodeImage value={employee.id} size={140} />
                </div>

                <div className='w-full space-y-1 text-center'>
                  <p className='text-xs font-bold text-foreground'>المعرف الرقمي الموحد</p>
                  <p className='text-[11px] font-mono text-muted-foreground select-all break-all bg-muted/50 p-2 rounded-lg border border-border/50'>
                    {employee.id}
                  </p>
                </div>

                <div className='w-full grid grid-cols-2 gap-2 pt-1'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => copyToClipboard(employee.id, 'uuid')}
                    className='gap-1.5 text-xs w-full font-bold'
                  >
                    {copiedField === 'uuid' ? (
                      <>
                        <Check className='size-3.5 text-emerald-500' />
                        تم النسخ
                      </>
                    ) : (
                      <>
                        <Copy className='size-3.5' />
                        نسخ المعرف
                      </>
                    )}
                  </Button>

                  <Link href={`/dashboard/employees/${id}/card`} className='w-full'>
                    <Button
                      variant='default'
                      size='sm'
                      className='gap-1.5 text-xs w-full font-bold shadow-xs'
                    >
                      <Printer className='size-3.5' />
                      طباعة البطاقة
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Employment & System Metadata */}
            <Card className='border-border shadow-xs'>
              <CardHeader className='pb-3 border-b border-border/40'>
                <CardTitle className='text-base flex items-center gap-2'>
                  <ShieldCheck className='size-4 text-primary' />
                  بيانات التعيين والنظام
                </CardTitle>
              </CardHeader>
              <CardContent className='pt-4 text-sm divide-y divide-border/40'>
                <div className='py-2.5 flex items-center justify-between'>
                  <span className='text-muted-foreground text-xs'>الفرع التابع له</span>
                  <span className='font-bold text-foreground'>
                    {employee.branch?.name || 'الفرع الرئيسي'}
                  </span>
                </div>

                <div className='py-2.5 flex items-center justify-between'>
                  <span className='text-muted-foreground text-xs'>الوظيفة</span>
                  <span className='font-bold text-foreground'>{roleLabel}</span>
                </div>

                <div className='py-2.5 flex items-center justify-between'>
                  <span className='text-muted-foreground text-xs'>التطبيق</span>
                  <span className='font-bold text-foreground'>
                    {formatAppName(employee.application_type || 'ninja')}
                  </span>
                </div>

                <div className='py-2.5 flex items-center justify-between'>
                  <span className='text-muted-foreground text-xs'>معرف التطبيق (ID)</span>
                  <span className='font-mono font-bold text-foreground'>
                    {employee.application_id || '—'}
                  </span>
                </div>

                <div className='py-2.5 flex items-center justify-between'>
                  <span className='text-muted-foreground text-xs'>تاريخ انتهاء الإقامة</span>
                  <span className='font-mono font-bold text-foreground'>
                    {employee.iqama_expiration_date
                      ? employee.iqama_expiration_date.slice(0, 10)
                      : 'غير محدد'}
                  </span>
                </div>

                <div className='py-2.5 flex items-center justify-between'>
                  <span className='text-muted-foreground text-xs'>تاريخ التسجيل</span>
                  <span className='font-mono text-xs text-muted-foreground'>
                    {employee.created_at
                      ? new Date(employee.created_at).toLocaleDateString('ar-SA')
                      : '-'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Security & Password Card */}
            <Card className='border-border shadow-xs'>
              <CardHeader className='pb-3 border-b border-border/40'>
                <CardTitle className='text-base flex items-center gap-2'>
                  <KeyRound className='size-4 text-amber-500' />
                  أمان الحساب وكلمة المرور
                </CardTitle>
              </CardHeader>
              <CardContent className='pt-4 text-sm space-y-3'>
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  يمكن للمشرف تعيين كلمة مرور جديدة للمندوب لتسجيل الدخول إلى تطبيق الهاتف.
                </p>

                {lastResetPassword && (
                  <div className='p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-2'>
                    <div>
                      <div className='text-xs text-emerald-600 dark:text-emerald-400 font-bold'>
                        كلمة المرور المعينة حديثاً:
                      </div>
                      <div className='font-mono font-bold text-sm tracking-wider'>
                        {lastResetPassword}
                      </div>
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => copyToClipboard(lastResetPassword, 'last_pass')}
                      className='h-8 px-2 text-xs'
                    >
                      {copiedField === 'last_pass' ? (
                        <Check className='size-3.5 text-emerald-500' />
                      ) : (
                        <Copy className='size-3.5' />
                      )}
                    </Button>
                  </div>
                )}

                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setNewPassword('');
                    setShowPassword(false);
                    setPasswordModalOpen(true);
                  }}
                  className='w-full gap-2 font-bold border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                >
                  <Lock className='size-4' />
                  تعيين كلمة مرور جديدة
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Password Reset Modal */}
        {passwordModalOpen && (
          <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4'>
            <Card className='max-w-md w-full p-6 space-y-5 shadow-2xl border-border'>
              <div className='flex items-center justify-between border-b border-border/40 pb-3'>
                <div className='flex items-center gap-2.5 text-primary'>
                  <div className='size-9 rounded-xl bg-primary/10 flex items-center justify-center'>
                    <KeyRound className='size-5 text-primary' />
                  </div>
                  <div>
                    <h3 className='text-base font-bold text-foreground'>تعيين كلمة مرور للمندوب</h3>
                    <p className='text-xs text-muted-foreground'>{employee.name}</p>
                  </div>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-8 rounded-full'
                  onClick={() => setPasswordModalOpen(false)}
                >
                  <X className='size-4' />
                </Button>
              </div>

              <div className='space-y-3'>
                <div className='space-y-1.5'>
                  <label className='text-xs font-bold text-foreground'>كلمة المرور الجديدة</label>
                  <div className='relative'>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder='أدخل كلمة المرور الجديدة (4 أرقام / أحرف على الأقل)...'
                      className='w-full h-10 px-3 pr-9 pl-10 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40'
                      dir='ltr'
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                    >
                      {showPassword ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
                    </button>
                  </div>
                </div>

                {/* Quick Generator Helpers */}
                <div className='flex flex-wrap items-center gap-1.5 pt-1'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='text-xs h-7 gap-1 bg-muted/50'
                    onClick={() => {
                      if (employee.national_id && employee.national_id.length >= 6) {
                        const last6 = employee.national_id.slice(-6);
                        setNewPassword(last6);
                        setShowPassword(true);
                        toast.info(`تم تعيين آخر 6 أرقام من الهوية (${last6})`);
                      } else {
                        toast.error('رقم الهوية غير مكتمل');
                      }
                    }}
                  >
                    <Sparkles className='size-3 text-primary' />
                    آخر 6 أرقام من الهوية
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='text-xs h-7 gap-1 bg-muted/50'
                    onClick={() => {
                      const rnd = Math.floor(100000 + Math.random() * 900000).toString();
                      setNewPassword(rnd);
                      setShowPassword(true);
                      toast.info(`تم توليد كلمة مرور عشوائية (${rnd})`);
                    }}
                  >
                    <Sparkles className='size-3 text-amber-500' />
                    توليد 6 أرقام عشوائية
                  </Button>
                </div>
              </div>

              <div className='flex items-center justify-end gap-2 pt-2 border-t border-border/40'>
                <Button
                  variant='outline'
                  onClick={() => setPasswordModalOpen(false)}
                  disabled={resetPasswordMutation.isPending}
                >
                  إلغاء
                </Button>
                <Button
                  variant='default'
                  disabled={
                    !newPassword.trim() ||
                    newPassword.trim().length < 4 ||
                    resetPasswordMutation.isPending
                  }
                  onClick={() => resetPasswordMutation.mutate(newPassword.trim())}
                  className='gap-1.5 font-bold shadow-xs'
                >
                  {resetPasswordMutation.isPending ? 'جاري الحفظ...' : 'تحديث كلمة المرور'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4'>
            <Card className='max-w-md w-full p-6 space-y-4'>
              <div className='flex items-center gap-3 text-destructive'>
                <AlertTriangle className='size-6 shrink-0' />
                <h3 className='text-lg font-bold'>تأكيد حذف الموظف</h3>
              </div>
              <p className='text-sm text-muted-foreground'>
                هل أنت متأكد من رغبتك في حذف الموظف{' '}
                <span className='font-bold text-foreground'>{employee.name}</span>؟ لا يمكن التراجع
                عن هذا الإجراء.
              </p>
              <div className='flex items-center justify-end gap-2 pt-2'>
                <Button variant='outline' onClick={() => setDeleteModalOpen(false)}>
                  إلغاء
                </Button>
                <Button
                  variant='destructive'
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                >
                  {deleteMutation.isPending ? 'جاري الحذف...' : 'نعم، احذف'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Lightbox Modal */}
        {lightbox && (
          <div
            className='fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer'
            onClick={() => setLightbox(null)}
          >
            <div className='relative max-w-3xl max-h-[85vh]'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.src}
                alt={lightbox.alt}
                className='max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl'
              />
              <button
                onClick={() => setLightbox(null)}
                className='absolute top-3 left-3 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition-colors'
              >
                <X className='size-5' />
              </button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
