'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { authApi } from '@/lib/aams/services';
import { setAdminUser, setTokens } from '@/lib/aams/auth';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'login';
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const processed = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || processed.current) return;
    processed.current = true;

    const rawEmail = user.primaryEmailAddress?.emailAddress;
    const googleId = user.id;
    const avatar = user.imageUrl;

    if (!rawEmail) {
      toast.error('تعذر الحصول على بريد Google الإلكتروني');
      router.replace('/login');
      return;
    }

    const userEmail: string = rawEmail.toLowerCase();

    async function handleAuth() {
      if (mode === 'link') {
        // Link Google Account to currently logged-in admin
        try {
          const res = await authApi.linkGoogle({
            email: userEmail,
            google_id: googleId,
            avatar
          });
          toast.success(res.message || `تم ربط حساب Google (${userEmail}) بنجاح!`);
          window.location.replace('/dashboard/profile');
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            'فشل في ربط حساب Google مع المستخدم الحالي';
          toast.error(msg);
          window.location.replace('/dashboard/profile');
        }
      } else {
        // Google Sign-In -> Immediately redirect to dashboard
        try {
          const res = await authApi.googleLogin({
            email: userEmail,
            google_id: googleId
          });
          setTokens(res.access_token, res.refresh_token);
          setAdminUser(res.admin);
          toast.success(`تم تسجيل الدخول بواسطة Google! أهلاً بك، ${res.admin.name}`);
          window.location.replace('/dashboard');
        } catch (err: unknown) {
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            'حساب Google هذا غير مرتبط بأي مستخدم مصرح له';

          // Sign out of Clerk session so it does not stay in a stale state
          try {
            await signOut();
          } catch (_) {}

          window.location.replace(
            `/login?error=not_linked&email=${encodeURIComponent(userEmail)}&msg=${encodeURIComponent(msg)}`
          );
        }
      }
    }

    handleAuth();
  }, [isLoaded, user, mode, router, signOut]);

  return (
    <div className='fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-background'>
      <Icons.spinner className='size-10 animate-spin text-primary' />
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className='fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-background'>
          <Icons.spinner className='size-10 animate-spin text-primary' />
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
