'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/page-container';
import { useOfflineQuery } from '@/hooks/use-offline-query';
import { inventoryApi } from '@/lib/aams/services';
import type { InventoryItem, InventoryTransaction, PurchaseInvoice, PurchaseInvoiceItem } from '@/types/aams';
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
import { useLocale } from '@/components/layout/locale-provider';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';

type ItemTypeFilter = 'all' | 'oil' | 'spare_part';
type StockAction = 'add' | 'remove';

interface PurchaseFormRow {
  rowId: string;
  item_id: string;
  itemSearchQuery: string;
  quantity: string;
  unit_price: string;
  notes: string;
}

export default function InventoryPage() {
  const { dir } = useLocale();
  const [activeTab, setActiveTab] = useState('items');
  const [filter, setFilter] = useState<ItemTypeFilter>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [stockModal, setStockModal] = useState<{
    item: InventoryItem;
    action: StockAction;
  } | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  // Add Item form state - Default to 'spare_part' (قطع غيار) as requested
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('spare_part');
  const [formUnit, setFormUnit] = useState('');
  const [formMinAlert, setFormMinAlert] = useState('0');
  const [formNotes, setFormNotes] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Stock modal state
  const [stockQuantity, setStockQuantity] = useState('0');
  const [stockEmployeeId, setStockEmployeeId] = useState('');
  const [stockNotes, setStockNotes] = useState('');

  // Purchases state
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<PurchaseInvoice | null>(null);
  const [deletePurchaseId, setDeletePurchaseId] = useState<string | null>(null);

  // New Purchase Form state
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('percent');
  const [discountValue, setDiscountValue] = useState<string>('0');
  const [taxRate, setTaxRate] = useState<string>('14'); // Default VAT 14% or user customizable
  const [purchaseRows, setPurchaseRows] = useState<PurchaseFormRow[]>([
    { rowId: 'row-1', item_id: '', itemSearchQuery: '', quantity: '', unit_price: '', notes: '' }
  ]);

  // Transactions state
  const [transPage, setTransPage] = useState(1);
  const [transItemFilter, setTransItemFilter] = useState('all');

  const queryClient = useQueryClient();

  // Query: Inventory items (with filter)
  const itemsQuery = useOfflineQuery({
    queryKey: ['inventory-items', filter],
    queryFn: () => inventoryApi.getItems(filter === 'all' ? undefined : filter),
    cacheKey: `inventory_items_${filter}`
  });

  // Query: All items for selects / purchase creation
  const allItemsQuery = useOfflineQuery({
    queryKey: ['inventory-items', 'all'],
    queryFn: () => inventoryApi.getItems(),
    cacheKey: 'inventory_items_all'
  });

  // Query: Purchases
  const purchasesQuery = useOfflineQuery({
    queryKey: ['inventory-purchases', purchasePage, purchaseSearch],
    queryFn: () =>
      inventoryApi.getPurchases({
        page: purchasePage,
        limit: 15,
        search: purchaseSearch || undefined
      }),
    cacheKey: `inventory_purchases_${purchasePage}_${purchaseSearch}`
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

  // Mutations: Items
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
      setShowAddForm(false);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'حدث خطأ أثناء تعديل الصنف';
      toast.error(msg);
    }
  });

  const deleteItemMut = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteItem(id),
    onSuccess: () => {
      toast.success('تم حذف الصنف بنجاح');
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      setDeleteModalId(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'حدث خطأ أثناء حذف الصنف';
      toast.error(msg);
    }
  });

  // Mutations: Stock
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

  // Mutations: Purchases
  const createPurchaseMut = useMutation({
    mutationFn: (data: {
      invoice_number?: string;
      supplier_name: string;
      invoice_date?: string;
      subtotal?: number;
      discount?: number;
      tax_rate?: number;
      tax_amount?: number;
      total_amount?: number;
      notes?: string;
      items: {
        item_id: string;
        quantity: number;
        unit_price: number;
        notes?: string;
      }[];
    }) => inventoryApi.createPurchase(data),
    onSuccess: () => {
      toast.success('تم حفظ فاتورة المشتريات وترحيل الكميات للمخزن بنجاح');
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      resetPurchaseForm();
      setShowPurchaseModal(false);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'حدث خطأ أثناء حفظ فاتورة المشتريات';
      toast.error(msg);
    }
  });

  const deletePurchaseMut = useMutation({
    mutationFn: (id: string) => inventoryApi.deletePurchase(id),
    onSuccess: () => {
      toast.success('تم حذف فاتورة المشتريات بنجاح');
      queryClient.invalidateQueries({ queryKey: ['inventory-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      setDeletePurchaseId(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'حدث خطأ أثناء حذف الفاتورة';
      toast.error(msg);
    }
  });

  const resetAddForm = () => {
    setFormName('');
    setFormType('spare_part'); // Default to spare_part
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
      min_alert: Number(formMinAlert) || 0,
      notes: formNotes || undefined,
      barcode: formBarcode || undefined
    };

    if (editingItemId) {
      updateItemMut.mutate({ id: editingItemId, data });
    } else {
      createItemMut.mutate(data);
    }
  };

  // Purchase Form Handlers
  const resetPurchaseForm = () => {
    setSupplierName('');
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setInvoiceNotes('');
    setDiscountType('percent');
    setDiscountValue('0');
    setTaxRate('14');
    setPurchaseRows([
      { rowId: 'row-1', item_id: '', itemSearchQuery: '', quantity: '', unit_price: '', notes: '' }
    ]);
  };

  const addPurchaseRow = () => {
    const newRowId = `row-${Date.now()}-${Math.random()}`;
    setPurchaseRows((prev) => [
      ...prev,
      {
        rowId: newRowId,
        item_id: '',
        itemSearchQuery: '',
        quantity: '',
        unit_price: '',
        notes: ''
      }
    ]);
    setTimeout(() => {
      const searchEl = document.getElementById(`item-search-${newRowId}`);
      if (searchEl) searchEl.focus();
    }, 100);
  };

  const removePurchaseRow = (rowId: string) => {
    if (purchaseRows.length <= 1) {
      toast.error('يجب أن تحتوي الفاتورة على صنف واحد على الأقل');
      return;
    }
    setPurchaseRows((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  const updatePurchaseRow = (rowId: string, field: keyof PurchaseFormRow, value: string) => {
    setPurchaseRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r))
    );
  };

  // Select Item in a row with instant focus to Price, then Enter to Quantity
  const handleSelectItem = (rowId: string, item: InventoryItem) => {
    setPurchaseRows((prev) =>
      prev.map((r) =>
        r.rowId === rowId
          ? {
              ...r,
              item_id: item.id,
              itemSearchQuery: item.name
            }
          : r
      )
    );
    setTimeout(() => {
      const priceInput = document.getElementById(`price-input-${rowId}`);
      if (priceInput) {
        priceInput.focus();
      }
    }, 50);
  };

  // Calculations for purchase form with Discount & VAT %
  const subtotalAmount = purchaseRows.reduce((sum, r) => {
    const qty = Number(r.quantity) || 0;
    const price = Number(r.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const parsedDiscountVal = Number(discountValue) || 0;
  const calculatedDiscount =
    discountType === 'percent'
      ? (subtotalAmount * parsedDiscountVal) / 100
      : parsedDiscountVal;

  const afterDiscount = Math.max(0, subtotalAmount - calculatedDiscount);
  const parsedTaxRate = Number(taxRate) || 0;
  const calculatedTax = afterDiscount * (parsedTaxRate / 100);
  const grandTotalAmount = Math.max(0, afterDiscount + calculatedTax);

  const totalPurchaseItemsQty = purchaseRows.reduce((sum, r) => {
    return sum + (Number(r.quantity) || 0);
  }, 0);

  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      toast.error('يرجى إدخال اسم المورد');
      return;
    }

    const validItems = purchaseRows.filter((r) => r.item_id.trim() !== '');
    if (validItems.length === 0) {
      toast.error('يرجى اختيار صنف واحد على الأقل في الفاتورة');
      return;
    }

    for (const item of validItems) {
      const qty = Number(item.quantity);
      if (!qty || qty <= 0) {
        toast.error('يرجى كتابة كمية أكبر من صفر لكل صنف تم اختياره');
        return;
      }
    }

    createPurchaseMut.mutate({
      supplier_name: supplierName.trim(),
      invoice_number: invoiceNumber.trim() || undefined,
      invoice_date: invoiceDate ? new Date(invoiceDate).toISOString() : undefined,
      subtotal: subtotalAmount,
      discount: calculatedDiscount,
      tax_rate: parsedTaxRate,
      tax_amount: calculatedTax,
      total_amount: grandTotalAmount,
      notes: invoiceNotes.trim() || undefined,
      items: validItems.map((r) => ({
        item_id: r.item_id,
        quantity: Number(r.quantity),
        unit_price: Number(r.unit_price) || 0,
        notes: r.notes.trim() || undefined
      }))
    });
  };

  const filteredItems = itemsQuery.data || [];
  const allItems = allItemsQuery.data || [];
  const isFormSubmitting = createItemMut.isPending || updateItemMut.isPending;

  return (
    <PageContainer pageTitle='المخزن والمشتريات' pageDescription='إدارة الأصناف، تسجيل فواتير المشتريات، ومراقبة حركة الأرصدة'>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
        <TabsList className='mb-4 grid grid-cols-3 max-w-md'>
          <TabsTrigger value='items' className='flex items-center gap-1.5 font-bold'>
            <Icons.inventory className='size-4' /> الأصناف
          </TabsTrigger>
          <TabsTrigger value='purchases' className='flex items-center gap-1.5 font-bold'>
            <Icons.dollarSign className='size-4' /> فواتير المشتريات
          </TabsTrigger>
          <TabsTrigger value='transactions' className='flex items-center gap-1.5 font-bold'>
            <Icons.history className='size-4' /> الحركات
          </TabsTrigger>
        </TabsList>

        {/* ============================ TAB 1: الأصناف ============================ */}
        <TabsContent value='items'>
          <div className='space-y-4'>
            {/* Toolbar: filters + add button */}
            <div className='flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center'>
              <div className='bg-muted flex w-fit items-center gap-1.5 rounded-lg p-1'>
                {(
                  [
                    { value: 'all', label: 'الكل' },
                    { value: 'spare_part', label: 'قطع غيار' },
                    { value: 'oil', label: 'زيت' }
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
              <div className='flex items-center gap-2'>
                <Button
                  size='lg'
                  onClick={() => {
                    resetPurchaseForm();
                    setShowPurchaseModal(true);
                  }}
                  variant='outline'
                  className='h-11 gap-2 px-4 font-bold border-primary text-primary hover:bg-primary/10'
                >
                  <Icons.dollarSign className='size-5' />
                  فاتورة توريد مشتريات
                </Button>
                <Button
                  size='lg'
                  onClick={() => {
                    resetAddForm();
                    setEditingItemId(null);
                    setShowAddForm(true);
                  }}
                  className='h-11 gap-2 px-4 font-bold'
                >
                  <Icons.add className='size-5' />
                  إضافة صنف
                </Button>
              </div>
            </div>

            {/* Slide-over Sheet for Add / Edit Item (Modal on the left side in Arabic) */}
            <Sheet
              open={showAddForm}
              onOpenChange={(open) => {
                setShowAddForm(open);
                if (!open) {
                  setEditingItemId(null);
                  resetAddForm();
                }
              }}
            >
              <SheetContent
                side={dir === 'rtl' ? 'left' : 'right'}
                className='w-full sm:max-w-md overflow-y-auto flex flex-col'
                dir={dir}
              >
                <SheetHeader className='text-right'>
                  <SheetTitle className='text-lg font-bold flex items-center gap-2'>
                    {editingItemId ? (
                      <>
                        <Icons.edit className='size-5 text-primary' />
                        تعديل صنف
                      </>
                    ) : (
                      <>
                        <Icons.add className='size-5 text-primary' />
                        إضافة صنف جديد
                      </>
                    )}
                  </SheetTitle>
                  <SheetDescription className='text-xs'>
                    {editingItemId
                      ? 'تعديل تفاصيل وحقول الصنف المحدد بالمخزن.'
                      : 'أدخل بيانات الصنف الجديد لإضافته إلى قائمة أصناف المخزن.'}
                  </SheetDescription>
                </SheetHeader>

                <Separator className='my-2' />

                <form onSubmit={handleFormSubmit} className='flex-1 space-y-4 px-1 py-2 overflow-y-auto'>
                  <div className='space-y-1.5'>
                    <label className='text-muted-foreground text-xs font-medium'>
                      النوع <span className='text-destructive'>*</span>
                    </label>
                    <Select
                      value={formType}
                      onValueChange={(v) => setFormType(v || 'spare_part')}
                    >
                      <SelectTrigger className='h-10 w-full font-bold'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir={dir}>
                        <SelectItem value='spare_part'>قطع غيار (افتراضي)</SelectItem>
                        <SelectItem value='oil'>زيت</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-muted-foreground text-xs font-medium'>
                      الاسم <span className='text-destructive'>*</span>
                    </label>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder='اسم الصنف'
                      required
                      className='h-10'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-muted-foreground text-xs font-medium'>الوحدة</label>
                    <Input
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      placeholder='مثلاً: قطعة، لتر، طقم، علبة'
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
                  <div className='space-y-1.5'>
                    <label className='text-muted-foreground text-xs font-medium'>ملاحظات</label>
                    <Input
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder='ملاحظات إضافية'
                      className='h-10'
                    />
                  </div>
                  <div className='flex items-center gap-3 pt-4'>
                    <Button
                      type='submit'
                      size='lg'
                      disabled={isFormSubmitting}
                      className='h-11 flex-1 gap-2 px-6 font-bold'
                    >
                      {isFormSubmitting && <Icons.spinner className='size-4 animate-spin' />}
                      {editingItemId ? 'حفظ التعديلات' : 'إضافة الصنف'}
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
              </SheetContent>
            </Sheet>

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
                      <TableHead className='text-center'>الكمية المتوفرة</TableHead>
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
                            variant={item.type === 'spare_part' ? 'secondary' : 'default'}
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
                              'font-bold tabular-nums text-base',
                              (item.branch_quantity ?? 0) <= item.min_alert ? 'text-destructive' : 'text-foreground'
                            )}
                          >
                            {item.branch_quantity ?? 0}
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
                              title='إضافة مشتريات سريعة'
                              className='gap-1 text-xs font-bold text-green-600 hover:bg-muted hover:text-green-700'
                            >
                              <Icons.add className='size-[15px]' />
                              توريد
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

            {/* Quick Stock Modal (Add / Remove) */}
            <Dialog
              open={stockModal !== null}
              onOpenChange={(open) => {
                if (!open) setStockModal(null);
              }}
            >
              <DialogContent className='sm:max-w-md' dir={dir}>
                <DialogHeader>
                  <DialogTitle className='flex items-center gap-2'>
                    {stockModal?.action === 'add' ? (
                      <>
                        <Icons.plusCircle className='size-5 text-emerald-500' /> إضافة توريد مخزون
                      </>
                    ) : (
                      <>
                        <Icons.minus className='size-5 text-rose-500' /> صرف من المخزون
                      </>
                    )}
                  </DialogTitle>
                  <DialogDescription>
                    {stockModal?.action === 'add'
                      ? 'إضافة كمية جديدة إلى رصيد المخزون مباشرة'
                      : 'صرف كمية من المخزون إلى مندوب'}
                  </DialogDescription>
                </DialogHeader>
                <div className='space-y-4 py-2'>
                  <p className='text-foreground font-bold text-sm'>{stockModal?.item.name}</p>
                  <p className='text-muted-foreground text-xs'>
                    الرصيد الحالي:{' '}
                    <span
                      className={cn(
                        'font-bold tabular-nums',
                        stockModal?.item &&
                          (stockModal.item.branch_quantity ?? 0) <= stockModal.item.min_alert &&
                          'text-destructive'
                      )}
                    >
                      {stockModal?.item.branch_quantity ?? '0'}
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
                        ? 'bg-emerald-600 hover:bg-emerald-700 font-bold'
                        : 'bg-rose-600 hover:bg-rose-700 font-bold'
                    }
                  >
                    {addStockMut.isPending || removeStockMut.isPending ? (
                      <Icons.spinner className='size-4 animate-spin' />
                    ) : stockModal?.action === 'add' ? (
                      'تأكيد الإضافة'
                    ) : (
                      'تأكيد الصرف'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Item Confirmation Modal */}
            <Dialog
              open={deleteModalId !== null}
              onOpenChange={(open) => {
                if (!open) setDeleteModalId(null);
              }}
            >
              <DialogContent className='sm:max-w-sm' dir={dir}>
                <DialogHeader>
                  <DialogTitle className='flex items-center gap-2 text-destructive'>
                    <Icons.warning className='size-5' />
                    تأكيد حذف الصنف
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
                    className='font-bold'
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

        {/* ============================ TAB 2: فواتير المشتريات ============================ */}
        <TabsContent value='purchases'>
          <div className='space-y-4'>
            {/* Purchases Toolbar */}
            <div className='flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center'>
              <div className='relative w-full max-w-sm'>
                <Icons.search className='text-muted-foreground absolute right-3 top-3 size-4' />
                <Input
                  placeholder='بحث برقم الفاتورة أو اسم المورد...'
                  value={purchaseSearch}
                  onChange={(e) => {
                    setPurchaseSearch(e.target.value);
                    setPurchasePage(1);
                  }}
                  className='h-10 pr-9'
                />
              </div>
              <Button
                size='lg'
                onClick={() => {
                  resetPurchaseForm();
                  setShowPurchaseModal(true);
                }}
                className='h-11 gap-2 px-5 font-bold shadow-sm'
              >
                <Icons.add className='size-5' />
                فاتورة مشتريات جديدة
              </Button>
            </div>

            {/* Purchases Table */}
            {purchasesQuery.isLoading ? (
              <TableSkeleton rows={6} />
            ) : !purchasesQuery.data?.data?.length ? (
              <Card className='p-10 text-center md:p-14'>
                <div className='bg-muted text-muted-foreground mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl'>
                  <Icons.dollarSign className='size-8' />
                </div>
                <CardTitle className='text-lg'>لا توجد فواتير مشتريات</CardTitle>
                <CardDescription className='mx-auto mt-1.5 max-w-xs'>
                  سجل أول فاتورة مشتريات وترحيل كمياتها إلى المخزن مباشرة.
                </CardDescription>
                <Button
                  onClick={() => {
                    resetPurchaseForm();
                    setShowPurchaseModal(true);
                  }}
                  className='mt-4 gap-2 font-bold'
                >
                  <Icons.add className='size-4' />
                  إضافة فاتورة مشتريات
                </Button>
              </Card>
            ) : (
              <Card className='overflow-hidden'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-right'>رقم الفاتورة</TableHead>
                      <TableHead className='text-right'>المورد</TableHead>
                      <TableHead className='text-right'>تاريخ الفاتورة</TableHead>
                      <TableHead className='text-center'>عدد البنود</TableHead>
                      <TableHead className='text-right'>الإجمالي قبل الخصم</TableHead>
                      <TableHead className='text-right'>الخصم / الضريبة</TableHead>
                      <TableHead className='text-right'>صافي الفاتورة النهائي</TableHead>
                      <TableHead className='hidden text-right md:table-cell'>المسؤول</TableHead>
                      <TableHead className='text-center'>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchasesQuery.data.data.map((inv: PurchaseInvoice) => (
                      <TableRow key={inv.id}>
                        <TableCell className='font-mono font-bold text-primary'>
                          {inv.invoice_number}
                        </TableCell>
                        <TableCell className='font-bold'>{inv.supplier_name}</TableCell>
                        <TableCell className='text-muted-foreground text-xs tabular-nums'>
                          {new Date(inv.invoice_date || inv.created_at).toLocaleDateString('ar-SA', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell className='text-center font-bold tabular-nums'>
                          <Badge variant='outline' className='font-mono'>
                            {inv.items?.length || 0} أصناف
                          </Badge>
                        </TableCell>
                        <TableCell className='text-muted-foreground text-xs font-mono tabular-nums'>
                          {Number(inv.subtotal || inv.total_amount || 0).toLocaleString('ar-SA', {
                            minimumFractionDigits: 2
                          })}
                        </TableCell>
                        <TableCell className='text-xs tabular-nums'>
                          {inv.discount > 0 && (
                            <span className='text-rose-500 font-bold block'>
                              - {Number(inv.discount).toLocaleString('ar-SA')} خصم
                            </span>
                          )}
                          {inv.tax_amount > 0 && (
                            <span className='text-blue-500 font-medium block'>
                              + {Number(inv.tax_amount).toLocaleString('ar-SA')} ضريبة ({inv.tax_rate}%)
                            </span>
                          )}
                          {!inv.discount && !inv.tax_amount && <span className='text-muted-foreground'>—</span>}
                        </TableCell>
                        <TableCell className='font-bold tabular-nums text-emerald-600 dark:text-emerald-400 font-mono text-base'>
                          {Number(inv.total_amount || 0).toLocaleString('ar-SA', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </TableCell>
                        <TableCell className='hidden text-xs text-muted-foreground md:table-cell'>
                          {inv.created_by_name || '—'}
                        </TableCell>
                        <TableCell className='text-center'>
                          <div className='flex items-center justify-center gap-1'>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => setSelectedInvoiceForView(inv)}
                              className='gap-1 text-xs font-bold text-primary hover:bg-primary/10'
                              title='عرض تفاصيل الفاتورة'
                            >
                              <Icons.eye className='size-4' />
                              عرض
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={() => setDeletePurchaseId(inv.id)}
                              aria-label='حذف'
                              title='حذف الفاتورة'
                              className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                            >
                              <Icons.trash className='size-4' />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Purchases Pagination */}
                {purchasesQuery.data && (
                  <Pagination
                    page={purchasesQuery.data.page}
                    totalPages={purchasesQuery.data.total_pages || 1}
                    onPrev={() => setPurchasePage((p) => Math.max(1, p - 1))}
                    onNext={() => setPurchasePage((p) => p + 1)}
                  />
                )}
              </Card>
            )}

            {/* ==================== CREATE PURCHASE INVOICE MODAL ==================== */}
            <Sheet
              open={showPurchaseModal}
              onOpenChange={(open) => {
                setShowPurchaseModal(open);
                if (!open) resetPurchaseForm();
              }}
            >
              <SheetContent
                side={dir === 'rtl' ? 'left' : 'right'}
                className='w-full sm:max-w-3xl overflow-y-auto flex flex-col p-6'
                dir={dir}
              >
                <SheetHeader className='text-right pb-2'>
                  <SheetTitle className='text-xl font-bold flex items-center gap-2 text-primary'>
                    <Icons.dollarSign className='size-6' />
                    فاتورة مشتريات وتوريد مخزون جديدة
                  </SheetTitle>
                  <SheetDescription className='text-xs'>
                    أدخل تفاصيل الفاتورة، ابحث عن الأصناف بالأحرف الأولى، وسجل السعر والكمية والخصم والضريبة.
                  </SheetDescription>
                </SheetHeader>

                <Separator />

                <form onSubmit={handlePurchaseSubmit} className='flex-1 space-y-5 py-3 overflow-y-auto'>
                  {/* Invoice Header details */}
                  <div className='grid grid-cols-1 gap-3 sm:grid-cols-3 bg-muted/40 p-3.5 rounded-xl border'>
                    <div className='space-y-1.5'>
                      <label className='text-foreground text-xs font-semibold'>
                        اسم المورد / الشركة <span className='text-destructive'>*</span>
                      </label>
                      <Input
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        placeholder='مثال: شركة الزيوت والقطع'
                        required
                        className='h-10 bg-background font-medium'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <label className='text-foreground text-xs font-semibold'>
                        رقم الفاتورة (اختياري)
                      </label>
                      <Input
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder='تلقائي في حال تركه فارغاً'
                        className='h-10 font-mono bg-background'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <label className='text-foreground text-xs font-semibold'>تاريخ الفاتورة</label>
                      <Input
                        type='date'
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className='h-10 bg-background'
                      />
                    </div>
                    <div className='sm:col-span-3 space-y-1.5'>
                      <label className='text-muted-foreground text-xs font-medium'>ملاحظات عامة</label>
                      <Input
                        value={invoiceNotes}
                        onChange={(e) => setInvoiceNotes(e.target.value)}
                        placeholder='ملاحظات عامة عن الفاتورة أو التوريد'
                        className='h-10 bg-background'
                      />
                    </div>
                  </div>

                  {/* Items Repeater Section with Fast Autocomplete & Focus Flow */}
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <h4 className='text-sm font-bold flex items-center gap-1.5 text-foreground'>
                          <Icons.inventory className='size-4 text-primary' />
                          بنود الأصناف في الفاتورة
                        </h4>
                        <p className='text-muted-foreground text-[11px] mt-0.5'>
                          اكتب أول حروف اسم الصنف للبحث، ثم اضغط Enter للتنقل الفوري بين السعر والكمية.
                        </p>
                      </div>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={addPurchaseRow}
                        className='h-8 gap-1.5 text-xs font-bold text-primary border-primary hover:bg-primary/10'
                      >
                        <Icons.add className='size-3.5' />
                        إضافة صنف آخر
                      </Button>
                    </div>

                    <div className='space-y-3'>
                      {purchaseRows.map((row, idx) => {
                        const selectedItemObj = allItems.find((i) => i.id === row.item_id);
                        const rowQty = Number(row.quantity) || 0;
                        const rowPrice = Number(row.unit_price) || 0;
                        const rowTotal = rowQty * rowPrice;

                        // Filter matching items by query
                        const matchingItems = row.itemSearchQuery.trim()
                          ? allItems.filter((itm) =>
                              itm.name.toLowerCase().includes(row.itemSearchQuery.toLowerCase()) ||
                              (itm.barcode && itm.barcode.includes(row.itemSearchQuery))
                            )
                          : allItems;

                        return (
                          <div
                            key={row.rowId}
                            className='relative rounded-xl border bg-card p-3.5 shadow-xs space-y-3'
                          >
                            <div className='flex items-center justify-between text-xs font-bold text-muted-foreground pb-1.5 border-b'>
                              <span className='flex items-center gap-1.5'>
                                <Badge variant='outline' className='font-mono text-xs'>
                                  بند #{idx + 1}
                                </Badge>
                                {selectedItemObj && (
                                  <Badge variant='secondary' className='text-xs font-normal'>
                                    {selectedItemObj.type === 'spare_part' ? 'قطع غيار' : 'زيت'} - الرصيد الحالي: {selectedItemObj.branch_quantity ?? 0} {selectedItemObj.unit}
                                  </Badge>
                                )}
                              </span>
                              {purchaseRows.length > 1 && (
                                <button
                                  type='button'
                                  onClick={() => removePurchaseRow(row.rowId)}
                                  className='text-destructive hover:underline text-xs flex items-center gap-1 font-semibold'
                                >
                                  <Icons.trash className='size-3.5' />
                                  حذف البند
                                </button>
                              )}
                            </div>

                            <div className='grid grid-cols-1 gap-3 sm:grid-cols-12 items-end'>
                              {/* Search & Select Item Box */}
                              <div className='sm:col-span-5 space-y-1 relative'>
                                <label className='text-muted-foreground text-xs font-medium'>
                                  بحث واختيار الصنف <span className='text-destructive'>*</span>
                                </label>
                                <div className='relative'>
                                  <Input
                                    id={`item-search-${row.rowId}`}
                                    value={row.itemSearchQuery}
                                    onChange={(e) => {
                                      updatePurchaseRow(row.rowId, 'itemSearchQuery', e.target.value);
                                      if (!e.target.value) {
                                        updatePurchaseRow(row.rowId, 'item_id', '');
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (matchingItems.length > 0) {
                                          handleSelectItem(row.rowId, matchingItems[0]);
                                        }
                                      }
                                    }}
                                    placeholder='اكتب اسم الصنف أو الباركود...'
                                    className='h-10 pr-3 font-medium'
                                  />
                                </div>

                                {/* Autocomplete dropdown when searching and item not locked */}
                                {row.itemSearchQuery.trim() !== '' && (!selectedItemObj || selectedItemObj.name !== row.itemSearchQuery) && (
                                  <div className='absolute z-50 top-full right-0 left-0 mt-1 max-h-48 overflow-y-auto rounded-lg border bg-popover text-popover-foreground shadow-lg p-1'>
                                    {matchingItems.length === 0 ? (
                                      <div className='p-2.5 text-xs text-muted-foreground text-center'>
                                        لا يوجد صنف مطابق &quot;{row.itemSearchQuery}&quot;
                                      </div>
                                    ) : (
                                      matchingItems.map((itm) => (
                                        <div
                                          key={itm.id}
                                          onClick={() => handleSelectItem(row.rowId, itm)}
                                          className='flex items-center justify-between p-2 rounded cursor-pointer hover:bg-accent text-xs font-medium transition-colors'
                                        >
                                          <span>
                                            <strong className='text-foreground'>{itm.name}</strong>
                                            <span className='text-muted-foreground mr-1.5 text-[11px]'>
                                              ({itm.type === 'spare_part' ? 'قطع غيار' : 'زيت'})
                                            </span>
                                          </span>
                                          <Badge variant='outline' className='text-[10px] font-mono'>
                                            رصيد: {itm.branch_quantity ?? 0} {itm.unit}
                                          </Badge>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Unit Price (Price appears / editable upon selection) */}
                              <div className='sm:col-span-2 space-y-1'>
                                <label className='text-muted-foreground text-xs font-medium'>
                                  سعر الوحدة
                                </label>
                                <Input
                                  id={`price-input-${row.rowId}`}
                                  type='number'
                                  min='0'
                                  step='0.01'
                                  placeholder='0'
                                  value={row.unit_price}
                                  onChange={(e) => updatePurchaseRow(row.rowId, 'unit_price', e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const qtyEl = document.getElementById(`qty-input-${row.rowId}`);
                                      if (qtyEl) qtyEl.focus();
                                    }
                                  }}
                                  className='h-10 text-center font-bold font-mono'
                                />
                              </div>

                              {/* Quantity (Defaults to 0/empty until typed) */}
                              <div className='sm:col-span-2 space-y-1'>
                                <label className='text-muted-foreground text-xs font-medium'>
                                  الكمية {selectedItemObj?.unit ? `(${selectedItemObj.unit})` : ''} <span className='text-destructive'>*</span>
                                </label>
                                <Input
                                  id={`qty-input-${row.rowId}`}
                                  type='number'
                                  min='0'
                                  placeholder='0'
                                  value={row.quantity}
                                  onChange={(e) => updatePurchaseRow(row.rowId, 'quantity', e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      addPurchaseRow();
                                    }
                                  }}
                                  className='h-10 text-center font-bold font-mono'
                                />
                              </div>

                              {/* Row Subtotal */}
                              <div className='sm:col-span-3 space-y-1'>
                                <label className='text-muted-foreground text-xs font-medium'>
                                  الإجمالي الفرعي
                                </label>
                                <div className='h-10 flex items-center justify-center rounded-md bg-muted font-bold font-mono text-sm text-foreground border'>
                                  {rowTotal.toLocaleString('ar-SA', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Financial Adjustments: Discount & VAT */}
                  <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 bg-muted/40 p-3.5 rounded-xl border'>
                    {/* Discount */}
                    <div className='space-y-1.5'>
                      <div className='flex items-center justify-between'>
                        <label className='text-foreground text-xs font-bold flex items-center gap-1'>
                          <Icons.dollarSign className='size-3.5 text-rose-500' />
                          الخصم على الفاتورة
                        </label>
                        <div className='flex items-center gap-1 text-[11px]'>
                          <button
                            type='button'
                            onClick={() => setDiscountType('percent')}
                            className={cn(
                              'px-2 py-0.5 rounded font-bold transition-all',
                              discountType === 'percent'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            نسبة %
                          </button>
                          <button
                            type='button'
                            onClick={() => setDiscountType('fixed')}
                            className={cn(
                              'px-2 py-0.5 rounded font-bold transition-all',
                              discountType === 'fixed'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            مبلغ ثابت
                          </button>
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Input
                          type='number'
                          min='0'
                          step='0.01'
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          placeholder='0'
                          className='h-10 font-mono font-bold bg-background'
                        />
                        <span className='text-xs font-bold text-rose-500 whitespace-nowrap'>
                          {discountType === 'percent' ? `% (- ${calculatedDiscount.toLocaleString('ar-SA', { maximumFractionDigits: 2 })})` : 'مبلغ الخصم'}
                        </span>
                      </div>
                    </div>

                    {/* VAT % */}
                    <div className='space-y-1.5'>
                      <label className='text-foreground text-xs font-bold flex items-center gap-1'>
                        <Icons.help className='size-3.5 text-blue-500' />
                        ضريبة القيمة المضافة (VAT %)
                      </label>
                      <div className='flex items-center gap-2'>
                        <Input
                          type='number'
                          min='0'
                          max='100'
                          step='0.5'
                          value={taxRate}
                          onChange={(e) => setTaxRate(e.target.value)}
                          placeholder='0'
                          className='h-10 font-mono font-bold bg-background'
                        />
                        <span className='text-xs font-bold text-blue-500 whitespace-nowrap'>
                          (+ {calculatedTax.toLocaleString('ar-SA', { maximumFractionDigits: 2 })})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Detailed Invoice Summary Card */}
                  <div className='bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3'>
                    <div className='grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 border-b pb-3'>
                      <div>
                        <span className='text-muted-foreground block text-[11px]'>عدد البنود:</span>
                        <span className='font-bold text-sm'>{purchaseRows.length} صنف</span>
                      </div>
                      <div>
                        <span className='text-muted-foreground block text-[11px]'>إجمالي القطع:</span>
                        <span className='font-bold text-sm'>{totalPurchaseItemsQty} وحدة</span>
                      </div>
                      <div>
                        <span className='text-muted-foreground block text-[11px]'>إجمالي الأصناف:</span>
                        <span className='font-bold text-sm font-mono'>
                          {subtotalAmount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className='text-muted-foreground block text-[11px]'>الخصم والضريبة:</span>
                        <span className='font-bold text-sm font-mono text-muted-foreground'>
                          - {calculatedDiscount.toLocaleString('ar-SA', { maximumFractionDigits: 2 })} / + {calculatedTax.toLocaleString('ar-SA', { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className='flex items-center justify-between pt-1'>
                      <span className='text-foreground text-sm font-bold'>
                        صافي إجمالي الفاتورة النهائي المستحق:
                      </span>
                      <span className='text-2xl sm:text-3xl font-black text-primary font-mono tabular-nums'>
                        {grandTotalAmount.toLocaleString('ar-SA', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className='flex items-center gap-3 pt-2'>
                    <Button
                      type='submit'
                      size='lg'
                      disabled={createPurchaseMut.isPending}
                      className='h-12 flex-1 gap-2 font-bold text-base shadow-md'
                    >
                      {createPurchaseMut.isPending ? (
                        <Icons.spinner className='size-5 animate-spin' />
                      ) : (
                        <Icons.save className='size-5' />
                      )}
                      حفظ وترحيل الفاتورة للمخزن
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='lg'
                      onClick={() => {
                        setShowPurchaseModal(false);
                        resetPurchaseForm();
                      }}
                      className='h-12 px-6 font-bold'
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              </SheetContent>
            </Sheet>

            {/* ==================== VIEW PURCHASE INVOICE DETAILS MODAL ==================== */}
            <Dialog
              open={selectedInvoiceForView !== null}
              onOpenChange={(open) => {
                if (!open) setSelectedInvoiceForView(null);
              }}
            >
              <DialogContent className='sm:max-w-2xl overflow-y-auto max-h-[90vh]' dir={dir}>
                <DialogHeader className='text-right pb-2 border-b'>
                  <div className='flex items-center justify-between'>
                    <DialogTitle className='text-lg font-bold flex items-center gap-2 text-primary'>
                      <Icons.dollarSign className='size-5' />
                      تفاصيل فاتورة مشتريات #{selectedInvoiceForView?.invoice_number}
                    </DialogTitle>
                    <Badge variant='outline' className='font-mono'>
                      {new Date(selectedInvoiceForView?.invoice_date || selectedInvoiceForView?.created_at || '').toLocaleDateString('ar-SA')}
                    </Badge>
                  </div>
                  <DialogDescription className='text-xs'>
                    المورد: <strong className='text-foreground'>{selectedInvoiceForView?.supplier_name}</strong> | المسجل: {selectedInvoiceForView?.created_by_name || '—'}
                  </DialogDescription>
                </DialogHeader>

                <div className='space-y-4 py-2'>
                  {selectedInvoiceForView?.notes && (
                    <div className='bg-muted/50 p-2.5 rounded text-xs text-muted-foreground'>
                      <strong>ملاحظات:</strong> {selectedInvoiceForView.notes}
                    </div>
                  )}

                  <div className='rounded-lg border overflow-hidden'>
                    <Table>
                      <TableHeader>
                        <TableRow className='bg-muted/50'>
                          <TableHead className='text-right font-bold'>#</TableHead>
                          <TableHead className='text-right font-bold'>الصنف</TableHead>
                          <TableHead className='text-center font-bold'>الكمية</TableHead>
                          <TableHead className='text-center font-bold'>سعر الوحدة</TableHead>
                          <TableHead className='text-left font-bold'>الإجمالي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(selectedInvoiceForView?.items || []).map((item: PurchaseInvoiceItem, index: number) => (
                          <TableRow key={item.id}>
                            <TableCell className='text-muted-foreground text-xs'>{index + 1}</TableCell>
                            <TableCell className='font-bold'>
                              {item.item?.name || 'صنف غير معروف'}
                              {item.item?.unit && (
                                <span className='text-muted-foreground text-xs mr-1 font-normal'>
                                  ({item.item.unit})
                                </span>
                              )}
                            </TableCell>
                            <TableCell className='text-center font-bold tabular-nums'>
                              {item.quantity}
                            </TableCell>
                            <TableCell className='text-center font-mono tabular-nums'>
                              {Number(item.unit_price || 0).toLocaleString('ar-SA', {
                                minimumFractionDigits: 2
                              })}
                            </TableCell>
                            <TableCell className='text-left font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums'>
                              {Number(item.total_price || (item.quantity * item.unit_price) || 0).toLocaleString('ar-SA', {
                                minimumFractionDigits: 2
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Summary Totals with Discount & Tax */}
                  <div className='space-y-2 p-4 rounded-xl bg-muted/60 border text-xs'>
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>إجمالي الأصناف:</span>
                      <span className='font-mono font-bold'>
                        {Number(selectedInvoiceForView?.subtotal || selectedInvoiceForView?.total_amount || 0).toLocaleString('ar-SA', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </div>

                    {(selectedInvoiceForView?.discount ?? 0) > 0 && (
                      <div className='flex items-center justify-between text-rose-500 font-bold'>
                        <span>الخصم:</span>
                        <span className='font-mono'>
                          - {Number(selectedInvoiceForView?.discount).toLocaleString('ar-SA', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>
                    )}

                    {(selectedInvoiceForView?.tax_amount ?? 0) > 0 && (
                      <div className='flex items-center justify-between text-blue-500 font-medium'>
                        <span>ضريبة القيمة المضافة ({selectedInvoiceForView?.tax_rate}%):</span>
                        <span className='font-mono font-bold'>
                          + {Number(selectedInvoiceForView?.tax_amount).toLocaleString('ar-SA', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>
                    )}

                    <Separator className='my-1' />

                    <div className='flex items-center justify-between text-sm font-bold'>
                      <span>صافي إجمالي الفاتورة النهائي:</span>
                      <span className='text-xl font-black text-primary font-mono'>
                        {Number(selectedInvoiceForView?.total_amount || 0).toLocaleString('ar-SA', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <DialogFooter className='gap-2'>
                  <Button
                    variant='outline'
                    onClick={() => {
                      window.print();
                    }}
                    className='gap-2 font-bold'
                  >
                    <Icons.printer className='size-4' />
                    طباعة
                  </Button>
                  <Button onClick={() => setSelectedInvoiceForView(null)} className='font-bold'>
                    إغلاق
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Purchase Invoice Confirmation Modal */}
            <Dialog
              open={deletePurchaseId !== null}
              onOpenChange={(open) => {
                if (!open) setDeletePurchaseId(null);
              }}
            >
              <DialogContent className='sm:max-w-sm' dir={dir}>
                <DialogHeader>
                  <DialogTitle className='flex items-center gap-2 text-destructive'>
                    <Icons.warning className='size-5' />
                    تأكيد حذف الفاتورة
                  </DialogTitle>
                  <DialogDescription>
                    هل أنت متأكد من حذف فاتورة المشتريات هذه؟
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className='gap-2'>
                  <Button variant='outline' onClick={() => setDeletePurchaseId(null)}>
                    إلغاء
                  </Button>
                  <Button
                    variant='destructive'
                    onClick={() => deletePurchaseMut.mutate(deletePurchaseId!)}
                    disabled={deletePurchaseMut.isPending}
                    className='font-bold'
                  >
                    {deletePurchaseMut.isPending ? (
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

        {/* ============================ TAB 3: الحركات ============================ */}
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
                    setTransItemFilter(v || 'all');
                    setTransPage(1);
                  }}
                >
                  <SelectTrigger className='h-10 min-w-[200px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir={dir}>
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
                      <TableHead className='hidden text-right md:table-cell'>المندوب / المصدر</TableHead>
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
                            {txn.type === 'in' ? 'توريد / داخل' : 'صرف / خارج'}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-center font-bold tabular-nums'>
                          {txn.quantity}
                        </TableCell>
                        <TableCell className='hidden md:table-cell'>
                          {txn.employee?.name || 'توريد مخزن'}
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
