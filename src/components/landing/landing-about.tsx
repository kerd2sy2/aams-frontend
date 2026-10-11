'use client';

import React from 'react';
import { Target, Shield, Zap, TrendingUp, CheckCircle, Users } from 'lucide-react';

export function LandingAbout() {
  const pillars = [
    {
      icon: Target,
      title: 'دقة تشغيلية متناهية',
      description:
        'إلغاء التسجيل اليدوي للأميال والطلبات عبر أتمتة كاملة وتقنيات رؤية حاسوبية مدعومة بالذكاء الاصطناعي.'
    },
    {
      icon: Shield,
      title: 'حماية وصيانة الأسطول',
      description:
        'مراقبة استباقية لمسافات الدبابات والمركبات، وتنبيهات فورية لجدولة تغيير الزيت والصيانة الدورية لمنع الأعطال.'
    },
    {
      icon: TrendingUp,
      title: 'حوافز وشفافية للمناديب',
      description:
        'لوحة أداء فورية لكل مندوب توضح عدد الطلبات المنجزة، ونسبة تحقيق الهدف الشهري، والراتب المتوقع بدقة.'
    },
    {
      icon: Zap,
      title: 'ربط وتشغيل فوري',
      description:
        'تكامل كامل وتوزيع ذكي للطلبات بالتعاون مع كبرى منصات التوصيل العاملة في المملكة العربية السعودية.'
    }
  ];

  return (
    <section id='about' className='py-20 md:py-28 bg-zinc-950/60 relative border-t border-zinc-850'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <div className='text-center max-w-3xl mx-auto mb-16'>
          <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400 text-xs font-semibold mb-3'>
            <span>نبذة عن الشركة ورؤيتنا</span>
          </div>
          <h2 className='text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4'>
            ريادة تقنية في إدارة أساطيل التوصيل السريع
          </h2>
          <p className='text-base sm:text-lg text-zinc-300 leading-relaxed'>
            تأسست <strong className='text-white'>AAMS Logistics</strong> لتكون الشريك التشغيلي
            والتقني الأول لمنصات التوصيل والمشرفين والمناديب الميدانيين، مبتكرين بيئة عمل ذكية تحول
            التحديات الميدانية إلى كفاءة وإنتاجية قياسية.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className='rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 text-right transition-all duration-300 hover:border-orange-500/40 hover:bg-zinc-900/90 hover:-translate-y-1 group'
              >
                <div className='w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-orange-500/20 transition-all'>
                  <Icon className='w-6 h-6' />
                </div>
                <h3 className='text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors'>
                  {pillar.title}
                </h3>
                <p className='text-sm text-zinc-400 leading-relaxed'>{pillar.description}</p>
              </div>
            );
          })}
        </div>

        {/* Company Commitment Banner */}
        <div className='mt-12 rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-900/80 border border-zinc-800 p-8 sm:p-10 text-right relative overflow-hidden'>
          <div className='absolute -left-10 -bottom-10 w-60 h-60 bg-orange-500/10 rounded-full blur-3xl pointer-events-none' />

          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-center'>
            <div className='lg:col-span-8'>
              <h4 className='text-xl sm:text-2xl font-bold text-white mb-3'>
                منظومة متكاملة تخدم المندوب والإدارة
              </h4>
              <p className='text-sm sm:text-base text-zinc-300 leading-relaxed mb-4'>
                سواء كنت مندوباً تبحث عن تجربة استخدام سلسة تحفظ كامل حقوقك وطلباتك المعتمدة وتوفر لك
                الحوافز، أو كنت مشرفاً تدير مئات المركبات والورديات لحظياً — تقدم AAMS كل الأدوات التي
                تحتاجها في شاشة واحدة متناسقة.
              </p>
              <div className='flex flex-wrap gap-4 text-xs sm:text-sm text-zinc-300 font-medium'>
                <span className='inline-flex items-center gap-1.5'>
                  <CheckCircle className='w-4 h-4 text-emerald-400' />
                  دعم متعدد اللغات (العربية، الإنجليزية، الأردية، البنغالية)
                </span>
                <span className='inline-flex items-center gap-1.5'>
                  <CheckCircle className='w-4 h-4 text-emerald-400' />
                  تسجيل بالبصمة الحيوية
                </span>
                <span className='inline-flex items-center gap-1.5'>
                  <CheckCircle className='w-4 h-4 text-emerald-400' />
                  تقارير وأرشفة سحابية فورية
                </span>
              </div>
            </div>

            <div className='lg:col-span-4 flex justify-start lg:justify-end'>
              <div className='rounded-2xl bg-zinc-950/80 border border-zinc-800 p-5 w-full max-w-xs text-center'>
                <Users className='w-8 h-8 text-orange-400 mx-auto mb-2' />
                <div className='text-2xl font-black text-white'>+500</div>
                <div className='text-xs text-zinc-400'>مندوب نشط في الميدان يومياً</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
