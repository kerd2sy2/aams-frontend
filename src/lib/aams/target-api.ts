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

    const res = await apiClient.get<IdentifierPerformance[]>(`/target/identifiers?${q.toString()}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  getIdentifierDetails: async (id: string, month?: string): Promise<IdentifierDetails> => {
    const url = month
      ? `/target/identifiers/${id}?month=${encodeURIComponent(month)}`
      : `/target/identifiers/${id}`;
    const res = await apiClient.get<IdentifierDetails>(url);
    return res.data;
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
