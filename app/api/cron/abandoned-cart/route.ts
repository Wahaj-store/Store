import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyAbandonedCartByEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get('authorization') === `Bearer ${secret}`);
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  const flag = await prisma.featureFlag.findUnique({ where: { key: 'abandoned_cart' }, select: { enabled: true } }).catch(() => null);
  if (flag && !flag.enabled) return NextResponse.json({ ok: true, disabled: true, checked: 0, sent: 0 });
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const carts = await prisma.abandonedCart.findMany({
    where: { status: 'ACTIVE', lastSeenAt: { lt: cutoff }, reminderSentAt: null },
    include: { customer: { select: { email: true, name: true } } },
    orderBy: { lastSeenAt: 'asc' }, take: 50,
  });
  let sent = 0; let skipped = 0;
  for (const cart of carts) {
    if (!cart.customer.email) { skipped++; continue; }
    const ok = await notifyAbandonedCartByEmail({ email: cart.customer.email, name: cart.customer.name, items: Array.isArray(cart.items) ? cart.items as any[] : [], subtotal: cart.subtotal });
    if (ok) {
      await prisma.abandonedCart.update({ where: { id: cart.id }, data: { status: 'ABANDONED', reminderSentAt: new Date() } });
      sent++;
    }
  }
  return NextResponse.json({ ok: true, checked: carts.length, sent, skipped });
}
