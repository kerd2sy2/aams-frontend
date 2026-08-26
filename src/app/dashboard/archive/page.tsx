'use client';

import React, { useEffect, useState, useMemo } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Archive,
  RotateCcw,
  Trash2,
  Search,
  RefreshCw,
  Users,
  Bike,
  Building2,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Layers,
  Sparkles,
  Calendar,
  AlertCircle,
  MessageSquare,
  Wrench,
  ShieldAlert,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { archiveApi, branchApi } from '@/lib/aams/services';
import type { ArchivedItem, ArchiveStats, Branch } from '@/types/aams';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; badgeClass: string }
> = {
  employees: {
    label: 'المناديب والموظفين',
    icon: Users,
    color: 'text-blue-600 dark:text-blue-400',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
  },
  vehicles: {
    label: 'المركبات والدبابات',
    icon: Bike,
    color: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
  },
  branches: {
    label: 'الفروع التشغيلية',
    icon: Building2,
    color: 'text-indigo-600 dark:text-indigo-400',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
  },
  documents: {
    label: 'المستندات والرخص',
    icon: FileText,
    color: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
  },
  work_sessions: {
    label: 'شفتات وجلسات العمل',
    icon: Clock,
    color: 'text-purple-600 dark:text-purple-400',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
  },
  leave_requests: {
    label: 'طلبات الإجازات',
    icon: Calendar,
    color: 'text-teal-600 dark:text-teal-400',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800'
  },
  maintenance: {
    label: 'طلبات الصيانة',
    icon: Wrench,
    color: 'text-orange-600 dark:text-orange-400',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800'
  },
  violations: {
    label: 'المخالفات المرورية',
    icon: AlertCircle,
    color: 'text-rose-600 dark:text-rose-400',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
  },
  tickets: {
    label: 'تذاكر الدعم',
    icon: MessageSquare,
    color: 'text-cyan-600 dark:text-cyan-400',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800'
  }
};

