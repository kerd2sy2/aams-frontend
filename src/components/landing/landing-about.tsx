'use client';

import React from 'react';
import { Target, Shield, TrendingUp, Zap, CheckCircle2 } from 'lucide-react';

export function LandingAbout() {
  const pillars = [
    {
      icon: Target,
      title: 'دقة تشغيلية وتوثيق متكامل',
      description:
        'أتمتة كاملة لتسجيل حضور وانصراف المناديب، ومطابقة قراءات عدادات الكيلومتر واللوحات لحماية أصول الأسطول ومنع الأخطاء.'
    },
    {
      icon: Shield,
      title: 'جدولة الصيانة الدورية',
      description:
        'متابعة المسافات الفعلية المقطوعة لكل دباب وتنبيهات مسبقة لتغيير الزيت والفحص الدوري لضمان سلامة المركبة واستمرارية العمل.'
    },
    {
      icon: TrendingUp,
      title: 'شفافية الحوافز والأهداف',
      description:
        'لوحة أداء واضحة للمندوب تعرض الطلبات المعتمدة، شريط تحقيق الهدف الشهري، والراتب المتوقع بدقة ودون تعقيد.'
    },
    {
      icon: Zap,
      title: 'تشغيل ميداني على مدار الساعة',
      description:
        'توزيع تشغيلي مرن يلبي متطلبات كبرى منصات التوصيل في المملكة، مع دعم ميداني متواصل لحل العقبات فوراً.'
    }
  ];

  return (
    <section id='about' className='py-20 bg-slate-50 border-b border-slate-200'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <div className='text-center max-w-3xl mx-auto mb-14'>
          <span className='inline-block px-3 py-1 rounded-md bg-orange-100 text-orange-800 text-xs font-bold mb-3'>
            عن شركة AAMS
          </span>
          <h2 className='text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4'>
            شريكك التشغيلي الموثوق لإدارة وتنمية الأسطول
          </h2>
          <p className='text-base sm:text-lg text-slate-600 leading-relaxed'>
            نعمل في <strong className='text-slate-900 font-bold'>AAMS Logistics</strong> على تطوير
            منظومة عمل ميدانية متقدمة تخدم كلاً من المندوب وإدارة الأسطول، تجمع بين سهولة الاستخدام، دقة
            التوثيق، وحفظ حقوق جميع الأطراف.
          </p>
        </div>

        {/* Pillars Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className='bg-white rounded-2xl border border-slate-200 p-6 text-right shadow-xs hover:shadow-md transition-shadow duration-200'
              >
                <div className='w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center mb-5'>
                  <Icon className='w-5 h-5' />
                </div>
                <h3 className='text-lg font-bold text-slate-900 mb-2'>{pillar.title}</h3>
                <p className='text-sm text-slate-600 leading-relaxed'>{pillar.description}</p>
              </div>
            );
          })}
        </div>

        {/* Enterprise Commitment Box */}
        <div className='mt-12 rounded-2xl bg-white border border-slate-200 p-8 sm:p-10 text-right shadow-xs'>
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-center'>
            <div className='lg:col-span-8'>
              <h3 className='text-xl sm:text-2xl font-bold text-slate-900 mb-3'>
                منظومة موحدة تجمع المندوب والمشرف وإدارة الأسطول
              </h3>
              <p className='text-sm sm:text-base text-slate-600 leading-relaxed mb-5'>
                سواء كنت مندوباً في الميدان يحتاج إلى تسجيل ورديته ومتابعة إنجازه اليومي، أو مشرفاً
                يتابع مئات الورديات والمركبات وتوزيع الطلبات — توفر منصة AAMS كافة البيانات بدقة
                متناهية.
              </p>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm text-slate-700 font-medium'>
                <div className='flex items-center gap-2'>
                  <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0' />
                  <span>دعم لغات متعددة للمناديب</span>
                </div>
                <div className='flex items-center gap-2'>
                  <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0' />
                  <span>تسجيل سريع بالبصمة الحيوية</span>
                </div>
                <div className='flex items-center gap-2'>
                  <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0' />
                  <span>تقارير مالية وتشغيلية معتمدة</span>
                </div>
              </div>
            </div>

            <div className='lg:col-span-4 flex justify-center lg:justify-end'>
              <div className='w-full max-w-xs rounded-xl bg-slate-50 border border-slate-200 p-6 text-center'>
                <div className='text-3xl font-black text-slate-900'>+500</div>
                <div className='text-xs font-semibold text-orange-600 mt-1 mb-2'>
                  مندوب نشط يومياً
                </div>
                <p className='text-xs text-slate-500 leading-relaxed'>
                  تغطية واسعة لمدن ومناطق التوصيل بالمملكة العربية السعودية
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
