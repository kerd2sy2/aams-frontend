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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icons } from '@/components/icons';
import { getAdminUser } from '@/lib/aams/auth';
import { hasPermission } from '@/lib/aams/permissions';
import { adminApi, roleApi, branchApi, employeeApi } from '@/lib/aams/services';
import type { Admin, Role, Branch, Employee } from '@/types/aams';
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
  X,
  Shield,
  UserPlus,
  Link2,
  CheckSquare,
  Square,
  Sparkles,
  Info
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
  'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900'
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getUserAppBadges(admin: Admin) {
  let perms: string[] = [];
  if (Array.isArray(admin.permissions)) perms = admin.permissions;
  else if (typeof admin.permissions === 'string') {
    try {
      perms = JSON.parse(admin.permissions);
    } catch {}
  }
  const isAll = admin.role === 'SUPER_ADMIN' || perms.includes('*');

  const apps = [
    {
      key: 'apps.ohda',
      label: 'العهدة',
      allowed: isAll || perms.includes('apps.ohda') || perms.includes('app.ohda'),
      color:
        'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900'
    },
    {
      key: 'apps.eshraf',
      label: 'الإشراف',
      allowed: isAll || perms.includes('apps.eshraf') || perms.includes('app.eshraf'),
      color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900'
    },
    {
      key: 'apps.edara',
      label: 'الإدارة',
      allowed: isAll || perms.includes('apps.edara') || perms.includes('app.edara'),
      color:
        'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900'
    },
    {
      key: 'apps.manadeeb',
      label: 'المناديب',
      allowed: isAll || perms.includes('apps.manadeeb') || perms.includes('app.manadeeb'),
      color:
        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
    },
    {
      key: 'apps.dashboard',
      label: 'الداشبورد',
      allowed:
        isAll ||
        perms.includes('apps.dashboard') ||
        perms.includes('app.dashboard') ||
        ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'ACCOUNTANT', 'HR', 'OWNER'].includes(admin.role),
      color:
        'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
    }
  ];

  return apps.filter((a) => a.allowed);
}

