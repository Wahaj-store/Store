import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// بيانات عامة قابلة لإعادة التحقق دوريًا.
export const revalidate = 60;

export async function GET() {
  try {
    const faqs = await prisma.faqItem.findMany({
      where: { published: true },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json(faqs);
  } catch (error) {
    console.error('FAQ API Error:', error);
    return NextResponse.json({ error: 'تعذر جلب الأسئلة الشائعة' }, { status: 500 });
  }
}
