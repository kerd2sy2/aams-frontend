'use client';

import { apiClient } from './axios';
import type {
  Admin,
  Employee,
  WorkSession,
  DashboardResponse,
  PaginatedResponse,
  WorkSessionDetail,
  AuditLog,
  DailyReportResponse,
  InventoryItem,
  InventoryTransaction,
  PurchaseInvoice,
  PurchaseInvoiceItem,
  MaintenanceLog,
  OilChangeCheck,
  InvestigationResponse,
  AttendanceInfo,
  AttendanceResponse,
  Branch,
  CustodyDay,
  CustodyLog,
  AppSettings,
  Vehicle,
  FuelLog,
  TrafficViolation,
  MaintenanceRequest,
  EmployeeDocument,
  EmployeeBankAccount,
  LeaveRequest,
  SupportTicket,
  Role,
  PermissionGroup,
  ArchivedItem,
  ArchiveResponse,
  ArchiveType,
  OTPRequest,
  OTPListResponse
} from '@/types/aams';

// Auth API
export const authApi = {
  login: async (login: string, password: string) => {
    const res = await apiClient.post<{
      access_token: string;
      refresh_token: string;
      admin: Admin;
    }>('/login', { login, password });
    return res.data;
  },
  googleLogin: async (data: { email: string; google_id?: string; token?: string }) => {
    const res = await apiClient.post<{
      access_token: string;
      refresh_token: string;
      admin: Admin;
    }>('/auth/google/login', data);
    return res.data;
  },
  linkGoogle: async (data: { email: string; google_id?: string; avatar?: string }) => {
    const res = await apiClient.post<{
      message: string;
      google_email: string;
      google_avatar?: string;
      is_google_linked: boolean;
    }>('/auth/google/link', data);
    return res.data;
  },
  unlinkGoogle: async () => {
    const res = await apiClient.post<{
      message: string;
      is_google_linked: boolean;
    }>('/auth/google/unlink');
    return res.data;
  },
  me: async () => {
    const res = await apiClient.get<Admin>('/me');
    return res.data;
  },
  changePassword: async (data: { old_password: string; new_password: string }) => {
    const res = await apiClient.post<{ message: string }>('/users/change-password', data);
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('admin_user');
  }
};

// Employee API
export const employeeApi = {
  getAll: async (params?: {
    search?: string;
    application_id?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    order?: string;
  }) => {
    const res = await apiClient.get<PaginatedResponse<Employee>>('/employees', { params });
    return res.data;
  },
  search: async (q: string) => {
    const res = await apiClient.get<Employee[]>('/employees/search', { params: { q } });
    return res.data;
  },
  getWorking: async () => {
    const res = await apiClient.get<{ data: Employee[]; total: number }>('/employees/working');
    return res.data;
  },
  getById: async (id: string) => {
    const res = await apiClient.get<Employee>(`/employees/${id}`);
    return res.data;
  },
  create: async (data: Partial<Employee>) => {
    const res = await apiClient.post<Employee>('/employees', data);
    return res.data;
  },
  update: async (id: string, data: Partial<Employee>) => {
    const res = await apiClient.put<Employee>(`/employees/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/employees/${id}`);
    return res.data;
  },
  getPrintCard: async (id: string) => {
    const res = await apiClient.get<{
      employee: Employee;
      barcode: string;
      qr_code: string;
    }>(`/employees/${id}/print-card`);
    return res.data;
  },
  uploadImage: async (file: File, category = 'personal') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    const res = await apiClient.post<{ url: string }>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url;
  },

  uploadFile: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<{ url: string }>('/upload-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url;
  }
};

