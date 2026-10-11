'use client';

import React from 'react';
import Image from 'next/image';

export function LandingPartners() {
  const partners = [
    {
      name: 'Keeta (كيتا)',
      role: 'شريك خدمات التوصيل السريع',
      logo: '/keeta.png',
      description: 'تشغيل أساطيل مناديب مؤهلة لتغطية مناطق وفروع التوصيل المعتمدة.'
    },
    {
      name: 'Ninja (نينجا)',
      role: 'شريك قطاع التوصيل فائق السرعة',
      logo: '/ninja.png',
      description: 'سرعة استجابة والتزام تام بالمواعيد لتوصيل طلبات المتاجر السحابية.'
    }
  ];

  return (
    <section id='partners' className='py-20 bg-slate-50 border-b border-slate-200'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <div className='text-center max-w-3xl mx-auto mb-14'>
          <span className='inline-block px-3 py-1 rounded-md bg-orange-100 text-orange-800 text-xs font-bold mb-3'>
            شركاء النجاح
          </span>
          <h2 className='text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4'>
            شراكات تشغيلية مع كبرى منصات التوصيل
          </h2>
          <p className='text-base sm:text-lg text-slate-600 leading-relaxed'>
            نفخر في AAMS Logistics بالتعاون والتكامل التشغيلي اليومي مع أهم منصات التوصيل في المملكة
            لتقديم أفضل تجربة توصيل للميل الأخير.
          </p>
        </div>

        {/* Partners Grid (2 prominent partners: Keeta and Ninja) */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto'>
          {partners.map((partner, idx) => (
            <div
              key={idx}
              className='bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col items-center'
            >
              <div className='w-28 h-28 mb-5 rounded-2xl bg-slate-50 border border-slate-100 p-4 flex items-center justify-center'>
                <Image
                  src={partner.logo}
                  alt={partner.name}
                  width={90}
                  height={90}
                  className='object-contain max-h-20 w-auto'
                />
              </div>

              <h3 className='text-xl font-bold text-slate-900 mb-1.5'>{partner.name}</h3>
              <p className='text-xs font-semibold text-orange-600 mb-3'>{partner.role}</p>
              <p className='text-sm text-slate-600 leading-relaxed max-w-sm'>
                {partner.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
