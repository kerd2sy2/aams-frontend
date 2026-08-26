'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import PageContainer from '@/components/layout/page-container';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
  CardFooter
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart';
import { Icons } from '@/components/icons';
import { dashboardApi } from '@/lib/aams/services';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { useLocale } from '@/components/layout/locale-provider';
import type { DashboardResponse } from '@/types/aams';

import { TopEmployeesCard } from '@/components/aams/top-employees-card';
import Link from 'next/link';

type StatConfig = {
  key: keyof DashboardResponse;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  note: string;
};

const HERO_STATS: StatConfig[] = [
  { key: 'today_employees', title: "Today's Employees", icon: Icons.employees, note: 'Working Now (Field)' },
  { key: 'working_employees', title: 'Working Now', icon: Icons.play, note: 'Working Now (Field)' },
  { key: 'finished_employees', title: 'Finished Shift', icon: Icons.stop, note: 'Completed work today' }
];

const SECONDARY_STATS: StatConfig[] = [
  { key: 'today_orders', title: 'Total Orders', icon: Icons.chartBar, note: "Today's Orders" },
  { key: 'today_distance', title: 'Distance Traveled', icon: Icons.truck, note: 'In Kilometers' },
  { key: 'today_fuel_cost', title: 'Fuel Cost Total', icon: Icons.droplet, note: 'In Saudi Riyal (SAR)' }
];

const CARD_ROUTES: Record<string, string> = {
  today_employees: '/dashboard/employees/today',
  working_employees: '/dashboard/employees/working',
  finished_employees: '/dashboard/employees/finished'
};

const chartConfig = {
  value: { label: 'الطلبات', color: 'var(--chart-1)' }
} satisfies ChartConfig;

function formatStat(stat: StatConfig, stats?: DashboardResponse, locale: string = 'ar'): string {
  const value = stats?.[stat.key];
  const n = typeof value === 'number' ? value : 0;
  if (stat.key === 'today_distance') {
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  }
  if (stat.key === 'today_fuel_cost') {
    return n.toFixed(2);
  }
  return n.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US');
}

export function DashboardView() {
  const router = useRouter();
  const { t, locale, dir } = useLocale();
  const { data: stats, isLoading } = useOfflineQuery<DashboardResponse>({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats(),
    staleTime: 15 * 1000,
    cacheKey: 'dashboard_stats'
  });

  const ordersData = stats?.orders_chart ?? [];
  const totalOrders = ordersData.reduce((acc, cur) => acc + cur.value, 0);

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col gap-6' dir={dir}>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-bold tracking-tight'>{t('Welcome back 👋')}</h2>
        </div>

        {/* Hero stats */}
        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-3 lg:grid-cols-3'>
          {HERO_STATS.map((stat) => {
            const route = CARD_ROUTES[stat.key];
            const Icon = stat.icon;
            return (
              <button
                key={stat.key}
                type='button'
                onClick={() => route && router.push(route)}
                className={route ? 'text-start cursor-pointer' : 'cursor-default text-start'}
              >
                <Card className='@container/card h-full hover:border-primary/40 transition-colors'>
                  <CardHeader>
                    <CardDescription>{t(stat.title)}</CardDescription>
                    <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
                      {isLoading ? '—' : formatStat(stat, stats, locale)}
                    </CardTitle>
                    <CardAction>
                      <Badge variant='outline'>
                        <Icon />
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardFooter className='flex-col items-start gap-1.5 text-sm'>
                    <div className='text-muted-foreground'>{t(stat.note)}</div>
                  </CardFooter>
                </Card>
              </button>
            );
          })}
        </div>

        {/* Secondary stats */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-3'>
          {SECONDARY_STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.key} className='gap-3 shadow-xs'>
                <CardHeader className='flex-row items-center justify-between space-y-0'>
                  <CardDescription>{stat.title}</CardDescription>
                  <div className='bg-muted text-primary flex size-8 items-center justify-center rounded-lg'>
                    <Icon className='size-4' />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className='text-2xl font-semibold tabular-nums'>
                    {isLoading ? '—' : formatStat(stat, stats)}
                  </p>
                  <p className='text-muted-foreground text-xs'>{stat.note}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Analytics Row: Monthly Orders Chart + Top 5 Performers */}
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-3 items-stretch'>
          {/* Orders Chart */}
          <Card className='h-full flex flex-col shadow-xs border-border/80 lg:col-span-2'>
            <CardHeader className='pb-4 border-b border-border/40'>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='text-lg font-bold'>عدد الطلبات — الشهر الحالي</CardTitle>
                  <CardDescription className='text-xs mt-1'>
                    إجمالي {totalOrders.toLocaleString('ar-SA')} طلباً مسجلاً من أول الشهر حتى اليوم
                  </CardDescription>
                </div>
                <Badge variant='secondary' className='font-mono font-bold text-xs'>
                  {new Date().toLocaleString('ar-SA', { month: 'long', year: 'numeric' })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className='pt-6 flex-1 flex flex-col justify-center'>
              <ChartContainer config={chartConfig} className='aspect-auto h-[290px] w-full'>
                <BarChart data={ordersData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} strokeDasharray='3 3' />
                  <XAxis
                    dataKey='date'
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => new Date(`${v}T00:00:00`).getDate().toString()}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                    formatter={(value) => Number(value).toLocaleString('en-US')}
                  />
                  <Bar dataKey='value' fill='var(--color-value)' radius={[6, 6, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Top 5 Employees Card */}
          <div className="lg:col-span-1 h-full flex flex-col">
            <TopEmployeesCard className="h-full" />
          </div>
        </div>

        {/* Latest Activities Log */}
        <Card className='shadow-xs border-border/80'>
          <CardHeader className='flex-row items-center justify-between pb-4 border-b border-border/40'>
            <div>
              <CardTitle className='flex items-center gap-2 text-lg font-bold'>
                <span className='bg-emerald-500 size-2.5 rounded-full animate-pulse' />
                آخر العمليات والنشاطات
              </CardTitle>
              <CardDescription className='text-xs mt-1'>
                سجل فوري لآخر الإجراءات المسجلة من المشرفين والإدارة
              </CardDescription>
            </div>
            <Link
              href='/dashboard/audit-logs'
              className='text-xs text-primary font-bold hover:underline'
            >
              عرض السجل بالكامل ←
            </Link>
          </CardHeader>
          <CardContent className='p-0'>
            {stats?.latest_activities?.length ? (
              <div className='divide-y divide-border'>
                {stats.latest_activities.slice(0, 6).map((act) => (
                  <div
                    key={act.id}
                    className='flex items-center justify-between gap-3 px-6 py-3.5 hover:bg-muted/30 transition-colors'
                  >
                    <div className='min-w-0 space-y-0.5'>
                      <p className='text-sm font-bold text-foreground'>{act.action}</p>
                      <p className='text-muted-foreground text-xs truncate'>
                        {act.admin_name}
                        {act.details ? ` · ${act.details}` : ''}
                      </p>
                    </div>
                    <Badge variant='outline' className='shrink-0 text-xs tabular-nums font-mono'>
                      {new Intl.DateTimeFormat('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit'
                      }).format(new Date(act.created_at))}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-muted-foreground px-4 py-8 text-center text-sm'>
                لا توجد عمليات مسجلة حديثاً
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
