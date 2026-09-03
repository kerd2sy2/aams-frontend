import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { otpApi } from '@/lib/aams/services';
import { OTPRequest } from '@/types/aams';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  IconKey,
  IconClock,
  IconCheck,
  IconX,
  IconRefresh,
  IconSearch,
  IconCopy,
  IconDeviceMobile,
  IconUser,
  IconAlertCircle,
  IconShieldCheck
} from '@tabler/icons-react';
import { toast } from 'sonner';

export default function OtpView() {
  const isRTL = true;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OTPRequest[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchOtps = useCallback(async () => {
    try {
      const res = await otpApi.getOTPList({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
        limit: 50
      });
      setData(res?.data || []);
    } catch (err: any) {
      console.error('Failed to fetch OTP requests:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchOtps();
  }, [fetchOtps]);

  // Auto-refresh interval (every 5 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchOtps();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOtps]);

  const handleCopyOtp = (otp: OTPRequest) => {
    navigator.clipboard.writeText(otp.otp_code);
    setCopiedId(otp.id);
    toast.success(
      isRTL
        ? `تم نسخ رمز التحقق للمندوب ${otp.employee_name}: ${otp.otp_code}`
        : `Copied OTP for ${otp.employee_name}: ${otp.otp_code}`
    );
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCancelOtp = async (otp: OTPRequest) => {
    if (
      !confirm(
        isRTL
          ? `هل أنت متأكد من إلغاء رمز التحقق للمندوب ${otp.employee_name}؟`
          : `Are you sure you want to cancel OTP for ${otp.employee_name}?`
      )
    ) {
      return;
    }
    try {
      await otpApi.cancel(otp.id);
      toast.success(isRTL ? 'تم إلغاء الرمز بنجاح' : 'OTP cancelled successfully');
      fetchOtps();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'فشل في إلغاء الرمز');
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const pending = data.filter((o) => o.status === 'PENDING').length;
    const verified = data.filter((o) => o.status === 'VERIFIED').length;
    const expired = data.filter((o) => o.status === 'EXPIRED' || o.status === 'CANCELLED').length;
    return { pending, verified, expired, total: data.length };
  }, [data]);

  const formatTimeAgo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const diffMs = Date.now() - d.getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return isRTL ? 'الآن' : 'Just now';
      if (mins === 1) return isRTL ? 'منذ دقيقة' : '1 min ago';
      if (mins < 60) return isRTL ? `منذ ${mins} دقيقة` : `${mins} mins ago`;
      const hours = Math.floor(mins / 60);
      return isRTL ? `منذ ${hours} ساعة` : `${hours} hrs ago`;
    } catch {
      return dateStr;
    }
  };

  const getTimeRemaining = (expiresAtStr: string) => {
    try {
      const exp = new Date(expiresAtStr).getTime();
      const diff = exp - Date.now();
      if (diff <= 0) return { text: isRTL ? 'منتهي الصلاحية' : 'Expired', isExpired: true };
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      return {
        text: isRTL
          ? `متبقي ${mins}:${String(secs).padStart(2, '0')}`
          : `${mins}:${String(secs).padStart(2, '0')} left`,
        isExpired: false
      };
    } catch {
      return { text: '', isExpired: false };
    }
  };

  return (
    <div className='flex flex-1 flex-col gap-6 p-4 md:p-8' dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'>
              <IconKey className='size-6' />
            </div>
            <div>
              <h1 className='text-2xl font-bold tracking-tight'>
                {isRTL ? 'رموز التحقق وتوثيق الأجهزة (OTP)' : 'OTP & Device Verification'}
              </h1>
              <p className='text-sm text-muted-foreground'>
                {isRTL
                  ? 'عرض ومتابعة رموز التحقق المكونة من 4 أرقام لتزويد المناديب بها وتوثيق أجهزتهم لحظياً'
                  : 'Real-time 4-digit verification codes to authenticate delegate devices'}
              </p>
            </div>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={
              autoRefresh
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : ''
            }
          >
            <span
              className={`inline-block size-2 rounded-full mr-2 ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`}
            />
            {autoRefresh
              ? isRTL
                ? 'التحديث التلقائي نشط'
                : 'Live Sync ON'
              : isRTL
                ? 'التحديث التلقائي متوقف'
                : 'Live Sync OFF'}
          </Button>

          <Button variant='default' size='sm' onClick={fetchOtps} disabled={loading}>
            <IconRefresh
              className={`size-4 ${loading ? 'animate-spin' : ''} ${isRTL ? 'ml-2' : 'mr-2'}`}
            />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Card className='border-orange-500/30 bg-orange-500/5 dark:bg-orange-950/20'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium text-orange-600 dark:text-orange-400'>
              {isRTL ? 'قيد الانتظار (نشط الآن)' : 'Active / Pending'}
            </CardTitle>
            <span className='flex size-3 rounded-full bg-orange-500 animate-ping' />
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-extrabold text-orange-600 dark:text-orange-400'>
              {stats.pending}
            </div>
            <p className='text-xs text-muted-foreground mt-1'>
              {isRTL ? 'بانتظار تزويد المندوب بالرمز' : 'Awaiting supervisor confirmation'}
            </p>
          </CardContent>
        </Card>

        <Card className='border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium text-emerald-600 dark:text-emerald-400'>
              {isRTL ? 'تم التحقق وتوثيق الجهاز' : 'Verified Devices'}
            </CardTitle>
            <IconShieldCheck className='size-5 text-emerald-600 dark:text-emerald-400' />
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-extrabold text-emerald-600 dark:text-emerald-400'>
              {stats.verified}
            </div>
            <p className='text-xs text-muted-foreground mt-1'>
              {isRTL ? 'تم الدخول وتوثيق الجهاز' : 'Successfully authenticated'}
            </p>
          </CardContent>
        </Card>

        <Card className='border-slate-500/30 bg-slate-500/5 dark:bg-slate-950/20'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>
              {isRTL ? 'منتهي أو ملغي' : 'Expired / Cancelled'}
            </CardTitle>
            <IconClock className='size-5 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-extrabold text-foreground'>{stats.expired}</div>
            <p className='text-xs text-muted-foreground mt-1'>
              {isRTL ? 'تجاوزت مهلة 15 دقيقة' : 'Past 15-minute validity window'}
            </p>
          </CardContent>
        </Card>

        <Card className='border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium text-blue-600 dark:text-blue-400'>
              {isRTL ? 'إجمالي طلبات OTP' : 'Total Requests'}
            </CardTitle>
            <IconKey className='size-5 text-blue-600 dark:text-blue-400' />
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-extrabold text-blue-600 dark:text-blue-400'>
              {stats.total}
            </div>
            <p className='text-xs text-muted-foreground mt-1'>
              {isRTL ? 'في السجل الحالي' : 'Recorded requests'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className='p-4'>
          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            {/* Search Input */}
            <div className='relative flex-1'>
              <IconSearch
                className={`absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`}
              />
              <Input
                placeholder={
                  isRTL
                    ? 'البحث باسم المندوب، رقم الهوية، أو رمز الـ OTP...'
                    : 'Search by delegate name, national ID, or OTP...'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={isRTL ? 'pr-9' : 'pl-9'}
              />
            </div>

            {/* Status Tabs */}
            <div className='flex items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1'>
              {[
                { id: 'ALL', label: isRTL ? 'الكل' : 'All' },
                { id: 'PENDING', label: isRTL ? 'قيد الانتظار (نشط)' : 'Pending' },
                { id: 'VERIFIED', label: isRTL ? 'تم التحقق' : 'Verified' },
                { id: 'EXPIRED', label: isRTL ? 'منتهي/ملغي' : 'Expired' }
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={statusFilter === tab.id ? 'default' : 'ghost'}
                  size='sm'
                  onClick={() => setStatusFilter(tab.id)}
                  className='text-xs h-8 whitespace-nowrap'
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main OTP Table */}
      <Card>
        <CardContent className='p-0'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[220px]'>{isRTL ? 'المندوب' : 'Delegate'}</TableHead>
                  <TableHead>{isRTL ? 'رقم الهوية الوطنية' : 'National ID'}</TableHead>
                  <TableHead className='text-center'>
                    {isRTL ? 'رمز الـ OTP (المشرف)' : '4-Digit OTP'}
                  </TableHead>
                  <TableHead>{isRTL ? 'حالة الطلب' : 'Status'}</TableHead>
                  <TableHead>{isRTL ? 'الجهاز / التطبيق' : 'Device Info'}</TableHead>
                  <TableHead>{isRTL ? 'وقت الطلب والصلاحية' : 'Timing & Expiry'}</TableHead>
                  <TableHead className='text-center'>{isRTL ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className='h-32 text-center text-muted-foreground'>
                      <IconRefresh className='mx-auto size-6 animate-spin mb-2' />
                      {isRTL ? 'جاري تحميل رموز التحقق...' : 'Loading OTP requests...'}
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className='h-32 text-center text-muted-foreground'>
                      <IconAlertCircle className='mx-auto size-8 text-muted-foreground/50 mb-2' />
                      {isRTL ? 'لا توجد طلبات رموز تحقق مطابقة' : 'No matching OTP requests found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((otp) => {
                    const remaining = getTimeRemaining(otp.expires_at);
                    const isPending = otp.status === 'PENDING' && !remaining.isExpired;

                    return (
                      <TableRow
                        key={otp.id}
                        className={isPending ? 'bg-orange-500/5 dark:bg-orange-950/10' : ''}
                      >
                        {/* Delegate Name & Photo */}
                        <TableCell>
                          <div className='flex items-center gap-3'>
                            <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold overflow-hidden border'>
                              {otp.employee?.personal_image ? (
                                <img
                                  src={otp.employee.personal_image}
                                  alt={otp.employee_name}
                                  className='size-full object-cover'
                                />
                              ) : (
                                <IconUser className='size-5' />
                              )}
                            </div>
                            <div className='min-w-0'>
                              <div className='font-bold truncate'>{otp.employee_name}</div>
                              <div className='text-xs text-muted-foreground'>
                                {otp.employee?.motorcycle_number
                                  ? `${isRTL ? 'دباب' : 'Bike'} #${otp.employee.motorcycle_number}`
                                  : otp.employee?.branch?.name ||
                                    (isRTL ? 'مندوب ميداني' : 'Field Delegate')}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* National ID */}
                        <TableCell>
                          <div className='font-mono font-semibold text-sm'>
                            💳 {otp.national_id}
                          </div>
                        </TableCell>

                        {/* Big 4-Digit OTP Code */}
                        <TableCell className='text-center'>
                          <div className='inline-flex items-center gap-2'>
                            <div
                              className={`px-4 py-1.5 rounded-xl font-mono text-xl font-black tracking-widest border shadow-sm ${
                                isPending
                                  ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-600 dark:text-orange-400 border-orange-500/40 ring-2 ring-orange-500/20'
                                  : otp.status === 'VERIFIED'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : 'bg-muted text-muted-foreground border-border opacity-60'
                              }`}
                            >
                              {otp.otp_code}
                            </div>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='size-8 rounded-lg text-muted-foreground hover:text-foreground'
                              onClick={() => handleCopyOtp(otp)}
                              title={isRTL ? 'نسخ الرمز' : 'Copy code'}
                            >
                              {copiedId === otp.id ? (
                                <IconCheck className='size-4 text-emerald-500' />
                              ) : (
                                <IconCopy className='size-4' />
                              )}
                            </Button>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {otp.status === 'VERIFIED' ? (
                            <Badge className='bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'>
                              <IconCheck className='size-3 mr-1' />
                              {isRTL ? 'تم التوثيق' : 'Verified'}
                            </Badge>
                          ) : isPending ? (
                            <Badge className='bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 hover:bg-orange-500/20 animate-pulse'>
                              <span className='size-1.5 rounded-full bg-orange-500 mr-1.5 inline-block' />
                              {isRTL ? 'نشط (بانتظار المندوب)' : 'Pending Entry'}
                            </Badge>
                          ) : (
                            <Badge variant='outline' className='text-muted-foreground'>
                              <IconX className='size-3 mr-1' />
                              {otp.status === 'CANCELLED'
                                ? isRTL
                                  ? 'ملغي'
                                  : 'Cancelled'
                                : isRTL
                                  ? 'منتهي الصلاحية'
                                  : 'Expired'}
                            </Badge>
                          )}
                        </TableCell>

                        {/* Device Info */}
                        <TableCell>
                          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                            <IconDeviceMobile className='size-4 shrink-0 text-foreground/70' />
                            <span className='truncate max-w-[140px]'>
                              {otp.device_info || (isRTL ? 'تطبيق المندوب' : 'Delegate App')}
                            </span>
                          </div>
                        </TableCell>

                        {/* Timing */}
                        <TableCell>
                          <div className='text-xs space-y-0.5'>
                            <div className='text-foreground font-medium'>
                              {formatTimeAgo(otp.created_at)}
                            </div>
                            {isPending && (
                              <div className='text-orange-600 dark:text-orange-400 font-semibold'>
                                ⏳ {remaining.text}
                              </div>
                            )}
                            {otp.verified_at && (
                              <div className='text-emerald-600 dark:text-emerald-400'>
                                ✓ {formatTimeAgo(otp.verified_at)}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className='text-center'>
                          <div className='flex items-center justify-center gap-1.5'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleCopyOtp(otp)}
                              className='h-8 text-xs'
                            >
                              <IconCopy className={`size-3.5 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                              {isRTL ? 'نسخ الرمز' : 'Copy'}
                            </Button>
                            {isPending && (
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => handleCancelOtp(otp)}
                                className='h-8 text-xs text-destructive hover:bg-destructive/10'
                              >
                                <IconX className={`size-3.5 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                {isRTL ? 'إلغاء' : 'Cancel'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
