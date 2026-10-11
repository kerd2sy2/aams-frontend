'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Download, Copy, Check, ExternalLink, Smartphone } from 'lucide-react';

interface QrCardProps {
  appUrl?: string;
  logoUrl?: string;
  className?: string;
  size?: number;
}

export const DEFAULT_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.aams.app';

export function QrCard({
  appUrl = DEFAULT_PLAY_STORE_URL,
  logoUrl = '/logo.png',
  className = '',
  size = 210
}: QrCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const targetUrl = appUrl || DEFAULT_PLAY_STORE_URL;
    QRCode.toDataURL(targetUrl, {
      width: size * 2,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [appUrl, size]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(appUrl || DEFAULT_PLAY_STORE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div
      className={`relative rounded-2xl bg-white border border-slate-200/90 p-6 shadow-xl shadow-slate-200/60 transition-all duration-200 hover:shadow-2xl hover:border-slate-300 ${className}`}
    >
      {/* Top Header */}
      <div className='flex items-center justify-between gap-3 mb-4'>
        <div className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-50 border border-orange-200/60 text-orange-700 text-xs font-semibold'>
          <span className='w-2 h-2 rounded-full bg-orange-500' />
          <span>تطبيق المناديب الرسمي</span>
        </div>
        <span className='text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200'>
          Google Play
        </span>
      </div>

      {/* QR Code Container */}
      <div className='relative mx-auto flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-100'>
        {qrDataUrl ? (
          <div className='relative'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt='باركود تحميل تطبيق AAMS من متجر Google Play'
              width={size}
              height={size}
              className='rounded-lg block shadow-sm'
            />
            {/* Center Logo in QR */}
            <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
              <div className='w-11 h-11 rounded-lg bg-white p-1 shadow-md border border-slate-200 flex items-center justify-center'>
                <Image
                  src={logoUrl || '/logo.png'}
                  alt='AAMS Logo'
                  width={32}
                  height={32}
                  className='object-contain'
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{ width: size, height: size }}
            className='flex items-center justify-center bg-slate-100 rounded-lg'
          >
            <div className='w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin' />
          </div>
        )}
      </div>

      {/* Camera scan instruction */}
      <p className='text-center text-xs text-slate-600 font-medium mt-3.5 mb-4 flex items-center justify-center gap-1.5'>
        <Smartphone className='w-3.5 h-3.5 text-orange-600 shrink-0' />
        <span>امسح الرمز بكاميرا الجوال للتحميل المباشر</span>
      </p>

      {/* Google Play Button */}
      <a
        href={appUrl || DEFAULT_PLAY_STORE_URL}
        target='_blank'
        rel='noopener noreferrer'
        className='flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0'
      >
        <Download className='w-4 h-4 text-orange-400' />
        <span>تحميل من Google Play</span>
        <ExternalLink className='w-3.5 h-3.5 text-slate-400 mr-auto' />
      </a>

      {/* Copy link bar */}
      <div className='mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100'>
        <span className='font-mono text-[11px] text-slate-400'>com.aams.app</span>
        <button
          type='button'
          onClick={handleCopy}
          className='inline-flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer text-[12px]'
        >
          {copied ? (
            <>
              <Check className='w-3.5 h-3.5 text-emerald-600' />
              <span className='text-emerald-600 font-semibold'>تم نسخ الرابط</span>
            </>
          ) : (
            <>
              <Copy className='w-3.5 h-3.5 text-slate-400' />
              <span>نسخ الرابط</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