// Work Session API
export const workApi = {
  startWork: async (
    employee_id: string,
    start_km: number,
    application_id?: string,
    application_type?: string,
    vehicle_type?: string,
    motorcycle_number?: string,
    notes?: string
  ) => {
    const res = await apiClient.post<WorkSession>('/work/start', {
      employee_id,
      start_km,
      application_id,
      application_type,
      vehicle_type,
      motorcycle_number,
      notes
    });
    return res.data;
  },
  endWork: async (data: {
    employee_id: string;
    end_km: number;
    orders_count: number;
    fuel_cost: number;
    application_id?: string;
    application_type?: string;
    notes?: string;
  }) => {
    const res = await apiClient.post<WorkSession>('/work/end', data);
    return res.data;
  },
  getActiveSession: async (employee_id: string) => {
    const res = await apiClient.get<WorkSession>('/work/active', {
      params: { employee_id }
    });
    return res.data;
  },
  getLastKM: async (employee_id?: string, motorcycle_number?: string) => {
    const res = await apiClient.get<{ last_end_km: number; last_start_km: number }>(
      '/work/last-km',
      {
        params: {
          employee_id: employee_id || undefined,
          motorcycle_number: motorcycle_number || undefined
        }
      }
    );
    return res.data;
  },
  getTodayCount: async (employee_id: string) => {
    const res = await apiClient.get<{ today_count: number }>('/work/today-count', {
      params: { employee_id }
    });
    return res.data;
  },
  updateWorkSession: async (
    sessionId: string,
    data: {
      employee_id?: string;
      start_km?: number;
      start_km_image?: string;
      end_km: number;
      end_km_image?: string;
      orders_count: number;
      fuel_cost: number;
      start_time?: string;
      end_time?: string;
    }
  ) => {
    const res = await apiClient.put<WorkSession>(`/work/${sessionId}`, data);
    return res.data;
  },
  reviewWorkSession: async (
    sessionId: string,
    data: {
      is_reviewed: boolean;
      review_notes?: string;
      orders_count?: number;
      start_km?: number;
      end_km?: number;
      fuel_cost?: number;
    }
  ) => {
    const res = await apiClient.put<WorkSession>(`/work/${sessionId}/review`, data);
    return res.data;
  },
  getSessionById: async (sessionId: string) => {
    const res = await apiClient.get<WorkSession>(`/work/sessions/${sessionId}`);
    return res.data;
  },
  checkOilChange: async (employee_id: string) => {
    const res = await apiClient.get<OilChangeCheck>('/work/check-oil', {
      params: { employee_id }
    });
    return res.data;
  }
};

// Dashboard & Analytics API
export const dashboardApi = {
  getStats: async () => {
    const res = await apiClient.get<DashboardResponse>('/dashboard');
    return res.data;
  }
};

