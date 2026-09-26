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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  IconChartBar,
  IconPlus,
  IconTrash,
  IconCheck,
  IconX,
  IconRefresh,
  IconDeviceMobile,
  IconSearch
} from '@tabler/icons-react';

export default function BroadcastNotificationsPage() {
  const queryClient = useQueryClient();

  // Dialog & Form states - Multilingual Support (AR, EN, BN)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [previewLang, setPreviewLang] = useState<'ar' | 'en' | 'bn'>('ar');
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleBn, setTitleBn] = useState('');
  const [bodyAr, setBodyAr] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [bodyBn, setBodyBn] = useState('');
  const [pollQuestionAr, setPollQuestionAr] = useState('');
  const [pollQuestionEn, setPollQuestionEn] = useState('');
  const [pollQuestionBn, setPollQuestionBn] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [target, setTarget] = useState('ALL');
  const [branchId, setBranchId] = useState<string>('all');
  const [hasPoll, setHasPoll] = useState(false);

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
    setTitleAr('');
    setTitleEn('');
    setTitleBn('');
    setBodyAr('');
    setBodyEn('');
    setBodyBn('');
    setPollQuestionAr('');
    setPollQuestionEn('');
    setPollQuestionBn('');
    setImageUrl('');
    setTarget('ALL');
    setBranchId('all');
    setHasPoll(false);
    setPreviewLang('ar');
  }

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleAr.trim() || !bodyAr.trim()) {
      toast.error('يرجى ملء عنوان ونص الإشعار بالعربية كحد أدنى');
      return;
    }

    sendMutation.mutate({
      title: titleAr.trim(),
      title_ar: titleAr.trim(),
      title_en: titleEn.trim() || undefined,
      title_bn: titleBn.trim() || undefined,
      body: bodyAr.trim(),
      body_ar: bodyAr.trim(),
      body_en: bodyEn.trim() || undefined,
      body_bn: bodyBn.trim() || undefined,
      image_url: imageUrl || undefined,
      target: target,
      branch_id: branchId === 'all' ? undefined : branchId,
      has_poll: hasPoll,
      poll_question: hasPoll ? pollQuestionAr.trim() || titleAr.trim() : undefined,
      poll_question_ar: hasPoll ? pollQuestionAr.trim() || titleAr.trim() : undefined,
      poll_question_en: hasPoll && pollQuestionEn.trim() ? pollQuestionEn.trim() : undefined,
      poll_question_bn: hasPoll && pollQuestionBn.trim() ? pollQuestionBn.trim() : undefined
    });
  };

  const broadcasts: BroadcastNotificationItem[] = broadcastsData?.data || [];
  const votesList: BroadcastVoteItem[] = votesData?.data || [];

  const filteredVotes = votesList.filter((v) => {
    if (!votersSearch.trim()) return true;
    const q = votersSearch.toLowerCase();
    return (
      v.employee_name?.toLowerCase().includes(q) ||
      v.national_id?.toLowerCase().includes(q) ||
      v.branch_name?.toLowerCase().includes(q)
    );
  });

  return (
    <PageContainer>
      <div className='space-y-6'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight text-foreground flex items-center gap-2'>
              <IconBell className='h-7 w-7 text-emerald-600' />
              الإشعارات الجماعية واستطلاعات الرأي
            </h2>
            <p className='text-muted-foreground text-sm mt-1'>
              إرسال تنبيهات فورية، صور وبانرات، واستبيانات (موافق / معترض) بـ 3 لغات (عربي، إنجليزي،
              بنغالي) لجميع المناديب.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetchBroadcasts()}
              className='gap-2'
            >
              <IconRefresh className='h-4 w-4' />
              تحديث
            </Button>
            <Button
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
              className='bg-emerald-600 hover:bg-emerald-700 text-white gap-2'
            >
              <IconPlus className='h-4 w-4' />
              إرسال إشعار جماعي جديد
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <Card className='border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-emerald-800 dark:text-emerald-300 flex items-center justify-between'>
                <span>إجمالي الإشعارات المرسلة</span>
                <IconSend className='h-4 w-4' />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-emerald-900 dark:text-emerald-100'>
                {broadcasts.length}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>تصل إلى هواتف المناديب فوراً</p>
            </CardContent>
          </Card>

          <Card className='border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-sky-800 dark:text-sky-300 flex items-center justify-between'>
                <span>الاستبيانات التفاعلية</span>
                <IconChartBar className='h-4 w-4' />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-sky-900 dark:text-sky-100'>
                {broadcasts.filter((b) => b.has_poll).length}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                استبيانات تتطلب تصويت (موافق / معترض)
              </p>
            </CardContent>
          </Card>

          <Card className='border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center justify-between'>
                <span>إجمالي الأصوات المسجلة</span>
                <IconUsers className='h-4 w-4' />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-amber-900 dark:text-amber-100'>
                {broadcasts.reduce(
                  (acc, b) => acc + (b.agree_count || 0) + (b.disagree_count || 0),
                  0
                )}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                أصوات المناديب المحفوظة في النظام
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Broadcasts List */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg font-bold flex items-center gap-2'>
              <IconBell className='h-5 w-5 text-muted-foreground' />
              سجل الإشعارات والتعاميم السابقة
            </CardTitle>
            <CardDescription>
              يمكنك متابعة نتائج الاستبيانات، مشاهدة تفاصيل المصوتين، أو حذف الإشعارات.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBroadcasts ? (
              <div className='flex flex-col items-center justify-center py-12 text-muted-foreground gap-3'>
                <IconRefresh className='h-8 w-8 animate-spin text-emerald-600' />
                <p className='text-sm'>جاري تحميل سجل الإشعارات...</p>
              </div>
            ) : broadcasts.length === 0 ? (
              <div className='text-center py-12 text-muted-foreground space-y-3'>
                <div className='h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto'>
                  <IconBell className='h-8 w-8 text-muted-foreground' />
                </div>
                <h3 className='font-bold text-base text-foreground'>
                  لا توجد إشعارات مرسلة حتى الآن
                </h3>
                <p className='text-xs max-w-sm mx-auto'>
                  اضغط على زر &quot;إرسال إشعار جماعي جديد&quot; أعلاه لإرسال تعليمات أو استبيان فوري
                  لجميع المناديب.
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                {broadcasts.map((item) => (
                  <BroadcastCardItem
                    key={item.id}
                    item={item}
                    onPreviewImage={(url) => setPreviewImage(url)}
                    onDelete={(id) => {
                      if (confirm('هل أنت متأكد من رغبتك في حذف هذا الإشعار؟')) {
                        deleteMutation.mutate(id);
                      }
                    }}
                    onViewVotes={(br) => {
                      setSelectedBroadcastForVotes(br);
                      setVotersSearch('');
                    }}
                  />
                ))}
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
              يصل هذا الإشعار فوراً إلى جميع هواتف وتطبيقات المناديب مع صورة واستبيان تفاعلي باللغات
              الثلاث.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendBroadcast} className='space-y-4 pt-2'>
            {/* Multilingual Tabs */}
            <Tabs defaultValue='ar' className='w-full'>
              <div className='flex items-center justify-between mb-2'>
                <label className='text-xs font-semibold text-muted-foreground'>
                  محتوى الإشعار باللغات المختلفة:
                </label>
                <TabsList className='grid grid-cols-3 h-8'>
                  <TabsTrigger value='ar' className='text-xs gap-1.5 px-3'>
                    🇸🇦 العربية <span className='text-[10px] text-rose-500 font-bold'>*</span>
                  </TabsTrigger>
                  <TabsTrigger value='en' className='text-xs gap-1.5 px-3'>
                    🇺🇸 English
                  </TabsTrigger>
                  <TabsTrigger value='bn' className='text-xs gap-1.5 px-3'>
                    🇧🇩 বাংলা
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Arabic Content Tab */}
              <TabsContent value='ar' className='space-y-3 mt-0 border rounded-xl p-3 bg-muted/20'>
                <div className='space-y-1.5'>
                  <label className='text-xs font-semibold flex items-center justify-between'>
                    <span>
                      عنوان الإشعار (بالعربية) <span className='text-rose-500'>*</span>
                    </span>
                    <span className='text-[10px] text-muted-foreground'>اللغة الأساسية</span>
                  </label>
                  <Input
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    placeholder='مثال: تعميم هام بخصوص ساعات العمل الجديدة'
                    required
                    dir='rtl'
                  />
                </div>
                <div className='space-y-1.5'>
                  <label className='text-xs font-semibold'>
                    نص الإشعار / الرسالة (بالعربية) <span className='text-rose-500'>*</span>
                  </label>
                  <Textarea
                    value={bodyAr}
                    onChange={(e) => setBodyAr(e.target.value)}
                    placeholder='اكتب تفاصيل الإشعار أو التوجيهات باللغة العربية...'
                    rows={3}
                    required
                    dir='rtl'
                  />
                </div>
              </TabsContent>

              {/* English Content Tab */}
              <TabsContent
                value='en'
                className='space-y-3 mt-0 border rounded-xl p-3 bg-muted/20'
                dir='ltr'
              >
                <div className='space-y-1.5'>
                  <label className='text-xs font-semibold flex items-center justify-between'>
                    <span>Notification Title (English)</span>
                    <span className='text-[10px] text-muted-foreground'>
                      Optional (Defaults to Arabic)
                    </span>
                  </label>
                  <Input
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder='e.g. Important notice regarding new working hours'
                  />
                </div>
                <div className='space-y-1.5'>
                  <label className='text-xs font-semibold'>Notification Message (English)</label>
                  <Textarea
                    value={bodyEn}
                    onChange={(e) => setBodyEn(e.target.value)}
                    placeholder='Write details or instructions in English for English-speaking employees...'
                    rows={3}
                  />
                </div>
              </TabsContent>

              {/* Bengali Content Tab */}
              <TabsContent
                value='bn'
                className='space-y-3 mt-0 border rounded-xl p-3 bg-muted/20'
                dir='ltr'
              >
                <div className='space-y-1.5'>
                  <label className='text-xs font-semibold flex items-center justify-between'>
                    <span>বিজ্ঞপ্তির শিরোনাম (Bengali / বাংলা)</span>
                    <span className='text-[10px] text-muted-foreground'>ঐচ্ছিক (ডিফল্ট আরবি)</span>
                  </label>
                  <Input
                    value={titleBn}
                    onChange={(e) => setTitleBn(e.target.value)}
                    placeholder='যেমন: কাজের নতুন সময়সূচী সংক্রান্ত জরুরি বিজ্ঞপ্তি'
                  />
                </div>
                <div className='space-y-1.5'>
                  <label className='text-xs font-semibold'>
                    বিজ্ঞপ্তির বিস্তারিত বিবরণ (Bengali / বাংলা)
                  </label>
                  <Textarea
                    value={bodyBn}
                    onChange={(e) => setBodyBn(e.target.value)}
                    placeholder='বাংলায় বিজ্ঞপ্তি বা নির্দেশনার বিস্তারিত লিখুন...'
                    rows={3}
                  />
                </div>
              </TabsContent>
            </Tabs>

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
                    سيظهر للمندوب خياران تفاعليان بلغة تطبيقه لتسجيل صوته مباشرة وحفظه في النظام
                  </p>
                </div>
                <Switch checked={hasPoll} onCheckedChange={setHasPoll} />
              </div>

              {hasPoll && (
                <div className='pt-2 space-y-3 border-t border-emerald-200/50 dark:border-emerald-800/50'>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-emerald-950 dark:text-emerald-200'>
                      سؤال الاستبيان (بالعربية 🇸🇦)
                    </label>
                    <Input
                      value={pollQuestionAr}
                      onChange={(e) => setPollQuestionAr(e.target.value)}
                      placeholder='مثال: هل توافق على جدول أوقات الدوام لشهر رمضان المبارك؟'
                      dir='rtl'
                    />
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                    <div className='space-y-1'>
                      <label className='text-[11px] font-semibold text-muted-foreground'>
                        Question in English 🇺🇸 (Optional)
                      </label>
                      <Input
                        value={pollQuestionEn}
                        onChange={(e) => setPollQuestionEn(e.target.value)}
                        placeholder='e.g. Do you agree with the new working hours?'
                        dir='ltr'
                      />
                    </div>
                    <div className='space-y-1'>
                      <label className='text-[11px] font-semibold text-muted-foreground'>
                        প্রশ্ন বাংলায় 🇧🇩 (Optional)
                      </label>
                      <Input
                        value={pollQuestionBn}
                        onChange={(e) => setPollQuestionBn(e.target.value)}
                        placeholder='যেমন: আপনি কি নতুন কর্মঘণ্টা সময়সূচীর সাথে একমত?'
                        dir='ltr'
                      />
                    </div>
                  </div>

                  <div className='flex items-center gap-2 pt-1'>
                    <span className='text-xs text-muted-foreground'>
                      الأزرار التي ستظهر للمندوب:
                    </span>
                    <Badge
                      variant='outline'
                      className='bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 gap-1'
                    >
                      <IconCheck className='h-3 w-3' /> موافق / Agree / সম্মত
                    </Badge>
                    <Badge
                      variant='outline'
                      className='bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border-rose-300 gap-1'
                    >
                      <IconX className='h-3 w-3' /> معترض / Disagree / অসম্মত
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Live Mobile Preview Card */}
            <div className='p-3.5 rounded-lg border bg-muted/30'>
              <div className='flex items-center justify-between mb-2'>
                <p className='text-xs font-bold text-muted-foreground flex items-center gap-1.5'>
                  <IconDeviceMobile className='h-4 w-4' />
                  معاينة مباشرة لشكل الإشعار في هاتف المندوب:
                </p>
                <div className='flex items-center gap-1 bg-background/80 p-0.5 rounded-lg border text-[11px] font-medium'>
                  <button
                    type='button'
                    onClick={() => setPreviewLang('ar')}
                    className={`px-2 py-0.5 rounded ${previewLang === 'ar' ? 'bg-primary text-primary-foreground font-bold shadow-xs' : 'text-muted-foreground'}`}
                  >
                    🇸🇦 عربي
                  </button>
                  <button
                    type='button'
                    onClick={() => setPreviewLang('en')}
                    className={`px-2 py-0.5 rounded ${previewLang === 'en' ? 'bg-primary text-primary-foreground font-bold shadow-xs' : 'text-muted-foreground'}`}
                  >
                    🇺🇸 English
                  </button>
                  <button
                    type='button'
                    onClick={() => setPreviewLang('bn')}
                    className={`px-2 py-0.5 rounded ${previewLang === 'bn' ? 'bg-primary text-primary-foreground font-bold shadow-xs' : 'text-muted-foreground'}`}
                  >
                    🇧🇩 বাংলা
                  </button>
                </div>
              </div>

              <div
                className='max-w-md mx-auto bg-card border rounded-2xl p-4 shadow-md space-y-2.5'
                dir={previewLang === 'ar' ? 'rtl' : 'ltr'}
              >
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
                  <p className='font-bold text-sm text-foreground'>
                    {previewLang === 'bn'
                      ? titleBn || titleAr || 'বিজ্ঞপ্তির শিরোনাম'
                      : previewLang === 'en'
                        ? titleEn || titleAr || 'Notification Title'
                        : titleAr || 'عنوان الإشعار هنا'}
                  </p>
                </div>
                <p className='text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap'>
                  {previewLang === 'bn'
                    ? bodyBn || bodyAr || 'বিজ্ঞপ্তির বিস্তারিত বিবরণ এখানে প্রদর্শিত হবে...'
                    : previewLang === 'en'
                      ? bodyEn ||
                        bodyAr ||
                        'Notification details and instructions will appear here...'
                      : bodyAr ||
                        'نص الإشعار والتوجيهات ستظهر هنا بشكل واضح للمندوب عند فتح التطبيق...'}
                </p>

                {hasPoll ? (
                  <div className='pt-2 border-t space-y-2'>
                    <p className='text-xs font-bold text-center text-foreground'>
                      {previewLang === 'bn'
                        ? pollQuestionBn || pollQuestionAr || titleBn || titleAr || 'আপনি কি একমত?'
                        : previewLang === 'en'
                          ? pollQuestionEn ||
                            pollQuestionAr ||
                            titleEn ||
                            titleAr ||
                            'Do you agree?'
                          : pollQuestionAr || titleAr || 'سؤال الاستبيان؟'}
                    </p>
                    <div className='grid grid-cols-2 gap-2'>
                      <div className='py-2 px-3 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm'>
                        <IconCheck className='h-3.5 w-3.5' />
                        {previewLang === 'bn'
                          ? 'সম্মত (Agree)'
                          : previewLang === 'en'
                            ? 'Agree'
                            : 'موافق'}
                      </div>
                      <div className='py-2 px-3 rounded-lg bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm'>
                        <IconX className='h-3.5 w-3.5' />
                        {previewLang === 'bn'
                          ? 'অসম্মত (Disagree)'
                          : previewLang === 'en'
                            ? 'Disagree'
                            : 'معترض'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className='pt-2 border-t'>
                    <div className='w-full py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs text-center'>
                      {previewLang === 'bn'
                        ? 'ঠিক আছে (OK)'
                        : previewLang === 'en'
                          ? 'OK, Understood'
                          : 'حسناً، تم الاطلاع'}
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
        <DialogContent className='sm:max-w-[650px] max-h-[85vh] overflow-y-auto' dir='rtl'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold flex items-center gap-2'>
              <IconUsers className='h-5 w-5 text-emerald-600' />
              تفاصيل تصويت المناديب على الاستبيان
            </DialogTitle>
            <DialogDescription>
              &quot;{selectedBroadcastForVotes?.poll_question || selectedBroadcastForVotes?.title}
              &quot;
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 pt-2'>
            {/* Search filter */}
            <div className='relative'>
              <IconSearch className='absolute right-3 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='بحث باسم المندوب، رقم الهوية، أو الفرع...'
                value={votersSearch}
                onChange={(e) => setVotersSearch(e.target.value)}
                className='pr-9'
              />
            </div>

            {/* Results summary badges */}
            <div className='flex items-center gap-2 text-xs'>
              <Badge
                variant='outline'
                className='bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1'
              >
                <IconCheck className='h-3 w-3' />
                موافق: {selectedBroadcastForVotes?.agree_count || 0}
              </Badge>
              <Badge
                variant='outline'
                className='bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 gap-1'
              >
                <IconX className='h-3 w-3' />
                معترض: {selectedBroadcastForVotes?.disagree_count || 0}
              </Badge>
              <span className='text-muted-foreground mr-auto'>
                المعروض: {filteredVotes.length} صوت
              </span>
            </div>

            {/* Voters List */}
            {isLoadingVotes ? (
              <div className='py-8 text-center text-muted-foreground space-y-2'>
                <IconRefresh className='h-6 w-6 animate-spin text-emerald-600 mx-auto' />
                <p className='text-xs'>جاري تحميل أصوات المناديب...</p>
              </div>
            ) : filteredVotes.length === 0 ? (
              <div className='py-8 text-center text-muted-foreground space-y-1 border rounded-lg bg-muted/20'>
                <p className='text-sm font-semibold'>لا توجد أصوات مسجلة تطابق البحث</p>
                <p className='text-xs'>
                  سيظهر هنا كل مندوب قام بالضغط على موافق أو معترض من تطبيقه
                </p>
              </div>
            ) : (
              <div className='border rounded-lg divide-y max-h-[350px] overflow-y-auto'>
                {filteredVotes.map((vote) => (
                  <div
                    key={vote.id}
                    className='p-3 flex items-center justify-between hover:bg-muted/30'
                  >
                    <div className='space-y-0.5'>
                      <div className='flex items-center gap-2'>
                        <span className='font-bold text-sm text-foreground'>
                          {vote.employee_name}
                        </span>
                        <span className='text-xs text-muted-foreground font-mono'>
                          ({vote.national_id})
                        </span>
                      </div>
                      <p className='text-xs text-muted-foreground'>
                        فرع {vote.branch_name || 'غير محدد'} •{' '}
                        {new Date(vote.created_at).toLocaleString('ar-SA', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </p>
                    </div>

                    <Badge
                      className={
                        vote.response === 'AGREE'
                          ? 'bg-emerald-600 text-white gap-1 text-xs'
                          : 'bg-rose-600 text-white gap-1 text-xs'
                      }
                    >
                      {vote.response === 'AGREE' ? (
                        <>
                          <IconCheck className='h-3 w-3' /> موافق
                        </>
                      ) : (
                        <>
                          <IconX className='h-3 w-3' /> معترض
                        </>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox Preview Dialog */}
      <Dialog open={Boolean(previewImage)} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className='sm:max-w-[800px] p-2 bg-black/95 border-none'>
          <div className='relative w-full h-[70vh] flex items-center justify-center'>
            {previewImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImage}
                alt='preview full'
                className='max-h-full max-w-full object-contain rounded-lg'
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

interface BroadcastCardItemProps {
  item: BroadcastNotificationItem;
  onPreviewImage: (url: string) => void;
  onDelete: (id: string) => void;
  onViewVotes: (item: BroadcastNotificationItem) => void;
}

function BroadcastCardItem({
  item,
  onPreviewImage,
  onDelete,
  onViewVotes
}: BroadcastCardItemProps) {
  const [activeLang, setActiveLang] = useState<'ar' | 'en' | 'bn'>('ar');

  const hasEn = Boolean(item.title_en?.trim() || item.body_en?.trim());
  const hasBn = Boolean(item.title_bn?.trim() || item.body_bn?.trim());

  let displayTitle = item.title_ar?.trim() || item.title;
  let displayBody = item.body_ar?.trim() || item.body;
  let displayPollQuestion = item.poll_question_ar?.trim() || item.poll_question || displayTitle;

  if (activeLang === 'en') {
    displayTitle = item.title_en?.trim() || item.title_ar?.trim() || item.title;
    displayBody = item.body_en?.trim() || item.body_ar?.trim() || item.body;
    displayPollQuestion =
      item.poll_question_en?.trim() ||
      item.poll_question_ar?.trim() ||
      item.poll_question ||
      displayTitle;
  } else if (activeLang === 'bn') {
    displayTitle = item.title_bn?.trim() || item.title_ar?.trim() || item.title;
    displayBody = item.body_bn?.trim() || item.body_ar?.trim() || item.body;
    displayPollQuestion =
      item.poll_question_bn?.trim() ||
      item.poll_question_ar?.trim() ||
      item.poll_question ||
      displayTitle;
  }

  const isRtl = activeLang === 'ar';

  const totalVotes = (item.agree_count || 0) + (item.disagree_count || 0);
  const agreePct = totalVotes > 0 ? Math.round(((item.agree_count || 0) / totalVotes) * 100) : 0;
  const disagreePct = totalVotes > 0 ? 100 - agreePct : 0;

  return (
    <div className='p-4 sm:p-5 rounded-xl border bg-card hover:shadow-md transition-all space-y-4'>
      {/* Top Bar with Language Switcher and Action Buttons */}
      <div className='flex flex-wrap items-center justify-between gap-2 pb-2 border-b'>
        <div className='flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border'>
          <button
            type='button'
            onClick={() => setActiveLang('ar')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
              activeLang === 'ar'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            🇸🇦 العربية
          </button>
          <button
            type='button'
            onClick={() => setActiveLang('en')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
              activeLang === 'en'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            🇺🇸 English{' '}
            {hasEn ? <span className='text-[10px] text-emerald-500 font-extrabold'>✓</span> : ''}
          </button>
          <button
            type='button'
            onClick={() => setActiveLang('bn')}
            className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
              activeLang === 'bn'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            🇧🇩 বাংলা{' '}
            {hasBn ? <span className='text-[10px] text-emerald-500 font-extrabold'>✓</span> : ''}
          </button>
        </div>

        <div className='flex items-center gap-2'>
          <Badge variant='secondary' className='text-xs'>
            {item.target === 'ALL' ? '🌍 جميع الفروع' : `🏢 ${item.branch_name || 'فرع محدد'}`}
          </Badge>

          {item.has_poll && (
            <Badge
              variant='outline'
              className='bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 gap-1 text-xs'
            >
              <IconChartBar className='h-3 w-3' /> استبيان
            </Badge>
          )}

          <Button
            variant='ghost'
            size='sm'
            onClick={() => onDelete(item.id)}
            className='text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 text-xs h-7'
          >
            <IconTrash className='h-3.5 w-3.5' />
            حذف
          </Button>
        </div>
      </div>

      {/* Main Content Area in Active Language */}
      <div className='flex flex-col sm:flex-row sm:items-start justify-between gap-3'>
        <div className='space-y-1.5 flex-1' dir={isRtl ? 'rtl' : 'ltr'}>
          <div className='flex items-center gap-2'>
            <h4 className='font-bold text-base text-foreground'>{displayTitle}</h4>
          </div>
          <p className='text-xs text-muted-foreground'>
            {new Date(item.created_at).toLocaleString('ar-SA', {
              dateStyle: 'medium',
              timeStyle: 'short'
            })}
          </p>
          <p className='text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed pt-1'>
            {displayBody}
          </p>
        </div>

        {/* Thumbnail preview */}
        {item.image_url ? (
          <button
            type='button'
            onClick={() => item.image_url && onPreviewImage(item.image_url)}
            className='relative group overflow-hidden rounded-lg border h-16 w-24 bg-muted shrink-0'
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image_url}
              alt='broadcast attachment'
              className='h-full w-full object-cover group-hover:scale-105 transition-transform'
            />
            <div className='absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold'>
              <IconPhoto className='h-4 w-4' />
            </div>
          </button>
        ) : null}
      </div>

      {/* Poll Results Section */}
      {item.has_poll && (
        <div className='p-3.5 rounded-lg border bg-muted/40 space-y-2.5'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2'>
            <p
              className='text-xs font-bold text-foreground flex items-center gap-1.5'
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              <IconChartBar className='h-4 w-4 text-emerald-600 shrink-0' />
              <span>سؤال الاستبيان: &quot;{displayPollQuestion}&quot;</span>
            </p>
            <Button
              variant='outline'
              size='sm'
              onClick={() => onViewVotes(item)}
              className='text-xs h-7 gap-1 shrink-0'
            >
              <IconUsers className='h-3.5 w-3.5' />
              عرض تفاصيل أصوات المناديب ({totalVotes})
            </Button>
          </div>

          {/* Vote bars */}
          <div className='space-y-1.5 pt-1'>
            <div className='flex items-center justify-between text-xs font-semibold'>
              <span className='text-emerald-700 dark:text-emerald-400 flex items-center gap-1'>
                <IconCheck className='h-3.5 w-3.5' /> موافق ({item.agree_count || 0})
              </span>
              <span className='text-rose-700 dark:text-rose-400 flex items-center gap-1'>
                <IconX className='h-3.5 w-3.5' /> معترض ({item.disagree_count || 0})
              </span>
            </div>
            <div className='h-2.5 w-full bg-muted rounded-full overflow-hidden flex'>
              <div
                style={{ width: `${agreePct}%` }}
                className='bg-emerald-500 h-full transition-all'
              />
              <div
                style={{ width: `${disagreePct}%` }}
                className='bg-rose-500 h-full transition-all'
              />
            </div>
            <div className='flex items-center justify-between text-[11px] text-muted-foreground'>
              <span>{agreePct}% نسبة الموافقة</span>
              <span>{disagreePct}% نسبة الاعتراض</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
