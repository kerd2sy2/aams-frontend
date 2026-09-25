'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import PageContainer from '@/components/layout/page-container';

export default function KeetaErrorReport({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Keeta Daily Report Page Error:', error);
  }, [error]);

  return (
    <PageContainer>
      <div className='flex items-center justify-center min-h-[60vh]' dir='rtl'>
        <Card className='max-w-md w-full border-destructive/20 shadow-md text-center'>
          <CardContent className='pt-8 pb-8 px-6 flex flex-col items-center gap-4'>
            <div className='p-3 rounded-full bg-destructive/10 text-destructive'>
              <AlertTriangle className='h-8 w-8' />
            </div>
            <div>
              <h2 className='text-xl font-bold tracking-tight mb-1'>حدث خطأ أثناء تحميل التقرير</h2>
              <p className='text-sm text-muted-foreground'>
                {error?.message || 'تعذر معالجة بيانات التقرير بشكل صحيح. يرجى إعادة المحاولة.'}
              </p>
            </div>
            <div className='flex gap-2 mt-2'>
              <Button
                variant='default'
                onClick={() => reset()}
                className='gap-2 bg-emerald-600 hover:bg-emerald-700 text-white'
              >
                <RefreshCcw className='h-4 w-4' />
                <span>إعادة المحاولة</span>
              </Button>
              <Button
                variant='outline'
                onClick={() => {
                  window.location.reload();
                }}
              >
                تحديث الصفحة
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
