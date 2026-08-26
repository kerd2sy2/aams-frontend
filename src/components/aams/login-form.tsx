'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { GoogleIcon } from '@/components/aams/google-auth';
import { authApi, settingsApi } from '@/lib/aams/services';
import { setAdminUser, setTokens } from '@/lib/aams/auth';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

function normalizeDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .trim();
}

export function LoginFormContent({ className, ...props }: React.ComponentProps<'div'>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clerk = useClerk();

  const [login, setLogin] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [notLinkedAlert, setNotLinkedAlert] = React.useState<{
    email: string;
    open: boolean;
  }>({ email: '', open: false });

  // Detect if redirected back from Google with not_linked error
  React.useEffect(() => {
    const errType = searchParams.get('error');
    const email = searchParams.get('email');
    if (errType === 'not_linked' && email) {
      setNotLinkedAlert({ email, open: true });
    }
  }, [searchParams]);

  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsApi.getPublic(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false
  });

  const brandName = settings?.site_name || 'AAMS';
  const brandLogo = settings?.logo_url || '';
  const firstChar = brandName.charAt(0) || 'ن';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanLogin = normalizeDigits(login);
    const cleanPassword = normalizeDigits(password);

    if (!cleanLogin || !cleanPassword) {
      setError('يرجى إدخال البريد الإلكتروني أو اسم المستخدم وكلمة المرور');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login(cleanLogin, cleanPassword);
      setTokens(res.access_token, res.refresh_token);
      setAdminUser(res.admin);
      toast.success(`أهلاً بك، ${res.admin.name}`);
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'بيانات الدخول غير صحيحة';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // Trigger real Google OAuth redirect safely
  async function handleGoogleOAuth() {
    setGoogleLoading(true);
    setError(null);

    try {
      if (clerk.session || clerk.user) {
        await clerk.signOut();
      }

      const redirectParams = {
        strategy: 'oauth_google' as const,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/auth/google-callback?mode=login'
      };

      // 1. Try clerk.client.signIn
      if (clerk.client?.signIn && typeof clerk.client.signIn.authenticateWithRedirect === 'function') {
        await clerk.client.signIn.authenticateWithRedirect(redirectParams);
        return;
      }

      // 2. Try clerk.client.signUp
      if (clerk.client?.signUp && typeof clerk.client.signUp.authenticateWithRedirect === 'function') {
        await clerk.client.signUp.authenticateWithRedirect(redirectParams);
        return;
      }

      // 3. Try clerk.authenticateWithRedirect
      if (typeof (clerk as any).authenticateWithRedirect === 'function') {
        await (clerk as any).authenticateWithRedirect(redirectParams);
        return;
      }

      // 4. Fallback: redirectToSignIn
      if (typeof clerk.redirectToSignIn === 'function') {
        clerk.redirectToSignIn({
          signInFallbackRedirectUrl: '/auth/google-callback?mode=login',
          signUpFallbackRedirectUrl: '/auth/google-callback?mode=login'
        });
        return;
      }

      // 7. Last fallback: openSignIn
      if (typeof clerk.openSignIn === 'function') {
        clerk.openSignIn({
          fallbackRedirectUrl: '/auth/google-callback?mode=login',
          signUpFallbackRedirectUrl: '/auth/google-callback?mode=login'
        });
      }
    } catch (err: unknown) {
      console.error('Google OAuth error:', err);
      const msg = (err as { message?: string })?.message || 'فشل التحويل إلى تسجيل الدخول بواسطة Google';
      setError(msg);
      toast.error(msg);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props} dir='rtl'>
      <Card className='w-full overflow-hidden shadow-xl'>
        <CardContent className='p-8'>
          <div className='flex flex-col gap-6'>
            {/* Brand header */}
            <div className='flex flex-col items-center gap-3 text-center'>
              <div className='flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary'>
                {brandLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={brandLogo}
                    alt={brandName}
                    className='h-full w-full object-contain p-1.5'
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className='text-xl font-black'>{firstChar}</span>
                )}
              </div>
              <div>
                <h1 className='text-2xl font-bold tracking-tight'>{brandName}</h1>
                <p className='text-muted-foreground mt-1 text-sm'>
                  نظام متابعة وإدارة مناديب التوصيل
                </p>
              </div>
            </div>

            {error && (
              <div className='bg-destructive/10 text-destructive border-destructive/20 rounded-lg border px-4 py-3 text-center text-sm font-medium'>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className='grid gap-5'>
              <div className='grid gap-2'>
                <Label htmlFor='login'>البريد الإلكتروني أو اسم المستخدم</Label>
                <Input
                  id='login'
                  type='text'
                  autoComplete='username'
                  placeholder='user@aams.com'
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className='h-10 text-right'
                  dir='ltr'
                />
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='password'>كلمة المرور</Label>
                <div className='relative'>
                  <Input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    autoComplete='current-password'
                    placeholder='••••••••'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className='h-10 pl-10 text-right'
                    dir='ltr'
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword((s) => !s)}
                    className='text-muted-foreground hover:text-foreground absolute left-0 top-0 flex h-full items-center px-3 transition-colors'
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <Icons.eyeOff className='size-4' />
                    ) : (
                      <Icons.lock className='size-4' />
                    )}
                  </button>
                </div>
              </div>

              <Button type='submit' className='h-10 w-full font-semibold shadow-xs' disabled={loading}>
                {loading ? (
                  <>
                    <Icons.spinner className='ml-2 size-4 animate-spin' />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  <>
                    <Icons.shield className='ml-2 size-4' />
                    تسجيل الدخول
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className='relative flex items-center justify-center'>
              <Separator className='w-full' />
              <span className='absolute bg-card px-3 text-xs text-muted-foreground'>
                أو الدخول باستخدام
              </span>
            </div>

            {/* Official Google OAuth Sign-in Button */}
            <div>
              <Button
                type='button'
                variant='outline'
                disabled={googleLoading}
                onClick={handleGoogleOAuth}
                className='h-11 w-full font-bold border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-2xs gap-3 flex items-center justify-center cursor-pointer'
              >
                {googleLoading ? (
                  <Icons.spinner className='size-5 animate-spin' />
                ) : (
                  <GoogleIcon className='size-5' />
                )}
                <span>
                  {googleLoading
                    ? 'جاري التحويل إلى Google...'
                    : 'تسجيل الدخول بواسطة Google'}
                </span>
              </Button>
            </div>

            <p className='text-muted-foreground text-center text-xs'>
              جميع الحقوق محفوظة &copy; {new Date().getFullYear()} {brandName}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alert Dialog: Google Account Not Linked */}
      <Dialog
        open={notLinkedAlert.open}
        onOpenChange={(open) => setNotLinkedAlert({ ...notLinkedAlert, open })}
      >
        <DialogContent className='sm:max-w-md' dir='rtl'>
          <DialogHeader className='text-right'>
            <div className='flex items-center gap-2 text-destructive mb-1'>
              <ShieldAlert className='size-6' />
              <DialogTitle className='text-base font-bold'>الحساب غير مرتبط بنظام AAMS</DialogTitle>
            </div>
            <DialogDescription className='text-xs leading-relaxed text-foreground pt-2'>
              حساب Google التابع للبريد <strong className='font-mono text-primary' dir='ltr'>«{notLinkedAlert.email}»</strong> غير مرتبط بأي حساب إداري مصرح به في قاعدة البيانات.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs leading-relaxed'>
            <p className='font-bold flex items-center gap-1.5'>
              <AlertTriangle className='size-4 text-amber-600 shrink-0' />
              كيفية تفعيل الدخول بحساب Google:
            </p>
            <ol className='list-decimal list-inside space-y-1 text-[11px] pr-1'>
              <li>سجّل الدخول أولاً باستخدام <strong>اسم المستخدم وكلمة المرور</strong>.</li>
              <li>انتقل إلى <strong>صفحة الملف الشخصي</strong> من القائمة العلوية.</li>
              <li>اضغط على <strong>«ربط حساب Google»</strong> وقم بتأكيد حسابك في Google.</li>
              <li>بعد ذلك ستتمكن من تسجيل الدخول بضغطة زر واحدة دائماً.</li>
            </ol>
          </div>

          <DialogFooter className='sm:justify-start'>
            <Button
              onClick={() => {
                setNotLinkedAlert({ email: '', open: false });
                router.replace('/login');
              }}
              className='w-full font-bold'
            >
              فهمت، العودة لتسجيل الدخول
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function LoginForm(props: React.ComponentProps<'div'>) {
  return (
    <React.Suspense fallback={<div className='p-8 text-center'>جاري التحميل...</div>}>
      <LoginFormContent {...props} />
    </React.Suspense>
  );
}
