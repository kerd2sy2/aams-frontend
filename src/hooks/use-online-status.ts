'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSyncManager } from '@/lib/aams/sync-manager';
import { getOfflineDB } from '@/lib/aams/offline-db';

interface OnlineStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncResult: { processed: number; failed: number } | null;
  syncNow: () => Promise<{ processed: number; failed: number }>;
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    processed: number;
    failed: number;
  } | null>(null);

  const updatePendingCount = useCallback(async () => {
    try {
      const db = getOfflineDB();
      const count = await db.countPending();
      setPendingCount(count);
    } catch {
      // DB not available (SSR)
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    try {
      const sm = getSyncManager();
      sm.start();

      const unsub = sm.subscribe((event) => {
        if (event.type === 'status-changed' || event.type === 'sync-complete') {
          updatePendingCount();
          setIsSyncing(false);
        }
        if (event.type === 'sync-start') {
          setIsSyncing(true);
        }
        if (event.pendingCount !== undefined) {
          setPendingCount(event.pendingCount);
        }
      });

      updatePendingCount();

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        unsub();
        sm.stop();
      };
    } catch {
      // Not in browser
    }
  }, [updatePendingCount]);

  const syncNow = useCallback(async () => {
    try {
      setIsSyncing(true);
      const sm = getSyncManager();
      const result = await sm.processQueue();
      setLastSyncResult(result);
      await updatePendingCount();
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [updatePendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncResult,
    syncNow
  };
}
