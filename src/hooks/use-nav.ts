'use client';

/**
 * Navigation filtering for AAMS — client-side, driven by the logged-in admin
 * stored in localStorage. General managers (`branch_id == null`) see the
 * administration section; ADMINS additionally see investigation approvals.
 */

import { useMemo, useState, useEffect } from 'react';
import type { NavItem, NavGroup } from '@/types';
import type { Admin } from '@/types/aams';
import { getAdminUser } from '@/lib/aams/auth';
import { hasPermission, isExecutiveAdmin } from '@/lib/aams/permissions';

const ADMIN_ONLY = new Set(['/dashboard/investigation/approvals']);

export function useCurrentUser(): Admin | null {
  const [user, setUser] = useState<Admin | null>(() => getAdminUser());

  useEffect(() => {
    const handleUpdate = () => {
      setUser(getAdminUser());
    };
    window.addEventListener('admin_user_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('admin_user_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return user;
}

function isVisible(item: NavItem, user: Admin | null): boolean {
  const isSuperOrAdmin = isExecutiveAdmin(user);

  const canAccessUsers = isSuperOrAdmin || hasPermission('users.manage', user);
  const canAccessAuditLogs = isSuperOrAdmin || hasPermission('audit_logs.view', user);
  const canAccessSettings = isSuperOrAdmin || hasPermission('settings.manage', user);
  const canAccessApprovals = isSuperOrAdmin || hasPermission('investigations.approve', user);

  if (item.url === '/dashboard/users') return canAccessUsers;
  if (item.url === '/dashboard/audit-logs') return canAccessAuditLogs;
  if (item.url === '/dashboard/settings') return canAccessSettings;
  if (ADMIN_ONLY.has(item.url) && !canAccessApprovals) return false;
  return true;
}

export function useFilteredNavItems(items: NavItem[]) {
  const user = useCurrentUser();
  return useMemo(() => items.filter((item) => isVisible(item, user)), [items, user]);
}

export function useFilteredNavGroups(groups: NavGroup[]) {
  const user = useCurrentUser();
  return useMemo(() => {
    return groups
      .map((group) => ({ ...group, items: group.items.filter((item) => isVisible(item, user)) }))
      .filter((group) => group.items.length > 0);
  }, [groups, user]);
}
