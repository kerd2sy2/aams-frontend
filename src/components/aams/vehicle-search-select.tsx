'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Vehicle } from '@/types/aams';
import { Search, X, Check, Bike, Car, Gauge, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VehicleSearchSelectProps {
  vehicles: Vehicle[];
  value: string; // selected plate_number
  onChange: (plate: string, vehicle?: Vehicle) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

export const VehicleSearchSelect: React.FC<VehicleSearchSelectProps> = ({
  vehicles = [],
  value = '',
  onChange,
  placeholder = 'ابحث برقم اللوحة أو الحروف (اكتب الأرقام مباشرة: 2459)...',
  disabled = false,
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize digits (Arabic ٠-٩ to English 0-9)
  const normalizeDigits = (str: string) => {
    const arDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return (str || '').replace(/[٠-٩]/g, (w) => `${arDigits.indexOf(w)}`).toLowerCase();
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedVehicle = useMemo(() => {
    if (!value) return null;
    const cleanVal = value.trim().toLowerCase();
    return vehicles.find((v) => (v.plate_number || '').trim().toLowerCase() === cleanVal);
  }, [vehicles, value]);

  const filteredVehicles = useMemo(() => {
    const q = normalizeDigits(searchQuery.trim());
    if (!q) return vehicles;

    return vehicles.filter((v) => {
      const plate = normalizeDigits(v.plate_number || '');
      const brand = normalizeDigits(v.brand || v.make || '');
      const key = normalizeDigits(v.key_number || '');
      const notes = normalizeDigits(v.notes || '');

      return plate.includes(q) || brand.includes(q) || key.includes(q) || notes.includes(q);
    });
  }, [vehicles, searchQuery]);

  const handleSelect = (v: Vehicle) => {
    onChange(v.plate_number, v);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange('');
    setSearchQuery('');
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div ref={containerRef} className='relative w-full space-y-2'>
      {/* Combobox Trigger & Search Input (ALWAYS VISIBLE) */}
      <div className='relative'>
        <div
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              inputRef.current?.focus();
            }
          }}
          className={cn(
            'flex items-center justify-between w-full h-11 px-3 rounded-xl border bg-background text-sm cursor-text transition-colors',
            isOpen ? 'ring-2 ring-primary/20 border-primary' : 'border-input hover:border-border',
            disabled && 'opacity-60 cursor-not-allowed'
          )}
        >
          <div className='flex items-center gap-2.5 flex-1 min-w-0 pr-1'>
            <Search className='size-4 text-muted-foreground shrink-0' />
            <input
              ref={inputRef}
              type='text'
              disabled={disabled}
              value={isOpen ? searchQuery : value || ''}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => {
                setIsOpen(true);
              }}
              placeholder={value ? `اللوحة المختارة: ${value}` : placeholder}
              className='w-full bg-transparent border-0 outline-none text-foreground text-sm font-medium placeholder:text-muted-foreground'
            />
          </div>

          <div className='flex items-center gap-1 shrink-0 text-muted-foreground'>
            {loading && <Loader2 className='size-4 animate-spin text-primary' />}
            {(value || searchQuery) && (
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
            )}
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
          <div className='absolute z-50 left-0 right-0 top-full mt-1.5 bg-popover border border-border shadow-2xl rounded-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 max-h-80 flex flex-col'>
            <div className='p-2 border-b border-border/60 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground shrink-0'>
              <span>
                النتائج المتاحة:{' '}
                <strong className='text-foreground'>{filteredVehicles.length}</strong> مركبة
              </span>
              {searchQuery && (
                <span className='text-[11px] font-mono'>
                  البحث: <strong className='text-primary'>{searchQuery}</strong>
                </span>
              )}
            </div>

            <div className='overflow-y-auto divide-y divide-border/40 flex-1'>
              {loading ? (
                <div className='p-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2'>
                  <Loader2 className='size-4 animate-spin text-primary' />
                  <span>جاري تحميل قائمة المركبات...</span>
                </div>
              ) : filteredVehicles.length === 0 ? (
                <div className='p-6 text-center text-sm text-muted-foreground space-y-1'>
                  <p className='font-semibold text-foreground'>
                    لم يتم العثور على أي مركبة بهذا الرقم!
                  </p>
                  <p className='text-xs'>اكتب أرقام اللوحة (مثال: 2459 أو 6534) أو الحروف.</p>
                </div>
              ) : (
                filteredVehicles.map((v) => {
                  const isSelected =
                    (v.plate_number || '').trim().toLowerCase() ===
                    (value || '').trim().toLowerCase();
                  const isCar = v.vehicle_type === 'car' || v.type === 'CAR';

                  return (
                    <button
                      key={v.id}
                      type='button'
                      onClick={() => handleSelect(v)}
                      className={cn(
                        'w-full text-right p-3 flex items-center justify-between gap-3 transition-colors hover:bg-primary/10 cursor-pointer',
                        isSelected && 'bg-primary/15 font-bold'
                      )}
                    >
                      <div className='flex items-center gap-3 min-w-0'>
                        <div
                          className={cn(
                            'size-8 rounded-lg flex items-center justify-center shrink-0',
                            isCar
                              ? 'bg-blue-500/10 text-blue-600'
                              : 'bg-emerald-500/10 text-emerald-600'
                          )}
                        >
                          {isCar ? <Car className='size-4' /> : <Bike className='size-4' />}
                        </div>

                        <div className='truncate'>
                          <div className='flex items-center gap-2'>
                            <span className='font-mono font-black text-sm text-foreground'>
                              {v.plate_number}
                            </span>
                            <Badge
                              variant='outline'
                              className='text-[10px] px-1.5 py-0 font-normal'
                            >
                              {isCar ? 'سيارة' : 'دباب'}
                            </Badge>
                            {v.status === 'AVAILABLE' && (
                              <Badge
                                variant='secondary'
                                className='text-[9px] bg-emerald-500/10 text-emerald-600 px-1 py-0'
                              >
                                متاح
                              </Badge>
                            )}
                          </div>
                          <p className='text-xs text-muted-foreground mt-0.5 truncate'>
                            {v.brand || v.make || 'مركبة'} {v.model ? `${v.model}` : ''}{' '}
                            {v.key_number ? `• مفتاح: ${v.key_number}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className='flex items-center gap-2.5 shrink-0'>
                        <div className='text-left font-mono text-xs'>
                          <span className='text-muted-foreground text-[10px] block'>العداد</span>
                          <span className='font-bold flex items-center gap-1 text-foreground'>
                            <Gauge className='size-3 text-muted-foreground' />
                            {Number(v.current_km || 0).toLocaleString('en-US')} كم
                          </span>
                        </div>

                        {isSelected && (
                          <div className='size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0'>
                            <Check className='size-3' />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
