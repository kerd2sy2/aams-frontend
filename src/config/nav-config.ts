import { NavGroup } from '@/types';

/**
 * AAMS navigation — نظام متابعة المندوبين وإدارة الأسطول
 */
export const navGroups: NavGroup[] = [
  {
    items: [
      // 1. لوحة التحكم
      { title: 'Dashboard', url: '/dashboard', icon: 'dashboard' },

      // 2. الدوام
      {
        title: 'Work',
        url: '#',
        icon: 'play',
        items: [
          { title: 'Start Work', url: '/dashboard/work/start', permission: 'work.start' },
          { title: 'End Work', url: '/dashboard/work/end', permission: 'work.end' },
          { title: 'Odometer Audits', url: '/dashboard/odometer-audits', permission: 'work.view' }
        ]
      },

      // حالة الموظفين
      {
        title: 'Employee Status',
        url: '#',
        icon: 'userCheck',
        permission: 'work.view',
        items: [
          { title: 'Working Now', url: '/dashboard/employees/working', permission: 'work.view' },
          {
            title: 'Finished Today',
            url: '/dashboard/employees/finished',
            permission: 'work.view'
          },
          { title: "Today's Shifts", url: '/dashboard/employees/today', permission: 'work.view' },
          { title: 'OTP Verifications', url: '/dashboard/otp', permission: 'work.view' }
        ]
      },

      // 3. محاضر الموظفين
      {
        title: 'Investigations',
        url: '#',
        icon: 'clipboardList',
        permissions: ['investigations.view', 'investigations.create', 'investigations.approve'],
        items: [
          {
            title: 'Approvals',
            url: '/dashboard/investigation/approvals',
            permission: 'investigations.approve'
          },
          {
            title: 'Supervisor Report',
            url: '/dashboard/investigation/supervisor_report',
            permission: 'investigations.create'
          },
          {
            title: 'Advance',
            url: '/dashboard/investigation/advance',
            permission: 'investigations.create'
          },
          {
            title: 'Internet Advance',
            url: '/dashboard/investigation/internet_advance',
            permission: 'investigations.create'
          },
          {
            title: 'Absence',
            url: '/dashboard/investigation/absence',
            permission: 'investigations.create'
          },
          {
            title: 'Custody Receipt',
            url: '/dashboard/investigation/custody',
            permission: 'investigations.create'
          }
        ]
      },

      // 4. التقارير
      {
        title: 'Reports',
        url: '#',
        icon: 'chartBar',
        permission: 'reports.view',
        items: [
          { title: 'Shift Report', url: '/dashboard/reports', permission: 'reports.view' },
          { title: 'Daily Report', url: '/dashboard/daily-report', permission: 'reports.view' },
          { title: 'Attendance', url: '/dashboard/attendance', permission: 'attendance.view' }
        ]
      },

      // 5. العهدة
      {
        title: 'Custody',
        url: '#',
        icon: 'wallet',
        permission: 'custody.view',
        items: [
          { title: 'Overview', url: '/dashboard/custody', permission: 'custody.view' },
          { title: 'Logs', url: '/dashboard/custody/logs', permission: 'custody.view' }
        ]
      },

      // 6. الأسطول
      {
        title: 'Fleet Management',
        url: '#',
        icon: 'bike',
        items: [
          { title: 'Vehicles', url: '/dashboard/vehicles', permission: 'vehicles.view' },
          { title: 'Violations', url: '/dashboard/violations', permission: 'violations.view' },
          {
            title: 'Maintenance Requests',
            url: '/dashboard/maintenance-requests',
            permission: 'maintenance.view'
          }
        ]
      },

      // 7. الموظفين
      {
        title: 'Employees',
        url: '#',
        icon: 'employees',
        permission: 'employees.view',
        items: [
          { title: 'All Employees', url: '/dashboard/employees', permission: 'employees.view' },
          {
            title: 'Print ID Cards',
            url: '/dashboard/employees/cards',
            permission: 'employees.view'
          }
        ]
      },

      // 8. الإجازات
      { title: 'Leaves', url: '/dashboard/leaves', icon: 'leaves', permission: 'leaves.view' },

      // 9. المخزن
      {
        title: 'Inventory',
        url: '#',
        icon: 'inventory',
        permission: 'inventory.view',
        items: [
          { title: 'Inventory', url: '/dashboard/inventory', permission: 'inventory.view' },
          {
            title: 'Oil Dispense',
            url: '/dashboard/oil-dispense',
            permission: 'inventory.dispense'
          },
          { title: 'Oil Setup', url: '/dashboard/oil-setup', permission: 'inventory.manage' }
        ]
      },

      // 10. المستندات والمالية
      {
        title: 'Documents & Banking',
        url: '#',
        icon: 'fileCertificate',
        items: [
          { title: 'Documents', url: '/dashboard/documents', permission: 'documents.view' },
          {
            title: 'Bank Accounts',
            url: '/dashboard/bank-accounts',
            permission: 'bank_accounts.view'
          }
        ]
      },

      // 11. الإدارة
      {
        title: 'Administration',
        url: '#',
        icon: 'shield',
        items: [
          { title: 'Users', url: '/dashboard/users', permission: 'users.manage' },
          { title: 'Roles & Permissions', url: '/dashboard/roles', permission: 'roles.manage' },
          { title: 'Settings', url: '/dashboard/settings', permission: 'settings.manage' },
          { title: 'Archive & Trash', url: '/dashboard/archive', permission: 'archive.view' },
          { title: 'Audit Logs', url: '/dashboard/audit-logs', permission: 'audit_logs.view' },
          { title: 'Error Logs', url: '/dashboard/errors', permission: 'error_logs.view' }
        ]
      }
    ]
  }
];
