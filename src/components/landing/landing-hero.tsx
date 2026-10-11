'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  Bike,
  Gauge,
  Wrench,
  Download,
  Clock,
  MapPin
} from 'lucide-react';

export function LandingHero() {
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
              بيئة عمل دقيقة لمتابعة الورديات، توثيق قراءات العدادات، جدولة صيانة المركبات، وضمان
              أعلى معايير الجودة التشغيلية.
            </p>

            {/* CTA Buttons */}
            <div className='flex flex-wrap items-center gap-3.5 mb-10'>
              <a
                href='#download'
                className='inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm sm:text-base shadow-md shadow-orange-600/20 transition-all duration-150'
              >
                <Download className='w-4 h-4' />
                <span>تحميل تطبيق المناديب</span>
              </a>

              <Link
                href='/login'
                className='inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 font-semibold text-sm sm:text-base transition-all duration-150'
              >
                <ShieldCheck className='w-4 h-4 text-orange-600' />
                <span>دخول بوابة المشرفين</span>
              </Link>
            </div>

            {/* Core Values (No shift count, no completed orders) */}
            <div className='grid grid-cols-3 gap-4 pt-6 border-t border-slate-200'>
              <div className='flex flex-col'>
                <span className='text-base sm:text-lg font-bold text-slate-900'>تغطية واسعة</span>
                <span className='text-xs text-slate-500 font-medium mt-0.5'>
                  كافة مناطق ومدن التوصيل
                </span>
              </div>

              <div className='flex flex-col'>
                <span className='text-base sm:text-lg font-bold text-orange-600'>
                  صيانة استباقية
                </span>
                <span className='text-xs text-slate-500 font-medium mt-0.5'>
                  حماية ومتابعة محركات الأسطول
                </span>
              </div>

              <div className='flex flex-col'>
                <span className='text-base sm:text-lg font-bold text-slate-900'>24/7</span>
                <span className='text-xs text-slate-500 font-medium mt-0.5'>
                  دعم وتشغيل ميداني متواصل
                </span>
              </div>
            </div>
          </div>

          {/* Left Column: Clean Operational App Card (No QR Code here, no completed orders count) */}
          <div className='lg:col-span-5 flex flex-col items-center lg:items-end'>
            <div className='w-full max-w-md rounded-2xl bg-slate-50 border border-slate-200 p-6 shadow-sm'>
              {/* Header */}
              <div className='flex items-center justify-between pb-4 mb-4 border-b border-slate-200'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0'>
                    <Bike className='w-5 h-5' />
                  </div>
                  <div className='text-right'>
                    <div className='text-sm font-bold text-slate-900'>تطبيق المندوب الميداني</div>
                    <div className='text-xs text-slate-500'>بوابة تسجيل ومتابعة الوردية</div>
                  </div>
                </div>
                <span className='inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full'>
                  <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                  شفت نشط
                </span>
              </div>

              {/* Vehicle & Shift Details */}
              <div className='space-y-3 text-right'>
                <div className='bg-white rounded-xl p-3.5 border border-slate-200'>
                  <div className='flex items-center justify-between text-xs text-slate-500 mb-1'>
                    <span className='flex items-center gap-1.5'>
                      <Clock className='w-3.5 h-3.5 text-orange-600' />
                      حالة الدوام
                    </span>
                    <span className='font-semibold text-slate-700'>بدء الوردية الصباحية</span>
                  </div>
                  <div className='text-sm font-bold text-slate-900'>الدباب المربوط: #412</div>
                </div>

                <div className='bg-white rounded-xl p-3.5 border border-slate-200'>
                  <div className='flex items-center justify-between text-xs text-slate-500 mb-1'>
                    <span className='flex items-center gap-1.5'>
                      <Gauge className='w-3.5 h-3.5 text-orange-600' />
                      قراءة عداد الكيلومتر
                    </span>
                    <span className='text-emerald-600 font-bold'>موثق ومعتمد ✓</span>
                  </div>
                  <div className='text-sm font-mono font-bold text-slate-900'>14,250 كم</div>
                </div>

                <div className='bg-white rounded-xl p-3.5 border border-slate-200'>
                  <div className='flex items-center justify-between text-xs text-slate-500 mb-1'>
                    <span className='flex items-center gap-1.5'>
                      <Wrench className='w-3.5 h-3.5 text-orange-600' />
                      حالة الصيانة وتغيير الزيت
                    </span>
                    <span className='text-orange-600 font-semibold'>مجدولة</span>
                  </div>
                  <div className='text-xs text-slate-700 font-medium'>
                    موعد تغيير الزيت القادم: بعد 750 كم
                  </div>
                </div>

                <div className='bg-white rounded-xl p-3.5 border border-slate-200'>
                  <div className='flex items-center justify-between text-xs text-slate-500'>
                    <span className='flex items-center gap-1.5'>
                      <MapPin className='w-3.5 h-3.5 text-orange-600' />
                      نطاق التغطية والفرع
                    </span>
                    <span className='font-semibold text-slate-800'>فرع الرياض الرئيسي</span>
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
