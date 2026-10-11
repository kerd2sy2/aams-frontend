import React from 'react';
import type { Metadata } from 'next';
import { LandingNavbar } from '@/components/landing/landing-navbar';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingAbout } from '@/components/landing/landing-about';
import { LandingFeatures } from '@/components/landing/landing-features';
import { LandingPartners } from '@/components/landing/landing-partners';
import { LandingDownloadSection } from '@/components/landing/landing-download-section';
import { LandingFooter } from '@/components/landing/landing-footer';
import type { AppSettings } from '@/types/aams';

export const metadata: Metadata = {
  metadataBase: new URL('https://aams.kerd2sy.com'),
  title: 'AAMS Logistics | شركة أسطول التوصيل للخدمات اللوجستية',
  description:
    'شركة AAMS للخدمات اللوجستية - المنظومة التشغيلية المتكاملة لإدارة أساطيل التوصيل وتشغيل المناديب الميدانيين بالمملكة العربية السعودية.',
  keywords: [
    'AAMS',
    'AAMS Logistics',
    'أسطول التوصيل',
    'تطبيق المناديب',
    'توصيل الطلبات',
    'كيتا',
    'نينجا',
    'Google Play'
  ],
  openGraph: {
    title: 'AAMS Logistics | شركة أسطول التوصيل للخدمات اللوجستية',
    description:
      'المنظومة التشغيلية المتكاملة لإدارة أساطيل التوصيل وتشغيل المناديب الميدانيين بالمملكة العربية السعودية.',
    url: 'https://aams.kerd2sy.com',
    siteName: 'AAMS Logistics',
    type: 'website',
    images: [
      {
        url: '/logo.png',
        width: 240,
        height: 240,
        alt: 'AAMS Logistics'
      }
    ]
  }
};

async function getPublicSettings(): Promise<AppSettings> {
  const fallback: AppSettings = {
    site_name: 'AAMS Logistics',
    logo_url: '/logo.png',
    app_download_url: 'https://play.google.com/store/apps/details?id=com.aams.app'
  };

  try {
    const apiHost = process.env.API_HOST || 'http://localhost:8081';
    const res = await fetch(`${apiHost}/api/v1/settings/public`, {
      next: { revalidate: 30 }
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    return {
      site_name: data.site_name || fallback.site_name,
      logo_url: data.logo_url || fallback.logo_url,
      app_download_url: data.app_download_url || fallback.app_download_url
    };
  } catch {
    return fallback;
  }
}

export default async function LandingPage() {
  const settings = await getPublicSettings();
  const logoUrl = settings.logo_url || '/logo.png';
  const appUrl =
    settings.app_download_url || 'https://play.google.com/store/apps/details?id=com.aams.app';

  return (
    <div
      dir='rtl'
      className='min-h-screen bg-white text-slate-800 selection:bg-orange-100 selection:text-orange-900 antialiased overflow-x-hidden font-sans'
    >
      {/* 1. Navbar with Official Logo */}
      <LandingNavbar logoUrl={logoUrl} siteName={settings.site_name} />

      {/* Main Content */}
      <main>
        {/* 2. Hero with Company Overview */}
        <LandingHero />

        {/* 3. About Company and Operational Pillars */}
        <LandingAbout />

        {/* 4. Features & Mobile App Workflows */}
        <LandingFeatures />

        {/* 5. Delivery Partners (Keeta, Ninja) */}
        <LandingPartners />

        {/* 6. Download Section with QR Code */}
        <LandingDownloadSection appUrl={appUrl} logoUrl={logoUrl} />
      </main>

      {/* 7. Footer */}
      <LandingFooter logoUrl={logoUrl} siteName={settings.site_name} />
    </div>
  );
}
