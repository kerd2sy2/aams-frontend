import { redirect } from 'next/navigation';

export default function InvestigationRedirectPage() {
  redirect('/dashboard/investigation/supervisor_report');
}
