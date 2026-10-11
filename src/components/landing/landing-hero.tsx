'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, CheckCircle2, Bike, Gauge, CalendarCheck, ArrowDown } from 'lucide-react';
import { QrCard } from './qr-card';

interface LandingHeroProps {
  appUrl?: string;
  logoUrl?: string;
}

export function LandingHero({ appUrl, logoUrl }: LandingHeroProps) {
  return (
    <section className='relative pt-12 pb-20 md:pt-16 md:pb-24 bg-white border-b border-slate-100'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center'>
          {/* Right Column: Company Presentation in RTL */}
          <div className='lg:col-span-7 flex flex-col text-right'>
            {/* Pill */}
            <div className='inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs sm:text-sm font-semibold mb-6'>
              <span className='w-2 h-2 rounded-full bg-orange-600' />
              <span>المنظومة التشغيلية لأسطول التوصيل الميداني</span>
            </div>

            {/* Main Headline */}
            <h1 className='text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.25] mb-5'>
              شركة <span className='text-orange-600'>AAMS</span> للخدمات اللوجستية
              <br />
              إدارة الأساطيل والتوصيل السريع بالمملكة
            </h1>

            {/* Realistic corporate description */}
            <p className='text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-2xl font-normal'>
              نقدم حلولاً تشغيلية وتقنية متكاملة لإدارة مناديب التوصيل والميل الأخير (Last-Mile
              Delivery) بالتعاون مع كبرى المنصات في المملكة العربية السعودية. نوفر للمندوب والمشرف
              بيئة عمل دقيقة لمتابعة الورديات، توثيق قراءات العدادات، صيانة المركبات، وضمان احتساب
              الطلبات والمستحقات بموثوقية تامة.
            </p>

            {/* CTA Buttons */}
            <div className='flex flex-wrap items-center gap-3.5 mb-10'>
              <a
                href='#download'
                className='inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm sm:text-base shadow-md shadow-orange-600/20 transition-all duration-150'
              >
                <span>تحميل تطبيق المناديب</span>
                <ArrowDown className='w-4 h-4' />
              </a>

              <Link
                href='/login'
                className='inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 font-semibold text-sm sm:text-base transition-all duration-150'
              >
                <ShieldCheck className='w-4 h-4 text-orange-600' />
                <span>دخول بوابة المشرفين</span>
              </Link>
            </div>

            {/* Operational Metrics */}
            <div className='grid grid-cols-3 gap-4 pt-6 border-t border-slate-200'>
              <div className='flex flex-col'>
                <span className='text-2xl sm:text-3xl font-black text-slate-900'>+15,000</span>
                <span className='text-xs text-slate-500 font-medium mt-0.5'>وردية عمل منجزة</span>
              </div>

              <div className='flex flex-col'>
                <span className='text-2xl sm:text-3xl font-black text-orange-600'>100%</span>
                <span className='text-xs text-slate-500 font-medium mt-0.5'>
                  توثيق واعتماد للطلبات
                </span>
              </div>

              <div className='flex flex-col'>
                <span className='text-2xl sm:text-3xl font-black text-slate-900'>24/7</span>
                <span className='text-xs text-slate-500 font-medium mt-0.5'>دعم وتشغيل ميداني</span>
              </div>
            </div>
          </div>

          {/* Left Column: QR Card & Operational Widget */}
          <div className='lg:col-span-5 flex flex-col items-center lg:items-end'>
            <div className='w-full max-w-md'>
              <QrCard appUrl={appUrl} logoUrl={logoUrl} size={200} />

              {/* Realistic Operational Preview Card */}
              <div className='mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 shadow-sm'>
                <div className='flex items-center justify-between pb-3 mb-3 border-b border-slate-200'>
                  <div className='flex items-center gap-2.5'>
                    <div className='w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center'>
                      <Bike className='w-4 h-4' />
                    </div>
                    <div className='text-right'>
                      <div className='text-xs font-bold text-slate-800'>تطبيق المندوب الميداني</div>
                      <div className='text-[11px] text-slate-500'>شفت عمل نشط على الدباب #412</div>
                    </div>
                  </div>
                  <span className='inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full'>
                    <CheckCircle2 className='w-3 h-3 text-emerald-600' />
                    مباشر
                  </span>
                </div>

                <div className='grid grid-cols-2 gap-2 text-right text-xs'>
                  <div className='bg-white rounded-lg p-2.5 border border-slate-200'>
                    <div className='flex items-center gap-1 text-[11px] text-slate-500 mb-0.5'>
                      <Gauge className='w-3 h-3 text-orange-600' />
                      <span>قراءة العداد</span>
                    </div>
                    <div className='font-mono font-bold text-slate-900'>
                      14,250 كم <span className='text-emerald-600'>✓</span>
                    </div>
                  </div>

                  <div className='bg-white rounded-lg p-2.5 border border-slate-200'>
                    <div className='flex items-center gap-1 text-[11px] text-slate-500 mb-0.5'>
                      <CalendarCheck className='w-3 h-3 text-slate-600' />
                      <span>الطلبات المنجزة</span>
                    </div>
                    <div className='font-mono font-bold text-slate-900'>28 طلب معتمد</div>
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
