'use client';

import { useEffect, useState } from 'react';
import {
  useQuery,
  type UseQueryOptions,
  type QueryFunctionContext,
  skipToken
} from '@tanstack/react-query';
import { getOfflineDB } from '@/lib/aams/offline-db';
import { isNetworkError } from '@/lib/aams/network-utils';

const memoryCache = new Map<string, unknown>();

export function useOfflineQuery<TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError> & { cacheKey: string }
) {
  const { cacheKey, ...queryOptions } = options;
  const [initialData, setInitialData] = useState<TData | undefined>();

  useEffect(() => {
    let cancelled = false;

    setInitialData(undefined);

    const memCached = memoryCache.get(cacheKey) as TData | undefined;
    if (memCached !== undefined) {
      setInitialData(memCached);
      return;
    }

    const db = getOfflineDB();
    db.getCachedResponse<TData>(cacheKey)
      .then((data) => {
        if (cancelled) return;
        if (data) {
          memoryCache.set(cacheKey, data);
          setInitialData(data);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  const query = useQuery<TData, TError>({
    ...queryOptions,
    initialData,
    initialDataUpdatedAt: 0,
    retry: (failureCount, error) => {
      if (isNetworkError(error)) return false;
      return failureCount < 2;
    },
    gcTime: (queryOptions as { gcTime?: number }).gcTime ?? 24 * 60 * 60 * 1000,
    staleTime: (queryOptions as { staleTime?: number }).staleTime ?? 5 * 60 * 1000,
    networkMode: 'always',
    queryFn:
      queryOptions.queryFn === skipToken
        ? skipToken
        : async (ctx: QueryFunctionContext) => {
            try {
              const fn = queryOptions.queryFn as (ctx: QueryFunctionContext) => Promise<TData>;
              const data = await fn(ctx);
              memoryCache.set(cacheKey, data);
              const db = getOfflineDB();
              db.cacheResponse(cacheKey, data).catch(() => {});
              return data;
            } catch (err) {
              if (isNetworkError(err)) {
                const memCached = memoryCache.get(cacheKey) as TData | undefined;
                if (memCached !== undefined) return memCached;

                const db = getOfflineDB();
                const diskCached = await db.getCachedResponse<TData>(cacheKey);
                if (diskCached) {
                  memoryCache.set(cacheKey, diskCached);
                  return diskCached;
                }
              }
              throw err;
            }
          }
  });

  const isOffline = query.isError && isNetworkError(query.error);

  return { ...query, isOffline };
}

export async function offlineAwareFetch<T>(cacheKey: string, apiFn: () => Promise<T>): Promise<T> {
  try {
    const data = await apiFn();
    memoryCache.set(cacheKey, data);
    const db = getOfflineDB();
    db.cacheResponse(cacheKey, data).catch(() => {});
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      const memCached = memoryCache.get(cacheKey) as T | undefined;
      if (memCached !== undefined) return memCached;

      const db = getOfflineDB();
      const cached = await db.getCachedResponse<T>(cacheKey);
      if (cached) {
        memoryCache.set(cacheKey, cached);
        return cached;
      }
    }
    throw err;
  }
}

export async function cacheInOfflineDB(key: string, data: unknown): Promise<void> {
  memoryCache.set(key, data);
  const db = getOfflineDB();
  await db.cacheResponse(key, data);
}

export function clearOfflineMemoryCache(): void {
  memoryCache.clear();
}
