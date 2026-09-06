'use client';

import React, { useState, useRef } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiClient } from '@/lib/aams/axios';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Users,
  Layers,
  Calendar,
  RefreshCw,
  FileCheck,
  ArrowRight,
  Database
} from 'lucide-react';

interface ParsedExcelRow {
  row_number: number;
  order_date: string;
  identifier_name: string;
  identifier_code?: string;
  driver_name: string;
  driver_id?: string;
  orders_count: number;
  delivered_count: number;
  cancelled_count: number;
  plate_number?: string;
  notes?: string;
  is_duplicate: boolean;
}

interface ExcelImportPreview {
  file_name: string;
  order_date: string;
  total_rows: number;
  total_orders: number;
  identifiers_count: number;
  identifiers: string[];
  drivers_count: number;
  drivers: string[];
  duplicates_count: number;
  has_duplicates: boolean;
  rows: ParsedExcelRow[];
}

export default function TargetImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ExcelImportPreview | null>(null);
  const [dedupAction, setDedupAction] = useState<'IGNORE_DUPLICATES' | 'REPLACE_DUPLICATES'>(
    'IGNORE_DUPLICATES'
  );
  const [importSuccess, setImportSuccess] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile.name.endsWith('.xlsx') ||
        droppedFile.name.endsWith('.xls') ||
        droppedFile.type.includes('spreadsheet')
      ) {
        setFile(droppedFile);
        setPreview(null);
        setImportSuccess(null);
      } else {
        toast.error('يرجى اختيار ملف إكسل بصيغة .xlsx أو .xls');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(null);
      setImportSuccess(null);
    }
  };

  // Preview / Analyze
  const handleAnalyze = async () => {
    if (!file) {
      toast.error('يرجى اختيار ملف الإكسل أولاً');
      return;
    }

    setAnalyzing(true);
    setPreview(null);
    setImportSuccess(null);

    const formData = new FormData();
    formData.append('file', file);
    if (customDate) {
      formData.append('date', customDate);
    }

    try {
      const res = await apiClient.post('/admin/target/import/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setPreview(res.data);
      toast.success(`تم تحليل الملف بنجاح (${res.data.total_rows} سجل)`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'فشل في فحص ومعاينة ملف الإكسل';
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  // Confirm Import
  const handleConfirm = async () => {
    if (!preview || !file) return;

    setImporting(true);
    try {
      const res = await apiClient.post('/admin/target/import/confirm', {
        file_name: preview.file_name,
        order_date: preview.order_date || customDate,
        deduplication_action: dedupAction,
        rows: preview.rows
      });

      setImportSuccess(res.data);
      toast.success(res.data.message || 'تم حفظ بيانات التارچت بنجاح في قاعدة البيانات!');
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'فشل في حفظ البيانات';
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setPreview(null);
    setImportSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Filter preview rows
  const filteredRows = (preview?.rows || []).filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.driver_name?.toLowerCase().includes(q) ||
      r.identifier_name?.toLowerCase().includes(q) ||
      r.identifier_code?.toLowerCase().includes(q) ||
      r.driver_id?.toLowerCase().includes(q)
    );
  });

  return (
    <PageContainer>
      <div className='space-y-6 max-w-6xl mx-auto pb-16 text-right' dir='rtl'>
        {/* Header */}
        <div className='flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-foreground flex items-center gap-2'>
              <FileSpreadsheet className='h-7 w-7 text-orange-500' />
              استيراد ملفات الإكسل اليومية (التارچت)
            </h1>
            <p className='text-sm text-muted-foreground mt-1'>
              رفع وتدقيق إكسل طلبات اليوم وربطها بالمعرفين والمناديب وحساب نسب الإنجاز التلقائي
            </p>
          </div>
          {preview && (
            <Button variant='outline' onClick={resetAll} size='sm' className='gap-2'>
              <RefreshCw className='h-4 w-4' />
              ملف جديد
            </Button>
          )}
        </div>

        {/* Success Banner */}
        {importSuccess && (
          <Card className='border-green-500/30 bg-green-500/10 shadow-sm'>
            <CardContent className='pt-6'>
              <div className='flex flex-col md:flex-row items-center justify-between gap-4'>
                <div className='flex items-center gap-3'>
                  <div className='p-3 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full'>
                    <CheckCircle2 className='h-8 w-8' />
                  </div>
                  <div>
                    <h3 className='text-lg font-bold text-green-700 dark:text-green-300'>
                      تم حفظ واستيراد الملف بنجاح!
                    </h3>
                    <p className='text-sm text-green-600/90 dark:text-green-400/90 mt-1'>
                      {importSuccess.message}
                    </p>
                    <div className='flex items-center gap-4 mt-2 text-xs font-semibold'>
                      <span className='bg-background/80 px-2.5 py-1 rounded border'>
                        الطلبات المعتمدة:{' '}
                        {importSuccess.imported_orders_count?.toLocaleString('en-US')}
                      </span>
                      {importSuccess.skipped_count > 0 && (
                        <span className='bg-background/80 px-2.5 py-1 rounded border text-amber-600'>
                          تم تخطي المكرر: {importSuccess.skipped_count}
                        </span>
                      )}
                      {importSuccess.replaced_count > 0 && (
                        <span className='bg-background/80 px-2.5 py-1 rounded border text-blue-600'>
                          تم استبدال: {importSuccess.replaced_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={resetAll}
                  className='bg-green-600 hover:bg-green-700 text-white gap-2'
                >
                  رفع ملف يوم آخر
                  <ArrowRight className='h-4 w-4' />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload & Date Section */}
        {!importSuccess && (
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {/* File Dropzone */}
            <Card className='md:col-span-2 shadow-sm'>
              <CardHeader>
                <CardTitle className='text-base flex items-center gap-2'>
                  <Upload className='h-4 w-4 text-orange-500' />
                  اختيار ملف الإكسل
                </CardTitle>
                <CardDescription>
                  يدعم ملفات .xlsx و .xls الخاصة بالمناديب وشركات التوصيل
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  type='file'
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept='.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel'
                  className='hidden'
                />

                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    file
                      ? 'border-orange-500/60 bg-orange-500/5'
                      : 'border-muted hover:border-orange-500/50 hover:bg-muted/40'
                  }`}
                >
                  <div className='flex flex-col items-center justify-center gap-3'>
                    <div className='p-4 bg-orange-500/10 text-orange-500 rounded-full'>
                      <FileSpreadsheet className='h-10 w-10' />
                    </div>
                    {file ? (
                      <div>
                        <p className='font-bold text-foreground text-base'>{file.name}</p>
                        <p className='text-xs text-muted-foreground mt-1'>
                          الحجم: {(file.size / 1024).toFixed(1)} كيلوبايت - انقر لتغيير الملف
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className='font-semibold text-foreground text-base'>
                          اسحب وأفلت ملف الإكسل هنا، أو انقر للاختيار من جهازك
                        </p>
                        <p className='text-xs text-muted-foreground mt-1'>
                          الصيغ المدعومة: Microsoft Excel (.xlsx, .xls)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Date & Action */}
            <Card className='shadow-sm flex flex-col justify-between'>
              <CardHeader>
                <CardTitle className='text-base flex items-center gap-2'>
                  <Calendar className='h-4 w-4 text-blue-500' />
                  تاريخ الطلبات
                </CardTitle>
                <CardDescription>حدد التاريخ المستهدف لتسجيل طلبات هذا الشيت</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <label className='text-xs font-semibold text-muted-foreground'>
                    تاريخ استحقاق الطلبات (YYYY-MM-DD)
                  </label>
                  <Input
                    type='date'
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className='text-left font-mono'
                  />
                </div>

                <div className='p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground leading-relaxed'>
                  💡 سيقوم النظام تلقائياً بتحديد المعرفين ومطابقة أسماء المناديب وحساب معدلات التارچت
                  فورياً.
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={!file || analyzing}
                  className='w-full bg-orange-500 hover:bg-orange-600 text-white gap-2 mt-4'
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className='h-4 w-4 animate-spin' />
                      جارٍ فحص وتحليل الإكسل...
                    </>
                  ) : (
                    <>
                      <FileCheck className='h-4 w-4' />
                      فحص ومعاينة البيانات
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Preview Results */}
        {preview && !importSuccess && (
          <div className='space-y-6'>
            {/* KPI Summary Grid */}
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
              <Card className='shadow-sm'>
                <CardContent className='pt-6 flex items-center justify-between'>
                  <div>
                    <p className='text-xs text-muted-foreground font-medium'>إجمالي الطلبات</p>
                    <p className='text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1'>
                      {preview.total_orders.toLocaleString('en-US')}
                    </p>
                  </div>
                  <div className='p-2.5 bg-orange-500/10 text-orange-500 rounded-lg'>
                    <Database className='h-6 w-6' />
                  </div>
                </CardContent>
              </Card>

              <Card className='shadow-sm'>
                <CardContent className='pt-6 flex items-center justify-between'>
                  <div>
                    <p className='text-xs text-muted-foreground font-medium'>عدد المناديب</p>
                    <p className='text-2xl font-bold text-foreground mt-1'>
                      {preview.drivers_count}
                    </p>
                  </div>
                  <div className='p-2.5 bg-blue-500/10 text-blue-500 rounded-lg'>
                    <Users className='h-6 w-6' />
                  </div>
                </CardContent>
              </Card>

              <Card className='shadow-sm'>
                <CardContent className='pt-6 flex items-center justify-between'>
                  <div>
                    <p className='text-xs text-muted-foreground font-medium'>المعرفين المكتشفين</p>
                    <p className='text-2xl font-bold text-foreground mt-1'>
                      {preview.identifiers_count}
                    </p>
                  </div>
                  <div className='p-2.5 bg-purple-500/10 text-purple-500 rounded-lg'>
                    <Layers className='h-6 w-6' />
                  </div>
                </CardContent>
              </Card>

              <Card className='shadow-sm'>
                <CardContent className='pt-6 flex items-center justify-between'>
                  <div>
                    <p className='text-xs text-muted-foreground font-medium'>حالات التكرار</p>
                    <p
                      className={`text-2xl font-bold mt-1 ${preview.duplicates_count > 0 ? 'text-amber-500' : 'text-green-600'}`}
                    >
                      {preview.duplicates_count}
                    </p>
                  </div>
                  <div
                    className={`p-2.5 rounded-lg ${preview.duplicates_count > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'}`}
                  >
                    {preview.duplicates_count > 0 ? (
                      <AlertTriangle className='h-6 w-6' />
                    ) : (
                      <CheckCircle2 className='h-6 w-6' />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Duplication Action Selector */}
            {preview.has_duplicates && (
              <Card className='border-amber-500/40 bg-amber-500/5 shadow-sm'>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2'>
                    <AlertTriangle className='h-4 w-4' />
                    تم رصد {preview.duplicates_count} سجل مسبق مسجل بنفس التاريخ (
                    {preview.order_date})
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    اختر الإجراء المناسب للتعامل مع السجلات المكررة عند الحفظ:
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='flex flex-col sm:flex-row gap-3'>
                    <button
                      type='button'
                      onClick={() => setDedupAction('IGNORE_DUPLICATES')}
                      className={`flex-1 p-3 rounded-lg border text-right transition-all text-xs font-semibold ${
                        dedupAction === 'IGNORE_DUPLICATES'
                          ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400'
                          : 'border-muted bg-background text-muted-foreground'
                      }`}
                    >
                      <span className='font-bold block text-sm'>تخطي المكرر (مستحسن)</span>
                      الاحتفاظ بالسجلات السابقة وحفظ السجلات الجديدة فقط دون مساس بالقديم
                    </button>

                    <button
                      type='button'
                      onClick={() => setDedupAction('REPLACE_DUPLICATES')}
                      className={`flex-1 p-3 rounded-lg border text-right transition-all text-xs font-semibold ${
                        dedupAction === 'REPLACE_DUPLICATES'
                          ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400'
                          : 'border-muted bg-background text-muted-foreground'
                      }`}
                    >
                      <span className='font-bold block text-sm'>استبدال السجلات السابقة</span>
                      حذف أو تحديث سجلات اليوم واستبدالها بالقيم الواردة في هذا الملف
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detailed Table Preview */}
            <Card className='shadow-sm'>
              <CardHeader className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4'>
                <div>
                  <CardTitle className='text-base'>معاينة الصفوف والبيانات</CardTitle>
                  <CardDescription>
                    عرض {filteredRows.length} من أصل {preview.total_rows} سجل تم استخراجه من الملف
                  </CardDescription>
                </div>
                <div className='w-full sm:w-64'>
                  <Input
                    placeholder='بحث باسم المندوب أو المعرف...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='text-right text-xs'
                  />
                </div>
              </CardHeader>
              <CardContent className='p-0'>
                <div className='overflow-x-auto max-h-[420px]'>
                  <table className='w-full text-xs text-right border-collapse'>
                    <thead className='bg-muted/60 sticky top-0 border-b z-10'>
                      <tr>
                        <th className='p-3 font-semibold text-muted-foreground'>#</th>
                        <th className='p-3 font-semibold text-muted-foreground'>المندوب</th>
                        <th className='p-3 font-semibold text-muted-foreground'>المعرف</th>
                        <th className='p-3 font-semibold text-muted-foreground text-center'>
                          الطلبات المسلمة
                        </th>
                        <th className='p-3 font-semibold text-muted-foreground text-center'>
                          الملغاة
                        </th>
                        <th className='p-3 font-semibold text-muted-foreground text-center'>
                          إجمالي الطلبات
                        </th>
                        <th className='p-3 font-semibold text-muted-foreground text-center'>
                          الحالة
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y'>
                      {filteredRows.slice(0, 100).map((row, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-muted/30 transition-colors ${
                            row.is_duplicate ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          <td className='p-3 font-mono text-muted-foreground'>{row.row_number}</td>
                          <td className='p-3 font-bold text-foreground'>
                            {row.driver_name}
                            {row.driver_id && (
                              <span className='block text-[10px] text-muted-foreground font-mono'>
                                #{row.driver_id}
                              </span>
                            )}
                          </td>
                          <td className='p-3'>
                            <Badge variant='outline' className='text-[10px]'>
                              {row.identifier_name || 'افتراضي'}
                            </Badge>
                          </td>
                          <td className='p-3 text-center font-bold text-green-600'>
                            {row.delivered_count}
                          </td>
                          <td className='p-3 text-center font-medium text-red-500'>
                            {row.cancelled_count}
                          </td>
                          <td className='p-3 text-center font-bold text-orange-600'>
                            {row.orders_count}
                          </td>
                          <td className='p-3 text-center'>
                            {row.is_duplicate ? (
                              <Badge className='bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 text-[10px] border-amber-500/30'>
                                مسجل مسبقاً
                              </Badge>
                            ) : (
                              <Badge className='bg-green-500/15 text-green-600 hover:bg-green-500/20 text-[10px] border-green-500/30'>
                                جديد
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Confirm & Save Button */}
            <div className='flex items-center justify-end gap-3 pt-2'>
              <Button variant='outline' onClick={resetAll} disabled={importing}>
                إلغاء
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={importing}
                className='bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 gap-2'
              >
                {importing ? (
                  <>
                    <RefreshCw className='h-4 w-4 animate-spin' />
                    جارٍ حفظ البيانات في النظام...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className='h-4 w-4' />
                    تأكيد واستيراد {preview.total_orders.toLocaleString('en-US')} طلب في قاعدة
                    البيانات
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
