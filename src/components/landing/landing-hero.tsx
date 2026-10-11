'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { ShieldCheck, Download, Globe2, Building2 } from 'lucide-react';

interface LandingHeroProps {
  heroImage?: string;
}

export function LandingHero({ heroImage = '/hero-car.png' }: LandingHeroProps) {
  return (
    <section className='relative pt-8 pb-16 md:pt-12 md:pb-24 bg-white overflow-hidden border-b border-slate-100'>
      {/* Crisp technical architectural grid background */}
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

            {/* Corporate description */}
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

          {/* Left Column: Delivery Fleet Car Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className='lg:col-span-5 flex justify-center lg:justify-end'
          >
            <div className='w-full max-w-lg rounded-3xl overflow-hidden border border-slate-200/90 bg-white p-3 shadow-xl shadow-slate-200/70'>
              <div className='relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100'>
                <Image
                  src={heroImage}
                  alt='أسطول AAMS للخدمات اللوجستية'
                  fill
                  sizes='(max-width: 768px) 100vw, 520px'
                  className='object-cover object-center transition-transform duration-500 hover:scale-102'
                  priority
                />
              </div>

              {/* Status bar under car photo */}
              <div className='mt-3 flex items-center justify-between px-2 text-xs'>
                <div className='flex items-center gap-2'>
                  <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
                  <span className='font-bold text-slate-800'>أسطول مركبات معتمد وموثق</span>
                </div>
                <span className='font-semibold text-orange-600'>AAMS Fleet</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
