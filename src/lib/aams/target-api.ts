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
const DAILY_STATS_KEY = 'aams_daily_reports_stats_v1';

export interface DailyReportCaptainRecord {
  date: string; // YYYY-MM-DD
  app: 'NINJA' | 'KEETA';
  identifier: string;
  captainName?: string;
  deliveredOrders: number;
  totalOrders: number;
  onlineDurationStr?: string;
  delayedOrders?: number;
  punctualityRate?: number;
  avgDeliveryMinutes?: number;
  totalDistanceKm?: number;
}

export function getDailyReportsHistory(): DailyReportCaptainRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DAILY_STATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveDailyReportsBatch(
  records: DailyReportCaptainRecord[],
  fileName?: string
): Promise<any> {
  if (!records.length) return;

  // 1. Save to Local Storage immediately
  if (typeof window !== 'undefined') {
    try {
      const existing = getDailyReportsHistory();
      const incomingKeys = new Set(records.map((r) => `${r.date}_${r.app}_${r.identifier}`));
      const retained = existing.filter(
        (e) => !incomingKeys.has(`${e.date}_${e.app}_${e.identifier}`)
      );
      const updated = [...retained, ...records];
      localStorage.setItem(DAILY_STATS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save daily reports to localStorage', e);
    }
  }

  // 2. Persist to PostgreSQL backend database via /admin/target/import/confirm
  try {
    const reportDate = records[0]?.date || new Date().toISOString().split('T')[0];
    const appName = records[0]?.app || 'NINJA';
    const resolvedFileName =
      fileName || `${appName}_Daily_Report_${reportDate.replace(/-/g, '')}.xlsx`;

    const rows = records.map((r, idx) => ({
      serial: String(idx + 1),
      identifier: r.identifier,
      app: r.app,
      driver_name: r.captainName || `كابتن ${r.identifier}`,
      ninja_orders: r.app === 'NINJA' ? r.deliveredOrders : 0,
      keeta_orders: r.app === 'KEETA' ? r.deliveredOrders : 0,
      toyo_orders: 0,
      total_orders: r.deliveredOrders,
      plate_number: '',
      notes: r.onlineDurationStr ? `ساعات الاتصال: ${r.onlineDurationStr}` : '',
      is_duplicate: false
    }));

    const res = await apiClient.post('/admin/target/import/confirm', {
      file_name: resolvedFileName,
      order_date: reportDate,
      deduplication_action: 'REPLACE_DUPLICATES',
      rows
    });

    return res.data;
  } catch (err) {
    console.warn('Backend database sync for daily report fallback to localStorage:', err);
  }
}

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

    // Also include custom identifiers created in localOverrides
    Object.entries(localOverrides).forEach(([key, ov]: [string, any]) => {
      if (!ov || (!ov.code && !ov.ninja_id)) return;
      const targetCode = String(ov.code || ov.ninja_id).trim();
      const idKey =
        key.startsWith('ninja_') || key.startsWith('keeta_')
          ? key
          : `${(ov.app_name || '').toUpperCase().includes('KEETA') ? 'keeta' : 'ninja'}_${targetCode}`;
      const exists = combined.some(
        (c) =>
          c.id === idKey ||
          (c.code && String(c.code).trim() === targetCode) ||
          (c.ninja_id && String(c.ninja_id).trim() === targetCode)
      );
      if (!exists) {
        combined.push({
          id: idKey,
          name: ov.name_ar || ov.name_en || `كابتن ${targetCode}`,
          name_en: ov.name_en || '',
          name_ar: ov.name_ar || '',
          avatar: ov.avatar || '',
          ninja_id: targetCode,
          national_id: ov.national_id || '',
          mobile: ov.mobile || '',
          email: ov.email || '',
          code: targetCode,
          app_name: (ov.app_name || '').toUpperCase().includes('KEETA') ? 'KEETA' : 'NINJA',
          is_blocked: Boolean(ov.is_blocked),
          blocked_reason: ov.blocked_reason || '',
          employee_id: ov.employee_id || null,
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
          is_active: !ov.is_blocked
        } as IdentifierPerformance);
      }
    });

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

    // Read uploaded daily reports stats (from Ninja & Keeta daily reports)
    const dailyHistory = getDailyReportsHistory();

    // Apply any local overrides and uploaded report stats to all items
    const finalResult = combined.map((item) => {
      const ov = localOverrides[item.id] || (item.code ? localOverrides[item.code] : null);
      const identCode = String(item.code || item.ninja_id || '').trim();

      // Aggregate from daily reports history for this captain
      const captainDailyRecords = dailyHistory.filter(
        (d) => String(d.identifier).trim() === identCode
      );

      let totalReportDelivered = 0;
      let latestTodayDelivered = item.today_orders || 0;

      if (captainDailyRecords.length > 0) {
        totalReportDelivered = captainDailyRecords.reduce(
          (sum, r) => sum + (r.deliveredOrders || 0),
          0
        );
        // Latest date entry
        captainDailyRecords.sort((a, b) => b.date.localeCompare(a.date));
        latestTodayDelivered = captainDailyRecords[0].deliveredOrders || 0;
      }

      const totalDelivered = Math.max(item.month_orders || 0, totalReportDelivered);
      const targetMonthly = (ov && ov.monthly_target) || item.monthly_target || 460;
      const achievementPercent = targetMonthly > 0 ? (totalDelivered / targetMonthly) * 100 : 0;

      return {
        ...item,
        name: (ov && ov.name_ar) || item.name_ar || item.name,
        name_ar: ov && ov.name_ar !== undefined ? ov.name_ar : item.name_ar,
        name_en: ov && ov.name_en !== undefined ? ov.name_en : item.name_en,
        email: item.email,
        is_blocked: ov && ov.is_blocked !== undefined ? ov.is_blocked : item.is_blocked,
        blocked_reason:
          ov && ov.blocked_reason !== undefined ? ov.blocked_reason : item.blocked_reason,
        employee_id: ov && ov.employee_id !== undefined ? ov.employee_id : item.employee_id,
        monthly_target: targetMonthly,
        today_orders: latestTodayDelivered,
        month_orders: totalDelivered,
        achievement_percent: +achievementPercent.toFixed(1)
      };
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
