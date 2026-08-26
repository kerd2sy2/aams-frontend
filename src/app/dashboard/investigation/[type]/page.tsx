'use client';

import { useParams } from 'next/navigation';
import { InvestigationPageContent } from '@/components/aams/investigation-page-content';

export default function InvestigationTypePage() {
  const params = useParams();
  const type = params.type as string;

  return <InvestigationPageContent investigationType={type} />;
}
