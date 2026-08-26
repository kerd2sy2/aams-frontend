'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { getOfflineDB } from '@/lib/aams/offline-db';
import { getSyncManager } from '@/lib/aams/sync-manager';
import { isNetworkError } from '@/lib/aams/network-utils';

interface UseOfflineMutationOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  successMessage?: string;
  queueMessage?: string;
}

export function useOfflineMutation(options: UseOfflineMutationOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (
      onlineFn: () => Promise<unknown>,
      queueData: {
        endpoint: string;
        method: 'POST' | 'PUT' | 'DELETE';
        payload: Record<string, unknown>;
      }
    ): Promise<boolean> => {
      setIsLoading(true);
      try {
        const sm = getSyncManager();

        if (sm.online) {
          try {
            await onlineFn();
            if (options.onSuccess) options.onSuccess();
            if (options.successMessage) toast.success(options.successMessage);
            return true;
          } catch (err: unknown) {
            if (isNetworkError(err)) {
              // fall through to queue
            } else {
              const msg = err instanceof Error ? err.message : '';
              if (options.onError) options.onError(msg || 'حدث خطأ');
              throw err;
            }
          }
        }

        const db = getOfflineDB();
        await db.enqueueMutation({
          endpoint: queueData.endpoint,
          method: queueData.method,
          payload: queueData.payload,
          created_at: new Date().toISOString()
        });

        if (options.queueMessage) toast.info(options.queueMessage);
        if (options.onSuccess) options.onSuccess();

        sm.processQueue();

        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'حدث خطأ';
        if (options.onError) options.onError(msg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  return { execute, isLoading };
}
