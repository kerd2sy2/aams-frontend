'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className='bg-card border-border w-full overflow-hidden rounded-2xl border shadow-sm'>
      <div className='bg-muted/60 flex items-center gap-6 px-5 py-3.5'>
        <Skeleton className='h-4 w-28' />
        <Skeleton className='hidden h-4 w-20 sm:block' />
        <Skeleton className='hidden h-4 w-24 md:block' />
        <Skeleton className='ms-auto h-4 w-16' />
      </div>

      <div className='divide-border divide-y'>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className='flex items-center gap-4 px-5 py-3.5 sm:gap-6'>
            <Skeleton className='size-10 shrink-0 rounded-full' />
            <div className='min-w-0 flex-1 space-y-1.5'>
              <Skeleton className='h-4 w-36' />
              <Skeleton className='h-3 w-20' />
            </div>
            <Skeleton className='hidden h-4 w-20 sm:block' />
            <Skeleton className='hidden h-4 w-16 md:block' />
            <Skeleton className='h-8 w-20 shrink-0 rounded-lg' />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className='space-y-6 md:space-y-8'>
      <div className='space-y-2'>
        <Skeleton className='h-4 w-48' />
        <Skeleton className='h-8 w-64 rounded-lg' />
        <Skeleton className='h-4 w-72' />
      </div>

      <div className='grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4'>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className='bg-card border-border space-y-3 rounded-2xl border p-5 shadow-sm'
          >
            <div className='flex items-center justify-between'>
              <Skeleton className='h-3 w-24' />
              <Skeleton className='size-10 rounded-xl' />
            </div>
            <Skeleton className='h-7 w-20 rounded-lg' />
            <Skeleton className='h-3 w-32' />
          </div>
        ))}
      </div>

      <div className='grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className='bg-card border-border space-y-4 rounded-2xl border p-5 shadow-sm'
          >
            <div className='flex items-center justify-between'>
              <div className='space-y-1.5'>
                <Skeleton className='h-4 w-28' />
                <Skeleton className='h-3 w-20' />
              </div>
              <Skeleton className='size-2.5 rounded-full' />
            </div>
            <Skeleton className='h-[220px] rounded-xl' />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`bg-card border-border space-y-4 rounded-2xl border p-6 shadow-sm ${className ?? ''}`}
    >
      <Skeleton className='h-5 w-40' />
      <Skeleton className='h-4 w-full' />
      <Skeleton className='h-4 w-3/4' />
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className='mx-auto max-w-4xl space-y-6'>
      <div className='flex items-center justify-between'>
        <Skeleton className='h-5 w-24' />
        <Skeleton className='h-10 w-24 rounded-lg' />
      </div>

      <div className='bg-card border-border space-y-6 rounded-2xl border p-6 shadow-sm'>
        <div className='flex items-center gap-4'>
          <Skeleton className='size-16 rounded-full' />
          <div className='space-y-2'>
            <Skeleton className='h-6 w-40' />
            <Skeleton className='h-4 w-28' />
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4 md:grid-cols-3'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='space-y-1.5'>
              <Skeleton className='h-3 w-16' />
              <Skeleton className='h-5 w-24' />
            </div>
          ))}
        </div>
      </div>

      <div className='bg-card border-border space-y-4 rounded-2xl border p-6 shadow-sm'>
        <Skeleton className='h-5 w-32' />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='flex items-center gap-4'>
            <Skeleton className='size-10 shrink-0 rounded-full' />
            <div className='flex-1 space-y-1.5'>
              <Skeleton className='h-4 w-36' />
              <Skeleton className='h-3 w-24' />
            </div>
            <Skeleton className='h-4 w-16' />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className='mx-auto max-w-4xl space-y-6'>
      <Skeleton className='h-6 w-48' />

      <div className='bg-card border-border space-y-6 rounded-2xl border p-6 shadow-sm'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className='space-y-2'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-10 w-full rounded-lg' />
          </div>
        ))}

        <div className='flex gap-3 pt-4'>
          <Skeleton className='h-10 w-32 rounded-lg' />
          <Skeleton className='h-10 w-24 rounded-lg' />
        </div>
      </div>
    </div>
  );
}

