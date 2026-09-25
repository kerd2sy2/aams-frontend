'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { targetWebApi } from '@/lib/aams/target-api';
import { getAvatarInitials } from '@/lib/aams/captain-lookup';
import type { IdentifierPerformance } from '@/types/target';
import {
  Search,
  Check,
  ChevronsUpDown,
  X,
  ExternalLink,
  Plus,
  Bike,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ApplicationIdentifierSelectProps {
  value: string;
  onChange: (val: string, item?: IdentifierPerformance | null) => void;
  onApplicationTypeChange?: (appType: string) => void;
  currentEmployeeId?: string; // If in edit mode, to know if linked to this employee
  label?: string;
  className?: string;
}

export function ApplicationIdentifierSelect({
  value,
  onChange,
  onApplicationTypeChange,
  currentEmployeeId,
  label = 'معرف التطبيق (كابتن نينجا / كيتا)',
  className
}: ApplicationIdentifierSelectProps) {
  const [identifiers, setIdentifiers] = useState<IdentifierPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedAppFilter, setSelectedAppFilter] = useState<'ALL' | 'NINJA' | 'KEETA'>('ALL');

  const containerRef = useRef<HTMLDivElement>(null);

  // Load identifiers from API and seeds
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    targetWebApi
      .listIdentifiers()
      .then((data) => {
        if (isMounted) {
          setIdentifiers(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        console.error('Failed to load identifiers for select:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find currently selected item based on value
  const selectedItem = useMemo(() => {
    if (!value) return null;
    const cleanVal = String(value).trim();
    return (
      identifiers.find((item) => {
        const itemCode = String(item.code || item.ninja_id || '').trim();
        return (
          itemCode === cleanVal ||
          item.id === cleanVal ||
          cleanVal.startsWith(itemCode + ' ') ||
          cleanVal.endsWith(' ' + itemCode)
        );
      }) || null
    );
  }, [identifiers, value]);

  // Filter identifiers based on search query and app filter
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return identifiers
      .filter((item) => {
        const isNinja = (item.app_name || '').toUpperCase().includes('NINJA');
        const isKeeta = (item.app_name || '').toUpperCase().includes('KEETA');

        if (selectedAppFilter === 'NINJA' && !isNinja) return false;
        if (selectedAppFilter === 'KEETA' && !isKeeta) return false;

        if (!q) return true;

        const nameAr = String(item.name_ar || item.name || '').toLowerCase();
        const nameEn = String(item.name_en || '').toLowerCase();
        const code = String(item.code || item.ninja_id || '').toLowerCase();
        const mobile = String(item.mobile || '').toLowerCase();
        const empName = String(item.employee?.name || '').toLowerCase();

        return (
          nameAr.includes(q) ||
          nameEn.includes(q) ||
          code.includes(q) ||
          mobile.includes(q) ||
          empName.includes(q)
        );
      })
      .slice(0, 50); // limit to 50 results for smooth performance
  }, [identifiers, search, selectedAppFilter]);

  const handleSelect = (item: IdentifierPerformance) => {
    const code = String(item.code || item.ninja_id || item.id).trim();
    // We save code or code + name so it links smoothly
    onChange(code, item);

    // Auto-update application_type in parent form
    if (onApplicationTypeChange) {
      const isKeeta = (item.app_name || '').toUpperCase().includes('KEETA');
      onApplicationTypeChange(isKeeta ? 'keeta' : 'ninja');
    }

    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onChange('', null);
    setSearch('');
  };

  const handleCustomManualSubmit = () => {
    if (!search.trim()) return;
    onChange(search.trim(), null);
    setOpen(false);
  };

  return (
    <div className={cn('space-y-2 relative', className)} ref={containerRef}>
      <div className='flex items-center justify-between'>
        <Label
          htmlFor='application_id'
          className='text-xs font-semibold text-foreground flex items-center gap-1.5'
        >
          <Bike className='size-3.5 text-primary' />
          {label}
        </Label>
        <Link
          href='/dashboard/identifiers'
          target='_blank'
          className='text-[11px] text-primary hover:underline inline-flex items-center gap-1'
        >
          <ExternalLink className='size-3' />
          سجل المعرفات ({identifiers.length})
        </Link>
      </div>

      {/* Selected Item Preview or Search Trigger */}
      {selectedItem ? (
        <div className='p-2.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2.5 min-w-0'>
            <Avatar className='size-9 rounded-full border border-primary/20 shrink-0 shadow-xs'>
              {selectedItem.avatar ? (
                <AvatarImage
                  src={selectedItem.avatar}
                  alt={selectedItem.name_ar || selectedItem.name}
                  className='object-cover'
                />
              ) : null}
              <AvatarFallback className='text-xs font-bold bg-primary/10 text-primary'>
                {getAvatarInitials(
                  selectedItem.name_ar || selectedItem.name,
                  (selectedItem.app_name || '').includes('KEETA') ? 'ك' : 'ن'
                )}
              </AvatarFallback>
            </Avatar>
            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <span className='font-bold text-sm text-foreground truncate'>
                  {selectedItem.name_ar || selectedItem.name}
                </span>
                <Badge
                  variant='outline'
                  className={cn(
                    'text-[10px] font-mono py-0 px-1.5 shrink-0',
                    (selectedItem.app_name || '').toUpperCase().includes('KEETA')
                      ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                      : 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                  )}
                >
                  {(selectedItem.app_name || '').toUpperCase().includes('KEETA') ? 'كيتا' : 'نينجا'}
                </Badge>
              </div>
              <div className='flex items-center gap-2 text-xs text-muted-foreground mt-0.5'>
                <span className='font-mono font-bold text-primary'>
                  ID: {selectedItem.code || selectedItem.ninja_id}
                </span>
                {selectedItem.name_en && (
                  <span className='text-[10px] uppercase font-mono'>({selectedItem.name_en})</span>
                )}
                {selectedItem.mobile && (
                  <span className='text-[10px] font-mono'>📱 {selectedItem.mobile}</span>
                )}
              </div>
            </div>
          </div>

          <div className='flex items-center gap-1.5 shrink-0'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-7 text-xs px-2'
              onClick={() => {
                setOpen(true);
                setSearch(selectedItem.name_ar || selectedItem.code || '');
              }}
            >
              تغيير
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='size-7 text-muted-foreground hover:text-destructive'
              onClick={handleClear}
              title='إلغاء الربط'
            >
              <X className='size-3.5' />
            </Button>
          </div>
        </div>
      ) : (
        /* Dropdown Trigger Input */
        <div className='relative'>
          <div
            onClick={() => setOpen(true)}
            className={cn(
              'flex items-center justify-between w-full h-11 px-3 rounded-xl border border-input bg-background text-sm cursor-pointer transition-colors',
              open ? 'ring-2 ring-primary/20 border-primary' : 'hover:border-border'
            )}
          >
            <div className='flex items-center gap-2 text-muted-foreground'>
              <Search className='size-4' />
              {value ? (
                <span className='font-mono font-semibold text-foreground'>{value}</span>
              ) : (
                <span className='text-xs'>
                  ابحث باسم الكابتن أو رقم المعرف (مثال: محمد، 67460، 3027)...
                </span>
              )}
            </div>
            <div className='flex items-center gap-1 text-muted-foreground'>
              {value && (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='size-6 text-muted-foreground hover:text-destructive'
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                >
                  <X className='size-3.5' />
                </Button>
              )}
              <ChevronsUpDown className='size-4 opacity-50' />
            </div>
          </div>
        </div>
      )}

      {/* Floating Searchable Dropdown Popover */}
      {open && (
        <div className='absolute z-50 left-0 right-0 top-full mt-1.5 bg-popover border border-border shadow-xl rounded-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100'>
          {/* Search Box */}
          <div className='p-2 border-b border-border/60 bg-muted/20 space-y-2'>
            <div className='relative'>
              <Search className='absolute right-2.5 top-2.5 size-4 text-muted-foreground' />
              <Input
                autoFocus
                placeholder='اكتب أول حرف من الاسم أو رقم المعرف...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='pr-9 h-9 text-xs bg-background'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredList.length > 0) {
                      handleSelect(filteredList[0]);
                    } else if (search.trim()) {
                      handleCustomManualSubmit();
                    }
                  } else if (e.key === 'Escape') {
                    setOpen(false);
                  }
                }}
              />
              {search && (
                <button
                  type='button'
                  onClick={() => setSearch('')}
                  className='absolute left-2.5 top-2.5 text-muted-foreground hover:text-foreground'
                >
                  <X className='size-3.5' />
                </button>
              )}
            </div>

            {/* Quick App Filters */}
            <div className='flex items-center gap-1.5'>
              <Button
                type='button'
                variant={selectedAppFilter === 'ALL' ? 'default' : 'ghost'}
                size='sm'
                onClick={() => setSelectedAppFilter('ALL')}
                className='h-6 text-[10px] px-2 rounded-md'
              >
                الكل ({identifiers.length})
              </Button>
              <Button
                type='button'
                variant={selectedAppFilter === 'NINJA' ? 'default' : 'ghost'}
                size='sm'
                onClick={() => setSelectedAppFilter('NINJA')}
                className='h-6 text-[10px] px-2 rounded-md gap-1'
              >
                <span className='size-1.5 rounded-full bg-amber-500 inline-block' />
                نينجا
              </Button>
              <Button
                type='button'
                variant={selectedAppFilter === 'KEETA' ? 'default' : 'ghost'}
                size='sm'
                onClick={() => setSelectedAppFilter('KEETA')}
                className='h-6 text-[10px] px-2 rounded-md gap-1'
              >
                <span className='size-1.5 rounded-full bg-emerald-500 inline-block' />
                كيتا
              </Button>
            </div>
          </div>

          {/* Results List */}
          <div className='max-h-64 overflow-y-auto divide-y divide-border/30 p-1'>
            {loading ? (
              <div className='py-8 text-center text-xs text-muted-foreground'>
                جاري تحميل قائمة المعرفات...
              </div>
            ) : filteredList.length === 0 ? (
              <div className='py-6 px-3 text-center space-y-2'>
                <p className='text-xs text-muted-foreground'>
                  لم يتم العثور على معرّف يطابق &quot;{search}&quot;
                </p>
                {search.trim() && (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleCustomManualSubmit}
                    className='text-xs gap-1.5 mx-auto'
                  >
                    <Plus className='size-3.5' />
                    استخدام &quot;{search.trim()}&quot; كمعرّف جديد يدوي
                  </Button>
                )}
              </div>
            ) : (
              filteredList.map((item) => {
                const isNinja = (item.app_name || '').toUpperCase().includes('NINJA');
                const isSelected = selectedItem?.id === item.id;
                const isLinkedOther =
                  item.employee_id && item.employee_id !== currentEmployeeId && item.employee;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs',
                      isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/50'
                    )}
                  >
                    <div className='flex items-center gap-2.5 min-w-0'>
                      <Avatar className='size-8 rounded-full border shadow-2xs shrink-0'>
                        {item.avatar ? (
                          <AvatarImage
                            src={item.avatar}
                            alt={item.name_ar || item.name}
                            className='object-cover'
                          />
                        ) : null}
                        <AvatarFallback className='text-[10px] font-bold bg-muted text-muted-foreground'>
                          {getAvatarInitials(item.name_ar || item.name, isNinja ? 'ن' : 'ك')}
                        </AvatarFallback>
                      </Avatar>

                      <div className='min-w-0'>
                        <div className='flex items-center gap-1.5'>
                          <span className='font-semibold text-foreground truncate'>
                            {item.name_ar || item.name}
                          </span>
                          {item.name_en && (
                            <span className='text-[10px] text-muted-foreground uppercase font-mono truncate'>
                              ({item.name_en})
                            </span>
                          )}
                        </div>
                        <div className='flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground'>
                          <span className='font-mono font-bold text-foreground'>
                            ID: {item.code || item.ninja_id}
                          </span>
                          {item.mobile && <span className='font-mono'>📱 {item.mobile}</span>}
                          {isLinkedOther && (
                            <span className='text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5'>
                              <AlertCircle className='size-2.5' />
                              مربوط: {item.employee?.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className='flex items-center gap-2 shrink-0'>
                      <Badge
                        variant='outline'
                        className={cn(
                          'text-[9px] font-semibold py-0 px-1.5',
                          isNinja
                            ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                            : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                        )}
                      >
                        {isNinja ? 'نينجا' : 'كيتا'}
                      </Badge>
                      {isSelected && <Check className='size-4 text-primary' />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick manual entry helper */}
          {search.trim() && (
            <div className='p-2 border-t border-border/60 bg-muted/30 flex items-center justify-between text-[11px]'>
              <span className='text-muted-foreground'>معرّف يدوي:</span>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={handleCustomManualSubmit}
                className='h-6 text-xs text-primary font-medium gap-1'
              >
                استخدام &quot;{search.trim()}&quot;
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
