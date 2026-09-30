import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

// جلب جميع رسائل التواصل مرتبة من الأحدث للأقدم
export async function GET() {
  try {
    const auth = await requirePermission('contactRead');
    if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status });
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch contact messages' }, { status: 500 });
  }
}

// حذف رسالة
export async function DELETE(request: Request) {
  try {
    const auth = await requirePermission('contactWrite');
    if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await prisma.contactMessage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
