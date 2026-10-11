'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ShieldCheck, CheckCircle2, Bike, Gauge, Cpu, ArrowDown } from 'lucide-react';
import { QrCard, PLAY_STORE_URL } from './qr-card';

export function LandingHero() {
  return (
    <section className='relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden'>
      {/* Dynamic Background Atmosphere */}
      <div className='absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none'>
        <div className='absolute top-10 left-1/4 w-[500px] h-[500px] bg-orange-600/15 rounded-full blur-[140px]' />
        <div className='absolute top-32 right-1/4 w-[400px] h-[400px] bg-sky-600/10 rounded-full blur-[120px]' />
        <div className='absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-25 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]' />
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center'>
          {/* Right Column (Text / Company Overview) in RTL */}
          <div className='lg:col-span-7 flex flex-col text-right'>
            {/* Pill Announcement */}
            <div className='inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400 text-xs sm:text-sm font-semibold mb-6 shadow-sm'>
              <Sparkles className='w-4 h-4 text-orange-400 animate-pulse' />
              <span>الإصدار الجديد متاح الآن على متجر Google Play</span>
            </div>

            {/* Main Headline */}
            <h1 className='text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.2] mb-6'>
              منظومة{' '}
              <span className='bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent'>
                AAMS Logistics
              </span>
              <br />
              لإدارة الأساطيل والتوصيل السريع
            </h1>

            {/* Comprehensive Company Overview Paragraph */}
            <p className='text-base sm:text-lg text-zinc-300 leading-relaxed max-w-2xl mb-8'>
              شركة <strong className='text-white font-bold'>AAMS</strong> رائدة في تشغيل وإدارة
              أساطيل التوصيل والميل الأخير (Last-Mile Delivery) بالمملكة العربية السعودية. نوفر
              منظومة تقنية فائقة التطور تربط المناديب الميدانيين مع كبرى منصات التوصيل، معتمدة على{' '}
              <span className='text-orange-400 font-medium'>
                الذكاء الاصطناعي لقراءة العدادات واللوحات
              </span>
              ، أتمتة الورديات، الرقابة على الصيانة، وحساب الحوافز بدقة وشفافية مطلقة.
            </p>

            {/* CTAs */}
            <div className='flex flex-wrap items-center gap-4 mb-10'>
              <a
                href={PLAY_STORE_URL}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white font-bold text-sm sm:text-base shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200'
              >
                <span>تحميل التطبيق الميداني</span>
                <ArrowDown className='w-4 h-4 animate-bounce' />
              </a>

              <Link
                href='/login'
                className='inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl bg-zinc-900/90 hover:bg-zinc-850 text-zinc-200 hover:text-white border border-zinc-700/80 hover:border-orange-500/50 font-semibold text-sm sm:text-base shadow-md transition-all duration-200'
              >
                <ShieldCheck className='w-5 h-5 text-orange-400' />
                <span>دخول بوابة المشرفين</span>
              </Link>
            </div>

            {/* Key Value Highlights */}
            <div className='grid grid-cols-3 gap-3 sm:gap-6 pt-6 border-t border-zinc-800/80'>
              <div className='flex flex-col'>
                <div className='flex items-center gap-1.5 text-orange-400 font-black text-xl sm:text-2xl'>
                  <span>99.9%</span>
                </div>
                <span className='text-[12px] sm:text-xs text-zinc-400 font-medium mt-0.5'>
                  دقة القراءة بالذكاء الاصطناعي
                </span>
              </div>

              <div className='flex flex-col'>
                <div className='flex items-center gap-1.5 text-white font-black text-xl sm:text-2xl'>
                  <span>+15,000</span>
                </div>
                <span className='text-[12px] sm:text-xs text-zinc-400 font-medium mt-0.5'>
                  وردية ميدانية منجزة
                </span>
              </div>

              <div className='flex flex-col'>
                <div className='flex items-center gap-1.5 text-sky-400 font-black text-xl sm:text-2xl'>
                  <span>24/7</span>
                </div>
                <span className='text-[12px] sm:text-xs text-zinc-400 font-medium mt-0.5'>
                  متابعة وتشغيل مستمر
                </span>
              </div>
            </div>
          </div>

          {/* Left Column (QR Card & Mobile App Visual Showcase) in RTL */}
          <div className='lg:col-span-5 flex flex-col items-center lg:items-end'>
            {/* The Dedicated QR Download Card */}
            <div className='w-full max-w-md'>
              <QrCard size={210} />

              {/* Floating Live App Status Preview */}
              <div className='mt-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4 shadow-xl backdrop-blur-xl'>
                <div className='flex items-center justify-between pb-3 mb-3 border-b border-zinc-800'>
                  <div className='flex items-center gap-2.5'>
                    <div className='w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400'>
                      <Bike className='w-4 h-4' />
                    </div>
                    <div className='text-right'>
                      <div className='text-xs font-bold text-white'>معاينة التطبيق الميداني</div>
                      <div className='text-[11px] text-zinc-400'>تجربة مندوب سلسة وموثوقة</div>
                    </div>
                  </div>
                  <span className='inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full'>
                    <CheckCircle2 className='w-3 h-3' />
                    شفت نشط
                  </span>
                </div>

                <div className='grid grid-cols-2 gap-2 text-right'>
                  <div className='bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-800/60'>
                    <div className='flex items-center gap-1 text-[11px] text-zinc-400 mb-1'>
                      <Gauge className='w-3 h-3 text-orange-400' />
                      <span>قراءة العداد بالـ AI</span>
                    </div>
                    <div className='text-xs font-mono font-bold text-white'>
                      14,250 كم <span className='text-emerald-400'>✓</span>
                    </div>
                  </div>

                  <div className='bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-800/60'>
                    <div className='flex items-center gap-1 text-[11px] text-zinc-400 mb-1'>
                      <Cpu className='w-3 h-3 text-sky-400' />
                      <span>الهدف الشهري</span>
                    </div>
                    <div className='text-xs font-mono font-bold text-white'>96% محقق 🎉</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
