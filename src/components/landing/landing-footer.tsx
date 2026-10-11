'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, MapPin, ShieldCheck } from 'lucide-react';

interface LandingFooterProps {
  logoUrl?: string;
  siteName?: string;
}

export function LandingFooter({
  logoUrl = '/logo.png',
  siteName = 'AAMS Logistics'
}: LandingFooterProps) {
  return (
    <footer className='bg-slate-50 border-t border-slate-200 pt-16 pb-12'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 mb-12 text-right'>
          {/* Brand Col */}
          <div className='lg:col-span-5'>
            <Link href='/' className='inline-flex items-center gap-3.5 mb-4 group'>
              <div className='w-11 h-11 flex items-center justify-center shrink-0'>
                <Image
                  src={logoUrl || '/logo.png'}
                  alt={siteName}
                  width={44}
                  height={44}
                  className='object-contain w-full h-full'
                />
              </div>
              <div className='flex flex-col text-right'>
                <span className='font-black text-xl text-slate-900 tracking-tight leading-none'>
                  AAMS <span className='text-orange-600'>LOGISTICS</span>
                </span>
                <span className='text-xs text-slate-500 font-medium mt-1'>
                  شركة أسطول التوصيل للخدمات اللوجستية
                </span>
              </div>
            </Link>

            <p className='text-sm text-slate-600 leading-relaxed max-w-md mb-6'>
              منظومة متكاملة لإدارة وتشغيل أساطيل التوصيل والميل الأخير بالمملكة العربية السعودية.
              توثيق دقيق للورديات، متابعة الصيانة، ودعم ميداني مستمر.
            </p>

            <div className='flex flex-col gap-2.5 text-xs text-slate-600'>
              <div className='inline-flex items-center gap-2'>
                <MapPin className='w-4 h-4 text-orange-600 shrink-0' />
                <span>المملكة العربية السعودية • الرياض</span>
              </div>
              <div className='inline-flex items-center gap-2'>
                <Mail className='w-4 h-4 text-orange-600 shrink-0' />
                <a href='mailto:me@kerd2sy.com' className='hover:text-orange-600 transition-colors'>
                  me@kerd2sy.com
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className='lg:col-span-3'>
            <h4 className='text-sm font-bold text-slate-900 uppercase tracking-wider mb-4'>
              روابط سريعة
            </h4>
            <ul className='space-y-2.5 text-sm text-slate-600'>
              <li>
                <a href='#about' className='hover:text-orange-600 transition-colors'>
                  عن الشركة
                </a>
              </li>
              <li>
                <a href='#features' className='hover:text-orange-600 transition-colors'>
                  مزايا المنظومة
                </a>
              </li>
              <li>
                <a href='#partners' className='hover:text-orange-600 transition-colors'>
                  شركاء النجاح
                </a>
              </li>
              <li>
                <a href='#download' className='hover:text-orange-600 transition-colors'>
                  تحميل التطبيق
                </a>
              </li>
            </ul>
          </div>

          {/* Supervisor & Legal */}
          <div className='lg:col-span-4'>
            <h4 className='text-sm font-bold text-slate-900 uppercase tracking-wider mb-4'>
              البوابات والخصوصية
            </h4>
            <ul className='space-y-2.5 text-sm text-slate-600 mb-6'>
              <li>
                <Link
                  href='/login'
                  className='inline-flex items-center gap-1.5 text-orange-600 hover:text-orange-700 font-semibold'
                >
                  <ShieldCheck className='w-4 h-4' />
                  <span>دخول بوابة المشرفين والإدارة</span>
                </Link>
              </li>
              <li>
                <Link href='/privacy' className='hover:text-orange-600 transition-colors'>
                  سياسة الخصوصية (Privacy Policy)
                </Link>
              </li>
            </ul>

            <div className='p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 leading-relaxed shadow-xs'>
              تطبيق AAMS مخصص لمناديب ومشرفي الشركة. يتم حفظ وحماية بيانات الورديات والحسابات بأعلى
              معايير الخصوصية والأمان.
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className='pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500'>
          <div>جميع الحقوق محفوظة © {new Date().getFullYear()} شركة AAMS للخدمات اللوجستية.</div>
          <div>المملكة العربية السعودية</div>
        </div>
      </div>
    </footer>
  );
}
