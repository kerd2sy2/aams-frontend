const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/employees/new/page.tsx', 'utf8');

// Replace PageContainer with Sheet
content = content.replace("export default function NewEmployeePage() {", "import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';\n\nexport function AddEmployeeSheet({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {");

content = content.replace("<PageContainer>", "<Sheet open={open} onOpenChange={onOpenChange}>\n      <SheetContent side='right' className='w-full sm:max-w-2xl overflow-y-auto p-0' dir='rtl'>\n        <div className='p-6 space-y-6 max-w-4xl mx-auto'>");

content = content.replace("</PageContainer>", "        </div>\n      </SheetContent>\n    </Sheet>");

content = content.replace(/<PageHeader[\s\S]*?\/>/, "<SheetHeader className='mb-4 space-y-2 text-right border-b pb-4'>\n            <SheetTitle className='text-2xl font-bold'>إضافة موظف جديد</SheetTitle>\n            <SheetDescription>تسجيل بيانات الموظف، الهوية، وتوليد البطاقة الذكية</SheetDescription>\n          </SheetHeader>");

content = content.replace(/router\.back\(\)/g, "onOpenChange(false)");
content = content.replace(/router\.push\('\/dashboard\/employees'\)/g, "onOpenChange(false)");

content = content.replace(/اسم المندوب الرباعي/g, "اسم الموظف الرباعي");
content = content.replace(/حفظ المندوب/g, "حفظ الموظف");
content = content.replace(/ملف الموظف `\$\{newEmp\.name\}` وتوليد الـ Barcode/g, "ملف الموظف `${newEmp.name}` وتوليد الـ Barcode");

// Add state variables
content = content.replace("const [shift, setShift] = useState('morning');", "const [shift, setShift] = useState('morning');\n  const [jobRole, setJobRole] = useState('DRIVER');\n  const [iqamaExpirationDate, setIqamaExpirationDate] = useState('');");

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


fs.writeFileSync('src/components/employees/add-employee-sheet.tsx', content, 'utf8');
