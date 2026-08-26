'use client';

import { getOfflineDB } from './offline-db';
import { apiClient } from './axios';

const SYNC_INTERVAL_MS = 5000;
const SYNC_DELAY_BETWEEN_ITEMS_MS = 2000;

type SyncListener = (event: {
  type: 'status-changed' | 'sync-start' | 'sync-complete' | 'item-processed' | 'item-failed';
  pendingCount?: number;
  itemId?: number;
  error?: string;
}) => void;

class SyncManager {
  private listeners: Set<SyncListener> = new Set();
  private processing = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isOnline = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = (): void => {
    this.isOnline = true;
    this.notify({ type: 'status-changed' });
    this.processQueue();
  };

  private handleOffline = (): void => {
    this.isOnline = false;
    this.notify({ type: 'status-changed' });
  };

  get online(): boolean {
    return this.isOnline;
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: Parameters<SyncListener>[0]): void {
    this.listeners.forEach((fn) => fn(event));
  }

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      if (this.isOnline && !this.processing) {
        this.processQueue();
      }
    }, SYNC_INTERVAL_MS);

    if (this.isOnline) {
      this.processQueue();
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.processing || !this.isOnline) {
      return { processed: 0, failed: 0 };
    }

    this.processing = true;
    let processed = 0;
    let failed = 0;

    try {
      const db = getOfflineDB();
      const pending = await db.getPendingMutations();

      if (pending.length === 0) {
        this.notify({ type: 'sync-complete', pendingCount: 0 });
        return { processed: 0, failed: 0 };
      }

      this.notify({ type: 'sync-start', pendingCount: pending.length });

      for (const entry of pending) {
        if (!this.isOnline) break;

        try {
          await db.markProcessing(entry.id!);

          const token = localStorage.getItem('access_token');
          const config: Record<string, string> = {};
          if (token) {
            config['Authorization'] = `Bearer ${token}`;
          }

          if (entry.method === 'POST') {
            await apiClient.post(entry.endpoint, entry.payload, { headers: config });
          } else if (entry.method === 'PUT') {
            await apiClient.put(entry.endpoint, entry.payload, { headers: config });
          } else if (entry.method === 'DELETE') {
            await apiClient.delete(entry.endpoint, { headers: config });
          }

          await db.markCompleted(entry.id!);
          processed++;
          this.notify({
            type: 'item-processed',
            itemId: entry.id,
            pendingCount: pending.length - processed
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'فشل الاتصال بالخادم';
          await db.markFailed(entry.id!, msg);
          failed++;
          this.notify({
            type: 'item-failed',
            itemId: entry.id,
            error: msg,
            pendingCount: pending.length - processed - failed
          });
        }

        if (this.isOnline) {
          await new Promise((resolve) => setTimeout(resolve, SYNC_DELAY_BETWEEN_ITEMS_MS));
        }
      }

      await db.cleanupCompleted();

      const remaining = await db.countPending();
      this.notify({ type: 'sync-complete', pendingCount: remaining });
    } catch (err) {
      console.error('Sync queue processing error:', err);
    } finally {
      this.processing = false;
    }

    return { processed, failed };
  }

  destroy(): void {
    this.stop();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    this.listeners.clear();
  }
}

let syncManagerInstance: SyncManager | null = null;

export function getSyncManager(): SyncManager {
  if (typeof window === 'undefined') {
    throw new Error('SyncManager is only available in the browser');
  }
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager();
  }
  return syncManagerInstance;
}
