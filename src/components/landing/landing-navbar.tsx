'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, QrCode, Menu, X } from 'lucide-react';

interface LandingNavbarProps {
  logoUrl?: string;
  siteName?: string;
}

export function LandingNavbar({
  logoUrl = '/logo.png',
  siteName = 'AAMS Logistics'
}: LandingNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const scrollDelta = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const diff = currentY - lastScrollY.current;
      lastScrollY.current = currentY;

      // Update background shadow state
      setIsScrolled(currentY > 15);

      // At the top of the page: always show
      if (currentY <= 20) {
        scrollDelta.current = 0;
        setVisible(true);
        return;
      }

      // Scrolling DOWN
      if (diff > 0) {
        if (scrollDelta.current < 0) scrollDelta.current = 0;
        scrollDelta.current += diff;
        // Hide after 8px of accumulated downward scroll
        if (scrollDelta.current >= 8 && currentY > 72) {
          setVisible(false);
        }
      }
      // Scrolling UP
      else if (diff < 0) {
        if (scrollDelta.current > 0) scrollDelta.current = 0;
        scrollDelta.current += diff;
        // Show immediately after 6px of accumulated upward scroll
        if (scrollDelta.current <= -6) {
          setVisible(true);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Spacer to prevent content jump when navbar is fixed */}
      <div className='h-[72px] w-full' />

      <header
        className={`fixed top-0 left-0 right-0 z-50 h-[72px] bg-white/95 backdrop-blur-md border-b transition-all duration-300 ease-in-out ${
          isScrolled ? 'border-slate-200 shadow-sm' : 'border-slate-100'
        } ${visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
      >
        <div className='max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-full'>
            {/* Right Side (RTL): Clean Logo and Brand Lockup */}
            <Link
              href='/'
              className='flex items-center gap-3 group cursor-pointer select-none transition-transform active:scale-95'
            >
              {/* Clean logo directly on navbar without background or border */}
              <div className='relative w-11 h-11 flex items-center justify-center shrink-0'>
                <Image
                  src={logoUrl || '/logo.png'}
                  alt={siteName}
                  width={44}
                  height={44}
                  className='object-contain w-full h-full'
                  priority
                />
              </div>

              {/* Clean brand text */}
              <div className='flex flex-col text-right justify-center'>
                <span className='font-extrabold text-[16px] text-slate-900 tracking-tight leading-tight group-hover:text-orange-600 transition-colors'>
                  AAMS Logistics
                </span>
                <span className='text-xs font-semibold text-slate-500 leading-tight mt-0.5'>
                  منظومة العمليات والتشغيل الميداني
                </span>
              </div>
            </Link>

            {/* Middle: Clean Navigation Links */}
            <nav className='hidden lg:flex items-center gap-7'>
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

            {/* Left Side (RTL): Actions matching HomeHeader Action buttons */}
            <div className='flex items-center gap-2 sm:gap-3'>
              {/* QR Button: Exactly matching headerQrBtn in HomeHeader */}
              <a
                href='#download'
                title='مسح رمز QR وتحميل التطبيق'
                className='flex items-center justify-center p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200/80 transition-colors active:scale-95'
                aria-label='تحميل التطبيق'
              >
                <QrCode className='w-5 h-5 sm:w-6 sm:h-6' />
              </a>

              {/* Supervisor Portal Login */}
              <Link
                href='/login'
                className='hidden sm:inline-flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all active:scale-95'
              >
                <ShieldCheck className='w-4 h-4 text-orange-600' />
                <span>بوابة المشرفين</span>
              </Link>

              {/* Mobile menu toggle */}
              <button
                type='button'
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className='lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200'
                aria-label='القائمة'
              >
                {mobileMenuOpen ? <X className='w-5 h-5' /> : <Menu className='w-5 h-5' />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className='lg:hidden bg-white/98 backdrop-blur-md border-b border-slate-200 px-6 py-5 shadow-lg'>
            <nav className='flex flex-col gap-3 text-right mb-4'>
              <a
                href='#about'
                onClick={() => setMobileMenuOpen(false)}
                className='text-sm font-semibold text-slate-800 hover:text-orange-600 py-1.5'
              >
                عن الشركة
              </a>
              <a
                href='#features'
                onClick={() => setMobileMenuOpen(false)}
                className='text-sm font-semibold text-slate-800 hover:text-orange-600 py-1.5'
              >
                مزايا المنظومة
              </a>
              <a
                href='#partners'
                onClick={() => setMobileMenuOpen(false)}
                className='text-sm font-semibold text-slate-800 hover:text-orange-600 py-1.5'
              >
                شركاء النجاح
              </a>
              <a
                href='#download'
                onClick={() => setMobileMenuOpen(false)}
                className='text-sm font-semibold text-slate-800 hover:text-orange-600 py-1.5'
              >
                تحميل التطبيق
              </a>
            </nav>
            <div className='flex flex-col gap-2 pt-3 border-t border-slate-100'>
              <Link
                href='/login'
                onClick={() => setMobileMenuOpen(false)}
                className='flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-slate-800 bg-slate-100 border border-slate-200'
              >
                <ShieldCheck className='w-4 h-4 text-orange-600' />
                <span>دخول بوابة المشرفين</span>
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
