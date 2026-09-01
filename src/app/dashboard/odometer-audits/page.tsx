'use client';

import React from 'react';
import PageContainer from '@/components/layout/page-container';
import OdometerAuditView from '@/components/aams/odometer-audit-view';

export default function OdometerAuditsPage() {
  return (
    <PageContainer>
      <OdometerAuditView />
    </PageContainer>
  );
}
