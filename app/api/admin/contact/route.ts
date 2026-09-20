import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// جلب جميع رسائل التواصل مرتبة من الأحدث للأقدم
export async function GET() {
  try {
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
