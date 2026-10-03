import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

const DAY = 24 * 60 * 60 * 1000;

export async function GET() {
  const u = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'VIEWER']);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const now = new Date();
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      createdAt: true,
      orders: { select: { total: true, status: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
    },
  });

  const rows = customers.map((c) => {
    const orders = c.orders.filter((o) => o.status !== 'CANCELLED');
    const spend = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const lastOrder = orders.at(-1)?.createdAt || null;
    const daysSince = lastOrder ? Math.floor((now.getTime() - lastOrder.getTime()) / DAY) : null;
    let key = 'noPurchase';
    if (orders.length === 0) key = 'noPurchase';
    else if (spend >= 10000 || orders.length >= 5) key = 'vip';
    else if (orders.length >= 3) key = 'loyal';
    else if (spend >= 5000) key = 'highValue';
    else if (daysSince !== null && daysSince <= 30) key = 'new';
    else if (daysSince !== null && daysSince <= 90) key = 'atRisk';
    else key = 'dormant';
    return { ...c, orders, spend, orderCount: orders.length, lastOrder, daysSince, key };
  });

  const definitions = [
    ['vip', 'عملاء VIP', 'إنفاق 10,000+ ج.م أو 5 طلبات فأكثر', 'gold'],
    ['loyal', 'عملاء أوفياء', '3 طلبات فأكثر', 'green'],
    ['highValue', 'قيمة مرتفعة', 'إنفاق 5,000+ ج.م', 'blue'],
    ['new', 'عملاء نشطون حديثًا', 'آخر طلب خلال 30 يومًا', 'violet'],
    ['atRisk', 'معرضون للفقد', 'آخر طلب منذ 31–90 يومًا', 'amber'],
    ['dormant', 'عملاء غير نشطين', 'آخر طلب منذ أكثر من 90 يومًا', 'red'],
    ['noPurchase', 'بدون شراء', 'لديهم حساب بدون طلب مكتمل', 'muted'],
  ] as const;

  const segments = definitions.map(([key, name, rule, tone]) => {
    const members = rows.filter((x) => x.key === key).sort((a, b) => b.spend - a.spend);
    return {
      key,
      name,
      rule,
      tone,
      count: members.length,
      totalSpend: Math.round(members.reduce((s, x) => s + x.spend, 0) * 100) / 100,
      avgSpend: members.length ? Math.round((members.reduce((s, x) => s + x.spend, 0) / members.length) * 100) / 100 : 0,
      members: members.slice(0, 12).map((x) => ({ id: x.id, name: x.name || 'عميل', phone: x.phone, email: x.email, spend: x.spend, orderCount: x.orderCount, lastOrder: x.lastOrder })),
    };
  });

  return NextResponse.json({
    totalCustomers: customers.length,
    segments,
    note: 'الشرائح حصرية حسب أولوية القاعدة، ويتم حسابها من الطلبات المكتملة فقط.',
  });
}
