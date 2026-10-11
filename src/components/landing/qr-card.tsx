'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Download, Copy, Check, ExternalLink, Smartphone, Sparkles } from 'lucide-react';

interface QrCardProps {
  appUrl?: string;
  className?: string;
  size?: number;
}

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.aams.app';

export function QrCard({ appUrl = PLAY_STORE_URL, className = '', size = 220 }: QrCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    QRCode.toDataURL(appUrl, {
      width: size * 2,
      margin: 1.5,
      color: {
        dark: '#09090b',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [appUrl, size]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div
      className={`relative group rounded-3xl bg-zinc-900/90 border border-zinc-800/90 p-6 sm:p-7 shadow-2xl shadow-orange-500/10 backdrop-blur-xl transition-all duration-300 hover:border-orange-500/50 hover:shadow-orange-500/20 ${className}`}
    >
      {/* Ambient background glow */}
      <div className='absolute -top-12 -right-12 w-44 h-44 bg-orange-500/15 rounded-full blur-3xl pointer-events-none' />
      <div className='absolute -bottom-12 -left-12 w-44 h-44 bg-sky-500/10 rounded-full blur-3xl pointer-events-none' />

      {/* Header Badge */}
      <div className='flex items-center justify-between gap-3 mb-5'>
        <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold'>
          <Sparkles className='w-3.5 h-3.5 text-orange-400 animate-pulse' />
          <span>تطبيق المندوب الرسمي</span>
        </div>
        <span className='text-[11px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/50'>
          v1.0.1
        </span>
      </div>

      {/* QR Code Container with Tech Scanner Frame */}
      <div className='relative mx-auto flex flex-col items-center justify-center p-4 rounded-2xl bg-white shadow-inner'>
        {/* Decorative corner brackets */}
        <div className='absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-orange-500 rounded-tr pointer-events-none' />
        <div className='absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-orange-500 rounded-tl pointer-events-none' />
        <div className='absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-orange-500 rounded-br pointer-events-none' />
        <div className='absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-orange-500 rounded-bl pointer-events-none' />

        {/* Center Logo Badge over QR Code */}
        {qrDataUrl ? (
          <div className='relative'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt='باركود تحميل تطبيق AAMS من متجر Google Play'
              width={size}
              height={size}
              className='rounded-xl block'
            />
            {/* Embedded Logo in QR Center */}
            <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
              <div className='w-12 h-12 rounded-xl bg-zinc-950 p-1.5 shadow-md border-2 border-orange-500 flex items-center justify-center'>
                <Image
                  src='/logo.png'
                  alt='AAMS'
                  width={34}
                  height={34}
                  className='object-contain'
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{ width: size, height: size }}
            className='flex items-center justify-center bg-zinc-100 rounded-xl'
          >
            <div className='w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin' />
          </div>
        )}
      </div>

      {/* Instructions */}
      <p className='text-center text-xs text-zinc-300 font-medium mt-4 mb-5 flex items-center justify-center gap-1.5'>
        <Smartphone className='w-4 h-4 text-orange-400' />
        <span>وجّه كاميرا هاتفك نحو الباركود للتحميل المباشر</span>
      </p>

      {/* Google Play Button */}
      <a
        href={appUrl}
        target='_blank'
        rel='noopener noreferrer'
        className='group/btn relative flex items-center justify-center gap-3 w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition-all duration-300 hover:from-orange-600 hover:to-orange-500 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden'
      >
        <span className='absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out' />
        <Download className='w-5 h-5 text-white animate-bounce' />
        <span>تحميل من Google Play</span>
        <ExternalLink className='w-4 h-4 text-white/80' />
      </a>

      {/* Secondary Actions: Copy Link & Package Info */}
      <div className='mt-3 flex items-center justify-between text-xs text-zinc-400 pt-3 border-t border-zinc-800/80'>
        <span className='font-mono text-[11px] text-zinc-400'>com.aams.app</span>
        <button
          type='button'
          onClick={handleCopy}
          className='inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer text-[12px]'
        >
          {copied ? (
            <>
              <Check className='w-3.5 h-3.5 text-emerald-400' />
              <span className='text-emerald-400 font-medium'>تم النسخ!</span>
            </>
          ) : (
            <>
              <Copy className='w-3.5 h-3.5 text-zinc-400' />
              <span>نسخ الرابط</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
