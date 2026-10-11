'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  CheckCircle2,
  Download,
  Fingerprint,
  Layers,
  ArrowLeft,
  Smartphone,
  Globe2,
  Building2,
  Lock
} from 'lucide-react';

export function LandingHero() {
  const [activeTab, setActiveTab] = useState<'app' | 'security' | 'partners'>('app');

  const tabContent = {
    app: {
      badge: 'التطبيق الميداني',
      title: 'تجربة سلسة وسريعة للمندوب في الميدان',
      desc: 'واجهة خفيفة وموثوقة تمنح المندوب وصولاً فورياً لكافة خدماته وإشعاراته التشغيلية بنقرة واحدة.',
      features: [
        'واجهة مبسطة مصممة للميدان',
        'تحديث فوري للحالة التشغيلية',
        'دعم كامل للغة العربية'
      ]
    },
    security: {
      badge: 'الأمان والبيومترية',
      title: 'تسجيل دخول بالبصمة وتشفير كامل',
      desc: 'حماية بيانات المندوب ودخول فوري بدون انتظار رسائل SMS لتسهيل مهام الميدان اليومية.',
      features: ['دعم البصمة الحيوية Biometrics', 'جلسات عمل مشفرة وآمنة', 'ربط الجهاز المعتمد']
    },
    partners: {
      badge: 'التكامل والشراكات',
      title: 'ربط مباشر مع كبرى المنصات بالمملكة',
      desc: 'اعتماد تشغيلي متكامل مع منصتي كيتا (Keeta) ونينجا (Ninja) لضمان انسيابية العمليات.',
      features: [
        'تكامل لحظي مع أنظمة التوصيل',
        'تنسيق معتمد لإدارة الطلبات',
        'تغطية واسعة لكافة المناطق'
      ]
    }
  };

  return (
    <section className='relative pt-8 pb-16 md:pt-12 md:pb-24 bg-white overflow-hidden border-b border-slate-100'>
      {/* Crisp technical grid background (modern enterprise pattern) */}
      <div className='absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none' />

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center'>
          {/* Right Column: Hero Content */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className='lg:col-span-7 flex flex-col text-right'
          >
            {/* Pill Announcement */}
            <div className='inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-xs sm:text-sm font-semibold mb-6 shadow-2xs'>
              <span className='relative flex h-2 w-2'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75' />
                <span className='relative inline-flex rounded-full h-2 w-2 bg-orange-600' />
              </span>
              <span>المنظومة الرقمية لإدارة وتشغيل أساطيل التوصيل السريع بالمملكة</span>
            </div>

            {/* Main Headline */}
            <h1 className='text-3xl sm:text-5xl lg:text-[3.25rem] font-black text-slate-900 tracking-tight leading-[1.2] mb-6'>
              شركة <span className='text-orange-600'>AAMS</span> للخدمات اللوجستية
              <br />
              <span className='text-slate-800 font-extrabold'>
                حلول الميل الأخير والتشغيل الميداني
              </span>
            </h1>

            {/* Corporate description without any bike/shift numbers */}
            <p className='text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-2xl font-normal'>
              الشريك اللوجستي والتقني الرائد لتشغيل وإدارة أساطيل التوصيل بالمملكة العربية السعودية.
              نوفر تطبيقاً ميدانياً ذكياً للمناديب ومنصة متكاملة للمشرفين تضمن أعلى مستويات الانضباط،
              الموثوقية، والتكامل مع كبرى منصات التوصيل.
            </p>

            {/* Action Buttons */}
            <div className='flex flex-wrap items-center gap-3.5 mb-10'>
              <a
                href='#download'
                className='inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-bold text-sm sm:text-base shadow-md shadow-orange-600/20 transition-all'
              >
                <Download className='w-4 h-4' />
                <span>تحميل تطبيق المندوب</span>
                <span className='text-xs opacity-80'>(Google Play)</span>
              </a>

              <Link
                href='/login'
                className='inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 border border-slate-200 font-semibold text-sm sm:text-base transition-all shadow-2xs'
              >
                <ShieldCheck className='w-4 h-4 text-orange-600' />
                <span>دخول بوابة المشرفين</span>
              </Link>
            </div>

            {/* Capabilities Row */}
            <div className='grid grid-cols-3 gap-4 pt-6 border-t border-slate-200'>
              <div className='flex flex-col'>
                <div className='flex items-center gap-1.5 text-slate-900 font-bold text-sm sm:text-base'>
                  <Globe2 className='w-4 h-4 text-orange-600' />
                  <span>تغطية واسعة</span>
                </div>
                <span className='text-xs text-slate-500 font-medium mt-1'>
                  مختلف مدن ومناطق المملكة
                </span>
              </div>

              <div className='flex flex-col'>
                <div className='flex items-center gap-1.5 text-slate-900 font-bold text-sm sm:text-base'>
                  <Building2 className='w-4 h-4 text-orange-600' />
                  <span>شراكات كبرى</span>
                </div>
                <span className='text-xs text-slate-500 font-medium mt-1'>
                  معتمد لدى كيتا ونينجا
                </span>
              </div>

              <div className='flex flex-col'>
                <div className='flex items-center gap-1.5 text-slate-900 font-bold text-sm sm:text-base'>
                  <ShieldCheck className='w-4 h-4 text-orange-600' />
                  <span>أمان وموثوقية</span>
                </div>
                <span className='text-xs text-slate-500 font-medium mt-1'>
                  بنية سحابية وحماية حيوية
                </span>
              </div>
            </div>
          </motion.div>

          {/* Left Column: Interactive Operations Card Showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className='lg:col-span-5 flex justify-center lg:justify-end'
          >
            <div className='w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden text-right'>
              {/* Card Header matching Mobile Driver Header */}
              <div className='bg-slate-900 px-5 py-4 flex items-center justify-between text-white'>
                <div className='flex items-center gap-3'>
                  <div className='w-9 h-9 rounded-full border border-orange-500 bg-orange-50/10 p-1 flex items-center justify-center shrink-0'>
                    <Image
                      src='/logo.png'
                      alt='AAMS'
                      width={28}
                      height={28}
                      className='object-contain'
                    />
                  </div>
                  <div>
                    <div className='text-xs font-black tracking-wide'>AAMS LOGISTICS</div>
                    <div className='text-[10px] text-slate-400'>بوابة المندوب الميداني</div>
                  </div>
                </div>

                <div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold'>
                  <span className='w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse' />
                  <span>متصل بالنظام</span>
                </div>
              </div>

              {/* Interactive Tabs */}
              <div className='flex items-center border-b border-slate-200 bg-slate-50/80 p-1 gap-1'>
                <button
                  type='button'
                  onClick={() => setActiveTab('app')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'app'
                      ? 'bg-white text-orange-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className='w-3.5 h-3.5' />
                  <span>التطبيق</span>
                </button>

                <button
                  type='button'
                  onClick={() => setActiveTab('security')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'security'
                      ? 'bg-white text-orange-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Fingerprint className='w-3.5 h-3.5' />
                  <span>الأمان</span>
                </button>

                <button
                  type='button'
                  onClick={() => setActiveTab('partners')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'partners'
                      ? 'bg-white text-orange-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className='w-3.5 h-3.5' />
                  <span>الشركاء</span>
                </button>
              </div>

              {/* Tab Details */}
              <div className='p-6 min-h-[260px] flex flex-col justify-between'>
                <AnimatePresence mode='wait'>
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <span className='inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200 mb-2'>
                      {tabContent[activeTab].badge}
                    </span>
                    <h3 className='text-base font-bold text-slate-900 mb-2'>
                      {tabContent[activeTab].title}
                    </h3>
                    <p className='text-xs text-slate-600 leading-relaxed mb-4'>
                      {tabContent[activeTab].desc}
                    </p>

                    <div className='space-y-2'>
                      {tabContent[activeTab].features.map((feat, idx) => (
                        <div
                          key={idx}
                          className='flex items-center gap-2 text-xs text-slate-700 font-medium'
                        >
                          <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0' />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Card Footer with Quick Store Link */}
                <div className='pt-5 mt-4 border-t border-slate-100 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <div className='w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0'>
                      <Lock className='w-3.5 h-3.5' />
                    </div>
                    <span className='text-[11px] font-semibold text-slate-500'>
                      نسخة الإنتاج الرسمية v1.0.1
                    </span>
                  </div>

                  <a
                    href='#download'
                    className='inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700'
                  >
                    <span>تحميل الآن</span>
                    <ArrowLeft className='w-3 h-3' />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
