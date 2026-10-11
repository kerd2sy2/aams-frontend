'use client';

import React from 'react';
import { Camera, Clock, Wrench, Award, Fingerprint, FileSpreadsheet, Check } from 'lucide-react';

export function LandingFeatures() {
  const features = [
    {
      icon: Camera,
      title: 'الذكاء الاصطناعي وقراءة العدادات',
      tag: 'AI OCR',
      color: 'from-orange-500/20 to-amber-500/20',
      iconColor: 'text-orange-400',
      borderColor: 'group-hover:border-orange-500/50',
      description:
        'تقنية رؤية حاسوبية فائقة الدقة تقرأ أرقام عدادات الكيلومتر ولوحات المركبات مباشرة عبر كاميرا الهاتف، مما يلغي تماماً التسجيل اليدوي ويمنع التلاعب.',
      highlights: ['قراءة فورية للعدادات', 'توثيق بصري للوحة الدباب', 'فحص دقيق لمنع التكرار']
    },
    {
      icon: Clock,
      title: 'إدارة وتتبع الورديات لحظياً',
      tag: 'Smart Shifts',
      color: 'from-sky-500/20 to-blue-500/20',
      iconColor: 'text-sky-400',
      borderColor: 'group-hover:border-sky-500/50',
      description:
        'بدء وإنهاء الدوام بنقرة واحدة، مع تتبع آلي للمسافة المقطوعة وعدد ساعات العمل ومقارنة الدباب المخصص مع الدباب الفعلي.',
      highlights: ['حساب دقيق للمسافات', 'متابعة مباشرة للشفت النشط', 'اعتماد المشرف الفوري']
    },
    {
      icon: Wrench,
      title: 'جدولة الصيانة وتغيير الزيت',
      tag: 'Fleet Health',
      color: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-400',
      borderColor: 'group-hover:border-amber-500/50',
      description:
        'نظام استباقي يراقب المسافات المقطوعة لكل دباب، ويرسل تنبيهات مبكرة عند استحقاق تغيير زيت المحرك أو موعد الفحص الدوري.',
      highlights: ['تنبيهات استباقية بالمسافات', 'حماية محركات الأسطول', 'سجل صيانة شامل لكل مركبة']
    },
    {
      icon: Award,
      title: 'نظام الأهداف والمكافآت (Target)',
      tag: 'Incentives',
      color: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400',
      borderColor: 'group-hover:border-emerald-500/50',
      description:
        'لوحة تحفيزية واضحة للمندوب تعرض إجمالي الطلبات المعتمدة والطلبات المتبقية لتحقيق التارجت والراتب والحوافز المتوقعة.',
      highlights: ['شريط تقدم الإنجاز الشهري', 'احتساب حوافز الطلبات الإضافية', 'شفافية مالية تامة']
    },
    {
      icon: Fingerprint,
      title: 'دخول سريع وأمان بالبصمة الحيوية',
      tag: 'Security & Auth',
      color: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-400',
      borderColor: 'group-hover:border-purple-500/50',
      description:
        'تسجيل دخول سهل عبر رقم الهوية وكلمة المرور مع دعم كامل للبصمة الحيوية (Biometrics) للدخول الفوري دون انتظار رسائل SMS.',
      highlights: ['دخول فوري ببصمة الإصبع', 'حماية الحساب والبيانات', 'دعم العمل الميداني السريع']
    },
    {
      icon: FileSpreadsheet,
      title: 'إدارة المخالفات والرقابة التشغيلية',
      tag: 'Compliance',
      color: 'from-rose-500/20 to-red-500/20',
      iconColor: 'text-rose-400',
      borderColor: 'group-hover:border-rose-500/50',
      description:
        'أرشفة شفافة للمخالفات المرورية والجزاءات الإدارية مع توضيح المبالغ المخصومة والمتبقية وإتاحة الاعتراض المباشر.',
      highlights: ['سجل مفصل للمخالفات', 'بيان الخصومات والمتبقي', 'حفظ حقوق المندوب والشركة']
    }
  ];

  return (
    <section id='features' className='py-20 md:py-28 relative'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <div className='text-center max-w-3xl mx-auto mb-16'>
          <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400 text-xs font-semibold mb-3'>
            <span>مزايا التطبيق والمنظومة</span>
          </div>
          <h2 className='text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4'>
            تقنيات متقدمة مصممة خصيصاً للميدان
          </h2>
          <p className='text-base sm:text-lg text-zinc-300 leading-relaxed'>
            تم تصميم كل ميزة في تطبيق AAMS لتمكين المندوب وتسهيل عمله اليومي، مع منح فريق الإدارة
            والمشرفين رؤية كاملة وتحكم فوري على مدار الساعة.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8'>
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className={`relative group rounded-3xl bg-zinc-900/80 border border-zinc-800 p-7 text-right transition-all duration-300 hover:bg-zinc-900/95 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-black/60 ${feat.borderColor}`}
              >
                {/* Top Badge & Icon */}
                <div className='flex items-center justify-between mb-6'>
                  <span className='text-[11px] font-mono font-semibold uppercase px-2.5 py-1 rounded-lg bg-zinc-800/90 text-zinc-300 border border-zinc-700/60'>
                    {feat.tag}
                  </span>
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feat.color} border border-zinc-700/60 flex items-center justify-center ${feat.iconColor} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className='w-6 h-6' />
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className='text-xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors'>
                  {feat.title}
                </h3>
                <p className='text-sm text-zinc-300 leading-relaxed mb-6'>{feat.description}</p>

                {/* Highlights List */}
                <ul className='space-y-2 pt-4 border-t border-zinc-800/80 text-xs text-zinc-400'>
                  {feat.highlights.map((h, hIdx) => (
                    <li key={hIdx} className='flex items-center gap-2'>
                      <Check className='w-3.5 h-3.5 text-orange-400 shrink-0' />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
