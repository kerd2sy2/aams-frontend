'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Target, Shield, TrendingUp, Zap, CheckCircle2, Award } from 'lucide-react';

export function LandingAbout() {
  const pillars = [
    {
      icon: Target,
      title: 'كفاءة تشغيلية في الميل الأخير',
      description:
        'إدارة متكاملة لحركة وتوزيع الأسطول الميداني لضمان سرعة الاستجابة ودقة التوصيل في كافة مناطق الخدمة.'
    },
    {
      icon: Shield,
      title: 'شراكات معتمدة وموثوقة',
      description:
        'تكامل تقني وعملياتي مباشر مع كبرى منصات التوصيل السريع بالمملكة لتنفيذ أعلى معايير الجودة والالتزام.'
    },
    {
      icon: TrendingUp,
      title: 'شفافية الأداء والإنتاجية',
      description:
        'منظومة واضحة تمكّن المندوب من متابعة مؤشرات أدائه اليومية والتحفيزية بكل دقة ووضوح وموثوقية.'
    },
    {
      icon: Zap,
      title: 'دعم ومساندة ميدانية مستمرة',
      description:
        'فريق إشراف ميداني متواجد على مدار الساعة لتذليل العقبات وتقديم الدعم الفوري لكافة كوادرنا التشغيلية.'
    }
  ];

  return (
    <section id='about' className='py-16 sm:py-20 bg-slate-50 border-b border-slate-200'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className='text-center max-w-3xl mx-auto mb-12 sm:mb-14'
        >
          <span className='inline-block px-3 py-1 rounded-md bg-orange-100 text-orange-800 text-xs font-bold mb-3'>
            عن شركة AAMS
          </span>
          <h2 className='text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4'>
            الشريك التشغيلي الموثوق لأساطيل التوصيل السريع
          </h2>
          <p className='text-base sm:text-lg text-slate-600 leading-relaxed'>
            نعمل في <strong className='text-slate-900 font-bold'>AAMS Logistics</strong> على تقديم
            حلول متكاملة لإدارة العمليات الميدانية، تجمع بين التكنولوجيا المتقدمة وتجربة المستخدم
            السلسة لحفظ حقوق جميع الأطراف وتحقيق أعلى إنتاجية.
          </p>
        </motion.div>

        {/* Pillars Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className='bg-white rounded-2xl border border-slate-200 p-6 text-right shadow-2xs hover:shadow-md hover:border-orange-200 transition-all'
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
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className='mt-12 rounded-2xl bg-white border border-slate-200 p-7 sm:p-10 text-right shadow-2xs'
        >
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-center'>
            <div className='lg:col-span-8'>
              <h3 className='text-xl sm:text-2xl font-bold text-slate-900 mb-3'>
                منظومة موحدة تربط الميدان بالإشراف المركزي
              </h3>
              <p className='text-sm sm:text-base text-slate-600 leading-relaxed mb-6'>
                صُممت منصة AAMS لتوفر بيئة عمل رقمية متكاملة تضمن سهولة التواصل، سرعة التوجيه، ودقة
                التنفيذ لكافة كوادر التوصيل المشتركة مع كبرى المنصات في المملكة.
              </p>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm text-slate-700 font-medium'>
                <div className='flex items-center gap-2'>
                  <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0' />
                  <span>دعم متعدد اللغات للمناديب</span>
                </div>
                <div className='flex items-center gap-2'>
                  <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0' />
                  <span>تسجيل دخول سريع وآمن بالبصمة</span>
                </div>
                <div className='flex items-center gap-2'>
                  <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0' />
                  <span>تقارير تشغيلية معتمدة ولحظية</span>
                </div>
              </div>
            </div>

            <div className='lg:col-span-4 flex justify-center lg:justify-end'>
              <div className='w-full max-w-xs rounded-xl bg-slate-50 border border-slate-200 p-6 text-center'>
                <div className='w-12 h-12 rounded-xl bg-orange-100 text-orange-600 mx-auto flex items-center justify-center mb-3'>
                  <Award className='w-6 h-6' />
                </div>
                <div className='text-base font-bold text-slate-900'>اعتماد تشغيلي رسمي</div>
                <p className='text-xs text-slate-500 leading-relaxed mt-1'>
                  شريك معتمد ومسجل لتقديم خدمات الميل الأخير والتوصيل السريع بالمملكة
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
