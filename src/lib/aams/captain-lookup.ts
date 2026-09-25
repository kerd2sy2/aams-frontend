import ninjaSeedData from './ninja-identifiers-seed.json';
import keetaSeedData from './keeta-identifiers-seed.json';
import { targetWebApi, getLocalOverrides } from './target-api';
import { employeeApi } from './services';
import type { IdentifierPerformance } from '@/types/target';
import type { Employee } from '@/types/aams';

export interface ResolvedCaptainInfo {
  id: string;
  captainNameAr?: string;
  captainNameEn?: string;
  displayName: string;
  avatar?: string;
  mobile?: string;
  nationalId?: string;
  employeeName?: string;
  employeeId?: string;
  isLinked: boolean;
  avatarFallback: string;
}

/**
 * Checks if a string is solely a numeric ID or placeholder (not a real name)
 */
export function isNumericOrIdOnly(val?: string | null): boolean {
  if (!val) return true;
  const clean = String(val)
    .replace(/^(كابتن|captain|id|معرف)\s*:?\s*/i, '')
    .trim();
  if (!clean) return true;
  return /^\d+$/.test(clean);
}

/**
 * Extracts letters-only initials for AvatarFallback.
 * Never outputs digits (e.g. prevents "21", "12", "67").
 */
export function getAvatarInitials(name?: string | null, fallback = 'ك'): string {
  if (!name) return fallback;
  // Remove numbers, brackets, punctuation
  const lettersOnly = String(name)
    .replace(/[0-9()\-:_\/\\#,.]/g, ' ')
    .trim();
  if (!lettersOnly) return fallback;

  const words = lettersOnly.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return lettersOnly.slice(0, 2).toUpperCase();
}

/**
 * Helper to match a captain ID against an employee record.
 * Handles patterns in employee.application_id such as:
 * - "67460 محمد سمير" -> ID: 67460, Name: محمد سمير
 * - "101868 نادر السيد" -> ID: 101868, Name: نادر السيد
 * - "شوهيل الرحمن 132450" -> ID: 132450
 * - "262813" -> ID: 262813
 * - employee_number === id
 */
export function matchEmployeeById(
  captainId: string,
  employees: Employee[]
): { employee: Employee; extractedArabicName?: string } | null {
  const cleanId = String(captainId).trim();
  if (!cleanId) return null;

  for (const emp of employees) {
    const appId = String(emp.application_id || '').trim();
    const empNum = String(emp.employee_number || '').trim();

    // 1. Direct match on employee_number
    if (empNum === cleanId) {
      return { employee: emp, extractedArabicName: emp.name };
    }

    // 2. Match on application_id
    if (appId) {
      if (appId === cleanId) {
        return { employee: emp, extractedArabicName: emp.name };
      }

      // Check if ID is a word in application_id (e.g. "67460 محمد سمير")
      const regex = new RegExp(`(^|\\s)${cleanId}(\\s|$)`);
      if (regex.test(appId)) {
        // Extract Arabic name portion if present
        const namePart = appId.replace(new RegExp(`(^|\\s)${cleanId}(\\s|$)`, 'g'), ' ').trim();
        const arabicPart = namePart.replace(/[0-9]/g, '').trim();
        return {
          employee: emp,
          extractedArabicName: arabicPart || emp.name
        };
      }
    }

    // 3. Direct match on UUID id
    if (emp.id === cleanId) {
      return { employee: emp, extractedArabicName: emp.name };
    }
  }

  return null;
}

/**
 * Build a master lookup map that resolves captain info from:
 * 1. Database employees (86+ records with application_id e.g. "67460 محمد سمير")
 * 2. Target Identifiers & Local Overrides (aams_identifiers_overrides_v1)
 * 3. Seed data (ninjaSeedData & keetaSeedData)
 */
export function buildCaptainLookup(
  app: 'NINJA' | 'KEETA',
  identifiers: IdentifierPerformance[],
  employees: Employee[]
): (captainId: string, rawNameFromCsv?: string) => ResolvedCaptainInfo {
  // Pre-index seeds
  const seedMap = new Map<string, any>();
  const seeds = app === 'NINJA' ? (ninjaSeedData as any[]) : (keetaSeedData as any[]);
  seeds.forEach((item) => {
    const key = String(item.ninja_id || item.keeta_id || '').trim();
    if (key) seedMap.set(key, item);
  });

  // Pre-index target identifiers
  const identMap = new Map<string, IdentifierPerformance>();
  identifiers.forEach((item) => {
    const key = String(item.code || item.ninja_id || item.id || '').trim();
    if (key) {
      identMap.set(key, item);
      // Also index stripped "ninja_" / "keeta_"
      const stripped = key.replace(/^(ninja_|keeta_)/i, '');
      if (stripped) identMap.set(stripped, item);
    }
  });

  // Pre-index local overrides
  const localOverrides = getLocalOverrides();

  return (captainId: string, rawNameFromCsv?: string): ResolvedCaptainInfo => {
    const cleanId = String(captainId || '').trim();
    const isNinja = app === 'NINJA';
    const defaultFallbackChar = isNinja ? 'ن' : 'ك';

    if (!cleanId || cleanId === 'Unknown') {
      return {
        id: cleanId,
        displayName: 'كابتن غير محدد',
        isLinked: false,
        avatarFallback: defaultFallbackChar
      };
    }

    const seedItem = seedMap.get(cleanId);
    const identItem =
      identMap.get(cleanId) || identMap.get(`${isNinja ? 'ninja' : 'keeta'}_${cleanId}`);
    const overrideItem =
      localOverrides[cleanId] || localOverrides[`${isNinja ? 'ninja' : 'keeta'}_${cleanId}`];
    const empMatch = matchEmployeeById(cleanId, employees);

    // 1. Resolve Arabic Name
    let resolvedAr: string | undefined = undefined;
    if (overrideItem?.name_ar && !isNumericOrIdOnly(overrideItem.name_ar)) {
      resolvedAr = overrideItem.name_ar.trim();
    } else if (identItem?.name_ar && !isNumericOrIdOnly(identItem.name_ar)) {
      resolvedAr = identItem.name_ar.trim();
    } else if (empMatch?.extractedArabicName && !isNumericOrIdOnly(empMatch.extractedArabicName)) {
      resolvedAr = empMatch.extractedArabicName.trim();
    } else if (empMatch?.employee?.name && !isNumericOrIdOnly(empMatch.employee.name)) {
      resolvedAr = empMatch.employee.name.trim();
    } else if (seedItem?.name_ar && !isNumericOrIdOnly(seedItem.name_ar)) {
      resolvedAr = seedItem.name_ar.trim();
    }

    // 2. Resolve English Name (Strictly reject numeric strings like "214101")
    let resolvedEn: string | undefined = undefined;
    const candidatesEn = [
      overrideItem?.name_en,
      identItem?.name_en,
      seedItem?.name_en,
      rawNameFromCsv
    ];
    for (const cand of candidatesEn) {
      if (cand && !isNumericOrIdOnly(cand) && cand.trim().toLowerCase() !== cleanId.toLowerCase()) {
        resolvedEn = cand.trim();
        break;
      }
    }

    // 3. Resolve Avatar Photo
    const avatar =
      overrideItem?.avatar ||
      identItem?.avatar ||
      empMatch?.employee?.personal_image ||
      seedItem?.avatar ||
      undefined;

    // 4. Resolve Mobile & National ID
    const mobile =
      overrideItem?.mobile ||
      identItem?.mobile ||
      empMatch?.employee?.phone ||
      seedItem?.mobile ||
      undefined;

    const nationalId =
      overrideItem?.national_id ||
      identItem?.national_id ||
      empMatch?.employee?.national_id ||
      seedItem?.national_id ||
      undefined;

    // 5. Build clean display name
    // If Arabic name exists, use it as primary title
    // Otherwise if English name exists, use it
    // Otherwise fallback to "كابتن {ID}"
    const displayName = resolvedAr || resolvedEn || `كابتن ${cleanId}`;

    // 6. Safe avatar initials (Never digits)
    const avatarFallback = getAvatarInitials(resolvedAr || resolvedEn, defaultFallbackChar);

    return {
      id: cleanId,
      captainNameAr: resolvedAr,
      captainNameEn: resolvedEn,
      displayName,
      avatar: avatar && avatar.trim().length > 0 ? avatar : undefined,
      mobile,
      nationalId,
      employeeName: empMatch?.employee?.name,
      employeeId: empMatch?.employee?.id,
      isLinked: Boolean(empMatch || identItem?.employee_id || overrideItem?.employee_id),
      avatarFallback
    };
  };
}
