'use client';

import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { cn } from '@/lib/utils';

/**
 * يُرسم باركود Code128 بصيغة SVG إذا لم يكن هناك صورة مسبقة.
 * @param value - النص الذي سيتم ترميزه (عادة employee.id أو key_number)
 * @param src - صورة باركود مسبقة التوليد من الباك اند (لو موجودة نستخدمها مباشرة)
 */
export function Code128Barcode({
  value,
  src,
  className,
  height = 56
}: {
  value: string;
  src?: string | null;
  className?: string;
  height?: number;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt='Barcode'
        className={cn('h-auto max-w-full object-contain', className)}
        style={{ maxHeight: height }}
      />
    );
  }

  if (!value) return null;
  return <FallbackCode128Renderer value={value} height={height} className={className} />;
}

function FallbackCode128Renderer({
  value,
  height,
  className
}: {
  value: string;
  height: number;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!svgRef.current || errored) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 14,
        height: Math.max(40, height - 24),
        margin: 2
      });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('JsBarcode render failed for value:', value, err);
      }
      setErrored(true);
    }
  }, [value, height, errored]);

  if (errored) {
    return (
      <div
        className={cn(
          'bg-muted/50 text-muted-foreground flex items-center justify-center rounded-lg font-mono text-xs font-bold',
          className
        )}
        style={{ height }}
      >
        {value}
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      role='img'
      aria-label='Code128 Barcode'
      className={cn('w-full max-w-full', className)}
      style={{ height }}
    />
  );
}

/**
 * يُرسم رمز QR بصيغة PNG DataURL إذا لم يكن هناك صورة مسبقة.
 * @param value - النص الذي سيتم ترميزه (عادة رابط الموظف أو مُعرفه الفريد)
 * @param src  - صورة QR مسبقة التوليد من الباك اند
 */
export function QRCodeImage({
  value,
  src,
  size = 140,
  className
}: {
  value: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt='QR Code'
        className={cn('object-contain', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  if (!value) return null;

  return (
    <DynamicQRRenderer
      value={value}
      size={size}
      className={className}
      dataUrl={dataUrl}
      setDataUrl={setDataUrl}
    />
  );
}

function DynamicQRRenderer({
  value,
  size,
  className,
  dataUrl,
  setDataUrl
}: {
  value: string;
  size: number;
  className?: string;
  dataUrl: string | null;
  setDataUrl: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  useEffect(() => {
    let cancelled = false;
    // Generate at high resolution with pure high contrast #000000 / #ffffff and Low Error Correction (L) for largest scannable modules
    QRCode.toDataURL(String(value).trim(), {
      width: 512,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'L'
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch((err) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('QR code generation failed for value:', value, err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [value, setDataUrl]);

  if (dataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={dataUrl}
        alt='QR Code'
        className={cn('object-contain', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={cn(
        'bg-muted/40 flex animate-pulse items-center justify-center rounded-lg',
        className
      )}
      style={{ width: size, height: size }}
    >
      <span className='text-muted-foreground text-xs font-medium'>QR ...</span>
    </div>
  );
}
