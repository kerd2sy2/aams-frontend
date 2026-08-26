const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/work/end/page.tsx', 'utf8');

content = content.replace(
  "const results = await employeeApi.search(searchTerm.trim());\n        if (results && results.length > 0) {\n          selectEmployee(results[0]);",
  "const results = await employeeApi.search(searchTerm.trim());\n        const drivers = results?.filter(e => (!e.job_role || e.job_role === 'DRIVER')) || [];\n        if (drivers.length > 0) {\n          selectEmployee(drivers[0]);"
);
content = content.replace(
  "toast.success(`تم إيجاد: ${results[0].name}`);",
  "toast.success(`تم إيجاد: ${drivers[0].name}`);"
);

content = content.replace(
  /const found = allEmployees\.data\.filter\(\s*\(emp\) =>\s*emp\.name\.toLowerCase\(\)\.includes\(term\) \|\|\s*emp\.national_id\.includes\(term\) \|\|\s*\(emp\.key_number \?\? ''\)\.includes\(term\)\s*\);/g,
  "const found = allEmployees.data.filter(\n            (emp) =>\n              (!emp.job_role || emp.job_role === 'DRIVER') && (\n                emp.name.toLowerCase().includes(term) ||\n                emp.national_id.includes(term) ||\n                (emp.key_number ?? '').includes(term)\n              )\n          );"
);

// Filter BarcodeScannerModal selection
content = content.replace(
  "onSelectEmployee={(emp) => {\n          selectEmployee(emp);\n          toast.success(`تم إيجاد الموظف: ${emp.name}`);\n        }}",
  "onSelectEmployee={(emp) => {\n          if (emp.job_role && emp.job_role !== 'DRIVER') {\n            toast.error('لا يمكن إنهاء الدوام إلا للمندوبين');\n            return;\n          }\n          selectEmployee(emp);\n          toast.success(`تم إيجاد الموظف: ${emp.name}`);\n        }}"
);

fs.writeFileSync('src/app/dashboard/work/end/page.tsx', content, 'utf8');
