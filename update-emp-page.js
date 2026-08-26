const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/employees/page.tsx', 'utf8');

// Add import
content = content.replace("import { EmployeeAvatar } from '@/components/employees/employee-avatar';", "import { EmployeeAvatar } from '@/components/employees/employee-avatar';\nimport { AddEmployeeSheet } from '@/components/employees/add-employee-sheet';");
if (!content.includes('AddEmployeeSheet')) {
    content = content.replace("import { Employee } from '@/types/aams';", "import { Employee } from '@/types/aams';\nimport { AddEmployeeSheet } from '@/components/employees/add-employee-sheet';");
}
if (!content.includes('AddEmployeeSheet')) {
    content = content.replace("import PageContainer from '@/components/layout/page-container';", "import PageContainer from '@/components/layout/page-container';\nimport { AddEmployeeSheet } from '@/components/employees/add-employee-sheet';");
}

// Add state
content = content.replace("const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);", "const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);\n  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);");
if (!content.includes('isAddSheetOpen')) {
    content = content.replace("const [page, setPage] = useState(1);", "const [page, setPage] = useState(1);\n  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);");
}

// Change the add button
content = content.replace(/<Link href='\/dashboard\/employees\/new' className=\{cn\(buttonVariants\(\{ variant: 'default', size: 'sm' \}\)\)\}>\s*<Icons\.add className='me-1\.5 size-4' \/>\s*.*?<\/Link>/, "<Button onClick={() => setIsAddSheetOpen(true)} size='sm'>\n                <Icons.add className='me-1.5 size-4' />\n                إضافة موظف\n              </Button>");

// Inject the sheet component before </PageContainer>
content = content.replace("</PageContainer>", "  <AddEmployeeSheet open={isAddSheetOpen} onOpenChange={(open) => {\n        setIsAddSheetOpen(open);\n        if (!open) refetch();\n      }} />\n    </PageContainer>");

// Change references to 'المناديب' to 'الموظفين' and 'مندوب' to 'موظف'
content = content.replace(/المناديب/g, "الموظفين");
content = content.replace(/المندوبين/g, "الموظفين");
content = content.replace(/مندوب/g, "موظف");

// Also add a table head for JobRole if possible, but let's just use existing ones for now, or replace one. 
// We will replace "البطاقة" or "الجوال" maybe? No, let's just insert الوظيفة.
content = content.replace("<TableHead className='text-center'>الاسم</TableHead>", "<TableHead className='text-center'>الاسم</TableHead>\n                    <TableHead className='text-center'>الوظيفة</TableHead>");
content = content.replace(/<TableCell className='text-center'>\s*<div className='flex items-center justify-center gap-3'>([\s\S]*?)<\/TableCell>/, "<TableCell className='text-center'>\n                          <div className='flex items-center justify-center gap-3'></TableCell>\n\n                        {/* الوظيفة */}\n                        <TableCell className='text-center font-semibold text-sm'>\n                          {emp.job_role === 'SUPERVISOR' ? 'مشرف' : emp.job_role === 'MANAGEMENT' ? 'إدارة' : emp.job_role === 'WORKER' ? 'عامل' : 'مندوب'}\n                        </TableCell>");

fs.writeFileSync('src/app/dashboard/employees/page.tsx', content, 'utf8');
