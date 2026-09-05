'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { employeeApi, investigationApi } from '@/lib/aams/services';
import { getAdminUser } from '@/lib/aams/auth';
import type { Employee, InvestigationResponse } from '@/types/aams';
import { Icons } from '@/components/icons';
import { useLocale } from '@/components/layout/locale-provider';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatRiyadh } from '@/lib/aams/riyadh-time';
import { QRCodeImage } from '@/components/aams/employee-codes';
import {
  QrCode,
  ShieldCheck,
  Loader2,
  Image as ImageIcon,
  Camera,
  Users,
  User,
  Check,
  X,
  Plus,
  Calendar
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';

// Template types
const TEMPLATES = [
  {
    key: 'supervisor_report',
    label: 'تقرير مشرف',
    icon: Icons.fileText,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30'
  },
  {
    key: 'advance',
    label: 'سلفة',
    icon: Icons.dollarSign,
    color: 'text-green-600 bg-green-50 dark:bg-green-950/30'
  },
  {
    key: 'internet_advance',
    label: 'سلفة انترنت',
    icon: Icons.wifi,
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30'
  },
  {
    key: 'absence',
    label: 'متابعة غياب',
    icon: Icons.calendar,
    color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30'
  },
  {
    key: 'custody',
    label: 'استلام عهدة',
    icon: Icons.inventory,
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
  }
];

const TEMPLATE_LABELS: Record<string, string> = {};
TEMPLATES.forEach((t) => (TEMPLATE_LABELS[t.key] = t.label));

function formatDate(d: string | null) {
  if (!d) return '';
  return formatRiyadh(new Date(d), 'yyyy/MM/dd');
}

function formatReportDate(d: string | null | undefined) {
  if (!d) {
    const now = new Date();
    return `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
  }
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}`;
  } catch {
    return d;
  }
}

// Extract employees for group reports
export function parseDocEmployees(
  inv: InvestigationResponse | null | undefined
): Array<{ name: string; national_id: string }> {
  if (!inv) return [];

  // Check if items contain JSON serialized employee objects
  if (inv.items && inv.items.length > 0 && inv.type !== 'custody') {
    const list: Array<{ name: string; national_id: string }> = [];
    for (const it of inv.items) {
      try {
        const parsed = JSON.parse(it);
        if (parsed && (parsed.name || parsed.national_id)) {
          list.push({
            name: parsed.name || '—',
            national_id: parsed.national_id || '—'
          });
        }
      } catch {
        // Not JSON
      }
    }
    if (list.length > 0) return list;
  }

  // Check if employee_name has multiple comma-separated names
  if (inv.employee_name && (inv.employee_name.includes(' ، ') || inv.employee_name.includes(','))) {
    const names = inv.employee_name.split(/ ، |,/);
    const nats = (inv.national_id || '').split(/ ، |,/);
    return names.map((name, i) => ({
      name: name.trim(),
      national_id: (nats[i] || '').trim() || '—'
    }));
  }

  // Single employee fallback
  return [
    {
      name: inv.employee_name || '—',
      national_id: inv.national_id || '—'
    }
  ];
}

// تحويل "YYYY-MM" إلى "MM/YYYY" (أرقام فقط)
function formatDeductionMonth(value?: string | null) {
  if (!value) return '';
  const [year, month] = value.split('-');
  if (!year || !month) return value;
  return `${month}/${year}`;
}

// Render text with **bold** markdown support
function renderBoldText(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className='font-black text-gray-900'>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// حالة الموافقة/الرفض للسلفة وسلفة النت (عرض فقط)
function ApprovalStatus({ inv }: { inv: InvestigationResponse }) {
  const isAdvance = inv.type === 'advance' || inv.type === 'internet_advance';
  if (!isAdvance) return null;

  const status = inv.status || 'pending';
  const statusLabel =
    status === 'approved' ? 'موافق عليه' : status === 'rejected' ? 'مرفوض' : 'قيد الانتظار';
  const statusColor =
    status === 'approved'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
      : status === 'rejected'
        ? 'bg-rose-100 text-rose-700 border-rose-300'
        : 'bg-amber-100 text-amber-700 border-amber-300';

  const byName =
    status === 'approved'
      ? inv.approved_by_name
      : status === 'rejected'
        ? inv.rejected_by_name
        : '';
  const at =
    status === 'approved' ? inv.approved_at : status === 'rejected' ? inv.rejected_at : null;

  return (
    <div className='mt-2 flex flex-wrap items-center gap-2' onClick={(e) => e.stopPropagation()}>
      <Badge variant='outline' className={cn('rounded-lg border text-xs font-bold', statusColor)}>
        {statusLabel}
      </Badge>
      {byName && (
        <span className='text-muted-foreground text-xs'>
          بواسطة: {byName}
          {at ? ` - ${formatRiyadh(new Date(at), 'yyyy/MM/dd hh:mm a')}` : ''}
        </span>
      )}
    </div>
  );
}

export interface InvestigationPageContentProps {
  investigationType: string;
  viewId?: string;
}

export function InvestigationPageContent({
  investigationType,
  viewId
}: InvestigationPageContentProps) {
  const router = useRouter();
  const { t, dir } = useLocale();
  const currentAdmin = useMemo(() => getAdminUser(), []);

  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [viewMode, setViewMode] = useState<'new' | 'list'>('list');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [printTarget, setPrintTarget] = useState<InvestigationResponse | null>(null);
  const [viewTarget, setViewTarget] = useState<InvestigationResponse | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedType, setSelectedType] = useState(investigationType);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeName, setEmployeeName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const [questions, setQuestions] = useState<string[]>(['']);
  const [answers, setAnswers] = useState<string[]>(['']);
  const [isGuilty, setIsGuilty] = useState<boolean | null>(null);
  const [reportText, setReportText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [items, setItems] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');
  const [deductionMonth, setDeductionMonth] = useState('');

  const resetTypeState = () => {
    setQuestions(['']);
    setAnswers(['']);
    setIsGuilty(null);
    setReportText('');
    setImages([]);
    setAmount('');
    setStartDate('');
    setEndDate('');
    setItems(['']);
    setNotes('');
    setDeductionMonth('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error('يرجى اختيار ملفات صور فقط');
        return;
      }
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const result = loadEvent.target?.result as string;
        if (result) {
          setImages((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Search employees
  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ['employee-search', employeeSearch],
    queryFn: () => employeeApi.search(employeeSearch),
    enabled: employeeSearch.length >= 2 && (!selectedEmployee || isBulkMode),
    staleTime: 10000
  });

  const { data: investigations, isLoading: loadingList } = useQuery({
    queryKey: ['investigations'],
    queryFn: () => investigationApi.getAll(),
    enabled: viewMode === 'list' || !!printTarget || !!viewId,
    staleTime: 5000,
    refetchInterval: 8000,
    refetchOnWindowFocus: true
  });

  // فتح تقرير محدد من الرابط (uuid في الـ URL)
  useEffect(() => {
    if (viewId && investigations) {
      const found = investigations.find((inv) => inv.id === viewId);
      if (found) {
        setViewTarget(found);
        setEditingId(found.id);
        setSelectedType(found.type);
        setEmployeeName(found.employee_name || '');
        setNationalId(found.national_id || '');
        setSelectedEmployee({
          id: found.employee_id,
          name: found.employee_name,
          national_id: found.national_id
        } as any);
        setQuestions(found.questions && found.questions.length > 0 ? found.questions : ['']);
        setAnswers(found.answers && found.answers.length > 0 ? found.answers : ['']);
        setIsGuilty(found.is_guilty ?? null);
        setReportText(found.report_text || '');
        setImages(found.images && found.images.length > 0 ? found.images : []);
        setAmount(found.amount != null ? String(found.amount) : '');
        setStartDate(found.start_date ? found.start_date.split('T')[0] : '');
        setEndDate(found.end_date ? found.end_date.split('T')[0] : '');
        setItems(found.items && found.items.length > 0 ? found.items : ['']);
        setNotes(found.notes || '');
        setDeductionMonth(found.deduction_month || '');
      }
    }
  }, [viewId, investigations]);

  // Open photo lightbox if ?photos=1 is in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('photos') === '1') {
        const targetImgs = viewTarget?.images || images;
        if (targetImgs && targetImgs.length > 0) {
          setViewingImage(targetImgs[0]);
        }
      }
    }
  }, [viewTarget, images]);

  const mutation = useMutation({
    mutationFn: async () => {
      const baseData: any = {
        type: selectedType,
        images: images.filter(Boolean),
        notes
      };

      if (selectedType === 'investigation') {
        baseData.is_guilty = isGuilty!;
        baseData.questions = questions.filter((q) => q.trim() !== '');
        baseData.answers = answers.filter((a) => a.trim() !== '');
      } else if (selectedType === 'supervisor_report' || selectedType === 'absence') {
        baseData.report_text = reportText;
        if (selectedType === 'absence') {
          baseData.start_date = startDate;
          baseData.end_date = endDate;
        }
      } else if (selectedType === 'advance' || selectedType === 'internet_advance') {
        baseData.amount = amount ? parseFloat(amount) : null;
        if (selectedType === 'internet_advance') {
          baseData.deduction_month = deductionMonth;
        }
      } else if (selectedType === 'custody') {
        baseData.items = items.filter((i) => i.trim() !== '');
      }

      if (editingId) {
        return investigationApi.update(editingId, {
          ...baseData,
          employee_id: selectedEmployee?.id || (viewTarget ? viewTarget.employee_id : undefined),
          employee_name:
            employeeName ||
            selectedEmployee?.name ||
            (viewTarget ? viewTarget.employee_name : undefined),
          national_id:
            nationalId ||
            selectedEmployee?.national_id ||
            (viewTarget ? viewTarget.national_id : undefined)
        });
      }

      // If Bulk Mode (single combined report covering all selected employees in ONE document)
      if (isBulkMode && selectedEmployees.length > 0) {
        const serializedEmployees = selectedEmployees.map((emp) =>
          JSON.stringify({ id: emp.id, name: emp.name, national_id: emp.national_id })
        );
        const allNames = selectedEmployees.map((emp) => emp.name).join(' ، ');

        return investigationApi.create({
          ...baseData,
          employee_id: selectedEmployees[0].id,
          employee_name: allNames,
          items: selectedType === 'custody' ? baseData.items : serializedEmployees,
          notes: notes ? notes : `تقرير مجمع يشمل (${selectedEmployees.length}) موظفين: ${allNames}`
        });
      }

      // Single employee mode
      return investigationApi.create({
        ...baseData,
        employee_id: selectedEmployee?.id,
        employee_name: employeeName || selectedEmployee?.name,
        national_id: nationalId || selectedEmployee?.national_id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigations'] });
      const count = isBulkMode && selectedEmployees.length > 0 ? selectedEmployees.length : 1;
      if (count > 1) {
        toast.success(`تم حفظ التقرير المجمع بنجاح لـ (${count}) موظفين في تقرير واحد`);
      } else {
        toast.success(editingId ? 'تم تحديث التقرير بنجاح' : `تم حفظ ${typeLabel} بنجاح`);
      }
      setIsDrawerOpen(false);
      resetTypeState();
      setEmployeeSearch('');
      setSelectedEmployee(null);
      setSelectedEmployees([]);
      setIsBulkMode(false);
      setEmployeeName('');
      setNationalId('');
      setEditingId(null);
      setSaving(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'فشل في حفظ التقرير');
      setSaving(false);
    }
  });

  const startEditing = (inv: InvestigationResponse) => {
    setEditingId(inv.id);
    setIsBulkMode(false);
    setSelectedEmployees([]);
    setSelectedType(inv.type);
    setEmployeeName(inv.employee_name || '');
    setNationalId(inv.national_id || '');
    setSelectedEmployee({
      id: inv.employee_id,
      name: inv.employee_name,
      national_id: inv.national_id
    } as any);
    setQuestions(inv.questions && inv.questions.length > 0 ? inv.questions : ['']);
    setAnswers(inv.answers && inv.answers.length > 0 ? inv.answers : ['']);
    setIsGuilty(inv.is_guilty ?? null);
    setReportText(inv.report_text || '');
    setImages(inv.images && inv.images.length > 0 ? inv.images : []);
    setAmount(inv.amount != null ? String(inv.amount) : '');
    setStartDate(inv.start_date ? inv.start_date.split('T')[0] : '');
    setEndDate(inv.end_date ? inv.end_date.split('T')[0] : '');
    setItems(inv.items && inv.items.length > 0 ? inv.items : ['']);
    setNotes(inv.notes || '');
    setDeductionMonth(inv.deduction_month || '');
    setIsDrawerOpen(true);
  };

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setEmployeeName(emp.name);
    setNationalId(emp.national_id);
    setEmployeeSearch('');
  };

  const toggleEmployeeSelection = (emp: Employee) => {
    setSelectedEmployees((prev) => {
      const exists = prev.some((e) => e.id === emp.id);
      if (exists) {
        return prev.filter((e) => e.id !== emp.id);
      }
      return [...prev, emp];
    });
  };

  const removeSelectedEmployee = (id: string) => {
    setSelectedEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  const selectAllFromSearchResults = () => {
    if (!searchResults || searchResults.length === 0) return;
    setSelectedEmployees((prev) => {
      const currentIds = new Set(prev.map((e) => e.id));
      const toAdd = searchResults.filter((e) => !currentIds.has(e.id));
      return [...prev, ...toAdd];
    });
  };

  const clearAllSelectedEmployees = () => {
    setSelectedEmployees([]);
  };

  const hasEmployee = isBulkMode
    ? selectedEmployees.length > 0
    : selectedEmployee || employeeName.trim() !== '';

  const hasRequiredFields =
    selectedType === 'advance' || selectedType === 'internet_advance'
      ? !!amount
      : selectedType === 'investigation'
        ? isGuilty !== null
        : true;

  const canSave = hasEmployee && hasRequiredFields;

  const handleSubmit = () => {
    if (!canSave) return;
    setSaving(true);
    mutation.mutate();
  };

  const resetForm = () => {
    setStep(0);
    setEmployeeSearch('');
    setSelectedEmployee(null);
    setSelectedEmployees([]);
    setIsBulkMode(false);
    setEmployeeName('');
    setNationalId('');
    resetTypeState();
    setSaving(false);
    setEditingId(null);
    setSelectedType(investigationType);
  };

  const handlePrint = (inv: InvestigationResponse) => {
    if (typeof window !== 'undefined' && document.getElementById('printable-doc')) {
      const now = new Date();
      const empName = inv.employee_name?.trim() || 'وثيقة';
      const printTitle = `${empName} ${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
      const originalTitle = document.title;
      document.title = printTitle;
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 2500);
      return;
    }

    const url = getDocumentUrl(inv.type || selectedType, inv.id);
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const empName = inv.employee_name?.trim() || 'وثيقة';
    const printTitle = `${empName} ${day}-${month}-${year}`;
    const originalTitle = document.title;

    document.title = printTitle;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);

    let printed = false;
    const doPrint = () => {
      if (printed) return;
      printed = true;
      try {
        if (iframe.contentDocument) {
          iframe.contentDocument.title = printTitle;
        }
      } catch {
        // Cross-origin fallback
      }
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.title = originalTitle;
          window.removeEventListener('message', handleMessage);
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }, 200);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DOC_READY_TO_PRINT' && event.data?.docId === inv.id) {
        doPrint();
      }
    };

    window.addEventListener('message', handleMessage);

    // Fallback if message not caught within 3.5 seconds
    iframe.onload = () => {
      setTimeout(() => {
        if (!printed) {
          doPrint();
        }
      }, 3500);
    };
  };

  // Add/remove Q&A
  const addQA = () => {
    setQuestions([...questions, '']);
    setAnswers([...answers, '']);
  };
  const removeQA = (i: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, idx) => idx !== i));
    setAnswers(answers.filter((_, idx) => idx !== i));
  };
  const updateQ = (i: number, v: string) => {
    const q = [...questions];
    q[i] = v;
    setQuestions(q);
  };
  const updateA = (i: number, v: string) => {
    const a = [...answers];
    a[i] = v;
    setAnswers(a);
  };

  // Add/remove items
  const addItem = () => setItems([...items, '']);
  const removeItem = (i: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== i));
  };
  const updateItem = (i: number, v: string) => {
    const it = [...items];
    it[i] = v;
    setItems(it);
  };

  // ============ DOCUMENT STYLE HELPER ============
  const DocHeader = ({ qrUrl, docType }: { qrUrl?: string; docType?: string }) => {
    const isSupervisorReport = docType === 'supervisor_report';
    if (isSupervisorReport) {
      return (
        <>
          {/* Top Accent Line: Left Orange (18%), Gap, Right Black (82%) */}
          <div className='flex h-3 w-full shrink-0 gap-1.5' dir='ltr'>
            <div className='h-full w-[18%] bg-[#e25b29]'></div>
            <div className='h-full w-[82%] bg-[#1a1a1a]'></div>
          </div>
          <div className='flex items-center justify-between px-8 pt-4 pb-2' dir='rtl'>
            {/* Logo before Company Name */}
            <div className='flex items-center gap-3 shrink-0' dir='ltr'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src='/logo.png'
                alt='AAMS LOGISTICS'
                className='h-14 w-auto object-contain shrink-0'
              />
              <div className='flex flex-col items-stretch justify-center select-none text-center min-w-[80px]'>
                <span className='text-[22px] font-black tracking-[0.16em] text-slate-950 font-sans leading-none pl-[0.16em] block'>
                  AAMS
                </span>
                <span className='text-[8px] font-black tracking-[0.38em] text-slate-700 font-sans leading-none mt-1 pl-[0.38em] uppercase block'>
                  LOGISTICS
                </span>
              </div>
            </div>

            {/* Clickable QR Code */}
            {qrUrl && (
              <a
                href={qrUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='flex flex-col items-center justify-center shrink-0 cursor-pointer transition-transform hover:scale-105'
                title='انقر للانتقال إلى الوثيقة'
              >
                <QRCodeImage value={qrUrl} size={68} />
              </a>
            )}
          </div>
        </>
      );
    }

    return (
      <>
        {/* Top Accent Line: Orange on Right (1/4) + Black on Left (3/4) */}
        <div className='flex h-2.5 w-full shrink-0' dir='rtl'>
          <div className='h-full w-1/4 bg-[#f97316]'></div>
          <div className='h-full w-3/4 bg-slate-950'></div>
        </div>
        <div className='px-6 pb-2 pt-3 sm:px-10' dir='rtl'>
          <div className='flex items-center justify-between gap-4 pb-1'>
            {/* Logo before Company Name */}
            <div className='flex items-center gap-3 shrink-0' dir='ltr'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src='/logo.png'
                alt='AAMS LOGISTICS'
                className='h-12 w-auto object-contain shrink-0'
              />
              <div className='flex flex-col items-stretch justify-center select-none text-center min-w-[76px]'>
                <span className='text-[20px] font-black tracking-[0.16em] text-slate-950 font-sans leading-none pl-[0.16em] block'>
                  AAMS
                </span>
                <span className='text-[7.5px] font-black tracking-[0.37em] text-slate-700 font-sans leading-none mt-1 pl-[0.37em] uppercase block'>
                  LOGISTICS
                </span>
              </div>
            </div>

            {/* Clickable QR Code aligned on opposite side without container box */}
            {qrUrl && (
              <a
                href={qrUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='flex flex-col items-center justify-center shrink-0 cursor-pointer transition-transform hover:scale-105'
                title='انقر للانتقال إلى الوثيقة'
              >
                <QRCodeImage value={qrUrl} size={68} />
              </a>
            )}
          </div>
        </div>
      </>
    );
  };

  const DocSignatures = ({
    empName,
    supName,
    type
  }: {
    empName: string;
    supName: string;
    type: string;
  }) => {
    const supervisorOnly = type === 'supervisor_report';
    const internetAdvance = type === 'internet_advance';

    if (supervisorOnly) {
      return (
        <div className='px-8 pt-8 pb-4' dir='rtl'>
          <div className='flex items-start justify-between gap-12'>
            {/* Right Side (اليمين): المشرف جنبه اسمه، وتحته التوقيع فارغ */}
            <div className='space-y-4 text-right'>
              <p className='text-base sm:text-lg font-black text-slate-950'>
                المشرف : <span className='font-bold text-slate-900'>{supName || '—'}</span>
              </p>
              <div className='space-y-2 pt-1'>
                <span className='text-base sm:text-lg font-black text-slate-950 block'>
                  التوقيع :
                </span>
                <div className='w-48 border-b-2 border-slate-400 min-h-[40px]'></div>
              </div>
            </div>

            {/* Left Side (الشمال): إجراء الإدارة */}
            <div className='min-w-[220px] max-w-[45%] flex-1 space-y-3 text-right'>
              <p className='text-base sm:text-lg font-black text-slate-950'>إجراء الإدارة /</p>
              <div className='w-full min-h-[60px] border-b-2 border-dashed border-slate-300'></div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className='pt-2 pb-2 px-8 sm:px-14' dir='rtl'>
        <div className='grid grid-cols-2 gap-12 max-w-lg mx-auto pt-3 pb-2 px-4'>
          <div className='space-y-1.5'>
            <span className='text-[10.5px] font-bold text-slate-400 block'>
              {internetAdvance ? 'بصمة الموظف' : 'توقيع الموظف'}
            </span>
            <p className='text-sm font-black text-slate-900'>{empName || '—'}</p>
            <div className='w-44 border-b-2 border-slate-300 pb-3'></div>
          </div>
          <div className='space-y-1.5 text-left' dir='ltr'>
            <span className='text-[10.5px] font-bold text-slate-400 block text-right'>
              توقيع المشرف المسؤول
            </span>
            <p className='text-sm font-black text-slate-900 text-right'>{supName || '—'}</p>
            <div className='w-44 border-b-2 border-slate-300 pb-3 ml-auto'></div>
          </div>
        </div>
      </div>
    );
  };

  const getDocumentUrl = (docType: string, docId: string, withPhotos = false) => {
    let origin = 'https://aams-frontend-lime.vercel.app';
    if (typeof window !== 'undefined') {
      origin = window.location.origin;
    }
    return `${origin}/doc/${docType || 'supervisor_report'}/${docId || ''}${withPhotos ? '?photos=1' : ''}`;
  };

  const DocPhotoAttachments = ({
    images,
    docId,
    docType
  }: {
    images?: string[];
    docId?: string;
    docType?: string;
  }) => {
    if (!images || images.length === 0) return null;

    const qrUrl = getDocumentUrl(docType || 'supervisor_report', docId || '', true);

    return (
      <div className='px-8 py-2.5 sm:px-12'>
        <div
          className='flex items-center justify-between p-3 bg-slate-50/80 border border-slate-200 rounded-xl shadow-2xs cursor-pointer transition-colors hover:bg-slate-100/70'
          dir='rtl'
          onClick={() => setViewingImage(images[0])}
        >
          <div className='flex items-center gap-3.5'>
            <div className='shrink-0' title='امسح الرمز أو انقر لعرض الصور'>
              <QRCodeImage value={qrUrl} size={78} />
            </div>
            <div className='space-y-1 text-right'>
              <div className='flex items-center gap-2'>
                <span className='text-xs font-black text-slate-900'>
                  مرفقات مصورة ({images.length} صور)
                </span>
                <span className='text-[9.5px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full'>
                  QR المرفقات
                </span>
              </div>
              <p className='text-[10.5px] text-slate-600 font-medium leading-tight'>
                امسح الرمز عبر كاميرا الهاتف لعرض الصور والمرفقات بدقة فائقة 📱
              </p>
              <span className='text-[10px] text-blue-600 font-bold hover:underline no-print inline-block'>
                (انقر هنا أو على الرمز لفتح الصور بالحجم الكامل)
              </span>
            </div>
          </div>

          {/* Mini Thumbnails */}
          <div
            className='flex items-center gap-1.5 overflow-hidden'
            onClick={(e) => e.stopPropagation()}
          >
            {images.slice(0, 3).map((img, idx) => (
              <div
                key={idx}
                className='size-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0 cursor-pointer shadow-2xs hover:opacity-80 transition-opacity'
                onClick={() => setViewingImage(img)}
                title='انقر لتكبير الصورة'
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`مرفق ${idx + 1}`} className='w-full h-full object-cover' />
              </div>
            ))}
            {images.length > 3 && (
              <span
                className='text-[10px] font-black text-slate-600 bg-slate-200 rounded-lg px-2 py-2 cursor-pointer hover:bg-slate-300'
                onClick={() => setViewingImage(images[3])}
              >
                +{images.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const PhotoLightboxDialog = ({ currentImages }: { currentImages: string[] }) => (
    <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
      <DialogContent
        className='max-w-4xl max-h-[90vh] p-4 flex flex-col items-center justify-center bg-slate-950/95 text-white border-slate-800'
        dir='rtl'
      >
        <DialogHeader className='w-full flex flex-row items-center justify-between pb-2 border-b border-slate-800'>
          <DialogTitle className='text-sm font-bold text-white flex items-center gap-2'>
            <ImageIcon className='size-4 text-blue-400' />
            معاينة المرفق بدقة فائقة
          </DialogTitle>
        </DialogHeader>
        {viewingImage && (
          <div className='relative max-h-[65vh] w-full flex items-center justify-center overflow-auto my-3'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewingImage}
              alt='مرفق بدقة عالية'
              className='max-h-[65vh] max-w-full object-contain rounded-lg shadow-2xl'
            />
          </div>
        )}
        {/* Thumbnail Strip */}
        {currentImages.length > 1 && (
          <div className='flex items-center gap-2 mt-1 pt-2 border-t border-slate-800/80 overflow-x-auto max-w-full pb-1'>
            {currentImages.map((img, i) => (
              <button
                key={i}
                type='button'
                onClick={() => setViewingImage(img)}
                className={cn(
                  'size-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer',
                  viewingImage === img
                    ? 'border-blue-500 scale-105 shadow-md'
                    : 'border-transparent opacity-50 hover:opacity-100'
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt={`مصغرة ${i + 1}`} className='w-full h-full object-cover' />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  const DocFooter = () => (
    <div
      className='mt-auto border-t border-slate-400 px-2 py-2 text-center overflow-hidden'
      dir='rtl'
    >
      <p className='text-[8px] sm:text-[9.5px] md:text-[10px] font-bold text-slate-800 leading-none flex items-center justify-center gap-1.5 whitespace-nowrap overflow-hidden'>
        <span>شركة ابرار عبدالرحمن محمد الشمراني</span>
        <span>–</span>
        <span>المملكة العربية السعودية – جدة – الطائف</span>
        <span>–</span>
        <span>س .ت: ٧٠٤٩٢١٤٥٩١</span>
        <span>–</span>
        <span>
          الهاتف :{' '}
          <a
            href='tel:0531112225'
            className='text-slate-950 hover:text-blue-700 font-black hover:underline transition-colors'
            dir='ltr'
            title='اتصال عبر الهاتف'
          >
            0531112225
          </a>
        </span>
        <span>–</span>
        <span>
          الإيميل :{' '}
          <a
            href='mailto:Abrar@aams-logistic.com'
            className='text-blue-700 hover:text-blue-900 font-black hover:underline transition-colors'
            title='إرسال بريد إلكتروني'
          >
            Abrar@aams-logistic.com
          </a>
        </span>
      </p>
    </div>
  );

  const AdvanceTemplate = ({ amount, employeeName }: { amount: number; employeeName: string }) => (
    <div className='space-y-4 px-10 py-5 text-sm leading-loose text-gray-800 sm:px-14'>
      <p>السلام عليكم ورحمة الله وبركاته،</p>
      <p>
        أتقدم إلى سعادتكم بهذا الطلب، راجيًا من الله عز وجل ثم منكم التكرم بالموافقة على منحي سلفة
        مالية قدرها{' '}
        <strong className='text-base font-black'>({amount.toLocaleString()} ريال)</strong>، وذلك
        نظرًا لظروفي الحالية وحاجتي إلى هذه السلفة خلال الفترة الحالية.
      </p>
      <p>
        وأتعهد بأن يتم استقطاع قيمة السلفة من راتبي الشهري وفقًا للنظام المتبع لديكم، وأكون شاكرًا
        ومقدرًا لكم حسن تعاونكم وتفهمكم لظروفي.
      </p>
      <p>
        كما أتقدم لكم بخالص الشكر والتقدير على ما تقدمونه دائمًا من دعم واهتمام بالموظفين، سائلاً الله
        أن يوفقكم ويبارك لكم في جهودكم.
      </p>
      <p>وتفضلوا بقبول فائق الاحترام والتقدير.</p>
      <div className='mt-8 space-y-6 pt-4'>
        <div className='flex items-center gap-4 border-b-2 border-blue-200 pb-3'>
          <span className='w-20 font-bold text-blue-800'>الاسم :</span>
          <span className='text-base font-bold text-gray-900'>{employeeName}</span>
        </div>
        <div className='flex items-center gap-4 border-b-2 border-blue-200 pb-3'>
          <span className='w-20 font-bold text-blue-800'>التوقيع :</span>
          <span className='flex-1'></span>
        </div>
        <div className='flex items-center gap-4 border-b-2 border-blue-200 pb-3'>
          <span className='w-20 font-bold text-blue-800'>البصمة :</span>
          <span className='flex-1'></span>
        </div>
      </div>
    </div>
  );

  const InternetAdvanceTemplate = ({
    amount,
    deductionMonth,
    employeeName
  }: {
    amount: number;
    deductionMonth?: string;
    employeeName: string;
  }) => (
    <div className='space-y-4 px-10 py-5 text-sm leading-loose text-gray-800 sm:px-14'>
      <p>
        أقر أنا <strong className='font-black'>{employeeName}</strong> باستلامي مبلغًا وقدره{' '}
        <strong className='text-base font-black'>({amount.toLocaleString()} ريال سعودي)</strong>،
        وذلك بغرض تغطية تكاليف اشتراك خدمة الإنترنت.
      </p>
      <p>
        أوافق على استرداد قيمة السلفة للشركة وفق الخيار المحدد أدناه، حيث يتم خصم المبلغ على دفعة
        واحدة من راتب شهر{' '}
        <strong className='text-base font-black'>({formatDeductionMonth(deductionMonth)})</strong>.
      </p>
      <p>
        وفي حال لم تكن باقة الإنترنت مسجلة للموظف ضمن الراتب الذي تم تسليمه، فلا يتم استقطاع المبلغ من
        الراتب.
      </p>
    </div>
  );

  const typeLabel = TEMPLATE_LABELS[investigationType] || 'تقرير';

  if (viewTarget) {
    const t = viewTarget;
    const isInv = t.type === 'investigation';
    const isReport = t.type === 'supervisor_report';
    const isAdvance = t.type === 'advance' || t.type === 'internet_advance';
    const isAdvanceOnly = t.type === 'advance';
    const isInternetAdvance = t.type === 'internet_advance';
    const isAbsence = t.type === 'absence';
    const isCustody = t.type === 'custody';

    return (
      <div className='report-page-wrapper min-h-screen bg-slate-100 py-6 dark:bg-slate-950'>
        <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0mm;
            }
            header,
            aside,
            nav,
            [data-sidebar],
            .no-print {
              display: none !important;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            html,
            body,
            main,
            #main-content,
            div[data-sidebar='inset'],
            .report-page-wrapper,
            .report-inner-wrapper {
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: 100% !important;
              background: white !important;
              color: black !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #printable-doc {
              margin: 0 !important;
              padding: 6mm 10mm 4mm 10mm !important;
              background: white !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              height: 285mm !important;
              max-height: 285mm !important;
              min-height: 285mm !important;
              box-sizing: border-box !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              overflow: hidden !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}</style>
        <div className='report-inner-wrapper px-4 max-w-7xl mx-auto'>
          <div className='no-print mb-4 flex items-center justify-between'>
            <Button
              variant='outline'
              onClick={() => router.push(`/dashboard/investigation/${t.type}`)}
              className='gap-2 font-bold'
            >
              <Icons.arrowLeft className='size-4' /> رجوع للسجل
            </Button>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                onClick={() => window.open(getDocumentUrl(t.type, t.id), '_blank')}
                className='gap-2 font-bold'
              >
                <Icons.externalLink className='size-4' /> عرض الوثيقة للعامة
              </Button>
              <Button
                onClick={() => handlePrint(viewTarget || t)}
                className='gap-2 font-bold bg-primary text-primary-foreground shadow-md'
              >
                <Icons.printer className='size-4' /> طباعة
              </Button>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
            {/* Live Edit Side Panel (no-print) */}
            <div className='no-print lg:col-span-4 space-y-4 lg:sticky lg:top-6'>
              <Card className='border-blue-200/80 bg-white dark:bg-slate-900 shadow-sm'>
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <div className='size-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-700 flex items-center justify-center'>
                        <Icons.edit className='size-4' />
                      </div>
                      <div>
                        <CardTitle className='text-sm font-black text-slate-900 dark:text-white'>
                          تعديل التقرير
                        </CardTitle>
                        <CardDescription className='text-[11px] text-muted-foreground'>
                          يظهر التعديل لحظياً في المعاينة
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant='outline'
                      className='text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200'
                    >
                      مباشر ⚡
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className='space-y-4 text-xs' dir='rtl'>
                  {/* Manual Employee Name & National ID fields */}
                  <div className='space-y-3 border-b border-slate-200 dark:border-slate-800 pb-3'>
                    <div className='space-y-1'>
                      <Label className='text-xs font-bold text-slate-800 dark:text-slate-200'>
                        اسم الموظف:
                      </Label>
                      <Input
                        value={employeeName}
                        onChange={(e) => setEmployeeName(e.target.value)}
                        placeholder='أدخل اسم الموظف'
                        className='text-xs sm:text-sm font-bold bg-slate-50 dark:bg-slate-950 border-slate-300'
                      />
                    </div>
                    <div className='space-y-1'>
                      <Label className='text-xs font-bold text-slate-800 dark:text-slate-200'>
                        رقم الهوية:
                      </Label>
                      <Input
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        placeholder='أدخل رقم الهوية'
                        className='text-xs sm:text-sm font-mono font-bold bg-slate-50 dark:bg-slate-950 border-slate-300'
                      />
                    </div>
                  </div>

                  {(isReport || isAbsence) && (
                    <div className='space-y-2'>
                      <Label className='text-xs font-bold text-slate-800 dark:text-slate-200'>
                        {isAbsence ? 'تفاصيل وإثبات الغياب:' : 'نص تقرير المشرف:'}
                      </Label>
                      <Textarea
                        value={reportText}
                        onChange={(e) => setReportText(e.target.value)}
                        rows={10}
                        className='text-xs sm:text-sm leading-relaxed min-h-[200px] resize-y bg-slate-50 dark:bg-slate-950 border-slate-300'
                        placeholder='اكتب تفاصيل التقرير هنا...'
                      />
                    </div>
                  )}

                  {isAbsence && (
                    <div className='grid grid-cols-2 gap-2 pt-1'>
                      <div className='space-y-1'>
                        <Label className='text-[11px] font-bold text-slate-700'>من تاريخ:</Label>
                        <Input
                          type='date'
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className='text-xs'
                        />
                      </div>
                      <div className='space-y-1'>
                        <Label className='text-[11px] font-bold text-slate-700'>إلى تاريخ:</Label>
                        <Input
                          type='date'
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className='text-xs'
                        />
                      </div>
                    </div>
                  )}

                  {(isAdvance || isInternetAdvance) && (
                    <div className='space-y-3'>
                      <div className='space-y-1'>
                        <Label className='text-xs font-bold text-slate-800'>
                          مبلغ السلفة (ريال):
                        </Label>
                        <Input
                          type='number'
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className='font-mono font-bold text-sm'
                          placeholder='المبلغ المطلوب'
                        />
                      </div>
                      <div className='space-y-1'>
                        <Label className='text-xs font-bold text-slate-800'>
                          ملاحظات / سبب السلفة:
                        </Label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={4}
                          className='text-xs'
                          placeholder='اكتب سبب السلفة...'
                        />
                      </div>
                    </div>
                  )}

                  {isInv && (
                    <div className='space-y-3'>
                      <div className='flex items-center justify-between'>
                        <Label className='text-xs font-bold text-slate-800'>
                          أسئلة وأجوبة التحقيق:
                        </Label>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={addQA}
                          className='text-xs text-blue-600 h-7 px-2'
                        >
                          <Icons.plus className='size-3.5 mr-1' /> إضافة سؤال
                        </Button>
                      </div>
                      <div className='space-y-2 max-h-[280px] overflow-y-auto pr-1'>
                        {questions.map((q, i) => (
                          <div
                            key={i}
                            className='p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 space-y-1.5'
                          >
                            <div className='flex items-center justify-between'>
                              <span className='text-[11px] font-bold text-slate-600'>
                                سؤال #{i + 1}
                              </span>
                              {questions.length > 1 && (
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => removeQA(i)}
                                  className='h-5 w-5 p-0 text-red-500'
                                >
                                  <Icons.trash className='size-3' />
                                </Button>
                              )}
                            </div>
                            <Input
                              value={q}
                              onChange={(e) => updateQ(i, e.target.value)}
                              placeholder='نص السؤال...'
                              className='text-xs'
                            />
                            <Input
                              value={answers[i] || ''}
                              onChange={(e) => updateA(i, e.target.value)}
                              placeholder='إجابة الموظف...'
                              className='text-xs bg-white dark:bg-slate-900'
                            />
                          </div>
                        ))}
                      </div>

                      <div className='pt-2 border-t'>
                        <Label className='text-xs font-bold text-slate-800 block mb-2'>
                          إقرار الإدانة:
                        </Label>
                        <div className='grid grid-cols-2 gap-2'>
                          <Button
                            type='button'
                            variant={isGuilty === true ? 'default' : 'outline'}
                            onClick={() => setIsGuilty(true)}
                            className='h-8 text-xs font-bold'
                          >
                            مدان
                          </Button>
                          <Button
                            type='button'
                            variant={isGuilty === false ? 'default' : 'outline'}
                            onClick={() => setIsGuilty(false)}
                            className='h-8 text-xs font-bold'
                          >
                            غير مدان
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {isCustody && (
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <Label className='text-xs font-bold text-slate-800'>العهد المستلمة:</Label>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={addItem}
                          className='text-xs text-blue-600 h-7 px-2'
                        >
                          <Icons.plus className='size-3.5 mr-1' /> إضافة بند
                        </Button>
                      </div>
                      <div className='space-y-1.5 max-h-[250px] overflow-y-auto pr-1'>
                        {items.map((item, i) => (
                          <div key={i} className='flex items-center gap-1.5'>
                            <Input
                              value={item}
                              onChange={(e) => updateItem(i, e.target.value)}
                              placeholder={`العهدة #${i + 1}`}
                              className='text-xs'
                            />
                            {items.length > 1 && (
                              <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                onClick={() => removeItem(i)}
                                className='h-8 w-8 p-0 text-red-500 shrink-0'
                              >
                                <Icons.trash className='size-3.5' />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photo Attachments Uploader */}
                  <div className='space-y-2 pt-3 border-t border-slate-200'>
                    <div className='flex items-center justify-between'>
                      <Label className='text-xs font-bold text-slate-800 flex items-center gap-1.5'>
                        <ImageIcon className='size-3.5 text-blue-600' />
                        مرفقات الصور ({images.length})
                      </Label>
                      <label className='cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors shadow-2xs'>
                        <Icons.plus className='size-3.5' />
                        إرفاق صور
                        <input
                          type='file'
                          accept='image/*'
                          multiple
                          className='hidden'
                          onChange={handleImageUpload}
                        />
                      </label>
                    </div>

                    {images.length > 0 ? (
                      <div className='grid grid-cols-3 gap-2 mt-2'>
                        {images.map((img, idx) => (
                          <div
                            key={idx}
                            className='relative group aspect-square rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shadow-2xs'
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img}
                              alt={`مرفق ${idx + 1}`}
                              className='w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity'
                              onClick={() => setViewingImage(img)}
                            />
                            <button
                              type='button'
                              onClick={() => removeImage(idx)}
                              className='absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-md transition-transform hover:scale-110'
                              title='حذف الصورة'
                            >
                              <Icons.trash className='size-3' />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className='text-[11px] text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg p-2.5 text-center'>
                        لا توجد صور مرفقة حالياً. اضغط "إرفاق صور" لإضافة مستندات أو صور للتقرير.
                      </p>
                    )}
                  </div>

                  <Button
                    type='button'
                    onClick={handleSubmit}
                    disabled={saving}
                    className='w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2 mt-4'
                  >
                    {saving ? (
                      <Loader2 className='size-4 animate-spin' />
                    ) : (
                      <Icons.save className='size-4' />
                    )}
                    حفظ التعديل
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Side: Live Document Preview */}
            <div className='lg:col-span-8 w-full overflow-x-auto'>
              <div
                id='printable-doc'
                className='relative bg-white text-slate-950 shadow-xl overflow-hidden rounded-xl border border-slate-200 min-h-[250mm] max-w-[210mm] mx-auto flex flex-col justify-between'
                dir='rtl'
              >
                {/* Watermark Logo with Brand Text */}
                <div
                  className='absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none'
                  aria-hidden='true'
                >
                  <div className='flex flex-col items-center justify-center opacity-[0.08]'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src='/logo.png' alt='' className='w-32 h-32 object-contain' />
                    <span className='text-6xl sm:text-7xl font-black tracking-[0.16em] text-slate-950 font-sans leading-none mt-3 pl-[0.16em] block'>
                      AAMS
                    </span>
                    <span className='text-2xl sm:text-3xl font-black tracking-[0.38em] text-slate-700 font-sans leading-none mt-2 pl-[0.38em] uppercase block'>
                      LOGISTICS
                    </span>
                  </div>
                </div>

                <div className='relative z-10 flex-1 flex flex-col justify-between'>
                  <div className='flex-1 flex flex-col justify-start'>
                    <DocHeader qrUrl={getDocumentUrl(t.type, t.id)} docType={t.type} />

                    {/* Document Title in the Body */}
                    {isReport ? (
                      <div className='text-center my-4'>
                        <h1 className='text-2xl font-black tracking-wide text-slate-950'>
                          تقرير مشرف
                        </h1>
                      </div>
                    ) : (
                      <div className='text-center my-3'>
                        <h1 className='text-xl sm:text-2xl font-black tracking-wide text-slate-950 inline-block border-b-2 border-[#f97316] pb-1 px-8'>
                          {TEMPLATE_LABELS[t.type] || 'محضر'}
                        </h1>
                      </div>
                    )}

                    {/* Employee Info & Document Section */}
                    {(() => {
                      const docEmps = parseDocEmployees(t);

                      if (isReport) {
                        return (
                          <div className='px-8 my-4 text-right' dir='rtl'>
                            {docEmps.length > 1 ? (
                              <div className='space-y-2.5'>
                                <span className='font-black text-slate-950 text-base'>
                                  الموظفون المشمولون بالتقرير:
                                </span>
                                <div className='space-y-1 pr-3'>
                                  {docEmps.map((emp, idx) => (
                                    <div
                                      key={idx}
                                      className='text-sm sm:text-base font-bold text-slate-900'
                                    >
                                      {idx + 1}. {emp.name} - رقم الهوية:{' '}
                                      <span className='font-mono'>{emp.national_id}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className='flex items-baseline gap-2 pt-1 text-base sm:text-lg'>
                                  <span className='font-black text-slate-950 min-w-[105px]'>
                                    التاريخ :
                                  </span>
                                  <span className='font-bold font-mono text-slate-900'>
                                    {formatReportDate(t.created_at)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className='space-y-2.5 text-base sm:text-lg'>
                                <div className='flex items-baseline gap-2'>
                                  <span className='font-black text-slate-950 min-w-[105px]'>
                                    اسم الموظف :
                                  </span>
                                  <span className='font-bold text-slate-900'>
                                    {employeeName ||
                                      selectedEmployee?.name ||
                                      t.employee_name ||
                                      '—'}
                                  </span>
                                </div>
                                <div className='flex items-baseline gap-2'>
                                  <span className='font-black text-slate-950 min-w-[105px]'>
                                    رقم الهوية :
                                  </span>
                                  <span className='font-bold font-mono text-slate-900 tracking-wider'>
                                    {nationalId ||
                                      selectedEmployee?.national_id ||
                                      t.national_id ||
                                      '—'}
                                  </span>
                                </div>
                                <div className='flex items-baseline gap-2'>
                                  <span className='font-black text-slate-950 min-w-[105px]'>
                                    التاريخ :
                                  </span>
                                  <span className='font-bold font-mono text-slate-900'>
                                    {formatReportDate(t.created_at)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      if (docEmps.length > 1) {
                        return (
                          <div className='px-8 py-3 sm:px-12'>
                            <div className='flex items-center justify-between mb-2'>
                              <div className='flex items-center gap-2'>
                                <span className='inline-block size-2.5 rounded-full bg-[#f97316]'></span>
                                <h3 className='text-xs sm:text-sm font-black text-slate-950'>
                                  الموظفون المشمولون بالتقرير المجمع ({docEmps.length} موظفين):
                                </h3>
                              </div>
                              <span className='text-xs font-bold text-slate-500 font-mono'>
                                تاريخ الإنشاء: {formatDate(t.created_at)}
                              </span>
                            </div>

                            <div className='overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-2xs'>
                              <table
                                className='w-full text-xs text-right border-collapse'
                                dir='rtl'
                              >
                                <thead>
                                  <tr className='bg-slate-100/90 border-b border-slate-200 text-slate-700 font-black'>
                                    <th className='p-2.5 w-12 text-center'>#</th>
                                    <th className='p-2.5'>اسم الموظف / المندوب</th>
                                    <th className='p-2.5 font-mono'>رقم الهوية الوطنية / الإقامة</th>
                                  </tr>
                                </thead>
                                <tbody className='divide-y divide-slate-200/70'>
                                  {docEmps.map((emp, idx) => (
                                    <tr
                                      key={idx}
                                      className='hover:bg-slate-100/50 transition-colors'
                                    >
                                      <td className='p-2.5 text-center font-bold text-slate-500 font-mono'>
                                        {idx + 1}
                                      </td>
                                      <td className='p-2.5 font-black text-slate-900'>
                                        {emp.name}
                                      </td>
                                      <td className='p-2.5 font-mono font-bold text-slate-700'>
                                        {emp.national_id}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className='px-8 py-3 sm:px-12'>
                          <div className='flex items-center justify-between gap-6' dir='rtl'>
                            <div className='space-y-1.5 text-sm'>
                              <div className='flex items-center gap-2'>
                                <span className='text-xs text-slate-500 font-medium min-w-[75px]'>
                                  اسم الموظف:
                                </span>
                                <span className='font-bold text-slate-950'>
                                  {employeeName || selectedEmployee?.name || t.employee_name || '—'}
                                </span>
                              </div>
                              <div className='flex items-center gap-2'>
                                <span className='text-xs text-slate-500 font-medium min-w-[75px]'>
                                  رقم الهوية:
                                </span>
                                <span className='font-mono font-bold text-slate-950 tracking-wider'>
                                  {nationalId ||
                                    selectedEmployee?.national_id ||
                                    t.national_id ||
                                    '—'}
                                </span>
                              </div>
                              <div className='flex items-center gap-2'>
                                <span className='text-xs text-slate-500 font-medium min-w-[75px]'>
                                  تاريخ الإنشاء:
                                </span>
                                <span className='font-mono font-bold text-slate-900'>
                                  {formatDate(t.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {isAdvance && (amount || t.amount != null) && (
                      <div className='px-8 sm:px-12'>
                        <div className='mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-sm'>
                          <span className='text-xs text-slate-500'>مبلغ السلفة المطلوب:</span>
                          <strong className='font-black text-slate-950 font-mono'>
                            {(amount ? parseFloat(amount) : t.amount || 0).toLocaleString()} ريال
                          </strong>
                        </div>
                      </div>
                    )}

                    {isAbsence && (
                      <div className='px-8 sm:px-12'>
                        <div className='mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs'>
                          <span className='text-slate-500'>فترة الغياب المسجلة:</span>
                          <span className='font-bold font-mono text-slate-900'>
                            من {startDate || formatDate(t.start_date)} إلى{' '}
                            {endDate || formatDate(t.end_date)}
                          </span>
                        </div>
                      </div>
                    )}

                    {isAdvance && (
                      <div className='px-8 py-2.5 sm:px-12'>
                        <h3 className='mb-2 flex items-center gap-2 text-xs font-black text-slate-900'>
                          <span className='inline-block h-3.5 w-1 rounded-full bg-blue-600'></span>
                          حالة السلفة
                        </h3>
                        <div className='rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs'>
                          {(() => {
                            const status = t.status || 'pending';
                            const label =
                              status === 'approved'
                                ? 'موافق عليه'
                                : status === 'rejected'
                                  ? 'مرفوض'
                                  : 'قيد الانتظار';
                            const byName =
                              status === 'approved'
                                ? t.approved_by_name
                                : status === 'rejected'
                                  ? t.rejected_by_name
                                  : '';
                            const byUsername =
                              status === 'approved'
                                ? t.approved_by_username
                                : status === 'rejected'
                                  ? t.rejected_by_username
                                  : '';
                            return (
                              <div className='space-y-1'>
                                <p className='font-bold text-slate-900'>
                                  الحالة:{' '}
                                  <span
                                    className={
                                      status === 'approved'
                                        ? 'text-emerald-700 font-black'
                                        : status === 'rejected'
                                          ? 'text-rose-700 font-black'
                                          : 'text-amber-700 font-black'
                                    }
                                  >
                                    {label}
                                  </span>
                                </p>
                                {byName && (
                                  <p className='text-slate-600'>
                                    بواسطة: {byName}
                                    {byUsername ? ` (@${byUsername})` : ''}
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {isInv && (questions.some((q) => q.trim()) || t.questions.length > 0) && (
                      <div className='px-8 py-2.5 sm:px-12'>
                        <h3 className='mb-2 flex items-center gap-2 text-xs font-black text-slate-900'>
                          <span className='inline-block h-3.5 w-1 rounded-full bg-blue-600'></span>
                          أسئلة وأجوبة التحقيق
                        </h3>
                        <div className='overflow-hidden rounded-xl border border-slate-200 bg-slate-50/40'>
                          {(questions.some((q) => q.trim()) ? questions : t.questions).map(
                            (q, i) => (
                              <div key={i} className={i > 0 ? 'border-t border-slate-200' : ''}>
                                <div className='flex'>
                                  <div className='flex w-9 shrink-0 items-center justify-center border-l border-slate-200 bg-slate-100 text-xs font-bold text-slate-600 font-mono'>
                                    {i + 1}
                                  </div>
                                  <div className='flex-1 p-3'>
                                    <p className='mb-1 text-xs font-bold text-slate-900'>س: {q}</p>
                                    <p className='border-r-2 border-blue-500 pr-2.5 text-xs text-slate-700 leading-relaxed'>
                                      ج:{' '}
                                      {(answers[i] !== undefined ? answers[i] : t.answers[i]) ||
                                        '—'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                    {isInv && (
                      <div className='px-8 py-2.5 sm:px-12'>
                        <h3 className='mb-2 flex items-center gap-2 text-xs font-black text-slate-900'>
                          <span className='inline-block h-3.5 w-1 rounded-full bg-blue-600'></span>
                          نتيجة التحقيق
                        </h3>
                        <div className='rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-center'>
                          <p className='mb-0.5 text-xs text-slate-500 font-medium'>
                            إقرار الإدانة من الموظف:
                          </p>
                          <p className='text-lg font-black text-slate-950'>
                            {(isGuilty !== null ? isGuilty : t.is_guilty)
                              ? 'نعم - إقرار بالإدانة'
                              : 'لا - إنكار الإدانة'}
                          </p>
                        </div>
                      </div>
                    )}
                    {isReport && (reportText || t.report_text) ? (
                      <div className='px-8 my-6 text-right' dir='rtl'>
                        <h2 className='text-base sm:text-lg font-black text-slate-950 mb-3'>
                          موضوع ونص التقرير :
                        </h2>
                        <div className='whitespace-pre-wrap font-medium leading-[2.2] text-slate-950 text-base sm:text-lg text-right'>
                          {renderBoldText(reportText || t.report_text)}
                        </div>
                      </div>
                    ) : isAbsence && (reportText || t.report_text) ? (
                      <div className='px-8 py-3 sm:px-12'>
                        <div className='text-sm sm:text-base font-bold text-slate-950 mb-2'>
                          تفاصيل وإثبات الغياب:
                        </div>
                        <div className='whitespace-pre-wrap font-normal leading-relaxed text-slate-900 text-sm sm:text-base'>
                          {renderBoldText(reportText || t.report_text)}
                        </div>
                      </div>
                    ) : null}
                    {isAdvanceOnly && (amount || t.amount != null) && (
                      <AdvanceTemplate
                        amount={amount ? parseFloat(amount) : t.amount || 0}
                        employeeName={employeeName || selectedEmployee?.name || t.employee_name}
                      />
                    )}
                    {isInternetAdvance && (amount || t.amount != null) && (
                      <InternetAdvanceTemplate
                        amount={amount ? parseFloat(amount) : t.amount || 0}
                        deductionMonth={deductionMonth || t.deduction_month}
                        employeeName={employeeName || selectedEmployee?.name || t.employee_name}
                      />
                    )}
                    {isInternetAdvance && (notes || t.notes) && (
                      <div className='px-10 py-3 sm:px-14'>
                        <h3 className='mb-3 flex items-center gap-2 text-sm font-black text-blue-900'>
                          <span className='inline-block h-4 w-1 rounded-full bg-blue-600'></span>سبب
                          السلفة
                        </h3>
                        <div className='rounded-sm border border-blue-200 bg-blue-50/30 p-4 text-sm text-gray-800'>
                          {notes || t.notes}
                        </div>
                      </div>
                    )}
                    {isCustody && (items.some((i) => i.trim()) || t.items.length > 0) && (
                      <div className='px-10 py-3 sm:px-14'>
                        <h3 className='mb-3 flex items-center gap-2 text-sm font-black text-blue-900'>
                          <span className='inline-block h-4 w-1 rounded-full bg-blue-600'></span>
                          العهد المستلمة
                        </h3>
                        <div className='overflow-hidden rounded-sm border border-blue-200'>
                          {(items.some((i) => i.trim())
                            ? items.filter((i) => i.trim())
                            : t.items
                          ).map((item, i) => (
                            <div
                              key={i}
                              className={cn(
                                'p-3 text-sm text-gray-800',
                                i > 0 && 'border-t border-blue-100',
                                i % 2 === 0 && 'bg-blue-50/20'
                              )}
                            >
                              <span className='ml-2 font-bold text-blue-400'>{i + 1}.</span>
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pinned Bottom Area (Signatures & Official Footer) */}
                  <div className='mt-auto'>
                    <DocPhotoAttachments
                      images={images.length > 0 ? images : t.images}
                      docId={t.id}
                      docType={t.type}
                    />
                    {t.type !== 'advance' && (
                      <DocSignatures
                        empName={employeeName || selectedEmployee?.name || t.employee_name}
                        supName={t.supervisor_name}
                        type={t.type}
                      />
                    )}
                    <DocFooter />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <PhotoLightboxDialog currentImages={images.length > 0 ? images : t.images || []} />
      </div>
    );
  }

  // ============ PRINT DIALOG ============
  if (printTarget) {
    const t = printTarget;
    const isInv = t.type === 'investigation';
    const isReport = t.type === 'supervisor_report';
    const isAdvance = t.type === 'advance' || t.type === 'internet_advance';
    const isAdvanceOnly = t.type === 'advance';
    const isInternetAdvance = t.type === 'internet_advance';
    const isAbsence = t.type === 'absence';
    const isCustody = t.type === 'custody';

    return (
      <div
        className='print-area relative bg-white text-black'
        dir='rtl'
        style={{
          fontFamily: 'Tajawal, Cairo, sans-serif',
          width: '210mm',
          minHeight: '297mm',
          margin: '0 auto'
        }}
      >
        {/* Watermark Logo with Brand Text */}
        <div
          className='absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none'
          aria-hidden='true'
        >
          <div className='flex flex-col items-center justify-center opacity-[0.08]'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src='/logo.png' alt='' className='w-32 h-32 object-contain' />
            <span className='text-6xl sm:text-7xl font-black tracking-[0.16em] text-slate-950 font-sans leading-none mt-3 pl-[0.16em] block'>
              AAMS
            </span>
            <span className='text-2xl sm:text-3xl font-black tracking-[0.38em] text-slate-700 font-sans leading-none mt-2 pl-[0.38em] uppercase block'>
              LOGISTICS
            </span>
          </div>
        </div>
        <DocHeader qrUrl={getDocumentUrl(t.type, t.id)} docType={t.type} />
        {isReport ? (
          <div className='text-center my-4'>
            <h1 className='text-2xl font-black tracking-wide text-slate-950'>تقرير مشرف</h1>
          </div>
        ) : (
          <div className='text-center my-3'>
            <h1 className='text-xl sm:text-2xl font-black tracking-wide text-slate-950 inline-block border-b-2 border-[#f97316] pb-1 px-8'>
              {TEMPLATE_LABELS[t.type] || 'محضر'}
            </h1>
          </div>
        )}

        {/* Employee Info & Document Section */}
        {(() => {
          const docEmps = parseDocEmployees(t);

          if (isReport) {
            return (
              <div className='px-8 my-4 text-right' dir='rtl'>
                {docEmps.length > 1 ? (
                  <div className='space-y-2.5'>
                    <span className='font-black text-slate-950 text-base'>
                      الموظفون المشمولون بالتقرير:
                    </span>
                    <div className='space-y-1 pr-3'>
                      {docEmps.map((emp, idx) => (
                        <div key={idx} className='text-sm sm:text-base font-bold text-slate-900'>
                          {idx + 1}. {emp.name} - رقم الهوية:{' '}
                          <span className='font-mono'>{emp.national_id}</span>
                        </div>
                      ))}
                    </div>
                    <div className='flex items-baseline gap-2 pt-1 text-base sm:text-lg'>
                      <span className='font-black text-slate-950 min-w-[105px]'>التاريخ :</span>
                      <span className='font-bold font-mono text-slate-900'>
                        {formatReportDate(t.created_at)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className='space-y-2.5 text-base sm:text-lg'>
                    <div className='flex items-baseline gap-2'>
                      <span className='font-black text-slate-950 min-w-[105px]'>اسم الموظف :</span>
                      <span className='font-bold text-slate-900'>{t.employee_name || '—'}</span>
                    </div>
                    <div className='flex items-baseline gap-2'>
                      <span className='font-black text-slate-950 min-w-[105px]'>رقم الهوية :</span>
                      <span className='font-bold font-mono text-slate-900 tracking-wider'>
                        {t.national_id || '—'}
                      </span>
                    </div>
                    <div className='flex items-baseline gap-2'>
                      <span className='font-black text-slate-950 min-w-[105px]'>التاريخ :</span>
                      <span className='font-bold font-mono text-slate-900'>
                        {formatReportDate(t.created_at)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          if (docEmps.length > 1) {
            return (
              <div className='px-8 py-3 sm:px-12'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <span className='inline-block size-2.5 rounded-full bg-[#f97316]'></span>
                    <h3 className='text-xs sm:text-sm font-black text-slate-950'>
                      الموظفون المشمولون بالتقرير المجمع ({docEmps.length} موظفين):
                    </h3>
                  </div>
                  <span className='text-xs font-bold text-slate-500 font-mono'>
                    تاريخ الإنشاء: {formatDate(t.created_at)}
                  </span>
                </div>

                <div className='overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-2xs'>
                  <table className='w-full text-xs text-right border-collapse' dir='rtl'>
                    <thead>
                      <tr className='bg-slate-100/90 border-b border-slate-200 text-slate-700 font-black'>
                        <th className='p-2.5 w-12 text-center'>#</th>
                        <th className='p-2.5'>اسم الموظف / المندوب</th>
                        <th className='p-2.5 font-mono'>رقم الهوية الوطنية / الإقامة</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-200/70'>
                      {docEmps.map((emp, idx) => (
                        <tr key={idx} className='hover:bg-slate-100/50 transition-colors'>
                          <td className='p-2.5 text-center font-bold text-slate-500 font-mono'>
                            {idx + 1}
                          </td>
                          <td className='p-2.5 font-black text-slate-900'>{emp.name}</td>
                          <td className='p-2.5 font-mono font-bold text-slate-700'>
                            {emp.national_id}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }

          return (
            <div className='px-8 py-3 sm:px-12'>
              <div className='flex items-center justify-between gap-6' dir='rtl'>
                <div className='space-y-1.5 text-sm'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs text-slate-500 font-medium min-w-[75px]'>
                      اسم الموظف:
                    </span>
                    <span className='font-bold text-slate-950'>{t.employee_name || '—'}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs text-slate-500 font-medium min-w-[75px]'>
                      رقم الهوية:
                    </span>
                    <span className='font-mono font-bold text-slate-950 tracking-wider'>
                      {t.national_id || '—'}
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs text-slate-500 font-medium min-w-[75px]'>
                      تاريخ الإنشاء:
                    </span>
                    <span className='font-mono font-bold text-slate-900'>
                      {formatDate(t.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {isAdvance && t.amount != null && (
          <div className='px-8 sm:px-12'>
            <div className='mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-sm'>
              <span className='text-xs text-slate-500'>مبلغ السلفة المطلوب:</span>
              <strong className='font-black text-slate-950 font-mono'>
                {t.amount.toLocaleString()} ريال
              </strong>
            </div>
          </div>
        )}

        {isAbsence && (
          <div className='px-8 sm:px-12'>
            <div className='mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs'>
              <span className='text-slate-500'>فترة الغياب المسجلة:</span>
              <span className='font-bold font-mono text-slate-900'>
                من {formatDate(t.start_date)} إلى {formatDate(t.end_date)}
              </span>
            </div>
          </div>
        )}

        {isInv && t.questions.length > 0 && (
          <div className='px-8 py-2.5 sm:px-12'>
            <h3 className='mb-2 flex items-center gap-2 text-xs font-black text-slate-900'>
              <span className='inline-block h-3.5 w-1 rounded-full bg-blue-600'></span>أسئلة وأجوبة
              التحقيق
            </h3>
            <div className='overflow-hidden rounded-xl border border-slate-200 bg-slate-50/40'>
              {t.questions.map((q, i) => (
                <div key={i} className={i > 0 ? 'border-t border-slate-200' : ''}>
                  <div className='flex'>
                    <div className='flex w-9 shrink-0 items-center justify-center border-l border-slate-200 bg-slate-100 text-xs font-bold text-slate-600 font-mono'>
                      {i + 1}
                    </div>
                    <div className='flex-1 p-3'>
                      <p className='mb-1 text-xs font-bold text-slate-900'>س: {q}</p>
                      <p className='border-r-2 border-blue-500 pr-2.5 text-xs text-slate-700 leading-relaxed'>
                        ج: {t.answers[i] || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {isInv && (
          <div className='px-8 py-2.5 sm:px-12'>
            <h3 className='mb-2 flex items-center gap-2 text-xs font-black text-slate-900'>
              <span className='inline-block h-3.5 w-1 rounded-full bg-blue-600'></span>نتيجة التحقيق
            </h3>
            <div className='rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-center'>
              <p className='mb-0.5 text-xs text-slate-500 font-medium'>إقرار الإدانة من الموظف:</p>
              <p className='text-lg font-black text-slate-950'>
                {t.is_guilty ? 'نعم - إقرار بالإدانة' : 'لا - إنكار الإدانة'}
              </p>
            </div>
          </div>
        )}
        {isReport && t.report_text ? (
          <div className='px-8 my-6 text-right' dir='rtl'>
            <h2 className='text-base sm:text-lg font-black text-slate-950 mb-3'>
              موضوع ونص التقرير :
            </h2>
            <div className='whitespace-pre-wrap font-medium leading-[2.2] text-slate-950 text-base sm:text-lg text-right'>
              {renderBoldText(t.report_text)}
            </div>
          </div>
        ) : isAbsence && t.report_text ? (
          <div className='px-8 py-3 sm:px-12'>
            <div className='text-sm sm:text-base font-bold text-slate-950 mb-2'>
              تفاصيل وإثبات الغياب:
            </div>
            <div className='whitespace-pre-wrap font-normal leading-relaxed text-slate-900 text-sm sm:text-base'>
              {renderBoldText(t.report_text)}
            </div>
          </div>
        ) : null}
        {isAdvanceOnly && t.amount != null && (
          <AdvanceTemplate amount={t.amount} employeeName={t.employee_name} />
        )}
        {isInternetAdvance && t.amount != null && (
          <InternetAdvanceTemplate
            amount={t.amount}
            deductionMonth={t.deduction_month}
            employeeName={t.employee_name}
          />
        )}
        {isInternetAdvance && t.notes && (
          <div className='px-12 py-3'>
            <h3 className='mb-3 flex items-center gap-2 text-sm font-black text-blue-900'>
              <span className='inline-block h-4 w-1 rounded-full bg-blue-600'></span>سبب السلفة
            </h3>
            <div className='rounded-sm border border-blue-300 bg-blue-50/30 p-4 text-sm text-gray-800'>
              {t.notes}
            </div>
          </div>
        )}
        {isCustody && t.items.length > 0 && (
          <div className='px-12 py-3'>
            <h3 className='mb-3 flex items-center gap-2 text-sm font-black text-blue-900'>
              <span className='inline-block h-4 w-1 rounded-full bg-blue-600'></span>العهد المستلمة
            </h3>
            <div className='overflow-hidden rounded-sm border border-blue-300'>
              {t.items.map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-3 text-sm text-gray-800',
                    i > 0 && 'border-t border-blue-100',
                    i % 2 === 0 && 'bg-blue-50/20'
                  )}
                >
                  <span className='ml-2 font-bold text-blue-400'>{i + 1}.</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}
        <DocPhotoAttachments images={t.images} docId={t.id} docType={t.type} />
        {t.type !== 'advance' && (
          <DocSignatures empName={t.employee_name} supName={t.supervisor_name} type={t.type} />
        )}
        <DocFooter />
      </div>
    );
  }

  // ============ LIST VIEW ============
  const rawList = investigations?.filter((inv) => inv.type === investigationType) || [];
  const filteredList = rawList.filter((inv) => {
    if (!listSearch.trim()) return true;
    const q = listSearch.trim().toLowerCase();
    const id = inv.id.toLowerCase();
    const shortId = inv.id.slice(0, 8).toLowerCase();
    const name = (inv.employee_name || '').toLowerCase();
    const natId = (inv.national_id || '').toLowerCase();
    const sup = (inv.supervisor_name || '').toLowerCase();
    const reportTxt = (inv.report_text || '').toLowerCase();
    const notes = (inv.notes || '').toLowerCase();
    const itemsStr = (inv.items || []).join(' ').toLowerCase();

    return (
      q.includes(id) ||
      id.includes(q) ||
      shortId.includes(q) ||
      name.includes(q) ||
      natId.includes(q) ||
      sup.includes(q) ||
      reportTxt.includes(q) ||
      notes.includes(q) ||
      itemsStr.includes(q)
    );
  });

  return (
    <PageContainer
      pageTitle={t(`سجل ${typeLabel}`)}
      pageDescription={t(typeLabel)}
      pageHeaderAction={
        <Button
          onClick={() => {
            resetForm();
            setIsDrawerOpen(true);
          }}
          className='gap-2 font-bold shadow-xs'
        >
          <Icons.plus className='size-4' /> {t('Create')} {t(typeLabel)}
        </Button>
      }
    >
      <div className='flex flex-col gap-4' dir={dir}>
        {/* Smart Search Bar */}
        <div className='relative'>
          <Icons.search className='absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400' />
          <Input
            value={listSearch}
            onChange={(e) => {
              const val = e.target.value;
              setListSearch(val);
              // If scanned a full URL, attempt instant navigation
              if (
                (val.includes('/investigation/') || val.includes('/doc/')) &&
                rawList.length > 0
              ) {
                const match = rawList.find((item) => val.includes(item.id));
                if (match) {
                  router.push(`/dashboard/investigation/${match.type}/${match.id}`);
                }
              }
            }}
            placeholder={t(
              'ابحث باسم الموظف، رقم الهوية، رقم السند، أو امسح الباركود / الـ QR مباشرة...'
            )}
            className='pr-10 pl-4 py-2 bg-white dark:bg-slate-900 border-slate-200 rounded-xl shadow-2xs text-sm'
          />
          {listSearch && (
            <button
              onClick={() => setListSearch('')}
              className='absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full px-2 py-0.5'
            >
              {t('Clear')}
            </button>
          )}
        </div>

        {loadingList ? (
          <Card>
            <CardContent className='text-muted-foreground py-12 text-center'>
              <Icons.spinner className='mx-auto mb-2 size-6 animate-spin' />
              {t('Loading...')}
            </CardContent>
          </Card>
        ) : filteredList.length === 0 ? (
          <Card className='py-16 text-center'>
            <CardContent className='flex flex-col items-center'>
              <div className='bg-muted/50 mb-6 flex size-20 items-center justify-center rounded-2xl shadow-inner'>
                <Icons.fileSearch className='size-10' />
              </div>
              <h3 className='text-xl font-bold'>
                {listSearch
                  ? t('No results')
                  : t(`لا توجد ${typeLabel}`) || `${t('No data')} ${t(typeLabel)}`}
              </h3>
              <p className='text-muted-foreground mt-2 text-sm'>
                {listSearch ? t('No matching results') : `${t('No data')}`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-4'>
            {filteredList.map((inv) => {
              const emps = parseDocEmployees(inv);
              const isGroup = emps.length > 1;
              return (
                <Card
                  key={inv.id}
                  className='cursor-pointer overflow-hidden transition-shadow hover:shadow-md'
                  onClick={() => router.push(`/dashboard/investigation/${inv.type}/${inv.id}`)}
                >
                  <CardContent className='py-4'>
                    <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                      <div className='flex min-w-0 items-start gap-3'>
                        <div
                          className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-xl',
                            isGroup
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800'
                          )}
                        >
                          {isGroup ? (
                            <Users className='size-5' />
                          ) : (
                            <Icons.eye className='size-5' />
                          )}
                        </div>
                        <div className='min-w-0'>
                          {isGroup ? (
                            <>
                              <div className='flex items-center gap-2 mb-0.5'>
                                <p className='text-sm font-black text-slate-950 dark:text-slate-100'>
                                  تقرير مجمع ({emps.length} موظفين)
                                </p>
                                <span className='bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full'>
                                  تقرير مجمع
                                </span>
                              </div>
                              <p className='text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-lg'>
                                {emps.map((e) => e.name).join(' ، ')}
                              </p>
                              <p className='text-muted-foreground text-[11px] font-mono'>
                                الهويات:{' '}
                                {emps
                                  .map((e) => e.national_id)
                                  .filter(Boolean)
                                  .join(' - ')}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className='text-sm font-bold'>{inv.employee_name || '—'}</p>
                              <p className='text-muted-foreground text-xs'>
                                رقم الهوية: {inv.national_id || '—'}
                              </p>
                            </>
                          )}
                          <p className='text-muted-foreground text-xs'>
                            المشرف: {inv.supervisor_name || '—'}
                          </p>
                        </div>
                      </div>
                      <div className='flex items-center gap-3' onClick={(e) => e.stopPropagation()}>
                        <Badge variant='outline'>{TEMPLATE_LABELS[inv.type] || 'تقرير'}</Badge>
                        {inv.type === 'investigation' && (
                          <Badge variant='outline'>{inv.is_guilty ? 'مدان' : 'غير مدان'}</Badge>
                        )}
                        {inv.amount != null && (
                          <span className='text-xs font-bold'>
                            {inv.amount.toLocaleString()} ريال
                          </span>
                        )}
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => window.open(getDocumentUrl(inv.type, inv.id), '_blank')}
                          className='text-muted-foreground hover:text-blue-600 no-print size-8 p-0'
                          title='عرض الوثيقة للعامة'
                        >
                          <Icons.externalLink className='size-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => handlePrint(inv)}
                          className='text-muted-foreground hover:text-foreground no-print size-8 p-0'
                          title='طباعة التقرير'
                        >
                          <Icons.printer className='size-4' />
                        </Button>
                        <span className='text-muted-foreground font-mono text-xs'>
                          {formatRiyadh(new Date(inv.created_at), 'yyyy/MM/dd hh:mm a')}
                        </span>
                      </div>
                    </div>
                    <ApprovalStatus inv={inv} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Sheet Side Drawer for Creating & Editing Reports */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className='w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 overflow-hidden'>
          <SheetHeader className='p-5 pb-4 border-b bg-muted/30'>
            <div className='flex items-center gap-3'>
              <div className='size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0'>
                <Icons.fileText className='size-5' />
              </div>
              <div className='text-start min-w-0 flex-1'>
                <SheetTitle className='text-base font-bold truncate'>
                  {editingId ? `تعديل ${typeLabel}` : `إضافة ${typeLabel} جديد`}
                </SheetTitle>
                <SheetDescription className='text-xs truncate'>
                  {editingId
                    ? 'تعديل وحفظ بيانات التقرير مباشرة في السجل'
                    : 'املأ الحقول التالية لإنشاء التقرير وحفظه'}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className='flex-1 overflow-y-auto p-5 space-y-5' dir={dir}>
            {/* Mode Toggle: Single vs Bulk */}
            {!editingId && (
              <div className='flex items-center justify-between p-1 bg-muted/60 rounded-xl border border-border/60'>
                <button
                  type='button'
                  onClick={() => {
                    setIsBulkMode(false);
                    setEmployeeSearch('');
                  }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    !isBulkMode
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <User className='size-3.5' />
                  موظف فردي
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setIsBulkMode(true);
                    setEmployeeSearch('');
                  }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    isBulkMode
                      ? 'bg-background text-foreground shadow-xs border-blue-500/30'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Users className='size-3.5 text-blue-600' />
                  تقرير مجمع (عدة موظفين)
                  {selectedEmployees.length > 0 && (
                    <span className='bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none'>
                      {selectedEmployees.length}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Employee Selector & Search */}
            {isBulkMode ? (
              <div className='space-y-3 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 p-3.5 border border-blue-200/60 dark:border-blue-800/40'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-1.5'>
                    <Users className='size-4 text-blue-600' />
                    <Label className='text-xs font-bold text-foreground'>
                      الموظفون المشمولون بالتقرير:
                    </Label>
                  </div>
                  {selectedEmployees.length > 0 && (
                    <button
                      type='button'
                      onClick={clearAllSelectedEmployees}
                      className='text-[11px] text-destructive hover:underline font-bold cursor-pointer'
                    >
                      مسح الكل ({selectedEmployees.length})
                    </button>
                  )}
                </div>

                {/* Search Box to Add More Employees */}
                <div className='relative'>
                  <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 start-3' />
                  <Input
                    placeholder='ابحث عن موظف بالاسم أو رقم الهوية لإضافته...'
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className='ps-9 text-xs bg-background'
                  />
                </div>

                {/* Search Dropdown in Bulk Mode */}
                {searching && (
                  <div className='text-muted-foreground py-1.5 text-center text-xs'>
                    <Icons.spinner className='inline-block size-3.5 animate-spin mr-1' />
                    جارٍ البحث...
                  </div>
                )}

                {searchResults && searchResults.length > 0 && (
                  <div className='rounded-lg border bg-background max-h-48 overflow-y-auto shadow-sm divide-y divide-border'>
                    <div className='p-2 bg-muted/40 flex items-center justify-between text-[11px] text-muted-foreground font-bold'>
                      <span>نتائج البحث ({searchResults.length}):</span>
                      <button
                        type='button'
                        onClick={selectAllFromSearchResults}
                        className='text-blue-600 hover:underline cursor-pointer'
                      >
                        + إضافة كل النتائج
                      </button>
                    </div>
                    {searchResults.map((emp) => {
                      const isSelected = selectedEmployees.some((e) => e.id === emp.id);
                      return (
                        <button
                          key={emp.id}
                          type='button'
                          onClick={() => toggleEmployeeSelection(emp)}
                          className={cn(
                            'flex w-full items-center justify-between p-2 text-start text-xs transition-colors cursor-pointer',
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold'
                              : 'hover:bg-muted/50'
                          )}
                        >
                          <div className='flex items-center gap-2'>
                            <div
                              className={cn(
                                'size-4 rounded flex items-center justify-center border text-[10px]',
                                isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-slate-300'
                              )}
                            >
                              {isSelected && <Check className='size-3 stroke-[3]' />}
                            </div>
                            <span>{emp.name}</span>
                          </div>
                          <span className='text-muted-foreground font-mono text-[11px]'>
                            {emp.national_id}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Selected Employees Chips/List */}
                {selectedEmployees.length > 0 ? (
                  <div className='space-y-1.5'>
                    <div className='flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 border rounded-lg bg-background/60'>
                      {selectedEmployees.map((emp) => (
                        <div
                          key={emp.id}
                          className='inline-flex items-center gap-1.5 bg-background border border-blue-200 dark:border-blue-800 rounded-lg px-2.5 py-1 text-xs shadow-2xs'
                        >
                          <span className='font-bold text-foreground'>{emp.name}</span>
                          <span className='text-muted-foreground font-mono text-[10px]'>
                            ({emp.national_id})
                          </span>
                          <button
                            type='button'
                            onClick={() => removeSelectedEmployee(emp.id)}
                            className='text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded size-4 flex items-center justify-center transition-colors cursor-pointer'
                            title='إزالة'
                          >
                            <X className='size-3' />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className='text-[10.5px] text-blue-700 dark:text-blue-300 font-medium px-1'>
                      💡 سيتم حفظ التقرير وإضافته في سجل كل موظف من المحددين أعلاه بشكل رسمي ومستقل.
                    </p>
                  </div>
                ) : (
                  <div className='text-center py-4 px-2 border border-dashed rounded-lg text-xs text-muted-foreground bg-background/50'>
                    <Users className='size-6 mx-auto mb-1 opacity-40 text-blue-600' />
                    <p className='font-medium'>لم يتم اختيار موظفين بعد</p>
                    <p className='text-[10px] opacity-70'>
                      ابحث بالاسم أو الهوية أعلاه واضغط لإضافة الموظفين إلى التقرير المجمع
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className='space-y-2.5 rounded-xl bg-muted/30 p-3.5 border border-border/60'>
                <Label className='text-xs font-bold text-foreground'>الموظف / المندوب:</Label>
                <div className='relative'>
                  <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 start-3' />
                  <Input
                    placeholder='ابحث عن الموظف بالاسم أو رقم الهوية...'
                    value={employeeSearch}
                    onChange={(e) => {
                      setEmployeeSearch(e.target.value);
                      if (selectedEmployee) setSelectedEmployee(null);
                    }}
                    className='ps-9 text-xs'
                  />
                </div>

                {/* Search Dropdown Results */}
                {searching && (
                  <div className='text-muted-foreground py-2 text-center text-xs'>
                    <Icons.spinner className='inline-block size-3.5 animate-spin mr-1' />
                    جارٍ البحث...
                  </div>
                )}

                {searchResults && searchResults.length > 0 && !selectedEmployee && (
                  <div className='divide-y divide-border rounded-lg border bg-background max-h-36 overflow-y-auto shadow-sm'>
                    {searchResults.map((emp) => (
                      <button
                        key={emp.id}
                        type='button'
                        onClick={() => handleSelectEmployee(emp)}
                        className='flex w-full items-center justify-between p-2 text-start text-xs hover:bg-muted/50 transition-colors cursor-pointer'
                      >
                        <span className='font-bold'>{emp.name}</span>
                        <span className='text-muted-foreground font-mono'>{emp.national_id}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Employee Details Badge */}
                {selectedEmployee && (
                  <div className='flex items-center justify-between p-2.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 mt-2'>
                    <div className='flex items-center gap-2'>
                      <User className='size-4 text-blue-600' />
                      <div>
                        <p className='font-bold text-xs text-foreground'>{selectedEmployee.name}</p>
                        <p className='text-[10px] text-muted-foreground font-mono'>
                          رقم الهوية: {selectedEmployee.national_id || '—'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => {
                        setSelectedEmployee(null);
                        setEmployeeName('');
                        setNationalId('');
                        setEmployeeSearch('');
                      }}
                      className='h-7 text-xs text-destructive hover:bg-destructive/10'
                    >
                      تغيير
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Type-Specific Fields */}
            {(selectedType === 'supervisor_report' || selectedType === 'absence') && (
              <div className='space-y-2'>
                <Label className='text-xs font-bold text-foreground'>
                  {selectedType === 'absence' ? 'تفاصيل وإثبات الغياب:' : 'نص تقرير المشرف:'}
                </Label>
                <Textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  rows={6}
                  placeholder={
                    selectedType === 'absence'
                      ? 'اكتب تفاصيل وإثبات الغياب...'
                      : 'اكتب نص التقرير والملاحظات هنا...'
                  }
                  className='text-xs leading-relaxed'
                />
              </div>
            )}

            {selectedType === 'absence' && (
              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1'>
                  <Label className='text-xs font-bold text-foreground'>من تاريخ:</Label>
                  <Input
                    type='date'
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className='text-xs'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-xs font-bold text-foreground'>إلى تاريخ:</Label>
                  <Input
                    type='date'
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className='text-xs'
                  />
                </div>
              </div>
            )}

            {(selectedType === 'advance' || selectedType === 'internet_advance') && (
              <div className='space-y-3'>
                <div className='space-y-1'>
                  <Label className='text-xs font-bold text-foreground'>مبلغ السلفة (ريال):</Label>
                  <Input
                    type='number'
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder='مثال: 500'
                    className='text-xs font-mono font-bold'
                  />
                </div>
                {selectedType === 'internet_advance' && (
                  <div className='space-y-1'>
                    <Label className='text-xs font-bold text-foreground'>
                      شهر الاستقطاع (YYYY-MM):
                    </Label>
                    <Input
                      type='month'
                      value={deductionMonth}
                      onChange={(e) => setDeductionMonth(e.target.value)}
                      className='text-xs'
                    />
                  </div>
                )}
                <div className='space-y-1'>
                  <Label className='text-xs font-bold text-foreground'>سبب السلفة / ملاحظات:</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder='اكتب سبب السلفة...'
                    className='text-xs'
                  />
                </div>
              </div>
            )}

            {selectedType === 'investigation' && (
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-bold text-foreground'>أسئلة وأجوبة التحقيق:</Label>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={addQA}
                    className='text-xs h-7 gap-1'
                  >
                    <Icons.plus className='size-3' /> إضافة سؤال
                  </Button>
                </div>
                <div className='space-y-2 max-h-56 overflow-y-auto pe-1'>
                  {questions.map((q, i) => (
                    <div key={i} className='p-2.5 rounded-lg border bg-muted/20 space-y-1.5'>
                      <div className='flex items-center justify-between'>
                        <span className='text-[11px] font-bold text-muted-foreground'>
                          سؤال #{i + 1}
                        </span>
                        {questions.length > 1 && (
                          <button
                            type='button'
                            onClick={() => removeQA(i)}
                            className='text-destructive text-xs hover:underline cursor-pointer'
                          >
                            حذف
                          </button>
                        )}
                      </div>
                      <Input
                        value={q}
                        onChange={(e) => updateQ(i, e.target.value)}
                        placeholder='نص السؤال...'
                        className='text-xs'
                      />
                      <Input
                        value={answers[i] || ''}
                        onChange={(e) => updateA(i, e.target.value)}
                        placeholder='إجابة الموظف...'
                        className='text-xs bg-background'
                      />
                    </div>
                  ))}
                </div>

                <div className='pt-2 border-t'>
                  <Label className='text-xs font-bold text-foreground block mb-2'>
                    إقرار الإدانة:
                  </Label>
                  <div className='grid grid-cols-2 gap-2'>
                    <Button
                      type='button'
                      variant={isGuilty === true ? 'default' : 'outline'}
                      onClick={() => setIsGuilty(true)}
                      className='h-8 text-xs font-bold'
                    >
                      مدان
                    </Button>
                    <Button
                      type='button'
                      variant={isGuilty === false ? 'default' : 'outline'}
                      onClick={() => setIsGuilty(false)}
                      className='h-8 text-xs font-bold'
                    >
                      غير مدان
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {selectedType === 'custody' && (
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-bold text-foreground'>العهد المستلمة:</Label>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={addItem}
                    className='text-xs h-7 gap-1'
                  >
                    <Icons.plus className='size-3' /> إضافة بند
                  </Button>
                </div>
                <div className='space-y-1.5 max-h-56 overflow-y-auto pe-1'>
                  {items.map((item, i) => (
                    <div key={i} className='flex items-center gap-1.5'>
                      <Input
                        value={item}
                        onChange={(e) => updateItem(i, e.target.value)}
                        placeholder={`العهدة #${i + 1}`}
                        className='text-xs'
                      />
                      {items.length > 1 && (
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() => removeItem(i)}
                          className='h-8 w-8 p-0 text-destructive shrink-0'
                        >
                          <Icons.trash className='size-3.5' />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photo Attachments Uploader */}
            <div className='space-y-2 pt-2 border-t'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-bold text-foreground flex items-center gap-1.5'>
                  <ImageIcon className='size-3.5 text-primary' />
                  مرفقات الصور ({images.length})
                </Label>
                <label className='cursor-pointer inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors'>
                  <Icons.plus className='size-3.5' />
                  إرفاق صور
                  <input
                    type='file'
                    accept='image/*'
                    multiple
                    className='hidden'
                    onChange={handleImageUpload}
                  />
                </label>
              </div>

              {images.length > 0 && (
                <div className='grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1'>
                  {images.map((img, i) => (
                    <div
                      key={i}
                      className='relative group aspect-square rounded-lg overflow-hidden border'
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={`مرفق ${i + 1}`} className='size-full object-cover' />
                      <button
                        type='button'
                        onClick={() => removeImage(i)}
                        className='absolute top-1 right-1 size-5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity'
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Extra Notes (if not advance and not supervisor_report) */}
            {selectedType !== 'advance' &&
              selectedType !== 'internet_advance' &&
              selectedType !== 'supervisor_report' && (
                <div className='space-y-1 pt-2 border-t'>
                  <Label className='text-xs font-bold text-foreground'>ملاحظات إضافية:</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder='أي ملاحظات إضافية...'
                    className='text-xs'
                  />
                </div>
              )}
          </div>

          <SheetFooter className='gap-2 sm:gap-0 pt-6 mt-auto flex flex-col'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsDrawerOpen(false)}
              disabled={saving}
              className='w-full cursor-pointer'
            >
              إلغاء
            </Button>
            <Button
              type='button'
              onClick={handleSubmit}
              disabled={!canSave || saving}
              className='w-full bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 font-bold cursor-pointer'
            >
              {saving
                ? 'جاري الحفظ...'
                : editingId
                  ? 'تعديل التقرير'
                  : isBulkMode && selectedEmployees.length > 1
                    ? `حفظ ${typeLabel} (${selectedEmployees.length} موظفين)`
                    : `حفظ ${typeLabel}`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
