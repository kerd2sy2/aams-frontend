'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { employeeApi } from '@/lib/aams/services';
import { Employee } from '@/types/aams';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmployee?: (employee: Employee) => void;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onSelectEmployee
}: BarcodeScannerModalProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setSearchInput('');
    }
  }, [isOpen]);

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Error stopping camera', err);
        }
      }
      html5QrCodeRef.current = null;
      setCameraActive(false);
    }
  };

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode('barcode-reader');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          disableFlip: false
        },
        async (decodedText) => {
          await stopCamera();
          toast.success(`تم مسح الكود بنجاح: ${decodedText}`);
          handleSearchTerm(decodedText);
        },
        () => {
          // ignore scan error frames
        }
      );
    } catch {
      toast.error('لم نتمكن من الوصول إلى الكاميرا. يرجى استخدام البحث اليدوي.');
      setCameraActive(false);
    }
  };

  const handleSearchTerm = async (term: string) => {
    if (!term.trim()) return;
    try {
      setLoading(true);
      const results = await employeeApi.search(term.trim());
      if (results && results.length > 0) {
        const emp = results[0];
        toast.success(`تم العثور على الموظف: ${emp.name}`);
        if (onSelectEmployee) {
          onSelectEmployee(emp);
          onClose();
        } else {
          onClose();
          router.push(`/dashboard/employees/${emp.id}`);
        }
      } else {
        toast.error('لم يتم العثور على أي موظف بهذا الكود/الاسم');
      }
    } catch {
      toast.error('حدث خطأ أثناء البحث عن الموظف');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchTerm(searchInput);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'>
      <div className='w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900'>
        {/* Modal Header */}
        <div className='flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-850'>
          <div className='flex items-center gap-2 text-blue-600 dark:text-blue-400'>
            <Icons.qrCode className='h-6 w-6' />
            <h3 className='text-lg font-bold text-slate-900 dark:text-white'>
              قارئ الباركود والـ QR Code
            </h3>
          </div>
          <button
            onClick={onClose}
            className='rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200'
          >
            <Icons.close className='h-5 w-5' />
          </button>
        </div>

        {/* Modal Body */}
        <div className='space-y-5 p-5'>
          {/* Live Camera Scanner Box */}
          <div className='relative flex min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-center text-white'>
            <div id='barcode-reader' ref={scannerRef} className='h-full w-full' />

            {!cameraActive && (
              <div className='flex flex-col items-center space-y-3 p-6'>
                <div className='rounded-full bg-blue-600/20 p-4 text-blue-400'>
                  <Icons.camera className='h-10 w-10' />
                </div>
                <p className='text-sm font-medium text-slate-300'>
                  وجه الكاميرا نحو الباركود أو الـ QR الخاص بالبطاقة
                </p>
                <button
                  type='button'
                  onClick={startCamera}
                  className='flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700'
                >
                  <Icons.camera className='h-4 w-4' />
                  <span>تشغيل الكاميرا للمسح</span>
                </button>
              </div>
            )}
          </div>

          {/* Manual Input Form */}
          <form onSubmit={handleManualSearch} className='space-y-3'>
            <div className='relative'>
              <input
                type='text'
                placeholder='أدخل الباركود أو الـ QR أو رقم الهوية أو الاسم...'
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className='w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800'
              />
              <Icons.search className='absolute left-3 top-3.5 h-5 w-5 text-slate-400' />
            </div>

            <button
              type='submit'
              disabled={loading || !searchInput.trim()}
              className='flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700'
            >
              {loading ? (
                <Icons.refresh className='h-4 w-4 animate-spin' />
              ) : (
                <Icons.userCheck className='h-4 w-4' />
              )}
              <span>بحث وفتح ملف الموظف</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
