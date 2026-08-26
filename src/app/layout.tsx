import Providers from '@/components/layout/providers';
import { Toaster } from '@/components/ui/sonner';
import { fontVariables } from '@/components/themes/font.config';
import { DEFAULT_THEME, THEMES } from '@/components/themes/theme.config';
import ThemeProvider from '@/components/themes/theme-provider';
import { cn } from '@/lib/utils';
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from '@/lib/i18n';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { cookies } from 'next/headers';
import NextTopLoader from 'nextjs-toploader';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import '../styles/globals.css';

const META_THEME_COLORS = {
  light: '#ffffff',
  dark: '#09090b'
};

export const metadata: Metadata = {
  ...(process.env.NEXT_PUBLIC_APP_URL
    ? { metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL) }
    : {}),
  title: {
    default: 'AAMS - نظام إدارة ومتابعة مناديب التوصيل والأسطول',
    template: '%s | AAMS'
  },
  description:
    'نظام متكامل لإدارة ومتابعة مناديب التوصيل، الورديات، العهد المالية، وإدارة الأسطول والمركبات.',
  openGraph: {
    title: 'AAMS - نظام إدارة ومتابعة مناديب التوصيل والأسطول',
    description:
      'نظام متكامل لإدارة ومتابعة مناديب التوصيل، الورديات، العهد المالية، وإدارة الأسطول والمركبات.',
    siteName: 'AAMS',
    type: 'website'
  }
};

export const viewport: Viewport = {
  themeColor: META_THEME_COLORS.light
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const activeThemeValue = cookieStore.get('active_theme')?.value;
  const isValidTheme = THEMES.some((t) => t.value === activeThemeValue);
  const themeToApply = isValidTheme ? activeThemeValue! : DEFAULT_THEME;

  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = localeCookie === 'en' ? 'en' : DEFAULT_LOCALE;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning data-theme={themeToApply}>
      <head>
        <Script
          id='theme-color'
          strategy='beforeInteractive'
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // Set meta theme color
                if (localStorage.theme === 'dark' || ((!('theme' in localStorage) || localStorage.theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '${META_THEME_COLORS.dark}')
                }
              } catch (_) {}
            `
          }}
        />
      </head>
      <body
        className={cn(
          'bg-background overflow-x-hidden overscroll-none font-sans antialiased',
          fontVariables
        )}
      >
        <NextTopLoader color='var(--primary)' showSpinner={false} />
        <NuqsAdapter>
          <ThemeProvider
            attribute='class'
            defaultTheme='system'
            enableSystem
            disableTransitionOnChange
            enableColorScheme
          >
            <Providers activeThemeValue={themeToApply} initialLocale={locale}>
              <Toaster />
              {children}
            </Providers>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}