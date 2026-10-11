'use client';

import React from 'react';
import Image from 'next/image';
import { Handshake } from 'lucide-react';

export function LandingPartners() {
  const partners = [
    {
      name: 'Keeta (كيتا)',
      role: 'الشريك الاستراتيجي لخدمات التوصيل السريع',
      logo: '/keeta.png',
      description: 'تشغيل وتوزيع أساطيل المناديب لتغطية كافة مناطق التوصيل المعتمدة.'
    },
    {
      name: 'Ninja (نينجا)',
      role: 'شريك قطاع التوصيل فائق السرعة والمتاجر السحابية',
      logo: '/ninja.png',
      description: 'كفاءة زمنية قياسية وسرعة استجابة استثنائية للميل الأخير.'
    },
    {
      name: 'ToYou (تويو)',
      role: 'شريك منظومة خدمات التوصيل والمطاعم والمتاجر',
      logo: '/toyou.png',
      description: 'تكامل تقني وتشغيلي يخدم آلاف العملاء يومياً بجودة موثوقة.'
    }
  ];

  return (
    <section
      id='partners'
      className='py-20 md:py-28 bg-zinc-950/70 border-t border-zinc-850 relative'
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <div className='text-center max-w-3xl mx-auto mb-16'>
          <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400 text-xs font-semibold mb-3'>
            <Handshake className='w-4 h-4 text-orange-400' />
            <span>شركاء النجاح والتشغيل</span>
          </div>
          <h2 className='text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4'>
            شراكات تشغيلية مع كبرى منصات التوصيل
          </h2>
          <p className='text-base sm:text-lg text-zinc-300 leading-relaxed'>
            نفخر في AAMS Logistics بالعمل المشترك والتكامل التشغيلي المتواصل مع أهم منصات وشركات
            التوصيل الرائدة في المملكة.
          </p>
        </div>

        {/* Partners Cards */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
          {partners.map((partner, idx) => (
            <div
              key={idx}
              className='group rounded-3xl bg-zinc-900/80 border border-zinc-800 p-8 text-center transition-all duration-300 hover:border-orange-500/40 hover:bg-zinc-900 hover:-translate-y-1 shadow-lg shadow-black/40'
            >
              <div className='w-24 h-24 mx-auto mb-6 rounded-2xl bg-zinc-950 border border-zinc-800 p-3.5 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-hover:border-orange-500/30 shadow-inner'>
                <Image
                  src={partner.logo}
                  alt={partner.name}
                  width={80}
                  height={80}
                  className='object-contain max-h-16 w-auto'
                />
              </div>

              <h3 className='text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors'>
                {partner.name}
              </h3>
              <p className='text-xs font-semibold text-orange-400 mb-3'>{partner.role}</p>
              <p className='text-sm text-zinc-400 leading-relaxed'>{partner.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
