'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ImageUploader } from '@/components/aams/image-uploader';
import {
  broadcastApi,
  branchApi,
  BroadcastNotificationItem,
  BroadcastVoteItem
} from '@/lib/aams/services';
import {
  IconSend,
  IconBell,
  IconPhoto,
  IconUsers,
  IconCheck,
  IconX,
  IconTrash,
  IconChartBar,
  IconDeviceMobile,
  IconInfoCircle,
  IconClock,
  IconRefresh,
  IconSearch,
  IconBuilding
} from '@tabler/icons-react';

export default function BroadcastNotificationsPage() {
  const queryClient = useQueryClient();

  // Dialog & Form states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [target, setTarget] = useState('ALL');
  const [branchId, setBranchId] = useState<string>('all');
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');

  // Voters modal
  const [selectedBroadcastForVotes, setSelectedBroadcastForVotes] =
    useState<BroadcastNotificationItem | null>(null);
  const [votersSearch, setVotersSearch] = useState('');

  // Image zoom modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Queries
  const {
    data: broadcastsData,
    isLoading: isLoadingBroadcasts,
    refetch: refetchBroadcasts
  } = useQuery({
    queryKey: ['broadcast-notifications'],
    queryFn: () => broadcastApi.list(),
    refetchInterval: 10000
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => branchApi.getAll()
  });

  const { data: votesData, isLoading: isLoadingVotes } = useQuery({
    queryKey: ['broadcast-votes', selectedBroadcastForVotes?.id],
    queryFn: () =>
      selectedBroadcastForVotes ? broadcastApi.getVotes(selectedBroadcastForVotes.id) : null,
    enabled: Boolean(selectedBroadcastForVotes)
  });

  // Mutations
  const sendMutation = useMutation({
    mutationFn: broadcastApi.send,
    onSuccess: () => {
      toast.success('تم إرسال الإشعار الجماعي بنجاح لجميع الهواتف');
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['broadcast-notifications'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'فشل إرسال الإشعار الجماعي');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: broadcastApi.delete,
    onSuccess: () => {
      toast.success('تم حذف الإشعار بنجاح');
      queryClient.invalidateQueries({ queryKey: ['broadcast-notifications'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'فشل حذف الإشعار');
    }
  });

  function resetForm() {
    setTitle('');
    setBody('');
    setImageUrl('');
    setTarget('ALL');
    setBranchId('all');
    setHasPoll(false);
    setPollQuestion('');
  }

  function handleSendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error('يرجى كتابة عنوان الإشعار ونصه');
      return;
    }

    if (hasPoll && !pollQuestion.trim()) {
      // Default to title if empty
      setPollQuestion(title.trim());
    }

    sendMutation.mutate({
      title: title.trim(),
      body: body.trim(),
      image_url: imageUrl.trim() || undefined,
      target: branchId !== 'all' ? 'BRANCH' : 'ALL',
      branch_id: branchId !== 'all' ? branchId : undefined,
      has_poll: hasPoll,
      poll_question: hasPoll ? pollQuestion.trim() || title.trim() : undefined
    });
  }

  const broadcasts = broadcastsData?.data || [];
  const totalPolls = broadcasts.filter((b) => b.has_poll).length;
  const totalVotesCount = broadcasts.reduce(
    (acc, b) => acc + (b.agree_count || 0) + (b.disagree_count || 0),
    0
  );

  // Filter voters in modal
  const votersList = (votesData?.data || []).filter((v) => {
    if (!votersSearch.trim()) return true;
    const s = votersSearch.toLowerCase();
    return (
      v.employee_name?.toLowerCase().includes(s) ||
      v.national_id?.toLowerCase().includes(s) ||
      v.phone?.toLowerCase().includes(s)
    );
  });

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col gap-6' dir='rtl'>
        {/* Header */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight flex items-center gap-2'>
              <span>الإشعارات الجماعية واستبيانات الهواتف</span>
              <span className='text-xl'>📢</span>
            </h1>
            <p className='text-muted-foreground text-sm mt-1'>
              إرسال إشعارات وتنبيهات فورية لجميع هواتف المناديب مع إرفاق صورة واستطلاع رأي (موافق /
              معترض) ومتابعة النتائج لحظياً.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetchBroadcasts()}
              className='gap-1.5'
            >
              <IconRefresh className='h-4 w-4' />
              تحديث
            </Button>
            <Button
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
              className='gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md'
            >
              <IconSend className='h-4 w-4' />
              إرسال إشعار جماعي جديد
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Card className='border-r-4 border-r-blue-500 shadow-sm'>
            <CardContent className='p-4 flex items-center justify-between'>
              <div>
                <p className='text-xs font-medium text-muted-foreground'>إجمالي الإشعارات المرسلة</p>
                <p className='text-2xl font-bold mt-1'>{broadcasts.length}</p>
              </div>
              <div className='h-11 w-11 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600'>
                <IconBell className='h-6 w-6' />
              </div>
            </CardContent>
          </Card>

          <Card className='border-r-4 border-r-emerald-500 shadow-sm'>
            <CardContent className='p-4 flex items-center justify-between'>
              <div>
                <p className='text-xs font-medium text-muted-foreground'>استبيانات موافق / معترض</p>
                <p className='text-2xl font-bold mt-1 text-emerald-600'>{totalPolls}</p>
              </div>
              <div className='h-11 w-11 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600'>
                <IconChartBar className='h-6 w-6' />
              </div>
            </CardContent>
          </Card>

          <Card className='border-r-4 border-r-indigo-500 shadow-sm'>
            <CardContent className='p-4 flex items-center justify-between'>
              <div>
                <p className='text-xs font-medium text-muted-foreground'>إجمالي أصوات المناديب</p>
                <p className='text-2xl font-bold mt-1 text-indigo-600'>{totalVotesCount}</p>
              </div>
              <div className='h-11 w-11 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600'>
                <IconUsers className='h-6 w-6' />
              </div>
            </CardContent>
          </Card>

          <Card className='border-r-4 border-r-amber-500 shadow-sm'>
            <CardContent className='p-4 flex items-center justify-between'>
              <div>
                <p className='text-xs font-medium text-muted-foreground'>تصل الهواتف مباشرة</p>
                <p className='text-2xl font-bold mt-1 text-amber-600'>100%</p>
              </div>
              <div className='h-11 w-11 rounded-full bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600'>
                <IconDeviceMobile className='h-6 w-6' />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Broadcasts List */}
        <Card className='shadow-sm'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-lg font-bold flex items-center gap-2'>
              <IconBell className='h-5 w-5 text-primary' />
              سجل الإشعارات الجماعية المرسلة
            </CardTitle>
            <CardDescription>
              قائمة بجميع الإشعارات السابقة الموجهة لهواتف المناديب ومتابعة نتائج التصويت واستطلاعات
              الرأي
            </CardDescription>
          </CardHeader>
          <CardContent className='p-0'>
            {isLoadingBroadcasts ? (
              <div className='py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2'>
                <IconRefresh className='h-8 w-8 animate-spin text-primary' />
                <p className='text-sm'>جاري تحميل الإشعارات...</p>
              </div>
            ) : broadcasts.length === 0 ? (
              <div className='py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3'>
                <div className='h-14 w-14 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground'>
                  <IconBell className='h-7 w-7' />
                </div>
                <div>
                  <p className='font-semibold text-base text-foreground'>
                    لا توجد أي إشعارات جماعية حتى الآن
                  </p>
                  <p className='text-xs mt-1'>
                    يمكنك إنشاء إشعار جماعي وإرفاق صورة أو استبيان بالنقر على الزر أعلاه
                  </p>
                </div>
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  size='sm'
                  className='mt-2 bg-emerald-600 hover:bg-emerald-700 text-white'
                >
                  إرسال أول إشعار
                </Button>
              </div>
            ) : (
              <div className='divide-y divide-border'>
                {broadcasts.map((item) => {
                  const totalVotes = (item.agree_count || 0) + (item.disagree_count || 0);
                  const agreePercent =
                    totalVotes > 0 ? Math.round((item.agree_count / totalVotes) * 100) : 0;
                  const disagreePercent =
                    totalVotes > 0 ? Math.round((item.disagree_count / totalVotes) * 100) : 0;

                  return (
                    <div
                      key={item.id}
                      className='p-5 hover:bg-muted/20 transition-colors flex flex-col gap-4'
                    >
                      <div className='flex flex-col md:flex-row md:items-start justify-between gap-4'>
                        {/* Right: Info & Image */}
                        <div className='flex items-start gap-4 flex-1'>
                          {item.image_url ? (
                            <button
                              type='button'
                              onClick={() => setPreviewImage(item.image_url!)}
                              className='relative group shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-border shadow-sm bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary'
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.image_url}
                                alt={item.title}
                                className='w-full h-full object-cover group-hover:scale-105 transition-transform'
                              />
                              <div className='absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium'>
                                تكبير
                              </div>
                            </button>
                          ) : (
                            <div className='shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary'>
                              <IconBell className='h-6 w-6' />
                            </div>
                          )}

                          <div className='space-y-1.5 flex-1 min-w-0'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <h3 className='text-base font-bold text-foreground'>{item.title}</h3>
                              <Badge
                                variant={item.target === 'ALL' ? 'default' : 'secondary'}
                                className='text-xs'
                              >
                                {item.target === 'ALL'
                                  ? '🌍 جميع الفروع'
                                  : `🏢 فرع: ${item.branch_name || 'محدد'}`}
                              </Badge>
                              {item.has_poll && (
                                <Badge className='bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs'>
                                  <IconChartBar className='h-3.5 w-3.5' />
                                  استبيان (موافق / معترض)
                                </Badge>
                              )}
                            </div>
                            <p className='text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed'>
                              {item.body}
                            </p>

                            <div className='flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1'>
                              <span className='flex items-center gap-1'>
                                <IconClock className='h-3.5 w-3.5' />
                                {new Date(item.created_at).toLocaleString('ar-SA')}
                              </span>
                              <span>بواسطة: {item.created_by || 'الإدارة'}</span>
                              <span className='flex items-center gap-1 font-medium text-primary'>
                                <IconDeviceMobile className='h-3.5 w-3.5' />
                                وصل إلى: {item.sent_count || 0} هاتف
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Left: Actions */}
                        <div className='flex items-center gap-2 self-end md:self-start shrink-0'>
                          {item.has_poll && (
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => {
                                setSelectedBroadcastForVotes(item);
                                setVotersSearch('');
                              }}
                              className='gap-1.5 text-xs font-medium border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950'
                            >
                              <IconUsers className='h-4 w-4' />
                              عرض المصوتين ({totalVotes})
                            </Button>
                          )}
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => {
                              if (confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            className='text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 h-8 w-8 p-0'
                          >
                            <IconTrash className='h-4 w-4' />
                          </Button>
                        </div>
                      </div>

                      {/* Poll Results Section */}
                      {item.has_poll && (
                        <div className='mt-1 p-3.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40'>
                          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2'>
                            <p className='text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5'>
                              <span>سؤال الاستبيان:</span>
                              <span className='underline font-bold'>
                                {item.poll_question || item.title}
                              </span>
                            </p>
                            <span className='text-xs text-muted-foreground'>
                              إجمالي الردود: <strong>{totalVotes}</strong> مندوب
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className='w-full h-3 bg-muted rounded-full overflow-hidden flex shadow-inner'>
                            <div
                              style={{ width: `${agreePercent}%` }}
                              className='bg-emerald-500 h-full transition-all duration-500'
                              title={`موافق: ${item.agree_count} (${agreePercent}%)`}
                            />
                            <div
                              style={{ width: `${disagreePercent}%` }}
                              className='bg-rose-500 h-full transition-all duration-500'
                              title={`معترض: ${item.disagree_count} (${disagreePercent}%)`}
                            />
                          </div>

                          <div className='flex items-center justify-between mt-2.5 text-xs font-semibold'>
                            <div className='flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400'>
                              <div className='h-3 w-3 rounded-full bg-emerald-500' />
                              <span>
                                موافق: {item.agree_count} ({agreePercent}%)
                              </span>
                            </div>
                            <div className='flex items-center gap-1.5 text-rose-700 dark:text-rose-400'>
                              <div className='h-3 w-3 rounded-full bg-rose-500' />
                              <span>
                                معترض: {item.disagree_count} ({disagreePercent}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Broadcast Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className='sm:max-w-[700px] max-h-[90vh] overflow-y-auto' dir='rtl'>
          <DialogHeader>
            <DialogTitle className='text-xl font-bold flex items-center gap-2'>
              <IconSend className='h-5 w-5 text-emerald-600' />
              إرسال إشعار جماعي لجميع الهواتف
            </DialogTitle>
            <DialogDescription>
              يصل هذا الإشعار فوراً إلى جميع هواتف وتطبيقات المناديب مع صورة واستبيان تفاعلي إن أردت.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendBroadcast} className='space-y-4 pt-2'>
            <div className='space-y-1.5'>
              <label className='text-xs font-semibold'>
                عنوان الإشعار <span className='text-rose-500'>*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='مثال: تعميم هام بخصوص ساعات العمل الجديدة'
                required
              />
            </div>

            <div className='space-y-1.5'>
              <label className='text-xs font-semibold'>
                نص الإشعار / الرسالة <span className='text-rose-500'>*</span>
              </label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='اكتب تفاصيل الإشعار أو التوجيهات التي ستظهر للمناديب...'
                rows={3}
                required
              />
            </div>

            {/* Target & Branch Selection */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold'>توجيه الإشعار إلى</label>
                <Select
                  value={branchId}
                  onValueChange={(val) => {
                    const resolved = val || 'all';
                    setBranchId(resolved);
                    setTarget(resolved === 'all' ? 'ALL' : 'BRANCH');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='اختر الفئة المستهدفة' />
                  </SelectTrigger>
                  <SelectContent dir='rtl'>
                    <SelectItem value='all'>🌍 جميع الفروع والمناديب</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        🏢 فرع {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <label className='text-xs font-semibold'>الفئة</label>
                <div className='h-10 px-3 flex items-center bg-muted/40 rounded-md text-xs text-muted-foreground border'>
                  {branchId === 'all'
                    ? 'سيصل لكافة المناديب في كل الفروع'
                    : 'سيصل فقط لمناديب الفرع المحدد'}
                </div>
              </div>
            </div>

            {/* Image Attachment */}
            <div className='space-y-1.5'>
              <ImageUploader
                value={imageUrl}
                onChange={setImageUrl}
                label='إرفاق صورة أو بانر مع الإشعار 🖼️ (اختياري)'
                category='broadcast'
                description='ستظهر الصورة كـ بانر جذاب أعلى الإشعار في تطبيق المندوب مع إمكانية التكبير'
              />
            </div>

            {/* Survey / Poll Section */}
            <div className='p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <label className='text-sm font-bold text-foreground flex items-center gap-1.5 cursor-pointer'>
                    <IconChartBar className='h-4 w-4 text-emerald-600' />
                    تضمين استبيان (موافق / معترض) في الإشعار 📊
                  </label>
                  <p className='text-xs text-muted-foreground'>
                    سيظهر للمندوب خياران تفاعليان: 🟢 موافق أو 🔴 معترض، لتسجيل صوته مباشرة وحفظه في
                    النظام
                  </p>
                </div>
                <Switch checked={hasPoll} onCheckedChange={setHasPoll} />
              </div>

              {hasPoll && (
                <div className='pt-2 space-y-2 border-t border-emerald-200/50 dark:border-emerald-800/50'>
                  <label className='text-xs font-semibold text-emerald-950 dark:text-emerald-200'>
                    سؤال الاستبيان الموجه للمندوب
                  </label>
                  <Input
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder='مثال: هل توافق على جدول أوقات الدوام لشهر رمضان المبارك؟'
                  />
                  <div className='flex items-center gap-2 pt-1'>
                    <span className='text-xs text-muted-foreground'>
                      الأزرار التي ستظهر للمندوب:
                    </span>
                    <Badge
                      variant='outline'
                      className='bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 gap-1'
                    >
                      <IconCheck className='h-3 w-3' /> موافق
                    </Badge>
                    <Badge
                      variant='outline'
                      className='bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-300 gap-1'
                    >
                      <IconX className='h-3 w-3' /> معترض
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Live Mobile Preview Card */}
            <div className='p-3.5 rounded-lg border bg-muted/30'>
              <p className='text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5'>
                <IconDeviceMobile className='h-4 w-4' />
                معاينة مباشرة لشكل الإشعار في هاتف المندوب:
              </p>
              <div className='max-w-md mx-auto bg-card border rounded-2xl p-4 shadow-md space-y-2.5'>
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt='preview'
                    className='w-full h-32 object-cover rounded-xl border'
                  />
                ) : null}
                <div className='flex items-center gap-2'>
                  <span className='text-lg'>📢</span>
                  <p className='font-bold text-sm text-foreground'>{title || 'عنوان الإشعار هنا'}</p>
                </div>
                <p className='text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap'>
                  {body || 'نص الإشعار والتوجيهات ستظهر هنا بشكل واضح للمندوب عند فتح التطبيق...'}
                </p>

                {hasPoll ? (
                  <div className='pt-2 border-t space-y-2'>
                    <p className='text-xs font-bold text-center text-foreground'>
                      {pollQuestion || title || 'سؤال الاستبيان؟'}
                    </p>
                    <div className='grid grid-cols-2 gap-2'>
                      <div className='py-2 px-3 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm'>
                        <IconCheck className='h-3.5 w-3.5' />
                        موافق
                      </div>
                      <div className='py-2 px-3 rounded-lg bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm'>
                        <IconX className='h-3.5 w-3.5' />
                        معترض
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className='pt-2 border-t'>
                    <div className='w-full py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs text-center'>
                      حسناً، تم الاطلاع
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className='gap-2 sm:gap-0 pt-2'>
              <Button type='button' variant='outline' onClick={() => setIsCreateOpen(false)}>
                إلغاء
              </Button>
              <Button
                type='submit'
                disabled={sendMutation.isPending}
                className='bg-emerald-600 hover:bg-emerald-700 text-white gap-2'
              >
                {sendMutation.isPending ? (
                  <>
                    <IconRefresh className='h-4 w-4 animate-spin' />
                    جاري الإرسال للهواتف...
                  </>
                ) : (
                  <>
                    <IconSend className='h-4 w-4' />
                    إرسال الإشعار الآن
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Voters List Modal Dialog */}
      <Dialog
        open={Boolean(selectedBroadcastForVotes)}
        onOpenChange={(open) => {
          if (!open) setSelectedBroadcastForVotes(null);
        }}
      >
        <DialogContent className='sm:max-w-[700px] max-h-[85vh] overflow-y-auto' dir='rtl'>
          <DialogHeader>
            <DialogTitle className='text-xl font-bold flex items-center gap-2'>
              <IconChartBar className='h-5 w-5 text-emerald-600' />
              تفاصيل تصويت المناديب
            </DialogTitle>
            <DialogDescription>
              {selectedBroadcastForVotes?.poll_question || selectedBroadcastForVotes?.title}
            </DialogDescription>
          </DialogHeader>

          {/* Quick Filter */}
          <div className='space-y-3 pt-2'>
            <div className='relative'>
              <IconSearch className='absolute right-3 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                value={votersSearch}
                onChange={(e) => setVotersSearch(e.target.value)}
                placeholder='البحث باسم المندوب أو الهوية أو رقم الجوال...'
                className='pr-9'
              />
            </div>

            {isLoadingVotes ? (
              <div className='py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2'>
                <IconRefresh className='h-6 w-6 animate-spin text-primary' />
                <p className='text-xs'>جاري جلب تفاصيل المصوتين...</p>
              </div>
            ) : votersList.length === 0 ? (
              <div className='py-10 text-center text-muted-foreground'>
                <p className='text-sm'>لا يوجد أي تصويتات مسجلة حتى الآن لهذا الإشعار</p>
              </div>
            ) : (
              <div className='border rounded-lg overflow-hidden'>
                <table className='w-full text-xs text-right'>
                  <thead className='bg-muted/50 border-b text-muted-foreground'>
                    <tr>
                      <th className='p-2.5'>المندوب</th>
                      <th className='p-2.5'>الهوية / الرقم</th>
                      <th className='p-2.5'>الجوال</th>
                      <th className='p-2.5 text-center'>التصويت</th>
                      <th className='p-2.5'>الوقت</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-border'>
                    {votersList.map((v) => (
                      <tr key={v.id} className='hover:bg-muted/20'>
                        <td className='p-2.5 font-semibold text-foreground'>
                          {v.employee_name || 'مندوب'}
                        </td>
                        <td className='p-2.5 text-muted-foreground font-mono'>
                          {v.national_id || v.employee_number || '-'}
                        </td>
                        <td className='p-2.5 text-muted-foreground font-mono' dir='ltr'>
                          {v.phone || '-'}
                        </td>
                        <td className='p-2.5 text-center'>
                          {v.response === 'AGREE' ? (
                            <Badge className='bg-emerald-600 hover:bg-emerald-700 text-white gap-1'>
                              <IconCheck className='h-3 w-3' /> موافق
                            </Badge>
                          ) : (
                            <Badge className='bg-rose-600 hover:bg-rose-700 text-white gap-1'>
                              <IconX className='h-3 w-3' /> معترض
                            </Badge>
                          )}
                        </td>
                        <td className='p-2.5 text-muted-foreground'>
                          {new Date(v.created_at).toLocaleTimeString('ar-SA', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setSelectedBroadcastForVotes(null)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Zoom Dialog */}
      <Dialog open={Boolean(previewImage)} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className='sm:max-w-[800px] p-2 bg-black/90 border-none' dir='rtl'>
          <div className='relative w-full flex items-center justify-center p-2'>
            {previewImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImage}
                alt='Preview full size'
                className='max-h-[80vh] w-auto max-w-full rounded-lg object-contain'
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
