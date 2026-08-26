'use client';

import { useParams } from 'next/navigation';
import { InvestigationPageContent } from '@/components/aams/investigation-page-content';

export default function InvestigationDetailPage() {
  const params = useParams();
  const type = params.type as string;
  const id = params.id as string;

  return <InvestigationPageContent investigationType={type} viewId={id} />;
}
