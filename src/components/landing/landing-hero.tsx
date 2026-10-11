'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  CheckCircle2,
  Download,
  Activity,
  Layers,
  MapPin,
  ArrowDown,
  Sparkles,
  Smartphone
} from 'lucide-react';

export function LandingHero() {
  return (
    <section className='relative pt-12 pb-20 md:pt-16 md:pb-28 bg-white overflow-hidden border-b border-slate-100'>
      {/* Subtle animated ambient light gradient behind hero */}
      <div className='absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] pointer-events-none overflow-hidden'>
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.35, 0.5, 0.35]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className='absolute -top-24 right-1/4 w-[450px] h-[450px] bg-orange-100/70 rounded-full blur-[100px]'
        />
        <motion.div
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.25, 0.4, 0.25]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className='absolute top-20 left-1/4 w-[380px] h-[380px] bg-sky-100/60 rounded-full blur-[90px]'
        />
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center'>
          {/* Right Column: Hero Content in RTL */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className='lg:col-span-7 flex flex-col text-right'
          >
            {/* Pill */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className='inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-xs sm:text-sm font-semibold mb-6 shadow-2xs'
            >
              <span className='relative flex h-2 w-2'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75' />
                <span className='relative inline-flex rounded-full h-2 w-2 bg-orange-600' />
              </span>
              <span>المنظومة المتكاملة لإدارة وتشغيل أساطيل التوصيل</span>
            </motion.div>

            {/* Main Headline */}
            <h1 className='text-3xl sm:text-5xl lg:text-[3.25rem] font-black text-slate-900 tracking-tight leading-[1.2] mb-6'>
              شركة <span className='text-orange-600'>AAMS</span> للخدمات اللوجستية
              <br />
              <span className='text-slate-800 font-extrabold'>
                إدارة الأساطيل والميل الأخير بالمملكة
              </span>
            </h1>

            {/* Corporate description without any bike/shift placeholder numbers */}
            <p className='text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-2xl font-normal'>
              الشريك التشغيلي والتقني الرائد لإدارة وتشغيل أساطيل التوصيل السريع والميل الأخير
              بالمملكة العربية السعودية. نوفر منصة سحابية شاملة وتطبيقاً ميدانياً ذكياً يربط المناديب
              مع كبرى المنصات، لضمان أعلى درجات الانضباط والإنتاجية والموثوقية.
            </p>

            {/* CTAs with micro-animations */}
            <div className='flex flex-wrap items-center gap-3.5 mb-10'>
              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href='#download'
                className='inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm sm:text-base shadow-md shadow-orange-600/25 transition-colors'
              >
                <Download className='w-4 h-4' />
                <span>تحميل تطبيق المناديب</span>
                <ArrowDown className='w-4 h-4 mr-1' />
              </motion.a>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href='/login'
                  className='inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 font-semibold text-sm sm:text-base transition-colors shadow-2xs'
                >
                  <ShieldCheck className='w-4 h-4 text-orange-600' />
                  <span>دخول بوابة المشرفين</span>
                </Link>
              </motion.div>
            </div>

            {/* Capabilities Row */}
            <div className='grid grid-cols-3 gap-4 pt-6 border-t border-slate-200'>
              <div className='flex flex-col'>
                <span className='text-base sm:text-lg font-bold text-slate-900'>تغطية واسعة</span>
                <span className='text-xs text-slate-500 font-medium mt-0.5'>
                  كافة مناطق ومدن المملكة
                </span>
              </div>

              <div className='flex flex-col'>
                <span className='text-base sm:text-lg font-bold text-orange-600'>تشغيل معتمد</span>
                <span className='text-xs text-slate-500 font-medium mt-0.5'>
                  تكامل مع كبرى المنصات
                </span>
              </div>

              <div className='flex flex-col'>
                <span className='text-base sm:text-lg font-bold text-slate-900'>24/7</span>
                <span className='text-xs text-slate-500 font-medium mt-0.5'>
                  دعم ومتابعة ميدانية
                </span>
              </div>
            </div>
          </motion.div>

          {/* Left Column: Visual Animated Smartphone Mockup Showcase with Floating Badges */}
          <div className='lg:col-span-5 flex justify-center lg:justify-end relative'>
            <div className='relative w-full max-w-[340px] sm:max-w-[380px]'>
              {/* Smartphone Frame Container with soft shadow */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className='relative rounded-[36px] bg-slate-900 p-3 shadow-2xl shadow-slate-400/50 border-4 border-slate-800'
              >
                {/* Screen content */}
                <div className='relative rounded-[28px] bg-white overflow-hidden p-5 flex flex-col justify-between min-h-[460px] border border-slate-150'>
                  {/* Top Notch & Status */}
                  <div className='flex items-center justify-between pb-3 border-b border-slate-100'>
                    <div className='flex items-center gap-2'>
                      <div className='w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center'>
                        <Image
                          src='/logo.png'
                          alt='AAMS'
                          width={24}
                          height={24}
                          className='object-contain'
                        />
                      </div>
                      <div className='text-right'>
                        <div className='text-xs font-black text-slate-900 leading-none'>AAMS</div>
                        <div className='text-[9px] font-bold text-orange-600 tracking-wider'>
                          LOGISTICS
                        </div>
                      </div>
                    </div>
                    <span className='inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200'>
                      <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' />
                      متصل بالنظام
                    </span>
                  </div>

                  {/* App Visual Tiles */}
                  <div className='my-auto space-y-3 py-4 text-right'>
                    <div className='p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs'>
                      <div className='flex items-center justify-between mb-1.5'>
                        <span className='text-[11px] font-bold text-slate-800'>
                          بوابة المندوب الميداني
                        </span>
                        <Smartphone className='w-3.5 h-3.5 text-orange-600' />
                      </div>
                      <p className='text-[11px] text-slate-500 leading-relaxed'>
                        واجهة سريعة وخفيفة تُمكّن المندوب من متابعة مهامه والوصول لبياناته بكل سهولة.
                      </p>
                    </div>

                    <div className='p-3.5 rounded-xl bg-orange-50/60 border border-orange-200/60'>
                      <div className='flex items-center justify-between mb-1.5'>
                        <span className='text-[11px] font-bold text-orange-950'>
                          الربط والتشغيل الفوري
                        </span>
                        <Activity className='w-3.5 h-3.5 text-orange-600' />
                      </div>
                      <p className='text-[11px] text-orange-800 leading-relaxed'>
                        مزامنة سحابية مباشرة مع منصة الإشراف لمتابعة جودة التشغيل الميداني.
                      </p>
                    </div>

                    <div className='p-3.5 rounded-xl bg-slate-50 border border-slate-200/80'>
                      <div className='flex items-center justify-between mb-1.5'>
                        <span className='text-[11px] font-bold text-slate-800'>
                          الأمان والدخول بالبصمة
                        </span>
                        <ShieldCheck className='w-3.5 h-3.5 text-slate-700' />
                      </div>
                      <p className='text-[11px] text-slate-500 leading-relaxed'>
                        دخول فوري ومحمي بدون انتظار رسائل SMS لتسهيل مهام الميدان اليومية.
                      </p>
                    </div>
                  </div>

                  {/* Bottom Footer inside phone */}
                  <div className='pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500'>
                    <span className='font-mono'>الإصدار 1.0.1</span>
                    <span className='text-orange-600 font-semibold'>Google Play</span>
                  </div>
                </div>
              </motion.div>

              {/* Floating Badge 1 (Top-Left): Live Sync */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className='absolute -top-4 -left-6 sm:-left-8 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 p-3 shadow-lg flex items-center gap-2.5 z-20'
              >
                <div className='w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0'>
                  <CheckCircle2 className='w-4 h-4' />
                </div>
                <div className='text-right'>
                  <div className='text-xs font-bold text-slate-900'>مزامنة مباشرة</div>
                  <div className='text-[10px] text-slate-500'>سحابية وآمنة 100%</div>
                </div>
              </motion.div>

              {/* Floating Badge 2 (Bottom-Right): Fleet Platform */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className='absolute -bottom-4 -right-4 sm:-right-6 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 p-3 shadow-lg flex items-center gap-2.5 z-20'
              >
                <div className='w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0'>
                  <Layers className='w-4 h-4' />
                </div>
                <div className='text-right'>
                  <div className='text-xs font-bold text-slate-900'>إدارة الأساطيل</div>
                  <div className='text-[10px] text-slate-500'>تحكم وتشغيل موثوق</div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
