import { PublicDocView } from '@/components/aams/public-doc-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'عرض الوثيقة الرسمية — AAMS Logistics',
  description: 'معاينة الوثيقة والمرفقات الرسمية المعتمدة لشركة AAMS للخدمات اللوجيستية'
};

export default async function PublicDocPage({
  params
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  return <PublicDocView docId={id} initialType={type} />;
}
