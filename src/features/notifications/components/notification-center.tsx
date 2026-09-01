'use client';

import { Icons } from '@/components/icons';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  NotificationCard,
  NotificationStatus,
  ActionType
} from '@/components/ui/notification-card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi, NotificationResponse } from '@/lib/aams/services';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/layout/locale-provider';

const MAX_VISIBLE = 5;

const actionRoutes: Record<string, string> = {
  view: '/dashboard/workspaces',
  'view-product': '/dashboard/product',
  billing: '/dashboard/billing',
  open: '/dashboard/kanban',
  'open-chat': '/dashboard/chat'
};

export function NotificationCenter() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { t } = useLocale();
  const { data: rawNotifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getAll(),
    refetchInterval: 60000 // refresh every minute
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const notifications = (rawNotifications || []).map((n: NotificationResponse) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    status: n.status as NotificationStatus,
    createdAt: n.created_at,
    actions:
      n.type === 'iqama_expiry'
        ? [{ id: 'view-employee', label: 'عرض الموظف', type: 'redirect' as ActionType }]
        : []
  }));

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;
  const count = unreadCount;
  const visibleNotifications = notifications.slice(0, MAX_VISIBLE);

  const handleMarkAsRead = (id: string) => markAsReadMutation.mutate(id);
  const handleMarkAllAsRead = () => markAllAsReadMutation.mutate();

  return (
    <Popover>
      <PopoverTrigger render={<Button variant='ghost' size='icon' className='relative h-8 w-8' />}>
        <Icons.notification className='h-4 w-4' />
        {count > 0 && (
          <span className='bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium'>
            {count > 9 ? '9+' : count}
          </span>
        )}
        <span className='sr-only'>{t('Notifications')}</span>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-[calc(100vw-2rem)] p-0 sm:w-[380px]' sideOffset={8}>
        <div className='flex items-center justify-between px-4 pt-3'>
          <Link href='/dashboard/notifications' className='group flex items-center gap-1'>
            <h4 className='text-sm font-semibold group-hover:underline'>{t('Notifications')}</h4>
            <Icons.chevronRight className='text-muted-foreground h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5' />
          </Link>
          <div className='flex items-center gap-2'>
            {count > 0 && (
              <span className='bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs'>
                {count} {t('new')}
              </span>
            )}
            {count > 0 && (
              <Button
                variant='ghost'
                size='sm'
                className='text-muted-foreground h-auto px-2 py-1 text-xs'
                onClick={handleMarkAllAsRead}
              >
                {t('Mark all as read')}
              </Button>
            )}
          </div>
        </div>
        <Separator />
        <ScrollArea className='h-[400px]'>
          {notifications.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12'>
              <Icons.notification className='text-muted-foreground/40 mb-2 h-8 w-8' />
              <p className='text-muted-foreground text-sm'>{t('No notifications yet')}</p>
            </div>
          ) : (
            <div className='flex flex-col gap-1 p-2'>
              {visibleNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  id={notification.id}
                  title={notification.title}
                  body={notification.body}
                  status={notification.status}
                  createdAt={notification.createdAt}
                  actions={notification.actions}
                  onMarkAsRead={handleMarkAsRead}
                  onAction={(notifId, actionId) => {
                    handleMarkAsRead(notifId);
                    router.push('/dashboard/employees');
                  }}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
