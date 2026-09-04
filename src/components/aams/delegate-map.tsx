'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getWhatsAppURL, cn } from '@/lib/utils';
import type { EmployeeLocation, Branch } from '@/types/aams';
import {
  MapPin,
  Search,
  RefreshCw,
  Phone,
  MessageCircle,
  Building2,
  Bike,
  ExternalLink,
  Users,
  Compass,
  Layers,
  AlertCircle,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw
} from 'lucide-react';

// Default Center: Taif, Saudi Arabia (الطائف)
const TAIF_CENTER: [number, number] = [21.2854, 40.4222];
const DEFAULT_ZOOM = 12;

interface DelegateMapProps {
  employees: EmployeeLocation[];
  branches?: Branch[];
  isLoading?: boolean;
  onRefresh?: () => void;
  selectedBranchId?: string;
  onSelectBranchId?: (id: string) => void;
}

export default function DelegateMap({
  employees = [],
  branches = [],
  isLoading = false,
  onRefresh,
  selectedBranchId = '',
  onSelectBranchId
}: DelegateMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);

  const [search, setSearch] = useState('');
  const [filterShift, setFilterShift] = useState<
    'ALL' | 'ACTIVE' | 'OFFLINE' | 'SUSPICIOUS' | 'OUT_OF_ZONE'
  >('ALL');
  const [filterHasGps, setFilterHasGps] = useState<'ALL' | 'WITH_GPS'>('ALL');
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(25);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Branch filter
      if (selectedBranchId && emp.branch_id !== selectedBranchId) {
        return false;
      }
      // Shift & Security filter
      if (filterShift === 'ACTIVE' && !emp.is_shift_active) {
        return false;
      }
      if (filterShift === 'OFFLINE' && emp.is_shift_active) {
        return false;
      }
      if (filterShift === 'SUSPICIOUS' && !(emp.is_vpn || emp.is_mock_location)) {
        return false;
      }
      if (filterShift === 'OUT_OF_ZONE' && !emp.out_of_zone) {
        return false;
      }
      // GPS filter
      if (filterHasGps === 'WITH_GPS' && (!emp.latitude || !emp.longitude)) {
        return false;
      }
      // Search filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(q);
        const matchesPhone = emp.phone?.toLowerCase().includes(q);
        const matchesNid = emp.national_id.toLowerCase().includes(q);
        const matchesMotor = emp.motorcycle_number?.toLowerCase().includes(q);
        const matchesKey = emp.key_number?.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesNid && !matchesMotor && !matchesKey) {
          return false;
        }
      }
      return true;
    });
  }, [employees, selectedBranchId, filterShift, filterHasGps, search]);

  const stats = useMemo(() => {
    const total = employees.length;
    const withGps = employees.filter((e) => e.latitude && e.longitude).length;
    const activeShift = employees.filter((e) => e.is_shift_active).length;
    const activeWithGps = employees.filter(
      (e) => e.is_shift_active && e.latitude && e.longitude
    ).length;
    const suspiciousCount = employees.filter((e) => e.is_vpn || e.is_mock_location).length;
    const outOfZoneCount = employees.filter((e) => e.out_of_zone).length;

    return { total, withGps, activeShift, activeWithGps, suspiciousCount, outOfZoneCount };
  }, [employees]);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh || !onRefresh) return;
    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          onRefresh();
          return 25;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  // Initialize Map once
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import('leaflet')).default;

      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: TAIF_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap Tiles with crisp rendering
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
      markersGroupRef.current = markersGroup;
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersGroupRef.current = null;
      }
    };
  }, []);

  // Update Markers when filteredEmployees changes
  useEffect(() => {
    async function updateMarkers() {
      if (!mapInstanceRef.current || !markersGroupRef.current) return;
      const L = (await import('leaflet')).default;

      const markersGroup = markersGroupRef.current;
      markersGroup.clearLayers();

      const validCoords: [number, number][] = [];

      filteredEmployees.forEach((emp) => {
        if (!emp.latitude || !emp.longitude) return;

        const lat = emp.latitude;
        const lng = emp.longitude;
        validCoords.push([lat, lng]);

        const isActive = emp.is_shift_active;
        const isSuspicious = emp.is_vpn || emp.is_mock_location || emp.out_of_zone;

        let ringColor = isActive ? '#10b981' : '#64748b';
        let badgeBg = isActive ? '#ecfdf5' : '#f1f5f9';
        let badgeText = isActive ? '#059669' : '#475569';
        let statusLabel = isActive ? 'شفت نشط' : 'خارج الشفت';

        if (isSuspicious) {
          ringColor = '#ef4444'; // Red for fraud/warning
          badgeBg = '#fef2f2';
          badgeText = '#b91c1c';
          if (emp.is_vpn) statusLabel = 'VPN مشتبه به';
          else if (emp.is_mock_location) statusLabel = 'موقع وهمي';
          else if (emp.out_of_zone) statusLabel = 'خارج الطائف';
        }

        const phoneDisplay = emp.phone || emp.employee_number || '';
        const waUrl = phoneDisplay
          ? getWhatsAppURL(phoneDisplay, `السلام عليكم يا ${emp.name}`)
          : '';

        const avatarSrc = emp.personal_image || '';

        // Custom DivIcon for the marker
        const markerHtml = `
          <div class="delegate-marker-container" style="position: relative; width: 46px; height: 58px; display: flex; flex-direction: column; align-items: center;">
            <div style="
              width: 42px;
              height: 42px;
              border-radius: 50%;
              background: ${ringColor};
              padding: 2.5px;
              box-shadow: 0 4px 14px ${isSuspicious ? 'rgba(239, 68, 68, 0.45)' : 'rgba(0,0,0,0.28)'};
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
              cursor: pointer;
            ">
              <div style="
                width: 100%;
                height: 100%;
                border-radius: 50%;
                overflow: hidden;
                background: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                ${
                  avatarSrc
                    ? `<img src="${avatarSrc}" alt="${emp.name}" style="width:100%; height:100%; object-fit: cover;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=10b981&color=fff';" />`
                    : `<div style="font-size: 15px; font-weight: 800; color: ${ringColor};">${emp.name.slice(0, 1)}</div>`
                }
              </div>
              <span style="
                position: absolute;
                bottom: -2px;
                right: -2px;
                width: ${isSuspicious ? '16px' : '13px'};
                height: ${isSuspicious ? '16px' : '13px'};
                border-radius: 50%;
                background: ${ringColor};
                border: 2px solid #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 9px;
                color: #ffffff;
                font-weight: 900;
              ">${isSuspicious ? '!' : ''}</span>
            </div>
            <div style="
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 7px solid ${ringColor};
              margin-top: -1px;
            "></div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: markerHtml,
          className: 'custom-delegate-icon',
          iconSize: [46, 58],
          iconAnchor: [23, 56],
          popupAnchor: [0, -56]
        });

        const marker = L.marker([lat, lng], { icon: customIcon });

        // Build interactive Popup HTML
        const popupContent = `
          <div dir="rtl" style="font-family: inherit; width: 260px; padding: 4px; text-align: right;">
            <div style="display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 8px;">
              <div style="width: 44px; height: 44px; border-radius: 12px; overflow: hidden; border: 1.5px solid ${ringColor}; flex-shrink: 0; background: #f8fafc;">
                <img src="${avatarSrc || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}`}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}';" />
              </div>
              <div style="min-width: 0; flex: 1;">
                <h4 style="margin: 0; font-size: 14px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${emp.name}
                </h4>
                <div style="display: flex; align-items: center; gap: 6px; margin-top: 3px;">
                  <span style="font-size: 11px; font-weight: 700; background: ${badgeBg}; color: ${badgeText}; padding: 1px 7px; border-radius: 6px;">
                    ${statusLabel}
                  </span>
                  ${emp.branch_name ? `<span style="font-size: 11px; color: #64748b;">${emp.branch_name}</span>` : ''}
                </div>
              </div>
            </div>

            <div style="font-size: 12px; color: #475569; display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px;">
              ${
                phoneDisplay
                  ? `<div style="display: flex; align-items: center; justify-content: space-between;">
                      <span style="color: #64748b;">الجوال:</span>
                      <span style="font-family: monospace; font-weight: 700; color: #0f172a;" dir="ltr">${phoneDisplay}</span>
                    </div>`
                  : ''
              }
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="color: #64748b;">الهوية:</span>
                <span style="font-family: monospace; font-weight: 600;">${emp.national_id}</span>
              </div>
              ${
                emp.motorcycle_number
                  ? `<div style="display: flex; align-items: center; justify-content: space-between;">
                      <span style="color: #64748b;">المركبة / اللوحة:</span>
                      <span style="font-weight: 800; color: #0284c7;">🏍 ${emp.motorcycle_number}</span>
                    </div>`
                  : ''
              }
              ${
                emp.application_type
                  ? `<div style="display: flex; align-items: center; justify-content: space-between;">
                      <span style="color: #64748b;">التطبيق:</span>
                      <span style="font-weight: 700; color: #ea580c;">${emp.application_type}</span>
                    </div>`
                  : ''
              }
              ${
                isSuspicious
                  ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 6px 8px; margin-top: 4px; display: flex; flex-direction: column; gap: 3px;">
                  <span style="font-size: 11px; font-weight: 800; color: #dc2626; display: flex; align-items: center; gap: 4px;">
                    ⚠️ رصد مخالفة أمنية:
                  </span>
                  ${emp.is_vpn ? `<span style="font-size: 11px; color: #b91c1c; font-weight: 600;">• المندوب يستخدم تطبيق VPN</span>` : ''}
                  ${emp.is_mock_location ? `<span style="font-size: 11px; color: #b91c1c; font-weight: 600;">• استخدام تطبيق موقع وهمي (Fake GPS)</span>` : ''}
                  ${emp.out_of_zone ? `<span style="font-size: 11px; color: #b91c1c; font-weight: 600;">• خارج نطاق الطائف (${emp.distance_from_taif_km ? emp.distance_from_taif_km + ' كم' : 'أكثر من 45 كم'})</span>` : ''}
                </div>`
                  : ''
              }
              ${
                emp.last_location_at
                  ? `<div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #94a3b8; margin-top: 2px;">
                      <span>آخر تحديث:</span>
                      <span dir="ltr">${new Date(emp.last_location_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>`
                  : ''
              }
            </div>

            <div style="display: flex; gap: 6px; padding-top: 4px; border-top: 1px solid #f1f5f9;">
              ${
                phoneDisplay
                  ? `
                <a href="tel:${phoneDisplay}" style="flex: 1; text-decoration: none;">
                  <button style="width: 100%; height: 32px; background: #0284c7; color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                    اتصال
                  </button>
                </a>
                <a href="${waUrl}" target="_blank" style="flex: 1; text-decoration: none;">
                  <button style="width: 100%; height: 32px; background: #10b981; color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                    واتساب
                  </button>
                </a>`
                  : ''
              }
              <a href="/dashboard/employees/${emp.id}" style="text-decoration: none;">
                <button style="height: 32px; padding: 0 10px; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
                  الملف
                </button>
              </a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 280,
          className: 'delegate-leaflet-popup'
        });

        marker.on('click', () => {
          setSelectedEmpId(emp.id);
        });

        markersGroup.addLayer(marker);
      });

      // If we have markers and this was user action, fit bounds
      if (validCoords.length > 0 && selectedEmpId) {
        const found = filteredEmployees.find((e) => e.id === selectedEmpId);
        if (found && found.latitude && found.longitude) {
          mapInstanceRef.current.flyTo([found.latitude, found.longitude], 16, { duration: 1.2 });
        }
      }
    }

    updateMarkers();
  }, [filteredEmployees, selectedEmpId]);

  // Center on Taif
  const handleCenterOnTaif = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(TAIF_CENTER, DEFAULT_ZOOM, { duration: 1 });
    }
  };

  // Focus on specific delegate from search
  const handleSelectDelegate = (emp: EmployeeLocation) => {
    setSelectedEmpId(emp.id);
    if (emp.latitude && emp.longitude && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([emp.latitude, emp.longitude], 16, { duration: 1.2 });
    }
  };

  return (
    <div
      className='relative w-full h-[calc(100vh-140px)] min-h-[580px] rounded-2xl overflow-hidden border border-border shadow-md bg-card flex flex-col'
      dir='rtl'
    >
      {/* Top Floating Control Bar */}
      <div className='absolute top-3 inset-x-3 z-[1000] pointer-events-auto flex flex-wrap items-center justify-between gap-2.5 bg-background/90 backdrop-blur-md p-2.5 rounded-xl border border-border/70 shadow-lg'>
        {/* Left / Start: Stats & Search */}
        <div className='flex flex-wrap items-center gap-2 flex-1 min-w-[280px]'>
          <div className='relative flex-1 min-w-[180px] max-w-xs'>
            <Search className='absolute right-2.5 top-2.5 size-4 text-muted-foreground' />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='ابحث عن مندوب، هوية، لوحة...'
              className='pr-8 h-9 text-xs bg-background/80'
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className='absolute left-2 top-2 text-xs text-muted-foreground hover:text-foreground'
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filter Buttons */}
          <div className='flex items-center gap-1 bg-muted/70 p-0.5 rounded-lg border'>
            <Button
              variant={filterShift === 'ALL' ? 'default' : 'ghost'}
              size='sm'
              className='h-7 text-xs px-2.5 font-bold'
              onClick={() => setFilterShift('ALL')}
            >
              الكل ({stats.total})
            </Button>
            <Button
              variant={filterShift === 'ACTIVE' ? 'default' : 'ghost'}
              size='sm'
              className={cn(
                'h-7 text-xs px-2.5 font-bold',
                filterShift === 'ACTIVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'text-emerald-600 dark:text-emerald-400'
              )}
              onClick={() => setFilterShift('ACTIVE')}
            >
              🟢 في الشفت ({stats.activeShift})
            </Button>
            {stats.suspiciousCount > 0 && (
              <Button
                variant={filterShift === 'SUSPICIOUS' ? 'default' : 'ghost'}
                size='sm'
                className={cn(
                  'h-7 text-xs px-2.5 font-bold',
                  filterShift === 'SUSPICIOUS'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                )}
                onClick={() => setFilterShift('SUSPICIOUS')}
              >
                ⚠️ VPN / موقع وهمي ({stats.suspiciousCount})
              </Button>
            )}
            {stats.outOfZoneCount > 0 && (
              <Button
                variant={filterShift === 'OUT_OF_ZONE' ? 'default' : 'ghost'}
                size='sm'
                className={cn(
                  'h-7 text-xs px-2.5 font-bold',
                  filterShift === 'OUT_OF_ZONE'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                )}
                onClick={() => setFilterShift('OUT_OF_ZONE')}
              >
                🚩 خارج الطائف ({stats.outOfZoneCount})
              </Button>
            )}
            <Button
              variant={filterShift === 'OFFLINE' ? 'default' : 'ghost'}
              size='sm'
              className='h-7 text-xs px-2 font-bold'
              onClick={() => setFilterShift('OFFLINE')}
            >
              خارج الشفت
            </Button>
          </div>

          {/* Branch Filter */}
          {branches.length > 0 && (
            <select
              value={selectedBranchId}
              onChange={(e) => onSelectBranchId?.(e.target.value)}
              className='h-9 px-2.5 rounded-lg border bg-background text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20'
            >
              <option value=''>جميع الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right / End: Actions & City Focus */}
        <div className='flex items-center gap-2 shrink-0'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleCenterOnTaif}
            className='h-8 text-xs font-bold gap-1.5 shadow-2xs'
            title='التركيز على الطائف'
          >
            <Compass className='size-3.5 text-primary' />
            <span>الطائف</span>
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={() => onRefresh?.()}
            disabled={isLoading}
            className='h-8 text-xs font-bold gap-1.5 shadow-2xs'
          >
            <RefreshCw className={cn('size-3.5', isLoading && 'animate-spin text-primary')} />
            <span>تحديث</span>
            {autoRefresh && (
              <span className='text-[10px] text-muted-foreground font-mono'>
                ({refreshCountdown}ث)
              </span>
            )}
          </Button>

          <Button
            variant={autoRefresh ? 'secondary' : 'ghost'}
            size='sm'
            onClick={() => setAutoRefresh(!autoRefresh)}
            className='h-8 text-xs font-bold px-2'
            title={autoRefresh ? 'إيقاف التحديث التلقائي' : 'تشغيل التحديث التلقائي'}
          >
            {autoRefresh ? 'مباشر ⚡' : 'موقوف'}
          </Button>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div ref={mapContainerRef} className='w-full flex-1 z-0 relative' />

      {/* Bottom Floating Stats / Delegates Strip */}
      <div className='absolute bottom-3 inset-x-3 z-[1000] pointer-events-none flex items-end justify-between gap-3'>
        {/* Quick summary pill */}
        <div className='pointer-events-auto bg-background/90 backdrop-blur-md px-3.5 py-2 rounded-xl border shadow-lg flex items-center gap-3 text-xs font-bold'>
          <div className='flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400'>
            <span className='size-2.5 rounded-full bg-emerald-500 animate-pulse' />
            <span>{stats.activeWithGps} مندوب متصل ومتحرك</span>
          </div>
          <span className='text-muted-foreground/40'>|</span>
          <div className='flex items-center gap-1 text-muted-foreground'>
            <MapPin className='size-3.5 text-primary' />
            <span>
              {stats.withGps} على الخريطة من أصل {stats.total}
            </span>
          </div>
        </div>

        {/* Delegates Horizontal Scroll List */}
        {filteredEmployees.length > 0 && (
          <div className='pointer-events-auto flex items-center gap-2 overflow-x-auto max-w-xl p-1.5 bg-background/85 backdrop-blur-md rounded-xl border shadow-lg'>
            {filteredEmployees.slice(0, 10).map((emp) => {
              const isActive = emp.is_shift_active;
              const hasGps = Boolean(emp.latitude && emp.longitude);
              return (
                <button
                  key={emp.id}
                  onClick={() => handleSelectDelegate(emp)}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all shrink-0 hover:bg-muted',
                    selectedEmpId === emp.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 bg-card text-foreground'
                  )}
                  title={hasGps ? 'انقر للتركيز على المندوب في الخريطة' : 'لم يسجل موقع GPS بعد'}
                >
                  <div className='relative size-6 rounded-full overflow-hidden border bg-muted flex items-center justify-center text-[10px]'>
                    {emp.personal_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={emp.personal_image}
                        alt={emp.name}
                        className='size-full object-cover'
                      />
                    ) : (
                      emp.name.slice(0, 1)
                    )}
                    <span
                      className={cn(
                        'absolute bottom-0 right-0 size-1.5 rounded-full border border-background',
                        isActive ? 'bg-emerald-500' : 'bg-slate-400'
                      )}
                    />
                  </div>
                  <span className='truncate max-w-[90px]'>{emp.name}</span>
                  {hasGps ? (
                    <MapPin className='size-3 text-emerald-500 shrink-0' />
                  ) : (
                    <span className='text-[10px] text-muted-foreground opacity-60'>—</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
