'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { investigationApi } from '@/lib/aams/services';
import type { InvestigationResponse } from '@/types/aams';
import { QRCodeImage } from '@/components/aams/employee-codes';
import { formatRiyadh } from '@/lib/aams/riyadh-time';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Printer,
  Image as ImageIcon,
  Loader2,
  FileText,
  AlertTriangle,
  Users,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Phone,
  Mail
} from 'lucide-react';

const TEMPLATES: Record<string, string> = {
  investigation: 'محضر تحقيق رسمي',
  supervisor_report: 'تقرير مشرف',
  advance: 'طلب سلفة مالية',
  internet_advance: 'طلب سلفة باقة إنترنت',
  absence: 'محضر إثبات غياب',
  custody: 'محضر استلام عهدة'
};

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return formatRiyadh(new Date(d), 'yyyy/MM/dd');
}

function formatDeductionMonth(value?: string | null) {
  if (!value) return '';
  const [year, month] = value.split('-');
  if (!year || !month) return value;
  return `${month}/${year}`;
}

function renderBoldText(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className='font-black text-slate-950'>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// Extract employees for group reports
export function parseDocEmployees(inv: InvestigationResponse): Array<{ name: string; national_id: string }> {
  if (!inv) return [];

  // Check if items contain JSON serialized employee objects
  if (inv.items && inv.items.length > 0 && inv.type !== 'custody') {
    const list: Array<{ name: string; national_id: string }> = [];
    for (const it of inv.items) {
      try {
        const parsed = JSON.parse(it);
        if (parsed && (parsed.name || parsed.national_id)) {
          list.push({
            name: parsed.name || '—',
            national_id: parsed.national_id || '—'
          });
        }
      } catch {
        // Not JSON
      }
    }
    if (list.length > 0) return list;
  }

  // Check if employee_name has multiple comma-separated names
  if (inv.employee_name && (inv.employee_name.includes(' ، ') || inv.employee_name.includes(','))) {
    const names = inv.employee_name.split(/ ، |,/);
    const nats = (inv.national_id || '').split(/ ، |,/);
    return names.map((name, i) => ({
      name: name.trim(),
      national_id: (nats[i] || '').trim() || '—'
    }));
  }

  // Single employee fallback
  return [
    {
      name: inv.employee_name || '—',
      national_id: inv.national_id || '—'
    }
  ];
}

export function PublicDocView({ docId, initialType }: { docId: string; initialType?: string }) {
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const { data: doc, isLoading, isError } = useQuery({
    queryKey: ['public-doc', docId],
    queryFn: () => investigationApi.getPublicById(docId),
    retry: 1
  });

  // Auto-open photos if URL has ?photos=1
  useEffect(() => {
    if (typeof window !== 'undefined' && doc?.images && doc.images.length > 0) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('photos') === '1') {
        setViewingImage(doc.images[0]);
      }
    }
  }, [doc]);

  if (isLoading) {
    return (
      <div className='min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4' dir='rtl'>
        <div className='bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-3'>
          <Loader2 className='size-8 animate-spin text-[#f97316]' />
          <p className='text-sm font-bold text-slate-700 dark:text-slate-300'>جارٍ استرجاع بيانات الوثيقة والتحقق منها...</p>
        </div>
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className='min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4' dir='rtl'>
        <div className='bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800 text-center space-y-4'>
          <div className='size-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto'>
            <AlertTriangle className='size-8' />
          </div>
          <h2 className='text-lg font-black text-slate-900 dark:text-slate-100'>تعذر العثور على الوثيقة</h2>
          <p className='text-xs text-slate-500 leading-relaxed'>
            لم يتم العثور على تقرير أو محضر مطابق لهذا الرمز. يرجى التأكد من مسح الرمز الصحيح.
          </p>
        </div>
      </div>
    );
  }

  const t = doc;
  const isInv = t.type === 'investigation';
  const isReport = t.type === 'supervisor_report';
  const isAdvance = t.type === 'advance' || t.type === 'internet_advance';
  const isAdvanceOnly = t.type === 'advance';
  const isInternetAdvance = t.type === 'internet_advance';
  const isAbsence = t.type === 'absence';
  const isCustody = t.type === 'custody';

  const employees = parseDocEmployees(t);
  const isGroupReport = employees.length > 1;

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'aams-logistics.kerd2sy.com';
  const currentPort = typeof window !== 'undefined' && window.location.port ? `:${window.location.port}` : '';
  const currentOrigin = typeof window !== 'undefined' ? `${window.location.protocol}//${currentHost}${currentPort}` : 'https://aams-logistics.kerd2sy.com';
  const docUrl = `${currentOrigin}/doc/${t.type}/${t.id}`;
  const photoUrl = `${currentOrigin}/doc/${t.type}/${t.id}?photos=1`;

  return (
    <div className='min-h-screen bg-slate-100 text-slate-950 py-4 sm:py-8' dir='rtl'>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm;
          }
          header, aside, nav, .no-print {
            display: none !important;
          }
          body, html {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #public-printable-doc {
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 4mm 8mm !important;
          }
        }
      `}</style>

      {/* Floating Action Bar for Mobile & Desktop */}
      {t.images && t.images.length > 0 && (
        <div className='max-w-[210mm] mx-auto px-4 mb-4 flex items-center justify-end no-print'>
          <Button
            size='sm'
            variant='outline'
            onClick={() => setViewingImage(t.images?.[0] || null)}
            className='gap-1.5 text-xs font-bold bg-white shadow-2xs cursor-pointer'
          >
            <ImageIcon className='size-3.5 text-blue-600' />
            عرض المرفقات ({t.images.length})
          </Button>
        </div>
      )}

      {/* Main Official Document Layout */}
      <div
        id='public-printable-doc'
        className='relative bg-white text-slate-950 shadow-2xl overflow-hidden rounded-2xl border border-slate-200/80 min-h-[250mm] max-w-[210mm] mx-auto flex flex-col justify-between'
      >
        {/* Watermark Logo */}
        <div className='absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src='/logo.png'
            alt='Watermark'
            className='w-80 h-80 object-contain opacity-[0.05] grayscale select-none'
          />
        </div>

        <div className='relative z-10 flex-1 flex flex-col justify-between'>
          <div className='flex-1 flex flex-col justify-start'>
            {/* Top Accent Line */}
            <div className='flex h-2 w-full'>
              <div className='h-full w-1/4 bg-[#f97316]'></div>
              <div className='h-full w-3/4 bg-slate-950'></div>
            </div>

            {/* Header */}
            <div className='px-6 pb-2 pt-4 sm:px-10'>
              <div className='flex items-center justify-between gap-4 pb-1'>
                <div className='flex items-center gap-3 shrink-0' dir='ltr'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src='/logo.png' alt='AAMS LOGISTICS' className='h-12 w-auto object-contain shrink-0' />
                  <div className='flex flex-col items-stretch justify-center select-none text-center min-w-[76px]'>
                    <span className='text-[20px] font-black tracking-[0.16em] text-slate-950 font-sans leading-none pl-[0.16em] block'>
                      AAMS
                    </span>
                    <span className='text-[7.5px] font-black tracking-[0.37em] text-slate-700 font-sans leading-none mt-1 pl-[0.37em] uppercase block'>
                      LOGISTICS
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Title with Brand Logo Color Underline */}
            <div className='text-center my-3'>
              <h1 className='text-xl sm:text-2xl font-black tracking-wide text-slate-950 inline-block border-b-2 border-[#f97316] pb-1 px-8'>
                {TEMPLATES[t.type] || 'تقرير رسمي'}
              </h1>
            </div>

            {/* Employee(s) Section */}
            {isGroupReport ? (
              <div className='px-8 py-3 sm:px-12'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <span className='inline-block size-2.5 rounded-full bg-[#f97316]'></span>
                    <h3 className='text-xs sm:text-sm font-black text-slate-950'>
                      الموظفون المشمولون بهذا التقرير المجمع ({employees.length} موظفين):
                    </h3>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-bold text-slate-500 font-mono'>
                      تاريخ الإنشاء: {formatDate(t.created_at)}
                    </span>
                  </div>
                </div>

                <div className='overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-2xs'>
                  <table className='w-full text-xs text-right border-collapse' dir='rtl'>
                    <thead>
                      <tr className='bg-slate-100/90 border-b border-slate-200 text-slate-700 font-black'>
                        <th className='p-2.5 w-12 text-center'>#</th>
                        <th className='p-2.5'>اسم الموظف / المندوب</th>
                        <th className='p-2.5 font-mono'>رقم الهوية الوطنية / الإقامة</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-200/70'>
                      {employees.map((emp, idx) => (
                        <tr key={idx} className='hover:bg-slate-100/50 transition-colors'>
                          <td className='p-2.5 text-center font-bold text-slate-500 font-mono'>{idx + 1}</td>
                          <td className='p-2.5 font-black text-slate-900'>{emp.name}</td>
                          <td className='p-2.5 font-mono font-bold text-slate-700'>{emp.national_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className='px-8 py-3 sm:px-12'>
                <div className='flex items-center justify-between gap-6'>
                  <div className='space-y-1.5 text-sm'>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs text-slate-500 font-medium min-w-[75px]'>اسم الموظف:</span>
                      <span className='font-bold text-slate-950'>{t.employee_name || '—'}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs text-slate-500 font-medium min-w-[75px]'>رقم الهوية:</span>
                      <span className='font-mono font-bold text-slate-950 tracking-wider'>{t.national_id || '—'}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs text-slate-500 font-medium min-w-[75px]'>تاريخ الإنشاء:</span>
                      <span className='font-mono font-bold text-slate-900'>{formatDate(t.created_at)}</span>
                    </div>
                  </div>

                  <div className='flex flex-col items-center justify-center shrink-0'>
                    <QRCodeImage value={docUrl} size={78} />
                  </div>
                </div>
              </div>
            )}

            {/* Advance Amount */}
            {isAdvance && t.amount != null && (
              <div className='px-8 sm:px-12'>
                <div className='mt-1 p-3 bg-green-50/70 border border-green-200/80 rounded-xl flex items-center justify-between text-sm'>
                  <span className='text-xs text-green-800 font-bold'>مبلغ السلفة المطلوب:</span>
                  <strong className='font-black text-green-950 font-mono text-base'>
                    {t.amount.toLocaleString()} ريال
                  </strong>
                </div>
              </div>
            )}

            {/* Absence Dates */}
            {isAbsence && (
              <div className='px-8 sm:px-12'>
                <div className='mt-1 p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl flex items-center justify-between text-xs'>
                  <span className='text-rose-800 font-bold'>فترة الغياب المسجلة:</span>
                  <span className='font-bold font-mono text-rose-950'>
                    من {formatDate(t.start_date)} إلى {formatDate(t.end_date)}
                  </span>
                </div>
              </div>
            )}

            {/* Investigation Q&A */}
            {isInv && t.questions && t.questions.length > 0 && (
              <div className='px-8 py-2.5 sm:px-12'>
                <h3 className='mb-2 flex items-center gap-2 text-xs font-black text-slate-900'>
                  <span className='inline-block h-3.5 w-1 rounded-full bg-blue-600'></span>
                  أسئلة وأجوبة التحقيق
                </h3>
                <div className='overflow-hidden rounded-xl border border-slate-200 bg-slate-50/40'>
                  {t.questions.map((q, i) => (
                    <div key={i} className={i > 0 ? 'border-t border-slate-200' : ''}>
                      <div className='flex'>
                        <div className='flex w-9 shrink-0 items-center justify-center border-l border-slate-200 bg-slate-100 text-xs font-bold text-slate-600 font-mono'>
                          {i + 1}
                        </div>
                        <div className='flex-1 p-3'>
                          <p className='mb-1 text-xs font-bold text-slate-900'>س: {q}</p>
                          <p className='border-r-2 border-blue-500 pr-2.5 text-xs text-slate-700 leading-relaxed'>
                            ج: {t.answers?.[i] || '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Investigation Result */}
            {isInv && (
              <div className='px-8 py-2.5 sm:px-12'>
                <h3 className='mb-2 flex items-center gap-2 text-xs font-black text-slate-900'>
                  <span className='inline-block h-3.5 w-1 rounded-full bg-blue-600'></span>
                  نتيجة التحقيق
                </h3>
                <div className='rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-center'>
                  <p className='mb-0.5 text-xs text-slate-500 font-medium'>إقرار الإدانة من الموظف:</p>
                  <p className='text-lg font-black text-slate-950'>
                    {t.is_guilty ? 'نعم - إقرار بالإدانة' : 'لا - إنكار الإدانة'}
                  </p>
                </div>
              </div>
            )}

            {/* Report Text (Supervisor Report / Absence) */}
            {(isReport || isAbsence) && t.report_text && (
              <div className='px-8 py-3 sm:px-12'>
                <div className='text-sm sm:text-base font-bold text-slate-950 mb-2'>
                  {isAbsence ? 'تفاصيل وإثبات الغياب:' : 'نص التقرير:'}
                </div>
                <div className='whitespace-pre-wrap font-normal leading-relaxed text-slate-900 text-sm sm:text-base'>
                  {renderBoldText(t.report_text)}
                </div>
              </div>
            )}

            {/* Custody Items */}
            {isCustody && t.items && t.items.length > 0 && (
              <div className='px-8 py-3 sm:px-12'>
                <h3 className='mb-2 flex items-center gap-2 text-xs font-black text-slate-900'>
                  <span className='inline-block h-3.5 w-1 rounded-full bg-blue-600'></span>
                  العهد المستلمة
                </h3>
                <div className='overflow-hidden rounded-xl border border-slate-200 bg-slate-50/40'>
                  {t.items.map((item, i) => (
                    <div
                      key={i}
                      className={cn(
                        'p-2.5 text-xs text-slate-800',
                        i > 0 && 'border-t border-slate-200'
                      )}
                    >
                      <span className='ml-2 font-bold text-blue-600 font-mono'>{i + 1}.</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes if any */}
            {t.notes && !isGroupReport && (
              <div className='px-8 py-2 sm:px-12'>
                <div className='text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200'>
                  <strong className='font-bold text-slate-800 block mb-1'>ملاحظات إضافية:</strong>
                  {t.notes}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Photo Attachments & Signatures & Official Footer */}
          <div className='mt-auto'>
            {/* Photo Attachments with QR and Live Gallery */}
            {t.images && t.images.length > 0 && (
              <div className='px-8 py-2.5 sm:px-12'>
                <div
                  className='flex items-center justify-between p-3 bg-slate-50/90 border border-slate-200 rounded-xl shadow-2xs cursor-pointer transition-colors hover:bg-slate-100/80'
                  onClick={() => setViewingImage(t.images?.[0] || null)}
                >
                  <div className='flex items-center gap-3.5'>
                    <div className='shrink-0' title='امسح الرمز أو انقر لعرض الصور'>
                      <QRCodeImage value={photoUrl} size={78} />
                    </div>
                    <div className='space-y-1 text-right'>
                      <div className='flex items-center gap-2'>
                        <span className='text-xs font-black text-slate-900'>
                          مرفقات مصورة ({t.images.length} صور)
                        </span>
                        <span className='text-[9.5px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full'>
                          QR المرفقات
                        </span>
                      </div>
                      <p className='text-[10.5px] text-slate-600 font-medium leading-tight'>
                        امسح الرمز أو انقر هنا لفتح الصور والمرفقات عالية الدقة مباشرة 📱
                      </p>
                    </div>
                  </div>

                  {/* Thumbnail Previews */}
                  <div className='flex items-center gap-1.5 overflow-hidden' onClick={(e) => e.stopPropagation()}>
                    {t.images.slice(0, 3).map((img, idx) => (
                      <div
                        key={idx}
                        className='size-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0 cursor-pointer shadow-2xs hover:opacity-80 transition-opacity'
                        onClick={() => setViewingImage(img)}
                        title='انقر لتكبير الصورة'
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={`مرفق ${idx + 1}`} className='w-full h-full object-cover' />
                      </div>
                    ))}
                    {t.images.length > 3 && (
                      <span
                        className='text-[10px] font-black text-slate-600 bg-slate-200 rounded-lg px-2 py-2 cursor-pointer hover:bg-slate-300'
                        onClick={() => setViewingImage(t.images?.[3] || null)}
                      >
                        +{t.images.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Signatures */}
            {isReport ? (
              <div className='pt-2 pb-2 px-8 sm:px-14'>
                <div className='flex items-center justify-center gap-4 my-2'>
                  <div className='h-[1px] bg-gradient-to-r from-transparent via-slate-300 to-transparent flex-1'></div>
                  <p className='text-xs font-bold text-slate-700 italic tracking-wide'>
                    « تم إعداد هذا التقرير لإثبات حالته تحت مسؤوليتي »
                  </p>
                  <div className='h-[1px] bg-gradient-to-r from-transparent via-slate-300 to-transparent flex-1'></div>
                </div>

                <div className='flex items-end justify-between max-w-lg mx-auto pt-2 pb-2 px-4'>
                  <div className='space-y-1'>
                    <span className='text-[10px] font-bold text-slate-400 block'>مُعد التقرير (المشرف)</span>
                    <p className='text-sm font-black text-slate-900'>{t.supervisor_name || '—'}</p>
                  </div>
                  <div className='space-y-1 text-left' dir='ltr'>
                    <span className='text-[10px] font-bold text-slate-400 block text-right'>التوقيع</span>
                    <div className='w-40 border-b-2 border-slate-300 pb-3'></div>
                  </div>
                </div>
              </div>
            ) : t.type !== 'advance' ? (
              <div className='pt-2 pb-2 px-8 sm:px-14'>
                <div className='grid grid-cols-2 gap-12 max-w-lg mx-auto pt-2 pb-2 px-4'>
                  <div className='space-y-1'>
                    <span className='text-[10px] font-bold text-slate-400 block'>
                      {isInternetAdvance ? 'بصمة الموظف' : 'توقيع الموظف'}
                    </span>
                    <p className='text-sm font-black text-slate-900'>{t.employee_name || '—'}</p>
                    <div className='w-40 border-b-2 border-slate-300 pb-3'></div>
                  </div>
                  <div className='space-y-1 text-left' dir='ltr'>
                    <span className='text-[10px] font-bold text-slate-400 block text-right'>توقيع المشرف المسؤول</span>
                    <p className='text-sm font-black text-slate-900 text-right'>{t.supervisor_name || '—'}</p>
                    <div className='w-40 border-b-2 border-slate-300 pb-3 ml-auto'></div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Official Footer */}
            <div className='mt-auto border-t border-slate-300 px-4 py-1.5 text-center bg-slate-50/70'>
              <p className='text-[8.5px] font-bold text-slate-700 leading-tight'>
                شركة ابرار عبد الرحمن الشمرانى للخدمات اللوجيستية - المملكة العربية السعودية - جدة - الطائف - الخبر - سجل تجارى رقم 41030552280 | رقم الهاتف: 0531112225 | الايميل: fahad@aams-logistics.com
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* High-Resolution Photo Lightbox */}
      <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
        <DialogContent className='max-w-4xl max-h-[90vh] p-4 flex flex-col items-center justify-center bg-slate-950/95 text-white border-slate-800' dir='rtl'>
          <DialogHeader className='w-full flex flex-row items-center justify-between pb-2 border-b border-slate-800'>
            <DialogTitle className='text-sm font-bold text-white flex items-center gap-2'>
              <ImageIcon className='size-4 text-[#f97316]' />
              معاينة المرفقات بدقة فائقة
            </DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <div className='relative max-h-[65vh] w-full flex items-center justify-center overflow-auto my-3'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewingImage}
                alt='مرفق عالي الدقة'
                className='max-h-[65vh] max-w-full object-contain rounded-xl shadow-2xl'
              />
            </div>
          )}
          {/* Thumbnails */}
          {t.images && t.images.length > 1 && (
            <div className='flex items-center gap-2 mt-1 pt-2 border-t border-slate-800/80 overflow-x-auto max-w-full pb-1'>
              {t.images.map((img, i) => (
                <button
                  key={i}
                  type='button'
                  onClick={() => setViewingImage(img)}
                  className={cn(
                    'size-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer',
                    viewingImage === img ? 'border-[#f97316] scale-105 shadow-md' : 'border-transparent opacity-50 hover:opacity-100'
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`مصغرة ${i + 1}`} className='w-full h-full object-cover' />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
