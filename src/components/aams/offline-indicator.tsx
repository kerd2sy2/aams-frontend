'use client';

import { useEffect, useRef } from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { toast } from 'sonner';

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, syncNow } = useOnlineStatus();
  const wasOnline = useRef(isOnline);

  useEffect(() => {
    if (!isOnline && wasOnline.current) {
      toast.warning('غير متصل بالإنترنت', {
        description: 'سيتم حفظ التعديلات محلياً ومزامنتها تلقائياً',
        duration: Infinity
      });
    } else if (isOnline && !wasOnline.current) {
      toast.success('تم استعادة الاتصال', {
        description: 'جاري مزامنة البيانات المعلقة...'
      });

      syncNow().then((result) => {
        if (result.processed > 0) {
          toast.success('اكتملت المزامنة', {
            description: `تمت مزامنة ${result.processed} عنصر${
              result.failed > 0 ? ` (${result.failed} فشل)` : ''
            }`
          });
        }
      });
    }

    wasOnline.current = isOnline;
  }, [isOnline, syncNow]);

  useEffect(() => {
    if (!isOnline || pendingCount === 0 || isSyncing) return;

    toast(`${pendingCount} عنصر بانتظار المزامنة`, {
      description: 'اضغط للمزامنة الآن',
      action: {
        label: 'مزامنة',
        onClick: () =>
          syncNow().then((result) => {
            if (result.processed > 0) {
              toast.success(`تمت مزامنة ${result.processed} عنصر بنجاح`);
            }
          })
      }
    });
  }, [isOnline, pendingCount, isSyncing, syncNow]);

  useEffect(() => {
    if (!isSyncing) return;

    const id = toast.loading('جاري المزامنة...', {
      description: 'يتم إرسال البيانات المعلقة إلى الخادم'
    });

    return () => {
      toast.dismiss(id);
    };
  }, [isSyncing]);

  return null;
}
