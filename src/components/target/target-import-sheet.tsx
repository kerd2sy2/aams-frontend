'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { apiClient } from '@/lib/aams/axios';
import { useLocale } from '@/components/layout/locale-provider';
import { Icons } from '@/components/icons';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Users,
  Layers,
  Calendar,
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

interface TargetImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: () => void;
}

export function TargetImportSheet({ open, onOpenChange, onImportSuccess }: TargetImportSheetProps) {
  const { t, dir } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [customDate, setCustomDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
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
      if (onImportSuccess) {
        onImportSuccess();
      }
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='sm:max-w-2xl w-full p-0 flex flex-col bg-background'>
        {/* Header */}
        <SheetHeader className='p-6'>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex items-center gap-3'>
              <div className='bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl shrink-0'>
                <FileSpreadsheet className='size-5' />
              </div>
              <div className='min-w-0 flex-1'>
                <SheetTitle className='text-base font-bold'>استيراد إكسل التارچت اليومي</SheetTitle>
                <SheetDescription className='text-xs mt-0.5'>
                  رفع وتدقيق إكسل طلبات اليوم واحتساب نسب إنجاز المعرفين والمناديب
                </SheetDescription>
              </div>
            </div>
            {preview && (
              <Button
                variant='outline'
                onClick={resetAll}
                size='sm'
                className='gap-1.5 text-xs h-8 shrink-0'
              >
                <Icons.refresh className='size-3.5' />
                ملف جديد
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Body content with scroll */}
        <div className='flex-1 overflow-y-auto p-6 space-y-5'>
          {/* Success Banner */}
          {importSuccess && (
            <Card className='border-emerald-500/30 bg-emerald-500/10 shadow-xs'>
              <CardContent className='p-4'>
                <div className='flex flex-col gap-3'>
                  <div className='flex items-start gap-3'>
                    <div className='p-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full shrink-0'>
                      <CheckCircle2 className='size-5' />
                    </div>
                    <div>
                      <h3 className='text-sm font-bold text-emerald-700 dark:text-emerald-300'>
                        تم حفظ واستيراد الملف بنجاح!
                      </h3>
                      <p className='text-xs text-emerald-600/90 dark:text-emerald-400/90 mt-1'>
                        {importSuccess.message}
                      </p>
                      <div className='flex flex-wrap items-center gap-2 mt-2.5 text-xs font-semibold'>
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
                          <span className='bg-background/80 px-2.5 py-1 rounded border text-primary'>
                            تم استبدال: {importSuccess.replaced_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='flex gap-2 pt-2 border-t border-emerald-500/20'>
                    <Button
                      onClick={resetAll}
                      size='sm'
                      className='bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs h-8'
                    >
                      رفع ملف يوم آخر
                      <ArrowRight className='size-3.5' />
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => onOpenChange(false)}
                      className='text-xs h-8'
                    >
                      إغلاق
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload & Date Section */}
          {!importSuccess && (
            <div className='space-y-4'>
              {/* Date Input */}
              <div className='bg-muted/40 p-3.5 rounded-xl border space-y-2'>
                <div className='flex items-center gap-2 text-xs font-semibold text-foreground'>
                  <Calendar className='size-4 text-primary' />
                  <span>تاريخ استحقاق طلبات هذا الشيت (YYYY-MM-DD)</span>
                </div>
                <Input
                  type='date'
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className='text-start font-mono text-sm bg-background'
                />
                <p className='text-[11px] text-muted-foreground'>
                  💡 سيتم ربط جميع طلبات الشيت بهذا التاريخ لاحتساب التارچت اليومي والشهري.
                </p>
              </div>

              {/* File Dropzone */}
              <Card className='shadow-xs border-dashed border-2'>
                <CardContent className='pt-6'>
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
                    className={`rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      file
                        ? 'border-primary/60 bg-primary/5'
                        : 'border-muted hover:border-primary/50 hover:bg-muted/30'
                    }`}
                  >
                    <div className='flex flex-col items-center justify-center gap-2.5'>
                      <div className='bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl'>
                        <FileSpreadsheet className='size-6' />
                      </div>
                      {file ? (
                        <div>
                          <p className='font-bold text-foreground text-sm'>{file.name}</p>
                          <p className='text-xs text-muted-foreground mt-0.5 font-mono'>
                            {(file.size / 1024).toFixed(1)} KB — انقر لتغيير الملف
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className='font-semibold text-foreground text-sm'>
                            اسحب وأفلت ملف الإكسل هنا، أو انقر للاختيار
                          </p>
                          <p className='text-[11px] text-muted-foreground mt-1'>
                            الصيغ المدعومة: Microsoft Excel (.xlsx, .xls)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={handleAnalyze}
                    disabled={!file || analyzing}
                    className='w-full gap-2 mt-4'
                  >
                    {analyzing ? (
                      <>
                        <Icons.spinner className='size-4 animate-spin' />
                        جارٍ فحص وتحليل الإكسل...
                      </>
                    ) : (
                      <>
                        <Icons.check className='size-4' />
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
            <div className='space-y-4 pt-2 border-t'>
              {/* KPI Summary Grid */}
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5'>
                <div className='p-3 bg-muted/40 rounded-xl border text-center'>
                  <p className='text-[11px] text-muted-foreground font-medium'>إجمالي الطلبات</p>
                  <p className='text-xl font-bold text-primary mt-0.5 font-mono'>
                    {preview.total_orders.toLocaleString('en-US')}
                  </p>
                </div>

                <div className='p-3 bg-muted/40 rounded-xl border text-center'>
                  <p className='text-[11px] text-muted-foreground font-medium'>عدد المناديب</p>
                  <p className='text-xl font-bold text-foreground mt-0.5 font-mono'>
                    {preview.drivers_count}
                  </p>
                </div>

                <div className='p-3 bg-muted/40 rounded-xl border text-center'>
                  <p className='text-[11px] text-muted-foreground font-medium'>المعرفين</p>
                  <p className='text-xl font-bold text-foreground mt-0.5 font-mono'>
                    {preview.identifiers_count}
                  </p>
                </div>

                <div className='p-3 bg-muted/40 rounded-xl border text-center'>
                  <p className='text-[11px] text-muted-foreground font-medium'>المكرر</p>
                  <p
                    className={`text-xl font-bold mt-0.5 font-mono ${
                      preview.duplicates_count > 0 ? 'text-amber-500' : 'text-emerald-600'
                    }`}
                  >
                    {preview.duplicates_count}
                  </p>
                </div>
              </div>

              {/* Duplication Action Selector */}
              {preview.has_duplicates && (
                <Card className='border-amber-500/40 bg-amber-500/5 shadow-none'>
                  <CardHeader className='pb-2 pt-3 px-3'>
                    <CardTitle className='text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5'>
                      <AlertTriangle className='size-4 shrink-0' />
                      تم رصد {preview.duplicates_count} سجل مسجل مسبقاً بنفس التاريخ (
                      {preview.order_date})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='px-3 pb-3'>
                    <div className='flex flex-col sm:flex-row gap-2'>
                      <button
                        type='button'
                        onClick={() => setDedupAction('IGNORE_DUPLICATES')}
                        className={`flex-1 p-2.5 rounded-lg border text-start transition-all text-[11px] ${
                          dedupAction === 'IGNORE_DUPLICATES'
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-muted bg-background text-muted-foreground'
                        }`}
                      >
                        <span className='block font-bold text-xs'>تخطي المكرر (مستحسن)</span>
                        حفظ السجلات الجديدة فقط
                      </button>

                      <button
                        type='button'
                        onClick={() => setDedupAction('REPLACE_DUPLICATES')}
                        className={`flex-1 p-2.5 rounded-lg border text-start transition-all text-[11px] ${
                          dedupAction === 'REPLACE_DUPLICATES'
                            ? 'border-destructive bg-destructive/10 text-destructive font-bold'
                            : 'border-muted bg-background text-muted-foreground'
                        }`}
                      >
                        <span className='block font-bold text-xs'>استبدال السجلات السابقة</span>
                        تحديث سجلات اليوم بالقيم الجديدة
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Search & Table */}
              <div className='space-y-2'>
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-xs font-semibold text-foreground'>
                    معاينة السجلات ({filteredRows.length} من {preview.total_rows})
                  </span>
                  <div className='relative w-48 sm:w-56'>
                    <Icons.search className='text-muted-foreground pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2' />
                    <Input
                      placeholder='بحث بالمندوب أو المعرف...'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className='text-xs ps-7 h-7'
                    />
                  </div>
                </div>

                <div className='border rounded-lg overflow-x-auto max-h-[300px]'>
                  <table className='w-full text-[11px] text-start border-collapse'>
                    <thead className='bg-muted/60 sticky top-0 border-b z-10'>
                      <tr>
                        <th className='p-2 font-semibold text-muted-foreground'>#</th>
                        <th className='p-2 font-semibold text-muted-foreground'>المندوب</th>
                        <th className='p-2 font-semibold text-muted-foreground'>المعرف</th>
                        <th className='p-2 font-semibold text-muted-foreground text-center'>
                          مسلمة
                        </th>
                        <th className='p-2 font-semibold text-muted-foreground text-center'>
                          ملغاة
                        </th>
                        <th className='p-2 font-semibold text-muted-foreground text-center'>
                          الإجمالي
                        </th>
                        <th className='p-2 font-semibold text-muted-foreground text-center'>
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
                          <td className='p-2 font-mono text-muted-foreground'>{row.row_number}</td>
                          <td className='p-2 font-semibold text-foreground'>
                            {row.driver_name}
                            {row.driver_id && (
                              <span className='block text-[9px] text-muted-foreground font-mono'>
                                #{row.driver_id}
                              </span>
                            )}
                          </td>
                          <td className='p-2'>
                            <Badge variant='outline' className='text-[9px] py-0'>
                              {row.identifier_name || 'افتراضي'}
                            </Badge>
                          </td>
                          <td className='p-2 text-center font-bold text-emerald-600 dark:text-emerald-400'>
                            {row.delivered_count}
                          </td>
                          <td className='p-2 text-center font-medium text-destructive'>
                            {row.cancelled_count}
                          </td>
                          <td className='p-2 text-center font-bold text-primary'>
                            {row.orders_count}
                          </td>
                          <td className='p-2 text-center'>
                            {row.is_duplicate ? (
                              <Badge className='bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 text-[9px] py-0 border-amber-500/30'>
                                مكرر
                              </Badge>
                            ) : (
                              <Badge className='bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 text-[9px] py-0 border-emerald-500/30'>
                                جديد
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {preview && !importSuccess && (
          <div className='p-4 border-t bg-muted/20 flex items-center justify-end gap-2'>
            <Button variant='outline' size='sm' onClick={resetAll} disabled={importing}>
              إلغاء
            </Button>
            <Button
              size='sm'
              onClick={handleConfirm}
              disabled={importing}
              className='font-bold gap-2'
            >
              {importing ? (
                <>
                  <Icons.spinner className='size-3.5 animate-spin' />
                  جارٍ الحفظ...
                </>
              ) : (
                <>
                  <Icons.check className='size-3.5' />
                  تأكيد واستيراد {preview.total_orders.toLocaleString('en-US')} طلب
                </>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
