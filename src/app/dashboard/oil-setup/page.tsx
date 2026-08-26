'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/aams/axios';
import { employeeApi } from '@/lib/aams/services';
import type { Employee } from '@/types/aams';
import { TableSkeleton } from '@/components/aams/skeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import PageContainer from '@/components/layout/page-container';
import { toast } from 'sonner';
import {
  Save,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Droplets,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function OilSetupPage() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});

  const {
    data: employeesData,
    isLoading: employeesLoading,
  } = useQuery({
    queryKey: ['employees', 'oil-setup'],
    queryFn: async () => {
      const res = await employeeApi.getAll({ limit: 1000 });
      return res.data;
    },
  });

  const employees: Employee[] = (employeesData ?? []).sort((a, b) => {
    const ka = a.key_number || '';
    const kb = b.key_number || '';
    return ka.localeCompare(kb, undefined, { numeric: true });
  });

  const isLoading = employeesLoading;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(values)
        .filter(([, v]) => v !== '' && v !== undefined)
        .map(([employee_id, enteredKmDriven]) => {
          const kmDriven = Number(enteredKmDriven) || 0;
          const totalDist = getTotalDistance(employee_id) || 0;
          return {
            employee_id,
            last_oil_change_distance: Number((totalDist - kmDriven).toFixed(2)),
          };
        })
        .filter((entry) => !isNaN(entry.last_oil_change_distance));

      const res = await apiClient.post<{ message: string; count: number }>(
        '/employees/batch-oil-setup',
        { entries }
      );
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`تم حفظ بيانات ${data.count} مندوب بنجاح`);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['oil-check'] });
    },
    onError: (err: any) => {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'حدث خطأ أثناء الحفظ';
      toast.error(message);
    },
  });

  const handleValueChange = (employeeId: string, newValue: string) => {
    setValues((prev) => ({
      ...prev,
      [employeeId]: newValue,
    }));
  };

  const getTotalDistance = (empId: string): number => {
    const emp = employees.find((e) => e.id === empId);
    return emp?.total_distance ?? 0;
  };

  const getInputValue = (empId: string): string => {
    return values[empId] ?? '';
  };

  const filledCount = Object.values(values).filter((v) => v !== '' && v !== undefined).length;

  return (
    <PageContainer>
      <div className="space-y-6" dir="rtl">
        <PageHeader
          category="المخزن"
          title="إعداد تغيير الزيت الجماعي"
          description="إعداد مسافات تغيير الزيت لجميع المناديب دفعة واحدة"
        />

        <Card className="border-border bg-muted/40">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="size-4" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">شاشة الضبط الجماعي</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                استخدم هذه الصفحة لإدخال الكيلوهات المقطوعة منذ آخر تغيير زيت لجميع المناديب دفعة واحدة
              </p>
            </div>
          </CardContent>
        </Card>

        {!isLoading && employees.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <Button
              size="lg"
              disabled={saveMutation.isPending || filledCount === 0}
              onClick={() => saveMutation.mutate()}
              className="h-11 px-6 font-bold gap-2 shadow-lg shadow-primary/20"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="size-5" />
                  <span>حفظ الكل</span>
                </>
              )}
            </Button>
            <Badge variant="secondary" className="text-sm font-bold px-3 py-1.5">
              {filledCount} من {employees.length} تم إدخاله
            </Badge>
          </div>
        )}

        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : employees.length === 0 ? (
          <Card className="p-10 md:p-14 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Droplets className="size-8" />
            </div>
            <CardTitle className="text-lg">لا يوجد مناديب</CardTitle>
            <CardDescription className="mt-1.5 max-w-xs mx-auto">
              لا يوجد مناديب مسجلين في النظام حالياً.
            </CardDescription>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    <th className="text-right px-5 py-3.5 text-xs font-bold text-muted-foreground whitespace-nowrap">
                      المندوب
                    </th>
                    <th className="text-right px-5 py-3.5 text-xs font-bold text-muted-foreground whitespace-nowrap">
                      رقم الدراجة
                    </th>
                    <th className="text-center px-5 py-3.5 text-xs font-bold text-muted-foreground whitespace-nowrap">
                      المسافة الكلية (كم)
                    </th>
                    <th className="text-center px-5 py-3.5 text-xs font-bold text-muted-foreground whitespace-nowrap">
                      كيلوهات مقطوعة منذ آخر تغيير
                    </th>
                    <th className="text-center px-5 py-3.5 text-xs font-bold text-muted-foreground whitespace-nowrap">
                      المتبقي لتغيير الزيت
                    </th>
                    <th className="text-center px-5 py-3.5 text-xs font-bold text-muted-foreground whitespace-nowrap">
                      الحالة
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employees.map((emp) => {
                    const totalDistance = getTotalDistance(emp.id);
                    const inputVal = getInputValue(emp.id);
                    const inputNum = inputVal !== '' ? Number(inputVal) : NaN;
                    const oilInterval = emp.vehicle_type === 'car' ? 10000 : 950;
                    const remainingKm = !isNaN(inputNum) ? Math.max(0, oilInterval - inputNum) : null;
                    const needsOilChange = !isNaN(inputNum) && inputNum >= oilInterval;

                    return (
                      <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                              {emp.personal_image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={emp.personal_image}
                                  alt={emp.name}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <Gauge className="size-5 text-muted-foreground" />
                              )}
                            </div>
                            <span className="font-bold text-foreground text-sm">
                              {emp.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant="secondary" className="font-mono font-bold tabular-nums">
                            {emp.motorcycle_number || emp.key_number || '-'}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="text-sm text-muted-foreground font-mono tabular-nums">
                            {totalDistance.toLocaleString('ar-SA')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <Input
                            type="number"
                            placeholder="كيلوهات مقطوعة"
                            value={inputVal}
                            onChange={(e) => handleValueChange(emp.id, e.target.value)}
                            className={cn(
                              'w-40 mx-auto text-center font-mono tabular-nums h-9 text-sm',
                              'border-primary/50 focus-visible:border-primary focus-visible:ring-primary/20',
                              'bg-muted/50'
                            )}
                            dir="ltr"
                          />
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {remainingKm !== null ? (
                            <span className="text-sm font-bold text-foreground font-mono tabular-nums">
                              {remainingKm.toLocaleString('ar-SA')} كم
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {!isNaN(inputNum) ? (
                            needsOilChange ? (
                              <Badge
                                variant="destructive"
                                className="gap-1.5 font-bold text-xs"
                              >
                                <AlertTriangle className="size-3" />
                                يحتاج تغيير
                              </Badge>
                            ) : (
                              <Badge className="gap-1.5 font-bold text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                <CheckCircle2 className="size-3" />
                                جيد
                              </Badge>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
