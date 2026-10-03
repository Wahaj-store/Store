import { NextResponse } from 'next/server';
import { DiscountType, OfferType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

const parseDate = (value: unknown) => value ? new Date(String(value)) : null;
const parseNullableNumber = (value: unknown) => value === '' || value === null || value === undefined ? null : Number(value);
const parseNullableInt = (value: unknown) => {
  const n = parseNullableNumber(value);
  return n === null ? null : Math.max(1, Math.floor(n));
};

function normalize(body: any) {
  const type = String(body.type || 'FLASH_SALE') as OfferType;
  const discountType = String(body.discountType || 'PERCENTAGE') as DiscountType;
  const discountValue = parseNullableNumber(body.discountValue);
  const minOrder = parseNullableNumber(body.minOrder);
  const maxDiscount = parseNullableNumber(body.maxDiscount);
  const priority = Math.max(0, Math.floor(Number(body.priority || 0)));
  const buyQuantity = parseNullableInt(body.buyQuantity);
  const getQuantity = parseNullableInt(body.getQuantity);
  const getDiscountPercent = parseNullableNumber(body.getDiscountPercent);

  if (!Object.values(OfferType).includes(type)) throw new Error('نوع العرض غير صالح');
  if (!Object.values(DiscountType).includes(discountType)) throw new Error('نوع الخصم غير صالح');
  if (discountValue !== null && discountValue < 0) throw new Error('قيمة الخصم غير صالحة');
  if (minOrder !== null && minOrder < 0) throw new Error('الحد الأدنى غير صالح');
  if (maxDiscount !== null && maxDiscount < 0) throw new Error('الحد الأقصى للخصم غير صالح');
  if (type === 'BUY_X_GET_Y' && (!buyQuantity || !getQuantity)) throw new Error('عرض اشترِ X واحصل على Y يحتاج كمية الشراء وكمية الهدية');
  if (type !== 'BUY_X_GET_Y' && (buyQuantity || getQuantity)) throw new Error('كميات X/Y تستخدم فقط مع عرض اشترِ X واحصل على Y');
  if (getDiscountPercent !== null && (getDiscountPercent < 0 || getDiscountPercent > 100)) throw new Error('نسبة خصم الهدية يجب أن تكون بين 0 و100');

  const startsAt = parseDate(body.startsAt);
  const endsAt = parseDate(body.endsAt);
  if (startsAt && Number.isNaN(startsAt.getTime())) throw new Error('تاريخ البداية غير صالح');
  if (endsAt && Number.isNaN(endsAt.getTime())) throw new Error('تاريخ النهاية غير صالح');
  if (startsAt && endsAt && startsAt > endsAt) throw new Error('تاريخ البداية يجب أن يسبق تاريخ النهاية');

  return {
    name: String(body.name || '').trim(),
    type,
    discountType,
    discountValue,
    minOrder,
    maxDiscount,
    priority,
    stackable: Boolean(body.stackable),
    maxUses: parseNullableInt(body.maxUses),
    productId: body.productId ? String(body.productId) : null,
    categoryId: body.categoryId ? String(body.categoryId) : null,
    buyQuantity,
    getQuantity,
    getDiscountPercent: type === 'BUY_X_GET_Y' ? (getDiscountPercent ?? 100) : null,
    active: body.active !== false,
    startsAt,
    endsAt,
  };
}

export async function GET() {
  const u = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'VIEWER']);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  return NextResponse.json(await prisma.offer.findMany({ orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }], include: { product: { select: { id: true, name: true } }, category: { select: { id: true, name: true } } } }));
}

export async function POST(req: Request) {
  const u = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  try {
    const data = normalize(await req.json());
    if (!data.name) throw new Error('اسم العرض مطلوب');
    return NextResponse.json(await prisma.offer.create({ data }), { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'تعذر إنشاء العرض' }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  const u = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  try {
    const b = await req.json();
    const data = normalize(b);
    if (!data.name) throw new Error('اسم العرض مطلوب');
    return NextResponse.json(await prisma.offer.update({ where: { id: String(b.id) }, data }));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'تعذر تحديث العرض' }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const u = await requireUser(['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  try {
    const body = await req.json();
    const id = String(body.id || '').trim();
    if (!id) throw new Error('معرّف العرض مطلوب');
    if (typeof body.active !== 'boolean') throw new Error('حالة العرض غير صالحة');

    return NextResponse.json(await prisma.offer.update({
      where: { id },
      data: { active: body.active },
    }));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'تعذر تغيير حالة العرض' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const u = await requireUser(['OWNER', 'ADMIN', 'MANAGER']);
  if (!u) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  try {
    return NextResponse.json(await prisma.offer.delete({ where: { id: String((await req.json()).id) } }));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'تعذر حذف العرض' }, { status: 400 });
  }
}
