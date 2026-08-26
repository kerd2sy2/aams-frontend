'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { inventoryApi } from '@/lib/aams/services';
import type { InventoryItem, InventoryTransaction } from '@/types/aams';
import { TableSkeleton } from '@/components/aams/skeletons';
import { BarcodeScannerModal } from '@/components/aams/barcode-scanner-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';

type ItemTypeFilter = 'all' | 'oil' | 'spare_part';
type StockAction = 'add' | 'remove';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('items');
  const [filter, setFilter] = useState<ItemTypeFilter>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [stockModal, setStockModal] = useState<{
    item: InventoryItem;
    action: StockAction;
  } | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  // Add form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('oil');
  const [formUnit, setFormUnit] = useState('');
  const [formMinAlert, setFormMinAlert] = useState('0');
  const [formNotes, setFormNotes] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Stock modal state
  const [stockQuantity, setStockQuantity] = useState('0');
  const [stockEmployeeId, setStockEmployeeId] = useState('');
  const [stockNotes, setStockNotes] = useState('');
  const [stockBarcodeScan, setStockBarcodeScan] = useState(false);

  // Transactions state
  const [transPage, setTransPage] = useState(1);
  const [transItemFilter, setTransItemFilter] = useState('all');

  const queryClient = useQueryClient();

  // Query: Inventory items
  const itemsQuery = useOfflineQuery({
    queryKey: ['inventory-items', filter],
    queryFn: () => inventoryApi.getItems(filter === 'all' ? undefined : filter),
    cacheKey: `inventory_items_${filter}`
  });

  // Query: Inventory items list for transaction filter
  const allItemsQuery = useOfflineQuery({
    queryKey: ['inventory-items', 'all'],
    queryFn: () => inventoryApi.getItems(),
    cacheKey: 'inventory_items_all'
  });

  // Query: Transactions
  const transactionsQuery = useOfflineQuery({
    queryKey: ['inventory-transactions', transPage, transItemFilter],
    queryFn: () =>
      inventoryApi.getTransactions({
        page: transPage,
        limit: 15,
        item_id: transItemFilter === 'all' ? undefined : transItemFilter
      }),
    cacheKey: `inventory_transactions_${transPage}_${transItemFilter}`
  });

  // Mutations
  const createItemMut = useMutation({
    mutationFn: (data: {
      name: string;
      type: string;
      unit?: string;
      quantity: number;
      min_alert?: number;
      notes?: string;
      barcode?: string;
    }) => inventoryApi.createItem(data),
    onSuccess: () => {
      toast.success('تم إضافة الصنف بنجاح');
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      resetAddForm();
      setShowAddForm(false);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'حدث خطأ أثناء إضافة الصنف';
      toast.error(msg);
    }
  });

  const updateItemMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InventoryItem> }) =>
      inventoryApi.updateItem(id, data),
    onSuccess: () => {
      toast.success('تم تعديل الصنف بنجاح');
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      resetAddForm();
      setEditingItemId(null);
    },
    onError: () => toast.error('حدث خطأ أثناء تعديل الصنف')
  });

  const deleteItemMut = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteItem(id),
    onSuccess: () => {
      toast.success('تم حذف الصنف بنجاح');
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setDeleteModalId(null);
    },
    onError: () => toast.error('حدث خطأ أثناء حذف الصنف')
  });

  const addStockMut = useMutation({
    mutationFn: (data: { item_id: string; type: string; quantity: number; notes?: string }) =>
      inventoryApi.addStock(data),
    onSuccess: () => {
      toast.success('تمت إضافة المخزون بنجاح');
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      setStockModal(null);
      setStockQuantity('0');
      setStockNotes('');
    },
    onError: () => toast.error('حدث خطأ أثناء إضافة المخزون')
  });

  const removeStockMut = useMutation({
    mutationFn: (data: {
      item_id: string;
      type: string;
      quantity: number;
      employee_id?: string;
      notes?: string;
    }) => inventoryApi.removeStock(data),
    onSuccess: () => {
      toast.success('تم صرف المخزون بنجاح');
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      setStockModal(null);
      setStockQuantity('0');
      setStockEmployeeId('');
      setStockNotes('');
    },
    onError: () => toast.error('حدث خطأ أثناء صرف المخزون')
  });

  const resetAddForm = () => {
    setFormName('');
    setFormType('oil');
    setFormUnit('');
    setFormMinAlert('0');
    setFormNotes('');
    setFormBarcode('');
  };

  const startEdit = (item: InventoryItem) => {
    setFormName(item.name);
    setFormType(item.type);
    setFormUnit(item.unit);
    setFormMinAlert(String(item.min_alert));
    setFormNotes(item.notes || '');
    setFormBarcode(item.barcode || '');
    setEditingItemId(item.id);
    setShowAddForm(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formName,
      type: formType as 'oil' | 'spare_part',
      unit: formUnit || undefined,
      quantity: 0,
      min_alert: Number(formMinAlert) || undefined,
      notes: formNotes || undefined,
      barcode: formBarcode || undefined
    };

    if (editingItemId) {
      updateItemMut.mutate({ id: editingItemId, data });
    } else {
      createItemMut.mutate(data);
    }
  };

  const filteredItems = itemsQuery.data || [];
  const isFormSubmitting = createItemMut.isPending || updateItemMut.isPending;

  return (
    <PageContainer pageTitle='المخزن' pageDescription='إدارة أصناف الزيت وقطع الغيار ومراقبة الأرصدة'>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
        <TabsList className='mb-4'>
          <TabsTrigger value='items' className='flex items-center gap-1.5'>
            <Icons.inventory className='size-4' /> الأصناف
          </TabsTrigger>
          <TabsTrigger value='transactions' className='flex items-center gap-1.5'>
            <Icons.history className='size-4' /> الحركات
          </TabsTrigger>
        </TabsList>

        {/* ============================ TAB 1: المخزن ============================ */}
        <TabsContent value='items'>
          <div className='space-y-4'>
            {/* Toolbar: filters + add button */}
            <div className='flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center'>
              <div className='bg-muted flex w-fit items-center gap-1.5 rounded-lg p-1'>
                {(
                  [
                    { value: 'all', label: 'الكل' },
                    { value: 'oil', label: 'زيت' },
                    { value: 'spare_part', label: 'قطع غيار' }
                  ] as const
                ).map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-bold transition-all',
                      filter === f.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <Button
                size='lg'
                onClick={() => {
                  resetAddForm();
                  setEditingItemId(null);
                  setShowAddForm(!showAddForm);
                }}
                className='h-11 gap-2 px-4 font-bold'
              >
                <Icons.add className='size-5' />
                إضافة صنف
              </Button>
            </div>

            {/* Inline Add / Edit Form */}
            {showAddForm && (
              <Card>
                <CardContent className='p-4'>
                  <form onSubmit={handleFormSubmit} className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <h3 className='text-sm font-bold'>
                        {editingItemId ? 'تعديل صنف' : 'إضافة صنف جديد'}
                      </h3>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingItemId(null);
                          resetAddForm();
                        }}
                        aria-label='إغلاق'
                      >
                        <Icons.close className='size-5' />
                      </Button>
                    </div>
                    <Separator />
                    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                      <div className='space-y-1.5'>
                        <label className='text-muted-foreground text-xs font-medium'>الاسم</label>
                        <Input
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder='اسم الصنف'
                          required
                          className='h-10'
                        />
                      </div>
                      <div className='space-y-1.5'>
                        <label className='text-muted-foreground text-xs font-medium'>النوع</label>
                        <Select value={formType} onValueChange={(v) => setFormType(v as string)}>
                          <SelectTrigger className='h-10 w-full'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='oil'>زيت</SelectItem>
                            <SelectItem value='spare_part'>قطع غيار</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className='space-y-1.5'>
                        <label className='text-muted-foreground text-xs font-medium'>الوحدة</label>
                        <Input
                          value={formUnit}
                          onChange={(e) => setFormUnit(e.target.value)}
                          placeholder='مثلاً: لتر، قطعة، علبة'
                          className='h-10'
                        />
                      </div>
                      <div className='space-y-1.5'>
                        <label className='text-muted-foreground text-xs font-medium'>الباركود</label>
                        <div className='flex items-center gap-2'>
                          <Input
                            value={formBarcode}
                            onChange={(e) => setFormBarcode(e.target.value)}
                            placeholder='أدخل أو امسح الباركود'
                            className='h-10 flex-1 font-mono'
                          />
                          <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            onClick={() => setShowBarcodeScanner(true)}
                            className='h-10 w-10 shrink-0'
                            aria-label='مسح الباركود'
                            title='مسح الباركود'
                          >
                            <Icons.qrCode className='size-[18px]' />
                          </Button>
                        </div>
                      </div>
                      <div className='space-y-1.5'>
                        <label className='text-muted-foreground text-xs font-medium'>
                          الحد الأدنى للتنبيه
                        </label>
                        <Input
                          type='number'
                          value={formMinAlert}
                          onChange={(e) => setFormMinAlert(e.target.value)}
                          placeholder='0'
                          min='0'
                          className='h-10'
                        />
                      </div>
                      <div className='space-y-1.5 sm:col-span-2 lg:col-span-1'>
                        <label className='text-muted-foreground text-xs font-medium'>ملاحظات</label>
                        <Input
                          value={formNotes}
                          onChange={(e) => setFormNotes(e.target.value)}
                          placeholder='ملاحظات إضافية'
                          className='h-10'
                        />
                      </div>
                    </div>
                    <div className='flex items-center gap-3 pt-2'>
                      <Button
                        type='submit'
                        size='lg'
                        disabled={isFormSubmitting}
                        className='h-11 gap-2 px-6 font-bold'
                      >
                        {isFormSubmitting && <Icons.spinner className='size-4 animate-spin' />}
                        {editingItemId ? 'حفظ التعديلات' : 'إضافة'}
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        size='lg'
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingItemId(null);
                          resetAddForm();
                        }}
                        className='h-11 px-4 font-bold'
                      >
                        إلغاء
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Barcode Scanner for Add/Edit Form */}
            {showBarcodeScanner && (
              <BarcodeScannerModal
                isOpen={showBarcodeScanner}
                onClose={() => setShowBarcodeScanner(false)}
                onSelectEmployee={() => {
                  setShowBarcodeScanner(false);
                }}
              />
            )}

            {/* Items Table */}
            {itemsQuery.isLoading ? (
              <TableSkeleton rows={6} />
            ) : filteredItems.length === 0 ? (
              <Card className='p-10 text-center md:p-14'>
                <div className='bg-muted text-muted-foreground mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl'>
                  <Icons.inventory className='size-8' />
                </div>
                <CardTitle className='text-lg'>لا توجد أصناف</CardTitle>
                <CardDescription className='mx-auto mt-1.5 max-w-xs'>
                  ابدأ بإضافة صنف جديد من خلال زر &quot;إضافة صنف&quot; أعلاه.
                </CardDescription>
              </Card>
            ) : (
              <Card className='overflow-hidden'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-right'>الاسم</TableHead>
                      <TableHead className='text-right'>النوع</TableHead>
                      <TableHead className='text-center'>الكمية</TableHead>
                      <TableHead className='text-right'>الوحدة</TableHead>
                      <TableHead className='text-right'>الباركود</TableHead>
                      <TableHead className='hidden text-center md:table-cell'>
                        الحد الأدنى للتنبيه
                      </TableHead>
                      <TableHead className='hidden text-right lg:table-cell'>ملاحظات</TableHead>
                      <TableHead className='text-center'>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className='font-bold'>{item.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={item.type === 'oil' ? 'default' : 'secondary'}
                            className='gap-1 font-bold'
                          >
                            {item.type === 'oil' ? (
                              <Icons.droplet className='size-3' />
                            ) : (
                              <Icons.inventory className='size-3' />
                            )}
                            {item.type === 'oil' ? 'زيت' : 'قطع غيار'}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-center'>
                          <span
                            className={cn(
                              'font-bold tabular-nums',
                              (item.branch_quantity ?? 0) <= item.min_alert && 'text-destructive'
                            )}
                          >
                            {item.branch_quantity}
                          </span>
                          {(item.branch_quantity ?? 0) <= item.min_alert && (
                            <Icons.warning className='text-destructive mr-1 inline-block size-3.5 align-middle' />
                          )}
                        </TableCell>
                        <TableCell className='text-muted-foreground'>{item.unit || '—'}</TableCell>
                        <TableCell className='text-muted-foreground font-mono tabular-nums'>
                          {item.barcode || '—'}
                        </TableCell>
                        <TableCell className='hidden text-center tabular-nums md:table-cell'>
                          {item.min_alert}
                        </TableCell>
                        <TableCell className='text-muted-foreground hidden max-w-[150px] truncate lg:table-cell'>
                          {item.notes || '—'}
                        </TableCell>
                        <TableCell className='text-center'>
                          <div className='flex items-center justify-center gap-1'>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => setStockModal({ item, action: 'add' })}
                              aria-label='مشتريات'
                              title='إضافة مشتريات'
                              className='gap-1 text-xs font-bold text-green-600 hover:bg-muted hover:text-green-700'
                            >
                              <Icons.add className='size-[15px]' />
                              مشتريات
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={() => setStockModal({ item, action: 'remove' })}
                              aria-label='صرف مخزون'
                              title='صرف مخزون'
                              className='text-amber-600 hover:bg-muted hover:text-amber-700'
                            >
                              <Icons.minus className='size-[18px]' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={() => startEdit(item)}
                              aria-label='تعديل'
                              title='تعديل'
                            >
                              <Icons.edit className='size-[18px]' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={() => setDeleteModalId(item.id)}
                              aria-label='حذف'
                              title='حذف'
                              className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                            >
                              <Icons.trash className='size-[18px]' />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}

            {/* Stock Modal (Add / Remove) */}
            <Dialog
              open={stockModal !== null}
              onOpenChange={(open) => {
                if (!open) setStockModal(null);
              }}
            >
              <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                  <DialogTitle className='flex items-center gap-2'>
                    {stockModal?.action === 'add' ? (
                      <>
                        <Icons.plusCircle className='size-5 text-emerald-500' /> إضافة مشتريات
                      </>
                    ) : (
                      <>
                        <Icons.minus className='size-5 text-rose-500' /> صرف من المخزون
                      </>
                    )}
                  </DialogTitle>
                  <DialogDescription>
                    {stockModal?.action === 'add'
                      ? 'إضافة كمية جديدة إلى المخزون'
                      : 'صرف كمية من المخزون إلى مندوب'}
                  </DialogDescription>
                </DialogHeader>
                <div className='space-y-4 py-2'>
                  <p className='text-foreground text-sm font-medium'>{stockModal?.item.name}</p>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setStockBarcodeScan(true)}
                    className='mx-auto h-8 gap-1.5 text-xs font-bold'
                  >
                    <Icons.qrCode className='size-3.5' />
                    بحث عن صنف بالباركود
                  </Button>
                  <p className='text-muted-foreground text-xs'>
                    الكمية الحالية:{' '}
                    <span
                      className={cn(
                        'font-bold tabular-nums',
                        stockModal?.item &&
                          (stockModal.item.branch_quantity ?? 0) <= stockModal.item.min_alert &&
                          'text-destructive'
                      )}
                    >
                      {stockModal?.item.branch_quantity ?? '—'}
                    </span>{' '}
                    {stockModal?.item.unit || ''}
                  </p>

                  <div className='space-y-3'>
                    <div className='space-y-1.5'>
                      <label className='text-muted-foreground text-xs font-medium'>الكمية</label>
                      <Input
                        type='number'
                        value={stockQuantity}
                        onChange={(e) => setStockQuantity(e.target.value)}
                        placeholder='0'
                        min='1'
                        className='h-10'
                      />
                    </div>

                    {stockModal?.action === 'remove' && (
                      <div className='space-y-1.5'>
                        <label className='text-muted-foreground text-xs font-medium'>
                          المندوب (اختياري)
                        </label>
                        <Input
                          value={stockEmployeeId}
                          onChange={(e) => setStockEmployeeId(e.target.value)}
                          placeholder='اسم أو كود المندوب'
                          className='h-10'
                        />
                      </div>
                    )}

                    <div className='space-y-1.5'>
                      <label className='text-muted-foreground text-xs font-medium'>ملاحظات</label>
                      <Input
                        value={stockNotes}
                        onChange={(e) => setStockNotes(e.target.value)}
                        placeholder='ملاحظات'
                        className='h-10'
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className='gap-2'>
                  <Button variant='outline' onClick={() => setStockModal(null)}>
                    إلغاء
                  </Button>
                  <Button
                    onClick={() => {
                      if (!stockModal) return;
                      const qty = Number(stockQuantity);
                      if (!qty || qty <= 0) {
                        toast.error('يرجى إدخال كمية صحيحة');
                        return;
                      }
                      if (stockModal.action === 'add') {
                        addStockMut.mutate({
                          item_id: stockModal.item.id,
                          type: stockModal.item.type,
                          quantity: qty,
                          notes: stockNotes || undefined
                        });
                      } else {
                        removeStockMut.mutate({
                          item_id: stockModal.item.id,
                          type: stockModal.item.type,
                          quantity: qty,
                          employee_id: stockEmployeeId || undefined,
                          notes: stockNotes || undefined
                        });
                      }
                    }}
                    disabled={addStockMut.isPending || removeStockMut.isPending}
                    className={
                      stockModal?.action === 'add'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-rose-600 hover:bg-rose-700'
                    }
                  >
                    {addStockMut.isPending || removeStockMut.isPending ? (
                      <Icons.spinner className='size-4 animate-spin' />
                    ) : stockModal?.action === 'add' ? (
                      'إضافة'
                    ) : (
                      'صرف'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Barcode Scanner for Stock Modal */}
            {stockBarcodeScan && (
              <BarcodeScannerModal
                isOpen={stockBarcodeScan}
                onClose={() => setStockBarcodeScan(false)}
                onSelectEmployee={() => {
                  setStockBarcodeScan(false);
                }}
              />
            )}

            {/* Delete Confirmation Modal */}
            <Dialog
              open={deleteModalId !== null}
              onOpenChange={(open) => {
                if (!open) setDeleteModalId(null);
              }}
            >
              <DialogContent className='sm:max-w-sm'>
                <DialogHeader>
                  <DialogTitle className='flex items-center gap-2 text-red-600'>
                    <Icons.warning className='size-5' />
                    تأكيد الحذف
                  </DialogTitle>
                  <DialogDescription>
                    هل أنت متأكد من حذف هذا الصنف من المخزون؟ لا يمكن التراجع عن هذا الإجراء.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className='gap-2'>
                  <Button variant='outline' onClick={() => setDeleteModalId(null)}>
                    إلغاء
                  </Button>
                  <Button
                    variant='destructive'
                    onClick={() => deleteItemMut.mutate(deleteModalId!)}
                    disabled={deleteItemMut.isPending}
                  >
                    {deleteItemMut.isPending ? (
                      <Icons.spinner className='size-4 animate-spin' />
                    ) : (
                      <Icons.trash className='size-4' />
                    )}{' '}
                    تأكيد الحذف
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        {/* ============================ TAB 2: الحركات ============================ */}
        <TabsContent value='transactions'>
          <div className='space-y-4'>
            {/* Filter by item */}
            <Card>
              <CardContent className='flex flex-col items-stretch gap-3 p-4 sm:flex-row sm:items-center'>
                <label className='text-muted-foreground shrink-0 text-xs font-medium'>
                  تصفية حسب الصنف:
                </label>
                <Select
                  value={transItemFilter}
                  onValueChange={(v) => {
                    setTransItemFilter(v as string);
                    setTransPage(1);
                  }}
                >
                  <SelectTrigger className='h-10 min-w-[200px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>جميع الأصناف</SelectItem>
                    <SelectGroup>
                      {(allItemsQuery.data || []).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Transactions Table */}
            {transactionsQuery.isLoading ? (
              <TableSkeleton rows={8} />
            ) : !transactionsQuery.data?.data?.length ? (
              <Card className='p-10 text-center md:p-14'>
                <div className='bg-muted text-muted-foreground mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl'>
                  <Icons.history className='size-8' />
                </div>
                <CardTitle className='text-lg'>لا توجد حركات</CardTitle>
                <CardDescription className='mx-auto mt-1.5 max-w-xs'>
                  لا توجد حركات مخزون مسجلة حتى الآن.
                </CardDescription>
              </Card>
            ) : (
              <Card className='overflow-hidden'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-right'>التاريخ</TableHead>
                      <TableHead className='text-right'>الصنف</TableHead>
                      <TableHead className='text-center'>النوع</TableHead>
                      <TableHead className='text-center'>الكمية</TableHead>
                      <TableHead className='hidden text-right md:table-cell'>المندوب</TableHead>
                      <TableHead className='hidden text-right lg:table-cell'>ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsQuery.data.data.map((txn: InventoryTransaction) => (
                      <TableRow key={txn.id}>
                        <TableCell className='text-muted-foreground text-xs tabular-nums'>
                          {new Date(txn.created_at).toLocaleDateString('ar-SA', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className='font-bold'>{txn.item?.name || '—'}</TableCell>
                        <TableCell className='text-center'>
                          <Badge
                            variant={txn.type === 'in' ? 'default' : 'secondary'}
                            className={cn(
                              'gap-1 font-bold',
                              txn.type === 'in' && 'bg-green-600 hover:bg-green-700'
                            )}
                          >
                            {txn.type === 'in' ? (
                              <Icons.add className='size-3' />
                            ) : (
                              <Icons.minus className='size-3' />
                            )}
                            {txn.type === 'in' ? 'داخل' : 'خارج'}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-center font-bold tabular-nums'>
                          {txn.quantity}
                        </TableCell>
                        <TableCell className='hidden md:table-cell'>
                          {txn.employee?.name || '—'}
                        </TableCell>
                        <TableCell className='text-muted-foreground hidden max-w-[200px] truncate lg:table-cell'>
                          {txn.notes || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Transactions Pagination */}
                {transactionsQuery.data && (
                  <Pagination
                    page={transactionsQuery.data.page}
                    totalPages={transactionsQuery.data.total_pages || 1}
                    onPrev={() => setTransPage((p) => Math.max(1, p - 1))}
                    onNext={() => setTransPage((p) => p + 1)}
                  />
                )}
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  Pagination Sub-component                                           */
/* ------------------------------------------------------------------ */

function Pagination({
  page,
  totalPages,
  onPrev,
  onNext
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className='flex items-center justify-between gap-3 border-t p-4'>
      <span className='text-muted-foreground text-xs font-medium tabular-nums'>
        الصفحة {page} من {totalPages}
      </span>
      <div className='flex items-center gap-2'>
        <Button
          variant='outline'
          size='sm'
          disabled={page <= 1}
          onClick={onPrev}
          className='h-10 gap-1 text-xs font-bold'
        >
          <Icons.chevronRight className='size-4' />
          <span className='hidden sm:inline'>السابقة</span>
        </Button>
        <Button
          variant='outline'
          size='sm'
          disabled={page >= totalPages}
          onClick={onNext}
          className='h-10 gap-1 text-xs font-bold'
        >
          <span className='hidden sm:inline'>التالية</span>
          <Icons.chevronLeft className='size-4' />
        </Button>
      </div>
    </div>
  );
}
