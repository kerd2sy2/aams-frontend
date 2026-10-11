'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Download, Menu, X, ArrowLeft } from 'lucide-react';

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/80 shadow-lg shadow-black/40 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between'>
          {/* Logo Brand Lockup */}
          <Link href='/' className='flex items-center gap-3.5 group cursor-pointer'>
            <div className='relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-orange-500/20 to-zinc-900 border border-orange-500/40 p-1.5 flex items-center justify-center transition-transform duration-300 group-hover:scale-105'>
              <Image
                src='/logo-glow.png'
                alt='AAMS Logistics'
                width={36}
                height={36}
                className='object-contain'
                priority
              />
              <span className='absolute inset-0 rounded-2xl bg-orange-500/20 blur-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity' />
            </div>
            <div className='flex flex-col text-right'>
              <span className='font-black tracking-tight text-lg sm:text-xl text-white group-hover:text-orange-400 transition-colors'>
                AAMS <span className='text-orange-500'>LOGISTICS</span>
              </span>
              <span className='text-[10px] sm:text-[11px] font-medium text-zinc-400 -mt-1'>
                المنظومة الذكية لإدارة الأساطيل
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className='hidden md:flex items-center gap-8'>
            <a
              href='#about'
              className='text-sm font-medium text-zinc-300 hover:text-orange-400 transition-colors'
            >
              عن الشركة
            </a>
            <a
              href='#features'
              className='text-sm font-medium text-zinc-300 hover:text-orange-400 transition-colors'
            >
              مزايا المنظومة
            </a>
            <a
              href='#partners'
              className='text-sm font-medium text-zinc-300 hover:text-orange-400 transition-colors'
            >
              شركاء النجاح
            </a>
            <a
              href='#download'
              className='text-sm font-medium text-zinc-300 hover:text-orange-400 transition-colors'
            >
              تحميل التطبيق
            </a>
          </nav>

          {/* Action CTAs */}
          <div className='hidden sm:flex items-center gap-3'>
            <Link
              href='/login'
              className='inline-flex items-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold text-zinc-200 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-orange-500/40 transition-all duration-200'
            >
              <ShieldCheck className='w-4 h-4 text-orange-400' />
              <span>بوابة المشرفين</span>
            </Link>
            <a
              href='#download'
              className='inline-flex items-center gap-2 py-2 px-4.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-500 shadow-md shadow-orange-500/20 transition-all duration-200 hover:-translate-y-0.5'
            >
              <Download className='w-4 h-4' />
              <span>تحميل التطبيق</span>
            </a>
          </div>

          {/* Mobile menu toggle */}
          <button
            type='button'
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className='md:hidden p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white'
            aria-label='القائمة'
          >
            {mobileMenuOpen ? <X className='w-5 h-5' /> : <Menu className='w-5 h-5' />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className='md:hidden bg-zinc-950/95 backdrop-blur-2xl border-b border-zinc-800 px-6 py-6 animate-in slide-in-from-top-3'>
          <nav className='flex flex-col gap-4 text-right mb-6'>
            <a
              href='#about'
              onClick={() => setMobileMenuOpen(false)}
              className='text-base font-medium text-zinc-200 hover:text-orange-400 py-1'
            >
              عن الشركة
            </a>
            <a
              href='#features'
              onClick={() => setMobileMenuOpen(false)}
              className='text-base font-medium text-zinc-200 hover:text-orange-400 py-1'
            >
              مزايا المنظومة
            </a>
            <a
              href='#partners'
              onClick={() => setMobileMenuOpen(false)}
              className='text-base font-medium text-zinc-200 hover:text-orange-400 py-1'
            >
              شركاء النجاح
            </a>
            <a
              href='#download'
              onClick={() => setMobileMenuOpen(false)}
              className='text-base font-medium text-zinc-200 hover:text-orange-400 py-1'
            >
              تحميل التطبيق
            </a>
          </nav>
          <div className='flex flex-col gap-3 pt-4 border-t border-zinc-800'>
            <Link
              href='/login'
              onClick={() => setMobileMenuOpen(false)}
              className='flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-zinc-200 bg-zinc-900 border border-zinc-700'
            >
              <ShieldCheck className='w-4 h-4 text-orange-400' />
              <span>دخول بوابة المشرفين</span>
            </Link>
            <a
              href='#download'
              onClick={() => setMobileMenuOpen(false)}
              className='flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600'
            >
              <Download className='w-4 h-4' />
              <span>تحميل تطبيق المناديب</span>
              <ArrowLeft className='w-4 h-4' />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
