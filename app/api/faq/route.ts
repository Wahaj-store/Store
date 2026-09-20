import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// منع التخزين المؤقت لضمان ظهور أي أسئلة جديدة يتم إضافتها من لوحة التحكم فوراً
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const faqs = await prisma.faqItem.findMany({
      where: { published: true },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json(faqs, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('FAQ API Error:', error);
    return NextResponse.json({ error: 'تعذر جلب الأسئلة الشائعة' }, { status: 500 });
  }
}
