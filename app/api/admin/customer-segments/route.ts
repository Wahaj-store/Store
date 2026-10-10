import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { CUSTOMER_SEGMENT_OPTIONS, getCustomerSegmentKey, type CustomerSegmentKey } from '@/lib/customer-segment';

const SEGMENT_PRESENTATION: Record<CustomerSegmentKey, { rule: string; tone: string }> = {
  vip: { rule: 'إنفاق 10,000+ ج.م أو 5 طلبات مسلّمة فأكثر', tone: 'gold' },
  loyal: { rule: '3 طلبات مسلّمة فأكثر', tone: 'green' },
  highValue: { rule: 'إنفاق 5,000+ ج.م', tone: 'blue' },
  new: { rule: 'آخر طلب مسلّم خلال 30 يومًا', tone: 'violet' },
  atRisk: { rule: 'آخر طلب مسلّم منذ 31–90 يومًا', tone: 'amber' },
  dormant: { rule: 'آخر طلب مسلّم منذ أكثر من 90 يومًا', tone: 'red' },
  noPurchase: { rule: 'لديهم حساب بدون طلب مسلّم', tone: 'muted' },
};

type AudienceMember = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  spend: number;
  orderCount: number;
  lastOrder: Date | null;
  segment: CustomerSegmentKey;
};

function csvCell(value: unknown) {
  let text = value == null ? '' : value instanceof Date ? value.toISOString() : String(value);
  // Avoid spreadsheet formula execution when a CSV is opened in Excel/Sheets.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const user = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'VIEWER']);
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const url = new URL(request.url);
  const requestedSegment = url.searchParams.get('segment') || 'all';
  const format = url.searchParams.get('format');
  const validKeys = new Set<string>(['all', ...CUSTOMER_SEGMENT_OPTIONS.map((segment) => segment.key)]);
  if (!validKeys.has(requestedSegment)) {
    return NextResponse.json({ error: 'شريحة العملاء غير صالحة.' }, { status: 400 });
  }
  const selectedKey = requestedSegment === 'all' ? null : requestedSegment as CustomerSegmentKey;

  try {
    const now = new Date();
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        orders: {
          where: { status: 'DELIVERED' },
          select: { total: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const rows: AudienceMember[] = customers.map((customer) => {
      const spend = customer.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const lastOrder = customer.orders[0]?.createdAt ?? null;
      const segment = getCustomerSegmentKey({ orderCount: customer.orders.length, spend, lastOrder, now });
      return {
        id: customer.id,
        name: customer.name?.trim() || 'عميل',
        phone: customer.phone,
        email: customer.email,
        spend: Math.round(spend * 100) / 100,
        orderCount: customer.orders.length,
        lastOrder,
        segment,
      };
    });

    const segments = CUSTOMER_SEGMENT_OPTIONS.map(({ key, name }) => {
      const members = rows.filter((member) => member.segment === key).sort((a, b) => b.spend - a.spend);
      const totalSpend = members.reduce((sum, member) => sum + member.spend, 0);
      return {
        key,
        name,
        ...SEGMENT_PRESENTATION[key],
        count: members.length,
        totalSpend: Math.round(totalSpend * 100) / 100,
        avgSpend: members.length ? Math.round((totalSpend / members.length) * 100) / 100 : 0,
        members: members.slice(0, 12).map(({ id, name: memberName, phone, email, spend: memberSpend, orderCount, lastOrder }) => ({
          id, name: memberName, phone, email, spend: memberSpend, orderCount, lastOrder,
        })),
      };
    });
    const audience = rows
      .filter((member) => !selectedKey || member.segment === selectedKey)
      .sort((a, b) => b.spend - a.spend);

    if (format === 'csv') {
      const header = ['الاسم', 'الهاتف', 'البريد الإلكتروني', 'الشريحة', 'عدد الطلبات المسلّمة', 'إجمالي الإنفاق', 'آخر طلب مسلّم'];
      const segmentNames = new Map(segments.map((segment) => [segment.key, segment.name]));
      const lines = [header, ...audience.map((member) => [
        member.name,
        member.phone,
        member.email,
        segmentNames.get(member.segment) || member.segment,
        member.orderCount,
        member.spend.toFixed(2),
        member.lastOrder,
      ])].map((line) => line.map(csvCell).join(','));
      const csv = `\uFEFF${lines.join('\r\n')}`;
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="customer-audience-${requestedSegment}.csv"`,
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    return NextResponse.json({
      totalCustomers: customers.length,
      segments,
      audience,
      note: 'الشرائح حصرية حسب أولوية القاعدة، ويُحتسب الإنفاق والعدد من الطلبات المسلّمة فقط.',
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Failed to build customer segments:', error);
    return NextResponse.json({ error: 'تعذر تحميل بيانات تقسيم العملاء حاليًا.' }, { status: 500 });
  }
}
