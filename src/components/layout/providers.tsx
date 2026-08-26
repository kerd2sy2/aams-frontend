'use client';
import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { ActiveThemeProvider } from '../themes/active-theme';
import QueryProvider from './query-provider';
import { LocaleProvider } from './locale-provider';
import { ErrorCapture } from '@/components/aams/error-capture';
import type { Locale } from '@/lib/i18n';

export default function Providers({
  activeThemeValue,
  initialLocale,
  children
}: {
  activeThemeValue: string;
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <ActiveThemeProvider initialTheme={activeThemeValue}>
        <LocaleProvider initialLocale={initialLocale}>
          <QueryProvider>
            <ErrorCapture />
            {children}
          </QueryProvider>
        </LocaleProvider>
      </ActiveThemeProvider>
    </ClerkProvider>
  );
}
