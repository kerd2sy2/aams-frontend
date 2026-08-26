'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import { isAuthenticated, setAdminUser } from '@/lib/aams/auth';
import { authApi } from '@/lib/aams/services';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    if (!isAuthenticated()) {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const invDetailMatch = path.match(/^\/dashboard\/investigation\/([^/]+)\/([^/]+)$/);
      if (invDetailMatch) {
        const type = invDetailMatch[1];
        const id = invDetailMatch[2];
        if (type !== 'approvals') {
          window.location.replace(`/doc/${type}/${id}${window.location.search}`);
          return;
        }
      }

      window.location.replace('/login');
      return;
    }

    // Immediately render if user is already logged in locally
    setReady(true);

    // Sync latest profile & permissions in background
    authApi
      .me()
      .then((meData) => {
        if (meData) {
          setAdminUser(meData);
        }
      })
      .catch((err: any) => {
        // Only log out if the backend explicitly returned 401 Unauthorized
        if (err?.response?.status === 401) {
          authApi.logout();
          window.location.replace('/login');
        }
      });
  }, []);

  if (!ready) {
    return (
      <div className='flex min-h-screen w-full items-center justify-center bg-background'>
        <Icons.spinner className='text-primary size-10 animate-spin' />
      </div>
    );
  }

  return <>{children}</>;
}
