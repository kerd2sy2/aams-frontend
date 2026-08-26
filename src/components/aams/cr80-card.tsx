'use client';

import React from 'react';
import { Employee, AppSettings } from '@/types/aams';
import { Code128Barcode, QRCodeImage } from '@/components/aams/employee-codes';
import { User, Building2, IdCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CR80CardProps {
  employee: Employee;
  settings?: AppSettings | null;
  className?: string;
  showCutLines?: boolean;
}

export function CR80Card({
  employee,
  settings,
  className,
  showCutLines = false,
}: CR80CardProps) {
  const brandName = settings?.site_name || 'AAMS LOGISTICS';
  const brandLogo = settings?.logo_url || '';
  const personalImg = employee.personal_image || '';

  // QR Code strictly encodes Employee UUID
  const qrCodeUUID = employee.id || '';
  // Barcode strictly encodes National ID Number
  const barcodeNationalId = employee.national_id || '';

  return (
    <div
      className={cn(
        'cr80-card-root relative bg-white text-slate-900 overflow-hidden shadow-md select-none',
        showCutLines && 'border border-dashed border-slate-400',
        className
      )}
      style={{
        width: '85.6mm',
        height: '54.0mm',
        minWidth: '85.6mm',
        minHeight: '54.0mm',
        maxWidth: '85.6mm',
        maxHeight: '54.0mm',
        borderRadius: '3.18mm',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      }}
      dir="rtl"
    >
      {/* Background Watermark Logo in Center */}
      {brandLogo ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brandLogo}
            alt="Watermark"
            className="w-[32mm] h-[32mm] object-contain opacity-[0.08] grayscale contrast-125"
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
          <span className="text-[18mm] font-black text-slate-950 opacity-[0.04] select-none">
            {brandName.charAt(0)}
          </span>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="relative z-10 h-[8mm] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white px-[3mm] flex items-center justify-between border-b-[0.4mm] border-amber-500">
        <div className="flex items-center gap-2 min-w-0">
          {brandLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brandLogo}
              alt={brandName}
              className="h-[5.5mm] w-auto max-w-[22mm] object-contain rounded-xs bg-white/10 p-0.5"
            />
          )}
          <span className="text-[2.8mm] font-black tracking-normal truncate max-w-[55mm] text-slate-50">
            {brandName}
          </span>
        </div>

        <span className="text-[2.1mm] font-bold text-amber-300 font-mono tracking-wider">
          بطاقة هوية عمل
        </span>
      </div>

      {/* Main Card Body */}
      <div className="relative z-10 px-[3mm] pt-[2.2mm] pb-[1mm] flex flex-col justify-between h-[36.5mm]">
        <div className="flex items-center justify-between gap-[3mm]">
          {/* Right: Personal Photo */}
          <div className="flex flex-col items-center shrink-0">
            <div
              className="rounded-[2.4mm] overflow-hidden border-[0.4mm] border-slate-300 bg-slate-100 shadow-2xs flex items-center justify-center relative"
              style={{ width: '21mm', height: '26mm' }}
            >
              {personalImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={personalImg}
                  alt={employee.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <User className="size-[9mm]" />
                </div>
              )}
            </div>
          </div>

          {/* Middle: Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-center h-[26mm] gap-[1.2mm]">
            <div>
              {/* Full Name */}
              <h2 className="text-[3.8mm] font-black text-slate-950 leading-tight truncate">
                {employee.name}
              </h2>
              {/* Job Title / Branch */}
              <p className="text-[2.3mm] font-bold text-blue-800 flex items-center gap-1 mt-0.5 truncate">
                <Building2 className="size-[2.5mm] text-blue-600 shrink-0" />
                <span>مندوب توصيل — {employee.branch?.name || 'الفرع الرئيسي'}</span>
              </p>
            </div>

            {/* National ID Box */}
            <div className="bg-slate-50/90 border border-slate-200 rounded-[1.4mm] px-2 py-[1mm] flex items-center justify-between font-mono">
              <span className="text-[2.1mm] font-bold text-slate-500 flex items-center gap-0.5">
                <IdCard className="size-[2.6mm] text-slate-600" />
                رقم الهوية:
              </span>
              <span className="text-[2.7mm] font-black text-slate-950 tracking-wider">
                {employee.national_id || '-'}
              </span>
            </div>
          </div>

          {/* Left: High-Contrast QR Code (UUID) */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div
              className="bg-white p-[1mm] rounded-[2mm] border-[0.4mm] border-slate-900 shadow-xs flex items-center justify-center"
              style={{ width: '22mm', height: '22mm' }}
            >
              <QRCodeImage
                value={qrCodeUUID}
                size={80}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Barcode (National ID) Strip */}
      <div className="relative z-10 h-[9.5mm] bg-slate-50/95 border-t border-slate-200 px-[3mm] flex items-center justify-between">
        <div className="flex items-center h-[8mm]">
          <Code128Barcode
            value={barcodeNationalId}
            height={24}
            className="max-w-[50mm] object-contain"
          />
        </div>
        <div className="text-left font-mono leading-tight">
          <div className="text-[2.3mm] font-black text-slate-950 tracking-wider">
            {barcodeNationalId}
          </div>
          <div className="text-[1.5mm] font-bold text-slate-400 uppercase tracking-tight">
            OFFICIAL ID CARD
          </div>
        </div>
      </div>
    </div>
  );
}
