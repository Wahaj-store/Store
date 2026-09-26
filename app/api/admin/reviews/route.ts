import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/rbac';

function unauthorized() {
  return NextResponse.json({ error: 'غير مصرح: يلزم تسجيل الدخول إلى لوحة الإدارة.' }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: 'غير مصرح: لا تملك صلاحية إدارة المراجعات.' }, { status: 403 });
}

const updateSchema = z.object({
  id: z.string().cuid(),
  approved: z.boolean().optional(),
  verified: z.boolean().optional(),
}).refine((value) => value.approved !== undefined || value.verified !== undefined, {
  message: 'يجب تحديد approved أو verified على الأقل.',
});

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    if (!can(user.role, 'reviewsRead')) return forbidden();

    const reviews = await prisma.review.findMany({
      include: {
        product: { select: { id: true, name: true, slug: true } },
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reviews, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'تعذر جلب المراجعات.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    if (!can(user.role, 'reviewsWrite')) return forbidden();

    const body = updateSchema.parse(await req.json());
    const data: { approved?: boolean; verified?: boolean } = {};
    if (body.approved !== undefined) data.approved = body.approved;
    if (body.verified !== undefined) data.verified = body.verified;

    const review = await prisma.review.update({
      where: { id: body.id },
      data,
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_REVIEW',
        entity: 'Review',
        entityId: review.id,
        metadata: JSON.stringify(data),
      },
    });

    return NextResponse.json(review);
  } catch (error: any) {
    const message = error?.issues?.[0]?.message || error?.message || 'تعذر تحديث المراجعة.';
    return NextResponse.json({ error: message }, { status: error?.code === 'P2025' ? 404 : 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    if (!user) return unauthorized();
    if (!can(user.role, 'reviewsWrite')) return forbidden();

    const body = z.object({ id: z.string().cuid() }).parse(await req.json());
    await prisma.review.delete({ where: { id: body.id } });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'DELETE_REVIEW',
        entity: 'Review',
        entityId: body.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message || error?.message || 'تعذر حذف المراجعة.';
    return NextResponse.json({ error: message }, { status: error?.code === 'P2025' ? 404 : 400 });
  }
}
