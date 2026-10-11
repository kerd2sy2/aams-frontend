'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Target, Shield, TrendingUp, Zap, CheckCircle2 } from 'lucide-react';

export function LandingAbout() {
  const pillars = [
    {
      icon: Target,
      title: 'دقة تشغيلية وتوثيق متكامل',
      description:
        'أتمتة شاملة لتسجيل وتوثيق قراءات العدادات وبيانات المركبات لحماية أصول الأسطول ومنع الأخطاء البشرية.'
    },
    {
      icon: Shield,
      title: 'جدولة الصيانة الدورية',
      description:
        'متابعة مستمرة للمسافات المقطوعة وتنبيهات مسبقة لتغيير الزيت والفحص الدوري لضمان سلامة الأسطول واستمرارية العمل.'
    },
    {
      icon: TrendingUp,
      title: 'شفافية الحوافز ومؤشرات الأداء',
      description:
        'لوحة أداء واضحة للمندوب تعرض إنجازه اليومي والشهري واستحقاقات الحوافز بكل وضوح وموثوقية.'
    },
    {
      icon: Zap,
      title: 'تشغيل ميداني على مدار الساعة',
      description:
        'توزيع تشغيلي مرن يلبي متطلبات كبرى منصات التوصيل في المملكة، مع دعم ميداني متواصل لضمان انسيابية العمل.'
    }
  ];

  return (
    <section id='about' className='py-20 bg-slate-50 border-b border-slate-200 overflow-hidden'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className='text-center max-w-3xl mx-auto mb-14'
        >
          <span className='inline-block px-3 py-1 rounded-md bg-orange-100 text-orange-800 text-xs font-bold mb-3'>
            عن شركة AAMS
          </span>
          <h2 className='text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4'>
            شريكك التشغيلي الموثوق لإدارة وتنمية الأسطول
          </h2>
          <p className='text-base sm:text-lg text-slate-600 leading-relaxed'>
            نعمل في <strong className='text-slate-900 font-bold'>AAMS Logistics</strong> على تطوير
            منظومة عمل متقدمة تخدم كلاً من المندوب وإدارة الأسطول، تجمع بين سهولة الاستخدام، دقة
            التوثيق، وحفظ حقوق جميع الأطراف.
          </p>
        </motion.div>

        {/* Pillars Cards with stagger animation */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className='bg-white rounded-2xl border border-slate-200 p-6 text-right shadow-2xs hover:shadow-md transition-shadow'
              >
                <div className='w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center mb-5'>
                  <Icon className='w-5 h-5' />
                </div>
                <h3 className='text-lg font-bold text-slate-900 mb-2'>{pillar.title}</h3>
                <p className='text-sm text-slate-600 leading-relaxed'>{pillar.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Enterprise Commitment Box */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className='mt-12 rounded-2xl bg-white border border-slate-200 p-8 sm:p-10 text-right shadow-2xs'
        >
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-center'>
            <div className='lg:col-span-8'>
              <h3 className='text-xl sm:text-2xl font-bold text-slate-900 mb-3'>
                منظومة موحدة تجمع المندوب والمشرف وإدارة الأسطول
              </h3>
              <p className='text-sm sm:text-base text-slate-600 leading-relaxed mb-5'>
                سواء كنت مندوباً في الميدان يحتاج إلى تطبيق مرن يسهل عمله اليومي ويحفظ كامل بياناته،
                أو مشرفاً يدير حركة وتوزيع أسطول المركبات والتنسيق مع المنصات — توفر منصة AAMS كافة
                الأدوات بدقة متناهية.
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
        </motion.div>
      </div>
    </section>
  );
}
