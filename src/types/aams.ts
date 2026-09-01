// AAMS domain types — shared across features.

export interface PermissionItem {
  key: string;
  label: string;
  description: string;
}

export interface PermissionGroup {
  group: string;
  label: string;
  description?: string;
  permissions: PermissionItem[];
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  permissions: string[];
  is_system: boolean;
  users_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  role: string;
  role_id?: string | null;
  role_obj?: Role | null;
  google_email?: string;
  google_avatar?: string;
  is_google_linked?: boolean;
  permissions?: string[];
  permissions_list?: string[];
  branch_id?: string | null;
  branch?: { id: string; name: string } | null;
}

export interface Employee {
  id: string;
  name: string;
  job_role: string;
  employee_number: string;
  personal_image: string;
  national_id: string;
  iqama_expiration_date?: string | null;
  national_id_image: string;
  driving_license_image: string;
  key_number: string;
  motorcycle_number: string;
  application_id: string;
  application_type?: string;
  vehicle_type?: string;
  shift?: string;
  total_distance: number;
  last_oil_change_distance: number;
  branch_id?: string | null;
  branch?: { id: string; name: string } | null;
  barcode: string;
  qr_code: string;
  created_at: string;
  updated_at: string;
}

export interface WorkSession {
  id: string;
  employee_id: string;
  employee?: Employee;
  start_time: string;
  end_time?: string;
  start_km: number;
  start_km_image?: string;
  end_km: number;
  end_km_image?: string;
  distance: number;
  orders_count: number;
  fuel_cost: number;
  application_id: string;
  application_type?: string;
  motorcycle_number?: string;
  is_reviewed?: boolean;
  review_notes?: string;
  reviewed_by?: string;
  is_edited_by_supervisor?: boolean;
  edited_by_name?: string;
  original_orders_count?: number;
  original_end_km?: number;
  original_start_km?: number;
  notes: string;
  status: 'ACTIVE' | 'COMPLETED';
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  admin_name: string;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
}

export interface AttendanceInfo {
  employee_id: string;
  employee_name: string;
  national_id: string;
  branch_name: string;
  vehicle_type: string;
  status: string;
  note: string;
  has_work_session: boolean;
  session_id: string | null;
  start_time: string | null;
  end_time: string | null;
}

export interface AttendanceResponse {
  date: string;
  data: AttendanceInfo[];
}

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface DashboardResponse {
  total_employees: number;
  today_employees: number;
  working_employees: number;
  finished_employees: number;
  today_orders: number;
  today_distance: number;
  today_fuel_cost: number;
  avg_working_hours: number;
  distance_chart: ChartDataPoint[];
  orders_chart: ChartDataPoint[];
  fuel_cost_chart: ChartDataPoint[];
  latest_activities: AuditLog[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages?: number;
}

export interface WorkSessionDetail {
  id: string;
  employee_id: string;
  employee_name: string;
  employee?: Employee;
  personal_image?: string;
  national_id: string;
  branch_name?: string;
  start_time: string;
  end_time?: string;
  working_duration: string;
  start_km: number;
  start_km_image?: string;
  end_km: number;
  end_km_image?: string;
  distance: number;
  orders_count: number;
  fuel_cost: number;
  application_id: string;
  application_type?: string;
  motorcycle_number?: string;
  is_reviewed?: boolean;
  review_notes?: string;
  is_edited_by_supervisor?: boolean;
  edited_by_name?: string;
  original_orders_count?: number;
  original_end_km?: number;
  original_start_km?: number;
  notes: string;
  status: 'ACTIVE' | 'COMPLETED';
  created_at?: string;
  updated_at?: string;
}

export interface DailyReportEmployee {
  employee_id: string;
  employee_name: string;
  branch_name?: string;
  app_type: string;
  app_name: string;
  sessions_count: number;
  total_km: number;
  total_orders: number;
  total_fuel: number;
}

export interface DailyAppSummary {
  app_type: string;
  app_name: string;
  total_orders: number;
  total_km: number;
  total_fuel: number;
  count: number;
}

export interface DailyEmployeeRow {
  employee_id: string;
  employee_name: string;
  branch_name: string;
  app_type: string;
  app_name: string;
  sessions_count: number;
  total_km: number;
  total_orders: number;
  total_fuel: number;
}

export interface DailyReportResponse {
  rows: DailyEmployeeRow[];
  total_orders: number;
  total_km: number;
  total_fuel: number;
  app_summaries: DailyAppSummary[];
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'oil' | 'spare_part';
  unit: string;
  barcode?: string;
  quantity: number;
  min_alert: number;
  notes: string;
  branch_quantity?: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  item?: InventoryItem;
  type: 'in' | 'out';
  quantity: number;
  employee_id?: string | null;
  employee?: Employee | null;
  notes: string;
  created_at: string;
}

export interface PurchaseInvoiceItem {
  id: string;
  invoice_id: string;
  item_id: string;
  item?: InventoryItem;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  created_at?: string;
}

export interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  supplier_name: string;
  invoice_date: string;
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  branch_id?: string | null;
  branch?: Branch | null;
  created_by_name?: string;
  notes?: string;
  items?: PurchaseInvoiceItem[];
  created_at: string;
  updated_at?: string;
}

export interface MaintenanceLog {
  id: string;
  employee_id: string;
  employee?: Employee;
  type: 'oil_change' | 'spare_part';
  details: string;
  distance_at: number;
  cost: number;
  admin_name: string;
  created_at: string;
}

export interface OilChangeCheck {
  needs_oil_change: boolean;
  total_distance: number;
  distance_since_oil: number;
  oil_change_interval: number;
  vehicle_type: string;
}

