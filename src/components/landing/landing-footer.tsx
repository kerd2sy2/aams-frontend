'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, MapPin, ShieldCheck, Heart } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className='bg-zinc-950 border-t border-zinc-850 pt-16 pb-12 relative'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 mb-12 text-right'>
          {/* Brand Col */}
          <div className='lg:col-span-5'>
            <Link href='/' className='inline-flex items-center gap-3.5 mb-4 group'>
              <div className='w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 p-1.5 flex items-center justify-center'>
                <Image
                  src='/logo-glow.png'
                  alt='AAMS Logistics'
                  width={34}
                  height={34}
                  className='object-contain'
                />
              </div>
              <div className='flex flex-col text-right'>
                <span className='font-black tracking-tight text-xl text-white'>
                  AAMS <span className='text-orange-500'>LOGISTICS</span>
                </span>
                <span className='text-xs text-zinc-400 -mt-1'>منظومة إدارة الأساطيل والتوصيل</span>
              </div>
            </Link>

            <p className='text-sm text-zinc-400 leading-relaxed max-w-md mb-6'>
              المنصة المتكاملة لإدارة وتشغيل مناديب التوصيل الميدانيين بالمملكة العربية السعودية.
              أتمتة دقيقة للورديات، قراءة العدادات بالذكاء الاصطناعي، ومتابعة فورية للأداء والصيانة.
            </p>

            <div className='flex flex-col gap-2 text-xs text-zinc-400'>
              <div className='inline-flex items-center gap-2'>
                <MapPin className='w-4 h-4 text-orange-400' />
                <span>المملكة العربية السعودية • الرياض</span>
              </div>
              <div className='inline-flex items-center gap-2'>
                <Mail className='w-4 h-4 text-orange-400' />
                <a href='mailto:me@kerd2sy.com' className='hover:text-orange-400 transition-colors'>
                  me@kerd2sy.com
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className='lg:col-span-3'>
            <h4 className='text-sm font-bold text-white uppercase tracking-wider mb-4'>
              روابط سريعة
            </h4>
            <ul className='space-y-2.5 text-sm text-zinc-400'>
              <li>
                <a href='#about' className='hover:text-orange-400 transition-colors'>
                  عن الشركة ورؤيتنا
                </a>
              </li>
              <li>
                <a href='#features' className='hover:text-orange-400 transition-colors'>
                  مزايا التطبيق الميداني
                </a>
              </li>
              <li>
                <a href='#partners' className='hover:text-orange-400 transition-colors'>
                  شركاء النجاح (كيتا، نينجا، تويو)
                </a>
              </li>
              <li>
                <a href='#download' className='hover:text-orange-400 transition-colors'>
                  تحميل التطبيق والباركود
                </a>
              </li>
            </ul>
          </div>

          {/* Supervisor & Legal */}
          <div className='lg:col-span-4'>
            <h4 className='text-sm font-bold text-white uppercase tracking-wider mb-4'>
              البوابات والخصوصية
            </h4>
            <ul className='space-y-2.5 text-sm text-zinc-400 mb-6'>
              <li>
                <Link
                  href='/login'
                  className='inline-flex items-center gap-1.5 text-orange-400 hover:text-orange-300 font-semibold'
                >
                  <ShieldCheck className='w-4 h-4' />
                  <span>دخول بوابة المشرفين والإدارة</span>
                </Link>
              </li>
              <li>
                <Link href='/privacy' className='hover:text-orange-400 transition-colors'>
                  سياسة الخصوصية (Privacy Policy)
                </Link>
              </li>
            </ul>

            <div className='p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 leading-relaxed'>
              تطبيق AAMS مخصص لمناديب ومشرفي الأسطول. جميع الحقوق والبيانات محمية ومشفرة وفق أعلى
              معايير الأمان السحابي.
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className='pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400'>
          <div>جميع الحقوق محفوظة © {new Date().getFullYear()} شركة AAMS اللوجستية.</div>
          <div className='inline-flex items-center gap-1 text-zinc-400'>
            <span>صُممت وطُوّرت بأعلى معايير الجودة التقنية</span>
            <Heart className='w-3.5 h-3.5 text-orange-500 fill-orange-500' />
          </div>
        </div>
      </div>
    </footer>
  );
}
