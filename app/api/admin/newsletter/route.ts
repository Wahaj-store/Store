import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function denied(status: 401 | 403) {
  return NextResponse.json(
    { error: status === 401 ? 'يلزم تسجيل الدخول إلى لوحة الإدارة.' : 'لا تملك صلاحية إدارة المشتركين.' },
    { status },
  );
}

function csvCell(value: unknown) {
  let text = String(value ?? '');
  // Prevent spreadsheet formula execution when the CSV is opened in Excel/Sheets.
  if (/^[\s]*[=+\-@]/u.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const access = await requirePermission('marketingRead');
  if (!access.user) return denied(access.status);

  const params = new URL(req.url).searchParams;
  const status = params.get('status');
  const search = (params.get('search') || '').trim().slice(0, 120);
  const where = {
    ...(status === 'active' ? { active: true } : status === 'inactive' ? { active: false } : {}),
    ...(search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { source: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
  };

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where,
    select: { id: true, email: true, source: true, active: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  if (params.get('format') === 'csv') {
    const header = ['البريد الإلكتروني', 'الحالة', 'مصدر التسجيل', 'تاريخ الاشتراك'];
    const rows = subscribers.map(subscriber => [
      subscriber.email,
      subscriber.active ? 'نشط' : 'موقوف',
      subscriber.source || '',
      subscriber.createdAt.toISOString(),
    ]);
    const csv = [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    const filename = `wahaj-newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  return NextResponse.json(subscribers, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req: Request) {
  const access = await requirePermission('marketingWrite');
  if (!access.user) return denied(access.status);

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload.id !== 'string' || !payload.id.trim() || typeof payload.active !== 'boolean') {
    return NextResponse.json({ error: 'معرّف المشترك وحالة الاشتراك مطلوبان.' }, { status: 400 });
  }

  try {
    const subscriber = await prisma.newsletterSubscriber.update({
      where: { id: payload.id.trim() },
      data: { active: payload.active },
      select: { id: true, email: true, active: true },
    });
    return NextResponse.json({ ok: true, subscriber });
  } catch (error: any) {
    if (error?.code === 'P2025') return NextResponse.json({ error: 'المشترك غير موجود.' }, { status: 404 });
    return NextResponse.json({ error: 'تعذر تحديث حالة الاشتراك.' }, { status: 500 });
  }
}
