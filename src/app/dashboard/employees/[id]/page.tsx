'use client';

import React, { use, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { employeeApi } from '@/lib/aams/services';
import { DetailSkeleton } from '@/components/aams/skeletons';
import { Code128Barcode, QRCodeImage } from '@/components/aams/employee-codes';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn, getWhatsAppURL } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import PageContainer from '@/components/layout/page-container';
import {
  User,
  CreditCard,
  Bike,
  Key,
  AppWindow,
  Printer,
  Edit,
  Trash2,
  ArrowRight,
  QrCode,
  Barcode as BarcodeIcon,
  Calendar,
  FileCheck,
  IdCard,
  Car,
  Hash,
  X,
  Maximize2,
  Copy,
  Check,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react';

export default function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const { data: employee, isLoading, isError } = useOfflineQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeApi.getById(id),
    cacheKey: `employee_${id}`,
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
    },
  });

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
        <div className="p-8 text-center text-destructive space-y-4" dir="rtl">
          <p className="font-bold text-lg">الموظف غير موجود أو متعذر التحميل</p>
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

  const waUrl = employee.employee_number ? getWhatsAppURL(employee.employee_number) : null;

  return (
    <PageContainer>
      <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
        <PageHeader
          category="تفاصيل المندوب"
          title={employee.name || 'مندوب'}
          description={`المعرف: ${employee.employee_number || (employee.id || '').slice(0, 8)} | الهوية: ${employee.national_id || '-'}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {waUrl && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    <MessageCircle className="size-4" />
                    واتساب
                  </Button>
                </a>
              )}
              <Link href={`/dashboard/employees/${id}/card`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Printer className="size-4" />
                  طباعة البطاقة
                </Button>
              </Link>
              <Link href={`/dashboard/employees/${id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Edit className="size-4" />
                  تعديل
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalOpen(true)}
                className="gap-1.5 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
                حذف
              </Button>
            </div>
          }
        />

        {/* Profile Card Header */}
        <Card className="overflow-hidden border-border">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-right">
              <div className="size-24 sm:size-28 rounded-2xl bg-muted overflow-hidden shrink-0 border-2 border-border shadow-sm flex items-center justify-center">
                {personalImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={personalImg}
                    alt={employee.name}
                    className="size-full object-cover cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setLightbox({ src: personalImg, alt: employee.name })}
                  />
                ) : (
                  <User className="size-12 text-muted-foreground" />
                )}
              </div>

              <div className="space-y-2 flex-1 min-w-0">
                <h2 className="text-2xl font-bold">{employee.name}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <Badge variant="secondary" className="gap-1 font-bold">
                    <Bike className="size-3.5" />
                    دراجة: {employee.motorcycle_number || '-'}
                  </Badge>
                  <Badge variant="outline" className="font-mono font-bold">
                    مفتاح: {employee.key_number || '-'}
                  </Badge>
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">
                    {employee.application_id || 'عام'}
                  </Badge>
                  {employee.branch?.name && (
                    <Badge variant="secondary">
                      {employee.branch.name}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground font-mono mt-1">
                  رقم الهوية: {employee.national_id}
                </p>
              </div>

              {/* Barcode & QR Box in Header */}
              <div className="bg-muted/40 rounded-xl p-3 border border-border/60 flex flex-row items-center gap-4">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="bg-white p-1.5 rounded-lg shadow-2xs border border-slate-200 dark:border-slate-800">
                    <QRCodeImage
                      value={employee.id}
                      size={58}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                    <QrCode className="size-3" />
                    QR (UUID)
                  </span>
                </div>

                <div className="h-16 w-px bg-border/60" />

                <div className="flex flex-col items-center gap-1.5">
                  <div className="bg-white p-1.5 rounded-lg shadow-2xs border border-slate-200 dark:border-slate-800">
                    <Code128Barcode value={employee.national_id || employee.barcode} height={36} />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {employee.national_id || employee.barcode}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">إجمالي المسافة</p>
              <p className="text-xl font-bold font-mono tabular-nums mt-1">
                {(employee.total_distance || 0).toLocaleString('ar-SA')} كم
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">آخر مسافة زيت</p>
              <p className="text-xl font-bold font-mono tabular-nums mt-1">
                {(employee.last_oil_change_distance || 0).toLocaleString('ar-SA')} كم
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">المركبة</p>
              <p className="text-lg font-bold mt-1">
                {employee.vehicle_type === 'car' ? 'سيارة' : 'دراجة نارية'}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">الشفت</p>
              <p className="text-lg font-bold mt-1">
                {employee.shift || 'صباحي'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Dedicated QR & Barcode Section Card */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="size-4 text-primary" />
              أكواد التعريف والمطابقة الرقمية (QR UUID & Barcode)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* QR Box */}
              <div className="p-4 rounded-xl border bg-muted/20 flex flex-col items-center justify-center text-center gap-3">
                <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800">
                  <QRCodeImage
                    value={employee.id}
                    size={140}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">رمز الاستجابة السريعة (UUID QR Code)</p>
                  <p className="text-xs text-muted-foreground font-mono select-all">
                    {employee.id}
                  </p>
                </div>
              </div>

              {/* Barcode Box */}
              <div className="p-4 rounded-xl border bg-muted/20 flex flex-col items-center justify-center text-center gap-3">
                <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 w-full flex items-center justify-center min-h-[140px]">
                  <Code128Barcode
                    value={employee.national_id || employee.barcode}
                    height={55}
                    className="max-w-[240px]"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">الباركود الخطي (رقم الهوية)</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {employee.national_id || employee.barcode}
                  </p>
                </div>
              </div>

              {/* Barcode Box */}
              <div className="p-4 rounded-xl border bg-muted/20 flex flex-col items-center justify-center text-center gap-3">
                <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 w-full flex items-center justify-center min-h-[140px]">
                  <Code128Barcode
                    value={employee.barcode || employee.national_id}
                    height={55}
                    className="max-w-[240px]"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">الباركود الخطي (Code128 Barcode)</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {employee.barcode || employee.national_id}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <IdCard className="size-4 text-primary" />
                صورة الهوية الوطنية / الإقامة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nationalImg ? (
                <div
                  className="rounded-xl overflow-hidden border border-border h-48 bg-muted/30 cursor-pointer flex items-center justify-center"
                  onClick={() => setLightbox({ src: nationalImg, alt: 'الهوية الوطنية' })}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={nationalImg} alt="الهوية الوطنية" className="size-full object-contain" />
                </div>
              ) : (
                <div className="h-48 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
                  لم يتم رفع صورة الهوية
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="size-4 text-primary" />
                صورة رخصة القيادة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {licenseImg ? (
                <div
                  className="rounded-xl overflow-hidden border border-border h-48 bg-muted/30 cursor-pointer flex items-center justify-center"
                  onClick={() => setLightbox({ src: licenseImg, alt: 'رخصة القيادة' })}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={licenseImg} alt="رخصة القيادة" className="size-full object-contain" />
                </div>
              ) : (
                <div className="h-48 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
                  لم يتم رفع صورة الرخصة
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-3 text-destructive">
                <AlertTriangle className="size-6 shrink-0" />
                <h3 className="text-lg font-bold">تأكيد حذف الموظف</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                هل أنت متأكد من رغبتك في حذف الموظف <span className="font-bold text-foreground">{employee.name}</span>؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                  إلغاء
                </Button>
                <Button
                  variant="destructive"
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
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setLightbox(null)}
          >
            <div className="relative max-w-3xl max-h-[85vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lightbox.src} alt={lightbox.alt} className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl" />
              <button
                onClick={() => setLightbox(null)}
                className="absolute top-3 left-3 bg-black/60 text-white rounded-full p-2 hover:bg-black/80"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
