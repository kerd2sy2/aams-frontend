import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface NinjaStoredOrder {
  id: string;
  orderId: string;
  captainId: string;
  captainName: string;
  platform: string;
  status: string;
  totalTimeMinutes: number;
  paymentMethod: string;
  pickupDistanceKm: number;
  deliveryDistanceKm: number;
  totalDistanceKm: number;
  createdAt: string;
  reportDate: string;
}

export interface NinjaReportBatch {
  id: string;
  fileName: string;
  reportDate: string; // YYYY-MM-DD
  uploadedAt: string;
  totalOrders: number;
  deliveredOrders: number;
  canceledOrders: number;
  totalCaptains: number;
  orders: NinjaStoredOrder[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'ninja_reports_db.json');

function ensureDbFile(): NinjaReportBatch[] {
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
    console.error('Error reading ninja reports DB:', err);
    return [];
  }
}

function saveDb(batches: NinjaReportBatch[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(batches, null, 2), 'utf-8');
}

// GET: list batches, or get orders filtered by date
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get('date'); // optional filter by YYYY-MM-DD

  const batches = ensureDbFile();

  // If a specific date is requested, return aggregated orders for that date
  if (date) {
    const matchingBatches = batches.filter((b) => b.reportDate === date);
    const ordersMap = new Map<string, NinjaStoredOrder>();
    matchingBatches.forEach((b) => {
      b.orders.forEach((ord) => ordersMap.set(ord.orderId || ord.id, ord));
    });
    const orders = Array.from(ordersMap.values());
    const availableDates = Array.from(new Set(batches.map((b) => b.reportDate)))
      .filter(Boolean)
      .sort()
      .reverse();

    return NextResponse.json({
      date,
      totalOrders: orders.length,
      orders,
      batches: matchingBatches.map((b) => ({
        id: b.id,
        fileName: b.fileName,
        reportDate: b.reportDate,
        uploadedAt: b.uploadedAt,
        totalOrders: b.totalOrders,
        deliveredOrders: b.deliveredOrders
      })),
      availableDates
    });
  }

  // Otherwise, return all available batches and summary
  const availableDates = Array.from(new Set(batches.map((b) => b.reportDate)))
    .filter(Boolean)
    .sort()
    .reverse();
  const summaryBatches = batches.map((b) => ({
    id: b.id,
    fileName: b.fileName,
    reportDate: b.reportDate,
    uploadedAt: b.uploadedAt,
    totalOrders: b.totalOrders,
    deliveredOrders: b.deliveredOrders,
    canceledOrders: b.canceledOrders,
    totalCaptains: b.totalCaptains
  }));

  // If there are batches and no date requested, include latest batch orders
  let latestOrders: NinjaStoredOrder[] = [];
  let latestDate = availableDates[0] || '';
  if (latestDate) {
    const matchingBatches = batches.filter((b) => b.reportDate === latestDate);
    const ordersMap = new Map<string, NinjaStoredOrder>();
    matchingBatches.forEach((b) => {
      b.orders.forEach((ord) => ordersMap.set(ord.orderId || ord.id, ord));
    });
    latestOrders = Array.from(ordersMap.values());
  }

  return NextResponse.json({
    latestDate,
    availableDates,
    batches: summaryBatches,
    orders: latestOrders
  });
}

// POST: Save a new parsed Ninja report batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, reportDate, orders } = body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: 'قائمة الطلبات فارغة' }, { status: 400 });
    }

    const batches = ensureDbFile();
    const dateStr =
      reportDate ||
      (orders[0]?.createdAt
        ? orders[0].createdAt.split(' ')[0]
        : new Date().toISOString().split('T')[0]);

    const deliveredOrders = orders.filter((o: any) => o.status === 'DELIVERED').length;
    const canceledOrders = orders.filter((o: any) => o.status === 'CANCELED').length;
    const captainIds = new Set(orders.map((o: any) => o.captainId));

    const newBatch: NinjaReportBatch = {
      id: `ninja_${Date.now()}`,
      fileName: fileName || `Ninja_${dateStr}.csv`,
      reportDate: dateStr,
      uploadedAt: new Date().toISOString(),
      totalOrders: orders.length,
      deliveredOrders,
      canceledOrders,
      totalCaptains: captainIds.size,
      orders: orders.map((o: any) => ({
        ...o,
        reportDate: dateStr
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
      message: `تم حفظ تقرير نينجا ليوم ${dateStr} في قاعدة البيانات بنجاح (${orders.length} طلب)`,
      batchId: newBatch.id,
      reportDate: dateStr,
      totalOrders: newBatch.totalOrders,
      deliveredOrders: newBatch.deliveredOrders
    });
  } catch (err: any) {
    console.error('Failed to save ninja report batch:', err);
    return NextResponse.json(
      { error: err.message || 'فشل في حفظ التقرير في قاعدة البيانات' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a batch or delete orders for a date
export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const batchId = searchParams.get('id');
  const date = searchParams.get('date');

  let batches = ensureDbFile();

  if (batchId) {
    batches = batches.filter((b) => b.id !== batchId);
    saveDb(batches);
    return NextResponse.json({ success: true, message: 'تم حذف شيت التقرير بنجاح' });
  }

  if (date) {
    batches = batches.filter((b) => b.reportDate !== date);
    saveDb(batches);
    return NextResponse.json({ success: true, message: `تم حذف تقارير تاريخ ${date} بنجاح` });
  }

  return NextResponse.json({ error: 'مطلوب تحديد معرف الشيت أو التاريخ' }, { status: 400 });
}
