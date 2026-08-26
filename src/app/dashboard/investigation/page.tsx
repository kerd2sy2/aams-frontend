'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { getAdminUser } from '@/lib/aams/auth';
import { investigationApi } from '@/lib/aams/services';
import { formatRiyadh } from '@/lib/aams/riyadh-time';

const ITEMS = [
  {
    key: 'approvals',
    title: 'الطلبات',
    desc: 'مراجعة والموافقة على طلبات السلف',
    href: '/dashboard/investigation/approvals',
    icon: Icons.clipboardCheck,
    color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30',
    adminOnly: true
  },
  {
    key: 'investigation',
    title: 'تحقيق',
    desc: 'إنشاء تحقيق جديد للموظف',
    href: '/dashboard/investigation/investigation',
    icon: Icons.search,
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30'
  },
  {
    key: 'supervisor_report',
    title: 'تقرير مشرف',
    desc: 'إعداد تقرير مشرف عن الموظف',
    href: '/dashboard/investigation/supervisor_report',
    icon: Icons.fileText,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30'
  },
  {
    key: 'advance',
    title: 'سلفة',
    desc: 'طلب سلفة مالية للموظف',
    href: '/dashboard/investigation/advance',
    icon: Icons.dollarSign,
    color: 'text-green-600 bg-green-50 dark:bg-green-950/30'
  },
  {
    key: 'internet_advance',
    title: 'سلفة انترنت',
    desc: 'طلب سلفة اشتراك خدمة الإنترنت',
    href: '/dashboard/investigation/internet_advance',
    icon: Icons.wifi,
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30'
  },
  {
    key: 'absence',
    title: 'متابعة غياب',
    desc: 'تسجيل ومتابعة غياب الموظف',
    href: '/dashboard/investigation/absence',
    icon: Icons.calendar,
    color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30'
  },
  {
    key: 'custody',
    title: 'استلام عهدة',
    desc: 'استلام عهدة للموظف',
    href: '/dashboard/investigation/custody',
    icon: Icons.inventory,
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
  }
];

const TYPE_META: Record<string, { label: string; color: string }> = {
  investigation: { label: 'تحقيق', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
  supervisor_report: {
    label: 'تقرير مشرف',
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30'
  },
  advance: { label: 'سلفة', color: 'text-green-600 bg-green-50 dark:bg-green-950/30' },
  internet_advance: {
    label: 'سلفة انترنت',
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30'
  },
  absence: { label: 'متابعة غياب', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30' },
  custody: { label: 'استلام عهدة', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' }
};

export default function InvestigationHubPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = useMemo(() => getAdminUser()?.role === 'ADMIN', []);

  const items = ITEMS.filter((i) => !i.adminOnly || isAdmin);

  const trimmedQuery = searchQuery.trim();

  const { data: allInvestigations, isFetching: searching } = useQuery({
    queryKey: ['investigations-search-all'],
    queryFn: () => investigationApi.getAll(),
    enabled: trimmedQuery.length >= 2,
    staleTime: 30 * 1000
  });

  const results = useMemo(() => {
    const q = trimmedQuery.toLowerCase();
    if (q.length < 2 || !allInvestigations) return [];
    return allInvestigations.filter(
      (inv) =>
        inv.employee_name?.toLowerCase().includes(q) ||
        inv.national_id?.toLowerCase().includes(q) ||
        inv.id?.toLowerCase().includes(q)
    );
  }, [trimmedQuery, allInvestigations]);

  const showResults = trimmedQuery.length >= 2;

  return (
    <PageContainer pageTitle='محاضر الموظفين' pageDescription='اختر نوع المحضر الذي تريد فتحه'>
      <div className='space-y-6'>
        {/* Search bar */}
        <Card>
          <CardContent className='space-y-4 p-4'>
            <div className='relative'>
              <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 size-5 -translate-y-1/2 start-4' />
              <Input
                placeholder='ابحث عن موظف في أي محضر أو تقرير أو سلفة (بالاسم أو رقم الهوية أو رقم المحضر)...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='h-12 rounded-xl ps-12 text-base'
              />
            </div>

            {showResults && searching && (
              <div className='text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm'>
                <Icons.spinner className='size-4 animate-spin' />
                جارٍ البحث...
              </div>
            )}

            {showResults && !searching && results.length > 0 && (
              <div className='space-y-2'>
                <p className='text-muted-foreground text-xs'>عدد النتائج: {results.length}</p>
                {results.map((inv) => {
                  const meta = TYPE_META[inv.type] || {
                    label: inv.type,
                    color: 'text-muted-foreground bg-muted'
                  };
                  return (
                    <Link
                      key={inv.id}
                      href={`/dashboard/investigation/${inv.type}/${inv.id}`}
                      className='block'
                    >
                      <div className='border-border/60 hover:bg-muted/50 flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors'>
                        <div className='flex min-w-0 items-center gap-3'>
                          <div
                            className={cn(
                              'flex size-10 shrink-0 items-center justify-center rounded-lg',
                              meta.color
                            )}
                          >
                            <Icons.user className='size-5' />
                          </div>
                          <div className='min-w-0'>
                            <p className='truncate text-sm font-bold'>{inv.employee_name}</p>
                            <p className='text-muted-foreground font-mono text-xs'>
                              رقم: {inv.id.slice(0, 8).toUpperCase()} · {inv.national_id}
                            </p>
                          </div>
                        </div>
                        <div className='flex shrink-0 items-center gap-3'>
                          <Badge variant='outline' className='rounded-lg text-xs font-bold'>
                            {meta.label}
                          </Badge>
                          <span className='text-muted-foreground hidden font-mono text-xs sm:block'>
                            {formatRiyadh(new Date(inv.created_at), 'yyyy/MM/dd')}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {showResults && !searching && results.length === 0 && (
              <div className='text-muted-foreground flex flex-col items-center justify-center py-8 text-center'>
                <Icons.fileSearch className='mb-2 size-8 opacity-50' />
                <p className='text-sm'>لا توجد نتائج مطابقة لـ «{searchQuery}»</p>
              </div>
            )}
          </CardContent>
        </Card>

        {!showResults && (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.key} href={item.href} className='group'>
                  <Card className='border-border/70 hover:border-primary/40 h-full cursor-pointer transition-all hover:shadow-md group-hover:-translate-y-0.5'>
                    <CardContent className='flex items-start gap-4 p-5'>
                      <div
                        className={cn(
                          'flex size-12 shrink-0 items-center justify-center rounded-xl',
                          item.color
                        )}
                      >
                        <Icon className='size-6' />
                      </div>
                      <div className='min-w-0'>
                        <p className='font-bold text-foreground'>{item.title}</p>
                        <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
                          {item.desc}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
