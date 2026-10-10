import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getClientKey, rateLimit } from '@/lib/rate-limit';

const ContactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  subject: z.string().trim().max(160).optional().default('استفسار عام'),
  message: z.string().trim().min(5).max(4000),
});

export async function POST(request: Request) {
  try {
    const limit = await rateLimit(`contact:${getClientKey(request)}`, 5, 10 * 60 * 1000);
    if (!limit.ok) return NextResponse.json({ error: 'محاولات كثيرة. حاولي لاحقًا.' }, { status: 429 });
    const { name, phone, subject, message } = ContactSchema.parse(await request.json());

    // حفظ الرسالة في قاعدة البيانات
    const newMsg = await prisma.contactMessage.create({
      data: {
        name,
        phone,
        subject,
        message,
      },
    });

    return NextResponse.json({ success: true, message: 'تم إرسال الرسالة بنجاح', data: newMsg });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'يرجى مراجعة البيانات المدخلة.' }, { status: 400 });
    console.error('Contact API Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم، يجدر المحاولة لاحقاً' },
      { status: 500 }
    );
  }
}
