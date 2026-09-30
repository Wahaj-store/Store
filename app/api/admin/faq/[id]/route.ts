import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission('faqWrite');
    if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status });
    const { id } = params;
    const body = await request.json();
    const { question, answer, category, displayOrder, published } = body;

    const updatedFaq = await prisma.faqItem.update({
      where: { id },
      data: {
        question,
        answer,
        category,
        displayOrder: Number(displayOrder),
        published,
      },
    });

    return NextResponse.json({ success: true, data: updatedFaq });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update FAQ' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission('faqWrite');
    if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status });
    const { id } = params;
    await prisma.faqItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete FAQ' }, { status: 500 });
  }
}
