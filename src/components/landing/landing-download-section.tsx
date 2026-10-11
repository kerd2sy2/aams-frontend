'use client';

import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { QrCard } from './qr-card';

interface LandingDownloadSectionProps {
  appUrl?: string;
  logoUrl?: string;
}

export function LandingDownloadSection({ appUrl, logoUrl }: LandingDownloadSectionProps) {
  const steps = [
    {
      num: '1',
      title: 'امسح الباركود أو افتح المتجر',
      desc: 'وجّه كاميرا هاتفك نحو الباركود أو اضغط زر التحميل للوصول إلى التطبيق في Google Play.'
    },
    {
      num: '2',
      title: 'سجّل الدخول برقم الهوية',
      desc: 'أدخل رقم الهوية الوطنية وكلمة المرور الخاصة بك لمباشرة دوامك بسهولة.'
    },
    {
      num: '3',
      title: 'وثّق قراءة العداد وابدأ الوردية',
      desc: 'التقط صورة لعداد الكيلومتر واللوحة لتوثيق بدء الوردية وانطلق للتوصيل.'
    }
  ];

  return (
    <section id='download' className='py-20 bg-white'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='rounded-3xl bg-slate-50 border border-slate-200 p-8 sm:p-12 lg:p-14 shadow-sm'>
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-10 items-center'>
            {/* Right Side: Text & Steps */}
            <div className='lg:col-span-7 text-right'>
              <span className='inline-block px-3 py-1 rounded-md bg-orange-100 text-orange-800 text-xs font-bold mb-3'>
                تحميل التطبيق
              </span>

              <h2 className='text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4'>
                جاهز للبدء مع أسطول <span className='text-orange-600'>AAMS</span>؟
              </h2>

              <p className='text-base text-slate-600 leading-relaxed mb-8'>
                حمّل تطبيق المناديب الآن على هاتفك الأندرويد، وسجّل وردياتك بكل سهولة مع ضمان توثيق كافة
                طلباتك ومستحقاتك.
              </p>

              {/* 3 Step onboarding guide */}
              <div className='space-y-3.5 mb-8'>
                {steps.map((st, i) => (
                  <div
                    key={i}
                    className='flex items-start gap-4 p-3.5 rounded-xl bg-white border border-slate-200'
                  >
                    <div className='w-8 h-8 rounded-lg bg-orange-100 text-orange-700 font-bold text-sm flex items-center justify-center shrink-0'>
                      {st.num}
                    </div>
                    <div>
                      <h4 className='text-sm font-bold text-slate-900 mb-0.5'>{st.title}</h4>
                      <p className='text-xs text-slate-600 leading-relaxed'>{st.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Guarantees */}
              <div className='flex flex-wrap gap-4 text-xs font-medium text-slate-600'>
                <span className='inline-flex items-center gap-1.5'>
                  <CheckCircle2 className='w-4 h-4 text-emerald-600' />
                  متوافق مع أجهزة Android (v8.0 فما فوق)
                </span>
                <span className='inline-flex items-center gap-1.5'>
                  <ShieldCheck className='w-4 h-4 text-slate-700' />
                  معتمد ومحمي عبر Google Play Protect
                </span>
              </div>
            </div>

            {/* Left Side: QR Code Card */}
            <div className='lg:col-span-5 flex justify-center'>
              <div className='w-full max-w-sm'>
                <QrCard appUrl={appUrl} logoUrl={logoUrl} size={210} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
