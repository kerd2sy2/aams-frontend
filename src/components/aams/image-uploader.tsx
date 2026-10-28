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
  category?:
    | 'personal'
    | 'national_id'
    | 'license'
    | 'passport'
    | 'registration'
    | 'logo'
    | 'broadcast';
  description?: string;
}

type Mode = 'upload' | 'url';

function normalizeUrl(url: string): string {
  let trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('www.')) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

function isValidUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('/') ||
    url.startsWith('data:image/') ||
    url.startsWith('blob:')
  );
}

function detectInitialMode(value?: string): Mode {
  if (!value) return 'upload';
  const v = value.trim();
  if (
    v.startsWith('data:image/') ||
    v.startsWith('blob:') ||
    v.startsWith('/uploads/') ||
    v.includes('/uploads/')
  ) {
    return 'upload';
  }
  if (v.startsWith('http://') || v.startsWith('https://')) {
    return 'url';
  }
  return 'upload';
}

function resolvePreviewSrc(url?: string, useDirectBackend = false): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

  const backendBase = (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ||
    'https://api.kerd2sy.com'
  ).replace(/\/+$/, '');

  const uploadsMatch = trimmed.match(/(?:\/api\/v1)?(\/uploads\/[^\s?#]+)/i);
  if (uploadsMatch && uploadsMatch[1]) {
    const cleanPath = uploadsMatch[1];
    return useDirectBackend ? `${backendBase}${cleanPath}` : cleanPath;
  }

  if (trimmed.startsWith('uploads/')) {
    const cleanPath = `/${trimmed}`;
    return useDirectBackend ? `${backendBase}${cleanPath}` : cleanPath;
  }

  return trimmed;
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
  const [imgLoadError, setImgLoadError] = useState(false);
  const [fallbackTried, setFallbackTried] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setUrlInput(value);
      setMode(detectInitialMode(value));
      setImgLoadError(false);
      setFallbackTried(false);
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

  const persistExternalUrlIfPossible = async (normalizedUrl: string): Promise<string> => {
    if (
      !normalizedUrl ||
      (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) ||
      normalizedUrl.includes('/uploads/')
    ) {
      return normalizedUrl;
    }

    try {
      setLoading(true);
      const proxyRes = await fetch('/api/upload-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl })
      });
      if (!proxyRes.ok) return normalizedUrl;
      const { dataUrl, mime } = await proxyRes.json();
      if (!dataUrl) return normalizedUrl;

      // Convert dataUrl to File and upload to /upload for permanent local storage
      const blobRes = await fetch(dataUrl);
      const blob = await blobRes.blob();
      const ext = mime?.includes('png') ? 'png' : mime?.includes('webp') ? 'webp' : 'jpg';
      const file = new File([blob], `${category}_${Date.now()}.${ext}`, {
        type: mime || 'image/jpeg'
      });

      const uploadedPath = await employeeApi.uploadImage(file, category);
      if (uploadedPath) {
        setUrlInput(uploadedPath);
        onChange(uploadedPath);
        return uploadedPath;
      }
      onChange(dataUrl);
      return dataUrl;
    } catch {
      return normalizedUrl;
    } finally {
      setLoading(false);
    }
  };

  const handleUrlInputChange = (newVal: string) => {
    setUrlInput(newVal);
    const normalized = normalizeUrl(newVal);
    if (!normalized) {
      onChange('');
    } else if (isValidUrl(normalized)) {
      onChange(normalized);
    }
  };

  const handleUrlBlur = async () => {
    const normalized = normalizeUrl(urlInput);
    setUrlInput(normalized);
    if (!normalized) {
      onChange('');
    } else if (isValidUrl(normalized)) {
      onChange(normalized);
      await persistExternalUrlIfPossible(normalized);
    } else {
      toast.error('الرابط غير صالح', {
        description: 'يجب أن يبدأ الرابط بـ http:// أو https:// أو /'
      });
    }
  };

  const handleApplyUrl = async () => {
    const normalized = normalizeUrl(urlInput);
    setUrlInput(normalized);
    if (!normalized) {
      onChange('');
      return;
    }
    if (!isValidUrl(normalized)) {
      toast.error('الرابط غير صالح', {
        description: 'يجب أن يبدأ الرابط بـ http:// أو https:// أو /'
      });
      return;
    }
    onChange(normalized);
    await persistExternalUrlIfPossible(normalized);
    toast.success('تم اعتماد وحفظ الصورة في السيرفر بنجاح');
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setUrlInput('');
    setImgLoadError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className='space-y-2'>
      <label className='block text-sm font-semibold text-slate-700 dark:text-slate-200'>
        {label}
      </label>
      {description && <p className='text-xs text-slate-500 dark:text-slate-400'>{description}</p>}

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
                  src={resolvePreviewSrc(value, fallbackTried)}
                  alt={label}
                  referrerPolicy='no-referrer'
                  onError={() => {
                    if (!fallbackTried) {
                      setFallbackTried(true);
                    } else {
                      setImgLoadError(true);
                    }
                  }}
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
                  <span className='text-foreground text-sm font-medium'>اضغط هنا لرفع صورة</span>
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
                  onChange={(e) => handleUrlInputChange(e.target.value)}
                  onBlur={handleUrlBlur}
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

            {value && isValidUrl(value) ? (
              <div className='group relative flex w-full flex-col items-center'>
                {imgLoadError ? (
                  <div className='flex flex-col items-center justify-center p-3 text-center rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 max-w-md w-full'>
                    <Icons.alertCircle className='h-6 w-6 text-amber-500 mb-1' />
                    <p className='text-xs font-semibold text-amber-800 dark:text-amber-200'>
                      تعذر تحميل معاينة الصورة من هذا الرابط
                    </p>
                    <p className='text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5 break-all line-clamp-2'>
                      {value}
                    </p>
                    <p className='text-[10px] text-muted-foreground mt-1'>
                      (سيتم حفظ الرابط في النظام، ولكن يفضل التأكد من إمكانية فتح الرابط مباشرة)
                    </p>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolvePreviewSrc(value, fallbackTried)}
                    alt={label}
                    referrerPolicy='no-referrer'
                    onError={() => {
                      if (!fallbackTried) {
                        setFallbackTried(true);
                      } else {
                        setImgLoadError(true);
                      }
                    }}
                    className='max-h-36 rounded-lg border border-slate-200 object-cover shadow-sm dark:border-slate-700'
                  />
                )}
                <button
                  type='button'
                  onClick={handleRemove}
                  className='absolute -top-2 -right-2 rounded-full bg-red-600 p-1.5 text-white shadow-lg transition-colors hover:bg-red-700'
                  title='حذف الصورة'
                >
                  <Icons.close className='h-4 w-4' />
                </button>
                <span className='mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1'>
                  <Icons.check className='size-3.5' />
                  تم اعتماد الرابط وجاهز للحفظ
                </span>
              </div>
            ) : (
              <div className='flex min-h-[110px] items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-900/40'>
                <Icons.media className='h-5 w-5 text-slate-400' />
                <span>أدخل أو الصق رابط صورة صالح وسيقوم النظام باعتماده ومعاينته تلقائياً.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
