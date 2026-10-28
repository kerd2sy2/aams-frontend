import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUrl = typeof body?.url === 'string' ? body.url.trim() : '';

    if (!rawUrl || (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://'))) {
      return NextResponse.json({ error: 'رابط غير صالح' }, { status: 400 });
    }

    const res = await fetch(rawUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'image/*,*/*;q=0.8'
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `تعذر جلب الصورة من الرابط (${res.status})` },
        { status: 422 }
      );
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'حجم الصورة يتجاوز 10 ميجابايت' }, { status: 413 });
    }

    const base64 = buffer.toString('base64');
    const mime = contentType.startsWith('image/') ? contentType.split(';')[0] : 'image/jpeg';
    const dataUrl = `data:${mime};base64,${base64}`;

    return NextResponse.json({ dataUrl, mime });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'فشل تحميل الصورة من الرابط الخارجي' },
      { status: 500 }
    );
  }
}

