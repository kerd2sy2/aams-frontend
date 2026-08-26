import type { Admin, PermissionGroup } from '@/types/aams';
import { getAdminUser } from './auth';

/**
 * All available permissions catalog organized into functional groups
 */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    group: 'employees',
    label: 'إدارة المناديب',
    description: 'التحكم في بيانات المناديب، الإضافة والتعديل والطباعة',
    permissions: [
      { key: 'employees.view', label: 'عرض المناديب', description: 'عرض قائمة وبيانات وبطاقات المناديب' },
      { key: 'employees.create', label: 'إضافة مندوب', description: 'تسجيل وإضافة مناديب جدد في النظام' },
      { key: 'employees.edit', label: 'تعديل مندوب', description: 'تعديل بيانات المناديب والمستندات' },
      { key: 'employees.delete', label: 'حذف مندوب', description: 'حذف سجل المندوب من النظام' },
      { key: 'employees.cards', label: 'طباعة البطاقات والباركود', description: 'طباعة بطاقة العمل والباركود و QR للمندوب' }
    ]
  },
  {
    group: 'work',
    label: 'الدوام والشفتات',
    description: 'متابعة وتسجيل بدء وانتهاء دوام المناديب والشفتات اليومية',
    permissions: [
      { key: 'work.view', label: 'متابعة الدوام', description: 'عرض شاشات العاملين الآن والمنتهي دوامهم وشفتات اليوم' },
      { key: 'work.start', label: 'تسجيل بدء الدوام', description: 'تسجيل خروج وبدء عمل المندوب والمركبة والكيلومترات' },
      { key: 'work.end', label: 'تسجيل إنهاء الدوام', description: 'تسجيل عودة المندوب وإقفال الشفت والطلبات' }
    ]
  },
  {
    group: 'custody',
    label: 'العهدة والمصروفات',
    description: 'إدارة العهدة المالية وتغذية الأرصدة والمصروفات',
    permissions: [
      { key: 'custody.view', label: 'عرض العهدة', description: 'عرض رصيد العهدة وسجلات المصروفات اليومية' },
      { key: 'custody.add', label: 'إضافة رصيد ومصروف', description: 'إضافة مبالغ للعهدة وتسجيل بنود المصروفات' },
      { key: 'custody.delete', label: 'حذف المصروفات', description: 'حذف سجلات وحركات العهدة والمصروفات' }
    ]
  },
  {
    group: 'fleet',
    label: 'إدارة الأسطول والمركبات',
    description: 'التحكم في المركبات، الزيوت، الوقود، المخالفات وطلبات الصيانة',
    permissions: [
      { key: 'vehicles.view', label: 'عرض المركبات والدبابات', description: 'استعراض قائمة أسطول المركبات والدبابات وحالتها' },
      { key: 'vehicles.manage', label: 'إدارة المركبات', description: 'إضافة وتعديل وحذف المركبات والدبابات' },
      { key: 'vehicles.oil', label: 'سجلات غيار الزيت', description: 'تسجيل وتصفير غيار الزيت ومتابعة الكيلومترات' },
      { key: 'fuel.view', label: 'عرض سجلات الوقود', description: 'الاطلاع على فواتير وسجلات تعبئة الوقود' },
      { key: 'fuel.manage', label: 'إدارة سجلات الوقود', description: 'إضافة وتعديل وحذف فواتير الوقود' },
      { key: 'violations.view', label: 'عرض المخالفات', description: 'الاطلاع على المخالفات المرورية المسجلة' },
      { key: 'violations.manage', label: 'إدارة المخالفات', description: 'تسجيل وتعديل وحذف المخالفات المرورية' },
      { key: 'maintenance.view', label: 'عرض طلبات الصيانة', description: 'متابعة طلبات صيانة وإصلاح المركبات' },
      { key: 'maintenance.manage', label: 'إدارة طلبات الصيانة', description: 'إنشاء وتحديث وإغلاق طلبات الصيانة' }
    ]
  },
  {
    group: 'hr_documents',
    label: 'الموارد البشرية والمستندات',
    description: 'المستندات، الحسابات البنكية، الإجازات، الحضور والشكاوى',
    permissions: [
      { key: 'documents.view', label: 'عرض المستندات والرخص', description: 'الاطلاع على مستندات الموظفين وتنبيهات الانتهاء' },
      { key: 'documents.manage', label: 'إدارة المستندات', description: 'رفع وتجديد وتعديل وثائق ورخص الموظفين' },
      { key: 'bank_accounts.view', label: 'عرض الحسابات البنكية', description: 'الاطلاع على الآيبان والحسابات البنكية للمناديب' },
      { key: 'bank_accounts.manage', label: 'إدارة الحسابات البنكية', description: 'إضافة وتعديل الحسابات البنكية للمناديب' },
      { key: 'leaves.view', label: 'عرض الإجازات', description: 'الاطلاع على طلبات إجازات الموظفين' },
      { key: 'leaves.manage', label: 'إدارة واعتماد الإجازات', description: 'تقديم وقبول ورفض طلبات الإجازات' },
      { key: 'attendance.view', label: 'الحضور والانصراف', description: 'تسجيل ومتابعة كشف حضور وغياب الموظفين' },
      { key: 'tickets.view', label: 'عرض تذاكر الدعم والشكاوى', description: 'الاطلاع على الشكاوى وطلبات الدعم للمناديب' },
      { key: 'tickets.manage', label: 'إدارة التذاكر', description: 'فتح وتحديث ومتابعة وإغلاق تذاكر الدعم' }
    ]
  },
  {
    group: 'reports',
    label: 'التقارير والإحصائيات',
    description: 'التقارير اليومية وتقارير الشفتات وتصدير البيانات',
    permissions: [
      { key: 'reports.view', label: 'عرض التقارير', description: 'عرض تقارير الشفتات والتقرير اليومي وإحصائيات العمل' },
      { key: 'reports.export', label: 'تصدير التقارير Excel', description: 'تصدير التقارير اليومية إلى ملفات إكسل' }
    ]
  },
  {
    group: 'investigations',
    label: 'الاستجوابات والتحقيقات',
    description: 'طلبات السلف والخصومات وإثبات الغياب والتحقيقات',
    permissions: [
      { key: 'investigations.view', label: 'عرض التحقيقات', description: 'الاطلاع على التحقيقات والاستجوابات والسلف والغياب' },
      { key: 'investigations.create', label: 'إنشاء طلب / استجواب', description: 'إنشاء استجواب جديد أو طلب سلفة أو إثبات غياب' },
      { key: 'investigations.approve', label: 'اعتماد وقبول التحقيقات', description: 'الموافقة على أو رفض الإجراءات والخصومات' }
    ]
  },
  {
    group: 'inventory',
    label: 'المخزون والقطع',
    description: 'إدارة أصناف المخزن، كميات الزيوت وقطع الغيار',
    permissions: [
      { key: 'inventory.view', label: 'عرض المخزون', description: 'استعراض أصناف المخزون والكميات الحالية' },
      { key: 'inventory.manage', label: 'إدارة المخزون والأصناف', description: 'إضافة وتعديل أصناف وتوريد كميات جديدة' },
      { key: 'inventory.dispense', label: 'صرف الزيوت والقطع', description: 'تسجيل عمليات صرف الزيوت وقطع الغيار' }
    ]
  },
  {
    group: 'partners',
    label: 'منصات الشركاء',
    description: 'إدارة منصات وتطبيقات التوصيل الشريكة',
    permissions: [
      { key: 'partners.view', label: 'عرض الشركاء', description: 'الاطلاع على منصات وتطبيقات التوصيل الشريكة' },
      { key: 'partners.manage', label: 'إدارة الشركاء', description: 'إضافة وتعديل وحذف منصات التوصيل' }
    ]
  },
  {
    group: 'admin',
    label: 'الإدارة والنظام',
    description: 'إدارة المستخدمين، الأدوار، الإعدادات وسجلات النظام',
    permissions: [
      { key: 'users.manage', label: 'إدارة المستخدمين', description: 'إضافة وتعديل وحذف مستخدمي لوحة التحكم' },
      { key: 'roles.manage', label: 'إدارة الأدوار والصلاحيات', description: 'إنشاء وتعديل الأدوار والصلاحيات وتوزيعها' },
      { key: 'settings.manage', label: 'إعدادات النظام العامة', description: 'تعديل اسم النظام والشعار وإعدادات التطبيق' },
      { key: 'audit_logs.view', label: 'سجل العمليات والنشاط', description: 'الاطلاع على سجلات العمليات والتدقيق في النظام' },
      { key: 'error_logs.view', label: 'سجل أخطاء النظام', description: 'الاطلاع على سجل الأخطاء التقنية' }
    ]
  }
];

