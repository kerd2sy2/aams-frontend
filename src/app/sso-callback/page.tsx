import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';
import { Icons } from '@/components/icons';

export default function SSOCallbackPage() {
  return (
    <div className='fixed inset-0 z-50 flex h-screen w-screen flex-col items-center justify-center bg-background' dir='rtl'>
      <div className='flex flex-col items-center justify-center gap-3 text-center'>
        <AuthenticateWithRedirectCallback />
        <Icons.spinner className='size-10 animate-spin text-primary' />
      </div>
    </div>
  );
}
