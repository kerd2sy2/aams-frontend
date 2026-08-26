'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { getAdminUser } from '@/lib/aams/auth';
import { adminApi, roleApi, branchApi } from '@/lib/aams/services';
import type { Admin, Role, Branch } from '@/types/aams';
import {
  Users,
  UserCheck,
  ShieldCheck,
  Building2,
  MoreHorizontal,
  Plus,
  Search,
  Key,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Phone,
  Mail,
  User as UserIcon,
  RefreshCw,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

function getErrorMessage(err: unknown): string {
  const e = err as {
    response?: { data?: { error?: string; details?: string } };
    message?: string;
  };
  return (
    e?.response?.data?.error || e?.response?.data?.details || e?.message || 'حدث خطأ غير متوقع'
  );
}

const AVATAR_COLORS = [
  'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
  'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900',
  'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',
  'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900',
  'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Admin | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Admin | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    phone: '',
    password: '',
    roleId: '',
    branchId: ''
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentAdmin = getAdminUser();
  const isGeneralMgr = !currentAdmin?.branch_id;

  const { data: admins = [], isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => adminApi.getAll(),
    enabled: mounted && isGeneralMgr
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleApi.getAll(),
    enabled: mounted
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
    enabled: mounted
  });

  useEffect(() => {
    if (mounted && !isGeneralMgr) {
      router.replace('/dashboard');
    }
  }, [mounted, isGeneralMgr, router]);

  const resetForm = () => {
    const defaultRole = roles.find((r) => r.name === 'SUPERVISOR') || roles[0];
    setFormData({
      name: '',
      email: '',
      username: '',
      phone: '',
      password: '',
      roleId: defaultRole?.id || '',
      branchId: ''
    });
    setEditingUser(null);
    setShowPassword(false);
  };

  const openCreateSheet = () => {
    resetForm();
    setSheetOpen(true);
  };

  const openEditSheet = (admin: Admin) => {
    setEditingUser(admin);
    let matchedRoleId = admin.role_id || '';
    if (!matchedRoleId) {
      const matchedRole = roles.find(
        (r) => r.name.toUpperCase() === (admin.role || '').toUpperCase()
      );
      matchedRoleId = matchedRole ? matchedRole.id : roles[0]?.id || '';
    }

    setFormData({
      name: admin.name || '',
      email: admin.email || '',
      username: admin.username || '',
      phone: admin.phone || '',
      password: '',
      roleId: matchedRoleId,
      branchId: admin.branch_id || ''
    });
    setShowPassword(false);
    setSheetOpen(true);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      username: string;
      phone?: string;
      password: string;
      role: string;
      role_id?: string;
      branch_id?: string;
      permissions?: string[];
    }) => adminApi.create({ ...data, permissions: [] }),
    onSuccess: () => {
      toast.success('تم إضافة المستخدم بنجاح');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSheetOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(getErrorMessage(err))
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      id: string;
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
      role_id?: string;
      branch_id?: string;
      password?: string;
      permissions?: string[];
    }) =>
      adminApi.update(data.id, {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        role_id: data.role_id,
        branch_id: data.branch_id || undefined,
        permissions: [],
        password: data.password || undefined
      }),
    onSuccess: () => {
      toast.success('تم تعديل بيانات المستخدم بنجاح');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSheetOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(getErrorMessage(err))
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(id),
    onSuccess: () => {
      toast.success('تم حذف المستخدم بنجاح');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(getErrorMessage(err))
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || (!editingUser && !formData.username.trim())) {
      toast.error('يرجى تعبئة الحقول الأساسية المطلوبة');
      return;
    }

    if (!editingUser && !formData.password) {
      toast.error('يرجى إدخال كلمة المرور للمستخدم الجديد');
      return;
    }

    const selectedRole = roles.find((r) => r.id === formData.roleId);

    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        role: selectedRole ? selectedRole.name : undefined,
        role_id: formData.roleId || undefined,
        branch_id: formData.branchId || undefined,
        password: formData.password.trim() || undefined
      });
    } else {
      createMutation.mutate({
        name: formData.name.trim(),
        email: formData.email.trim(),
        username: formData.username.trim(),
        phone: formData.phone.trim() || undefined,
        password: formData.password,
        role: selectedRole ? selectedRole.name : 'SUPERVISOR',
        role_id: formData.roleId || undefined,
        branch_id: formData.branchId || undefined
      });
    }
  };

  const getRoleDisplayName = (admin: Admin) => {
    if (admin.role_obj?.display_name) return admin.role_obj.display_name;
    const matched = roles.find(
      (r) => r.id === admin.role_id || r.name.toUpperCase() === (admin.role || '').toUpperCase()
    );
    if (matched) return matched.display_name;
    if (admin.role === 'ADMIN' || admin.role === 'SUPER_ADMIN') return 'مدير عام';
    if (admin.role === 'SUPERVISOR') return 'مشرف وردية';
    return admin.role;
  };

  // KPIs
  const stats = useMemo(() => {
    const total = admins.length;
    const superAdmins = admins.filter((a) => a.role === 'ADMIN' || a.role === 'SUPER_ADMIN').length;
    const supervisors = admins.filter((a) => a.role === 'SUPERVISOR').length;
    const branchCount = new Set(admins.map((a) => a.branch_id).filter(Boolean)).size;
    return { total, superAdmins, supervisors, branchCount };
  }, [admins]);

  // Filtered and Paginated data
  const filteredAdmins = useMemo(() => {
    return admins.filter((admin) => {
      // Role filter
      if (selectedRoleFilter !== 'ALL') {
        const matchesRoleId = admin.role_id === selectedRoleFilter;
        const matchesRoleName = admin.role === selectedRoleFilter;
        if (!matchesRoleId && !matchesRoleName) return false;
      }

      // Branch filter
      if (selectedBranchFilter !== 'ALL') {
        if (selectedBranchFilter === 'HEADQUARTERS' && admin.branch_id) return false;
        if (selectedBranchFilter !== 'HEADQUARTERS' && admin.branch_id !== selectedBranchFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = admin.name?.toLowerCase().includes(q);
        const matchesEmail = admin.email?.toLowerCase().includes(q);
        const matchesUsername = admin.username?.toLowerCase().includes(q);
        const matchesPhone = admin.phone?.toLowerCase().includes(q);
        const matchesRole = getRoleDisplayName(admin).toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesUsername && !matchesPhone && !matchesRole) {
          return false;
        }
      }

      return true;
    });
  }, [admins, selectedRoleFilter, selectedBranchFilter, searchQuery, roles]);

  const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / pageSize));
  const paginatedAdmins = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAdmins.slice(start, start + pageSize);
  }, [filteredAdmins, currentPage, pageSize]);

  const isFormPending = createMutation.isPending || updateMutation.isPending;

  if (!mounted || !isGeneralMgr) return null;

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col space-y-6' dir='rtl'>
        {/* Top Action Header */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          <Heading
            title={`المستخدمون (${admins.length})`}
            description='إدارة حسابات المستخدمين في النظام، تعيين الأدوار والصلاحيات وتوزيع الفروع'
          />
          <div className='flex flex-wrap items-center gap-2'>
            <Link href='/dashboard/roles'>
              <Button variant='outline' className='gap-2 shadow-xs'>
                <Key className='size-4 text-primary' />
                <span>إدارة الأدوار والصلاحيات</span>
              </Button>
            </Link>
            <Button onClick={openCreateSheet} className='gap-2 shadow-sm font-semibold'>
              <Plus className='size-4' />
              <span>إضافة مستخدم جديد</span>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Stats Summary Cards */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
          <Card className='border shadow-xs hover:border-primary/40 transition-colors'>
            <CardContent className='p-4 flex items-center gap-3.5'>
              <div className='size-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0'>
                <Users className='size-5' />
              </div>
              <div className='space-y-0.5'>
                <p className='text-xs text-muted-foreground font-medium'>إجمالي المستخدمين</p>
                <p className='text-2xl font-black tabular-nums'>{stats.total}</p>
              </div>
            </CardContent>
          </Card>

          <Card className='border shadow-xs hover:border-primary/40 transition-colors'>
            <CardContent className='p-4 flex items-center gap-3.5'>
              <div className='size-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0'>
                <ShieldCheck className='size-5' />
              </div>
              <div className='space-y-0.5'>
                <p className='text-xs text-muted-foreground font-medium'>المدراء العامون</p>
                <p className='text-2xl font-black tabular-nums'>{stats.superAdmins}</p>
              </div>
            </CardContent>
          </Card>

          <Card className='border shadow-xs hover:border-primary/40 transition-colors'>
            <CardContent className='p-4 flex items-center gap-3.5'>
              <div className='size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0'>
                <UserCheck className='size-5' />
              </div>
              <div className='space-y-0.5'>
                <p className='text-xs text-muted-foreground font-medium'>مشرفو الورديات</p>
                <p className='text-2xl font-black tabular-nums'>{stats.supervisors}</p>
              </div>
            </CardContent>
          </Card>

          <Card className='border shadow-xs hover:border-primary/40 transition-colors'>
            <CardContent className='p-4 flex items-center gap-3.5'>
              <div className='size-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0'>
                <Building2 className='size-5' />
              </div>
              <div className='space-y-0.5'>
                <p className='text-xs text-muted-foreground font-medium'>الفروع المرتبطة</p>
                <p className='text-2xl font-black tabular-nums'>{stats.branchCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Toolbar */}
        <Card className='border shadow-xs'>
          <CardContent className='p-3.5'>
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
              {/* Search Bar */}
              <div className='relative flex-1'>
                <Search className='absolute right-3 top-2.5 size-4 text-muted-foreground' />
                <Input
                  placeholder='بحث بالاسم، البريد، اسم المستخدم، الهاتف...'
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className='pr-9 h-9'
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className='absolute left-3 top-2.5 text-muted-foreground hover:text-foreground'
                  >
                    <X className='size-4' />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className='flex flex-wrap items-center gap-2'>
                {/* Role Filter */}
                <Select
                  value={selectedRoleFilter}
                  onValueChange={(v) => {
                    setSelectedRoleFilter(v || 'ALL');
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className='w-[160px] h-9 text-xs'>
                    <SelectValue placeholder='الدور الوظيفي' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ALL'>كافة الأدوار</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Branch Filter */}
                <Select
                  value={selectedBranchFilter}
                  onValueChange={(v) => {
                    setSelectedBranchFilter(v || 'ALL');
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className='w-[160px] h-9 text-xs'>
                    <SelectValue placeholder='الفرع' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ALL'>كافة الفروع</SelectItem>
                    <SelectItem value='HEADQUARTERS'>الإدارة العامة (بدون فرع)</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRoleFilter('ALL');
                    setSelectedBranchFilter('ALL');
                    setCurrentPage(1);
                    refetch();
                  }}
                  className='h-9 gap-1.5'
                  title='إعادة تعيين وتحديث'
                >
                  <RefreshCw className={cn('size-3.5', isLoading && 'animate-spin')} />
                  <span className='hidden sm:inline'>تحديث</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <div className='rounded-xl border bg-card shadow-xs overflow-hidden'>
          <Table>
            <TableHeader className='bg-muted/50'>
              <TableRow>
                <TableHead className='text-right w-[280px] font-bold'>المستخدم</TableHead>
                <TableHead className='text-right font-bold'>اسم المستخدم</TableHead>
                <TableHead className='text-right font-bold'>رقم الهاتف</TableHead>
                <TableHead className='text-right font-bold'>الدور الوظيفي</TableHead>
                <TableHead className='text-right font-bold'>الفرع التابع</TableHead>
                <TableHead className='text-center w-[100px] font-bold'>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className='h-48 text-center'>
                    <div className='flex flex-col items-center justify-center gap-2'>
                      <Icons.spinner className='size-6 animate-spin text-primary' />
                      <p className='text-sm text-muted-foreground'>جارٍ تحميل بيانات المستخدمين...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedAdmins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className='h-48 text-center'>
                    <div className='flex flex-col items-center justify-center gap-2'>
                      <div className='size-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground'>
                        <Users className='size-6' />
                      </div>
                      <p className='text-base font-bold'>لا توجد نتائج</p>
                      <p className='text-xs text-muted-foreground max-w-sm'>
                        {searchQuery || selectedRoleFilter !== 'ALL' || selectedBranchFilter !== 'ALL'
                          ? 'لم يتم العثور على أي مستخدمين يطابقون معايير التصفية والبحث المحددة.'
                          : 'لا يوجد مستخدمون مسجلون حالياً. يمكنك إضافة مستخدم جديد بالنقر على زر الإضافة أعلاه.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAdmins.map((admin) => {
                  const avatarColor = getAvatarColor(admin.name || 'User');
                  const roleName = getRoleDisplayName(admin);
                  const isCurrent = currentAdmin?.id === admin.id;

                  return (
                    <TableRow key={admin.id} className='hover:bg-muted/40 transition-colors'>
                      {/* User Info with Avatar */}
                      <TableCell>
                        <div className='flex items-center gap-3'>
                          <Avatar className={cn('size-9 border font-bold', avatarColor)}>
                            <AvatarFallback className={cn('font-bold text-xs', avatarColor)}>
                              {(admin.name || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className='flex flex-col min-w-0'>
                            <div className='flex items-center gap-1.5'>
                              <span className='font-bold text-sm text-slate-900 dark:text-slate-100 truncate'>
                                {admin.name}
                              </span>
                              {isCurrent && (
                                <Badge variant='secondary' className='text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'>
                                  أنت
                                </Badge>
                              )}
                            </div>
                            <span className='text-xs text-muted-foreground font-mono truncate flex items-center gap-1 mt-0.5' dir='ltr'>
                              <Mail className='size-3 shrink-0' />
                              {admin.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Username */}
                      <TableCell>
                        <Badge variant='outline' className='font-mono text-xs font-medium px-2 py-0.5 bg-muted/30' dir='ltr'>
                          @{admin.username || '—'}
                        </Badge>
                      </TableCell>

                      {/* Phone */}
                      <TableCell>
                        {admin.phone ? (
                          <div className='flex items-center gap-1.5 text-xs font-mono text-muted-foreground' dir='ltr'>
                            <Phone className='size-3 text-muted-foreground shrink-0' />
                            <span>{admin.phone}</span>
                          </div>
                        ) : (
                          <span className='text-xs text-muted-foreground'>—</span>
                        )}
                      </TableCell>

                      {/* Role Badge */}
                      <TableCell>
                        <Badge
                          variant='outline'
                          className={cn(
                            'text-xs font-semibold px-2.5 py-0.5 border shadow-2xs',
                            admin.role === 'ADMIN' || admin.role === 'SUPER_ADMIN'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
                              : admin.role === 'SUPERVISOR'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                                : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
                          )}
                        >
                          {roleName}
                        </Badge>
                      </TableCell>

                      {/* Branch */}
                      <TableCell>
                        {admin.branch ? (
                          <div className='flex items-center gap-1.5'>
                            <Building2 className='size-3.5 text-muted-foreground shrink-0' />
                            <span className='text-xs font-medium text-slate-700 dark:text-slate-300'>
                              {admin.branch.name}
                            </span>
                          </div>
                        ) : (
                          <Badge variant='secondary' className='text-[11px] font-normal'>
                            كافة الفروع (عام)
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions Dropdown */}
                      <TableCell className='text-center'>
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger
                            render={<Button variant='ghost' size='icon' className='size-8' />}
                          >
                            <MoreHorizontal className='size-4' />
                            <span className='sr-only'>الإجراءات</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' className='w-44 text-right' dir='rtl'>
                            <DropdownMenuGroup>
                              <DropdownMenuLabel className='text-xs text-muted-foreground'>
                                إجراءات المستخدم
                              </DropdownMenuLabel>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                onClick={() => openEditSheet(admin)}
                                className='gap-2 cursor-pointer'
                              >
                                <Edit className='size-4 text-muted-foreground' />
                                <span>تعديل البيانات</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push('/dashboard/roles')}
                                className='gap-2 cursor-pointer'
                              >
                                <Key className='size-4 text-muted-foreground' />
                                <span>إدارة الصلاحيات</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(admin)}
                                disabled={isCurrent}
                                variant='destructive'
                                className='gap-2 cursor-pointer'
                              >
                                <Trash2 className='size-4' />
                                <span>{isCurrent ? 'حسابك الحالي' : 'حذف المستخدم'}</span>
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination Bar */}
          {!isLoading && filteredAdmins.length > 0 && (
            <div className='p-4 border-t bg-card flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground'>
              <div>
                عرض <strong className='font-mono text-foreground'>{Math.min(filteredAdmins.length, (currentPage - 1) * pageSize + 1)}</strong> إلى{' '}
                <strong className='font-mono text-foreground'>{Math.min(filteredAdmins.length, currentPage * pageSize)}</strong> من أصل{' '}
                <strong className='font-mono text-foreground'>{filteredAdmins.length}</strong> مستخدم
              </div>

              <div className='flex items-center gap-2'>
                <div className='flex items-center gap-1.5 ml-3'>
                  <span>العدد بالصفحة:</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      if (v) {
                        setPageSize(Number(v));
                        setCurrentPage(1);
                      }
                    }}
                  >
                    <SelectTrigger className='w-[65px] h-8 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='5'>5</SelectItem>
                      <SelectItem value='10'>10</SelectItem>
                      <SelectItem value='20'>20</SelectItem>
                      <SelectItem value='50'>50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='flex items-center gap-1'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className='h-8 px-2.5'
                  >
                    السابق
                  </Button>
                  <span className='px-2 font-mono font-medium text-foreground'>
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className='h-8 px-2.5'
                  >
                    التالي
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Slide-over Sheet for Create / Edit User */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side='left' className='sm:max-w-md flex flex-col w-full' dir='rtl'>
            <SheetHeader className='text-right'>
              <SheetTitle className='text-lg font-bold flex items-center gap-2'>
                {editingUser ? <Edit className='size-5 text-primary' /> : <Plus className='size-5 text-primary' />}
                {editingUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
              </SheetTitle>
              <SheetDescription className='text-xs'>
                {editingUser
                  ? `تعديل الحساب والدور الوظيفي والفرع للمستخدم «${editingUser.name}».`
                  : 'أدخل البيانات لإنشاء حساب جديد وتعيين الصلاحيات والفرع.'}
              </SheetDescription>
            </SheetHeader>

            <Separator className='my-2' />

            <form id='user-form' onSubmit={handleSubmit} className='flex-1 overflow-y-auto space-y-4 px-1 py-2'>
              {/* Full Name */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>الاسم الكامل <span className='text-destructive'>*</span></Label>
                <div className='relative'>
                  <UserIcon className='absolute right-3 top-2.5 size-4 text-muted-foreground' />
                  <Input
                    required
                    placeholder='مثال: محمد علي الأحمد'
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className='pr-9'
                  />
                </div>
              </div>

              {/* Email */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>البريد الإلكتروني <span className='text-destructive'>*</span></Label>
                <div className='relative'>
                  <Mail className='absolute right-3 top-2.5 size-4 text-muted-foreground' />
                  <Input
                    required
                    type='email'
                    placeholder='name@domain.com'
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className='pr-9 font-mono'
                    dir='ltr'
                  />
                </div>
              </div>

              {/* Username (only editable or set on create) */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>
                  اسم المستخدم (لتسجيل الدخول) {!editingUser && <span className='text-destructive'>*</span>}
                </Label>
                <Input
                  required={!editingUser}
                  disabled={!!editingUser}
                  placeholder='username'
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className='font-mono'
                  dir='ltr'
                />
                {editingUser && (
                  <p className='text-[11px] text-muted-foreground'>اسم المستخدم مرتبط بمعرف الحساب ولا يمكن تغييره.</p>
                )}
              </div>

              {/* Phone */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>رقم الهاتف</Label>
                <div className='relative'>
                  <Phone className='absolute right-3 top-2.5 size-4 text-muted-foreground' />
                  <Input
                    placeholder='05xxxxxxxx'
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className='pr-9 font-mono'
                    dir='ltr'
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold'>الدور الوظيفي <span className='text-destructive'>*</span></Label>
                  <Link href='/dashboard/roles' className='text-primary text-[11px] hover:underline flex items-center gap-0.5'>
                    + أدوار مخصصة
                  </Link>
                </div>
                <Select
                  value={formData.roleId}
                  onValueChange={(v) => {
                    if (v) setFormData({ ...formData, roleId: v });
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='اختر الدور الوظيفي' />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.display_name} ({r.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Branch Selection */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>الفرع التابع</Label>
                <Select
                  value={formData.branchId || 'NONE'}
                  onValueChange={(v) => {
                    setFormData({ ...formData, branchId: v === 'NONE' || !v ? '' : v });
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='كافة الفروع (إدارة عامة)' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='NONE'>كافة الفروع (إدارة عامة)</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Password */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>
                  {editingUser ? 'تغيير كلمة المرور (اختياري)' : 'كلمة المرور'} {!editingUser && <span className='text-destructive'>*</span>}
                </Label>
                <div className='relative'>
                  <Input
                    required={!editingUser}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={editingUser ? 'اتركه فارغاً للاحتفاظ بكلمة المرور الحالية' : 'أدخل كلمة مرور قوية'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className='pl-9 font-mono'
                    dir='ltr'
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute left-3 top-2.5 text-muted-foreground hover:text-foreground'
                  >
                    {showPassword ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
                  </button>
                </div>
              </div>
            </form>

            <SheetFooter className='border-t pt-3 mt-auto gap-2 flex-row justify-end'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setSheetOpen(false)}
                disabled={isFormPending}
              >
                إلغاء
              </Button>
              <Button
                type='submit'
                form='user-form'
                disabled={isFormPending}
                className='gap-2 font-bold shadow-sm'
              >
                {isFormPending && <Icons.spinner className='size-4 animate-spin' />}
                {editingUser ? 'حفظ التعديلات' : 'إضافة المستخدم'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent className='sm:max-w-md' dir='rtl'>
            <DialogHeader className='text-right'>
              <DialogTitle className='text-destructive flex items-center gap-2'>
                <Trash2 className='size-5' />
                تأكيد حذف المستخدم
              </DialogTitle>
              <DialogDescription className='text-sm mt-2'>
                {deleteTarget ? (
                  <>
                    هل أنت متأكد من رغبتك في حذف المستخدم{' '}
                    <strong className='text-foreground font-bold'>«{deleteTarget.name}»</strong>؟
                    <br />
                    سيتم سحب كافة الصلاحيات وإلغاء وصول الحساب نهائياً.
                  </>
                ) : (
                  'هل أنت متأكد من حذف هذا الحساب؟'
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className='gap-2 sm:justify-start'>
              <Button variant='outline' onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
                إلغاء
              </Button>
              <Button
                variant='destructive'
                disabled={deleteMutation.isPending}
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                className='gap-2 font-bold'
              >
                {deleteMutation.isPending && <Icons.spinner className='size-4 animate-spin' />}
                تأكيد الحذف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
