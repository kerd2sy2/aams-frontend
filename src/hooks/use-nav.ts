'use client';

/**
 * Navigation filtering for AAMS — client-side, driven by the logged-in admin
 * stored in localStorage. General managers (`branch_id == null`) see the
 * administration section; ADMINS additionally see investigation approvals.
 */

import { useMemo } from 'react';
import type { NavItem, NavGroup } from '@/types';
import { getAdminUser } from '@/lib/aams/auth';
import { hasPermission } from '@/lib/aams/permissions';

const GENERAL_MANAGER_ONLY = new Set([
  '/dashboard/users',
  '/dashboard/audit-logs',
  '/dashboard/settings'
]);
const ADMIN_ONLY = new Set(['/dashboard/investigation/approvals']);

function isVisible(item: NavItem): boolean {
  const admin = getAdminUser();
  const isGeneralMgr = !admin?.branch_id;
  const roleUpper = (admin?.role || '').toUpperCase();
  const roleObjUpper = (admin?.role_obj?.name || '').toUpperCase();
  const canAccessApprovals =
    roleUpper === 'ADMIN' ||
    roleUpper === 'SUPER_ADMIN' ||
    roleUpper === 'GENERAL_MANAGER' ||
    roleObjUpper === 'ADMIN' ||
    roleObjUpper === 'SUPER_ADMIN' ||
    roleObjUpper === 'GENERAL_MANAGER' ||
    (admin?.permissions || []).includes('*') ||
    hasPermission('investigations.approve', admin);

  if (GENERAL_MANAGER_ONLY.has(item.url) && !isGeneralMgr) return false;
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
