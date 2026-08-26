'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/aams/login-form';
import { isAuthenticated } from '@/lib/aams/auth';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      window.location.replace('/dashboard');
    }
  }, []);

  return (
    <div className='bg-muted/50 flex min-h-svh flex-col items-center justify-center p-6'>
      <div className='w-full max-w-md'>
        <LoginForm />
      </div>
    </div>
  );
}