export interface InvestigationResponse {
  id: string;
  employee_id: string;
  employee_name: string;
  national_id: string;
  supervisor_id: string;
  supervisor_name: string;
  type: string;
  questions: string[];
  answers: string[];
  report_text: string;
  images?: string[];
  amount: number | null;
  start_date: string | null;
  end_date: string | null;
  items: string[];
  is_guilty: boolean;
  notes: string;
  deduction_month?: string;
  status?: string;
  approved_by_name?: string;
  approved_by_username?: string;
  rejected_by_name?: string;
  rejected_by_username?: string;
  approved_at?: string | null;
  rejected_at?: string | null;
  created_at: string;
}

export interface Branch {
  id: string;
  name: string;
  employee_count?: number;
}

export interface AppSettings {
  site_name: string;
  logo_url: string;
}

export interface CustodyExpense {
  id: string;
  custody_day_id: string;
  category: 'fuel' | 'license' | 'spare_parts' | 'other';
  amount: number;
  recipient_name: string;
  created_at: string;
}

export interface CustodyTotals {
  fuel: number;
  license: number;
  spare_parts: number;
  other: number;
}

export interface CustodyDay {
  id: string;
  branch_id: string | null;
  branch_name: string;
  date: string;
  opening_balance: number;
  added_amount: number;
  custody_value: number;
  total_expenses: number;
  closing_balance: number;
  totals: CustodyTotals;
  expenses: CustodyExpense[];
  created_at: string;
}

export interface CustodyLog {
  id: string;
  branch_id: string | null;
  branch_name?: string;
  branch?: Branch | null;
  custody_day_id: string;
  date: string;
  action_type: string;
  category: string;
  amount: number;
  description: string;
  recipient_name?: string;
  admin_id?: string | null;
  admin_name: string;
  admin_username: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  vehicle_type?: 'motorcycle' | 'car' | string;
  type?: 'MOTORCYCLE' | 'CAR' | string;
  brand?: string;
  make?: string;
  model?: string;
  model_year?: string;
  year?: string | number;
  color?: string;
  key_number?: string;
  current_km: number;
  last_oil_change_km: number;
  total_distance: number;
  oil_interval_km?: number;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | string;
  branch_id?: string | null;
  branch?: Branch | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  needs_oil_change?: boolean;
  remaining_oil_km?: number;
  current_driver?: string | null;
}

export interface FuelLog {
  id: string;
  employee_id?: string | null;
  employee?: Employee | null;
  vehicle_plate: string;
  shift_id?: string | null;
  amount: number;
  liters: number;
  fuel_date: string;
  station_name: string;
  invoice_image_url?: string;
  branch_id?: string | null;
  branch?: Branch | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TrafficViolation {
  id: string;
  violation_number: string;
  employee_id?: string | null;
  employee?: Employee | null;
  vehicle_plate: string;
  amount: number;
  reason: string;
  violation_date: string;
  city?: string;
  status: 'RECORDED' | 'DEDUCTED' | 'DISPUTED' | 'PAID' | string;
  branch_id?: string | null;
  branch?: Branch | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRequest {
  id: string;
  vehicle_plate: string;
  employee_id?: string | null;
  employee?: Employee | null;
  issue_description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;
  estimated_cost: number;
  actual_cost: number;
  workshop_name?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | string;
  branch_id?: string | null;
  branch?: Branch | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  employee?: Employee | null;
  doc_type:
    | 'PROMISSORY_NOTE'
    | 'CONTRACT'
    | 'DRIVING_LICENSE'
    | 'VEHICLE_REGISTRATION'
    | 'CRIMINAL_RECORD'
    | 'MEDICAL_INSURANCE'
    | 'OTHER'
    | string;
  title: string;
  doc_number?: string;
  file_url?: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'PENDING_REVIEW' | string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeBankAccount {
  id: string;
  employee_id: string;
  employee?: Employee | null;
  bank_name: string;
  iban: string;
  account_owner_name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee?: Employee | null;
  leave_type: 'ANNUAL' | 'SICK' | 'EMERGENCY' | 'UNPAID' | string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  approved_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  employee_id?: string | null;
  employee?: Employee | null;
  subject: string;
  category: 'OPERATIONAL' | 'FINANCIAL' | 'VEHICLE' | 'APPLICATION' | 'OTHER' | string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | string;
  description: string;
  resolution?: string;
  branch_id?: string | null;
  branch?: Branch | null;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------
// Archive & Trash Types (سجل الأرشيف والمحذوفات)
// ------------------------------------------------------------------
export type ArchiveType =
  | 'all'
  | 'employees'
  | 'vehicles'
  | 'branches'
  | 'documents'
  | 'work_sessions'
  | 'leave_requests'
  | 'maintenance'
  | 'violations'
  | 'tickets';

export interface ArchivedItem {
  id: string;
  type:
    | 'employees'
    | 'vehicles'
    | 'branches'
    | 'documents'
    | 'work_sessions'
    | 'leave_requests'
    | 'maintenance'
    | 'violations'
    | 'tickets'
    | string;
  type_name: string;
  title: string;
  subtitle: string;
  details: string;
  branch_id?: string | null;
  branch_name?: string;
  archived_at: string;
  created_at: string;
}

export interface ArchiveStats {
  total_employees: number;
  total_vehicles: number;
  total_branches: number;
  total_documents: number;
  total_work_sessions: number;
  total_leaves: number;
  total_maintenance: number;
  total_violations: number;
  total_tickets: number;
  grand_total: number;
}

export interface ArchiveResponse {
  data: ArchivedItem[];
  stats: ArchiveStats;
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
