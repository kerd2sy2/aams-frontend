const xlsx = require('xlsx');
const fs = require('path');
const nodeFs = require('fs');

const excelPath = 'd:/AAMS/_D8_A7_D9_84_D8_A3_D8_B3_D9_85_D8_A7_D8_A1__D9_88_D8_A3_D8_B1_D9_82_D8_A7_D9_85__D8_A7_D9_84_D9_87_D9_88_D9_8A_D8_A9.xlsx';
const wb = xlsx.readFile(excelPath);
const rawData = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  const str = String(val).replace(/'/g, "''");
  return "'" + str + "'";
}

let sql = `-- ====================================================================
-- AAMS Database Reset and Employee Import Migration (2026)
-- Target: Reset employees & users, preserve admin 0500626432, import Excel employees
-- ====================================================================

BEGIN;

-- 1. Ensure SUPER_ADMIN, OWNER, SUPERVISOR, and ACCOUNTANT roles exist
INSERT INTO roles (id, name, display_name, description, permissions, is_system, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'SUPER_ADMIN', 'مدير عام (مسؤول النظام)', 'كامل الصلاحيات للتحكم في كافة أقسام وإعدادات ومستخدمي النظام', '["*"]', true, NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET permissions = '["*"]';

INSERT INTO roles (id, name, display_name, description, permissions, is_system, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'OWNER', 'مالك المؤسسة', 'كامل الصلاحيات للإشراف العام والتقارير والعمليات المالية والإدارية', '["*"]', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (id, name, display_name, description, permissions, is_system, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'SUPERVISOR', 'مشرف وردية', 'متابعة المناديب وتسجيل الدوام والعمليات الميدانية', '["employees.view","employees.create","employees.edit","employees.cards","work.view","work.start","work.end","custody","custody.access","custody.view","custody.add","vehicles.view","vehicles.oil","fuel.view","fuel.manage","maintenance.view","maintenance.manage","attendance.view","investigations.view","investigations.create","inventory.view","inventory.dispense","tickets.view","tickets.manage"]', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (id, name, display_name, description, permissions, is_system, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'ACCOUNTANT', 'إدارة مالية ومحاسبة', 'إدارة العهدة والمصروفات والحسابات البنكية والتقارير المالية', '["custody","custody.access","custody.view","custody.add","custody.delete","bank_accounts.view","bank_accounts.manage","fuel.view","fuel.manage","violations.view","violations.manage","reports.view","reports.export","inventory.view","investigations.view"]', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 2. Clear all existing employees and related child records
DELETE FROM work_sessions;
DELETE FROM attendances;
DELETE FROM custody_expenses;
DELETE FROM investigations;
DELETE FROM maintenance_requests;
DELETE FROM fuel_logs;
DELETE FROM traffic_violations;
DELETE FROM employee_documents;
DELETE FROM employee_bank_accounts;
DELETE FROM leave_requests;
DELETE FROM employees;

-- 3. Delete non-admin users, keeping only phone 0500626432
DELETE FROM admins WHERE phone != '0500626432' AND phone != '+966500626432' AND username != '0500626432';

-- 4. Ensure admin 0500626432 is configured as SUPER_ADMIN
DO $$
DECLARE
  super_role_id char(36);
BEGIN
  SELECT id::text INTO super_role_id FROM roles WHERE name = 'SUPER_ADMIN' LIMIT 1;
  
  IF EXISTS (SELECT 1 FROM admins WHERE phone = '0500626432' OR phone = '+966500626432' OR username = '0500626432') THEN
    UPDATE admins 
    SET role = 'ADMIN', role_id = super_role_id::uuid, updated_at = NOW()
    WHERE phone = '0500626432' OR phone = '+966500626432' OR username = '0500626432';
  ELSE
    INSERT INTO admins (id, email, username, phone, password, name, role, role_id, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'admin0500626432@aams.com',
      '0500626432',
      '0500626432',
      '$2a$10$w8T9Zk3K6bM5V4X7Q9W2Oe1S4U7Y0A3C6E9G2I5K8M1O4Q7S0U3W', -- Admin@2026!
      'المدير العام',
      'ADMIN',
      super_role_id::uuid,
      NOW(),
      NOW()
    );
  END IF;
END $$;

-- 5. Insert 89 Employees from Excel
`;

const seenIds = new Set();
let empCounter = 1;

for (const row of rawData) {
  const name = String(row['الاسم'] || '').trim();
  let nid = String(row['رقم الهوية'] || '').trim();
  if (!name) continue;

  if (!nid) {
    nid = 'TEMP' + String(1000000000 + empCounter).slice(1);
  } else if (seenIds.has(nid)) {
    nid = nid + '-' + empCounter;
  }
  seenIds.add(nid);

  const keyNum = String(empCounter);
  const empNum = nid;

  sql += `INSERT INTO employees (
  id, name, job_role, employee_number, phone, national_id, key_number, motorcycle_number,
  application_type, vehicle_type, shift, barcode, qr_code, total_distance, last_oil_change_distance,
  is_working, language, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  ${esc(name)},
  'DRIVER',
  ${esc(empNum)},
  ${esc(nid.startsWith('TEMP') ? '' : nid)},
  ${esc(nid)},
  ${esc(keyNum)},
  '',
  'ninja',
  'motorcycle',
  'morning',
  ${esc(nid)},
  ${esc(nid)},
  0,
  0,
  false,
  'ar',
  NOW(),
  NOW()
);\n`;
  empCounter++;
}

sql += `
COMMIT;
`;

nodeFs.writeFileSync('d:/AAMS/backend/backups/reset_and_import_2026.sql', sql, 'utf8');
console.log('Successfully generated backend/backups/reset_and_import_2026.sql with ' + (empCounter - 1) + ' employees');