const SYSTEM_PERMISSION_GROUPS = [
  {
    category: 'المشرف العام والتحكم الكامل',
    permissions: [
      {
        key: '*',
        label: 'مشرف عام (كامل الصلاحيات)',
        description: 'الوصول لجميع موديولات وشاشات وعمليات وتطبيقات النظام'
      }
    ]
  },
  {
    category: 'صلاحيات الدخول للتطبيقات (App Access)',
    permissions: [
      {
        key: 'apps.ohda',
        label: 'تطبيق العهدة (Ohda)',
        description: 'السماح بتسجيل الدخول إلى تطبيق العهدة وإدارة المصروفات اليومية'
      },
      {
        key: 'apps.eshraf',
        label: 'تطبيق الإشراف (Eshraf)',
        description: 'السماح بتسجيل الدخول إلى تطبيق المشرفين الميدانيين ومتابعة الورديات'
      },
      {
        key: 'apps.edara',
        label: 'تطبيق الإدارة (Edara)',
        description: 'السماح بتسجيل الدخول إلى تطبيق الإدارة والعمليات'
      },
      {
        key: 'apps.manadeeb',
        label: 'تطبيق المناديب (Manadeeb)',
        description: 'السماح بتسجيل الدخول إلى تطبيق المناديب وتوصيل الطلبات'
      },
      {
        key: 'apps.dashboard',
        label: 'لوحة التحكم (Dashboard)',
        description: 'السماح بالدخول إلى لوحة التحكم الرئيسية عبر المتصفح'
      }
    ]
  },
  {
    category: 'الموظفون والمناديب',
    permissions: [
      { key: 'employees.view', label: 'عرض الموظفين', description: 'استعراض قائمة وسجلات الموظفين' },
      { key: 'employees.create', label: 'إضافة موظف', description: 'إنشاء ملف موظف جديد' },
      { key: 'employees.edit', label: 'تعديل موظف', description: 'تعديل وتحديث بيانات الموظفين' },
      {
        key: 'employees.cards',
        label: 'بطاقات العمل',
        description: 'عرض وطباعة بطاقات العمل الرقمية'
      }
    ]
  },
  {
    category: 'التشغيل وحركات العمل',
    permissions: [
      { key: 'work.view', label: 'عرض حركات العمل', description: 'متابعة الشفتات والورديات' },
      { key: 'work.start', label: 'بدء وردية', description: 'تسجيل بدء عمل للمندوبين' },
      { key: 'work.end', label: 'إنهاء وردية', description: 'تسجيل إغلاق وردية للمندوبين' }
    ]
  },
  {
    category: 'المركبات والأسطول',
    permissions: [
      {
        key: 'vehicles.view',
        label: 'عرض المركبات',
        description: 'استعراض أسطول الدراجات والسيارات'
      },
      {
        key: 'vehicles.manage',
        label: 'إدارة المركبات',
        description: 'إضافة وتعديل وحذف المركبات'
      },
      { key: 'vehicles.oil', label: 'متابعة الزيوت', description: 'تسجيل وتتبع غيارات الزيت' },
      { key: 'fuel.view', label: 'عرض الوقود', description: 'استعراض حركات تعبئة الوقود' },
      { key: 'fuel.manage', label: 'إدارة الوقود', description: 'تسجيل واستهلاك وقود المركبات' }
    ]
  },
  {
    category: 'الصيانة والورشة',
    permissions: [
      { key: 'maintenance.view', label: 'عرض الصيانة', description: 'استعراض سجلات وأوامر الصيانة' },
      {
        key: 'maintenance.manage',
        label: 'إدارة الصيانة',
        description: 'فتح وإغلاق وتعديل أوامر الصيانة'
      }
    ]
  },
  {
    category: 'العهد والأصول',
    permissions: [
      { key: 'custody', label: 'الوصول العام للعهد', description: 'صلاحية الدخول لموديول العهد' },
      { key: 'custody.view', label: 'عرض العهد', description: 'استعراض العهد المسلمة والمسترجعة' },
      { key: 'custody.add', label: 'تسليم عهدة', description: 'تسجيل تسليم عهدة جديدة لموظف' },
      { key: 'custody.manage', label: 'إدارة العهد', description: 'تعديل واسترجاع العهد' },
      { key: 'custody.delete', label: 'حذف عهدة', description: 'إلغاء وحذف سجل عهدة' }
    ]
  },
  {
    category: 'المستودع والمخزون',
    permissions: [
      { key: 'inventory.view', label: 'عرض المستودع', description: 'استعراض الأصناف والكميات' },
      { key: 'inventory.dispense', label: 'صرف قطع غيار', description: 'صرف الأصناف وتحديث الأرصدة' }
    ]
  },
  {
    category: 'الموارد البشرية والشؤون القانونية',
    permissions: [
      { key: 'attendance.view', label: 'عرض الحضور', description: 'متابعة سجلات الحضور والانصراف' },
      {
        key: 'investigations.view',
        label: 'عرض التحقيقات',
        description: 'استعراض التحقيقات الإدارية'
      },
      { key: 'investigations.create', label: 'فتح تحقيق', description: 'إنشاء جلسة تحقيق لموظف' },
      { key: 'leaves.view', label: 'عرض الإجازات', description: 'استعراض طلبات الإجازات' },
      { key: 'leaves.manage', label: 'إدارة الإجازات', description: 'الموافقة على الإجازات أو رفضها' }
    ]
  },
  {
    category: 'البلاغات والشكاوى',
    permissions: [
      { key: 'tickets.view', label: 'عرض البلاغات', description: 'استعراض التذاكر المفتوحة' },
      { key: 'tickets.manage', label: 'معالجة البلاغات', description: 'تحديث حالة وإغلاق التذاكر' }
    ]
  },
  {
    category: 'المالية والحسابات',
    permissions: [
      { key: 'bank_accounts.view', label: 'عرض الحسابات', description: 'استعراض الحسابات البنكية' },
      {
        key: 'bank_accounts.manage',
        label: 'إدارة الحسابات',
        description: 'تعديل وإضافة الحسابات البنكية'
      },
      { key: 'violations.view', label: 'عرض المخالفات', description: 'استعراض المخالفات المرورية' },
      { key: 'violations.manage', label: 'إدارة المخالفات', description: 'تسجيل وتسوية المخالفات' }
    ]
  },
  {
    category: 'التقارير والمستندات',
    permissions: [
      {
        key: 'reports.view',
        label: 'عرض التقارير',
        description: 'استعراض التقارير الإحصائية والمالية'
      },
      {
        key: 'reports.export',
        label: 'تصدير التقارير',
        description: 'تصدير التقارير إلى Excel/PDF'
      },
      { key: 'documents.view', label: 'عرض المستندات', description: 'استعراض الوثائق الرسمية' },
      { key: 'documents.manage', label: 'إدارة المستندات', description: 'رفع وتحديث المستندات' }
    ]
  }
];

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

  // Promote Employee Dialog States
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [promoteRole, setPromoteRole] = useState('SUPERVISOR');
  const [promoteRoleId, setPromoteRoleId] = useState('');
  const [promoteBranchId, setPromoteBranchId] = useState('');
  const [promotePhone, setPromotePhone] = useState('');
  const [empSearch, setEmpSearch] = useState('');

  // Permissions Management Dialog States
  const [permModalUser, setPermModalUser] = useState<Admin | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentAdmin = getAdminUser();
  const roleUpper = (currentAdmin?.role || '').toUpperCase();
  const roleObjUpper = (currentAdmin?.role_obj?.name || '').toUpperCase();
  const isSuperOrAdmin =
    roleUpper === 'ADMIN' ||
    roleUpper === 'SUPER_ADMIN' ||
    roleUpper === 'GENERAL_MANAGER' ||
    roleObjUpper === 'ADMIN' ||
    roleObjUpper === 'SUPER_ADMIN' ||
    roleObjUpper === 'GENERAL_MANAGER' ||
    (currentAdmin?.permissions || []).includes('*');

  const canAccessUsers =
    isSuperOrAdmin || !currentAdmin?.branch_id || hasPermission('users.manage', currentAdmin);

  const {
    data: admins = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => adminApi.getAll(),
    enabled: mounted && canAccessUsers
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
    if (mounted && !canAccessUsers) {
      router.replace('/dashboard');
    }
  }, [mounted, canAccessUsers, router]);

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
    }) => adminApi.create(data),
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
      clear_branch?: boolean;
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
        clear_branch: data.clear_branch,
        permissions: data.permissions,
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

  // Promote Employee Query & Mutation
  const { data: employeesData, isLoading: isEmployeesLoading } = useQuery({
    queryKey: ['employees-for-promote'],
    queryFn: () => employeeApi.getAll({ limit: 200 }),
    enabled: promoteOpen
  });

  const employeeList: Employee[] = useMemo(() => {
    if (!employeesData) return [];
    if (Array.isArray(employeesData)) return employeesData;
    if (Array.isArray((employeesData as any).data)) return (employeesData as any).data;
    return [];
  }, [employeesData]);

  const filteredEmployees = useMemo(() => {
    if (!empSearch.trim()) return employeeList;
    const q = empSearch.toLowerCase();
    return employeeList.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.phone?.includes(q) ||
        e.employee_number?.toLowerCase().includes(q) ||
        e.job_role?.toLowerCase().includes(q)
    );
  }, [employeeList, empSearch]);

  const promoteMutation = useMutation({
    mutationFn: (data: {
      employee_id: string;
      role: string;
      role_id?: string;
      branch_id?: string;
      phone?: string;
      permissions?: string[];
    }) => adminApi.promote(data),
    onSuccess: () => {
      toast.success(
        'تم ترقية الموظف وربط حسابه بنجاح. كلمة المرور الأولية هي آخر 4 أرقام من الجوال.'
      );
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setPromoteOpen(false);
      setSelectedEmployeeId('');
      setPromotePhone('');
      setEmpSearch('');
    },
    onError: (err) => toast.error(getErrorMessage(err))
  });

  // Permission Management Mutation & Helpers
  const savePermsMutation = useMutation({
    mutationFn: (data: { id: string; permissions: string[] }) =>
      adminApi.update(data.id, { permissions: data.permissions }),
    onSuccess: () => {
      toast.success('تم حفظ الصلاحيات المخصصة للمستخدم بنجاح');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setPermModalUser(null);
    },
    onError: (err) => toast.error(getErrorMessage(err))
  });

  const openPermModal = (user: Admin) => {
    setPermModalUser(user);
    let perms: string[] = [];
    if (Array.isArray(user.permissions)) {
      perms = [...user.permissions];
    } else if (typeof user.permissions === 'string') {
      try {
        perms = JSON.parse(user.permissions);
      } catch {
        perms = [];
      }
    }
    // If not configured, load role permissions as initial suggestion
    if (!user.permissions_configured && user.role_obj?.permissions) {
      perms = [...user.role_obj.permissions];
    }
    setSelectedPerms(perms);
  };

  const togglePerm = (key: string) => {
    setSelectedPerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleCategory = (catKeys: string[]) => {
    const allSelected = catKeys.every((k) => selectedPerms.includes(k));
    if (allSelected) {
      setSelectedPerms((prev) => prev.filter((k) => !catKeys.includes(k)));
    } else {
      setSelectedPerms((prev) => Array.from(new Set([...prev, ...catKeys])));
    }
  };

  const selectAllSystemPerms = () => {
    const allKeys = SYSTEM_PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
    setSelectedPerms(Array.from(new Set(allKeys)));
  };

  const clearAllPerms = () => {
    setSelectedPerms([]);
  };

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

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      (!editingUser && !formData.username.trim())
    ) {
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
        clear_branch: !formData.branchId || formData.branchId === 'NONE',
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
        if (selectedBranchFilter !== 'HEADQUARTERS' && admin.branch_id !== selectedBranchFilter)
          return false;
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

  if (!mounted || !canAccessUsers) return null;

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
                <span>إدارة الأدوار</span>
              </Button>
            </Link>
            <Button
              onClick={() => {
                setSelectedEmployeeId('');
                setPromotePhone('');
                setPromoteRole('SUPERVISOR');
                setPromoteRoleId('');
                setPromoteBranchId('');
                setEmpSearch('');
                setPromoteOpen(true);
              }}
              variant='outline'
              className='gap-2 shadow-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold'
            >
              <UserPlus className='size-4 text-emerald-600' />
              <span>ترقية موظف</span>
            </Button>
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
                    <SelectValue placeholder='الدور الوظيفي'>
                      {selectedRoleFilter === 'ALL'
                        ? 'كافة الأدوار'
                        : roles.find((r) => r.id === selectedRoleFilter)?.display_name ||
                          'الدور الوظيفي'}
                    </SelectValue>
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
                    <SelectValue placeholder='الفرع'>
                      {selectedBranchFilter === 'ALL'
                        ? 'كافة الفروع'
                        : selectedBranchFilter === 'HEADQUARTERS'
                          ? 'الإدارة العامة'
                          : branches.find((b) => b.id === selectedBranchFilter)?.name || 'الفرع'}
                    </SelectValue>
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
                <TableHead className='text-right font-bold'>الصلاحيات</TableHead>
                <TableHead className='text-right font-bold'>الفرع التابع</TableHead>
                <TableHead className='text-center w-[100px] font-bold'>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-48 text-center'>
                    <div className='flex flex-col items-center justify-center gap-2'>
                      <Icons.spinner className='size-6 animate-spin text-primary' />
                      <p className='text-sm text-muted-foreground'>
                        جارٍ تحميل بيانات المستخدمين...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedAdmins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-48 text-center'>
                    <div className='flex flex-col items-center justify-center gap-2'>
                      <div className='size-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground'>
                        <Users className='size-6' />
                      </div>
                      <p className='text-base font-bold'>لا توجد نتائج</p>
                      <p className='text-xs text-muted-foreground max-w-sm'>
                        {searchQuery ||
                        selectedRoleFilter !== 'ALL' ||
                        selectedBranchFilter !== 'ALL'
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
                            <div className='flex items-center gap-1.5 flex-wrap'>
                              <span className='font-bold text-sm text-slate-900 dark:text-slate-100 truncate'>
                                {admin.name}
                              </span>
                              {isCurrent && (
                                <Badge
                                  variant='secondary'
                                  className='text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                                >
                                  أنت
                                </Badge>
                              )}
                              {admin.employee_id && (
                                <Badge
                                  variant='outline'
                                  className='text-[10px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 font-medium flex items-center gap-1'
                                >
                                  <Link2 className='size-2.5' />
                                  مرتبط بموظف
                                </Badge>
                              )}
                            </div>
                            <span
                              className='text-xs text-muted-foreground font-mono truncate flex items-center gap-1 mt-0.5'
                              dir='ltr'
                            >
                              <Mail className='size-3 shrink-0' />
                              {admin.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Username */}
                      <TableCell>
                        <Badge
                          variant='outline'
                          className='font-mono text-xs font-medium px-2 py-0.5 bg-muted/30'
                          dir='ltr'
                        >
                          @{admin.username || '—'}
                        </Badge>
                      </TableCell>

                      {/* Phone */}
                      <TableCell>
                        {admin.phone ? (
                          <div
                            className='flex items-center gap-1.5 text-xs font-mono text-muted-foreground'
                            dir='ltr'
                          >
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

                      {/* Permissions & Apps */}
                      <TableCell>
                        <div className='flex flex-col gap-1.5'>
                          <div>
                            {admin.role === 'SUPER_ADMIN' ? (
                              <Badge className='bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 text-xs font-semibold'>
                                مشرف عام (*)
                              </Badge>
                            ) : admin.permissions_configured ? (
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => openPermModal(admin)}
                                className='h-7 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10'
                              >
                                <Shield className='size-3' />
                                <span>
                                  {(() => {
                                    let count = 0;
                                    if (Array.isArray(admin.permissions))
                                      count = admin.permissions.length;
                                    else if (typeof admin.permissions === 'string') {
                                      try {
                                        count = JSON.parse(admin.permissions).length;
                                      } catch {}
                                    }
                                    return count === 0
                                      ? 'مخصص (بلا صلاحيات)'
                                      : `${count} صلاحية مخصصة`;
                                  })()}
                                </span>
                              </Button>
                            ) : (
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => openPermModal(admin)}
                                className='h-7 text-xs text-muted-foreground gap-1.5 hover:text-foreground'
                                title='انقر لتخصيص صلاحيات فردية'
                              >
                                <span>تلقائي ({roleName})</span>
                                <Edit className='size-3 opacity-60' />
                              </Button>
                            )}
                          </div>

                          {/* Allowed Apps Badges */}
                          <div className='flex items-center gap-1 flex-wrap'>
                            {getUserAppBadges(admin).map((app) => (
                              <span
                                key={app.key}
                                className={cn(
                                  'text-[10px] font-bold px-1.5 py-0.5 rounded border leading-none',
                                  app.color
                                )}
                                title={`مصرح بدخول ${app.label}`}
                              >
                                {app.label}
                              </span>
                            ))}
                          </div>
                        </div>
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
                                onClick={() => openPermModal(admin)}
                                className='gap-2 cursor-pointer'
                              >
                                <Shield className='size-4 text-primary' />
                                <span>تخصيص الصلاحيات</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push('/dashboard/roles')}
                                className='gap-2 cursor-pointer'
                              >
                                <Key className='size-4 text-muted-foreground' />
                                <span>إدارة الأدوار</span>
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
                عرض{' '}
                <strong className='font-mono text-foreground'>
                  {Math.min(filteredAdmins.length, (currentPage - 1) * pageSize + 1)}
                </strong>{' '}
                إلى{' '}
                <strong className='font-mono text-foreground'>
                  {Math.min(filteredAdmins.length, currentPage * pageSize)}
                </strong>{' '}
                من أصل{' '}
                <strong className='font-mono text-foreground'>{filteredAdmins.length}</strong>{' '}
                مستخدم
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
          <SheetContent className='sm:max-w-lg flex flex-col w-full p-0'>
            <SheetHeader className='p-6'>
              <SheetTitle className='flex items-center gap-2'>
                {editingUser ? (
                  <Edit className='size-5 text-primary' />
                ) : (
                  <Plus className='size-5 text-primary' />
                )}
                {editingUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
              </SheetTitle>
              <SheetDescription>
                {editingUser
                  ? `تعديل الحساب والدور الوظيفي والفرع للمستخدم «${editingUser.name}».`
                  : 'أدخل البيانات لإنشاء حساب جديد وتعيين الصلاحيات والفرع.'}
              </SheetDescription>
            </SheetHeader>

            <form
              id='user-form'
              onSubmit={handleSubmit}
              className='flex-1 overflow-y-auto space-y-4 px-6 py-5 min-h-0'
            >
              {/* Full Name */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>
                  الاسم الكامل <span className='text-destructive'>*</span>
                </Label>
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
                <Label className='text-xs font-semibold'>
                  البريد الإلكتروني <span className='text-destructive'>*</span>
                </Label>
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
                  اسم المستخدم (لتسجيل الدخول){' '}
                  {!editingUser && <span className='text-destructive'>*</span>}
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
                  <p className='text-[11px] text-muted-foreground'>
                    اسم المستخدم مرتبط بمعرف الحساب ولا يمكن تغييره.
                  </p>
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
                  <Label className='text-xs font-semibold'>
                    الدور الوظيفي <span className='text-destructive'>*</span>
                  </Label>
                  <Link
                    href='/dashboard/roles'
                    className='text-primary text-[11px] hover:underline flex items-center gap-0.5'
                  >
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
                    <SelectValue placeholder='اختر الدور الوظيفي'>
                      {formData.roleId
                        ? (() => {
                            const r = roles.find((role) => role.id === formData.roleId);
                            return r ? `${r.display_name} (${r.name})` : 'اختر الدور الوظيفي';
                          })()
                        : null}
                    </SelectValue>
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
                    <SelectValue placeholder='كافة الفروع (إدارة عامة)'>
                      {!formData.branchId || formData.branchId === 'NONE'
                        ? 'كافة الفروع (إدارة عامة)'
                        : branches.find((b) => b.id === formData.branchId)?.name ||
                          'كافة الفروع (إدارة عامة)'}
                    </SelectValue>
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
                  {editingUser ? 'تغيير كلمة المرور (اختياري)' : 'كلمة المرور'}{' '}
                  {!editingUser && <span className='text-destructive'>*</span>}
                </Label>
                <div className='relative'>
                  <Input
                    required={!editingUser}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={
                      editingUser
                        ? 'اتركه فارغاً للاحتفاظ بكلمة المرور الحالية'
                        : 'أدخل كلمة مرور قوية'
                    }
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

            <SheetFooter className='p-4 border-t bg-muted/20 flex items-center justify-end gap-2'>
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
                className='gap-2 font-medium shadow-sm'
              >
                {isFormPending && <Icons.spinner className='size-4 animate-spin' />}
                {editingUser ? 'حفظ التعديلات' : 'إضافة المستخدم'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
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
              <Button
                variant='outline'
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
              >
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
        {/* Promote Employee Dialog */}
        <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
          <DialogContent className='sm:max-w-lg' dir='rtl'>
            <DialogHeader className='text-right'>
              <DialogTitle className='text-emerald-600 dark:text-emerald-400 flex items-center gap-2'>
                <UserPlus className='size-5' />
                ترقية موظف وإنشاء / ربط حسابه
              </DialogTitle>
              <DialogDescription className='text-xs'>
                اختر موظفاً من قائمة الموظفين لترقيته إلى مشرف أو إدارة أو حسابات، وربط حسابه الحالي
                بملفه الوظيفي.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!selectedEmployeeId) {
                  toast.error('يرجى اختيار الموظف المراد ترقيته');
                  return;
                }
                const matchedRole = roles.find((r) => r.id === promoteRoleId);
                promoteMutation.mutate({
                  employee_id: selectedEmployeeId,
                  role: matchedRole ? matchedRole.name : promoteRole,
                  role_id: promoteRoleId || undefined,
                  branch_id: promoteBranchId || undefined,
                  phone: promotePhone.trim() || undefined
                });
              }}
              className='space-y-4 py-2'
            >
              {/* Employee Selection */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>
                  الموظف المراد ترقيته <span className='text-destructive'>*</span>
                </Label>
                <div className='relative mb-2'>
                  <Search className='absolute right-2.5 top-2.5 size-3.5 text-muted-foreground' />
                  <Input
                    placeholder='بحث بالاسم، رقم الموظف، أو الجوال...'
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    className='pr-8 h-8 text-xs'
                  />
                </div>
                <Select
                  value={selectedEmployeeId}
                  onValueChange={(val) => {
                    const idStr = val || '';
                    setSelectedEmployeeId(idStr);
                    const emp = employeeList.find((e) => e.id === idStr);
                    if (emp) {
                      if (emp.phone) setPromotePhone(emp.phone);
                      if ((emp as any).branch_id) setPromoteBranchId((emp as any).branch_id);
                    }
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='اختر الموظف'>
                      {selectedEmployeeId
                        ? (() => {
                            const emp = employeeList.find((e) => e.id === selectedEmployeeId);
                            return emp
                              ? `${emp.name} (${emp.job_role || 'مندوب'} - ${emp.phone || emp.employee_number})`
                              : 'اختر الموظف';
                          })()
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className='max-h-56'>
                    {isEmployeesLoading ? (
                      <div className='p-3 text-center text-xs text-muted-foreground'>
                        جارٍ تحميل الموظفين...
                      </div>
                    ) : filteredEmployees.length === 0 ? (
                      <div className='p-3 text-center text-xs text-muted-foreground'>
                        لا يوجد موظفون يطابقون البحث
                      </div>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} —{' '}
                          <span className='text-muted-foreground text-xs'>
                            ({emp.job_role || 'مندوب'}) {emp.phone || emp.employee_number}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Role */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>
                  الدور الوظيفي الجديد <span className='text-destructive'>*</span>
                </Label>
                <Select
                  value={promoteRoleId || promoteRole}
                  onValueChange={(val) => {
                    const roleStr = val || '';
                    const matched = roles.find((r) => r.id === roleStr || r.name === roleStr);
                    if (matched) {
                      setPromoteRoleId(matched.id);
                      setPromoteRole(matched.name);
                    } else {
                      setPromoteRole(roleStr);
                    }
                  }}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='اختر الدور'>
                      {roles.find((r) => r.id === promoteRoleId || r.name === promoteRole)
                        ?.display_name || promoteRole}
                    </SelectValue>
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

              {/* Target Branch */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>الفرع المعين له</Label>
                <Select
                  value={promoteBranchId || 'NONE'}
                  onValueChange={(val) => setPromoteBranchId(!val || val === 'NONE' ? '' : val)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='كافة الفروع (إدارة عامة)'>
                      {!promoteBranchId || promoteBranchId === 'NONE'
                        ? 'كافة الفروع (إدارة عامة)'
                        : branches.find((b) => b.id === promoteBranchId)?.name || 'كافة الفروع'}
                    </SelectValue>
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

              {/* Phone for login */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>رقم الجوال لتسجيل الدخول</Label>
                <Input
                  placeholder='05xxxxxxxx'
                  value={promotePhone}
                  onChange={(e) => setPromotePhone(e.target.value)}
                  className='font-mono'
                  dir='ltr'
                />
                <p className='text-[11px] text-muted-foreground'>
                  إذا كان الحساب جديداً، ستكون كلمة المرور المؤقتة هي آخر 4 أرقام من هذا الرقم،
                  وسيلزمه النظام بتغييرها عند أول دخول.
                </p>
              </div>

              {/* Notice Banner */}
              <div className='p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2'>
                <Sparkles className='size-4 text-emerald-600 shrink-0 mt-0.5' />
                <div className='space-y-1'>
                  <p className='font-bold'>ربط ذكي بدون تكرار السجلات:</p>
                  <p className='text-[11px] leading-relaxed'>
                    إذا كان للموظف حساب سابق في النظام فسيتم تحديث دوره وبياناته فقط دون تكرار
                    الحساب.
                  </p>
                </div>
              </div>

              <DialogFooter className='gap-2 sm:justify-start pt-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setPromoteOpen(false)}
                  disabled={promoteMutation.isPending}
                >
                  إلغاء
                </Button>
                <Button
                  type='submit'
                  disabled={promoteMutation.isPending || !selectedEmployeeId}
                  className='gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white'
                >
                  {promoteMutation.isPending && <Icons.spinner className='size-4 animate-spin' />}
                  تأكيد الترقية والربط
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Manage Individual Permissions Dialog */}
        <Dialog
          open={permModalUser !== null}
          onOpenChange={(open) => !open && setPermModalUser(null)}
        >
          <DialogContent className='sm:max-w-2xl max-h-[85vh] flex flex-col p-0' dir='rtl'>
            <DialogHeader className='p-6 pb-4 border-b text-right'>
              <div className='flex items-center justify-between'>
                <DialogTitle className='flex items-center gap-2 text-primary'>
                  <Shield className='size-5' />
                  <span>تخصيص الصلاحيات الفردية</span>
                </DialogTitle>
                <Badge variant='outline' className='font-mono font-bold text-xs'>
                  {selectedPerms.length} صلاحية محددة
                </Badge>
              </div>
              <DialogDescription className='text-xs mt-1'>
                تحديد الصلاحيات الخاصة بالمستخدم «<strong>{permModalUser?.name}</strong>» (
                {permModalUser?.role}). الصلاحيات المحددة هنا تلغي وتتفوق على الصلاحيات الافتراضية
                للدور.
              </DialogDescription>
            </DialogHeader>

            <div className='px-6 py-2.5 bg-muted/40 border-b flex flex-wrap items-center justify-between gap-2 text-xs'>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={selectAllSystemPerms}
                  className='h-7 text-xs gap-1'
                >
                  <CheckSquare className='size-3.5 text-primary' />
                  <span>تحديد كافة الصلاحيات</span>
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={clearAllPerms}
                  className='h-7 text-xs gap-1 text-destructive hover:bg-destructive/10'
                >
                  <Square className='size-3.5' />
                  <span>تفريغ الكل (حجب الموديولات)</span>
                </Button>
              </div>
              {permModalUser?.role_obj?.permissions && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    if (permModalUser?.role_obj?.permissions) {
                      setSelectedPerms([...permModalUser.role_obj.permissions]);
                    }
                  }}
                  className='h-7 text-xs text-muted-foreground hover:text-foreground'
                >
                  <span>استعادة صلاحيات الدور ({permModalUser?.role})</span>
                </Button>
              )}
            </div>

            <ScrollArea className='flex-1 p-6 overflow-y-auto min-h-0'>
              <div className='space-y-5'>
                {SYSTEM_PERMISSION_GROUPS.map((group) => {
                  const groupKeys = group.permissions.map((p) => p.key);
                  const isAllSelected = groupKeys.every((k) => selectedPerms.includes(k));

                  return (
                    <div
                      key={group.category}
                      className='border rounded-xl p-4 bg-card/60 shadow-2xs space-y-3'
                    >
                      <div className='flex items-center justify-between pb-2 border-b'>
                        <span className='font-bold text-sm text-foreground'>{group.category}</span>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() => toggleCategory(groupKeys)}
                          className='h-6 text-xs text-primary gap-1 hover:bg-primary/10 px-2'
                        >
                          {isAllSelected ? 'إلغاء تحديد القسم' : 'تحديد كل القسم'}
                        </Button>
                      </div>

                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                        {group.permissions.map((perm) => {
                          const checked = selectedPerms.includes(perm.key);

                          return (
                            <label
                              key={perm.key}
                              className={cn(
                                'flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors text-right',
                                checked
                                  ? 'bg-primary/5 border-primary/40 dark:bg-primary/10'
                                  : 'border-border/60 hover:bg-muted/30'
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => togglePerm(perm.key)}
                                className='mt-0.5'
                              />
                              <div className='space-y-0.5 leading-tight'>
                                <p className='text-xs font-semibold text-foreground flex items-center gap-1.5'>
                                  <span>{perm.label}</span>
                                  {perm.key === '*' && (
                                    <Badge className='text-[10px] h-4 bg-purple-500 text-white'>
                                      شامل
                                    </Badge>
                                  )}
                                </p>
                                <p className='text-[11px] text-muted-foreground line-clamp-1'>
                                  {perm.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <DialogFooter className='p-4 border-t bg-muted/20 flex items-center justify-between sm:justify-between'>
              <p className='text-xs text-muted-foreground font-mono'>
                الصلاحيات المحددة: {selectedPerms.length}
              </p>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setPermModalUser(null)}
                  disabled={savePermsMutation.isPending}
                >
                  إلغاء
                </Button>
                <Button
                  type='button'
                  onClick={() => {
                    if (permModalUser) {
                      savePermsMutation.mutate({
                        id: permModalUser.id,
                        permissions: selectedPerms
                      });
                    }
                  }}
                  disabled={savePermsMutation.isPending}
                  className='gap-2 font-bold shadow-sm'
                >
                  {savePermsMutation.isPending && <Icons.spinner className='size-4 animate-spin' />}
                  حفظ الصلاحيات
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
