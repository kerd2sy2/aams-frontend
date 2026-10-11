'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, MapPin, ShieldCheck, Download, ExternalLink, Globe } from 'lucide-react';

interface LandingFooterProps {
  logoUrl?: string;
  siteName?: string;
}

export function LandingFooter({
  logoUrl = '/logo.png',
  siteName = 'AAMS Logistics'
}: LandingFooterProps) {
  return (
    <footer className='bg-slate-950 text-slate-400 border-t border-slate-800 pt-16 pb-12 overflow-hidden'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Main Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 mb-14 text-right'>
          {/* Brand Info & Mission (5 cols) */}
          <div className='lg:col-span-5 flex flex-col justify-between'>
            <div>
              {/* Brand Header */}
              <Link href='/' className='inline-flex items-center gap-3.5 mb-5 group select-none'>
                <div className='relative w-12 h-12 flex items-center justify-center shrink-0'>
                  <Image
                    src={logoUrl || '/logo.png'}
                    alt={siteName}
                    width={48}
                    height={48}
                    className='object-contain w-full h-full'
                  />
                </div>
                <div className='flex flex-col text-right'>
                  <span className='font-black text-2xl text-white tracking-tight leading-none group-hover:text-orange-400 transition-colors'>
                    AAMS <span className='text-orange-500'>Logistics</span>
                  </span>
                  <span className='text-xs text-slate-400 font-semibold mt-1 tracking-wide'>
                    شركة أسطول التوصيل للخدمات اللوجستية
                  </span>
                </div>
              </Link>

              <p className='text-sm text-slate-300 leading-relaxed max-w-md mb-6 font-normal'>
                الشريك التشغيلي والتقني الرائد لإدارة وتشغيل أساطيل التوصيل السريع وخدمات الميل الأخير
                بالمملكة العربية السعودية، وفق أعلى معايير الجودة والانضباط التشغيلي.
              </p>
            </div>

            {/* Quick Contact & Location Badges */}
            <div className='space-y-2.5 pt-4 border-t border-slate-850 text-xs text-slate-300'>
              <div className='inline-flex items-center gap-2.5'>
                <MapPin className='w-4 h-4 text-orange-500 shrink-0' />
                <span>المملكة العربية السعودية • الرياض</span>
              </div>
              <div className='flex items-center gap-2.5'>
                <Mail className='w-4 h-4 text-orange-500 shrink-0' />
                <a
                  href='mailto:me@kerd2sy.com'
                  className='hover:text-orange-400 transition-colors font-mono'
                >
                  me@kerd2sy.com
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links (2 cols) */}
          <div className='lg:col-span-2'>
            <h4 className='text-xs font-bold text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-800'>
              روابط المنظومة
            </h4>
            <ul className='space-y-3 text-sm'>
              <li>
                <a href='#about' className='hover:text-orange-400 transition-colors'>
                  عن الشركة
                </a>
              </li>
              <li>
                <a href='#features' className='hover:text-orange-400 transition-colors'>
                  مزايا المنظومة
                </a>
              </li>
              <li>
                <a href='#partners' className='hover:text-orange-400 transition-colors'>
                  شركاء النجاح
                </a>
              </li>
              <li>
                <a href='#download' className='hover:text-orange-400 transition-colors'>
                  تحميل التطبيق
                </a>
              </li>
            </ul>
          </div>

          {/* Partners (2 cols) */}
          <div className='lg:col-span-2'>
            <h4 className='text-xs font-bold text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-800'>
              شركاء التشغيل
            </h4>
            <ul className='space-y-3 text-sm'>
              <li className='flex items-center gap-2'>
                <span className='w-1.5 h-1.5 rounded-full bg-orange-500' />
                <span>منصة كيتا (Keeta)</span>
              </li>
              <li className='flex items-center gap-2'>
                <span className='w-1.5 h-1.5 rounded-full bg-orange-500' />
                <span>منصة نينجا (Ninja)</span>
              </li>
              <li className='flex items-center gap-2'>
                <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' />
                <span>تغطية مدن المملكة</span>
              </li>
            </ul>
          </div>

          {/* Portals & Trust (3 cols) */}
          <div className='lg:col-span-3'>
            <h4 className='text-xs font-bold text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-800'>
              البوابات والاعتماد
            </h4>
            <div className='space-y-3 text-sm mb-6'>
              <Link
                href='/login'
                className='inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 font-bold transition-colors'
              >
                <ShieldCheck className='w-4 h-4' />
                <span>دخول بوابة المشرفين والإدارة</span>
              </Link>
              <div>
                <Link
                  href='/privacy'
                  className='block hover:text-orange-400 text-xs transition-colors'
                >
                  سياسة الخصوصية وحماية البيانات
                </Link>
              </div>
            </div>

            {/* Verification Badge */}
            <div className='p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed'>
              <div className='flex items-center gap-2 font-bold text-white mb-1'>
                <span className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse' />
                <span>بنية تشغيلية موثوقة ومحمية</span>
              </div>
              منظومة سحابية متقدمة تضمن حفظ بيانات التشغيل الميداني وفق أعلى معايير الخصوصية.
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className='pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-right'>
          <div>جميع الحقوق محفوظة © {new Date().getFullYear()} شركة AAMS للخدمات اللوجستية.</div>
          <div className='flex items-center gap-2 font-medium text-slate-400'>
            <Globe className='w-3.5 h-3.5 text-orange-500' />
            <span>المملكة العربية السعودية • مشغل لوجستي معتمد</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
