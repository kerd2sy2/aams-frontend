'use client';

import { useEffect } from 'react';
import { initGlobalErrorCapture } from '@/lib/aams/error-logger';

// مكوّن صامت يثبّت التقاط الأخطاء العامة عند تحميل التطبيق.
export function ErrorCapture() {
  useEffect(() => {
    initGlobalErrorCapture();
  }, []);

  return null;
}
