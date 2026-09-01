'use client';

import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { NotificationCard } from '@/components/ui/notification-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi, NotificationResponse } from '@/lib/aams/services';
import { ActionType, NotificationStatus } from '@/components/ui/notification-card';

const actionRoutes: Record<string, string> = {
  view: '/dashboard/workspaces',
  'view-product': '/dashboard/product',
  billing: '/dashboard/billing',
  open: '/dashboard/kanban',
  'open-chat': '/dashboard/chat'
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: rawNotifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getAll(),
    refetchInterval: 60000
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const notifications = (rawNotifications || []).map((n: NotificationResponse) => {
    let actions: { id: string; label: string; type: ActionType }[] = [];
    if (n.type === 'iqama_expiry') {
      actions = [{ id: 'view-employee', label: 'عرض الموظف', type: 'redirect' as ActionType }];
    } else if (
      n.type === 'WORK_START' ||
      n.type === 'WORK_END' ||
      n.type === 'WARNING' ||
      n.type === 'MOTORCYCLE_MISMATCH'
    ) {
      actions = [
        { id: 'view-audit', label: 'مراجعة وتدقيق العدادات', type: 'redirect' as ActionType }
      ];
    }

    return {
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      status: n.status as NotificationStatus,
      createdAt: n.created_at,
      actions
    };
  });

  const count = notifications.filter((n) => n.status === 'unread').length;

  const handleMarkAsRead = (id: string) => markAsReadMutation.mutate(id);
  const handleMarkAllAsRead = () => markAllAsReadMutation.mutate();

  const unreadNotifications = notifications.filter((n) => n.status === 'unread');
  const readNotifications = notifications.filter((n) => n.status === 'read');

  const renderList = (items: typeof notifications) => {
    if (items.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center py-16'>
          <Icons.notification className='text-muted-foreground/40 mb-3 h-10 w-10' />
          <p className='text-muted-foreground text-sm'>لا توجد إشعارات في هذا القسم</p>
        </div>
      );
    }

    return (
      <div className='flex flex-col gap-2'>
        {items.map((notification) => (
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
              if (actionId === 'view-audit') {
                router.push('/dashboard/odometer-audits');
              } else {
                router.push('/dashboard/employees');
              }
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <PageContainer
      pageTitle='مركز الإشعارات'
      pageDescription='عرض ومتابعة كافة الإشعارات وتنبيهات بدء الشفتات وإنهاؤها ومطابقة العدادات.'
      pageHeaderAction={
        count > 0 ? (
          <Button variant='outline' size='sm' onClick={handleMarkAllAsRead}>
            تعيين الكل كمقروء
          </Button>
        ) : undefined
      }
    >
      <Tabs defaultValue='all' dir='rtl'>
        <TabsList>
          <TabsTrigger value='all'>الكل ({notifications.length})</TabsTrigger>
          <TabsTrigger value='unread'>غير مقروء ({unreadNotifications.length})</TabsTrigger>
          <TabsTrigger value='read'>مقروء ({readNotifications.length})</TabsTrigger>
        </TabsList>
        <TabsContent value='all' className='mt-4'>
          {renderList(notifications)}
        </TabsContent>
        <TabsContent value='unread' className='mt-4'>
          {renderList(unreadNotifications)}
        </TabsContent>
        <TabsContent value='read' className='mt-4'>
          {renderList(readNotifications)}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
