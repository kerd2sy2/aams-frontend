'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import { isAuthenticated, setAdminUser, getAdminUser } from '@/lib/aams/auth';
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

    const syncUser = async () => {
      try {
        const meData = await authApi.me();
        if (meData) {
          const current = getAdminUser();
          const prevPerms = JSON.stringify(current?.permissions || []);
          const newPerms = JSON.stringify(meData.permissions || []);
          const roleChanged = current?.role !== meData.role;
          const configuredChanged =
            current?.permissions_configured !== meData.permissions_configured;

          setAdminUser(meData);
          if (prevPerms !== newPerms || roleChanged || configuredChanged) {
            window.dispatchEvent(new CustomEvent('admin_user_updated', { detail: meData }));
          }
        }
      } catch (err: any) {
        if (err?.response?.status === 401) {
          authApi.logout();
          window.location.replace('/login');
        }
      }
    };

    // Initial background sync
    syncUser();

    // Re-sync whenever user focuses the tab
    const handleFocus = () => {
      syncUser();
    };
    window.addEventListener('focus', handleFocus);

    // Periodic live sync every 4 seconds while tab is active
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncUser();
      }
    }, 4000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(timer);
    };
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
