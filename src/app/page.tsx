import React from 'react';
import type { Metadata } from 'next';
import { LandingNavbar } from '@/components/landing/landing-navbar';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingAbout } from '@/components/landing/landing-about';
import { LandingFeatures } from '@/components/landing/landing-features';
import { LandingPartners } from '@/components/landing/landing-partners';
import { LandingDownloadSection } from '@/components/landing/landing-download-section';
import { LandingFooter } from '@/components/landing/landing-footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://aams.kerd2sy.com'),
  title: 'AAMS Logistics | المنظومة الذكية لإدارة الأساطيل وتطبيق المناديب',
  description:
    'الصفحة الرسمية لشركة AAMS اللوجستية وتطبيق المناديب الميداني على متجر Google Play. حلول متكاملة لإدارة الأساطيل، قراءة العدادات بالذكاء الاصطناعي، وتتبع الورديات لحظياً.',
  keywords: [
    'AAMS',
    'AAMS Logistics',
    'إدارة الأساطيل',
    'تطبيق المناديب',
    'توصيل الطلبات',
    'كيتا',
    'نينجا',
    'تويو',
    'قراءة العدادات بالذكاء الاصطناعي',
    'Google Play'
  ],
  openGraph: {
    title: 'AAMS Logistics | المنظومة الذكية لإدارة الأساطيل وتطبيق المناديب',
    description:
      'الصفحة الرسمية لشركة AAMS اللوجستية وتطبيق المناديب الميداني على Google Play. ابدأ ورديتك وتتبع أداءك بدقة وذكاء.',
    url: 'https://aams.kerd2sy.com',
    siteName: 'AAMS Logistics',
    type: 'website',
    images: [
      {
        url: '/logo-glow.png',
        width: 604,
        height: 604,
        alt: 'AAMS Logistics'
      }
    ]
  }
};

export default function LandingPage() {
  return (
    <div
      dir='rtl'
      className='min-h-screen bg-[#09090b] text-zinc-100 selection:bg-orange-500/30 selection:text-orange-200 antialiased overflow-x-hidden'
    >
      {/* Top Navigation */}
      <LandingNavbar />

      {/* Main Content Sections */}
      <main>
        {/* 1. Hero Section with Company Intro + QR Card Showcase */}
        <LandingHero />

        {/* 2. About Company & Vision Pillars */}
        <LandingAbout />

        {/* 3. Deep-Dive App Features & Capabilities */}
        <LandingFeatures />

        {/* 4. Strategic Delivery Partners (Keeta, Ninja, ToYou) */}
        <LandingPartners />

        {/* 5. Focal Download Section with Large QR Code & Guidance */}
        <LandingDownloadSection />
      </main>

      {/* Official Footer */}
      <LandingFooter />
    </div>
  );
}
