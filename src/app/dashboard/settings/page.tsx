'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { ImageUploader } from '@/components/aams/image-uploader';
import { getAdminUser } from '@/lib/aams/auth';
import { branchApi, settingsApi } from '@/lib/aams/services';
import type { AppSettings, Branch } from '@/types/aams';

const DEFAULT_SETTINGS: AppSettings = {
  site_name: 'نظام إدارة التوصيل AAMS',
  logo_url: ''
};

function getErrorMessage(err: unknown): string {
  const e = err as {
    response?: { data?: { error?: string; details?: string } };
    message?: string;
  };
  return (
    e?.response?.data?.error || e?.response?.data?.details || e?.message || 'حدث خطأ غير متوقع'
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const [mounted, setMounted] = useState(false);
  const [siteName, setSiteName] = useState(DEFAULT_SETTINGS.site_name);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_SETTINGS.logo_url);

  const [addBranchOpen, setAddBranchOpen] = useState(false);
  const [editBranchOpen, setEditBranchOpen] = useState(false);
  const [deleteBranchOpen, setDeleteBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isGeneralMgr = !getAdminUser()?.branch_id;
  const canManageSettings = mounted && isGeneralMgr;

  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => settingsApi.get(),
    enabled: mounted
  });

  useEffect(() => {
    if (!settings) return;
    setSiteName(settings.site_name || DEFAULT_SETTINGS.site_name);
    setLogoUrl(settings.logo_url || '');
  }, [settings]);

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
    enabled: canManageSettings
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (payload: Partial<AppSettings>) => settingsApi.update(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['public-settings'] });
      toast.success('تم حفظ الإعدادات بنجاح');
    },
    onError: (err) => toast.error(getErrorMessage(err))
  });

  const createBranchMutation = useMutation({
    mutationFn: (name: string) => branchApi.create(name),
    onSuccess: async (branch) => {
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success(`تم إنشاء الفرع: ${branch.name}`);
      setAddBranchOpen(false);
      setNewBranchName('');
    },
    onError: (err) => toast.error(getErrorMessage(err))
  });

  const updateBranchMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => branchApi.update(id, name),
    onSuccess: async (branch) => {
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success(`تم تعديل الفرع إلى: ${branch.name}`);
      setEditBranchOpen(false);
      setEditingBranch(null);
    },
    onError: (err) => toast.error(getErrorMessage(err))
  });

  const deleteBranchMutation = useMutation({
    mutationFn: (id: string) => branchApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('تم حذف الفرع بنجاح');
      setDeleteBranchOpen(false);
      setDeletingBranch(null);
    },
    onError: (err) => toast.error(getErrorMessage(err))
  });

  const handleSaveSettings = () => {
    if (!siteName.trim()) {
      toast.error('اسم الموقع مطلوب');
      return;
    }
    saveSettingsMutation.mutate({ site_name: siteName.trim(), logo_url: logoUrl });
  };

  const handleCreateBranch = () => {
    if (!newBranchName.trim()) {
      toast.error('اسم الفرع مطلوب');
      return;
    }
    createBranchMutation.mutate(newBranchName.trim());
  };

  const handleEditBranchSave = () => {
    if (!editingBranch) return;
    if (!editingBranch.name.trim()) {
      toast.error('اسم الفرع مطلوب');
      return;
    }
    updateBranchMutation.mutate({ id: editingBranch.id, name: editingBranch.name.trim() });
  };

  const handleDeleteBranchConfirm = () => {
    if (!deletingBranch) return;
    deleteBranchMutation.mutate(deletingBranch.id);
  };

  const isDirty = useMemo(() => {
    const savedName = settings?.site_name || DEFAULT_SETTINGS.site_name;
    const savedLogo = settings?.logo_url || '';
    return siteName.trim() !== savedName.trim() || logoUrl !== savedLogo;
  }, [siteName, logoUrl, settings]);

  return (
    <PageContainer
      pageTitle='الإعدادات العامة'
      pageDescription='إدارة شعار الموقع واسم النظام والأفرع'
      isLoading={!mounted}
    >
      <div className='flex flex-col gap-4'>
        {!isGeneralMgr && (
          <Card className='border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'>
            <CardContent className='flex items-start gap-3'>
              <Icons.warning className='mt-0.5 size-6 shrink-0 text-amber-600 dark:text-amber-400' />
              <div>
                <h3 className='mb-1 font-semibold text-amber-900 dark:text-amber-200'>
                  الصلاحيات غير متاحة
                </h3>
                <p className='text-sm text-amber-800 dark:text-amber-300/90'>
                  إدارة الإعدادات العامة والأفرع متاحة للمدير العام فقط. لا يمكن للمشرفين إجراء هذه
                  التغييرات.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 1. Site Info: Logo + Site Name */}
        <Card>
          <CardHeader>
            <div className='flex items-center gap-3'>
              <div className='bg-primary/10 text-primary rounded-lg p-2'>
                <Icons.media className='size-5' />
              </div>
              <div>
                <CardTitle>معلومات الموقع</CardTitle>
                <CardDescription>
                  قم بتغيير شعار النظام واسم المؤسسة الذي يظهر في واجهة الدخول والقائمة
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className='space-y-6'>
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Label className='text-base font-medium'>شعار الموقع (اللوجو)</Label>
                {logoUrl && (
                  <Badge
                    variant='outline'
                    className='border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300'
                  >
                    <Icons.circleCheck className='size-3' />
                    تم التحميل
                  </Badge>
                )}
              </div>
              <div className='grid grid-cols-1 items-start gap-4 md:grid-cols-[1fr_220px]'>
                <ImageUploader
                  label='رفع اللوجو'
                  category='logo'
                  value={logoUrl}
                  onChange={setLogoUrl}
                  description='الصيغ المسموح بها: PNG, JPG, WEBP. يُنصح بارتفاع 64-128 بكسل مع خلفية شفافة.'
                />
                <div className='bg-muted/30 flex h-full min-h-[140px] flex-col items-center justify-center gap-3 rounded-xl border p-4'>
                  <span className='text-muted-foreground text-xs font-medium'>معاينة في الهيدر</span>
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt='Logo preview'
                      className='h-16 max-w-[180px] rounded object-contain'
                    />
                  ) : (
                    <div className='bg-primary text-primary-foreground flex h-14 w-14 items-center justify-center rounded-lg text-xl font-bold'>
                      {(siteName || DEFAULT_SETTINGS.site_name).charAt(0)}
                    </div>
                  )}
                  <span className='max-w-[180px] truncate text-center text-sm font-semibold'>
                    {siteName || DEFAULT_SETTINGS.site_name}
                  </span>
                </div>
              </div>
            </div>

            <div className='space-y-2'>
              <Label className='text-base font-medium'>
                <Icons.text className='text-muted-foreground size-4' />
                اسم الموقع / المؤسسة
              </Label>
              <Input
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder='مثال: نظام إدارة التوصيل لشركة AAMS'
                className='h-12 text-base'
                disabled={!canManageSettings}
              />
              <p className='text-muted-foreground text-xs leading-relaxed'>
                سيظهر هذا الاسم في شريط المتصفح، صفحة تسجيل الدخول، ورأس كل الصفحات والطباعة والتقارير.
              </p>
            </div>
          </CardContent>

          <CardFooter className='justify-between gap-3'>
            <Badge
              variant={isDirty ? 'default' : 'outline'}
              className={
                isDirty ? 'bg-amber-500 text-white hover:bg-amber-600' : 'text-muted-foreground'
              }
            >
              {isDirty ? '● هناك تعديلات غير محفوظة' : '✓ لا توجد تغييرات جديدة'}
            </Badge>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='secondary'
                disabled={!isDirty || saveSettingsMutation.isPending || !canManageSettings}
                onClick={() => {
                  setSiteName(settings?.site_name || DEFAULT_SETTINGS.site_name);
                  setLogoUrl(settings?.logo_url || '');
                }}
              >
                تراجع التغييرات
              </Button>
              <Button
                type='button'
                onClick={handleSaveSettings}
                disabled={!isDirty || saveSettingsMutation.isPending || !canManageSettings}
                className='min-w-[140px]'
              >
                {saveSettingsMutation.isPending ? (
                  <>
                    <Icons.spinner className='size-4 animate-spin' />
                    جارٍ الحفظ...
                  </>
                ) : (
                  <>
                    <Icons.save className='size-4' />
                    حفظ الإعدادات
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* 2. Branches Management */}
        <Card>
          <CardHeader>
            <div className='flex flex-wrap items-center justify-between gap-4'>
              <div className='flex items-center gap-3'>
                <div className='rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400'>
                  <Icons.building className='size-5' />
                </div>
                <div>
                  <CardTitle>إدارة الأفرع</CardTitle>
                  <CardDescription>أضف أو عدّل أو احذف فروع الشركة</CardDescription>
                </div>
              </div>
              <Button onClick={() => setAddBranchOpen(true)} disabled={!canManageSettings}>
                <Icons.add className='size-4' />
                إضافة فرع جديد
              </Button>
            </div>
          </CardHeader>

          {branchesLoading ? (
            <CardContent className='space-y-3 py-8'>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className='bg-muted h-12 animate-pulse rounded-lg' />
              ))}
            </CardContent>
          ) : branches.length === 0 ? (
            <CardContent className='space-y-3 py-16 text-center'>
              <div className='bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-2xl'>
                <Icons.building className='text-muted-foreground size-8' />
              </div>
              <h3 className='text-lg font-semibold'>لا توجد أفرع حتى الآن</h3>
              <p className='text-muted-foreground text-sm'>
                اضغط على زر &quot;إضافة فرع جديد&quot; لإنشاء أول فرع.
              </p>
              <Button onClick={() => setAddBranchOpen(true)} disabled={!canManageSettings}>
                <Icons.add className='size-4' />
                إضافة أول فرع
              </Button>
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[80px] text-center'>#</TableHead>
                  <TableHead>اسم الفرع</TableHead>
                  <TableHead className='w-[120px] text-center'>عدد الموظفين</TableHead>
                  <TableHead className='w-[160px] text-center'>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch, idx) => (
                  <TableRow key={branch.id}>
                    <TableCell className='text-muted-foreground text-center font-mono text-sm'>
                      {idx + 1}
                    </TableCell>
                    <TableCell className='text-base font-semibold'>
                      <div className='flex items-center gap-2.5'>
                        <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'>
                          <Icons.building className='size-4' />
                        </div>
                        {branch.name}
                      </div>
                    </TableCell>
                    <TableCell className='text-center'>
                      <Badge variant='outline'>
                        <span className='dir-ltr inline-block text-sm font-semibold'>
                          {branch.employee_count ?? 0}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center justify-center gap-0.5'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon-sm'
                          onClick={() => {
                            setEditingBranch({ ...branch });
                            setEditBranchOpen(true);
                          }}
                          disabled={!canManageSettings}
                          className='text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/30'
                          title='تعديل اسم الفرع'
                        >
                          <Icons.edit className='size-4' />
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon-sm'
                          onClick={() => {
                            setDeletingBranch(branch);
                            setDeleteBranchOpen(true);
                          }}
                          disabled={!canManageSettings}
                          className='text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30'
                          title='حذف الفرع'
                        >
                          <Icons.trash className='size-4' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Add Branch Dialog */}
      <Dialog
        open={addBranchOpen}
        onOpenChange={(o) => !o && !createBranchMutation.isPending && setAddBranchOpen(o)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة فرع جديد</DialogTitle>
            <DialogDescription>أدخل اسم الفرع الذي تريد إضافته للنظام.</DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-3'>
            <div className='space-y-2'>
              <Label className='text-base'>اسم الفرع</Label>
              <Input
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && !createBranchMutation.isPending && handleCreateBranch()
                }
                placeholder='مثال: فرع الخبر الشمالي'
                className='h-12 text-base'
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setAddBranchOpen(false);
                setNewBranchName('');
              }}
              disabled={createBranchMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleCreateBranch}
              disabled={createBranchMutation.isPending || !newBranchName.trim()}
            >
              {createBranchMutation.isPending ? (
                <>
                  <Icons.spinner className='size-4 animate-spin' /> جارٍ الإنشاء...
                </>
              ) : (
                <>
                  <Icons.save className='size-4' /> حفظ الفرع
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Branch Dialog */}
      <Dialog
        open={editBranchOpen}
        onOpenChange={(o) => !o && !updateBranchMutation.isPending && setEditBranchOpen(o)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل اسم الفرع</DialogTitle>
            <DialogDescription>قم بتعديل اسم الفرع الحالي كما تريد.</DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-3'>
            <div className='space-y-2'>
              <Label className='text-base'>اسم الفرع</Label>
              <Input
                value={editingBranch?.name || ''}
                onChange={(e) =>
                  setEditingBranch((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                }
                onKeyDown={(e) =>
                  e.key === 'Enter' && !updateBranchMutation.isPending && handleEditBranchSave()
                }
                className='h-12 text-base'
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setEditBranchOpen(false);
                setEditingBranch(null);
              }}
              disabled={updateBranchMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleEditBranchSave}
              disabled={updateBranchMutation.isPending || !editingBranch?.name?.trim()}
            >
              {updateBranchMutation.isPending ? (
                <>
                  <Icons.spinner className='size-4 animate-spin' /> جارٍ الحفظ...
                </>
              ) : (
                <>
                  <Icons.save className='size-4' /> حفظ التعديلات
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Branch Dialog */}
      <Dialog
        open={deleteBranchOpen}
        onOpenChange={(o) => !o && !deleteBranchMutation.isPending && setDeleteBranchOpen(o)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد حذف الفرع</DialogTitle>
            <DialogDescription>لا يمكن التراجع عن هذا الإجراء.</DialogDescription>
          </DialogHeader>
          <div className='py-3'>
            <div className='flex items-start gap-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20'>
              <Icons.warning className='mt-0.5 size-7 shrink-0 text-red-600 dark:text-red-400' />
              <div className='space-y-2'>
                <p className='font-semibold text-red-800 dark:text-red-200'>
                  هل أنت متأكد من حذف فرع{' '}
                  <span className='underline decoration-dotted'>{deletingBranch?.name}</span>؟
                </p>
                <p className='text-sm leading-relaxed text-red-700/90 dark:text-red-300/80'>
                  سيتم إزالة الفرع من القائمة. كل الموظفين أو المستخدمين المنتمين لهذا الفرع سيصبح
                  لديهم فرع فارغ حتى يتم إسنادهم لفرع آخر.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setDeleteBranchOpen(false);
                setDeletingBranch(null);
              }}
              disabled={deleteBranchMutation.isPending}
            >
              تراجع
            </Button>
            <Button
              variant='destructive'
              onClick={handleDeleteBranchConfirm}
              disabled={deleteBranchMutation.isPending}
            >
              {deleteBranchMutation.isPending ? (
                <>
                  <Icons.spinner className='size-4 animate-spin' /> جارٍ الحذف...
                </>
              ) : (
                <>
                  <Icons.trash className='size-4' /> نعم، احذف الفرع
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
