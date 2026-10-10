import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية | AAMS Privacy Policy',
  description: 'سياسة الخصوصية وشروط الاستخدام الخاصة بتطبيق AAMS لإدارة وتتبع الأسطول والميدان.'
};

export default function PrivacyPolicyPage() {
  return (
    <div
      className='min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8 font-sans'
      dir='rtl'
    >
      <div className='max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 sm:p-12 border border-slate-100'>
        {/* Header */}
        <div className='border-b border-slate-200 pb-6 mb-8 text-center sm:text-right'>
          <div className='inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold mb-3'>
            تطبيق AAMS
          </div>
          <h1 className='text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight'>
            سياسة الخصوصية (Privacy Policy)
          </h1>
          <p className='text-sm text-slate-500 mt-2'>
            آخر تحديث:{' '}
            {new Date().toLocaleDateString('ar-SA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {/* Introduction */}
        <section className='mb-8'>
          <h2 className='text-xl font-bold text-slate-900 mb-3 flex items-center gap-2'>
            <span className='w-2.5 h-2.5 bg-orange-500 rounded-full'></span>
            1. مقدمة
          </h2>
          <p className='text-slate-600 leading-relaxed'>
            نلتزم في <strong>AAMS</strong> بحماية خصوصية بيانات مستخدمينا وموظفينا. توضح سياسة
            الخصوصية هذه كيفية جمع البيانات، استخدامها، تخزينها وحمايتها عند استخدامك لتطبيق الهاتف
            المحمول <strong>AAMS</strong> والخدمات المرتبطة به.
          </p>
        </section>

        {/* Information We Collect */}
        <section className='mb-8'>
          <h2 className='text-xl font-bold text-slate-900 mb-3 flex items-center gap-2'>
            <span className='w-2.5 h-2.5 bg-orange-500 rounded-full'></span>
            2. البيانات والأذونات التي يجمعها ويستخدمها التطبيق
          </h2>
          <div className='space-y-4 text-slate-600 leading-relaxed'>
            <div className='p-4 bg-slate-50 rounded-xl border border-slate-100'>
              <strong className='text-slate-800 block mb-1'>
                📍 بيانات الموقع الجغرافي (Location Data):
              </strong>
              يطلب التطبيق إذن الوصول للموقع الجغرافي (أثناء الاستخدام أو في الخلفية أثناء نوبة
              العمل) لتسجيل الحضور والانصراف، إرسال إحداثيات موقع الحوادث والبلاغات الميدانية الطارئة،
              وتتبع المهام التشغيلية.
            </div>

            <div className='p-4 bg-slate-50 rounded-xl border border-slate-100'>
              <strong className='text-slate-800 block mb-1'>
                📷 الكاميرا والصور (Camera & Photos):
              </strong>
              يستخدم التطبيق الكاميرا ومعرض الصور لمسح لوحات المركبات والدبابات وقراءة عدادات
              المسافات وتوثيق صور الحوادث وفحوصات الصيانة الدورية.
            </div>

            <div className='p-4 bg-slate-50 rounded-xl border border-slate-100'>
              <strong className='text-slate-800 block mb-1'>
                👤 معلومات الحساب والمستخدم (Account Info):
              </strong>
              نجمع بيانات التعريف الأساسية مثل الاسم، رقم الهاتف، المعرف الوظيفي وبيانات المركبة
              المسندة لتسجيل الدخول وإدارة الصلاحيات.
            </div>

            <div className='p-4 bg-slate-50 rounded-xl border border-slate-100'>
              <strong className='text-slate-800 block mb-1'>
                🔔 الإشعارات وسجلات النظام (Notifications & Logs):
              </strong>
              نستخدم خدمة الإشعارات لإرسال التنبيهات الميدانية والمهام المستعجلة، ونجمع سجلات تشخيصية
              لتحسين استقرار التطبيق.
            </div>
          </div>
        </section>

        {/* Purpose */}
        <section className='mb-8'>
          <h2 className='text-xl font-bold text-slate-900 mb-3 flex items-center gap-2'>
            <span className='w-2.5 h-2.5 bg-orange-500 rounded-full'></span>
            3. كيف نستخدم هذه البيانات؟
          </h2>
          <ul className='list-disc list-inside space-y-2 text-slate-600 pr-2'>
            <li>إدارة العمليات الميدانية والمهام ومتابعة الأسطول التشغيلي.</li>
            <li>التحقق التلقائي من لوحات المركبات وعدادات المسافات.</li>
            <li>توثيق ومعالجة بلاغات الأعطال والحوادث فورياً.</li>
            <li>حماية أمان الحسابات والتأكد من هوية السائقين والمشرفين.</li>
          </ul>
        </section>

        {/* Data Protection & Security */}
        <section className='mb-8'>
          <h2 className='text-xl font-bold text-slate-900 mb-3 flex items-center gap-2'>
            <span className='w-2.5 h-2.5 bg-orange-500 rounded-full'></span>
            4. أمان البيانات والمشاركة مع أطراف ثالثة
          </h2>
          <p className='text-slate-600 leading-relaxed'>
            نحن <strong>لا نبيع أو نؤجر</strong> بيانات المستخدمين لأي أطراف إعلانية أو تجارية. يتم
            تشفير جميع الاتصالات بين التطبيق وخوادمنا باستخدام بروتوكول <code>HTTPS / TLS</code>{' '}
            المشفّر. نستخدم فقط خدمات معتمدة (مثل Google Firebase للإشعارات) لمعالجة البيانات الضرورية
            للتشغيل.
          </p>
        </section>

        {/* Data Retention & Deletion */}
        <section className='mb-8'>
          <h2 className='text-xl font-bold text-slate-900 mb-3 flex items-center gap-2'>
            <span className='w-2.5 h-2.5 bg-orange-500 rounded-full'></span>
            5. حذف البيانات والاحتفاظ بها (Data Retention & Deletion)
          </h2>
          <p className='text-slate-600 leading-relaxed'>
            يحق للمستخدمين طلب الاطلاع على بياناتهم أو تعديلها أو طلب حذف حساباتهم والبيانات المرتبطة
            بها عبر التواصل مع مسؤول النظام أو مراسلتنا عبر البريد الإلكتروني. يتم الاحتفاظ بالسجلات
            التشغيلية فقط للمدة القانونية المطلوبة للامتثال المؤسسي.
          </p>
        </section>

        {/* Contact Us */}
        <section className='border-t border-slate-200 pt-6'>
          <h2 className='text-xl font-bold text-slate-900 mb-3 flex items-center gap-2'>
            <span className='w-2.5 h-2.5 bg-orange-500 rounded-full'></span>
            6. تواصل معنا (Contact Us)
          </h2>
          <p className='text-slate-600 leading-relaxed'>
            إذا كانت لديك أي أسئلة أو استفسارات حول سياسة الخصوصية هذه، يمكنك التواصل مع فريق الدعم
            الفني:
          </p>
          <div className='mt-3 p-4 bg-orange-50/60 rounded-xl border border-orange-100 text-slate-700'>
            <p>
              📧 البريد الإلكتروني:{' '}
              <a
                href='mailto:support@kerd2sy.com'
                className='text-orange-600 font-semibold underline'
              >
                support@kerd2sy.com
              </a>
            </p>
            <p className='mt-1'>
              🏢 الجهة المسؤولة: <strong>فريق تطوير وتشغيل نظام AAMS</strong>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
