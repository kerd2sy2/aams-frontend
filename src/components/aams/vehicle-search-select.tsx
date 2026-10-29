'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Vehicle } from '@/types/aams';
import { Search, X, Check, Bike, Car, Gauge, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface VehicleSearchSelectProps {
  vehicles: Vehicle[];
  value: string; // selected plate_number
  onChange: (plate: string, vehicle?: Vehicle) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const VehicleSearchSelect: React.FC<VehicleSearchSelectProps> = ({
  vehicles,
  value,
  onChange,
  placeholder = 'ابحث برقم اللوحة أو الحروف (مثال: 2459 أو STA)...',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize Arabic to English digits for flexible search
  const normalizeDigits = (str: string) => {
    const arDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return (str || '').replace(/[٠-٩]/g, (w) => `${arDigits.indexOf(w)}`).toLowerCase();
  };

  // Close dropdown when clicking outside
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
    return vehicles.find(
      (v) => (v.plate_number || '').trim().toLowerCase() === value.trim().toLowerCase()
    );
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

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={containerRef} className='relative w-full space-y-2'>
      {/* Selected Vehicle Card Preview (When selected) */}
      {selectedVehicle ? (
        <div className='p-3.5 rounded-xl border border-primary/25 bg-primary/5 flex items-center justify-between gap-3 transition-all'>
          <div className='flex items-center gap-3'>
            <div className='size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold shadow-sm'>
              {selectedVehicle.vehicle_type === 'car' || selectedVehicle.type === 'CAR' ? (
                <Car className='size-5' />
              ) : (
                <Bike className='size-5' />
              )}
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='font-mono text-primary font-black text-sm'>
                  {selectedVehicle.plate_number}
                </span>
                <Badge variant='outline' className='text-[10px] px-1.5 py-0 font-medium'>
                  {selectedVehicle.vehicle_type === 'car' || selectedVehicle.type === 'CAR'
                    ? '🚗 سيارة'
                    : '🏍️ دباب'}
                </Badge>
                {selectedVehicle.status === 'AVAILABLE' && (
                  <Badge
                    variant='secondary'
                    className='text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0 border-emerald-500/20'
                  >
                    متاح
                  </Badge>
                )}
              </div>
              <p className='text-muted-foreground text-xs mt-0.5'>
                {selectedVehicle.brand || selectedVehicle.make || ''}{' '}
                {selectedVehicle.model ? `${selectedVehicle.model}` : ''}
                {selectedVehicle.current_km !== undefined
                  ? ` • العداد: ${Number(selectedVehicle.current_km).toLocaleString('en-US')} كم`
                  : ''}
              </p>
            </div>
          </div>

          <div className='flex items-center gap-1.5'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => {
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className='h-8 text-xs gap-1'
            >
              <Search className='size-3.5' />
              تغيير الدباب
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={handleClear}
              className='size-8 text-muted-foreground hover:text-destructive'
              title='إلغاء التعيين'
            >
              <X className='size-4' />
            </Button>
          </div>
        </div>
      ) : null}

      {/* Search Input Bar */}
      {(!selectedVehicle || isOpen) && (
        <div className='relative'>
          <div className='relative flex items-center'>
            <Search className='absolute right-3.5 size-4 text-muted-foreground pointer-events-none' />
            <Input
              ref={inputRef}
              type='text'
              disabled={disabled}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className='pr-10 pl-10 h-11 rounded-xl bg-background border-input font-medium text-sm focus:ring-2 focus:ring-primary/20'
            />
            {searchQuery ? (
              <button
                type='button'
                onClick={() => setSearchQuery('')}
                className='absolute left-3 size-5 text-muted-foreground hover:text-foreground flex items-center justify-center rounded-full hover:bg-muted'
              >
                <X className='size-3.5' />
              </button>
            ) : (
              <ChevronDown className='absolute left-3 size-4 text-muted-foreground pointer-events-none' />
            )}
          </div>

          {/* Real-time Filtered Results Dropdown */}
          {isOpen && (
            <div className='absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100'>
              <div className='p-2 border-b bg-muted/30 flex items-center justify-between text-xs text-muted-foreground'>
                <span>
                  نتائج البحث:{' '}
                  <strong className='text-foreground'>{filteredVehicles.length}</strong> مركبة
                </span>
                {searchQuery && (
                  <span className='text-[11px]'>
                    تصفية حسب:{' '}
                    <code className='text-primary font-mono font-bold'>{searchQuery}</code>
                  </span>
                )}
              </div>

              <div className='max-h-64 overflow-y-auto divide-y divide-border/50'>
                {filteredVehicles.length === 0 ? (
                  <div className='p-6 text-center text-sm text-muted-foreground space-y-1'>
                    <p className='font-semibold text-foreground'>
                      لم يتم العثور على أي مركبة بهذا الرقم!
                    </p>
                    <p className='text-xs'>
                      جرب كتابة الأرقام الإنجليزية أو العربية، أو تأكد من إضافة المركبة في صفحة
                      الأسطول.
                    </p>
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
                        className={`w-full text-right p-3 flex items-center justify-between gap-3 transition-colors hover:bg-primary/10 ${
                          isSelected ? 'bg-primary/15 font-bold' : ''
                        }`}
                      >
                        <div className='flex items-center gap-3'>
                          <div
                            className={`size-8 rounded-lg flex items-center justify-center ${
                              isCar
                                ? 'bg-blue-500/10 text-blue-600'
                                : 'bg-emerald-500/10 text-emerald-600'
                            }`}
                          >
                            {isCar ? <Car className='size-4' /> : <Bike className='size-4' />}
                          </div>

                          <div>
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
                              {v.key_number && (
                                <span className='text-[11px] font-mono text-muted-foreground'>
                                  مفتاح: {v.key_number}
                                </span>
                              )}
                            </div>
                            <p className='text-xs text-muted-foreground mt-0.5'>
                              {v.brand || v.make || 'مركبة'} {v.model ? `${v.model}` : ''}{' '}
                              {v.model_year || v.year ? `(${v.model_year || v.year})` : ''}
                            </p>
                          </div>
                        </div>

                        <div className='flex items-center gap-3'>
                          <div className='text-left font-mono text-xs'>
                            <span className='text-muted-foreground text-[10px] block'>العداد</span>
                            <span className='font-bold flex items-center gap-1 text-foreground'>
                              <Gauge className='size-3 text-muted-foreground' />
                              {Number(v.current_km || 0).toLocaleString('en-US')} كم
                            </span>
                          </div>

                          {isSelected && (
                            <div className='size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center'>
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
      )}
    </div>
  );
};
