'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Employee } from '@/types/aams';
import { Search, X, Check, User, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmployeeSearchSelectProps {
  employees: Array<Pick<Employee, 'id' | 'name'> | Employee>;
  value: string; // selected employee ID
  onChange: (id: string, employee?: any) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  allowAll?: boolean;
  allLabel?: string;
  allValue?: string;
}

export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel / diacritics
    .replace(/[أإآء]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export const EmployeeSearchSelect: React.FC<EmployeeSearchSelectProps> = ({
  employees = [],
  value = '',
  onChange,
  placeholder = 'اختر المندوب (اكتب أول حرفين للبحث)...',
  disabled = false,
  loading = false,
  className,
  allowAll = false,
  allLabel = 'جميع المناديب',
  allValue = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedEmployee = useMemo(() => {
    if (!value || value === allValue) return null;
    return employees.find((e) => e.id === value) || null;
  }, [employees, value, allValue]);

  const isAllSelected = allowAll && (!value || value === allValue);

  // Filter employees by normalized search query
  const filteredEmployees = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    if (!q) return employees;
    return employees.filter((e) => {
      const name = normalizeArabic(e.name || '');
      return name.includes(q);
    });
  }, [employees, searchQuery]);

  const handleSelect = (emp: any) => {
    onChange(emp.id, emp);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleSelectAll = () => {
    onChange(allValue);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange(allowAll ? allValue : '');
    setSearchQuery('');
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const displayLabel = useMemo(() => {
    if (isAllSelected) return allLabel;
    if (selectedEmployee) return selectedEmployee.name;
    return '';
  }, [isAllSelected, allLabel, selectedEmployee]);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Combobox Trigger & Search Input */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
        className={cn(
          'flex items-center justify-between w-full h-10 px-3 rounded-md border bg-background text-sm cursor-text transition-colors',
          isOpen ? 'ring-2 ring-primary/20 border-primary' : 'border-input hover:border-border',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <div className='flex items-center gap-2 flex-1 min-w-0 pr-1'>
          <User className='size-4 text-muted-foreground shrink-0' />
          <input
            ref={inputRef}
            type='text'
            disabled={disabled}
            value={isOpen ? searchQuery : displayLabel}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
            }}
            placeholder={displayLabel || placeholder}
            className='w-full bg-transparent border-0 outline-none text-foreground text-sm font-medium placeholder:text-muted-foreground truncate'
          />
        </div>

        <div className='flex items-center gap-1 shrink-0 text-muted-foreground'>
          {loading && <Loader2 className='size-4 animate-spin text-primary' />}
          {(value && value !== allValue) || searchQuery ? (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={handleClear}
              className='size-7 text-muted-foreground hover:text-destructive'
              title='مسح الاختيار'
            >
              <X className='size-3.5' />
            </Button>
          ) : null}
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
              if (!isOpen) inputRef.current?.focus();
            }}
            className='size-7 text-muted-foreground hover:text-foreground'
          >
            <ChevronsUpDown className='size-4 opacity-60' />
          </Button>
        </div>
      </div>

      {/* Dropdown Popover List */}
      {isOpen && (
        <div className='absolute z-50 left-0 right-0 top-full mt-1 bg-popover border border-border shadow-xl rounded-md overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 max-h-64 flex flex-col'>
          {/* Header indicator */}
          <div className='px-3 py-1.5 border-b border-border/60 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground shrink-0'>
            <span>
              النتائج:{' '}
              <strong className='text-foreground font-semibold'>{filteredEmployees.length}</strong>
            </span>
            {searchQuery && (
              <span className='text-[11px] truncate max-w-[150px]'>
                بحث عن: <strong className='text-primary'>{searchQuery}</strong>
              </span>
            )}
          </div>

          {/* List items */}
          <div className='overflow-y-auto p-1 space-y-0.5 flex-1 divide-y divide-border/20'>
            {allowAll && !searchQuery && (
              <button
                type='button'
                onClick={handleSelectAll}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-sm text-sm text-right transition-colors hover:bg-accent hover:text-accent-foreground',
                  isAllSelected ? 'bg-primary/10 text-primary font-bold' : 'text-foreground'
                )}
              >
                <span>{allLabel}</span>
                {isAllSelected && <Check className='size-4 text-primary shrink-0' />}
              </button>
            )}

            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp) => {
                const isSelected = value === emp.id;
                return (
                  <button
                    key={emp.id}
                    type='button'
                    onClick={() => handleSelect(emp)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-sm text-sm text-right transition-colors hover:bg-accent hover:text-accent-foreground',
                      isSelected ? 'bg-primary/10 text-primary font-bold' : 'text-foreground'
                    )}
                  >
                    {/* Clean employee name ONLY */}
                    <span className='truncate'>{emp.name}</span>
                    {isSelected && <Check className='size-4 text-primary shrink-0 mr-2' />}
                  </button>
                );
              })
            ) : (
              <div className='p-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5'>
                <Search className='size-5 opacity-40' />
                <span>لا يوجد مندوب مطابق لـ &quot;{searchQuery}&quot;</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
