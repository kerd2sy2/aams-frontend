import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface KeetaStoredCaptain {
  date: string;
  driverId: string;
  driverNameEn: string;
  driverNameAr?: string;
  vehicleType: string;
  onlineDurationStr: string;
  peakHoursStr: string;
  acceptedTasks: number;
  deliveredTasks: number;
  rejectedTasks: number;
  punctualityRate: number;
  avgDeliveryDurationMinutes: number;
  delayedTasks: number;
  veryDelayedTasks: number;
  avatar?: string;
  mobile?: string;
}

export interface KeetaReportBatch {
  id: string;
  fileName: string;
  reportDate: string; // YYYY-MM-DD
  uploadedAt: string;
  totalCaptains: number;
  totalAccepted: number;
  totalDelivered: number;
  totalDelayed: number;
  records: KeetaStoredCaptain[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'keeta_reports_db.json');

function ensureDbFile(): KeetaReportBatch[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify([]), 'utf-8');
      return [];
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error reading keeta reports DB:', err);
    return [];
  }
}

function saveDb(batches: KeetaReportBatch[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(batches, null, 2), 'utf-8');
}

// GET: list batches, or get records filtered by date
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get('date');

  const batches = ensureDbFile();

  if (date) {
    const matchingBatches = batches.filter((b) => b.reportDate === date);
    const recordsMap = new Map<string, KeetaStoredCaptain>();
    matchingBatches.forEach((b) => {
      b.records.forEach((rec) => recordsMap.set(rec.driverId, rec));
    });
    const records = Array.from(recordsMap.values());
    const availableDates = Array.from(new Set(batches.map((b) => b.reportDate)))
      .filter(Boolean)
      .sort()
      .reverse();

    return NextResponse.json({
      date,
      totalCaptains: records.length,
      records,
      batches: matchingBatches.map((b) => ({
        id: b.id,
        fileName: b.fileName,
        reportDate: b.reportDate,
        uploadedAt: b.uploadedAt,
        totalCaptains: b.totalCaptains,
        totalDelivered: b.totalDelivered
      })),
      availableDates
    });
  }

  const availableDates = Array.from(new Set(batches.map((b) => b.reportDate)))
    .filter(Boolean)
    .sort()
    .reverse();
  const summaryBatches = batches.map((b) => ({
    id: b.id,
    fileName: b.fileName,
    reportDate: b.reportDate,
    uploadedAt: b.uploadedAt,
    totalCaptains: b.totalCaptains,
    totalAccepted: b.totalAccepted,
    totalDelivered: b.totalDelivered,
    totalDelayed: b.totalDelayed
  }));

  let latestRecords: KeetaStoredCaptain[] = [];
  let latestDate = availableDates[0] || '';
  if (latestDate) {
    const matchingBatches = batches.filter((b) => b.reportDate === latestDate);
    const recordsMap = new Map<string, KeetaStoredCaptain>();
    matchingBatches.forEach((b) => {
      b.records.forEach((rec) => recordsMap.set(rec.driverId, rec));
    });
    latestRecords = Array.from(recordsMap.values());
  }

  return NextResponse.json({
    latestDate,
    availableDates,
    batches: summaryBatches,
    records: latestRecords
  });
}

// POST: Save new Keeta report batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, reportDate, records } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'قائمة كباتن التقرير فارغة' }, { status: 400 });
    }

    const batches = ensureDbFile();
    const dateStr = reportDate || records[0]?.date || new Date().toISOString().split('T')[0];

    const totalAccepted = records.reduce(
      (sum: number, r: any) => sum + (Number(r.acceptedTasks) || 0),
      0
    );
    const totalDelivered = records.reduce(
      (sum: number, r: any) => sum + (Number(r.deliveredTasks) || 0),
      0
    );
    const totalDelayed = records.reduce(
      (sum: number, r: any) => sum + (Number(r.delayedTasks) || 0),
      0
    );

    const newBatch: KeetaReportBatch = {
      id: `keeta_${Date.now()}`,
      fileName: fileName || `Keeta_${dateStr}.xlsx`,
      reportDate: dateStr,
      uploadedAt: new Date().toISOString(),
      totalCaptains: records.length,
      totalAccepted,
      totalDelivered,
      totalDelayed,
      records: records.map((r: any) => ({
        ...r,
        date: dateStr
      }))
    };

    // Deduplicate / replace existing batch for same date + file
    const filtered = batches.filter(
      (b) => !(b.reportDate === dateStr && b.fileName === newBatch.fileName)
    );
    filtered.unshift(newBatch);
    saveDb(filtered);

    return NextResponse.json({
      success: true,
      message: `تم حفظ تقرير كيتا ليوم ${dateStr} في قاعدة البيانات بنجاح (${records.length} كابتن)`,
      batchId: newBatch.id,
      reportDate: dateStr,
      totalCaptains: newBatch.totalCaptains,
      totalDelivered: newBatch.totalDelivered
    });
  } catch (err: any) {
    console.error('Failed to save keeta report batch:', err);
    return NextResponse.json({ error: err.message || 'فشل في حفظ تقرير كيتا' }, { status: 500 });
  }
}

// DELETE: Delete a batch or delete records for a date
export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const batchId = searchParams.get('id');
  const date = searchParams.get('date');

  let batches = ensureDbFile();

  if (batchId) {
    batches = batches.filter((b) => b.id !== batchId);
    saveDb(batches);
    return NextResponse.json({ success: true, message: 'تم حذف شيت تقرير كيتا بنجاح' });
  }

  if (date) {
    batches = batches.filter((b) => b.reportDate !== date);
    saveDb(batches);
    return NextResponse.json({ success: true, message: `تم حذف تقارير كيتا لتاريخ ${date} بنجاح` });
  }

  return NextResponse.json({ error: 'مطلوب تحديد معرف الشيت أو التاريخ' }, { status: 400 });
}
