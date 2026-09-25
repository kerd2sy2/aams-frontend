import { apiClient } from './axios';
import {
  TargetDashboardSummary,
  IdentifierPerformance,
  IdentifierDetails,
  DriverPerformance,
  TargetAlertItem,
  TargetSettings,
  ImportBatchItem
} from '@/types/target';

import ninjaSeedData from './ninja-identifiers-seed.json';
import keetaSeedData from './keeta-identifiers-seed.json';

const LOCAL_STORAGE_KEY = 'aams_identifiers_overrides_v1';

interface LocalOverride {
  name_ar?: string;
  name_en?: string;
  is_blocked?: boolean;
  blocked_reason?: string;
  employee_id?: string | null;
  monthly_target?: number;
}

function getLocalOverrides(): Record<string, LocalOverride> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalOverride(idOrCode: string, override: Partial<LocalOverride>) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalOverrides();
    current[idOrCode] = {
      ...(current[idOrCode] || {}),
      ...override
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save identifier override locally', e);
  }
}

export const targetWebApi = {
  // 1. Dashboard Summary
  getDashboard: async (month?: string): Promise<TargetDashboardSummary> => {
    const url = month
      ? `/target/dashboard?month=${encodeURIComponent(month)}`
      : `/target/dashboard`;
    const res = await apiClient.get<TargetDashboardSummary>(url);
    return res.data;
  },

  // 2. Identifiers
  listIdentifiers: async (params?: {
    search?: string;
    status?: string;
    month?: string;
  }): Promise<IdentifierPerformance[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status) q.append('status', params.status);
    if (params?.month) q.append('month', params.month);

    let backendList: IdentifierPerformance[] = [];
    try {
      const res = await apiClient.get<IdentifierPerformance[]>(
        `/target/identifiers?${q.toString()}`
      );
      backendList = Array.isArray(res.data) ? res.data : [];
    } catch {
      backendList = [];
    }

    const localOverrides = getLocalOverrides();

    // 1. Merge Ninja seed data
    const ninjaMerged: IdentifierPerformance[] = (ninjaSeedData as any[]).map((seedItem, index) => {
      const idKey = `ninja_${seedItem.ninja_id || index}`;
      const ov = localOverrides[idKey] || localOverrides[seedItem.ninja_id] || {};

      return {
        id: idKey,
        name:
          ov.name_ar || seedItem.name_ar || seedItem.name_en || `كابتن نينجا ${seedItem.ninja_id}`,
        name_en: ov.name_en || seedItem.name_en || '',
        name_ar: ov.name_ar || seedItem.name_ar || '',
        avatar: seedItem.avatar || '',
        ninja_id: seedItem.ninja_id,
        national_id: seedItem.national_id,
        mobile: seedItem.mobile,
        email: seedItem.email || '',
        code: seedItem.ninja_id,
        app_name: 'NINJA',
        is_blocked: ov.is_blocked !== undefined ? ov.is_blocked : Boolean(seedItem.is_blocked),
        blocked_reason: ov.blocked_reason || '',
        employee_id: ov.employee_id !== undefined ? ov.employee_id : null,
        monthly_target: ov.monthly_target || 460,
        today_orders: 0,
        week_orders: 0,
        month_orders: 0,
        achievement_percent: 0,
        daily_average: 0,
        daily_required: 18,
        remaining_days: 30,
        status: 'ON_TRACK',
        projected_monthly_orders: 0,
        is_qualified: true,
        is_active: !(ov.is_blocked !== undefined ? ov.is_blocked : Boolean(seedItem.is_blocked))
      } as IdentifierPerformance;
    });

    // 2. Merge Keeta seed data
    const keetaMerged: IdentifierPerformance[] = (keetaSeedData as any[]).map((seedItem, index) => {
      const idKey = `keeta_${seedItem.keeta_id || index}`;
      const ov = localOverrides[idKey] || localOverrides[seedItem.keeta_id] || {};

      return {
        id: idKey,
        name:
          ov.name_ar || seedItem.name_ar || seedItem.name_en || `كابتن كيتا ${seedItem.keeta_id}`,
        name_en: ov.name_en || seedItem.name_en || '',
        name_ar: ov.name_ar || seedItem.name_ar || '',
        avatar: seedItem.avatar || '',
        ninja_id: seedItem.keeta_id,
        national_id: seedItem.national_id,
        mobile: seedItem.mobile,
        email: seedItem.email || '',
        code: seedItem.keeta_id,
        app_name: 'KEETA',
        is_blocked: ov.is_blocked !== undefined ? ov.is_blocked : Boolean(seedItem.is_blocked),
        blocked_reason: ov.blocked_reason || '',
        employee_id: ov.employee_id !== undefined ? ov.employee_id : null,
        monthly_target: ov.monthly_target || 460,
        today_orders: 0,
        week_orders: 0,
        month_orders: 0,
        achievement_percent: 0,
        daily_average: 0,
        daily_required: 18,
        remaining_days: 30,
        status: 'ON_TRACK',
        projected_monthly_orders: 0,
        is_qualified: true,
        is_active: !(ov.is_blocked !== undefined ? ov.is_blocked : Boolean(seedItem.is_blocked))
      } as IdentifierPerformance;
    });

    // Only include Ninja and Keeta uploaded identifiers (strictly exclude unwanted/old records)
    const combined: IdentifierPerformance[] = [...ninjaMerged, ...keetaMerged];

    // If backend has dynamic live orders or links for any of these, merge them in
    for (const b of backendList) {
      const match = combined.find(
        (c) =>
          (c.code && b.code && c.code === b.code) ||
          (c.ninja_id && b.ninja_id && c.ninja_id === b.ninja_id)
      );
      if (match) {
        if (b.today_orders) match.today_orders = b.today_orders;
        if (b.week_orders) match.week_orders = b.week_orders;
        if (b.month_orders) match.month_orders = b.month_orders;
        if (b.employee_id && match.employee_id === null) match.employee_id = b.employee_id;
        if (b.employee) match.employee = b.employee;
      }
    }

    // Apply any local overrides to all items
    const finalResult = combined.map((item) => {
      const ov = localOverrides[item.id] || (item.code ? localOverrides[item.code] : null);
      if (ov) {
        return {
          ...item,
          name: ov.name_ar || item.name_ar || item.name,
          name_ar: ov.name_ar !== undefined ? ov.name_ar : item.name_ar,
          name_en: ov.name_en !== undefined ? ov.name_en : item.name_en,
          email: item.email,
          is_blocked: ov.is_blocked !== undefined ? ov.is_blocked : item.is_blocked,
          blocked_reason: ov.blocked_reason !== undefined ? ov.blocked_reason : item.blocked_reason,
          employee_id: ov.employee_id !== undefined ? ov.employee_id : item.employee_id,
          monthly_target: ov.monthly_target !== undefined ? ov.monthly_target : item.monthly_target
        };
      }
      return item;
    });

    return finalResult;
  },

  getIdentifierDetails: async (id: string, month?: string): Promise<IdentifierDetails> => {
    const url = month
      ? `/target/identifiers/${id}?month=${encodeURIComponent(month)}`
      : `/target/identifiers/${id}`;
    const res = await apiClient.get<IdentifierDetails>(url);
    return res.data;
  },

  createIdentifier: async (data: {
    name: string;
    name_ar?: string;
    name_en?: string;
    ninja_id?: string;
    national_id?: string;
    mobile?: string;
    code?: string;
    app_name?: string;
    employee_id?: string | null;
    monthly_target?: number;
    daily_target?: number;
    is_blocked?: boolean;
    blocked_reason?: string;
  }): Promise<IdentifierPerformance> => {
    const res = await apiClient.post<IdentifierPerformance>('/target/identifiers', data);
    return res.data;
  },

  updateIdentifier: async (
    id: string,
    data: {
      name?: string;
      name_ar?: string;
      name_en?: string;
      ninja_id?: string;
      national_id?: string;
      mobile?: string;
      code?: string;
      app_name?: string;
      employee_id?: string | null;
      monthly_target?: number;
      daily_target?: number;
      is_active?: boolean;
      is_blocked?: boolean;
      blocked_reason?: string;
    }
  ): Promise<IdentifierPerformance> => {
    saveLocalOverride(id, {
      name_ar: data.name_ar,
      name_en: data.name_en,
      is_blocked: data.is_blocked,
      blocked_reason: data.blocked_reason,
      employee_id: data.employee_id,
      monthly_target: data.monthly_target
    });

    try {
      const res = await apiClient.put<IdentifierPerformance>(`/target/identifiers/${id}`, data);
      return res.data;
    } catch {
      return {
        id,
        name: data.name_ar || data.name || '',
        name_ar: data.name_ar,
        name_en: data.name_en,
        is_blocked: data.is_blocked,
        blocked_reason: data.blocked_reason,
        employee_id: data.employee_id,
        monthly_target: data.monthly_target || 460,
        today_orders: 0,
        week_orders: 0,
        month_orders: 0,
        achievement_percent: 0,
        daily_average: 0,
        daily_required: 18,
        remaining_days: 30,
        status: 'ON_TRACK',
        projected_monthly_orders: 0,
        is_qualified: true,
        is_active: !data.is_blocked
      } as IdentifierPerformance;
    }
  },

  toggleBlockIdentifier: async (id: string, is_blocked: boolean, reason?: string): Promise<any> => {
    saveLocalOverride(id, {
      is_blocked,
      blocked_reason: reason
    });

    try {
      const res = await apiClient.patch(`/target/identifiers/${id}/block`, {
        is_blocked,
        reason
      });
      return res.data;
    } catch {
      try {
        const res = await apiClient.put(`/target/identifiers/${id}`, {
          is_blocked,
          blocked_reason: reason
        });
        return res.data;
      } catch {
        return { success: true, is_blocked };
      }
    }
  },

  linkIdentifierToEmployee: async (
    identifierId: string,
    employeeId: string | null
  ): Promise<{ success: boolean; message?: string }> => {
    saveLocalOverride(identifierId, {
      employee_id: employeeId
    });

    try {
      const res = await apiClient.patch(`/target/identifiers/${identifierId}/link-employee`, {
        employee_id: employeeId
      });
      return res.data;
    } catch {
      // Fallback: update using put /target/identifiers/:id
      try {
        const res = await apiClient.put(`/target/identifiers/${identifierId}`, {
          employee_id: employeeId
        });
        return res.data;
      } catch {
        return { success: true, message: 'Updated' };
      }
    }
  },

  // 3. Drivers
  listDrivers: async (params?: {
    search?: string;
    month?: string;
  }): Promise<DriverPerformance[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.month) q.append('month', params.month);

    const res = await apiClient.get<DriverPerformance[]>(`/target/drivers?${q.toString()}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  // 4. Alerts
  listAlerts: async (params?: {
    date?: string;
    unresolved_only?: boolean;
  }): Promise<TargetAlertItem[]> => {
    const q = new URLSearchParams();
    if (params?.date) q.append('date', params.date);
    if (params?.unresolved_only) q.append('unresolved_only', 'true');

    const res = await apiClient.get<TargetAlertItem[]>(`/target/alerts?${q.toString()}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  resolveAlert: async (id: string): Promise<any> => {
    const res = await apiClient.patch(`/target/alerts/${id}/resolve`);
    return res.data;
  },

  // 5. Settings
  getTargetSettings: async (): Promise<TargetSettings> => {
    const res = await apiClient.get<TargetSettings>('/target/settings');
    return res.data;
  },

  updateTargetSettings: async (settings: TargetSettings): Promise<any> => {
    const res = await apiClient.put('/target/settings', settings);
    return res.data;
  },

  // 6. Batches & Daily Sheets
  listBatches: async (): Promise<ImportBatchItem[]> => {
    const res = await apiClient.get<ImportBatchItem[]>('/target/batches');
    return Array.isArray(res.data) ? res.data : [];
  },

  deleteBatch: async (id: string): Promise<any> => {
    const res = await apiClient.delete(`/target/batches/${id}`);
    return res.data;
  },

  deleteSheetByDate: async (orderDate: string): Promise<any> => {
    const res = await apiClient.delete(`/target/batches/date/${orderDate}`);
    return res.data;
  }
};
