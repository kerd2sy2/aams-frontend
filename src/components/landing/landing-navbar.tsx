'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, QrCode, Menu, X, Download } from 'lucide-react';

interface LandingNavbarProps {
  logoUrl?: string;
  siteName?: string;
}

export function LandingNavbar({
  logoUrl = '/logo.png',
  siteName = 'AAMS Logistics'
}: LandingNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className='sticky top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between h-20'>
          {/* Brand Lockup: Exactly matching the mobile driver app header */}
          <Link href='/' className='flex items-center gap-3.5 group cursor-pointer select-none'>
            <div className='relative w-12 h-12 flex items-center justify-center shrink-0'>
              <Image
                src={logoUrl || '/logo.png'}
                alt={siteName}
                width={48}
                height={48}
                className='object-contain w-full h-full'
                priority
              />
            </div>
            <div className='flex flex-col text-right'>
              <span className='font-black text-2xl text-slate-900 tracking-wider leading-none'>
                AAMS
              </span>
              <span className='text-[10px] sm:text-[11px] font-bold text-orange-600 tracking-[3px] uppercase mt-1'>
                LOGISTICS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className='hidden md:flex items-center gap-7'>
            <a
              href='#about'
              className='text-sm font-semibold text-slate-700 hover:text-orange-600 transition-colors'
            >
              عن الشركة
            </a>
            <a
              href='#features'
              className='text-sm font-semibold text-slate-700 hover:text-orange-600 transition-colors'
            >
              مزايا المنظومة
            </a>
            <a
              href='#partners'
              className='text-sm font-semibold text-slate-700 hover:text-orange-600 transition-colors'
            >
              شركاء النجاح
            </a>
            <a
              href='#download'
              className='text-sm font-semibold text-slate-700 hover:text-orange-600 transition-colors'
            >
              تحميل التطبيق
            </a>
          </nav>

          {/* Action CTAs */}
          <div className='hidden sm:flex items-center gap-3'>
            <Link
              href='/login'
              className='inline-flex items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all duration-150'
            >
              <ShieldCheck className='w-4 h-4 text-orange-600' />
              <span>بوابة المشرفين</span>
            </Link>

            {/* Mobile App Style QR Code Trigger button */}
            <a
              href='#download'
              className='inline-flex items-center gap-2 py-2.5 px-4.5 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-sm transition-all duration-150'
            >
              <QrCode className='w-4 h-4' />
              <span>تحميل التطبيق</span>
            </a>
          </div>

          {/* Mobile menu toggle */}
          <button
            type='button'
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className='md:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200'
            aria-label='القائمة'
          >
            {mobileMenuOpen ? <X className='w-5 h-5' /> : <Menu className='w-5 h-5' />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className='md:hidden bg-white border-b border-slate-200 px-6 py-5 shadow-lg'>
          <nav className='flex flex-col gap-3 text-right mb-5'>
            <a
              href='#about'
              onClick={() => setMobileMenuOpen(false)}
              className='text-base font-semibold text-slate-800 hover:text-orange-600 py-1.5'
            >
              عن الشركة
            </a>
            <a
              href='#features'
              onClick={() => setMobileMenuOpen(false)}
              className='text-base font-semibold text-slate-800 hover:text-orange-600 py-1.5'
            >
              مزايا المنظومة
            </a>
            <a
              href='#partners'
              onClick={() => setMobileMenuOpen(false)}
              className='text-base font-semibold text-slate-800 hover:text-orange-600 py-1.5'
            >
              شركاء النجاح
            </a>
            <a
              href='#download'
              onClick={() => setMobileMenuOpen(false)}
              className='text-base font-semibold text-slate-800 hover:text-orange-600 py-1.5'
            >
              تحميل التطبيق
            </a>
          </nav>
          <div className='flex flex-col gap-2.5 pt-4 border-t border-slate-100'>
            <Link
              href='/login'
              onClick={() => setMobileMenuOpen(false)}
              className='flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-slate-800 bg-slate-100 border border-slate-200'
            >
              <ShieldCheck className='w-4 h-4 text-orange-600' />
              <span>دخول بوابة المشرفين</span>
            </Link>
            <a
              href='#download'
              onClick={() => setMobileMenuOpen(false)}
              className='flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-700'
            >
              <Download className='w-4 h-4' />
              <span>تحميل تطبيق المناديب</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
