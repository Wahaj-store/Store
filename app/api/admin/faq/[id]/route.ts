import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const faqSchema = z.object({
  question: z.string().trim().min(1, 'اكتبي نص السؤال.'),
  answer: z.string().trim().min(1, 'اكتبي الإجابة.'),
  category: z.string().trim().min(1, 'اختاري قسم السؤال.'),
  displayOrder: z.coerce.number().int('ترتيب الظهور يجب أن يكون رقمًا صحيحًا.').default(0),
  published: z.boolean().default(true),
});

function validationError(error: z.ZodError) {
  return NextResponse.json({ error: error.issues[0]?.message || 'بيانات السؤال غير صالحة.' }, { status: 400 });
}

function handleFaqError(error: any, action: 'update' | 'delete') {
  if (error instanceof z.ZodError) return validationError(error);
  if (error?.code === 'P2025') {
    return NextResponse.json({ error: 'السؤال الشائع المطلوب غير موجود أو حُذف بالفعل. حدّثي القائمة ثم أعيدي المحاولة.' }, { status: 404 });
  }
  console.error(`Admin FAQ ${action} error:`, error);
  return NextResponse.json({ error: action === 'update' ? 'تعذر تحديث السؤال الشائع. تحققي من البيانات ثم أعيدي المحاولة.' : 'تعذر حذف السؤال الشائع.' }, { status: 500 });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission('faqWrite');
    if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status });

    const id = typeof params?.id === 'string' ? params.id.trim() : '';
    if (!id) return NextResponse.json({ error: 'معرّف السؤال الشائع غير صالح.' }, { status: 400 });

    const parsed = faqSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);

    const existing = await prisma.faqItem.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'السؤال الشائع غير موجود؛ حدّثي القائمة ثم أعيدي المحاولة.' }, { status: 404 });

    const updatedFaq = await prisma.faqItem.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ success: true, data: updatedFaq });
  } catch (error: any) {
    return handleFaqError(error, 'update');
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission('faqWrite');
    if (!auth.user) return NextResponse.json({ error: 'غير مصرح' }, { status: auth.status });

    const id = typeof params?.id === 'string' ? params.id.trim() : '';
    if (!id) return NextResponse.json({ error: 'معرّف السؤال الشائع غير صالح.' }, { status: 400 });

    const existing = await prisma.faqItem.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: 'السؤال الشائع غير موجود أو حُذف بالفعل.' }, { status: 404 });

    await prisma.faqItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleFaqError(error, 'delete');
  }
}
