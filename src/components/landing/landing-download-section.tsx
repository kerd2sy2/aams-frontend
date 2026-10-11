'use client';

import React from 'react';
import Image from 'next/image';
import { Download, Sparkles, CheckCircle, ShieldCheck, ArrowDown } from 'lucide-react';
import { QrCard, PLAY_STORE_URL } from './qr-card';

export function LandingDownloadSection() {
  const steps = [
    {
      num: '01',
      title: 'امسح الرمز أو افتح المتجر',
      desc: 'وجّه كاميرا هاتفك نحو الباركود أو انقر على زر التحميل المباشر من Google Play.'
    },
    {
      num: '02',
      title: 'سجّل الدخول برقم الهوية',
      desc: 'أدخل رقم الهوية الوطنية وكلمة المرور الخاصة بك لمباشرة دوامك فوراً.'
    },
    {
      num: '03',
      title: 'التقط صورة العداد وابدأ الوردية',
      desc: 'يقوم الذكاء الاصطناعي بقراءة عداد الكيلومتر واللوحة تلقائياً لتنطلق للتوصيل.'
    }
  ];

  return (
    <section id='download' className='py-20 md:py-28 relative overflow-hidden'>
      {/* Background glow effects */}
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-[500px] bg-orange-600/10 rounded-full blur-[160px] pointer-events-none' />

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
        {/* Banner Card */}
        <div className='rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 p-8 sm:p-12 lg:p-16 shadow-2xl shadow-orange-500/10 backdrop-blur-xl'>
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-12 items-center'>
            {/* Right Side (Content & Steps) in RTL */}
            <div className='lg:col-span-7 text-right'>
              <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400 text-xs font-semibold mb-4'>
                <Sparkles className='w-4 h-4 text-orange-400' />
                <span>تحميل تطبيق المناديب الميداني</span>
              </div>

              <h2 className='text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-4 leading-tight'>
                جاهز للانطلاق مع أسطول <span className='text-orange-500'>AAMS</span>؟
              </h2>

              <p className='text-base sm:text-lg text-zinc-300 leading-relaxed mb-8'>
                حمّل التطبيق الآن واستفد من أحدث التقنيات اللوجستية لإدارة وردياتك، حساب مكافآتك، وضمان
                اعتماد كامل لطلباتك بكل سهولة وسرعة.
              </p>

              {/* 3 Step onboarding guide */}
              <div className='space-y-4 mb-8'>
                {steps.map((st, i) => (
                  <div
                    key={i}
                    className='flex items-start gap-4 p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80'
                  >
                    <div className='w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono font-black text-sm flex items-center justify-center shrink-0'>
                      {st.num}
                    </div>
                    <div>
                      <h4 className='text-sm font-bold text-white mb-0.5'>{st.title}</h4>
                      <p className='text-xs text-zinc-400 leading-relaxed'>{st.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Badges / Guarantees */}
              <div className='flex flex-wrap gap-4 text-xs font-medium text-zinc-400'>
                <span className='inline-flex items-center gap-1.5'>
                  <CheckCircle className='w-4 h-4 text-emerald-400' />
                  متوافق مع أجهزة Android (v8.0 فما فوق)
                </span>
                <span className='inline-flex items-center gap-1.5'>
                  <ShieldCheck className='w-4 h-4 text-sky-400' />
                  فحص ومصادقة Google Play Protect
                </span>
              </div>
            </div>

            {/* Left Side (QR Code & Quick Download) */}
            <div className='lg:col-span-5 flex justify-center'>
              <div className='w-full max-w-sm'>
                <QrCard size={230} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
