'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { roleApi } from '@/lib/aams/services';
import { PERMISSION_GROUPS, hasPermission } from '@/lib/aams/permissions';
import { getAdminUser } from '@/lib/aams/auth';
import type { Role, PermissionGroup } from '@/types/aams';

function getErrorMessage(err: unknown): string {
  const e = err as {
    response?: { data?: { error?: string; details?: string } };
    message?: string;
  };
  return e?.response?.data?.error || e?.response?.data?.details || e?.message || 'حدث خطأ غير متوقع';
}

export default function RolesPage() {
  const queryClient = useQueryClient();
  const currentAdmin = getAdminUser();
  const canManageRoles = (currentAdmin?.role || '').toUpperCase() === 'ADMIN' || hasPermission('roles.manage', currentAdmin);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create form state
  const [newName, setNewName] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPermissions, setNewPermissions] = useState<string[]>([]);

  // Edit form state
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  // Fetch all roles
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleApi.getAll()
  });

  // Calculate total permissions available
  const allPermissionKeys = useMemo(() => {
    return PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
  }, []);

  const createMutation = useMutation({
    mutationFn: (data: { name: string; display_name: string; description?: string; permissions: string[] }) =>
      roleApi.create(data),
    onSuccess: () => {
      toast.success('تم إنشاء الدور بنجاح');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setCreateOpen(false);
      resetCreateForm();
    },
    onError: (err) => toast.error(getErrorMessage(err))
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; display_name?: string; description?: string; permissions?: string[] }) =>
      roleApi.update(data.id, {
        display_name: data.display_name,
        description: data.description,
        permissions: data.permissions
      }),
    onSuccess: () => {
      toast.success('تم تحديث الدور بنجاح');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setEditOpen(false);
      setEditingRole(null);
    },
    onError: (err) => toast.error(getErrorMessage(err))
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => roleApi.delete(id),
    onSuccess: () => {
      toast.success('تم حذف الدور بنجاح');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(getErrorMessage(err))
  });

  const resetCreateForm = () => {
    setNewName('');
    setNewDisplayName('');
    setNewDescription('');
    setNewPermissions([]);
  };

  const handleOpenEdit = (role: Role) => {
    setEditingRole(role);
    setEditDisplayName(role.display_name);
    setEditDescription(role.description || '');
    setEditPermissions(role.permissions || []);
    setEditOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDisplayName.trim()) {
      toast.error('يرجى كتابة اسم الدور والمعرف البرمجي');
      return;
    }
    createMutation.mutate({
      name: newName.trim(),
      display_name: newDisplayName.trim(),
      description: newDescription.trim() || undefined,
      permissions: newPermissions
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    if (!editDisplayName.trim()) {
      toast.error('اسم الدور مطلوب');
      return;
    }
    updateMutation.mutate({
      id: editingRole.id,
      display_name: editDisplayName.trim(),
      description: editDescription.trim(),
      permissions: editPermissions
    });
  };

  // Toggle permission in create state
  const toggleNewPermission = (key: string) => {
    setNewPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  // Toggle whole group in create state
  const toggleNewGroup = (group: PermissionGroup) => {
    const groupKeys = group.permissions.map((p) => p.key);
    const allSelected = groupKeys.every((k) => newPermissions.includes(k));
    if (allSelected) {
      setNewPermissions((prev) => prev.filter((p) => !groupKeys.includes(p)));
    } else {
      setNewPermissions((prev) => Array.from(new Set([...prev, ...groupKeys])));
    }
  };

  // Toggle permission in edit state
  const toggleEditPermission = (key: string) => {
    setEditPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  // Toggle whole group in edit state
  const toggleEditGroup = (group: PermissionGroup) => {
    const groupKeys = group.permissions.map((p) => p.key);
    const allSelected = groupKeys.every((k) => editPermissions.includes(k));
    if (allSelected) {
      setEditPermissions((prev) => prev.filter((p) => !groupKeys.includes(p)));
    } else {
      setEditPermissions((prev) => Array.from(new Set([...prev, ...groupKeys])));
    }
  };

  // Filter roles
  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    const q = searchQuery.toLowerCase();
    return roles.filter(
      (r) =>
        r.display_name.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, searchQuery]);

  const stats = useMemo(() => {
    const total = roles.length;
    const system = roles.filter((r) => r.is_system).length;
    const custom = total - system;
    return { total, system, custom };
  }, [roles]);

  return (
    <PageContainer
      pageTitle='الأدوار والصلاحيات'
      pageDescription='تحديد وتخصيص صلاحيات المستخدمين والمشرفين والمحاسبة والـ HR في النظام'
    >
      <div className='flex flex-col gap-6'>
        {/* Top bar with stats and Add button */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Card className='border-primary/20 bg-primary/5 shadow-sm'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>إجمالي الأدوار</CardTitle>
              <Icons.key className='text-primary size-5' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stats.total}</div>
              <p className='text-muted-foreground text-xs'>أدوار معرفة في النظام</p>
            </CardContent>
          </Card>

          <Card className='shadow-sm'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>أدوار النظام الأساسية</CardTitle>
              <Icons.shield className='size-5 text-emerald-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>{stats.system}</div>
              <p className='text-muted-foreground text-xs'>مدير عام، مشرف، محاسب، HR</p>
            </CardContent>
          </Card>

          <Card className='shadow-sm'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>الأدوار المخصصة</CardTitle>
              <Icons.userPlus className='size-5 text-blue-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>{stats.custom}</div>
              <p className='text-muted-foreground text-xs'>تم إنشاؤها وتخصيصها يدوياً</p>
            </CardContent>
          </Card>

          <Card className='shadow-sm'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>الصلاحيات المتاحة</CardTitle>
              <Icons.clipboardCheck className='size-5 text-amber-500' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold text-amber-600 dark:text-amber-400'>{allPermissionKeys.length}</div>
              <p className='text-muted-foreground text-xs'>صلاحية موزعة على 10 أقسام</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions bar */}
        <div className='flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center'>
          <div className='relative w-full sm:max-w-sm'>
            <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 start-3' />
            <Input
              placeholder='ابحث عن دور أو مسمى وظيفي...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='ps-9'
            />
          </div>

          {canManageRoles && (
            <Button
              onClick={() => {
                resetCreateForm();
                setCreateOpen(true);
              }}
              className='gap-2 self-end sm:self-auto'
            >
              <Icons.plus className='size-4' />
              <span>إضافة دور جديد</span>
            </Button>
          )}
        </div>

        {/* Roles list / grid */}
        {isLoading ? (
          <div className='flex min-h-[300px] items-center justify-center'>
            <Icons.spinner className='text-primary size-8 animate-spin' />
          </div>
        ) : filteredRoles.length === 0 ? (
          <Card className='flex min-h-[250px] flex-col items-center justify-center p-8 text-center'>
            <Icons.shieldAlert className='text-muted-foreground mb-3 size-12 opacity-40' />
            <CardTitle className='text-lg'>لم يتم العثور على أي أدوار</CardTitle>
            <CardDescription className='mt-1'>
              {searchQuery ? 'لا توجد نتائج تطابق بحثك' : 'ابدأ بإضافة أول دور مخصص للنظام'}
            </CardDescription>
            {canManageRoles && (
              <Button onClick={() => setCreateOpen(true)} variant='outline' className='mt-4 gap-2'>
                <Icons.plus className='size-4' />
                <span>إضافة دور جديد</span>
              </Button>
            )}
          </Card>
        ) : (
          <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
            {filteredRoles.map((role) => {
              const isSuper = role.permissions?.includes('*') || role.name === 'SUPER_ADMIN';
              const permsCount = isSuper ? allPermissionKeys.length : (role.permissions || []).length;
              const permsPercentage = Math.round((permsCount / (allPermissionKeys.length || 1)) * 100);

              return (
                <Card
                  key={role.id}
                  className='flex flex-col justify-between transition-all hover:border-primary/40 hover:shadow-md'
                >
                  <CardHeader className='pb-3'>
                    <div className='flex items-start justify-between gap-2'>
                      <div>
                        <CardTitle className='text-lg font-bold'>{role.display_name}</CardTitle>
                        <span className='text-muted-foreground font-mono text-xs'>{role.name}</span>
                      </div>
                      <Badge variant={role.is_system ? 'secondary' : 'default'} className='shrink-0 text-xs'>
                        {role.is_system ? 'أساسي' : 'مخصص'}
                      </Badge>
                    </div>
                    {role.description && (
                      <CardDescription className='mt-2 line-clamp-2 text-xs leading-relaxed'>
                        {role.description}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className='space-y-4 pb-3'>
                    {/* Users count & Permissions progress */}
                    <div className='rounded-lg bg-muted/50 p-3'>
                      <div className='flex items-center justify-between text-xs font-medium'>
                        <span className='text-muted-foreground'>المستخدمين المسجلين بهذا الدور:</span>
                        <Badge variant='outline' className='font-bold'>
                          {role.users_count || 0} مستخدم
                        </Badge>
                      </div>

                      <div className='mt-3'>
                        <div className='flex items-center justify-between text-xs'>
                          <span className='text-muted-foreground'>الصلاحيات الممنوحة:</span>
                          <span className='font-semibold text-primary'>
                            {isSuper ? 'كامل الصلاحيات (100%)' : `${permsCount} من ${allPermissionKeys.length}`}
                          </span>
                        </div>
                        <div className='mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted'>
                          <div
                            className='h-full bg-primary transition-all'
                            style={{ width: `${isSuper ? 100 : permsPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Permissions summary tags */}
                    <div className='flex flex-wrap gap-1.5'>
                      {isSuper ? (
                        <Badge variant='default' className='bg-emerald-600 text-[11px] hover:bg-emerald-700'>
                          ⚡ وصول كامل لكافة الصلاحيات
                        </Badge>
                      ) : (
                        PERMISSION_GROUPS.filter((g) =>
                          g.permissions.some((p) => role.permissions?.includes(p.key))
                        )
                          .slice(0, 4)
                          .map((g) => (
                            <Badge key={g.group} variant='outline' className='text-[11px]'>
                              {g.label}
                            </Badge>
                          ))
                      )}
                      {!isSuper &&
                        PERMISSION_GROUPS.filter((g) =>
                          g.permissions.some((p) => role.permissions?.includes(p.key))
                        ).length > 4 && (
                          <Badge variant='secondary' className='text-[11px]'>
                            +
                            {PERMISSION_GROUPS.filter((g) =>
                              g.permissions.some((p) => role.permissions?.includes(p.key))
                            ).length - 4}{' '}
                            أقسام إضافية
                          </Badge>
                        )}
                    </div>
                  </CardContent>

                  <CardFooter className='flex items-center justify-between border-t pt-3'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='gap-1.5 text-xs'
                      onClick={() => handleOpenEdit(role)}
                    >
                      <Icons.edit className='size-3.5' />
                      <span>تعديل الصلاحيات</span>
                    </Button>

                    {!role.is_system && (
                      <Button
                        variant='ghost'
                        size='sm'
                        className='text-destructive hover:bg-destructive/10 hover:text-destructive text-xs'
                        onClick={() => setDeleteTarget(role)}
                      >
                        <Icons.trash className='size-3.5' />
                        <span>حذف</span>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Role Modal */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className='max-h-[90vh] max-w-4xl overflow-y-auto'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-xl'>
                <Icons.key className='text-primary size-5' />
                <span>إضافة دور وظيفي جديد</span>
              </DialogTitle>
              <DialogDescription>
                أدخل اسم الدور وحدد الصلاحيات المتاحة للمستخدمين الذين يحملون هذا الدور.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateSubmit} className='space-y-6 pt-2'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='new-display-name'>
                    اسم الدور (بالعربية) <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    id='new-display-name'
                    placeholder='مثال: مشرف فرع الرياض، محاسب عمليات، HR'
                    value={newDisplayName}
                    onChange={(e) => {
                      setNewDisplayName(e.target.value);
                      if (!newName) {
                        // Auto-generate code
                        setNewName(
                          e.target.value
                            .trim()
                            .toUpperCase()
                            .replace(/[^a-zA-Z0-9]/g, '_')
                        );
                      }
                    }}
                    required
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='new-name'>
                    المعرف البرمجي (بالإنجليزي) <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    id='new-name'
                    placeholder='مثال: BRANCH_SUPERVISOR, ACCOUNTANT_SENIOR'
                    value={newName}
                    onChange={(e) => setNewName(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                    required
                  />
                </div>

                <div className='space-y-2 sm:col-span-2'>
                  <Label htmlFor='new-description'>وصف الدور والمسؤوليات</Label>
                  <Input
                    id='new-description'
                    placeholder='وصف مختصر للمهام المنوطة بهذا الدور في النظام...'
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Permissions selector */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between border-b pb-2'>
                  <div>
                    <h3 className='font-bold text-sm'>تحديد الصلاحيات الممنوحة</h3>
                    <p className='text-muted-foreground text-xs'>
                      تم تحديد ({newPermissions.length}) من أصل ({allPermissionKeys.length}) صلاحية
                    </p>
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => setNewPermissions(allPermissionKeys)}
                      className='text-xs'
                    >
                      تحديد الكل
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => setNewPermissions([])}
                      className='text-xs'
                    >
                      إلغاء التحديد
                    </Button>
                  </div>
                </div>

                <div className='grid gap-4 md:grid-cols-2'>
                  {PERMISSION_GROUPS.map((group) => {
                    const groupKeys = group.permissions.map((p) => p.key);
                    const selectedInGroup = groupKeys.filter((k) => newPermissions.includes(k)).length;
                    const isAllInGroup = selectedInGroup === groupKeys.length;

                    return (
                      <Card key={group.group} className='border shadow-sm'>
                        <CardHeader className='flex flex-row items-center justify-between space-y-0 p-3.5 pb-2'>
                          <div>
                            <CardTitle className='text-sm font-semibold'>{group.label}</CardTitle>
                            {group.description && (
                              <CardDescription className='text-[11px]'>{group.description}</CardDescription>
                            )}
                          </div>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => toggleNewGroup(group)}
                            className='h-7 text-xs text-primary'
                          >
                            {isAllInGroup ? 'إلغاء القسم' : 'تحديد القسم'}
                          </Button>
                        </CardHeader>

                        <CardContent className='space-y-2 p-3.5 pt-0'>
                          {group.permissions.map((perm) => {
                            const isChecked = newPermissions.includes(perm.key);
                            return (
                              <div
                                key={perm.key}
                                onClick={() => toggleNewPermission(perm.key)}
                                className={`flex cursor-pointer items-start gap-2.5 rounded-md p-2 transition-colors ${
                                  isChecked ? 'bg-primary/10' : 'hover:bg-muted/60'
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleNewPermission(perm.key)}
                                  className='mt-0.5'
                                />
                                <div className='space-y-0.5'>
                                  <div className='text-xs font-medium'>{perm.label}</div>
                                  <div className='text-muted-foreground text-[11px]'>{perm.description}</div>
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className='gap-2 sm:gap-0'>
                <Button type='button' variant='outline' onClick={() => setCreateOpen(false)}>
                  إلغاء
                </Button>
                <Button type='submit' disabled={createMutation.isPending} className='gap-1.5'>
                  {createMutation.isPending && <Icons.spinner className='size-4 animate-spin' />}
                  <span>حفظ وإنشاء الدور</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Role Modal */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className='max-h-[90vh] max-w-4xl overflow-y-auto'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-xl'>
                <Icons.edit className='text-primary size-5' />
                <span>تعديل صلاحيات الدور: {editingRole?.display_name}</span>
              </DialogTitle>
              <DialogDescription>
                تعديل المسمى والوصف والصلاحيات الممنوحة لهذا الدور الوظيفي.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditSubmit} className='space-y-6 pt-2'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='edit-display-name'>
                    اسم الدور (بالعربية) <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    id='edit-display-name'
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    required
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='edit-name'>المعرف البرمجي (غير قابل للتعديل)</Label>
                  <Input id='edit-name' value={editingRole?.name || ''} disabled className='bg-muted' />
                </div>

                <div className='space-y-2 sm:col-span-2'>
                  <Label htmlFor='edit-description'>وصف الدور والمسؤوليات</Label>
                  <Input
                    id='edit-description'
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Permissions selector */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between border-b pb-2'>
                  <div>
                    <h3 className='font-bold text-sm'>تعديل الصلاحيات الممنوحة</h3>
                    <p className='text-muted-foreground text-xs'>
                      تم تحديد ({editPermissions.length}) من أصل ({allPermissionKeys.length}) صلاحية
                    </p>
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => setEditPermissions(allPermissionKeys)}
                      className='text-xs'
                    >
                      تحديد الكل
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => setEditPermissions([])}
                      className='text-xs'
                    >
                      إلغاء التحديد
                    </Button>
                  </div>
                </div>

                <div className='grid gap-4 md:grid-cols-2'>
                  {PERMISSION_GROUPS.map((group) => {
                    const groupKeys = group.permissions.map((p) => p.key);
                    const selectedInGroup = groupKeys.filter((k) => editPermissions.includes(k)).length;
                    const isAllInGroup = selectedInGroup === groupKeys.length;

                    return (
                      <Card key={group.group} className='border shadow-sm'>
                        <CardHeader className='flex flex-row items-center justify-between space-y-0 p-3.5 pb-2'>
                          <div>
                            <CardTitle className='text-sm font-semibold'>{group.label}</CardTitle>
                            {group.description && (
                              <CardDescription className='text-[11px]'>{group.description}</CardDescription>
                            )}
                          </div>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => toggleEditGroup(group)}
                            className='h-7 text-xs text-primary'
                          >
                            {isAllInGroup ? 'إلغاء القسم' : 'تحديد القسم'}
                          </Button>
                        </CardHeader>

                        <CardContent className='space-y-2 p-3.5 pt-0'>
                          {group.permissions.map((perm) => {
                            const isChecked = editPermissions.includes(perm.key);
                            return (
                              <div
                                key={perm.key}
                                onClick={() => toggleEditPermission(perm.key)}
                                className={`flex cursor-pointer items-start gap-2.5 rounded-md p-2 transition-colors ${
                                  isChecked ? 'bg-primary/10' : 'hover:bg-muted/60'
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleEditPermission(perm.key)}
                                  className='mt-0.5'
                                />
                                <div className='space-y-0.5'>
                                  <div className='text-xs font-medium'>{perm.label}</div>
                                  <div className='text-muted-foreground text-[11px]'>{perm.description}</div>
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className='gap-2 sm:gap-0'>
                <Button type='button' variant='outline' onClick={() => setEditOpen(false)}>
                  إلغاء
                </Button>
                <Button type='submit' disabled={updateMutation.isPending} className='gap-1.5'>
                  {updateMutation.isPending && <Icons.spinner className='size-4 animate-spin' />}
                  <span>حفظ التعديلات</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-destructive'>
                <Icons.trash className='size-5' />
                <span>حذف الدور الوظيفي</span>
              </DialogTitle>
              <DialogDescription>
                هل أنت متأكد من رغبتك في حذف الدور{' '}
                <span className='font-bold text-foreground'>{deleteTarget?.display_name}</span>؟ لا يمكن التراجع عن هذا
                الإجراء.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className='gap-2 sm:gap-0'>
              <Button variant='outline' onClick={() => setDeleteTarget(null)}>
                إلغاء
              </Button>
              <Button
                variant='destructive'
                disabled={deleteMutation.isPending}
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              >
                {deleteMutation.isPending && <Icons.spinner className='me-2 size-4 animate-spin' />}
                <span>تأكيد الحذف</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
