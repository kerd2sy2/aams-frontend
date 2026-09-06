'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TargetPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/target/import');
  }, [router]);

  return null;
}