export function CardPageSkeleton() {
  return (
    <div className='flex min-h-svh items-center justify-center p-4'>
      <div className='bg-card border-border w-full max-w-md space-y-6 rounded-2xl border p-8 shadow-sm'>
        <div className='flex flex-col items-center gap-3'>
          <Skeleton className='size-20 rounded-full' />
          <Skeleton className='h-6 w-36' />
          <Skeleton className='h-4 w-24' />
        </div>
        <div className='space-y-3'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-4 w-full' />
          ))}
        </div>
        <Skeleton className='h-24 w-full rounded-lg' />
        <Skeleton className='h-10 w-full rounded-lg' />
      </div>
    </div>
  );
}

export function UserCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className='grid gap-4 sm:grid-cols-1 lg:grid-cols-2'>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className='bg-card border-border overflow-hidden rounded-2xl border shadow-sm'
        >
          <div className='px-6 pb-6 pt-6'>
            <div className='flex items-start justify-between gap-3'>
              <div className='flex min-w-0 items-center gap-3'>
                <Skeleton className='size-12 shrink-0 rounded-full' />
                <div className='min-w-0 space-y-1.5'>
                  <Skeleton className='h-5 w-28' />
                  <Skeleton className='h-3 w-20' />
                </div>
              </div>
              <Skeleton className='h-6 w-16 rounded-full' />
            </div>
            <div className='mt-4 space-y-2'>
              <Skeleton className='h-3 w-40' />
              <Skeleton className='h-3 w-32' />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkSkeleton() {
  return (
    <div className='mx-auto max-w-4xl space-y-6'>
      <div className='space-y-2'>
        <Skeleton className='h-8 w-48 rounded-lg' />
        <Skeleton className='h-4 w-72' />
      </div>

      <div className='bg-card border-border space-y-4 rounded-2xl border p-5 shadow-sm'>
        <Skeleton className='h-4 w-32' />
        <div className='flex gap-2'>
          <Skeleton className='h-12 flex-1 rounded-xl' />
          <Skeleton className='h-12 w-12 shrink-0 rounded-xl' />
          <Skeleton className='h-12 w-12 shrink-0 rounded-xl' />
        </div>
        <div className='flex gap-2 pt-1'>
          <Skeleton className='h-7 w-28 rounded-full' />
          <Skeleton className='h-7 w-28 rounded-full' />
        </div>
      </div>

      <div className='bg-card border-border overflow-hidden rounded-2xl border shadow-sm'>
        <div className='border-border flex items-center justify-between border-b px-5 py-4'>
          <div className='flex items-center gap-3'>
            <Skeleton className='size-12 shrink-0 rounded-full' />
            <div className='space-y-1.5'>
              <Skeleton className='h-5 w-36' />
              <Skeleton className='h-3 w-28' />
            </div>
          </div>
          <Skeleton className='h-6 w-20 rounded-full' />
        </div>

        <div className='space-y-5 p-5'>
          <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-12 w-full rounded-xl' />
            </div>
            <div className='space-y-1.5'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-12 w-full rounded-xl' />
            </div>
            <div className='space-y-1.5'>
              <Skeleton className='h-4 w-32' />
              <Skeleton className='h-12 w-full rounded-xl' />
            </div>
            <div className='space-y-1.5'>
              <Skeleton className='h-4 w-28' />
              <Skeleton className='h-12 w-full rounded-xl' />
            </div>
          </div>

          <div className='space-y-1.5 sm:col-span-2'>
            <Skeleton className='h-4 w-28' />
            <Skeleton className='h-24 w-full rounded-2xl' />
          </div>

          <Skeleton className='h-16 w-full rounded-2xl' />
        </div>
      </div>
    </div>
  );
}
