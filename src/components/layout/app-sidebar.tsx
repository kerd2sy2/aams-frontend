'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { navGroups } from '@/config/nav-config';
import { Icons } from '@/components/icons';
import { clearAuth, getAdminUser } from '@/lib/aams/auth';
import { settingsApi } from '@/lib/aams/services';
import { useLocale } from './locale-provider';
import type { NavItem, NavGroup } from '@/types';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { hasPermission, hasAnyPermission } from '@/lib/aams/permissions';

function isAllowed(item: NavItem, admin: ReturnType<typeof getAdminUser>): boolean {
  if (!admin) return false;
  const roleUpper = (admin.role || '').toUpperCase();
  const isSuper = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN' || (admin.permissions || []).includes('*');
  if (isSuper) return true;

  if (item.generalManagerOnly && admin.branch_id) return false;
  if (item.adminOnly && roleUpper !== 'ADMIN') return false;

  if (item.permission) {
    return hasPermission(item.permission, admin);
  }
  if (item.permissions && item.permissions.length > 0) {
    return hasAnyPermission(item.permissions, admin);
  }
  return true;
}

function filterNavGroups(admin: ReturnType<typeof getAdminUser>): NavGroup[] {
  return navGroups
    .map((group) => {
      const items = group.items
        .map((item): NavItem | null => {
          if (item.items?.length) {
            const children = item.items.filter((child) => isAllowed(child, admin));
            if (children.length === 0) return null;
            return { ...item, items: children };
          }
          return isAllowed(item, admin) ? item : null;
        })
        .filter((item): item is NavItem => item !== null);

      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);
}

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, dir } = useLocale();
  const [admin, setAdmin] = React.useState(() => getAdminUser());

  React.useEffect(() => {
    setAdmin(getAdminUser());
  }, [pathname]);

  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false
  });

  const brandName = settings?.site_name || 'AAMS';
  const brandLogo = settings?.logo_url || '/logo.png';
  const isGeneralMgr = !admin?.branch_id;
  const groups = React.useMemo(
    () => filterNavGroups(admin),
    [admin]
  );

  // Helper to find which parent dropdown contains the active route
  const getActiveParentTitle = React.useCallback(
    (grps: NavGroup[]) => {
      for (const group of grps) {
        for (const item of group.items) {
          if (item.items?.length) {
            const hasActiveChild = item.items.some(
              (child) => pathname === child.url || pathname.startsWith(`${child.url}/`)
            );
            if (hasActiveChild) {
              return item.title;
            }
          }
        }
      }
      return null;
    },
    [pathname]
  );

  // Single active accordion state: only ONE dropdown open at a time
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(() =>
    getActiveParentTitle(groups)
  );

  // When pathname changes (e.g. user clicked any link), auto-switch to ONLY the active dropdown
  React.useEffect(() => {
    const activeParent = getActiveParentTitle(groups);
    if (activeParent) {
      setOpenDropdown(activeParent);
    }
  }, [pathname, groups, getActiveParentTitle]);

  function handleLogout() {
    clearAuth();
    router.replace('/login');
  }

  return (
    <Sidebar collapsible='icon' side={dir === 'rtl' ? 'right' : 'left'}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link
              href='/dashboard'
              className='flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center'
            >
              <div className='bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={brandLogo} alt={brandName} className='size-full object-contain p-1' />
              </div>
              <div className='grid flex-1 text-start leading-tight group-data-[collapsible=icon]:hidden'>
                <span className='truncate text-sm font-semibold'>{brandName}</span>
                <span className='text-muted-foreground truncate text-xs'>
                  {isGeneralMgr ? t('General Manager') : admin?.branch?.name || t('Branch')}
                </span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className='overflow-x-hidden'>
        {groups.map((group, groupIdx) => (
          <SidebarGroup key={group.label || `group-${groupIdx}`} className='py-0'>
            {group.label ? <SidebarGroupLabel>{t(group.label)}</SidebarGroupLabel> : null}
            <SidebarGroupContent className='flex flex-col gap-2'>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon ? Icons[item.icon] : Icons.logo;
                  const hasChildren = Boolean(item.items?.length);

                  if (hasChildren) {
                    const isOpen = openDropdown === item.title;
                    return (
                      <CollapsibleNavItem
                        key={item.title}
                        item={item}
                        pathname={pathname}
                        isOpen={isOpen}
                        onOpenChange={(open) => {
                          setOpenDropdown(open ? item.title : null);
                        }}
                        t={t}
                        Icon={Icon}
                      />
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        render={<Link href={item.url} aria-label={t(item.title)} />}
                        tooltip={t(item.title)}
                        isActive={pathname === item.url}
                      >
                        <Icon />
                        <span>{t(item.title)}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size='lg' />}>
                <div className='bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold'>
                  {(admin?.name || brandName).charAt(0).toUpperCase()}
                </div>
                <div className='grid flex-1 text-start text-sm leading-tight'>
                  <span className='truncate font-medium'>{admin?.name || brandName}</span>
                  <span className='text-muted-foreground truncate text-xs'>{admin?.email || ''}</span>
                </div>
                <Icons.chevronsDown className='ms-auto size-4' />
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' side='top' sideOffset={4} className='min-w-56' dir='rtl'>
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className='cursor-pointer gap-2'>
                    <Icons.user className='size-4 text-muted-foreground' />
                    <span>{t('Profile')}</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={handleLogout} className='cursor-pointer gap-2 text-destructive'>
                    <Icons.logout className='size-4' />
                    <span>{t('Sign out')}</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

/* ------------------------------------------------------------------ */
/* Collapsible nav item — controlled single open accordion behavior   */
/* ------------------------------------------------------------------ */
function CollapsibleNavItem({
  item,
  pathname,
  isOpen,
  onOpenChange,
  t,
  Icon
}: {
  item: NavItem;
  pathname: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  t: (key: string, fallback?: string) => string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={onOpenChange}
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={
          <SidebarMenuButton
            tooltip={t(item.title)}
            className='group/collapsible cursor-pointer'
          />
        }
      >
        <Icon />
        <span>{t(item.title)}</span>
        <Icons.chevronRight className='ms-auto transition-transform duration-200 group-data-panel-open/collapsible:rotate-90 rtl:group-data-panel-open/collapsible:-rotate-90' />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.items!.map((child) => (
            <SidebarMenuSubItem key={child.title}>
              <SidebarMenuSubButton
                render={<Link href={child.url} aria-label={t(child.title)} />}
                isActive={pathname === child.url}
              >
                <span>{t(child.title)}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}
