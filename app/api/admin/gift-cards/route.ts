import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { generateGiftCardCode, hashGiftCardCode, normalizeGiftCardCode } from '@/lib/gift-card';

const schema = z.object({
  id: z.string().cuid().optional(),
  code: z.string().trim().max(40).optional(),
  amount: z.coerce.number().positive(),
  expiresAt: z.preprocess(
    value => value === '' || value === null || value === undefined ? null : value,
    z.string().datetime().nullable(),
  ),
  active: z.boolean().optional(),
});

function unauthorized() { return NextResponse.json({ error: 'غير مصرح: يلزم تسجيل الدخول إلى لوحة الإدارة.' }, { status: 401 }); }
function forbidden() { return NextResponse.json({ error: 'غير مصرح: لا تملك صلاحية إدارة بطاقات الهدايا.' }, { status: 403 }); }

const publicSelect = {
  id: true, code: true, amount: true, balance: true, active: true, expiresAt: true, issuedToCustomerId: true, createdAt: true, updatedAt: true,
  _count: { select: { ledger: true, orders: true } },
} as const;

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    if (!can(user.role, 'giftCardsRead')) return forbidden();
    const cards = await prisma.giftCard.findMany({ select: publicSelect, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(cards, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'تعذر جلب بطاقات الهدايا.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    if (!can(user.role, 'giftCardsWrite')) return forbidden();
    const value = schema.omit({ id: true }).parse(await req.json());
    const code = normalizeGiftCardCode(value.code || generateGiftCardCode());
    const card = await prisma.$transaction(async tx => {
      const created = await tx.giftCard.create({
        data: { code, codeHash: hashGiftCardCode(code), amount: value.amount, balance: value.amount, expiresAt: value.expiresAt ? new Date(value.expiresAt) : null, active: value.active ?? true },
        select: publicSelect,
      });
      await tx.giftCardLedger.create({ data: { giftCardId: created.id, type: 'ISSUE', amount: value.amount, balanceAfter: value.amount, reference: 'ADMIN_ISSUE', note: 'إصدار بطاقة هدايا جديدة' } });
      return created;
    });
    await prisma.activityLog.create({ data: { userId: user.id, action: 'CREATE_GIFT_CARD', entity: 'GiftCard', entityId: card.id } });
    return NextResponse.json(card, { status: 201 });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message || error?.message || 'تعذر إنشاء بطاقة الهدايا.';
    return NextResponse.json({ error: message }, { status: error?.code === 'P2002' ? 409 : 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    if (!can(user.role, 'giftCardsWrite')) return forbidden();
    const value = schema.parse(await req.json());
    if (!value.id) return NextResponse.json({ error: 'معرف البطاقة مطلوب.' }, { status: 400 });
    const existing = await prisma.giftCard.findUnique({ where: { id: value.id }, include: { _count: { select: { ledger: true, orders: true } } } });
    if (!existing) return NextResponse.json({ error: 'بطاقة الهدايا غير موجودة.' }, { status: 404 });
    if (Number(existing.amount) !== value.amount) return NextResponse.json({ error: 'لا يمكن تغيير قيمة بطاقة هدايا تم إصدارها. استخدمي بطاقة جديدة للقيمة الجديدة.' }, { status: 400 });
    const code = normalizeGiftCardCode(value.code || existing.code);
    const card = await prisma.giftCard.update({ where: { id: value.id }, data: { code, codeHash: hashGiftCardCode(code), expiresAt: value.expiresAt ? new Date(value.expiresAt) : null, active: value.active ?? true }, select: publicSelect });
    await prisma.activityLog.create({ data: { userId: user.id, action: 'UPDATE_GIFT_CARD', entity: 'GiftCard', entityId: card.id } });
    return NextResponse.json(card);
  } catch (error: any) {
    const message = error?.issues?.[0]?.message || error?.message || 'تعذر تحديث بطاقة الهدايا.';
    return NextResponse.json({ error: message }, { status: error?.code === 'P2002' ? 409 : 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    if (!can(user.role, 'giftCardsWrite')) return forbidden();
    const id = z.string().cuid().parse((await req.json()).id);
    const card = await prisma.giftCard.findUnique({ where: { id }, include: { _count: { select: { ledger: true, orders: true } } } });
    if (!card) return NextResponse.json({ error: 'بطاقة الهدايا غير موجودة.' }, { status: 404 });
    if (card._count.ledger > 0 || card._count.orders > 0) return NextResponse.json({ error: 'لا يمكن حذف بطاقة لها حركات أو طلبات. عطّلي البطاقة بدلًا من حذفها.' }, { status: 409 });
    await prisma.giftCard.delete({ where: { id } });
    await prisma.activityLog.create({ data: { userId: user.id, action: 'DELETE_GIFT_CARD', entity: 'GiftCard', entityId: id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.issues?.[0]?.message || error?.message || 'تعذر حذف بطاقة الهدايا.' }, { status: 400 });
  }
}
