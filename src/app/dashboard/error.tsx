'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Dashboard Route Error:', error);
  }, [error]);

  return (
    <div
      className='flex min-h-[60vh] flex-col items-center justify-center p-6 text-center'
      dir='rtl'
    >
      <div className='bg-destructive/10 text-destructive mb-4 flex size-14 items-center justify-center rounded-2xl'>
        <AlertTriangle className='size-7' />
      </div>
      <h2 className='text-xl font-bold tracking-tight'>حدث خطأ أثناء عرض هذه الصفحة</h2>
      <p className='text-muted-foreground mt-2 max-w-md text-sm leading-relaxed'>
        {error?.message ||
          'حدث خطأ في تحميل بيانات الصفحة، يرجى المحاولة مرة أخرى أو تحديث الصفحة.'}
      </p>
      {error?.digest && (
        <code className='bg-muted text-muted-foreground mt-3 rounded px-2 py-1 font-mono text-xs'>
          رمز الخطأ: {error.digest}
        </code>
      )}
      <div className='mt-6 flex items-center gap-3'>
        <Button onClick={() => reset()} className='gap-2 font-bold'>
          <RefreshCw className='size-4' />
          إعادة المحاولة
        </Button>
        <Button
          variant='outline'
          onClick={() => {
            window.location.reload();
          }}
          className='font-semibold'
        >
          تحديث الصفحة بالكامل
        </Button>
      </div>
    </div>
  );
}
