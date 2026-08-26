'use client';

import { useState } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { authApi } from '@/lib/aams/services';
import { getAdminUser, setAdminUser } from '@/lib/aams/auth';
import {
  Mail,
  Phone,
  Shield,
  Building2,
  Lock,
  Eye,
  EyeOff,
  Unlink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProfileViewPage() {
  const queryClient = useQueryClient();
  const cachedAdmin = getAdminUser();
  const clerk = useClerk();

  const [googleLoading, setGoogleLoading] = useState(false);

  // Fetch real-time user info
  const { data: admin = cachedAdmin } = useQuery({
    queryKey: ['admin-me'],
    queryFn: async () => {
      const me = await authApi.me();
      if (me) setAdminUser(me);
      return me;
    },
    initialData: cachedAdmin || undefined
  });

  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);

  // Change Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Trigger Google OAuth for Linking
  const handleTriggerGoogleLink = async () => {
    setGoogleLoading(true);
    try {
      if (clerk.session || clerk.user) {
        await clerk.signOut();
      }

      const redirectParams = {
        strategy: 'oauth_google' as const,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/auth/google-callback?mode=link'
      };

      if (clerk.client?.signIn && typeof clerk.client.signIn.authenticateWithRedirect === 'function') {
        await clerk.client.signIn.authenticateWithRedirect(redirectParams);
        return;
      }

      if (clerk.client?.signUp && typeof clerk.client.signUp.authenticateWithRedirect === 'function') {
        await clerk.client.signUp.authenticateWithRedirect(redirectParams);
        return;
      }

      if (typeof (clerk as any).authenticateWithRedirect === 'function') {
        await (clerk as any).authenticateWithRedirect(redirectParams);
        return;
      }

      if (typeof clerk.redirectToSignIn === 'function') {
        clerk.redirectToSignIn({
          signInFallbackRedirectUrl: '/auth/google-callback?mode=link',
          signUpFallbackRedirectUrl: '/auth/google-callback?mode=link'
        });
        return;
      }

      if (typeof clerk.openSignIn === 'function') {
        clerk.openSignIn({
          fallbackRedirectUrl: '/auth/google-callback?mode=link',
          signUpFallbackRedirectUrl: '/auth/google-callback?mode=link'
        });
      }
    } catch (err: unknown) {
      console.error('Google OAuth link error:', err);
      const msg = (err as { message?: string })?.message || 'فشل التحويل إلى Google';
      toast.error(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Unlink Google mutation
  const unlinkGoogleMutation = useMutation({
    mutationFn: () => authApi.unlinkGoogle(),
    onSuccess: (res) => {
      toast.success(res.message || 'تم إلغاء ربط حساب Google بنجاح');
      queryClient.invalidateQueries({ queryKey: ['admin-me'] });
      setUnlinkDialogOpen(false);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'فشل في إلغاء ربط حساب Google';
      toast.error(msg);
    }
  });

  // Change Password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { old_password: string; new_password: string }) =>
      authApi.changePassword(data),
    onSuccess: (res) => {
      toast.success(res.message || 'تم تغيير كلمة المرور بنجاح');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'فشل في تغيير كلمة المرور';
      toast.error(msg);
    }
  });

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      toast.error('يرجى إدخال كلمة المرور الحالية');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }

    changePasswordMutation.mutate({
      old_password: oldPassword,
      new_password: newPassword
    });
  };

  const isGoogleLinked = !!(admin?.google_email || admin?.is_google_linked);
  const initials = (admin?.name || 'U').charAt(0).toUpperCase();

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-6 max-w-5xl mx-auto w-full' dir='rtl'>
        <Heading
          title='الملف الشخصي وإعدادات الأمان'
          description='عرض وتعديل معلومات حسابك، ربط الدخول بواسطة Google، وتغيير كلمة المرور'
        />

        <Separator />

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Left Column: User Profile Card */}
          <div className='lg:col-span-1 space-y-6'>
            <Card className='border shadow-xs overflow-hidden'>
              <div className='h-24 bg-gradient-to-l from-primary/20 via-primary/10 to-transparent' />
              <CardContent className='pt-0 -mt-12 text-center pb-6'>
                <div className='flex justify-center mb-3'>
                  <Avatar className='size-24 border-4 border-background shadow-md ring-2 ring-primary/20'>
                    {admin?.google_avatar && <AvatarImage src={admin.google_avatar} alt={admin?.name} />}
                    <AvatarFallback className='text-2xl font-black bg-primary/10 text-primary'>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <h2 className='text-lg font-bold text-foreground'>{admin?.name || 'المستخدم'}</h2>
                <p className='text-xs font-mono text-muted-foreground mt-0.5' dir='ltr'>
                  @{admin?.username || 'user'}
                </p>

                <div className='mt-3 flex flex-wrap items-center justify-center gap-1.5'>
                  <Badge
                    variant='outline'
                    className={cn(
                      'px-2.5 py-0.5 text-xs font-bold border',
                      admin?.role === 'ADMIN' || admin?.role === 'SUPER_ADMIN'
                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                    )}
                  >
                    {admin?.role === 'ADMIN' || admin?.role === 'SUPER_ADMIN'
                      ? 'مدير عام للنظام'
                      : 'مشرف وردية'}
                  </Badge>

                  {admin?.branch ? (
                    <Badge variant='secondary' className='text-xs font-medium gap-1'>
                      <Building2 className='size-3' />
                      {admin.branch.name}
                    </Badge>
                  ) : (
                    <Badge variant='secondary' className='text-xs font-medium'>
                      الإدارة العامة
                    </Badge>
                  )}
                </div>

                <Separator className='my-4' />

                <div className='space-y-3 text-right text-xs'>
                  <div className='flex items-center justify-between text-muted-foreground'>
                    <span className='flex items-center gap-1.5'>
                      <Mail className='size-3.5' />
                      البريد الإلكتروني:
                    </span>
                    <span className='font-mono text-foreground' dir='ltr'>
                      {admin?.email || '—'}
                    </span>
                  </div>

                  <div className='flex items-center justify-between text-muted-foreground'>
                    <span className='flex items-center gap-1.5'>
                      <Phone className='size-3.5' />
                      رقم الهاتف:
                    </span>
                    <span className='font-mono text-foreground' dir='ltr'>
                      {admin?.phone || '—'}
                    </span>
                  </div>

                  <div className='flex items-center justify-between text-muted-foreground'>
                    <span className='flex items-center gap-1.5'>
                      <GoogleIcon className='size-3.5' />
                      حساب Google:
                    </span>
                    {isGoogleLinked ? (
                      <span className='font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1'>
                        <CheckCircle2 className='size-3' />
                        مربوط
                      </span>
                    ) : (
                      <span className='text-amber-600 dark:text-amber-400 font-medium'>
                        غير مربوط
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permissions list summary */}
            <Card className='border shadow-xs'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm font-bold flex items-center gap-2'>
                  <Shield className='size-4 text-primary' />
                  الصلاحيات المفعلة
                </CardTitle>
                <CardDescription className='text-xs'>
                  مستوى الوصول المصرح به لحسابك
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                {admin?.role === 'ADMIN' || admin?.role === 'SUPER_ADMIN' ? (
                  <div className='p-3 rounded-lg bg-purple-500/10 border border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-2'>
                    <Shield className='size-4 shrink-0' />
                    <span>صلاحيات المدير العام الكاملة (وصول شامل لكافة أقسام النظام)</span>
                  </div>
                ) : (
                  <div className='flex flex-wrap gap-1.5'>
                    {(admin?.permissions || []).map((perm, idx) => (
                      <Badge key={idx} variant='outline' className='text-[11px] font-mono'>
                        {perm}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Google Account Link & Change Password */}
          <div className='lg:col-span-2 space-y-6'>
            {/* 1. Google Account Linking Card */}
            <Card className='border shadow-xs border-primary/20'>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2.5'>
                    <div className='size-9 rounded-xl bg-white shadow-xs border p-1.5 flex items-center justify-center'>
                      <GoogleIcon className='size-6' />
                    </div>
                    <div>
                      <CardTitle className='text-base font-bold'>
                        ربط حساب Google (Sign-in with Google)
                      </CardTitle>
                      <CardDescription className='text-xs'>
                        تسجيل الدخول السريع إلى لوحة التحكم بحسابك في Google
                      </CardDescription>
                    </div>
                  </div>

                  {isGoogleLinked ? (
                    <Badge variant='outline' className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 gap-1'>
                      <CheckCircle2 className='size-3.5' />
                      مربوط بنجاح
                    </Badge>
                  ) : (
                    <Badge variant='outline' className='bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 gap-1'>
                      <AlertCircle className='size-3.5' />
                      غير مربوط
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className='space-y-4'>
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  {isGoogleLinked
                    ? `حسابك الإداري مرتبط حالياً بحساب Google التابع للبريد الإلكتروني (${admin?.google_email || admin?.email}). يمكنك استخدامه لتسجيل الدخول بضغطة زر واحدة من صفحة الدخول.`
                    : 'بالضغط على الزر أدناه، ستفتح لك نافذة Google لاختيار حسابك وربطه بحسابك الإداري الحالي، لتتمكن من تسجيل الدخول بضغطة زر واحدة دائماً.'}
                </p>

                {isGoogleLinked ? (
                  <div className='p-3.5 rounded-xl bg-muted/40 border flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                    <div className='flex items-center gap-2.5'>
                      <div className='size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0'>
                        <GoogleIcon className='size-4' />
                      </div>
                      <div>
                        <p className='text-xs text-muted-foreground font-medium'>حساب Google المرتبط:</p>
                        <p className='text-sm font-bold font-mono text-foreground' dir='ltr'>
                          {admin?.google_email || admin?.email}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setUnlinkDialogOpen(true)}
                      className='text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5 h-8 font-semibold'
                    >
                      <Unlink className='size-3.5' />
                      <span>إلغاء ربط الحساب</span>
                    </Button>
                  </div>
                ) : (
                  <div className='flex items-center gap-3 pt-1'>
                    <Button
                      onClick={handleTriggerGoogleLink}
                      disabled={googleLoading}
                      className='gap-2 font-bold shadow-xs cursor-pointer'
                    >
                      {googleLoading ? (
                        <Icons.spinner className='size-4 animate-spin' />
                      ) : (
                        <GoogleIcon className='size-4' />
                      )}
                      <span>
                        {googleLoading
                          ? 'جاري التحويل إلى Google...'
                          : 'ربط حساب Google الآن'}
                      </span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Change Password Card */}
            <Card className='border shadow-xs'>
              <CardHeader className='pb-3'>
                <div className='flex items-center gap-2.5'>
                  <div className='size-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground'>
                    <Lock className='size-5' />
                  </div>
                  <div>
                    <CardTitle className='text-base font-bold'>تغيير كلمة المرور</CardTitle>
                    <CardDescription className='text-xs'>
                      تحديث كلمة المرور الخاصة بحسابك في النظام
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePasswordSubmit} className='space-y-4 max-w-md'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>كلمة المرور الحالية</Label>
                    <div className='relative'>
                      <Input
                        required
                        type={showOldPass ? 'text' : 'password'}
                        placeholder='••••••••'
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className='pl-9 font-mono'
                        dir='ltr'
                      />
                      <button
                        type='button'
                        onClick={() => setShowOldPass(!showOldPass)}
                        className='absolute left-3 top-2.5 text-muted-foreground hover:text-foreground'
                      >
                        {showOldPass ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
                      </button>
                    </div>
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>كلمة المرور الجديدة</Label>
                    <div className='relative'>
                      <Input
                        required
                        type={showNewPass ? 'text' : 'password'}
                        placeholder='6 أحرف على الأقل'
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className='pl-9 font-mono'
                        dir='ltr'
                      />
                      <button
                        type='button'
                        onClick={() => setShowNewPass(!showNewPass)}
                        className='absolute left-3 top-2.5 text-muted-foreground hover:text-foreground'
                      >
                        {showNewPass ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
                      </button>
                    </div>
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>تأكيد كلمة المرور الجديدة</Label>
                    <Input
                      required
                      type='password'
                      placeholder='أعد كتابة كلمة المرور الجديدة'
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className='font-mono'
                      dir='ltr'
                    />
                  </div>

                  <Button
                    type='submit'
                    disabled={changePasswordMutation.isPending}
                    className='gap-2 font-bold shadow-xs mt-2'
                  >
                    {changePasswordMutation.isPending && (
                      <Icons.spinner className='size-4 animate-spin' />
                    )}
                    <span>حفظ كلمة المرور الجديدة</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialog: Unlink Google Account */}
        <Dialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
          <DialogContent className='sm:max-w-md' dir='rtl'>
            <DialogHeader className='text-right'>
              <DialogTitle className='text-destructive flex items-center gap-2'>
                <Unlink className='size-5' />
                تأكيد إلغاء ربط حساب Google
              </DialogTitle>
              <DialogDescription className='text-sm mt-2'>
                هل أنت متأكد من رغبتك في إلغاء ربط حساب Google ({admin?.google_email || admin?.email})؟
                <br />
                لن تتمكن بعد ذلك من تسجيل الدخول بواسطة Google حتى تقوم بإعادة ربطه مرة أخرى.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className='gap-2 sm:justify-start'>
              <Button
                variant='outline'
                onClick={() => setUnlinkDialogOpen(false)}
                disabled={unlinkGoogleMutation.isPending}
              >
                تراجع
              </Button>
              <Button
                variant='destructive'
                disabled={unlinkGoogleMutation.isPending}
                onClick={() => unlinkGoogleMutation.mutate()}
                className='gap-2 font-bold'
              >
                {unlinkGoogleMutation.isPending && (
                  <Icons.spinner className='size-4 animate-spin' />
                )}
                تأكيد إلغاء الربط
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
