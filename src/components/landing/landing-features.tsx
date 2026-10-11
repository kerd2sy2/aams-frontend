'use client';

import React from 'react';
import { Camera, Clock, Wrench, Award, Fingerprint, FileSpreadsheet, Check } from 'lucide-react';

export function LandingFeatures() {
  const features = [
    {
      icon: Camera,
      title: 'توثيق العدادات واللوحات بالكاميرا',
      category: 'التوثيق الميداني',
      description:
        'التقاط وتوثيق صور عداد الكيلومترات ولوحة المركبة مباشرة عند بدء ونهاية الوردية لضمان دقة القراءات ومنع التلاعب.',
      highlights: ['توثيق بصري مباشر', 'قراءة آلية دقيقة للأرقام', 'حفظ سجل مصور لكل وردية']
    },
    {
      icon: Clock,
      title: 'إدارة الورديات وتتبع ساعات العمل',
      category: 'تشغيل الشفتات',
      description:
        'بدء وإنهاء الدوام بنقرة واحدة، ومطابقة الدباب المخصص للمندوب مع الدباب الفعلي واحتساب ساعات العمل والمسافات.',
      highlights: [
        'بدء وإنهاء فوري للدوام',
        'حساب تلقائي للمسافات المقطوعة',
        'اعتماد لحظي من المشرف'
      ]
    },
    {
      icon: Wrench,
      title: 'جدولة الصيانة وتغيير زيت المحرك',
      category: 'سلامة المركبات',
      description:
        'متابعة مستمرة لعداد المسافة لكل مركبة، مع إرسال تنبيهات تلقائية عند اقتراب موعد تغيير الزيت والصيانة الدورية.',
      highlights: [
        'تنبيهات استباقية بالكيلومترات',
        'سجل صيانة شامل لكل دباب',
        'حماية محركات الأسطول'
      ]
    },
    {
      icon: Award,
      title: 'لوحة الأهداف والحوافز الشهرية',
      category: 'المكافآت والإنتاجية',
      description:
        'شاشة تحفيزية تعرض للمندوب إجمالي الطلبات المعتمدة، المتبقي لتحقيق التارجت، والراتب والحوافز المتوقعة بكل وضوح.',
      highlights: [
        'متابعة يومية للأداء والإنتاجية',
        'مؤشر تقدم نحو الهدف الشهري',
        'شفافية مالية تامة للمندوب'
      ]
    },
    {
      icon: Fingerprint,
      title: 'تسجيل دخول سريع بالبصمة والهوية',
      category: 'الأمان والوصول',
      description:
        'دخول آمن ومباشر للمندوب برقم الهوية وكلمة المرور، مع دعم البصمة الحيوية لتسهيل الاستخدام اليومي في الميدان.',
      highlights: [
        'دخول مباشر وسريع',
        'دعم البصمة الحيوية Biometrics',
        'حماية حساب وبيانات المندوب'
      ]
    },
    {
      icon: FileSpreadsheet,
      title: 'سجل المخالفات والعهد المالية',
      category: 'الرقابة الإدارية',
      description:
        'بيان شفاف للمخالفات المرورية والجزومات المسجلة على المندوب مع توضيح المبالغ المخصومة والمتبقية وإمكانية المراجعة.',
      highlights: [
        'شفافية في الخصومات والمتبقي',
        'توثيق رسمي للمخالفات',
        'حفظ حقوق المندوب والشركة'
      ]
    }
  ];

  return (
    <section id='features' className='py-20 bg-white border-b border-slate-200'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Section Header */}
        <div className='text-center max-w-3xl mx-auto mb-14'>
          <span className='inline-block px-3 py-1 rounded-md bg-orange-100 text-orange-800 text-xs font-bold mb-3'>
            مزايا المنظومة
          </span>
          <h2 className='text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4'>
            أدوات ميدانية صُممت لتسهيل عمل المندوب والمشرف
          </h2>
          <p className='text-base sm:text-lg text-slate-600 leading-relaxed'>
            تم بناء كل شاشة وخاصية داخل المنظومة بناءً على المتطلبات اليومية الفعلية لأساطيل التوصيل
            في الميدان لرفع الإنتاجية وتقليل الأخطاء.
          </p>
        </div>

        {/* Features Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8'>
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className='bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200 p-7 text-right transition-all duration-200 hover:shadow-lg hover:border-orange-200 flex flex-col justify-between'
              >
                <div>
                  <div className='flex items-center justify-between mb-5'>
                    <span className='text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200'>
                      {feat.category}
                    </span>
                    <div className='w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0'>
                      <Icon className='w-5 h-5' />
                    </div>
                  </div>

                  <h3 className='text-lg font-bold text-slate-900 mb-2.5'>{feat.title}</h3>
                  <p className='text-sm text-slate-600 leading-relaxed mb-6'>{feat.description}</p>
                </div>

                <ul className='space-y-2 pt-4 border-t border-slate-200/80 text-xs text-slate-600 font-medium'>
                  {feat.highlights.map((h, hIdx) => (
                    <li key={hIdx} className='flex items-center gap-2'>
                      <Check className='w-4 h-4 text-orange-600 shrink-0' />
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