/**
 * Check if a user has a specific permission
 */
export function hasPermission(permission?: string, user?: Admin | null): boolean {
  if (!permission) return true;
  const current = user ?? getAdminUser();
  if (!current) return false;

  const roleUpper = (current.role || '').toUpperCase();
  if (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN') {
    return true;
  }

  const perms = current.permissions || [];
  if (perms.includes('*')) {
    return true;
  }

  return perms.includes(permission);
}

/**
 * Check if a user has ANY of the given permissions
 */
export function hasAnyPermission(permissions?: string[], user?: Admin | null): boolean {
  if (!permissions || permissions.length === 0) return true;
  const current = user ?? getAdminUser();
  if (!current) return false;

  const roleUpper = (current.role || '').toUpperCase();
  if (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN') {
    return true;
  }

  const perms = current.permissions || [];
  if (perms.includes('*')) {
    return true;
  }

  return permissions.some((p) => perms.includes(p));
}

/**
 * Check if a user has ALL of the given permissions
 */
export function hasAllPermissions(permissions?: string[], user?: Admin | null): boolean {
  if (!permissions || permissions.length === 0) return true;
  const current = user ?? getAdminUser();
  if (!current) return false;

  const roleUpper = (current.role || '').toUpperCase();
  if (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN') {
    return true;
  }

  const perms = current.permissions || [];
  if (perms.includes('*')) {
    return true;
  }

  return permissions.every((p) => perms.includes(p));
}
