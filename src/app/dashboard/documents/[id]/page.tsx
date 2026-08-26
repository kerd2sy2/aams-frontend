'use client';

import React, { use, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { documentApi, employeeApi } from '@/lib/aams/services';
import { DetailSkeleton } from '@/components/aams/skeletons';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn, getWhatsAppURL } from '@/lib/utils';
import PageContainer from '@/components/layout/page-container';
import { Icons } from '@/components/icons';
import { formatRiyadhDate } from '@/lib/aams/riyadh-time';
import type { EmployeeDocument, Employee } from '@/types/aams';
import { DocumentContentPreview } from '@/components/aams/document-content-preview';
import { QRCodeImage } from '@/components/aams/employee-codes';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Download,
  ExternalLink,
  Printer,
  FileText,
  Eye,
  AlertCircle,
  FileCode,
  FileSpreadsheet,
  FileQuestion,
  Volume2,
  QrCode,
  ShieldCheck
} from 'lucide-react';

const DOC_TYPES: Record<string, { label: string; icon: keyof typeof Icons; color: string }> = {
  PROMISSORY_NOTE: { label: 'سند لأمر', icon: 'fileCertificate', color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300' },
  CONTRACT: { label: 'عقد عمل', icon: 'fileText', color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300' },
  DRIVING_LICENSE: { label: 'رخصة قيادة', icon: 'certificate', color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' },
  VEHICLE_REGISTRATION: { label: 'استمارة مركبة', icon: 'bike', color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' },
  CRIMINAL_RECORD: { label: 'خلو سوابق', icon: 'shieldAlert', color: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300' },
  MEDICAL_INSURANCE: { label: 'تأمين طبي', icon: 'badgeCheck', color: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300' },
  OTHER: { label: 'مستند آخر', icon: 'page', color: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300' }
};

function resolveFullUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  const backendBase = (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ||
    'http://localhost:8081'
  ).replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${backendBase}${cleanPath}`;
}

export default function DocumentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  // State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imgLoadError, setImgLoadError] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDocType, setEditDocType] = useState('');
  const [editDocNumber, setEditDocNumber] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editIssueDate, setEditIssueDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editStatus, setEditStatus] = useState('VALID');
  const [editNotes, setEditNotes] = useState('');
  const [editFileUrl, setEditFileUrl] = useState('');
  const [editFileName, setEditFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch document
  const { data: doc, isLoading, isError } = useOfflineQuery<EmployeeDocument>({
    queryKey: ['document', id],
    queryFn: () => documentApi.getById(id),
    cacheKey: `document_${id}`,
  });

  // Fetch employees for edit dropdown
  useEffect(() => {
    employeeApi.getAll({ limit: 500 }).then(res => setEmployees(res.data || [])).catch(() => {});
  }, []);

  const openEditModal = () => {
    if (!doc) return;
    setEditTitle(doc.title || '');
    setEditDocType(doc.doc_type || 'CONTRACT');
    setEditDocNumber(doc.doc_number || '');
    setEditEmployeeId(doc.employee_id || '');
    setEditIssueDate(doc.issue_date ? doc.issue_date.split('T')[0] : '');
    setEditExpiryDate(doc.expiry_date ? doc.expiry_date.split('T')[0] : '');
    setEditStatus(doc.status || 'VALID');
    setEditNotes(doc.notes || '');
    setEditFileUrl(doc.file_url || '');
    setEditFileName(doc.file_url ? doc.file_url.split('/').pop() || '' : '');
    setEditModalOpen(true);
  };

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (payload: Partial<EmployeeDocument>) => documentApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('تم تحديث بيانات المستند بنجاح');
      setEditModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'حدث خطأ أثناء التحديث');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => documentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('تم حذف المستند بنجاح');
      router.push('/dashboard/documents');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'حدث خطأ أثناء حذف المستند');
    }
  });

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      const url = await employeeApi.uploadImage(file, 'documents');
      if (url) {
        setEditFileUrl(url);
        setEditFileName(file.name);
        toast.success('تم رفع الملف بنجاح');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'فشل رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      title: editTitle,
      doc_type: editDocType,
      doc_number: editDocNumber || undefined,
      employee_id: editEmployeeId || undefined,
      issue_date: editIssueDate || undefined,
      expiry_date: editExpiryDate || undefined,
      status: editStatus,
      notes: editNotes || undefined,
      file_url: editFileUrl || undefined,
    });
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`تم نسخ ${fieldName}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading) {
    return (
      <PageContainer>
        <DetailSkeleton />
      </PageContainer>
    );
  }

  if (isError || !doc) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
          <div className="size-16 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
            <Icons.fileSearch className="size-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">المستند غير موجود أو تم حذفه</h2>
          <p className="text-sm text-slate-500">لم يتم العثور على الوثيقة المطلوبة، قد تكون حُذفت أو تم نقلها.</p>
          <Button onClick={() => router.push('/dashboard/documents')} className="gap-2">
            <Icons.arrowRight className="size-4" />
            العودة لقائمة المستندات
          </Button>
        </div>
      </PageContainer>
    );
  }

  // Document metadata calculations
  const typeConfig = DOC_TYPES[doc.doc_type] || {
    label: doc.doc_type,
    icon: 'page' as keyof typeof Icons,
    color: 'bg-slate-100 text-slate-800'
  };
  const TypeIcon = Icons[typeConfig.icon] || Icons.page;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let expiryStatus: { label: string; color: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'; daysText?: string } = {
    label: 'ساري وصالح',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
    badgeVariant: 'default'
  };

  if (doc.expiry_date) {
    const expDate = new Date(doc.expiry_date);
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const expiredDays = Math.abs(diffDays);
      expiryStatus = {
        label: 'منتهي الصلاحية',
        color: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400',
        badgeVariant: 'destructive',
        daysText: `منتهي منذ ${expiredDays} يوم`
      };
    } else if (diffDays <= 30) {
      expiryStatus = {
        label: 'ينتهي قريباً',
        color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400',
        badgeVariant: 'secondary',
        daysText: `متبقي ${diffDays} يوم`
      };
    } else {
      expiryStatus = {
        label: 'ساري المفعول',
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
        badgeVariant: 'default',
        daysText: `متبقي ${diffDays} يوم`
      };
    }
  }

  // File resolution & type detection
  const rawFileUrl = doc.file_url?.trim() || '';
  const hasValidUrl = rawFileUrl.length > 0;
  const fullFileUrl = resolveFullUrl(rawFileUrl);

  const cleanExtUrl = fullFileUrl.split('?')[0].toLowerCase();
  const isImage = hasValidUrl && (
    fullFileUrl.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp|jfif|avif)$/i.test(cleanExtUrl)
  );
  const isPdf = hasValidUrl && (
    fullFileUrl.startsWith('data:application/pdf') ||
    /\.pdf$/i.test(cleanExtUrl)
  );
  const isVideo = hasValidUrl && (
    fullFileUrl.startsWith('data:video/') ||
    /\.(mp4|mov|webm|avi|mkv|ogg)$/i.test(cleanExtUrl)
  );
  const isAudio = hasValidUrl && (
    fullFileUrl.startsWith('data:audio/') ||
    /\.(mp3|wav|ogg|m4a|aac)$/i.test(cleanExtUrl)
  );
  const isOfficeDoc = hasValidUrl && /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(cleanExtUrl);
  const isTextDoc = hasValidUrl && /\.(txt|csv|json|log|xml|md)$/i.test(cleanExtUrl);

  const fileName = rawFileUrl ? rawFileUrl.split('/').pop()?.split('?')[0] || 'الملف المرفق' : '';
  const waUrl = doc.employee?.employee_number ? getWhatsAppURL(doc.employee.employee_number) : null;

  return (
    <PageContainer>
      <div className="space-y-6" dir="rtl">
        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-1">
          <Link
            href="/dashboard/documents"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5 text-muted-foreground hover:text-foreground font-semibold')}
          >
            <Icons.arrowRight className="size-4" />
            العودة للمستندات
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="hidden sm:inline-flex gap-1.5"
            >
              <Printer className="size-4" />
              طباعة
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openEditModal}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 gap-1.5 font-semibold"
            >
              <Icons.edit className="size-4" />
              تعديل
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 font-semibold"
            >
              <Icons.trash className="size-4" />
              حذف
            </Button>
          </div>
        </div>

        {/* Document Header Banner */}
        <div className="rounded-2xl border bg-card p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary shadow-inner">
                <TypeIcon className="size-7" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {doc.title}
                  </h1>
                  <Badge variant="outline" className={cn('font-bold text-xs px-2.5 py-0.5 border', typeConfig.color)}>
                    {typeConfig.label}
                  </Badge>
                  <Badge variant={expiryStatus.badgeVariant} className="text-xs px-2.5 py-0.5 font-bold">
                    {expiryStatus.label}
                  </Badge>
                  {expiryStatus.daysText && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {expiryStatus.daysText}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-3">
                  {doc.doc_number && (
                    <span className="font-mono flex items-center gap-1 font-bold text-foreground">
                      <Icons.hash className="size-3.5 text-primary" />
                      رقم الوثيقة: {doc.doc_number}
                    </span>
                  )}
                  {doc.issue_date && (
                    <span className="flex items-center gap-1">
                      <Icons.calendar className="size-3.5" />
                      تاريخ الإصدار: {formatRiyadhDate(doc.issue_date)}
                    </span>
                  )}
                  {doc.expiry_date && (
                    <span className="flex items-center gap-1 font-semibold">
                      <Icons.clock className="size-3.5" />
                      تاريخ الانتهاء: {formatRiyadhDate(doc.expiry_date)}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {hasValidUrl && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href={fullFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'gap-1.5 font-bold shadow-xs')}
                >
                  <ExternalLink className="size-4" />
                  فتح الملف المرفق
                </a>
                <a
                  href={fullFileUrl}
                  download={fileName}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 font-semibold')}
                >
                  <Download className="size-4" />
                  تحميل
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Layout: Left Sidebar (Info) + Right Main (File Previewer) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Column: File Viewer Section (8 cols on desktop) */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="overflow-hidden border shadow-xs">
              <CardHeader className="pb-3 border-b bg-muted/25">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Eye className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">معاينة الملف المرفق ومحتواه</CardTitle>
                      <CardDescription className="text-xs truncate max-w-[280px] sm:max-w-md font-mono" dir="ltr">
                        {fileName || 'لا يوجد ملف مرفق'}
                      </CardDescription>
                    </div>
                  </div>

                  {hasValidUrl && (
                    <div className="flex items-center gap-1 bg-background rounded-xl border p-1 shadow-2xs">
                      {isImage && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                            title="تكبير"
                          >
                            <ZoomIn className="size-4" />
                          </Button>
                          <span className="text-xs font-mono px-1 select-none min-w-[45px] text-center font-bold">
                            {Math.round(zoomLevel * 100)}%
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                            title="تصغير"
                          >
                            <ZoomOut className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setRotation(prev => (prev + 90) % 360)}
                            title="تدوير 90 درجة"
                          >
                            <RotateCw className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => { setZoomLevel(1); setRotation(0); }}
                            title="إعادة ضبط"
                          >
                            <RotateCcw className="size-4" />
                          </Button>
                          <Separator orientation="vertical" className="h-5" />
                        </>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setLightboxOpen(true)}
                        title="ملء الشاشة"
                      >
                        <Maximize2 className="size-4" />
                      </Button>
                      <a
                        href={fullFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8')}
                        title="فتح في تبويب خارجي"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {hasValidUrl ? (
                  <DocumentContentPreview
                    fileUrl={fullFileUrl}
                    title={doc.title}
                    fileName={fileName}
                    onOpenLightbox={() => setLightboxOpen(true)}
                  />
                ) : (
                  <div className="p-16 text-center space-y-4">
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                      <Icons.upload className="size-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-foreground">لا يوجد ملف مرفق</h4>
                      <p className="text-xs text-muted-foreground">لم يتم إرفاق أو رفع ملف لهذه الوثيقة حتى الآن.</p>
                    </div>
                    <Button onClick={openEditModal} variant="outline" className="gap-2 font-semibold">
                      <Icons.upload className="size-4" />
                      إرفاق ورفع ملف الآن
                    </Button>
                  </div>
                )}
              </CardContent>

              {hasValidUrl && (
                <CardFooter className="bg-muted/15 border-t py-3 px-4 flex flex-wrap items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icons.link className="size-3.5 text-primary shrink-0" />
                    <span className="font-mono truncate max-w-xs sm:max-w-md" dir="ltr">
                      {rawFileUrl}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(fullFileUrl, 'رابط الملف')}
                    className="text-primary hover:underline flex items-center gap-1 font-bold shrink-0"
                  >
                    <Icons.copy className="size-3" />
                    {copiedField === 'رابط الملف' ? 'تم النسخ!' : 'نسخ الرابط المباشر'}
                  </button>
                </CardFooter>
              )}
            </Card>

            {/* Document Content / Clauses / Notes Section */}
            {doc.notes && (
              <Card className="border shadow-xs">
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <FileCode className="size-4 text-primary" />
                    نص ومحتوى الوثيقة / الملاحظات
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="p-4 rounded-xl bg-muted/30 border font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground select-text">
                    {doc.notes}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Column: Document & Employee Details (4 cols on desktop) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Scannable Document QR Code Card */}
            <Card className="shadow-xs border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-sm font-black flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <QrCode className="size-4 text-primary" />
                    الرمز الرقمي للمستند (QR Code)
                  </span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300">
                    <ShieldCheck className="size-3 mr-1 inline" />
                    معتمد
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex flex-col items-center justify-center text-center gap-2.5">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                  <QRCodeImage
                    value={typeof window !== 'undefined' ? `${window.location.origin}/dashboard/documents/${doc.id}` : `/dashboard/documents/${doc.id}`}
                    size={110}
                  />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">امسح بالهاتف لفتح المستند فوراً</p>
                  <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[220px]">
                    ID: {doc.id}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Document Information Card */}
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Icons.fileText className="size-4 text-primary" />
                  بيانات الوثيقة
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-3 divide-y divide-border text-sm">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-muted-foreground">نوع الوثيقة:</span>
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <TypeIcon className="size-4 text-primary" />
                      {typeConfig.label}
                    </span>
                  </div>

                  {doc.doc_number && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground">رقم الوثيقة / السجل:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-foreground">{doc.doc_number}</span>
                        <button
                          onClick={() => copyToClipboard(doc.doc_number!, 'رقم الوثيقة')}
                          className="text-muted-foreground hover:text-primary p-0.5 rounded"
                          title="نسخ"
                        >
                          <Icons.copy className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">حالة الوثيقة:</span>
                    <span className="font-bold">
                      {doc.status === 'VALID' ? '✅ سارية' :
                       doc.status === 'EXPIRED' ? '❌ منتهية' :
                       doc.status === 'REVOKED' ? '🚫 ملغية' : doc.status}
                    </span>
                  </div>

                  {doc.issue_date && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground">تاريخ الإصدار:</span>
                      <span className="font-medium text-foreground">{formatRiyadhDate(doc.issue_date)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">تاريخ الانتهاء:</span>
                    <div className="text-left">
                      <p className={cn('font-bold', doc.expiry_date && new Date(doc.expiry_date) < new Date() ? 'text-destructive' : 'text-foreground')}>
                        {doc.expiry_date ? formatRiyadhDate(doc.expiry_date) : 'غير محدد'}
                      </p>
                      {expiryStatus.daysText && (
                        <p className="text-xs text-muted-foreground">{expiryStatus.daysText}</p>
                      )}
                    </div>
                  </div>

                  {doc.created_at && (
                    <div className="flex items-center justify-between py-2 text-xs">
                      <span className="text-muted-foreground">تاريخ التسجيل في النظام:</span>
                      <span className="font-mono text-muted-foreground">{formatRiyadhDate(doc.created_at)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Employee Information Card */}
            {doc.employee ? (
              <Card className="shadow-xs">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Icons.user className="size-4 text-primary" />
                      المندوب / الموظف المعني
                    </CardTitle>
                    <Link
                      href={`/dashboard/employees/${doc.employee.id}`}
                      className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
                    >
                      الملف الشخصي
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border">
                      {doc.employee.name?.charAt(0) || 'م'}
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-base text-foreground">{doc.employee.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {doc.employee.job_role === 'SUPERVISOR' ? 'مشرف' : doc.employee.job_role === 'MANAGEMENT' ? 'إدارة' : 'مندوب توصيل'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 divide-y divide-border text-sm pt-1">
                    {doc.employee.key_number && (
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-muted-foreground text-xs">رقم المفتاح / الكود:</span>
                        <Badge variant="outline" className="font-mono font-bold">
                          #{doc.employee.key_number}
                        </Badge>
                      </div>
                    )}

                    {doc.employee.employee_number && (
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-muted-foreground text-xs">رقم الجوال:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold" dir="ltr">{doc.employee.employee_number}</span>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700"
                              title="محادثة واتساب"
                            >
                              <Icons.whatsapp className="size-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/dashboard/employees/${doc.employee.id}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full gap-2 mt-2 font-semibold')}
                  >
                    <Icons.user className="size-4" />
                    عرض كافة بيانات الموظف
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-xs">
                <CardContent className="p-6 text-center space-y-2 text-muted-foreground">
                  <Icons.user className="size-8 mx-auto text-muted-foreground/50" />
                  <p className="text-sm">لم يتم ربط هذا المستند بمندوب محدد.</p>
                  <Button onClick={openEditModal} variant="outline" size="sm" className="gap-1.5 font-semibold">
                    <Icons.userPlus className="size-3.5" />
                    ربط بمندوب الآن
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions Card */}
            <Card className="shadow-xs bg-muted/20">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold">إجراءات سريعة</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                <Button onClick={openEditModal} variant="outline" className="w-full justify-start gap-2 font-semibold">
                  <Icons.edit className="size-4 text-blue-600" />
                  تعديل بيانات وتواريخ المستند
                </Button>
                {hasValidUrl && (
                  <Button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = fullFileUrl;
                      link.download = fileName;
                      link.click();
                    }}
                    variant="outline"
                    className="w-full justify-start gap-2 font-semibold"
                  >
                    <Download className="size-4 text-emerald-600" />
                    تحميل الملف المرفق
                  </Button>
                )}
                <Button
                  onClick={() => setDeleteModalOpen(true)}
                  variant="outline"
                  className="w-full justify-start gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 font-semibold"
                >
                  <Icons.trash className="size-4" />
                  حذف المستند نهائياً
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Fullscreen Lightbox Modal */}
        {lightboxOpen && hasValidUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10" onClick={e => e.stopPropagation()}>
              {isImage && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 4))}
                  >
                    <ZoomIn className="size-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                  >
                    <ZoomOut className="size-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setRotation(prev => (prev + 90) % 360)}
                  >
                    <RotateCw className="size-4" />
                  </Button>
                </>
              )}
              <a
                href={fullFileUrl}
                download={fileName}
                className={buttonVariants({ variant: 'secondary', size: 'sm' })}
              >
                <Download className="size-4" />
              </a>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setLightboxOpen(false)}
              >
                <Icons.close className="size-4" />
              </Button>
            </div>

            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fullFileUrl}
                alt={doc.title}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-in-out',
                }}
                className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <div className="w-[90vw] h-[85vh] bg-card rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <iframe src={fullFileUrl} className="w-full h-full border-0" title={doc.title} />
              </div>
            )}
            <p className="text-white/80 text-sm mt-4 select-none">{doc.title} — اضغط في أي مكان للإغلاق</p>
          </div>
        )}

        {/* Edit Document Sheet */}
        <Sheet open={editModalOpen} onOpenChange={setEditModalOpen}>
          <SheetContent className="sm:max-w-[540px] overflow-y-auto" dir="rtl">
            <SheetHeader>
              <SheetTitle>تعديل بيانات المستند</SheetTitle>
              <SheetDescription>
                تحديث معلومات الوثيقة، تواريخ الصلاحية، أو استبدال الملف المرفق
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSaveEdit} className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label>المندوب المعني</Label>
                <Select value={editEmployeeId} onValueChange={(val) => setEditEmployeeId(val || '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر المندوب">
                      {editEmployeeId
                        ? (() => {
                            const emp = employees.find(e => e.id === editEmployeeId);
                            return emp ? `${emp.name} (${emp.key_number || emp.employee_number || 'بدون رقم'})` : 'اختر المندوب';
                          })()
                        : 'غير محدد'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.key_number || emp.employee_number || 'بدون رقم'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>نوع الوثيقة *</Label>
                  <Select value={editDocType} onValueChange={(val) => setEditDocType(val || 'CONTRACT')}>
                    <SelectTrigger>
                      <SelectValue placeholder="نوع الوثيقة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONTRACT">عقد عمل</SelectItem>
                      <SelectItem value="PROMISSORY_NOTE">سند لأمر</SelectItem>
                      <SelectItem value="DRIVING_LICENSE">رخصة قيادة</SelectItem>
                      <SelectItem value="VEHICLE_REGISTRATION">استمارة مركبة</SelectItem>
                      <SelectItem value="CRIMINAL_RECORD">شهادة خلو سوابق</SelectItem>
                      <SelectItem value="MEDICAL_INSURANCE">تأمين طبي</SelectItem>
                      <SelectItem value="OTHER">مستند آخر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>عنوان الوثيقة *</Label>
                  <Input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="مثال: رخصة قيادة خصوصي"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>رقم الوثيقة / السجل</Label>
                  <Input
                    value={editDocNumber}
                    onChange={e => setEditDocNumber(e.target.value)}
                    placeholder="مثال: 108477289"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>الحالة</Label>
                  <Select value={editStatus} onValueChange={(val) => setEditStatus(val || 'VALID')}>
                    <SelectTrigger>
                      <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VALID">سارية (VALID)</SelectItem>
                      <SelectItem value="EXPIRED">منتهية (EXPIRED)</SelectItem>
                      <SelectItem value="REVOKED">ملغية (REVOKED)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* File Upload / URL */}
              <div className="space-y-2">
                <Label>الملف المرفق</Label>
                <div
                  className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    uploading ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={async e => {
                    e.preventDefault();
                    const dropped = e.dataTransfer.files[0];
                    if (dropped) await handleFileUpload(dropped);
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.mp4,.mov,.avi,.mkv,.webm,.doc,.docx,.xls,.xlsx"
                    onChange={async e => {
                      const picked = e.target.files?.[0];
                      if (picked) await handleFileUpload(picked);
                      e.target.value = '';
                    }}
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Icons.spinner className="size-7 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">جارٍ رفع الملف...</p>
                    </div>
                  ) : editFileName || editFileUrl ? (
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Icons.page className="size-5 text-primary" />
                        <span className="font-medium truncate max-w-[220px]">{editFileName || editFileUrl}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700"
                        onClick={e => { e.stopPropagation(); setEditFileName(''); setEditFileUrl(''); }}
                      >
                        حذف الملف
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 py-2">
                      <Icons.upload className="size-6 text-muted-foreground" />
                      <p className="text-sm font-medium text-muted-foreground">اسحب ملفاً هنا أو اضغط للاختيار</p>
                      <p className="text-xs text-muted-foreground/60">صور، PDF، مستندات حتى 50 ميجا</p>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">أو أدخل رابط الملف المباشر (URL)</Label>
                  <Input
                    value={editFileUrl}
                    onChange={e => setEditFileUrl(e.target.value)}
                    placeholder="https://..."
                    dir="ltr"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>تاريخ الإصدار</Label>
                  <Input
                    type="date"
                    value={editIssueDate}
                    onChange={e => setEditIssueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>تاريخ الانتهاء</Label>
                  <Input
                    type="date"
                    value={editExpiryDate}
                    onChange={e => setEditExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>ملاحظات ومحتوى المستند</Label>
                <Textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="أي ملاحظات أو بنود نصية تابعة للوثيقة..."
                  rows={3}
                />
              </div>

              <SheetFooter className="gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)} className="w-full">
                  إلغاء
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} className="w-full font-bold">
                  {updateMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <div className="size-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mb-2">
                <Icons.warning className="size-6" />
              </div>
              <DialogTitle>تأكيد حذف المستند</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من رغبتك في حذف هذا المستند ({doc.title}) نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                إلغاء
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? 'جارٍ الحذف...' : 'نعم، احذف المستند'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
