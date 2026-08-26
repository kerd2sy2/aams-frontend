'use client';

import React, { useEffect, useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Download,
  ExternalLink,
  Printer,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  FileText,
  FileCode,
  FileQuestion,
  Volume2,
  Loader2,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

interface DocumentContentPreviewProps {
  fileUrl: string;
  title: string;
  fileName?: string;
  onOpenLightbox?: () => void;
}

export function DocumentContentPreview({
  fileUrl,
  title,
  fileName,
  onOpenLightbox
}: DocumentContentPreviewProps) {
  const cleanExtUrl = fileUrl.split('?')[0].toLowerCase();

  const isDocx = /\.(docx|doc)$/i.test(cleanExtUrl);
  const isImage = (
    fileUrl.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp|jfif|avif)$/i.test(cleanExtUrl)
  );
  const isPdf = (
    fileUrl.startsWith('data:application/pdf') ||
    /\.pdf$/i.test(cleanExtUrl)
  );
  const isVideo = (
    fileUrl.startsWith('data:video/') ||
    /\.(mp4|mov|webm|avi|mkv|ogg)$/i.test(cleanExtUrl)
  );
  const isAudio = (
    fileUrl.startsWith('data:audio/') ||
    /\.(mp3|wav|ogg|m4a|aac)$/i.test(cleanExtUrl)
  );
  const isText = /\.(txt|csv|json|log|xml|md|sql)$/i.test(cleanExtUrl);

  // States for Image Viewer
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imgError, setImgError] = useState(false);

  // States for DOCX Viewer (HTML rendered from mammoth)
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [docxLoading, setDocxLoading] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // States for Text Viewer
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);

  // Load and Render DOCX / Word files using Mammoth
  useEffect(() => {
    if (!isDocx || !fileUrl) return;

    let isMounted = true;
    setDocxLoading(true);
    setDocxError(null);

    const loadDocx = async () => {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`تعذر جلب الملف من السيرفر (${response.status})`);
        }
        const arrayBuffer = await response.arrayBuffer();
        if (!isMounted) return;

        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer });
        
        if (isMounted) {
          if (result.value && result.value.trim().length > 0) {
            setDocxHtml(result.value);
          } else {
            setDocxError('المستند فارغ أو لم يتم العثور على نصوص قابلة للقراءة');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Mammoth conversion error:', err);
          setDocxError(err?.message || 'تعذر استخراج محتوى ملف Word');
        }
      } finally {
        if (isMounted) {
          setDocxLoading(false);
        }
      }
    };

    loadDocx();

    return () => {
      isMounted = false;
    };
  }, [isDocx, fileUrl]);

  // Load and Render Text Files
  useEffect(() => {
    if (!isText || !fileUrl) return;

    let isMounted = true;
    setTextLoading(true);

    fetch(fileUrl)
      .then(res => res.text())
      .then(text => {
        if (isMounted) {
          setTextContent(text);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTextContent(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setTextLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isText, fileUrl]);

  const handlePrintDocx = () => {
    if (!docxHtml) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
          <head>
            <meta charset="utf-8" />
            <title>${title}</title>
            <style>
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 40px;
                color: #111827;
                line-height: 1.6;
              }
              h1, h2, h3, h4 { color: #0f172a; margin-bottom: 0.5rem; }
              p { margin-bottom: 0.75rem; }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 1.5rem 0;
                font-size: 14px;
              }
              th, td {
                border: 1px solid #cbd5e1;
                padding: 8px 12px;
                text-align: right;
              }
              th { background-color: #f1f5f9; font-weight: bold; }
              tr:nth-child(even) { background-color: #f8fafc; }
            </style>
          </head>
          <body>
            <h2>${title}</h2>
            <hr style="margin: 1rem 0; border: 0; border-top: 1px solid #e2e8f0;" />
            <div class="docx-body">
              ${docxHtml}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  const handleCopyText = () => {
    if (!docxHtml) return;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = docxHtml;
    const text = tempDiv.innerText || tempDiv.textContent || '';
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('تم نسخ محتوى المستند بالكامل');
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. DOCX (Word Document) Viewer
  if (isDocx) {
    return (
      <div className="w-full flex flex-col bg-card rounded-xl overflow-hidden border shadow-xs">
        {/* DOCX Toolbar */}
        <div className="p-3 bg-muted/40 border-b flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="size-6 rounded-md bg-blue-600 text-white font-bold flex items-center justify-center text-[11px] shadow-2xs">
              W
            </span>
            <span className="font-bold text-foreground">مستند Word (DOCX) تفاعلي</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {docxHtml && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyText}
                  className="h-8 text-xs gap-1.5 font-semibold"
                >
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  {copied ? 'تم النسخ' : 'نسخ النص'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintDocx}
                  className="h-8 text-xs gap-1.5 font-semibold"
                >
                  <Printer className="size-3.5" />
                  طباعة
                </Button>
              </>
            )}
            <a
              href={fileUrl}
              download={fileName || `${title}.docx`}
              className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'h-8 text-xs gap-1.5 font-bold shadow-xs')}
            >
              <Download className="size-3.5" />
              تحميل الملف
            </a>
          </div>
        </div>

        {/* DOCX Render Container */}
        <div className="min-h-[500px] max-h-[800px] overflow-y-auto p-4 sm:p-8 bg-slate-100/60 dark:bg-slate-950/60 flex justify-center">
          {docxLoading ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-3">
              <Loader2 className="size-9 text-primary animate-spin" />
              <p className="text-sm font-semibold text-foreground">جارٍ معالجة واستخراج نصوص وجداول مستند Word...</p>
              <p className="text-xs text-muted-foreground">يتم التنسيق التلقائي للقراءة المباشرة</p>
            </div>
          ) : docxError ? (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 max-w-md bg-card rounded-2xl border shadow-xs my-auto">
              <AlertCircle className="size-10 text-rose-500" />
              <div className="space-y-1">
                <h4 className="font-bold text-base text-foreground">تعذر عرض مستند Word</h4>
                <p className="text-xs text-muted-foreground">{docxError}</p>
              </div>
              <a
                href={fileUrl}
                download={fileName || `${title}.docx`}
                className={cn(buttonVariants({ variant: 'default' }), 'gap-2 font-bold')}
              >
                <Download className="size-4" />
                تحميل المستند للفتح المباشر
              </a>
            </div>
          ) : docxHtml ? (
            <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-md p-6 sm:p-10 w-full max-w-4xl border overflow-x-auto">
              <div
                className="prose prose-slate dark:prose-invert max-w-none text-right font-sans leading-relaxed
                  [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:border [&_table]:border-slate-300 dark:[&_table]:border-slate-700
                  [&_th]:border [&_th]:border-slate-300 dark:[&_th]:border-slate-700 [&_th]:p-2.5 [&_th]:bg-slate-100 dark:[&_th]:bg-slate-800 [&_th]:font-bold [&_th]:text-center
                  [&_td]:border [&_td]:border-slate-300 dark:[&_td]:border-slate-700 [&_td]:p-2.5 [&_td]:text-right
                  [&_tr:nth-child(even)]:bg-slate-50/60 dark:[&_tr:nth-child(even)]:bg-slate-800/40
                  [&_p]:my-1.5 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h1]:font-bold [&_h2]:font-bold
                  [&_strong]:font-bold [&_strong]:text-primary"
                dir="rtl"
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // 2. Image Viewer
  if (isImage && !imgError) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-4">
        {/* Image Controls */}
        <div className="w-full flex items-center justify-between pb-3 mb-3 border-b">
          <div className="flex items-center gap-1 bg-background rounded-xl border p-1 shadow-2xs">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
              title="تكبير"
            >
              <ZoomIn className="size-4" />
            </Button>
            <span className="text-xs font-mono px-1 select-none min-w-[45px] text-center font-bold">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
              title="تصغير"
            >
              <ZoomOut className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setRotation(prev => (prev + 90) % 360)}
              title="تدوير 90 درجة"
            >
              <RotateCw className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => { setZoomLevel(1); setRotation(0); }}
              title="إعادة ضبط"
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {onOpenLightbox && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenLightbox}
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <Maximize2 className="size-3.5" />
                ملء الشاشة
              </Button>
            )}
            <a
              href={fileUrl}
              download={fileName || `${title}.png`}
              className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'h-8 gap-1.5 text-xs font-bold shadow-xs')}
            >
              <Download className="size-3.5" />
              تحميل
            </a>
          </div>
        </div>

        <div className="w-full flex items-center justify-center overflow-auto max-h-[750px] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={title}
            onError={() => setImgError(true)}
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease-in-out',
            }}
            className="max-h-[700px] max-w-full object-contain rounded-xl shadow-md cursor-zoom-in border bg-white"
            onClick={onOpenLightbox}
          />
        </div>
      </div>
    );
  }

  // 3. PDF Viewer
  if (isPdf) {
    return (
      <div className="w-full h-[750px] rounded-xl overflow-hidden border shadow-inner bg-card flex flex-col">
        <div className="p-3 bg-muted/40 border-b flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold flex items-center gap-1.5">
            <FileText className="size-4 text-primary" />
            مستند PDF تفاعلي
          </span>
          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-7 text-xs gap-1')}
            >
              <ExternalLink className="size-3.5" />
              عرض كامل
            </a>
            <a
              href={fileUrl}
              download={fileName || `${title}.pdf`}
              className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'h-7 text-xs gap-1 font-bold shadow-xs')}
            >
              <Download className="size-3.5" />
              تحميل PDF
            </a>
          </div>
        </div>
        <object
          data={`${fileUrl}#toolbar=1&navpanes=0`}
          type="application/pdf"
          className="w-full flex-1 min-h-[680px]"
        >
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=0`}
            className="w-full h-full min-h-[680px] border-0"
            title={title}
          >
            <div className="p-12 text-center space-y-3">
              <p className="text-sm">متصفحك لا يدعم معاينة الـ PDF المضمنة.</p>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants()}>
                فتح ملف الـ PDF مباشرة
              </a>
            </div>
          </iframe>
        </object>
      </div>
    );
  }

  // 4. Text / Code Viewer
  if (isText) {
    return (
      <div className="w-full rounded-xl overflow-hidden border bg-card flex flex-col">
        <div className="p-3 bg-muted/40 border-b flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold flex items-center gap-1.5 font-mono">
            <FileCode className="size-4 text-primary" />
            {fileName || 'ملف نصي'}
          </span>
          <a
            href={fileUrl}
            download={fileName || `${title}.txt`}
            className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'h-7 text-xs gap-1')}
          >
            <Download className="size-3.5" />
            تحميل
          </a>
        </div>
        <div className="p-6 max-h-[600px] overflow-y-auto bg-muted/15 font-mono text-xs leading-relaxed whitespace-pre-wrap select-text">
          {textLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              جارٍ قراءة الملف...
            </div>
          ) : textContent !== null ? (
            textContent
          ) : (
            <p className="text-muted-foreground">لا يمكن عرض المحتوى النصي مباشرة.</p>
          )}
        </div>
      </div>
    );
  }

  // 5. Video Viewer
  if (isVideo) {
    return (
      <div className="w-full max-w-3xl rounded-xl overflow-hidden border shadow-md bg-black mx-auto">
        <video controls className="w-full max-h-[600px]">
          <source src={fileUrl} />
          متصفحك لا يدعم تشغيل هذا الفيديو.
        </video>
      </div>
    );
  }

  // 6. Audio Viewer
  if (isAudio) {
    return (
      <div className="p-8 text-center space-y-4 w-full max-w-md bg-card rounded-2xl border shadow-xs mx-auto">
        <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <Volume2 className="size-8" />
        </div>
        <h4 className="font-bold text-base">{fileName || title}</h4>
        <audio controls className="w-full">
          <source src={fileUrl} />
          متصفحك لا يدعم تشغيل الملفات الصوتية.
        </audio>
      </div>
    );
  }

  // 7. Generic Fallback
  return (
    <div className="text-center p-12 space-y-4 max-w-md mx-auto bg-card rounded-2xl border shadow-xs">
      <div className="size-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
        <FileQuestion className="size-10" />
      </div>
      <div className="space-y-1">
        <h4 className="font-bold text-base text-foreground">{fileName || title}</h4>
        <p className="text-xs text-muted-foreground">
          الملف متاح للتحميل والفتح المباشر على جهازك
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}
        >
          <ExternalLink className="size-4" />
          فتح في نافذة جديدة
        </a>
        <a
          href={fileUrl}
          download={fileName || title}
          className={cn(buttonVariants({ variant: 'default' }), 'gap-2 font-bold shadow-xs')}
        >
          <Download className="size-4" />
          تحميل الملف المرفق
        </a>
      </div>
    </div>
  );
}
