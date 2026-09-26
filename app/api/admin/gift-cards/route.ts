import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/rbac';

const schema = z.object({
  id: z.string().cuid().optional(),
  code: z.string().trim().min(4).max(40),
  amount: z.coerce.number().positive(),
  expiresAt: z.preprocess(
    (value) => value === '' || value === null || value === undefined ? null : value,
    z.string().datetime().nullable(),
  ),
  active: z.boolean().optional(),
});

function unauthorized() {
  return NextResponse.json({ error: 'غير مصرح: يلزم تسجيل الدخول إلى لوحة الإدارة.' }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: 'غير مصرح: لا تملك صلاحية إدارة بطاقات الهدايا.' }, { status: 403 });
}

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    if (!can(user.role, 'giftCardsRead')) return forbidden();

    const cards = await prisma.giftCard.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(cards, {
      headers: { 'Cache-Control': 'no-store' },
    });
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
    const code = value.code.toUpperCase();

    const card = await prisma.giftCard.create({
      data: {
        code,
        amount: value.amount,
        balance: value.amount,
        expiresAt: value.expiresAt ? new Date(value.expiresAt) : null,
        active: value.active ?? true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_GIFT_CARD',
        entity: 'GiftCard',
        entityId: card.id,
      },
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message || error?.message || 'تعذر إنشاء بطاقة الهدايا.';
    const status = error?.code === 'P2002' ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    if (!can(user.role, 'giftCardsWrite')) return forbidden();

    const body = await req.json();
    const value = schema.parse(body);
    if (!value.id) return NextResponse.json({ error: 'معرف البطاقة مطلوب.' }, { status: 400 });

    const existing = await prisma.giftCard.findUnique({ where: { id: value.id } });
    if (!existing) return NextResponse.json({ error: 'بطاقة الهدايا غير موجودة.' }, { status: 404 });

    const card = await prisma.giftCard.update({
      where: { id: value.id },
      data: {
        code: value.code.toUpperCase(),
        amount: value.amount,
        expiresAt: value.expiresAt ? new Date(value.expiresAt) : null,
        active: value.active ?? true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_GIFT_CARD',
        entity: 'GiftCard',
        entityId: card.id,
      },
    });

    return NextResponse.json(card);
  } catch (error: any) {
    const message = error?.issues?.[0]?.message || error?.message || 'تعذر تحديث بطاقة الهدايا.';
    const status = error?.code === 'P2002' ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    if (!can(user.role, 'giftCardsWrite')) return forbidden();

    const body = await req.json();
    const id = z.string().cuid().parse(body.id);
    const card = await prisma.giftCard.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'DELETE_GIFT_CARD',
        entity: 'GiftCard',
        entityId: card.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message || error?.message || 'تعذر حذف بطاقة الهدايا.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
