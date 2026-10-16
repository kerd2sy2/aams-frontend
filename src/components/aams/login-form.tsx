'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { authApi, settingsApi } from '@/lib/aams/services';
import { setAdminUser, setTokens } from '@/lib/aams/auth';
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

  const [login, setLogin] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
      setError('يرجى إدخال رقم الجوال وكلمة المرور');
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

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className='overflow-hidden shadow-xl border-border/50'>
        <CardContent className='grid p-0 md:grid-cols-1'>
          <div className='p-6 md:p-8 space-y-6'>
            {/* Header: Logo and Title */}
            <div className='flex flex-col items-center text-center space-y-2'>
              <div className='flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20 mb-1'>
                {brandLogo ? (
                  <img
                    src={brandLogo}
                    alt={brandName}
                    className='size-9 object-contain rounded-xl'
                  />
                ) : (
                  <span className='text-2xl font-black'>{firstChar}</span>
                )}
              </div>
              <h1 className='text-2xl font-bold tracking-tight'>{brandName}</h1>
              <p className='text-muted-foreground text-xs max-w-xs'>
                منصة إدارة العمليات والتشغيل الميداني
              </p>
            </div>

            {error && (
              <div className='bg-destructive/10 text-destructive border-destructive/20 rounded-lg border px-4 py-3 text-center text-sm font-medium'>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className='grid gap-5'>
              <div className='grid gap-2'>
                <Label htmlFor='login'>رقم الجوال أو اسم المستخدم</Label>
                <Input
                  id='login'
                  type='text'
                  autoComplete='username'
                  placeholder='05xxxxxxxx أو user@aams.com'
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className='h-10 text-right'
                  dir='ltr'
                />
              </div>

              <div className='grid gap-2'>
                <div className='flex items-center justify-between'>
                  <Label htmlFor='password'>كلمة المرور</Label>
                  <span className='text-[11px] text-muted-foreground'>
                    (الافتراضي: آخر 4 أرقام من الجوال)
                  </span>
                </div>
                <div className='relative'>
                  <Input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    autoComplete='current-password'
                    placeholder='آخر 4 أرقام من رقم الجوال'
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

              <Button
                type='submit'
                className='h-10 w-full font-semibold shadow-xs'
                disabled={loading}
              >
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

            <p className='text-muted-foreground text-center text-xs'>
              جميع الحقوق محفوظة &copy; {new Date().getFullYear()} {brandName}
            </p>
          </div>
        </CardContent>
      </Card>
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
