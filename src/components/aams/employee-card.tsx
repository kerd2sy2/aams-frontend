'use client';

import React, { useRef } from 'react';
import { Employee } from '@/types/aams';
import { toast } from 'sonner';
import { getWhatsAppURL } from '@/lib/utils';
import { Code128Barcode, QRCodeImage } from '@/components/aams/employee-codes';
import { Icons } from '@/components/icons';

interface EmployeeCardProps {
  employee: Employee;
  barcodeData?: string;
  qrCodeData?: string;
}

const loadImageAsDataURL = async (url: string): Promise<string | null> => {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  try {
    const resp = await fetch(url, { mode: 'cors', cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to CORS-fetch image, will try direct render:', url, err);
    }
    return null;
  }
};

export function EmployeeCard({ employee, barcodeData, qrCodeData }: EmployeeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 10);
  };

  const handleDownloadPDF = async () => {
    try {
      toast.info('جاري إعداد بطاقة الموظف بدقة عالية للتحميل...');
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      if (!cardRef.current) {
        toast.error('بطاقة الموظف غير جاهزة حالياً');
        return;
      }

      const safeImageSrc = employee.personal_image
        ? employee.personal_image.startsWith('/uploads')
          ? `${window.location.protocol}//${window.location.hostname}:8080${employee.personal_image}`
          : employee.personal_image
        : '';

      const safeBarcodeSrc = barcodeData || employee.barcode;
      const safeQrSrc = qrCodeData || employee.qr_code;

      const resolvedPhoto = await loadImageAsDataURL(safeImageSrc);

      const clone = cardRef.current.cloneNode(true) as HTMLDivElement;
      clone.style.position = 'absolute';
      clone.style.top = '-99999px';
      clone.style.left = '-99999px';
      clone.style.zIndex = '-1';
      document.body.appendChild(clone);

      try {
        if (resolvedPhoto) {
          const imgs = clone.querySelectorAll('img');
          imgs.forEach((img) => {
            const current = img.getAttribute('src') || '';
            if (!current.startsWith('data:') && current.startsWith('/uploads')) {
              img.setAttribute('src', resolvedPhoto);
              img.removeAttribute('srcset');
              img.crossOrigin = 'anonymous';
            } else if (safeBarcodeSrc && current === safeBarcodeSrc) {
              img.removeAttribute('srcset');
            } else if (safeQrSrc && current === safeQrSrc) {
              img.removeAttribute('srcset');
            }
          });
        }

        await new Promise<void>((resolve) => {
          const cloneImgs = clone.querySelectorAll('img');
          if (cloneImgs.length === 0) {
            resolve();
            return;
          }
          let loaded = 0;
          const total = cloneImgs.length;
          const done = () => {
            loaded += 1;
            if (loaded >= total) resolve();
          };
          cloneImgs.forEach((img) => {
            if (img.complete && img.naturalWidth > 0) {
              done();
            } else {
              img.addEventListener('load', done, { once: true });
              img.addEventListener('error', done, { once: true });
            }
          });
          setTimeout(resolve, 4000);
        });

        const canvas = await html2canvas(clone, {
          scale: 3,
          useCORS: true,
          allowTaint: false,
          backgroundColor: null,
          logging: false,
          windowWidth: clone.scrollWidth + 50,
          windowHeight: clone.scrollHeight + 50
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const imgWidth = 120;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const xPos = (210 - imgWidth) / 2;
        const yPos = 40;

        pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);
        const safeName = employee.name
          .replace(/\s+/g, '_')
          .replace(/[^\u0600-\u06FF\w\-]/g, '');
        pdf.save(`بطاقة_الموظف_${safeName || (employee.id ? employee.id.slice(0, 8) : 'N/A')}.pdf`);
        toast.success('تم تحميل البطاقة بصيغة PDF بنجاح!');
      } finally {
        document.body.removeChild(clone);
      }
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error('حدث خطأ أثناء إنشاء ملف PDF');
    }
  };

  const barcodeSrc = barcodeData || employee.barcode;
  const qrSrc = qrCodeData || employee.qr_code;
  const imageSrc = employee.personal_image
    ? employee.personal_image.startsWith('/uploads')
      ? `${window.location.protocol}//${window.location.hostname}:8080${employee.personal_image}`
      : employee.personal_image
    : '';

  return (
    <div className='space-y-6'>
      {/* Action Toolbar (hidden during browser printing) */}
      <div className='bg-card border-border print:hidden flex items-center justify-between rounded-2xl border p-4 shadow-sm'>
        <div className='flex items-center gap-3'>
          <div className='bg-muted text-foreground rounded-xl p-2.5'>
            <Icons.shield className='h-6 w-6' />
          </div>
          <div>
            <h2 className='text-foreground text-lg font-bold'>بطاقة الموظف الرسمية</h2>
            <p className='text-muted-foreground text-xs'>جاهزة للطباعة مقاس A4 وتحميل PDF</p>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          <button
            onClick={handleDownloadPDF}
            className='bg-secondary hover:bg-secondary/80 text-foreground flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors'
          >
            <Icons.download className='h-4 w-4 text-blue-600 dark:text-blue-400' />
            <span>تحميل PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className='flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-colors hover:bg-blue-700'
          >
            <Icons.printer className='h-4 w-4' />
            <span>طباعة البطاقة</span>
          </button>
        </div>
      </div>

      {/* Printable ID Card Container */}
      <div className='flex justify-center p-4'>
        <div
          ref={cardRef}
          className='relative w-[360px] overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-950 p-6 text-white shadow-2xl print:m-auto print:shadow-none'
        >
          {/* Decorative Header Accent */}
          <div className='absolute top-0 right-0 left-0 h-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400' />

          {/* Company Branding */}
          <div className='mb-5 flex items-center justify-between border-b border-white/10 pb-4'>
            <div className='flex items-center gap-2.5'>
              <div className='flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white p-1'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src='/logo.png' alt='AAMS' className='h-full w-full object-contain' />
              </div>
              <div>
                <h3 className='text-base font-extrabold tracking-wide text-white'>AAMS</h3>
                <p className='text-[10px] font-medium uppercase tracking-wider text-blue-300'>
                  Delivery Management System
                </p>
              </div>
            </div>

            <div className='text-left dir-ltr'>
              <span className='rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400'>
                مندوب معتمد
              </span>
            </div>
          </div>

          {/* Employee Profile Section */}
          <div className='mb-6 flex flex-col items-center text-center'>
            <div className='relative mb-3'>
              <div className='flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border-4 border-blue-500/40 bg-slate-800 shadow-xl'>
                {imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageSrc}
                    alt={employee.name}
                    crossOrigin='anonymous'
                    referrerPolicy='no-referrer-when-downgrade'
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <Icons.user className='h-14 w-14 text-slate-500' />
                )}
              </div>
            </div>

            <h4 className='mb-1 text-xl font-black tracking-tight text-white'>{employee.name}</h4>
            {employee.employee_number ? (
              <p className='mb-1 inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 font-mono text-[11px] font-bold text-emerald-200'>
                <Icons.messageCircle className='size-3' />
                واتساب: {employee.employee_number}
              </p>
            ) : null}
            <p className='rounded-full border border-blue-400/20 bg-blue-900/40 px-3 py-1 font-mono text-xs tracking-widest text-blue-300'>
              ID: {employee.id ? `${employee.id.slice(0, 18)}...` : 'N/A'}
            </p>
          </div>

          {/* Employee Key Metadata Cards */}
          <div className='mb-6 grid grid-cols-2 gap-2.5 text-right'>
            {employee.employee_number ? (
              <div className='rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-2.5'>
                <span className='mb-0.5 flex items-center gap-1 text-[10px] font-medium text-emerald-300'>
                  <Icons.messageCircle className='h-3 w-3 text-emerald-300' /> واتساب المندوب
                </span>
                {(() => {
                  const waUrl = getWhatsAppURL(employee.employee_number);
                  if (waUrl) {
                    return (
                      <a
                        href={waUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='font-mono text-xs font-bold text-white transition-colors hover:text-emerald-200'
                        title='فتح محادثة الواتساب'
                      >
                        {employee.employee_number}
                      </a>
                    );
                  }
                  return (
                    <span className='font-mono text-xs font-bold text-white'>
                      {employee.employee_number}
                    </span>
                  );
                })()}
              </div>
            ) : (
              <div className='rounded-xl border border-white/10 bg-white/5 p-2.5'>
                <span className='mb-0.5 flex items-center gap-1 text-[10px] font-medium text-slate-400'>
                  <Icons.creditCard className='h-3 w-3 text-emerald-400' /> الهوية
                </span>
                <span className='break-all font-mono text-xs font-bold text-white'>
                  {employee.national_id || ''}
                </span>
              </div>
            )}

            <div className='rounded-xl border border-white/10 bg-white/5 p-2.5'>
              <span className='mb-0.5 flex items-center gap-1 text-[10px] font-medium text-slate-400'>
                <Icons.bike className='h-3 w-3 text-sky-400' /> رقم الدراجة
              </span>
              <span className='font-mono text-xs font-bold text-white'>
                {employee.motorcycle_number || 'غير مسجل'}
              </span>
            </div>

            {employee.employee_number ? (
              <div className='rounded-xl border border-white/10 bg-white/5 p-2.5'>
                <span className='mb-0.5 flex items-center gap-1 text-[10px] font-medium text-slate-400'>
                  <Icons.creditCard className='h-3 w-3 text-emerald-400' /> الهوية
                </span>
                <span className='break-all font-mono text-xs font-bold text-white'>
                  {employee.national_id || ''}
                </span>
              </div>
            ) : null}

            <div className='rounded-xl border border-white/10 bg-white/5 p-2.5'>
              <span className='mb-0.5 flex items-center gap-1 text-[10px] font-medium text-slate-400'>
                <Icons.fileText className='h-3 w-3 text-amber-400' /> التطبيق
              </span>
              <span className='text-xs font-bold text-white'>
                {employee.application_id || 'عام'}
              </span>
            </div>
          </div>

          {/* Codes Section (Barcode & QR Code) */}
          <div className='flex items-center justify-between gap-3 rounded-2xl bg-white p-4 text-slate-900 shadow-inner'>
            {/* Code128 Barcode - المعرف الفريد فقط */}
            <div className='flex flex-1 flex-col items-center justify-center'>
              <Code128Barcode value={employee.id} src={barcodeSrc || null} height={56} />
              <span className='mt-1 max-w-full truncate font-mono text-[9px] font-bold text-slate-500'>
                {employee.id}
              </span>
            </div>

            {/* QR Code - المعرف الفريد فقط */}
            <div className='flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-1'>
              <QRCodeImage value={employee.id} src={qrSrc || null} size={60} />
            </div>
          </div>

          {/* Card Footer */}
          <div className='mt-4 border-t border-white/10 pt-3 text-center'>
            <p className='text-[9px] text-slate-400'>
              هذه البطاقة ملك للشركة ويجب إبرازها عند الطلب.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
