import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/rbac';

const relationSchema = z.object({
  type: z.enum(['RELATED', 'COMPLEMENTARY', 'UPSELL', 'CROSS_SELL', 'FREQUENTLY_BOUGHT']),
  fromProductId: z.string().trim().min(1, 'اختاري المنتج الأساسي.'),
  toProductId: z.string().trim().min(1, 'اختاري المنتج المرشّح.'),
  sortOrder: z.coerce.number().int().optional(),
});

function mutationError(error: any) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message || 'بيانات الترشيح غير صالحة.' }, { status: 400 });
  }
  if (error?.code === 'P2002') {
    return NextResponse.json({ error: 'هذا الترشيح موجود بالفعل بين المنتجين.' }, { status: 409 });
  }
  if (error?.code === 'P2003') {
    return NextResponse.json({ error: 'أحد المنتجين لم يعد موجودًا. حدّثي قائمة المنتجات ثم أعيدي المحاولة.' }, { status: 404 });
  }
  if (error?.code === 'P2025') {
    return NextResponse.json({ error: 'تعذر العثور على الترشيح المطلوب. حدّثي الصفحة ثم أعيدي المحاولة.' }, { status: 404 });
  }
  console.error('Admin product relation error:', error);
  return NextResponse.json({ error: 'تعذر حفظ ترشيح المنتجات حاليًا.' }, { status: 500 });
}

async function validateProducts(fromProductId: string, toProductId: string) {
  if (fromProductId === toProductId) {
    return NextResponse.json({ error: 'لا يمكن ترشيح المنتج لنفسه.' }, { status: 400 });
  }

  const ids = [...new Set([fromProductId, toProductId])];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const found = new Set(products.map(product => product.id));

  if (!found.has(fromProductId)) {
    return NextResponse.json({ error: 'المنتج الأساسي غير موجود. حدّثي قائمة المنتجات واختاريه من جديد.' }, { status: 404 });
  }
  if (!found.has(toProductId)) {
    return NextResponse.json({ error: 'المنتج المرشّح غير موجود. حدّثي قائمة المنتجات واختاريه من جديد.' }, { status: 404 });
  }
  return null;
}

async function findDuplicate(type: string, fromProductId: string, toProductId: string, excludeId?: string) {
  return prisma.productRelation.findFirst({
    where: {
      type: type as any,
      fromProductId,
      toProductId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
}

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const relations = await prisma.productRelation.findMany({
      include: {
        fromProduct: { select: { id: true, name: true, slug: true } },
        toProduct: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ sortOrder: 'asc' }],
    });
    return NextResponse.json(relations);
  } catch (error: any) {
    console.error('Admin product relations read error:', error);
    return NextResponse.json({ error: 'تعذر تحميل ترشيحات المنتجات.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    if (!can(user.role, 'productsWrite')) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const value = relationSchema.parse(await req.json());
    const validationError = await validateProducts(value.fromProductId, value.toProductId);
    if (validationError) return validationError;

    if (await findDuplicate(value.type, value.fromProductId, value.toProductId)) {
      return NextResponse.json({ error: 'هذا الترشيح موجود بالفعل بين المنتجين.' }, { status: 409 });
    }

    const relation = await prisma.productRelation.create({
      data: {
        type: value.type,
        fromProductId: value.fromProductId,
        toProductId: value.toProductId,
        sortOrder: value.sortOrder ?? 0,
      },
    });
    return NextResponse.json(relation, { status: 201 });
  } catch (error: any) {
    return mutationError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    if (!can(user.role, 'productsWrite')) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    if (!id) return NextResponse.json({ error: 'معرّف الترشيح مطلوب.' }, { status: 400 });

    const value = relationSchema.parse(body);
    const validationError = await validateProducts(value.fromProductId, value.toProductId);
    if (validationError) return validationError;

    const existing = await prisma.productRelation.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'الترشيح المطلوب غير موجود.' }, { status: 404 });

    if (await findDuplicate(value.type, value.fromProductId, value.toProductId, id)) {
      return NextResponse.json({ error: 'هذا الترشيح موجود بالفعل بين المنتجين.' }, { status: 409 });
    }

    const relation = await prisma.productRelation.update({
      where: { id },
      data: {
        type: value.type,
        fromProductId: value.fromProductId,
        toProductId: value.toProductId,
        sortOrder: value.sortOrder ?? 0,
      },
    });
    return NextResponse.json(relation);
  } catch (error: any) {
    return mutationError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    if (!can(user.role, 'productsWrite')) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

    const urlId = new URL(req.url).searchParams.get('id');
    const body = urlId ? null : await req.json().catch(() => null);
    const id = (urlId || body?.id || '').trim();
    if (!id) return NextResponse.json({ error: 'معرّف الترشيح مطلوب.' }, { status: 400 });

    const existing = await prisma.productRelation.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'الترشيح المطلوب غير موجود.' }, { status: 404 });

    await prisma.productRelation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return mutationError(error);
  }
}
