'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '@/lib/aams/services';
import type { WorkSessionDetail } from '@/types/aams';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Crown, ArrowUpRight, User, Package } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type TimeRange = 'today' | 'week' | 'month' | 'all';

interface TopEmployee {
  employee_id: string;
  employee_name: string;
  personal_image?: string;
  total_orders: number;
  total_distance: number;
  sessions_count: number;
  application_id?: string;
}

export function TopEmployeesCard({ className }: { className?: string } = {}) {
  const [range, setRange] = useState<TimeRange>('month');

  // Compute date filter parameters
  const queryParams = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (range === 'today') {
      return { start_date: todayStr, end_date: todayStr, limit: 1000 };
    }

    if (range === 'week') {
      const d = new Date(now);
      const day = d.getDay(); // 0 is Sunday, 6 is Saturday
      const diffToSaturday = (day + 1) % 7;
      d.setDate(d.getDate() - diffToSaturday);
      const startStr = d.toISOString().slice(0, 10);
      return { start_date: startStr, end_date: todayStr, limit: 1000 };
    }

    if (range === 'month') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const startStr = `${year}-${month}-01`;
      return { start_date: startStr, end_date: todayStr, limit: 1000 };
    }

    // 'all'
    return { limit: 1000 };
  }, [range]);

  const { data, isLoading } = useQuery({
    queryKey: ['top-employees-report', queryParams],
    queryFn: () => reportApi.getReports(queryParams),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Aggregate and sort employees by total_orders descending
  const topEmployees = useMemo(() => {
    if (!data?.data || !Array.isArray(data.data)) return [];

    const map = new Map<string, TopEmployee>();

    data.data.forEach((rep: WorkSessionDetail) => {
      const id = rep.employee_id;
      if (!id) return;

      const name = rep.employee_name || 'مندوب';
      const image = rep.personal_image;
      const orders = Number(rep.orders_count) || 0;
      const distance = Number(rep.distance) || (Number(rep.end_km) - Number(rep.start_km)) || 0;
      const appId = rep.application_id;

      if (!map.has(id)) {
        map.set(id, {
          employee_id: id,
          employee_name: name,
          personal_image: image,
          total_orders: 0,
          total_distance: 0,
          sessions_count: 0,
          application_id: appId
        });
      }

      const current = map.get(id)!;
      current.total_orders += orders;
      current.total_distance += distance;
      current.sessions_count += 1;
    });

    return Array.from(map.values())
      .filter((e) => e.total_orders > 0)
      .sort((a, b) => b.total_orders - a.total_orders)
      .slice(0, 5);
  }, [data?.data]);

  const maxOrders = topEmployees.length > 0 ? topEmployees[0].total_orders : 1;

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="size-6 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-black flex items-center justify-center shadow-xs text-xs shrink-0">
            <Crown className="size-3.5" />
          </div>
        );
      case 2:
        return (
          <div className="size-6 rounded-lg bg-gradient-to-tr from-slate-400 to-slate-200 text-slate-900 font-black flex items-center justify-center shadow-2xs text-[11px] shrink-0">
            2
          </div>
        );
      case 3:
        return (
          <div className="size-6 rounded-lg bg-gradient-to-tr from-amber-700 to-amber-600 text-white font-black flex items-center justify-center shadow-2xs text-[11px] shrink-0">
            3
          </div>
        );
      default:
        return (
          <div className="size-6 rounded-lg bg-muted text-muted-foreground font-bold flex items-center justify-center text-[11px] shrink-0 border border-border">
            {rank}
          </div>
        );
    }
  };

  return (
    <Card className={cn("overflow-hidden border-border/80 shadow-xs h-full flex flex-col justify-between", className)} dir="rtl">
      <CardHeader className="p-3.5 pb-2.5 border-b border-border/40 space-y-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Trophy className="size-3.5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold truncate">أكثر 5 مناديب إنجازاً</CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground truncate">
                الأعلى إنتاجية في توصيل الطلبات
              </CardDescription>
            </div>
          </div>

          {/* Time Range Filter Buttons */}
          <div className="flex items-center gap-0.5 bg-muted/80 p-0.5 rounded-lg shrink-0 border border-border/50">
            <button
              onClick={() => setRange('today')}
              className={cn(
                'px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer',
                range === 'today'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              اليوم
            </button>
            <button
              onClick={() => setRange('week')}
              className={cn(
                'px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer',
                range === 'week'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              الأسبوع
            </button>
            <button
              onClick={() => setRange('month')}
              className={cn(
                'px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer',
                range === 'month'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              الشهر
            </button>
            <button
              onClick={() => setRange('all')}
              className={cn(
                'px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer',
                range === 'all'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              الكل
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-1.5 flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="space-y-1.5 py-1 my-auto">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 px-2 rounded-xl bg-muted/40">
                <Skeleton className="size-6 rounded-lg" />
                <Skeleton className="size-7.5 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
                <Skeleton className="h-4 w-12 rounded-md" />
              </div>
            ))}
          </div>
        ) : !topEmployees.length ? (
          <div className="py-6 my-auto text-center space-y-2">
            <div className="size-10 rounded-xl bg-muted mx-auto flex items-center justify-center text-muted-foreground">
              <Package className="size-5" />
            </div>
            <p className="text-xs font-semibold text-foreground">لا توجد طلبات مسجلة في هذه الفترة</p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              عند إتمام شفتات العمل وتسجيل الطلبات ستظهر لوحة الشرف هنا
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {topEmployees.map((emp, index) => {
              const rank = index + 1;
              const percentage = maxOrders > 0 ? Math.round((emp.total_orders / maxOrders) * 100) : 0;
              const isFirst = rank === 1;

              return (
                <div
                  key={emp.employee_id}
                  className={cn(
                    'group relative p-1.5 px-2.5 rounded-xl border transition-all duration-200',
                    isFirst
                      ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-card border-amber-500/30 shadow-2xs'
                      : 'bg-card hover:bg-muted/40 border-border/70'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Rank number badge */}
                    {getRankBadge(rank)}

                    {/* Employee Avatar */}
                    <Avatar className="size-7.5 border border-border shrink-0">
                      <AvatarImage src={emp.personal_image || ''} alt={emp.employee_name} className="object-cover" />
                      <AvatarFallback className="bg-muted text-muted-foreground font-bold text-[10px]">
                        {emp.employee_name ? emp.employee_name.slice(0, 1) : <User className="size-3" />}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name & Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <Link
                          href={`/dashboard/employees/${emp.employee_id}`}
                          className="font-bold text-xs text-foreground hover:text-primary transition-colors truncate flex items-center gap-1"
                        >
                          <span className="truncate">{emp.employee_name}</span>
                          <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                        </Link>

                        {/* Orders count badge */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={cn(
                            'font-black text-xs font-mono tabular-nums',
                            isFirst ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                          )}>
                            {emp.total_orders.toLocaleString('ar-SA')}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground">طلب</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            isFirst
                              ? 'bg-gradient-to-l from-amber-500 to-yellow-400'
                              : rank === 2
                              ? 'bg-slate-400'
                              : rank === 3
                              ? 'bg-amber-700'
                              : 'bg-primary/70'
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TopEmployeesCard;
