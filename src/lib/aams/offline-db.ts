'use client';

import Dexie, { type EntityTable } from 'dexie';
import type { Employee } from '@/types/aams';

// Sync queue entry - stores pending mutations to be synced when online
export interface SyncQueueEntry {
  id?: number;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload: Record<string, unknown>;
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  retries: number;
}

// Cached employee data (subset of fields needed offline)
export interface CachedEmployee {
  id: string;
  name: string;
  national_id: string;
  application_id: string;
  application_type?: string;
  key_number: string;
  motorcycle_number: string;
  personal_image: string;
  cached_at: string;
}

// Cached work session
export interface CachedWorkSession {
  id: string;
  employee_id: string;
  employee_name: string;
  start_time: string;
  end_time?: string;
  start_km: number;
  end_km: number;
  distance: number;
  orders_count: number;
  fuel_cost: number;
  status: 'ACTIVE' | 'COMPLETED';
  cached_at: string;
}

// Cache metadata for tracking cache freshness
export interface CacheMeta {
  key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  cached_at: string;
}

// Offline local database
class OfflineDB extends Dexie {
  syncQueue!: EntityTable<SyncQueueEntry, 'id'>;
  employees!: EntityTable<CachedEmployee, 'id'>;
  workSessions!: EntityTable<CachedWorkSession, 'id'>;
  cacheStore!: EntityTable<CacheMeta, 'key'>;

  constructor() {
    super('AAMS_OfflineDB');
    this.version(1).stores({
      syncQueue: '++id, status, created_at',
      employees: 'id, name, national_id',
      workSessions: 'id, employee_id, start_time, status',
      cacheStore: 'key'
    });
  }

  // --- Sync Queue Methods ---

  async enqueueMutation(
    entry: Omit<SyncQueueEntry, 'id' | 'status' | 'retries'>
  ): Promise<number> {
    return this.syncQueue.add({
      ...entry,
      status: 'pending' as const,
      retries: 0
    }) as unknown as number;
  }

  async getPendingMutations(): Promise<SyncQueueEntry[]> {
    return this.syncQueue.where('status').anyOf('pending', 'failed').sortBy('created_at');
  }

  async countPending(): Promise<number> {
    return this.syncQueue.where('status').anyOf('pending', 'failed').count();
  }

  async markCompleted(id: number): Promise<void> {
    await this.syncQueue.update(id, { status: 'completed' });
  }

  async markFailed(id: number, error: string): Promise<void> {
    const entry = await this.syncQueue.get(id);
    if (entry) {
      await this.syncQueue.update(id, {
        status: entry.retries >= 3 ? 'failed' : 'pending',
        error,
        retries: entry.retries + 1
      });
    }
  }

  async markProcessing(id: number): Promise<void> {
    await this.syncQueue.update(id, { status: 'processing' });
  }

  async cleanupCompleted(): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await this.syncQueue
      .where('status')
      .equals('completed')
      .filter((e) => e.created_at < oneDayAgo)
      .delete();
  }

  // --- Employee Cache Methods ---

  async cacheEmployees(emps: Employee[]): Promise<void> {
    const entries: CachedEmployee[] = emps.map((e) => ({
      id: e.id,
      name: e.name,
      national_id: e.national_id,
      application_id: e.application_id,
      application_type: e.application_type,
      key_number: e.key_number,
      motorcycle_number: e.motorcycle_number,
      personal_image: e.personal_image,
      cached_at: new Date().toISOString()
    }));
    await this.employees.bulkPut(entries);
  }

  async getCachedEmployees(): Promise<CachedEmployee[]> {
    return this.employees.toArray();
  }

  async getCachedEmployee(id: string): Promise<CachedEmployee | undefined> {
    return this.employees.get(id);
  }

  // --- Work Session Cache Methods ---

  async cacheWorkSessions(sessions: CachedWorkSession[]): Promise<void> {
    await this.workSessions.bulkPut(sessions);
  }

  async getCachedWorkSessions(limit = 50): Promise<CachedWorkSession[]> {
    return this.workSessions.orderBy('start_time').reverse().limit(limit).toArray();
  }

  // --- Generic Cache Methods ---

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async cacheResponse(key: string, data: any): Promise<void> {
    await this.cacheStore.put({
      key,
      data,
      cached_at: new Date().toISOString()
    });
  }

  async getCachedResponse<T = unknown>(key: string): Promise<T | null> {
    const cached = await this.cacheStore.get(key);
    if (!cached) return null;
    const age = Date.now() - new Date(cached.cached_at).getTime();
    if (age > 7 * 24 * 60 * 60 * 1000) {
      await this.cacheStore.delete(key);
      return null;
    }
    return cached.data as T;
  }

  async clearAll(): Promise<void> {
    await this.syncQueue.clear();
    await this.employees.clear();
    await this.workSessions.clear();
    await this.cacheStore.clear();
  }
}

let dbInstance: OfflineDB | null = null;

export function getOfflineDB(): OfflineDB {
  if (typeof window === 'undefined') {
    throw new Error('OfflineDB is only available in the browser');
  }
  if (!dbInstance) {
    dbInstance = new OfflineDB();
  }
  return dbInstance;
}
