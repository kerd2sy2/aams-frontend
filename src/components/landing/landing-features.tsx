'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Fingerprint, Award, Layers, Smartphone, Check, Sparkles } from 'lucide-react';

export function LandingFeatures() {
  const features = [
    {
      icon: Smartphone,
      title: 'تطبيق ميداني خفيف وسريع',
      category: 'تجربة المندوب',
      description:
        'تصميم بسيط ومباشر يتيح للمندوب إنجاز كافة الإجراءات اليومية والوصول للمعلومات دون أي تعقيد تقني.',
      highlights: [
        'واجهة عربية واضحة وميسرة',
        'سرعة عالية في التحميل والاستجابة',
        'تنبيهات وإشعارات لحظية'
      ]
    },
    {
      icon: Layers,
      title: 'تكامل مباشر مع المنصات الشريكة',
      category: 'الربط والتشغيل',
      description:
        'مواءمة تشغيلية كاملة مع كبرى منصات التوصيل (كيتا ونينجا) لضمان تدفق المهام وانسيابية التوصيل.',
      highlights: [
        'تنسيق معتمد لإدارة الطلبات',
        'مزامنة سريعة ودقيقة',
        'توزيع مرن للعمليات في الميدان'
      ]
    },
    {
      icon: Fingerprint,
      title: 'تسجيل دخول بالبصمة الحيوية',
      category: 'الأمان والخصوصية',
      description:
        'إمكانية الوصول الآمن والسريع للتطبيق باستخدام البصمة دون الحاجة لكتابة كلمات المرور أو انتظار رسائل OTP.',
      highlights: [
        'دعم البصمة البيومترية Biometrics',
        'ربط موثوق بالجهاز المعتمد',
        'حماية تامة لبيانات الحساب'
      ]
    },
    {
      icon: Award,
      title: 'مؤشرات الأداء والشفافية التحفيزية',
      category: 'الإنتاجية والحوافز',
      description:
        'شاشة أداء واضحة تعرض للمندوب مؤشرات إنجازه اليومي، نسب الالتزام، والحوافز المستحقة بكل شفافية.',
      highlights: [
        'متابعة يومية للأداء الميداني',
        'بيان واضح للإنتاجية والالتزام',
        'شفافية كاملة في الحقوق'
      ]
    },
    {
      icon: ShieldCheck,
      title: 'الشفافية والتوثيق المالي والإداري',
      category: 'الرقابة وحفظ الحقوق',
      description:
        'سجل موثق وشامل لكافة المعاملات والمستحقات والبيانات الإدارية لحفظ حقوق المندوب وإدارة الأسطول.',
      highlights: [
        'بيان مفصل للحقوق والمستحقات',
        'توثيق رسمي لكافة العمليات',
        'إمكانية المراجعة مع المشرف'
      ]
    },
    {
      icon: Sparkles,
      title: 'دعم ومساندة ميدانية فورية',
      category: 'المساندة المباشرة',
      description:
        'قنوات تواصل مباشرة مع المشرفين الميدانيين وفرق الدعم لمعالجة أي استفسارات أو مواقف طارئة فوراً.',
      highlights: [
        'تواصل سريع مع الإشراف الميداني',
        'حلول فورية لأي معوقات ميدانية',
        'مساندة تشغيلية مستمرة'
      ]
    }
  ];

  return (
    <section id='features' className='py-16 sm:py-20 bg-white border-b border-slate-200'>
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
            مزايا المنظومة
          </span>
          <h2 className='text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4'>
            أدوات ميدانية ورقمية متطورة لتسهيل العمل اليومي
          </h2>
          <p className='text-base sm:text-lg text-slate-600 leading-relaxed'>
            صُممت منظومة AAMS لتمنح الكوادر الميدانية تجربة عمل موثوقة ومريحة تلبي متطلبات التوصيل
            السريع باحترافية كاملة.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7'>
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.06 }}
                className='bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 text-right transition-all duration-200 hover:shadow-md hover:border-orange-200 flex flex-col justify-between'
              >
                <div>
                  <div className='flex items-center justify-between mb-4'>
                    <span className='text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200'>
                      {feat.category}
                    </span>
                    <div className='w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0'>
                      <Icon className='w-5 h-5' />
                    </div>
                  </div>

                  <h3 className='text-lg font-bold text-slate-900 mb-2'>{feat.title}</h3>
                  <p className='text-sm text-slate-600 leading-relaxed mb-5'>{feat.description}</p>
                </div>

                <ul className='space-y-2 pt-4 border-t border-slate-200/80 text-xs text-slate-600 font-medium'>
                  {feat.highlights.map((h, hIdx) => (
                    <li key={hIdx} className='flex items-center gap-2'>
                      <Check className='w-4 h-4 text-orange-600 shrink-0' />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
