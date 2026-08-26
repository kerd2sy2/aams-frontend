'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { employeeApi } from '@/lib/aams/services';
import { CardPageSkeleton } from '@/components/aams/skeletons';
import { EmployeeCard } from '@/components/aams/employee-card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import PageContainer from '@/components/layout/page-container';
import { ArrowLeft } from 'lucide-react';

export default function EmployeeCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading, isError } = useOfflineQuery({
    queryKey: ['employee-card', id],
    queryFn: () => employeeApi.getPrintCard(id),
    cacheKey: `employee_card_${id}`,
  });

  if (isLoading) {
    return (
      <PageContainer>
        <CardPageSkeleton />
      </PageContainer>
    );
  }

  if (isError || !data?.employee) {
    return (
      <PageContainer>
        <div className="p-8 text-center text-destructive space-y-4" dir="rtl">
          <p className="font-bold">تعذر تحميل بيانات بطاقة الموظف</p>
          <Button onClick={() => router.back()}>العودة</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6 max-w-xl mx-auto" dir="rtl">
        <PageHeader
          category="بطاقة المندوب"
          title={`بطاقة ${data.employee.name}`}
          description="بطاقة الهوية والعمل مع باركود Code128 وكود QR للطباعة وتحميل PDF"
        />

        <div className="flex justify-center pt-2">
          <EmployeeCard
            employee={data.employee}
            barcodeData={data.barcode}
            qrCodeData={data.qr_code}
          />
        </div>
      </div>
    </PageContainer>
  );
}
