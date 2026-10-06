import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const faqSchema = z.object({
  question: z.string().trim().min(1, 'اكتبي نص السؤال.'),
  answer: z.string().trim().min(1, 'اكتبي الإجابة.'),
  category: z.string().trim().min(1).default('general'),
  displayOrder: z.coerce.number().int('ترتيب الظهور يجب أن يكون رقمًا صحيحًا.').default(0),
  published: z.boolean().default(true),
});

function validationError(error: z.ZodError) {
  return NextResponse.json({ error: error.issues[0]?.message || 'بيانات السؤال غير صالحة.' }, { status: 400 });
}

// جلب كل الأسئلة للأدمن (حتى غير المنشورة)
export async function GET() {
  try {
    const auth = await requirePermission('faqRead');
    if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status });

    const faqs = await prisma.faqItem.findMany({ orderBy: { displayOrder: 'asc' } });
    return NextResponse.json(faqs);
  } catch (error) {
    console.error('Admin FAQ list error:', error);
    return NextResponse.json({ error: 'تعذر تحميل الأسئلة الشائعة.' }, { status: 500 });
  }
}

// إضافة سؤال جديد
export async function POST(request: Request) {
  try {
    const auth = await requirePermission('faqWrite');
    if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status });

    const parsed = faqSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);

    const newFaq = await prisma.faqItem.create({ data: parsed.data });
    return NextResponse.json({ success: true, data: newFaq }, { status: 201 });
  } catch (error) {
    console.error('Admin FAQ create error:', error);
    return NextResponse.json({ error: 'تعذر إضافة السؤال الشائع. تحققي من الاتصال بقاعدة البيانات ثم أعيدي المحاولة.' }, { status: 500 });
  }
}
