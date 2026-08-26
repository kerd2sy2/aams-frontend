'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { documentApi, employeeApi } from '@/lib/aams/services';
import type { EmployeeDocument, Employee } from '@/types/aams';
import { formatRiyadhDate, getTodayRiyadh } from '@/lib/aams/riyadh-time';

const DOC_TYPES: Record<string, { label: string; icon: string }> = {
  PROMISSORY_NOTE: { label: 'سند لأمر', icon: 'fileCertificate' },
  CONTRACT: { label: 'عقد عمل', icon: 'fileText' },
  DRIVING_LICENSE: { label: 'رخصة قيادة', icon: 'certificate' },
  VEHICLE_REGISTRATION: { label: 'استمارة مركبة', icon: 'bike' },
  CRIMINAL_RECORD: { label: 'خلو سوابق', icon: 'shieldAlert' },
  MEDICAL_INSURANCE: { label: 'تأمين طبي', icon: 'badgeCheck' },
  OTHER: { label: 'مستند آخر', icon: 'page' }
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<EmployeeDocument | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Form fields
  const [employeeId, setEmployeeId] = useState('');
  const [docType, setDocType] = useState('CONTRACT');
  const [title, setTitle] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [status, setStatus] = useState('VALID');
  const [notes, setNotes] = useState('');

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await documentApi.getAll({
        doc_type: activeTab === 'ALL' ? undefined : activeTab,
        search,
        limit: 300
      });
      setDocuments(res.data || []);
    } catch (err: any) {
      toast.error('فشل في جلب المستندات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [activeTab]);

  useEffect(() => {
    employeeApi.getAll({ limit: 500 }).then(res => setEmployees(res.data || [])).catch(() => {});
  }, []);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const relativeUrl = await employeeApi.uploadFile(file);
      // Build full URL using the backend base URL
      const backendBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8081';
      const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : `${backendBase}${relativeUrl}`;
      setFileUrl(fullUrl);
      setFileName(file.name);
      toast.success('تم رفع الملف بنجاح');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'فشل رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingDoc(null);
    setEmployeeId('');
    setDocType('CONTRACT');
    setTitle('عقد عمل موثق');
    setDocNumber('');
    setFileUrl('');
    setFileName('');
    setIssueDate(getTodayRiyadh());
    setExpiryDate('');
    setStatus('VALID');
    setNotes('');
    setModalOpen(true);
  };

  const handleOpenEdit = (doc: EmployeeDocument) => {
    setEditingDoc(doc);
    setEmployeeId(doc.employee_id || '');
    setDocType(doc.doc_type || 'CONTRACT');
    setTitle(doc.title || '');
    setDocNumber(doc.doc_number || '');
    setFileUrl(doc.file_url || '');
    setFileName(doc.file_url ? doc.file_url.split('/').pop() || '' : '');
    setIssueDate(doc.issue_date ? doc.issue_date.split('T')[0] : '');
    setExpiryDate(doc.expiry_date ? doc.expiry_date.split('T')[0] : '');
    setStatus(doc.status || 'VALID');
    setNotes(doc.notes || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !title) {
      toast.error('يرجى اختيار المندوب وكتابة عنوان المستند');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<EmployeeDocument> = {
        employee_id: employeeId,
        doc_type: docType,
        title,
        doc_number: docNumber,
        file_url: fileUrl,
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
        status,
        notes
      };

      if (editingDoc) {
        await documentApi.update(editingDoc.id, payload);
        toast.success('تم تعديل المستند بنجاح');
      } else {
        await documentApi.create(payload);
        toast.success('تم إضافة المستند بنجاح');
      }

      setModalOpen(false);
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'حدث خطأ أثناء حفظ المستند');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستند؟')) return;
    try {
      await documentApi.delete(id);
      toast.success('تم حذف المستند بنجاح');
      fetchDocuments();
    } catch (err: any) {
      toast.error('فشل في حذف المستند');
    }
  };

  const filteredDocs = documents.filter(d => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      d.title?.toLowerCase().includes(s) ||
      d.doc_number?.toLowerCase().includes(s) ||
      d.employee?.name?.toLowerCase().includes(s) ||
      d.notes?.toLowerCase().includes(s)
    );
  });

  // Calculate expiring docs (< 30 days)
  const today = new Date();
  const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiringCount = documents.filter(d => {
    if (!d.expiry_date) return false;
    const exp = new Date(d.expiry_date);
    return exp >= today && exp <= thirtyDaysLater;
  }).length;

  const expiredCount = documents.filter(d => {
    if (!d.expiry_date) return false;
    return new Date(d.expiry_date) < today;
  }).length;

  return (
    <PageContainer>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Icons.fileCertificate className="h-7 w-7 text-emerald-500" />
              إدارة المستندات والرخص والشهادات
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              متابعة العقود وسندات الأمر ورخص القيادة واستمارات المركبات وتنبيهات الانتهاء
            </p>
          </div>
          <Button onClick={handleOpenAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Icons.add className="h-4 w-4" />
            إضافة مستند جديد
          </Button>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-emerald-100 bg-emerald-50/40 dark:border-emerald-950/40 dark:bg-emerald-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-200">إجمالي المستندات</CardTitle>
              <Icons.fileText className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {documents.length} <span className="text-sm font-normal text-slate-500">وثيقة</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-100 bg-amber-50/40 dark:border-amber-950/40 dark:bg-amber-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-200">تنتهي قريباً (&lt; 30 يوم)</CardTitle>
              <Icons.clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {expiringCount} <span className="text-sm font-normal text-slate-500">وثيقة</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-rose-100 bg-rose-50/40 dark:border-rose-950/40 dark:bg-rose-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-rose-900 dark:text-rose-200">منتهية الصلاحية</CardTitle>
              <Icons.warning className="h-4 w-4 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                {expiredCount} <span className="text-sm font-normal text-slate-500">وثيقة</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">وثائق صالحة وسارية</CardTitle>
              <Icons.check className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {documents.length - expiredCount - expiringCount} <span className="text-sm font-normal text-slate-500">وثيقة</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="ALL">الكل</TabsTrigger>
              <TabsTrigger value="CONTRACT">عقود العمل</TabsTrigger>
              <TabsTrigger value="PROMISSORY_NOTE">سندات لأمر</TabsTrigger>
              <TabsTrigger value="DRIVING_LICENSE">رخص القيادة</TabsTrigger>
              <TabsTrigger value="VEHICLE_REGISTRATION">استمارات المركبات</TabsTrigger>
              <TabsTrigger value="CRIMINAL_RECORD">خلو السوابق</TabsTrigger>
              <TabsTrigger value="MEDICAL_INSURANCE">التأمين الطبي</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <div className="relative w-full md:w-64">
              <Icons.search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="بحث بالمندوب أو رقم الوثيقة..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <Button variant="outline" onClick={fetchDocuments}>
              <Icons.refresh className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الوثائق والرخص</CardTitle>
            <CardDescription>عرض تفاصيل الوثائق وتواريخ الإصدار والانتهاء وحالة التوثيق</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75 dark:bg-slate-900/50">
                    <TableHead className="text-right">نوع الوثيقة</TableHead>
                    <TableHead className="text-right">عنوان الوثيقة</TableHead>
                    <TableHead className="text-right">المندوب المعني</TableHead>
                    <TableHead className="text-right">رقم الوثيقة</TableHead>
                    <TableHead className="text-right">تاريخ الإصدار</TableHead>
                    <TableHead className="text-right">تاريخ الانتهاء</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الملف</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                        <Icons.spinner className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
                        جارٍ تحميل الوثائق والمستندات...
                      </TableCell>
                    </TableRow>
                  ) : filteredDocs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                        لا توجد وثائق مطابقة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocs.map(doc => {
                      const docTypeInfo = DOC_TYPES[doc.doc_type] || { label: doc.doc_type, icon: 'fileText' };
                      
                      let statusBadge = <Badge variant="default">ساري</Badge>;
                      if (doc.expiry_date) {
                        const exp = new Date(doc.expiry_date);
                        if (exp < today) {
                          statusBadge = <Badge variant="destructive">منتهي</Badge>;
                        } else if (exp <= thirtyDaysLater) {
                          statusBadge = <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">ينتهي قريباً</Badge>;
                        }
                      }

                      return (
                        <TableRow key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                          <TableCell>
                            <Badge variant="outline" className="gap-1 font-normal">
                              {docTypeInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                            <Link
                              href={`/dashboard/documents/${doc.id}`}
                              className="hover:underline hover:text-emerald-600 transition-colors"
                            >
                              {doc.title}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {doc.employee ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{doc.employee.name}</span>
                                {doc.employee.key_number && (
                                  <Badge variant="outline" className="text-xs">
                                    #{doc.employee.key_number}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono">{doc.doc_number || '-'}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {doc.issue_date ? formatRiyadhDate(doc.issue_date) : '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap font-medium">
                            {doc.expiry_date ? formatRiyadhDate(doc.expiry_date) : 'غير محدد'}
                          </TableCell>
                          <TableCell>{statusBadge}</TableCell>
                          <TableCell>
                            <Link
                              href={`/dashboard/documents/${doc.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md transition-colors"
                            >
                              <Icons.eye className="h-3.5 w-3.5" />
                              استعراض
                            </Link>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(doc)}
                                className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              >
                                <Icons.edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(doc.id)}
                                className="h-8 w-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              >
                                <Icons.trash className="h-4 w-4" />
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

        {/* Modal */}
        <Sheet open={modalOpen} onOpenChange={setModalOpen}>
          <SheetContent className="sm:max-w-[500px] overflow-y-auto" dir="rtl">
            <SheetHeader>
              <SheetTitle>{editingDoc ? 'تعديل المستند' : 'إضافة مستند جديد'}</SheetTitle>
              <SheetDescription>
                أدخل تفاصيل الوثيقة والمندوب وتاريخ الانتهاء
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>المندوب المعني *</Label>
                <Select value={employeeId} onValueChange={(val) => setEmployeeId(val || '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر المندوب">
                      {employeeId
                        ? (() => {
                            const emp = employees.find(e => e.id === employeeId);
                            return emp ? `${emp.name} (${emp.key_number || emp.employee_number || 'بدون رقم'})` : 'اختر المندوب';
                          })()
                        : null}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>نوع الوثيقة *</Label>
                  <Select value={docType} onValueChange={(val) => setDocType(val || '')}>
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
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="مثال: رخصة قيادة خصوصي"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>رقم الوثيقة / السجل</Label>
                  <Input
                    value={docNumber}
                    onChange={e => setDocNumber(e.target.value)}
                    placeholder="مثال: 108477289"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>رابط الملف (URL اختياري)</Label>
                  <Input
                    value={fileUrl}
                    onChange={e => setFileUrl(e.target.value)}
                    placeholder="https://..."
                    dir="ltr"
                  />
                </div>
              </div>

              {/* File Upload Area */}
              <div className="space-y-1.5">
                <Label>رفع ملف مرفق</Label>
                <div
                  className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    uploading ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); }}
                  onDrop={async (e) => {
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
                    onChange={async (e) => {
                      const picked = e.target.files?.[0];
                      if (picked) await handleFileUpload(picked);
                      e.target.value = '';
                    }}
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <p className="text-sm text-muted-foreground">جارٍ رفع الملف...</p>
                    </div>
                  ) : fileName ? (
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Icons.page className="size-4 text-primary" />
                        <span className="font-medium truncate max-w-[200px]">{fileName}</span>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-red-500 hover:underline"
                        onClick={(e) => { e.stopPropagation(); setFileName(''); setFileUrl(''); }}
                      >
                        حذف
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 py-2">
                      <Icons.upload className="size-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">ادفع ملفاً أو اضغط للاختيار</p>
                      <p className="text-xs text-muted-foreground/60">صور، PDF، فيديو حتى 50 ميجا</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>تاريخ الإصدار</Label>
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>تاريخ الانتهاء</Label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>ملاحظات</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="أي ملاحظات حول الوثيقة..."
                  rows={2}
                />
              </div>

              <SheetFooter className="gap-2 pt-6 mt-auto">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="w-full">
                  إلغاء
                </Button>
                <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                  {submitting ? 'جارٍ الحفظ...' : editingDoc ? 'حفظ التعديلات' : 'إضافة الوثيقة'}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </PageContainer>
  );
}
