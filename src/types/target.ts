export interface ParsedExcelRow {
  serial: string;
  identifier: string;
  app: string;
  driver_name: string;
  ninja_orders: number;
  keeta_orders: number;
  toyo_orders: number;
  total_orders: number;
  plate_number: string;
  notes: string;
  is_duplicate: boolean;
  existing_count?: number;
}

export interface ExcelImportPreview {
  file_name: string;
  order_date: string;
  total_rows: number;
  total_orders: number;
  identifiers_count: number;
  identifiers: string[];
  drivers_count: number;
  drivers: string[];
  duplicates_count: number;
  has_duplicates: boolean;
  rows: ParsedExcelRow[];
}

export interface ConfirmImportResponse {
  batch_id: string;
  imported_orders_count: number;
  skipped_count: number;
  replaced_count: number;
  total_orders: number;
  message: string;
}

export interface IdentifierPerformance {
  id: string;
  name: string;
  code?: string;
  today_orders: number;
  week_orders: number;
  month_orders: number;
  monthly_target: number;
  daily_target?: number;
  achievement_percent: number;
  daily_average: number;
  daily_required: number;
  remaining_days: number;
  status: 'TARGET_ACHIEVED' | 'ON_TRACK' | 'AT_RISK' | 'BEHIND_TARGET';
  projected_monthly_orders: number;
  estimated_achievement_date?: string;
  is_qualified: boolean;
  is_active: boolean;
}

export interface DriverContribution {
  driver_id: string;
  driver_name: string;
  orders: number;
  percentage: number;
}

export interface DayTrend {
  date: string;
  day: number;
  orders: number;
  target: number;
}

export interface IdentifierDetails {
  performance: IdentifierPerformance;
  drivers_breakdown: DriverContribution[];
  apps_breakdown: Record<string, number>;
  daily_timeline: DayTrend[];
  active_drivers_count: number;
}

export interface DriverPerformance {
  id: string;
  name: string;
  phone?: string;
  month_orders: number;
  today_orders: number;
  identifiers: string[];
  apps: string[];
}

export interface TargetAlertItem {
  id: string;
  identifier_id: string;
  identifier_name: string;
  alert_date: string;
  target_orders: number;
  actual_orders: number;
  deficit: number;
  is_resolved: boolean;
  created_at: string;
}

export interface TargetDashboardSummary {
  total_identifiers: number;
  target_achieved: number;
  on_track: number;
  at_risk: number;
  behind_target: number;
  total_month_orders: number;
  today_total_orders: number;
  daily_trend: DayTrend[];
  top_identifiers: IdentifierPerformance[];
  recent_alerts: TargetAlertItem[];
  current_month: string;
  days_elapsed: number;
  total_days_in_month: number;
  remaining_days: number;
}

export interface TargetSettings {
  default_monthly_target: number;
  default_daily_target: number;
}

export interface ImportBatchItem {
  id: string;
  file_name: string;
  order_date: string;
  uploaded_by: string;
  uploaded_by_name: string;
  total_rows: number;
  total_orders: number;
  identifiers_count: number;
  drivers_count: number;
  status: string;
  created_at: string;
}