// Reports API
export const reportApi = {
  getReports: async (params?: {
    start_date?: string;
    end_date?: string;
    employee_id?: string;
    application_id?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<{
      data: WorkSessionDetail[];
      total: number;
      page: number;
      limit: number;
    }>('/reports', { params });
    return res.data;
  },
  getDailyReport: async (date?: string) => {
    const res = await apiClient.get<DailyReportResponse>('/reports/daily', {
      params: date ? { date } : undefined
    });
    return res.data;
  }
};

// Audit Log API
export const auditApi = {
  getLogs: async (page = 1, limit = 20) => {
    const res = await apiClient.get<{
      data: AuditLog[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }>('/audit-logs', { params: { page, limit } });
    return res.data;
  },
  deleteLog: async (id: string) => {
    const res = await apiClient.delete<{ message: string }>(`/audit-logs/${id}`);
    return res.data;
  },
  bulkDeleteLogs: async (ids: string[]) => {
    const res = await apiClient.delete<{ message: string }>('/audit-logs/bulk', {
      data: { ids }
    });
    return res.data;
  },
  clearAllLogs: async () => {
    const res = await apiClient.delete<{ message: string }>('/audit-logs/clear');
    return res.data;
  }
};

// Admin Management API
export const adminApi = {
  getAll: async () => {
    const res = await apiClient.get<Admin[]>('/users');
    return res.data;
  },
  create: async (data: {
    name: string;
    email: string;
    username: string;
    phone?: string;
    password: string;
    role?: string;
    role_id?: string;
    permissions?: string[];
    branch_id?: string;
  }) => {
    const res = await apiClient.post<Admin>('/users', data);
    return res.data;
  },
  update: async (
    id: string,
    data: {
      name?: string;
      email?: string;
      username?: string;
      phone?: string;
      password?: string;
      role?: string;
      role_id?: string;
      permissions?: string[];
      branch_id?: string;
    }
  ) => {
    const res = await apiClient.put<Admin>(`/users/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/users/${id}`);
    return res.data;
  }
};

// Roles & Permissions API
export const roleApi = {
  getAll: async () => {
    const res = await apiClient.get<Role[]>('/roles');
    return res.data;
  },
  getByID: async (id: string) => {
    const res = await apiClient.get<Role>(`/roles/${id}`);
    return res.data;
  },
  create: async (data: {
    name: string;
    display_name: string;
    description?: string;
    permissions: string[];
  }) => {
    const res = await apiClient.post<Role>('/roles', data);
    return res.data;
  },
  update: async (
    id: string,
    data: {
      display_name?: string;
      description?: string;
      permissions?: string[];
    }
  ) => {
    const res = await apiClient.put<Role>(`/roles/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete<{ message: string }>(`/roles/${id}`);
    return res.data;
  },
  getPermissions: async () => {
    const res = await apiClient.get<PermissionGroup[]>('/permissions');
    return res.data;
  }
};

// Inventory API
export const inventoryApi = {
  getItems: async (type?: string) => {
    const res = await apiClient.get<InventoryItem[]>('/inventory/items', {
      params: type ? { type } : undefined
    });
    return res.data;
  },
  getItemById: async (id: string) => {
    const res = await apiClient.get<InventoryItem>(`/inventory/items/${id}`);
    return res.data;
  },
  findByBarcode: async (barcode: string) => {
    const res = await apiClient.get<InventoryItem>('/inventory/barcode', {
      params: { barcode }
    });
    return res.data;
  },
  createItem: async (data: {
    name: string;
    type: string;
    unit?: string;
    barcode?: string;
    quantity: number;
    min_alert?: number;
    notes?: string;
  }) => {
    const res = await apiClient.post<InventoryItem>('/inventory/items', data);
    return res.data;
  },
  updateItem: async (id: string, data: Partial<InventoryItem>) => {
    const res = await apiClient.put<InventoryItem>(`/inventory/items/${id}`, data);
    return res.data;
  },
  deleteItem: async (id: string) => {
    const res = await apiClient.delete(`/inventory/items/${id}`);
    return res.data;
  },
  addStock: async (data: { item_id: string; type: string; quantity: number; notes?: string }) => {
    const res = await apiClient.post<InventoryTransaction>('/inventory/add-stock', data);
    return res.data;
  },
  removeStock: async (data: {
    item_id: string;
    type: string;
    quantity: number;
    employee_id?: string;
    notes?: string;
  }) => {
    const res = await apiClient.post<InventoryTransaction>('/inventory/remove-stock', data);
    return res.data;
  },
  dispenseOil: async (data: { employee_id: string; quantity: number; notes?: string }) => {
    const res = await apiClient.post<MaintenanceLog>('/inventory/dispense-oil', data);
    return res.data;
  },
  getTransactions: async (params?: { item_id?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get<{
      data: InventoryTransaction[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }>('/inventory/transactions', { params });
    return res.data;
  },
  getPurchases: async (params?: { search?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get<{
      data: PurchaseInvoice[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }>('/inventory/purchases', { params });
    return res.data;
  },
  getPurchaseById: async (id: string) => {
    const res = await apiClient.get<PurchaseInvoice>(`/inventory/purchases/${id}`);
    return res.data;
  },
  createPurchase: async (data: {
    invoice_number?: string;
    supplier_name: string;
    invoice_date?: string;
    subtotal?: number;
    discount?: number;
    tax_rate?: number;
    tax_amount?: number;
    total_amount?: number;
    notes?: string;
    items: {
      item_id: string;
      quantity: number;
      unit_price: number;
      notes?: string;
    }[];
  }) => {
    const res = await apiClient.post<PurchaseInvoice>('/inventory/purchases', data);
    return res.data;
  },
  deletePurchase: async (id: string) => {
    const res = await apiClient.delete(`/inventory/purchases/${id}`);
    return res.data;
  }
};

// Maintenance API
export const maintenanceApi = {
  getEmployeeLogs: async (employee_id: string, limit = 20) => {
    const res = await apiClient.get<MaintenanceLog[]>('/maintenance/employee-logs', {
      params: { employee_id, limit }
    });
    return res.data;
  },
  getAllLogs: async (page = 1, limit = 20) => {
    const res = await apiClient.get<{
      data: MaintenanceLog[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }>('/maintenance/logs', { params: { page, limit } });
    return res.data;
  }
};

// Investigation API
export const investigationApi = {
  create: async (data: {
    employee_id: string;
    type?: string;
    questions?: string[];
    answers?: string[];
    report_text?: string;
    images?: string[];
    amount?: number | null;
    start_date?: string;
    end_date?: string;
    items?: string[];
    is_guilty?: boolean;
    notes?: string;
    deduction_month?: string;
  }) => {
    const res = await apiClient.post<InvestigationResponse>('/investigations', data);
    return res.data;
  },
  update: async (
    id: string,
    data: {
      employee_id: string;
      type?: string;
      questions?: string[];
      answers?: string[];
      report_text?: string;
      images?: string[];
      amount?: number | null;
      start_date?: string;
      end_date?: string;
      items?: string[];
      is_guilty?: boolean;
      notes?: string;
      deduction_month?: string;
    }
  ) => {
    const res = await apiClient.put<InvestigationResponse>(`/investigations/${id}`, data);
    return res.data;
  },
  getPublicById: async (id: string) => {
    const res = await apiClient.get<InvestigationResponse>(`/public/doc/${id}`);
    return res.data;
  },
  getAll: async () => {
    const res = await apiClient.get<InvestigationResponse[]>('/investigations');
    return res.data;
  },
  approve: async (id: string) => {
    const res = await apiClient.post<InvestigationResponse>(`/investigations/${id}/approve`);
    return res.data;
  },
  reject: async (id: string) => {
    const res = await apiClient.post<InvestigationResponse>(`/investigations/${id}/reject`);
    return res.data;
  },
  pendingCount: async () => {
    const res = await apiClient.get<{ count: number }>('/investigations/pending-count');
    return res.data;
  }
};

// Attendance API
export const attendanceApi = {
  getAttendance: async (date: string) => {
    const res = await apiClient.get<AttendanceResponse>('/attendance', { params: { date } });
    return res.data;
  },
  toggle: async (employeeId: string, date: string, status: string, note?: string) => {
    const res = await apiClient.post<{ data: AttendanceInfo }>(`/attendance/${employeeId}`, {
      date,
      status,
      note
    });
    return res.data;
  }
};

// Branch API
export const branchApi = {
  getAll: async () => {
    const res = await apiClient.get<Branch[]>('/branches');
    return res.data;
  },
  create: async (name: string) => {
    const res = await apiClient.post<Branch>('/branches', { name });
    return res.data;
  },
  update: async (id: string, name: string) => {
    const res = await apiClient.put<Branch>(`/branches/${id}`, { name });
    return res.data;
  },
  remove: async (id: string) => {
    const res = await apiClient.delete(`/branches/${id}`);
    return res.data;
  }
};

// Settings API
export const settingsApi = {
  get: async () => {
    const res = await apiClient.get<AppSettings>('/settings');
    return res.data;
  },
  getPublic: async () => {
    const res = await apiClient.get<AppSettings>('/settings/public');
    return res.data;
  },
  update: async (data: Partial<AppSettings>) => {
    const res = await apiClient.put<{ message: string }>('/settings', data);
    return res.data;
  }
};

// Custody API (العهدة)
export const custodyApi = {
  list: async (branchId?: string) => {
    const res = await apiClient.get<CustodyDay[]>('/custody', {
      params: branchId ? { branch_id: branchId } : undefined
    });
    return res.data;
  },
  create: async (data: { date: string; added_amount: number; branch_id?: string }) => {
    const res = await apiClient.post<CustodyDay>('/custody', data);
    return res.data;
  },
  addAmount: async (data: { custody_day_id: string; added_amount: number; branch_id?: string }) => {
    const res = await apiClient.post<CustodyDay>('/custody/add-amount', data);
    return res.data;
  },
  addExpense: async (
    dayId: string,
    data: { category: string; amount: number; recipient_name?: string }
  ) => {
    const res = await apiClient.post<CustodyDay>(`/custody/${dayId}/expenses`, data);
    return res.data;
  },
  deleteExpense: async (expenseId: string) => {
    const res = await apiClient.delete<CustodyDay>(`/custody/expenses/${expenseId}`);
    return res.data;
  },
  getLogs: async (params?: {
    branch_id?: string;
    date?: string;
    start_date?: string;
    end_date?: string;
    action_type?: string;
    created_by?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<{
      data: CustodyLog[];
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    }>('/custody/logs', { params });
    return res.data;
  },
  deleteLog: async (logId: string) => {
    const res = await apiClient.delete<{ message: string }>(`/custody/logs/${logId}`);
    return res.data;
  }
};

// Vehicle Management API (الدبابات والمركبات)
export const vehicleApi = {
  getAll: async (params?: {
    branch_id?: string;
    vehicle_type?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<{
      data: Vehicle[];
      total: number;
      page: number;
      limit: number;
    }>('/vehicles', { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await apiClient.get<Vehicle>(`/vehicles/${id}`);
    return res.data;
  },
  create: async (data: Partial<Vehicle>) => {
    const res = await apiClient.post<Vehicle>('/vehicles', data);
    return res.data;
  },
  update: async (id: string, data: Partial<Vehicle>) => {
    const res = await apiClient.put<Vehicle>(`/vehicles/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/vehicles/${id}`);
    return res.data;
  },
  checkKm: async (plate: string) => {
    const res = await apiClient.get<{ plate_number: string; current_km: number }>(
      '/vehicles/check-km',
      {
        params: { plate }
      }
    );
    return res.data;
  },
  recordOilChange: async (id: string) => {
    const res = await apiClient.post<{ message: string }>(`/vehicles/${id}/oil-change`);
    return res.data;
  }
};

// 1. Fuel Log API (سجلات الوقود)
export const fuelLogApi = {
  getAll: async (params?: {
    branch_id?: string;
    employee_id?: string;
    plate?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<{
      data: FuelLog[];
      total: number;
      total_cost: number;
      total_liters: number;
      total_count: number;
      page: number;
      limit: number;
    }>('/fuel-logs', { params });
    return res.data;
  },
  create: async (data: Partial<FuelLog>) => {
    const res = await apiClient.post<FuelLog>('/fuel-logs', data);
    return res.data;
  },
  update: async (id: string, data: Partial<FuelLog>) => {
    const res = await apiClient.put<FuelLog>(`/fuel-logs/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/fuel-logs/${id}`);
    return res.data;
  }
};

// 2. Traffic Violation API (المخالفات المرورية)
export const violationApi = {
  getAll: async (params?: {
    branch_id?: string;
    employee_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<{
      data: TrafficViolation[];
      total: number;
      total_amount: number;
      deducted_amount: number;
      total_count: number;
      page: number;
      limit: number;
    }>('/violations', { params });
    return res.data;
  },
  create: async (data: Partial<TrafficViolation>) => {
    const res = await apiClient.post<TrafficViolation>('/violations', data);
    return res.data;
  },
  update: async (id: string, data: Partial<TrafficViolation>) => {
    const res = await apiClient.put<TrafficViolation>(`/violations/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/violations/${id}`);
    return res.data;
  }
};

// 3. Maintenance Request API (طلبات الصيانة)
export const maintenanceRequestApi = {
  getAll: async (params?: {
    branch_id?: string;
    plate?: string;
    priority?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<{
      data: MaintenanceRequest[];
      total: number;
      page: number;
      limit: number;
    }>('/maintenance-requests', { params });
    return res.data;
  },
  create: async (data: Partial<MaintenanceRequest>) => {
    const res = await apiClient.post<MaintenanceRequest>('/maintenance-requests', data);
    return res.data;
  },
  update: async (id: string, data: Partial<MaintenanceRequest>) => {
    const res = await apiClient.put<MaintenanceRequest>(`/maintenance-requests/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/maintenance-requests/${id}`);
    return res.data;
  }
};

// 4. Employee Document API (المستندات والرخص)
export const documentApi = {
  getAll: async (params?: {
    employee_id?: string;
    doc_type?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<{
      data: EmployeeDocument[];
      total: number;
      page: number;
      limit: number;
    }>('/documents', { params });
    return res.data;
  },
  getExpiringSoon: async () => {
    const res = await apiClient.get<{
      data: EmployeeDocument[];
      total: number;
    }>('/documents/expiring');
    return res.data;
  },
  create: async (data: Partial<EmployeeDocument>) => {
    const res = await apiClient.post<EmployeeDocument>('/documents', data);
    return res.data;
  },
  update: async (id: string, data: Partial<EmployeeDocument>) => {
    const res = await apiClient.put<EmployeeDocument>(`/documents/${id}`, data);
    return res.data;
  },
  getById: async (id: string) => {
    const res = await apiClient.get<EmployeeDocument>(`/documents/${id}`);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/documents/${id}`);
    return res.data;
  }
};

// 5. Employee Bank Account API (الحسابات البنكية)
export const bankAccountApi = {
  getAll: async (params?: {
    employee_id?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<{
      data: EmployeeBankAccount[];
      total: number;
      page: number;
      limit: number;
    }>('/bank-accounts', { params });
    return res.data;
  },
  create: async (data: Partial<EmployeeBankAccount>) => {
    const res = await apiClient.post<EmployeeBankAccount>('/bank-accounts', data);
    return res.data;
  },
  update: async (id: string, data: Partial<EmployeeBankAccount>) => {
    const res = await apiClient.put<EmployeeBankAccount>(`/bank-accounts/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/bank-accounts/${id}`);
    return res.data;
  }
};

// 6. Leave Request API (طلبات الإجازات)
export const leaveApi = {
  getAll: async (params?: {
    employee_id?: string;
    status?: string;
    leave_type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<{
      data: LeaveRequest[];
      total: number;
      page: number;
      limit: number;
    }>('/leaves', { params });
    return res.data;
  },
  create: async (data: Partial<LeaveRequest>) => {
    const res = await apiClient.post<LeaveRequest>('/leaves', data);
    return res.data;
  },
  updateStatus: async (id: string, status: string, approvedByName?: string) => {
    const res = await apiClient.put<LeaveRequest>(`/leaves/${id}/status`, {
      status,
      approved_by_name: approvedByName
    });
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/leaves/${id}`);
    return res.data;
  }
};

// 7. Support Ticket API (تذاكر الدعم والشكاوى)
export const ticketApi = {
  getAll: async (params?: {
    branch_id?: string;
    employee_id?: string;
    category?: string;
    priority?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<{
      data: SupportTicket[];
      total: number;
      page: number;
      limit: number;
    }>('/tickets', { params });
    return res.data;
  },
  create: async (data: Partial<SupportTicket>) => {
    const res = await apiClient.post<SupportTicket>('/tickets', data);
    return res.data;
  },
  update: async (id: string, data: Partial<SupportTicket>) => {
    const res = await apiClient.put<SupportTicket>(`/tickets/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/tickets/${id}`);
    return res.data;
  }
};

export interface NotificationResponse {
  id: string;
  title: string;
  body: string;
  type: string;
  status: string;
  created_at: string;
}

export const notificationApi = {
  getAll: async (params?: { status?: string }) => {
    const res = await apiClient.get<NotificationResponse[]>('/notifications', { params });
    return res.data;
  },
  markAsRead: async (id: string) => {
    const res = await apiClient.put(`/notifications/${id}/read`);
    return res.data;
  },
  markAllAsRead: async () => {
    const res = await apiClient.put(`/notifications/read-all`);
    return res.data;
  }
};

// Archive & Trash API (الأرشيف وسلة المحذوفات)
export const archiveApi = {
  getArchived: async (params?: {
    type?: string;
    search?: string;
    branch_id?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<ArchiveResponse>('/archive', { params });
    return res.data;
  },
  restore: async (type: string, id: string) => {
    const res = await apiClient.post<{ message: string }>('/archive/restore', { type, id });
    return res.data;
  },
  permanentDelete: async (type: string, id: string) => {
    const res = await apiClient.delete<{ message: string }>('/archive/permanent', {
      params: { type, id }
    });
    return res.data;
  },
  bulkRestore: async (type: string, ids: string[]) => {
    const res = await apiClient.post<{ message: string }>('/archive/restore-bulk', { type, ids });
    return res.data;
  },
  bulkPermanentDelete: async (type: string, ids: string[]) => {
    const res = await apiClient.delete<{ message: string }>('/archive/permanent-bulk', {
      data: { type, ids }
    });
    return res.data;
  }
};

// OTP Verification API (رموز التحقق وتوثيق الأجهزة)
export const otpApi = {
  getOTPList: async (params?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const res = await apiClient.get<OTPListResponse>('/otp-requests', { params });
    return res.data;
  },
  cancel: async (id: string) => {
    const res = await apiClient.post<{ message: string }>(`/otp-requests/${id}/cancel`);
    return res.data;
  }
};