export default function ArchivePage() {
  const [items, setItems] = useState<ArchivedItem[]>([]);
  const [stats, setStats] = useState<ArchiveStats>({
    total_employees: 0,
    total_vehicles: 0,
    total_branches: 0,
    total_documents: 0,
    total_work_sessions: 0,
    total_leaves: 0,
    total_maintenance: 0,
    total_violations: 0,
    total_tickets: 0,
    grand_total: 0
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [deleteTarget, setDeleteTarget] = useState<ArchivedItem | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchArchiveData = async () => {
    try {
      setLoading(true);
      const [archiveRes, branchesRes] = await Promise.allSettled([
        archiveApi.getArchived({
          type: activeTab,
          search: searchTerm.trim() || undefined,
          branch_id: selectedBranchId !== 'ALL' ? selectedBranchId : undefined,
          limit: 100
        }),
        branchApi.getAll()
      ]);

      if (archiveRes.status === 'fulfilled') {
        setItems(archiveRes.value.data || []);
        if (archiveRes.value.stats) {
          setStats(archiveRes.value.stats);
        }
      } else {
        toast.error('تعذر جلب سجلات الأرشيف من الخادم');
      }

      if (branchesRes.status === 'fulfilled') {
        setBranches(branchesRes.value);
      }
    } catch (err: any) {
      toast.error('حدث خطأ أثناء تحميل بيانات الأرشيف');
    } finally {
      setLoading(false);
      setSelectedIds([]);
    }
  };

  useEffect(() => {
    fetchArchiveData();
  }, [activeTab, selectedBranchId]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchArchiveData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtered items based on client-side search query
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.title?.toLowerCase().includes(term) ||
        item.subtitle?.toLowerCase().includes(term) ||
        item.details?.toLowerCase().includes(term) ||
        item.branch_name?.toLowerCase().includes(term)
      );
    });
  }, [items, searchTerm]);

  // Single Item Restore
  const handleRestore = async (item: ArchivedItem) => {
    try {
      setIsActionLoading(true);
      await archiveApi.restore(item.type, item.id);
      toast.success(`تم استرجاع «${item.title}» بنجاح وإعادته للنظام`);
      fetchArchiveData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'تعذر استرجاع العنصر');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Single Item Permanent Delete
  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsActionLoading(true);
      await archiveApi.permanentDelete(deleteTarget.type, deleteTarget.id);
      toast.success(`تم حذف «${deleteTarget.title}» نهائياً من قاعدة البيانات`);
      setDeleteTarget(null);
      fetchArchiveData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'تعذر الحذف النهائي');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Bulk Restore
  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsActionLoading(true);
      // Group by type
      const selectedItems = items.filter(i => selectedIds.includes(i.id));
      const typeGroups = selectedItems.reduce<Record<string, string[]>>((acc, item) => {
        if (!acc[item.type]) acc[item.type] = [];
        acc[item.type].push(item.id);
        return acc;
      }, {});

      for (const [type, ids] of Object.entries(typeGroups)) {
        await archiveApi.bulkRestore(type, ids);
      }

      toast.success(`تم استرجاع ${selectedIds.length} عنصر بنجاح`);
      setSelectedIds([]);
      fetchArchiveData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'تعذر استرجاع بعض العناصر');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Bulk Permanent Delete
  const handleBulkPermanentDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsActionLoading(true);
      const selectedItems = items.filter(i => selectedIds.includes(i.id));
      const typeGroups = selectedItems.reduce<Record<string, string[]>>((acc, item) => {
        if (!acc[item.type]) acc[item.type] = [];
        acc[item.type].push(item.id);
        return acc;
      }, {});

      for (const [type, ids] of Object.entries(typeGroups)) {
        await archiveApi.bulkPermanentDelete(type, ids);
      }

      toast.success(`تم حذف ${selectedIds.length} عنصر نهائياً`);
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
      fetchArchiveData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'تعذر الحذف النهائي لبعض العناصر');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Selection helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredItems.map(i => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const isAllSelected = filteredItems.length > 0 && selectedIds.length === filteredItems.length;

  return (
    <PageContainer>
      <div className="space-y-6" dir="rtl">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-slate-700">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-md text-slate-200">
              <Archive className="size-3.5 text-amber-400" />
              <span>نظام الحماية والأرشفة الآمنة</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              سجل الأرشيف والمحذوفات
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              جميع العناصر المحذوفة في النظام يتم الاحتفاظ بها هنا بأمان. يمكنك استرجاع أي عنصر بضغطة زر أو حذفه نهائياً عند الحاجة.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchArchiveData}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md gap-2 h-10 px-4 font-bold"
            >
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
              تحديث
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card
            onClick={() => setActiveTab('all')}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border',
              activeTab === 'all' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'bg-card'
            )}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">الإجمالي</span>
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Layers className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground">{stats.grand_total}</div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setActiveTab('employees')}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border',
              activeTab === 'employees' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5' : 'bg-card'
            )}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">المناديب</span>
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50">
                  <Users className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground">{stats.total_employees}</div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setActiveTab('vehicles')}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border',
              activeTab === 'vehicles' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5' : 'bg-card'
            )}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">المركبات</span>
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50">
                  <Bike className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground">{stats.total_vehicles}</div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setActiveTab('branches')}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border',
              activeTab === 'branches' ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/5' : 'bg-card'
            )}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">الفروع</span>
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50">
                  <Building2 className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground">{stats.total_branches}</div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setActiveTab('documents')}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border',
              activeTab === 'documents' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/5' : 'bg-card'
            )}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">المستندات</span>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">
                  <FileText className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground">{stats.total_documents}</div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setActiveTab('leave_requests')}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border',
              activeTab === 'leave_requests' ? 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-500/5' : 'bg-card'
            )}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">الإجازات</span>
                <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/50">
                  <Calendar className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground">{stats.total_leaves || 0}</div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setActiveTab('work_sessions')}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border',
              activeTab === 'work_sessions' ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/5' : 'bg-card'
            )}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">الشفتات</span>
                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50">
                  <Clock className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground">{stats.total_work_sessions}</div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setActiveTab('maintenance')}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border',
              activeTab === 'maintenance' ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-500/5' : 'bg-card'
            )}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">الصيانة</span>
                <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/50">
                  <Wrench className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground">{stats.total_maintenance || 0}</div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setActiveTab('violations')}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border',
              activeTab === 'violations' ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-500/5' : 'bg-card'
            )}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">المخالفات</span>
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50">
                  <AlertCircle className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground">{stats.total_violations || 0}</div>
            </CardContent>
          </Card>

          <Card
            onClick={() => setActiveTab('tickets')}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border',
              activeTab === 'tickets' ? 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-500/5' : 'bg-card'
            )}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">التذاكر</span>
                <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50">
                  <MessageSquare className="size-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-foreground">{stats.total_tickets || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Batch Actions Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-xs">
          <div className="flex flex-1 items-center gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="بحث في الأرشيف باسم العنصر، الرقم، التفاصيل..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pr-10 h-10 text-xs bg-muted/30"
              />
            </div>

            {/* Branch Filter */}
            {branches.length > 0 && (
              <select
                value={selectedBranchId}
                onChange={e => setSelectedBranchId(e.target.value)}
                className="h-10 px-3 rounded-xl border bg-background text-xs font-medium focus:ring-2 focus:ring-primary/20"
              >
                <option value="ALL">جميع الفروع</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Batch Actions Button Bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 p-1.5 bg-primary/10 rounded-xl border border-primary/20 animate-in fade-in zoom-in-95">
              <span className="text-xs font-bold px-2 text-primary">
                تم تحديد {selectedIds.length} عنصر
              </span>
              <Button
                variant="default"
                size="sm"
                onClick={handleBulkRestore}
                disabled={isActionLoading}
                className="h-8 text-xs gap-1.5 font-bold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <RotateCcw className="size-3.5" />
                استرجاع المحدد
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsBulkDeleteOpen(true)}
                disabled={isActionLoading}
                className="h-8 text-xs gap-1.5 font-bold shadow-xs"
              >
                <Trash2 className="size-3.5" />
                حذف نهائي للمحدد
              </Button>
            </div>
          )}
        </div>

        {/* Category Tabs & Table */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/60 p-1 rounded-2xl flex-wrap h-auto gap-1 border">
            <TabsTrigger value="all" className="rounded-xl text-xs font-bold gap-2 py-2 px-3">
              <Layers className="size-3.5" />
              الكل
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {stats.grand_total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="employees" className="rounded-xl text-xs font-bold gap-2 py-2 px-3">
              <Users className="size-3.5 text-blue-500" />
              المناديب
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {stats.total_employees}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="rounded-xl text-xs font-bold gap-2 py-2 px-3">
              <Bike className="size-3.5 text-amber-500" />
              المركبات
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {stats.total_vehicles}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="branches" className="rounded-xl text-xs font-bold gap-2 py-2 px-3">
              <Building2 className="size-3.5 text-indigo-500" />
              الفروع
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {stats.total_branches}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-xl text-xs font-bold gap-2 py-2 px-3">
              <FileText className="size-3.5 text-emerald-500" />
              المستندات
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {stats.total_documents}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="leave_requests" className="rounded-xl text-xs font-bold gap-2 py-2 px-3">
              <Calendar className="size-3.5 text-teal-500" />
              الإجازات
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {stats.total_leaves || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="work_sessions" className="rounded-xl text-xs font-bold gap-2 py-2 px-3">
              <Clock className="size-3.5 text-purple-500" />
              الشفتات
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {stats.total_work_sessions}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-xl text-xs font-bold gap-2 py-2 px-3">
              <Wrench className="size-3.5 text-orange-500" />
              الصيانة
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {stats.total_maintenance || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="violations" className="rounded-xl text-xs font-bold gap-2 py-2 px-3">
              <AlertCircle className="size-3.5 text-rose-500" />
              المخالفات
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {stats.total_violations || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="rounded-xl text-xs font-bold gap-2 py-2 px-3">
              <MessageSquare className="size-3.5 text-cyan-500" />
              التذاكر
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {stats.total_tickets || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="m-0">
            <Card className="rounded-2xl shadow-xs overflow-hidden border">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-16 space-y-3">
                  <RefreshCw className="size-8 text-primary animate-spin" />
                  <p className="text-sm font-semibold text-foreground">جارٍ تحميل سجلات الأرشيف...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center space-y-4">
                  <div className="size-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground border">
                    <CheckCircle2 className="size-8 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground">لا توجد عناصر مؤرشفة حالياً</h3>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      {searchTerm
                        ? 'لم يتم العثور على أي عناصر تطابق معايير البحث الخاصة بك'
                        : 'سجل الأرشيف نظيف تماماً، ولا توجد أي عناصر محذوفة في هذا القسم'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-12 text-center">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all"
                          />
                        </TableHead>
                        <TableHead className="text-right">نوع العنصر</TableHead>
                        <TableHead className="text-right">اسم / عنوان العنصر</TableHead>
                        <TableHead className="text-right">البيانات والتفاصيل</TableHead>
                        <TableHead className="text-right">الفرع</TableHead>
                        <TableHead className="text-right">تاريخ الأرشفة</TableHead>
                        <TableHead className="text-center w-36">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map(item => {
                        const typeInfo = TYPE_CONFIG[item.type] || {
                          label: item.type_name || item.type,
                          icon: Archive,
                          color: 'text-slate-600',
                          badgeClass: 'bg-slate-100 text-slate-700'
                        };
                        const IconComponent = typeInfo.icon;
                        const isSelected = selectedIds.includes(item.id);

                        return (
                          <TableRow
                            key={item.id}
                            className={cn('hover:bg-muted/30 transition-colors', isSelected && 'bg-primary/5')}
                          >
                            <TableCell className="text-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleSelect(item.id)}
                                aria-label={`Select ${item.title}`}
                              />
                            </TableCell>

                            <TableCell>
                              <div className="inline-flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={cn('text-[11px] font-semibold gap-1 py-1 px-2 border', typeInfo.badgeClass)}
                                >
                                  <IconComponent className="size-3" />
                                  {typeInfo.label}
                                </Badge>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="font-bold text-foreground text-sm flex items-center gap-2">
                                {item.title}
                              </div>
                              {item.subtitle && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                  {item.subtitle}
                                </p>
                              )}
                            </TableCell>

                            <TableCell>
                              <div className="text-xs text-muted-foreground font-mono">
                                {item.details || '—'}
                              </div>
                            </TableCell>

                            <TableCell>
                              {item.branch_name ? (
                                <Badge variant="secondary" className="text-[11px] font-semibold">
                                  {item.branch_name}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">الإدارة العامة</span>
                              )}
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="size-3.5" />
                                {item.archived_at
                                  ? new Date(item.archived_at).toLocaleString('ar-SA', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : '—'}
                              </div>
                            </TableCell>

                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestore(item)}
                                  disabled={isActionLoading}
                                  className="h-8 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1 border-emerald-200 dark:border-emerald-800"
                                  title="استرجاع العنصر إلى حالته النشطة"
                                >
                                  <RotateCcw className="size-3.5" />
                                  استرجاع
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteTarget(item)}
                                  disabled={isActionLoading}
                                  className="h-8 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
                                  title="حذف نهائي من قاعدة البيانات"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Single Item Permanent Delete Confirmation Modal */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl" className="max-w-md">
          <AlertDialogHeader className="text-right space-y-3">
            <div className="size-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="size-6" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              تأكيد الحذف النهائي بلا رجعة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              أنت على وشك حذف العنصر <strong className="text-foreground">«{deleteTarget?.title}»</strong> نهائياً من قاعدة البيانات.
              <br />
              <span className="font-bold text-rose-600 block mt-2">
                ⚠️ تنبيه: هذه العملية لا يمكن التراجع عنها، وستتم إزالة كافة السجلات المرتبطة بهذا العنصر للأبد.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse justify-start gap-2 pt-2">
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={isActionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
            >
              <Trash2 className="size-4" />
              تأكيد الحذف النهائي
            </AlertDialogAction>
            <AlertDialogCancel disabled={isActionLoading} className="font-semibold">
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Permanent Delete Confirmation Modal */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent dir="rtl" className="max-w-md">
          <AlertDialogHeader className="text-right space-y-3">
            <div className="size-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="size-6" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              تأكيد الحذف النهائي لـ {selectedIds.length} عنصر
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              أنت على وشك حذف <strong className="text-foreground">{selectedIds.length}</strong> عنصر محدد نهائياً من قاعدة البيانات.
              <br />
              <span className="font-bold text-rose-600 block mt-2">
                ⚠️ تنبيه: لا يمكن استرجاع هذه العناصر بعد تنفيذ هذا الإجراء.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse justify-start gap-2 pt-2">
            <AlertDialogAction
              onClick={handleBulkPermanentDelete}
              disabled={isActionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
            >
              <Trash2 className="size-4" />
              حذف الكل نهائياً
            </AlertDialogAction>
            <AlertDialogCancel disabled={isActionLoading} className="font-semibold">
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
