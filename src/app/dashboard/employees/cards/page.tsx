'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { employeeApi, settingsApi, branchApi } from '@/lib/aams/services';
import { Employee } from '@/types/aams';
import { CR80Card } from '@/components/aams/cr80-card';
import { CardPageSkeleton } from '@/components/aams/skeletons';
import PageContainer from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Printer,
  Search,
  CheckSquare,
  Square,
  Users,
  CreditCard,
  Grid,
  FileText,
  Scissors,
  ArrowRight,
  Filter,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

export default function EmployeeCardsPrintPage() {
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCutLines, setShowCutLines] = useState(true);
  const [printLayout, setPrintLayout] = useState<'a4' | 'single'>('a4');
  const [previewEmployee, setPreviewEmployee] = useState<Employee | null>(null);

  // Fetch all employees (limit 1000 for cards page)
  const { data: employeesData, isLoading: employeesLoading } = useOfflineQuery({
    queryKey: ['employees', 'all-for-cards'],
    queryFn: () => employeeApi.getAll({ limit: 1000 }),
    cacheKey: 'employees_all_cards',
  });

  // Fetch branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => branchApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch public settings for brand logo and name
  const { data: settings } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsApi.getPublic(),
    staleTime: 10 * 60 * 1000,
  });

  const allEmployees: Employee[] = employeesData?.data || [];
  const branches = branchesData || [];

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return allEmployees.filter((emp) => {
      const matchesSearch =
        !search.trim() ||
        emp.name?.toLowerCase().includes(search.toLowerCase()) ||
        emp.national_id?.includes(search) ||
        emp.key_number?.includes(search) ||
        emp.motorcycle_number?.toLowerCase().includes(search.toLowerCase()) ||
        emp.employee_number?.includes(search);

      const matchesBranch =
        selectedBranch === 'all' || emp.branch_id === selectedBranch;

      return matchesSearch && matchesBranch;
    });
  }, [allEmployees, search, selectedBranch]);

  // Selected employees to print
  const employeesToPrint = useMemo(() => {
    if (selectedIds.length === 0) {
      return filteredEmployees;
    }
    return allEmployees.filter((emp) => selectedIds.includes(emp.id));
  }, [allEmployees, filteredEmployees, selectedIds]);

  // Group employees into pages of exactly 8 cards per A4 page (or 1 per page for single mode)
  const printPages = useMemo(() => {
    if (printLayout === 'single') {
      return employeesToPrint.map((emp) => [emp]);
    }
    const pages: Employee[][] = [];
    for (let i = 0; i < employeesToPrint.length; i += 8) {
      pages.push(employeesToPrint.slice(i, i + 8));
    }
    return pages;
  }, [employeesToPrint, printLayout]);

  // Selection handlers
  const handleSelectAll = () => {
    setSelectedIds(filteredEmployees.map((e) => e.id));
    toast.success(`تم تحديد ${filteredEmployees.length} بطاقة`);
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Trigger Print
  const handlePrint = (singleEmployee?: Employee) => {
    if (singleEmployee) {
      setPreviewEmployee(singleEmployee);
      // Temporarily set only this employee
      setSelectedIds([singleEmployee.id]);
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (employeesLoading) {
    return (
      <PageContainer>
        <CardPageSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Print Specific CSS Styles */}
      <style jsx global>{`
        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body * {
            visibility: hidden;
          }
          #print-section,
          #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: ${printLayout === 'a4' ? 'A4 portrait' : '85.6mm 54.0mm'};
            margin: 0 !important;
          }
          .a4-sheet-page {
            width: 210mm;
            height: 297mm;
            max-height: 297mm;
            page-break-after: always;
            break-after: page;
            padding: 10mm 12mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
            background: white !important;
            overflow: hidden;
          }
          .a4-sheet-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
          .a4-grid-container {
            display: grid;
            grid-template-columns: repeat(2, 85.6mm);
            grid-template-rows: repeat(4, 54.0mm);
            column-gap: 8mm;
            row-gap: 6mm;
            justify-content: center;
            align-content: start;
          }
          .single-sheet-page {
            width: 85.6mm;
            height: 54.0mm;
            max-height: 54.0mm;
            page-break-after: always;
            break-after: page;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            background: white !important;
            overflow: hidden;
          }
          .single-sheet-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
          .cr80-card-root {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="space-y-6" dir="rtl">
        {/* Header toolbar */}
        <div className="no-print space-y-4">
          <PageHeader
            category="إدارة وطباعة بطاقات الهوية"
            title="طباعة بطاقات الهوية القياسية (CR80 ID Cards)"
            description="حجم البطاقة القياسي 85.6 مم × 54 مم (مطابق لمعيار بطاقات الصراف والائتمان الدولية) مع رمز QR والباركود وشعار الشركة."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/dashboard/employees">
                  <Button variant="outline" size="sm" className="gap-1.5 font-bold">
                    <ArrowRight className="size-4" />
                    قائمة المناديب
                  </Button>
                </Link>

                <Button
                  onClick={() => handlePrint()}
                  className="gap-2 font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="default"
                >
                  <Printer className="size-4" />
                  <span>
                    طباعة {selectedIds.length > 0 ? `المحددة (${selectedIds.length})` : `الكل (${filteredEmployees.length})`}
                  </span>
                </Button>
              </div>
            }
          />

          {/* Controls & Filter Card */}
          <Card className="border-border/70 shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم، رقم الهوية، المفتاح، الدراجة..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pr-9 h-10 text-right"
                  />
                </div>

                {/* Branch filter */}
                <Select
                  value={selectedBranch}
                  onValueChange={(val) => {
                    if (val) setSelectedBranch(val);
                  }}
                >
                  <SelectTrigger className="h-10 text-right">
                    <SelectValue placeholder="تصفية حسب الفرع" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">جميع الفروع ({allEmployees.length})</SelectItem>
                    {branches.map((b: { id: string; name: string }) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Print Layout Switch */}
                <Select
                  value={printLayout}
                  onValueChange={(val) => {
                    if (val === 'a4' || val === 'single') setPrintLayout(val);
                  }}
                >
                  <SelectTrigger className="h-10 text-right font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="a4">
                      📄 تخطيط ورقة A4 (8 كروت في الصفحة للقص)
                    </SelectItem>
                    <SelectItem value="single">
                      💳 طابعات كروت PVC البلاستيكية (كرت فردي)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Selection Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60 text-sm">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="gap-1.5 h-8 font-bold"
                  >
                    <CheckSquare className="size-4 text-primary" />
                    تحديد الكل ({filteredEmployees.length})
                  </Button>

                  {selectedIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAll}
                      className="gap-1.5 h-8 text-muted-foreground hover:text-foreground"
                    >
                      <Square className="size-4" />
                      إلغاء التحديد
                    </Button>
                  )}

                  <span className="text-xs font-semibold text-muted-foreground mr-2">
                    المحدد: <strong className="text-primary font-bold font-mono">{selectedIds.length || filteredEmployees.length}</strong> بطاقة جاهزة للطباعة
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-muted-foreground select-none">
                    <Checkbox
                      checked={showCutLines}
                      onCheckedChange={(c) => setShowCutLines(!!c)}
                    />
                    <span className="flex items-center gap-1">
                      <Scissors className="size-3.5" />
                      إظهار خطوط القص الإرشادية
                    </span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Grid on Screen */}
        <div className="no-print space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
              <Grid className="size-4 text-primary" />
              معاينة الكروت الحية ({filteredEmployees.length} موظف)
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              CR80: 85.6mm × 54.0mm
            </span>
          </div>

          {filteredEmployees.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="size-16 rounded-2xl bg-muted mx-auto mb-3 flex items-center justify-center text-muted-foreground">
                <Users className="size-8" />
              </div>
              <CardTitle className="text-base">لا توجد بطاقات مطابقة</CardTitle>
              <CardDescription className="text-xs mt-1">
                جرّب تغيير كلمات البحث أو تصفية الفروع.
              </CardDescription>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredEmployees.map((emp) => {
                const isSelected = selectedIds.includes(emp.id);
                return (
                  <Card
                    key={emp.id}
                    className={`overflow-hidden transition-all border-2 ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 shadow-md'
                        : 'border-border/80 hover:border-slate-400'
                    }`}
                  >
                    <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectOne(emp.id)}
                        />
                        <span className="truncate max-w-[180px]">{emp.name}</span>
                      </label>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrint(emp)}
                          className="h-7 px-2.5 text-xs gap-1 font-bold"
                          title="طباعة هذا الكرت فقط"
                        >
                          <Printer className="size-3" />
                          طباعة
                        </Button>
                        <Link href={`/dashboard/employees/${emp.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                            التفاصيل
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-100/70 dark:bg-slate-900/60 flex items-center justify-center">
                      <div className="transform scale-95 sm:scale-100 origin-center transition-transform">
                        <CR80Card
                          employee={emp}
                          settings={settings}
                          showCutLines={showCutLines}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* PRINT ONLY SECTION - Paginated 8 cards per sheet */}
        <div id="print-section" className="hidden print:block">
          {printPages.map((pageEmployees, pageIdx) => (
            <div
              key={`print-sheet-${pageIdx}`}
              className={printLayout === 'a4' ? 'a4-sheet-page' : 'single-sheet-page'}
            >
              {printLayout === 'a4' ? (
                <div className="a4-grid-container">
                  {pageEmployees.map((emp) => (
                    <div key={`print-card-${emp.id}`} className="cr80-print-card-wrapper">
                      <CR80Card
                        employee={emp}
                        settings={settings}
                        showCutLines={showCutLines}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                pageEmployees.map((emp) => (
                  <CR80Card
                    key={`print-single-${emp.id}`}
                    employee={emp}
                    settings={settings}
                    showCutLines={false}
                  />
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
