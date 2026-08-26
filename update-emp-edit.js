const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/employees/[id]/edit/page.tsx', 'utf8');

// Change references to 'المناديب' to 'الموظفين' and 'مندوب' to 'موظف'
content = content.replace(/المناديب/g, "الموظفين");
content = content.replace(/المندوبين/g, "الموظفين");
content = content.replace(/مندوب/g, "موظف");
content = content.replace(/المندوب/g, "الموظف");

// Add state variables
content = content.replace("const [shift, setShift] = useState('morning');", "const [shift, setShift] = useState('morning');\n  const [jobRole, setJobRole] = useState('DRIVER');\n  const [iqamaExpirationDate, setIqamaExpirationDate] = useState('');");

// Update useEffect to populate new fields
content = content.replace("setShift(emp.shift || 'morning');", "setShift(emp.shift || 'morning');\n        setJobRole(emp.job_role || 'DRIVER');\n        setIqamaExpirationDate(emp.iqama_expiration_date || '');");

// Add fields to payload
content = content.replace("employee_number: employeeNumber,", "job_role: jobRole,\n        iqama_expiration_date: iqamaExpirationDate || undefined,\n        employee_number: employeeNumber,");

// Add UI fields
const uiAddition = `
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="iqama_expiration_date">تاريخ انتهاء الإقامة / الهوية</Label>
                  <Input
                    id="iqama_expiration_date"
                    type="date"
                    value={iqamaExpirationDate}
                    onChange={(e) => setIqamaExpirationDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="job_role">الوظيفة <span className="text-destructive">*</span></Label>
                  <select
                    id="job_role"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="DRIVER">مندوب</option>
                    <option value="SUPERVISOR">مشرف</option>
                    <option value="MANAGEMENT">إدارة</option>
                    <option value="WORKER">عامل</option>
                  </select>
                </div>
              </div>
`;

content = content.replace('<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">\n                <div className="space-y-2">\n                  <Label htmlFor="employee_number">', uiAddition + '\n              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">\n                <div className="space-y-2">\n                  <Label htmlFor="employee_number">');


fs.writeFileSync('src/app/dashboard/employees/[id]/edit/page.tsx', content, 'utf8');
