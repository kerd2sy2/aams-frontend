'use client';

import React, { useEffect, useState } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { bankAccountApi, employeeApi } from '@/lib/aams/services';
import type { EmployeeBankAccount, Employee } from '@/types/aams';

const SAUDI_BANKS = [
  'مصرف الراجحي',
  'البنك الأهلي السعودي (SNB)',
  'مصرف الإنماء',
  'بنك الرياض',
  'البنك السعودي الأول (SAB)',
  'البنك العربي الوطني (ANB)',
  'بنك البلاد',
  'بنك الجزيرة',
  'بنك الخليج الدولي (meem)',
  'بنك الاستثمار السعودي',
  'بنك آخر'
];

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<EmployeeBankAccount[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<EmployeeBankAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [employeeId, setEmployeeId] = useState('');
  const [bankName, setBankName] = useState('مصرف الراجحي');
  const [iban, setIban] = useState('');
  const [accountOwnerName, setAccountOwnerName] = useState('');
  const [isDefault, setIsDefault] = useState(true);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await bankAccountApi.getAll({ search, limit: 300 });
      setAccounts(res.data || []);
    } catch (err: any) {
      toast.error('فشل في جلب الحسابات البنكية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    employeeApi.getAll({ limit: 500 }).then(res => setEmployees(res.data || [])).catch(() => {});
  }, []);

  const handleOpenAdd = () => {
    setEditingAcc(null);
    setEmployeeId('');
    setBankName('مصرف الراجحي');
    setIban('SA');
    setAccountOwnerName('');
    setIsDefault(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (acc: EmployeeBankAccount) => {
    setEditingAcc(acc);
    setEmployeeId(acc.employee_id || '');
    setBankName(acc.bank_name || 'مصرف الراجحي');
    setIban(acc.iban || '');
    setAccountOwnerName(acc.account_owner_name || '');
    setIsDefault(acc.is_default);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !iban || !accountOwnerName) {
      toast.error('يرجى اختيار المندوب وكتابة الآيبان واسم صاحب الحساب');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<EmployeeBankAccount> = {
        employee_id: employeeId,
        bank_name: bankName,
        iban: iban.trim().toUpperCase(),
        account_owner_name: accountOwnerName,
        is_default: isDefault
      };

      if (editingAcc) {
        await bankAccountApi.update(editingAcc.id, payload);
        toast.success('تم تعديل الحساب البنكي بنجاح');
      } else {
        await bankAccountApi.create(payload);
        toast.success('تم إضافة الحساب البنكي بنجاح');
      }

      setModalOpen(false);
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'حدث خطأ أثناء حفظ الحساب');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyIban = (ibanStr: string) => {
    navigator.clipboard.writeText(ibanStr);
    toast.success(`تم نسخ الآيبان: ${ibanStr}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الحساب؟')) return;
    try {
      await bankAccountApi.delete(id);
      toast.success('تم حذف الحساب بنجاح');
      fetchAccounts();
    } catch (err: any) {
      toast.error('فشل في حذف الحساب');
    }
  };

  const filteredAccounts = accounts.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.bank_name?.toLowerCase().includes(s) ||
      a.iban?.toLowerCase().includes(s) ||
      a.account_owner_name?.toLowerCase().includes(s) ||
      a.employee?.name?.toLowerCase().includes(s)
    );
  });

  return (
    <PageContainer>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Icons.bank className="h-7 w-7 text-teal-500" />
              الحسابات البنكية للمناديب
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              إدارة أرقام الآيبان (IBAN) والحسابات البنكية المعتمدة لصرف المستحقات
            </p>
          </div>
          <Button onClick={handleOpenAdd} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
            <Icons.add className="h-4 w-4" />
            إضافة حساب بنكي
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-teal-100 bg-teal-50/40 dark:border-teal-950/40 dark:bg-teal-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-teal-900 dark:text-teal-200">إجمالي الحسابات المسجلة</CardTitle>
              <Icons.bank className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-700 dark:text-teal-400">
                {accounts.length} <span className="text-sm font-normal text-slate-500">حساب</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-blue-50/40 dark:border-blue-950/40 dark:bg-blue-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-200">الحسابات الافتراضية للتحويل</CardTitle>
              <Icons.check className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {accounts.filter(a => a.is_default).length} <span className="text-sm font-normal text-slate-500">حساب</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">البنوك المعتمدة</CardTitle>
              <Icons.creditCard className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {new Set(accounts.map(a => a.bank_name)).size} <span className="text-sm font-normal text-slate-500">بنك</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative w-full md:w-80">
            <Icons.search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="بحث باسم المندوب، البنك، أو الآيبان..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
          <Button variant="outline" onClick={fetchAccounts}>
            <Icons.refresh className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الحسابات البنكية</CardTitle>
            <CardDescription>أرقام الآيبان وأسماء البنوك لجميع المناديب</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75 dark:bg-slate-900/50">
                    <TableHead className="text-right">المندوب</TableHead>
                    <TableHead className="text-right">اسم البنك</TableHead>
                    <TableHead className="text-right">رقم الآيبان (IBAN)</TableHead>
                    <TableHead className="text-right">اسم صاحب الحساب</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-center">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                        <Icons.spinner className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
                        جارٍ تحميل الحسابات البنكية...
                      </TableCell>
                    </TableRow>
                  ) : filteredAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                        لا توجد حسابات بنكية مطابقة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAccounts.map(acc => (
                      <TableRow key={acc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <TableCell>
                          {acc.employee ? (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{acc.employee.name}</span>
                              {acc.employee.key_number && (
                                <Badge variant="outline" className="text-xs">
                                  #{acc.employee.key_number}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{acc.bank_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 font-mono text-sm">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                              {acc.iban}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyIban(acc.iban)}
                              className="h-7 w-7 text-slate-500 hover:text-teal-600"
                              title="نسخ الآيبان"
                            >
                              <Icons.copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{acc.account_owner_name}</TableCell>
                        <TableCell>
                          {acc.is_default ? (
                            <Badge className="bg-teal-600 text-white">حساب رئيسي</Badge>
                          ) : (
                            <Badge variant="outline">حساب إضافي</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(acc)}
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            >
                              <Icons.edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(acc.id)}
                              className="h-8 w-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                              <Icons.trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-[480px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingAcc ? 'تعديل الحساب البنكي' : 'إضافة حساب بنكي جديد'}</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل الآيبان واسم البنك والمندوب صاحب الحساب
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>المندوب *</Label>
                <Select value={employeeId} onValueChange={(val) => setEmployeeId(val || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المندوب" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.key_number || emp.employee_number || 'بدون رقم'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>اسم البنك *</Label>
                <Select value={bankName} onValueChange={(val) => setBankName(val || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر البنك" />
                  </SelectTrigger>
                  <SelectContent>
                    {SAUDI_BANKS.map(bank => (
                      <SelectItem key={bank} value={bank}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>رقم الآيبان (IBAN) *</Label>
                <Input
                  value={iban}
                  onChange={e => setIban(e.target.value)}
                  placeholder="SA0000000000000000000000"
                  className="font-mono text-left"
                  dir="ltr"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>اسم صاحب الحساب (كما يظهر بالبنك) *</Label>
                <Input
                  value={accountOwnerName}
                  onChange={e => setAccountOwnerName(e.target.value)}
                  placeholder="الاسم الرباعي"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="is_default"
                  checked={isDefault}
                  onCheckedChange={checked => setIsDefault(!!checked)}
                />
                <Label htmlFor="is_default" className="cursor-pointer text-sm">
                  تعيين كحساب افتراضي معتمد لصرف المستحقات
                </Label>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={submitting} className="bg-teal-600 hover:bg-teal-700 text-white">
                  {submitting ? 'جارٍ الحفظ...' : editingAcc ? 'حفظ التعديلات' : 'إضافة الحساب'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
