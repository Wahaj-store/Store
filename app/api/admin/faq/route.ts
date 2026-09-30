import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

// جلب كل الأسئلة للأدمن (حتى غير المنشورة)
export async function GET() {
  try {
    const auth = await requirePermission('faqRead');
    if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status });
    const faqs = await prisma.faqItem.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    return NextResponse.json(faqs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch FAQs' }, { status: 500 });
  }
}

// إضافة سؤال جديد
export async function POST(request: Request) {
  try {
    const auth = await requirePermission('faqWrite');
    if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status });
    const body = await request.json();
    const { question, answer, category, displayOrder, published } = body;

    if (!question || !answer) {
      return NextResponse.json({ error: 'السؤال والإجابة حقول إجبارية' }, { status: 400 });
    }

    const newFaq = await prisma.faqItem.create({
      data: {
        question,
        answer,
        category: category || 'general',
        displayOrder: Number(displayOrder) || 0,
        published: published ?? true,
      },
    });

    return NextResponse.json({ success: true, data: newFaq });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create FAQ' }, { status: 500 });
  }
}
