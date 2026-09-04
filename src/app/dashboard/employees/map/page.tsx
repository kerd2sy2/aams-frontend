'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { employeeApi, branchApi } from '@/lib/aams/services';
import PageContainer from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { EmployeeLocation, Branch } from '@/types/aams';
import {
  MapPin,
  Users,
  Navigation,
  ArrowRight,
  List,
  Sparkles,
  Compass,
  AlertCircle,
  Loader2
} from 'lucide-react';

// Dynamic import for Leaflet map component (SSR = false required for Leaflet)
const DelegateMap = dynamic(() => import('@/components/aams/delegate-map'), {
  ssr: false,
  loading: () => (
    <div className='w-full h-[600px] rounded-2xl border border-border/60 bg-muted/20 flex flex-col items-center justify-center gap-3 text-muted-foreground'>
      <Loader2 className='size-8 animate-spin text-primary' />
      <span className='text-sm font-bold'>جاري تحميل خريطة الطائف والمناديب...</span>
    </div>
  )
});

export default function DelegateMapPage() {
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Fetch live employee locations
  const {
    data: employees = [],
    isLoading,
    refetch
  } = useOfflineQuery<EmployeeLocation[]>({
    queryKey: ['employee-locations', selectedBranchId],
    queryFn: () => employeeApi.getLocations(selectedBranchId || undefined),
    cacheKey: `employee_locations_${selectedBranchId || 'all'}`
  });

  // Fetch branches for filtering
  const { data: branches = [] } = useOfflineQuery<Branch[]>({
    queryKey: ['branches-list'],
    queryFn: () => branchApi.getAll(),
    cacheKey: 'branches_all'
  });

  const activeCount = employees.filter((e) => e.is_shift_active).length;
  const withGpsCount = employees.filter((e) => e.latitude && e.longitude).length;

  return (
    <PageContainer
      pageTitle='خريطة تتبع المناديب المباشرة'
      pageDescription='متابعة مواقع المناديب والشفتات لحظياً على خريطة الطائف والمملكة بدقة عالية'
    >
      <div className='space-y-4 w-full h-full flex flex-col' dir='rtl'>
        {/* Page Header */}
        <PageHeader
          category='لوحة التحكم / المناديب'
          title='خريطة تتبع المناديب المباشرة 🗺️'
          description='متابعة مواقع المناديب والشفتات لحظياً على خريطة الطائف والمملكة بدقة عالية'
          actions={
            <div className='flex items-center gap-2'>
              <Link href='/dashboard/employees'>
                <Button variant='outline' size='sm' className='gap-1.5 font-bold shadow-2xs'>
                  <List className='size-4' />
                  <span>جدول المناديب</span>
                </Button>
              </Link>
            </div>
          }
        />

        {/* Top Mini KPI Strip */}
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0'>
          <Card className='p-3 border shadow-2xs bg-card'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-[11px] text-muted-foreground font-semibold'>إجمالي المناديب</p>
                <p className='text-xl font-black text-foreground'>{employees.length}</p>
              </div>
              <div className='size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold'>
                <Users className='size-4' />
              </div>
            </div>
          </Card>

          <Card className='p-3 border shadow-2xs bg-card'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold'>
                  في الشفت الآن
                </p>
                <p className='text-xl font-black text-emerald-600 dark:text-emerald-400'>
                  {activeCount}
                </p>
              </div>
              <div className='size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold'>
                <Navigation className='size-4' />
              </div>
            </div>
          </Card>

          <Card className='p-3 border shadow-2xs bg-card'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-[11px] text-sky-600 dark:text-sky-400 font-semibold'>
                  إحداثيات GPS مسجلة
                </p>
                <p className='text-xl font-black text-sky-600 dark:text-sky-400'>{withGpsCount}</p>
              </div>
              <div className='size-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold'>
                <MapPin className='size-4' />
              </div>
            </div>
          </Card>

          <Card className='p-3 border shadow-2xs bg-card'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-[11px] text-muted-foreground font-semibold'>المركز الرئيسي</p>
                <p className='text-sm font-black text-foreground mt-1'>الطائف، السعودية</p>
              </div>
              <div className='size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold'>
                <Compass className='size-4' />
              </div>
            </div>
          </Card>
        </div>

        {/* Live Interactive Map */}
        <div className='flex-1 min-h-0 w-full'>
          <DelegateMap
            employees={employees}
            branches={branches}
            isLoading={isLoading}
            onRefresh={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ['employee-locations'] });
            }}
            selectedBranchId={selectedBranchId}
            onSelectBranchId={setSelectedBranchId}
          />
        </div>
      </div>
    </PageContainer>
  );
}
