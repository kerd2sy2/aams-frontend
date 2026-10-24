'use client';

/**
 * Navigation filtering for AAMS — client-side, driven by the logged-in admin
 * stored in localStorage. General managers (`branch_id == null`) see the
 * administration section; ADMINS additionally see investigation approvals.
 */

import { useMemo } from 'react';
import type { NavItem, NavGroup } from '@/types';
import { getAdminUser } from '@/lib/aams/auth';
import { hasPermission, isExecutiveAdmin } from '@/lib/aams/permissions';

const ADMIN_ONLY = new Set(['/dashboard/investigation/approvals']);

function isVisible(item: NavItem): boolean {
  const admin = getAdminUser();
  const isSuperOrAdmin = isExecutiveAdmin(admin);

  const canAccessUsers = isSuperOrAdmin || hasPermission('users.manage', admin);
  const canAccessAuditLogs = isSuperOrAdmin || hasPermission('audit_logs.view', admin);
  const canAccessSettings = isSuperOrAdmin || hasPermission('settings.manage', admin);
  const canAccessApprovals = isSuperOrAdmin || hasPermission('investigations.approve', admin);

  if (item.url === '/dashboard/users') return canAccessUsers;
  if (item.url === '/dashboard/audit-logs') return canAccessAuditLogs;
  if (item.url === '/dashboard/settings') return canAccessSettings;
  if (ADMIN_ONLY.has(item.url) && !canAccessApprovals) return false;
  return true;
}

export function useFilteredNavItems(items: NavItem[]) {
  return useMemo(() => items.filter(isVisible), [items]);
}

export function useFilteredNavGroups(groups: NavGroup[]) {
  return useMemo(() => {
    return groups
      .map((group) => ({ ...group, items: group.items.filter(isVisible) }))
      .filter((group) => group.items.length > 0);
  }, [groups]);
}
