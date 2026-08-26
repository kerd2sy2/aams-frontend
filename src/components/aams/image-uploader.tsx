'use client';

import React, { useState, useRef, useEffect } from 'react';
import { employeeApi } from '@/lib/aams/services';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label: string;
  category?: 'personal' | 'national_id' | 'license' | 'logo';
  description?: string;
}

type Mode = 'upload' | 'url';

function detectInitialMode(value?: string): Mode {
  if (!value) return 'upload';
  const v = value.trim();
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/')) return 'url';
  return 'upload';
}

export function ImageUploader({
  value,
  onChange,
  label,
  category = 'personal',
  description
}: ImageUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>(detectInitialMode(value));
  const [urlInput, setUrlInput] = useState<string>(value ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setUrlInput(value);
      setMode(detectInitialMode(value));
    }
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار صورة صالحة (PNG, JPG, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت');
      return;
    }

    try {
      setLoading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        onChange(base64);

        try {
          const uploadedUrl = await employeeApi.uploadImage(file, category);
          if (uploadedUrl) {
            onChange(uploadedUrl);
          }
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('Upload fallback to local base64 preview', err);
          }
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('حدث خطأ أثناء رفع الصورة');
      setLoading(false);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      onChange('');
      return;
    }
    if (
      !trimmed.startsWith('http://') &&
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('/')
    ) {
      toast.error('الرابط غير صالح', {
        description: 'يجب أن يبدأ الرابط بـ http:// أو https:// أو /'
      });
      return;
    }
    onChange(trimmed);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setUrlInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className='space-y-2'>
      <label className='block text-sm font-semibold text-slate-700 dark:text-slate-200'>
        {label}
      </label>
      {description && (
        <p className='text-xs text-slate-500 dark:text-slate-400'>{description}</p>
      )}

      <div
        className={`relative min-h-[160px] rounded-xl border-2 transition-all duration-200 ${
          value
            ? 'bg-muted/50 border-dashed border-blue-500/50'
            : 'border-dashed border-slate-300 bg-slate-50/50 hover:border-blue-500 dark:border-slate-700 dark:bg-slate-900/30'
        }`}
      >
        <div className='flex gap-2 border-b border-dashed border-slate-200 p-3 dark:border-slate-700'>
          <Button
            type='button'
            size='sm'
            variant={mode === 'upload' ? 'default' : 'outline'}
            className='gap-1.5'
            onClick={() => setMode('upload')}
          >
            <Icons.fileUpload className='h-4 w-4' />
            رفع ملف
          </Button>
          <Button
            type='button'
            size='sm'
            variant={mode === 'url' ? 'default' : 'outline'}
            className='gap-1.5'
            onClick={() => setMode('url')}
          >
            <Icons.link className='h-4 w-4' />
            رابط URL
          </Button>
        </div>

        {mode === 'upload' ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className='flex cursor-pointer flex-col items-center justify-center p-4 text-center'
          >
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*'
              className='hidden'
              onChange={handleFileChange}
            />

            {loading ? (
              <div className='flex flex-col items-center justify-center space-y-2 py-4 text-blue-600'>
                <Icons.spinner className='h-8 w-8 animate-spin' />
                <span className='text-xs font-medium'>جاري رفع الصورة...</span>
              </div>
            ) : value ? (
              <div className='group relative flex w-full flex-col items-center'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value}
                  alt={label}
                  className='max-h-36 rounded-lg border border-slate-200 object-cover shadow-sm dark:border-slate-700'
                />
                <button
                  type='button'
                  onClick={handleRemove}
                  className='absolute -top-2 -right-2 rounded-full bg-red-600 p-1.5 text-white shadow-lg transition-colors hover:bg-red-700'
                  title='حذف الصورة'
                >
                  <Icons.close className='h-4 w-4' />
                </button>
                <span className='mt-2 text-xs font-medium text-blue-600 dark:text-blue-400'>
                  انقر لتغيير الصورة
                </span>
              </div>
            ) : (
              <div className='flex flex-col items-center space-y-2 py-2 text-slate-500 dark:text-slate-400'>
                <div className='rounded-full bg-slate-100 p-3 dark:bg-slate-800'>
                  <Icons.upload className='h-6 w-6 text-slate-600 dark:text-slate-300' />
                </div>
                <div className='space-y-1'>
                  <span className='text-foreground text-sm font-medium'>
                    اضغط هنا لرفع صورة
                  </span>
                  <p className='text-xs text-slate-400 dark:text-slate-500'>
                    PNG, JPG, WEBP حتى 5MB
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className='space-y-3 p-4'>
            <div className='flex items-stretch gap-2'>
              <div className='relative flex-1'>
                <Icons.link className='text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2' />
                <Input
                  type='url'
                  placeholder='https://... أو /uploads/...'
                  className='h-10 pl-10 text-right dir-ltr'
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyUrl();
                    }
                  }}
                />
              </div>
              <Button type='button' onClick={handleApplyUrl} className='h-10'>
                تطبيق
              </Button>
            </div>

            {value &&
            (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) ? (
              <div className='group relative flex w-full flex-col items-center'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value}
                  alt={label}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                  className='max-h-32 rounded-lg border border-slate-200 object-cover shadow-sm dark:border-slate-700'
                />
                <button
                  type='button'
                  onClick={handleRemove}
                  className='absolute -top-2 -right-2 rounded-full bg-red-600 p-1.5 text-white shadow-lg transition-colors hover:bg-red-700'
                  title='حذف الصورة'
                >
                  <Icons.close className='h-4 w-4' />
                </button>
              </div>
            ) : (
              <div className='flex min-h-[110px] items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-900/40'>
                <Icons.media className='h-5 w-5 text-slate-400' />
                <span>أدخل رابط صورة صالح ثم اضغط &quot;تطبيق&quot; لمعاينته هنا.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
