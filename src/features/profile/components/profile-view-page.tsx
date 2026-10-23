'use client';

import { useState } from 'react';
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
import { Icons } from '@/components/icons';
import { authApi } from '@/lib/aams/services';
import { getAdminUser, setAdminUser } from '@/lib/aams/auth';
import { Mail, Phone, Shield, Building2, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProfileViewPage() {
  const queryClient = useQueryClient();
  const cachedAdmin = getAdminUser();

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
                    {(admin?.avatar || admin?.google_avatar) && (
                      <AvatarImage src={admin.avatar || admin.google_avatar} alt={admin?.name} />
                    )}
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
                <CardDescription className='text-xs'>مستوى الوصول المصرح به لحسابك</CardDescription>
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

          {/* Right Column: Change Password */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Change Password Card */}
            <Card className='border shadow-xs'>
              <CardHeader className='pb-3'>
                <div className='flex items-center gap-2.5'>
                  <div className='size-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground'>
                    <Lock className='size-5' />
                  </div>
                  <div>
                    <CardTitle className='text-base font-bold'>تغيير كلمة المرور</CardTitle>
                    <CardDescription className='text-xs'>
                      تحديث كلمة المرور الخاصة بحسابك في النظام (الافتراضي: آخر 4 أرقام من رقم
                      الجوال)
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
      </div>
    </PageContainer>
  );
}
