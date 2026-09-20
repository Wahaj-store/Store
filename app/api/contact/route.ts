import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, subject, message } = body;

    if (!name || !phone || !message) {
      return NextResponse.json(
        { error: 'يرجى إدخال الحقول الإجبارية (الاسم، الهاتف، والرسالة)' },
        { status: 400 }
      );
    }

    // حفظ الرسالة في قاعدة البيانات
    const newMsg = await prisma.contactMessage.create({
      data: {
        name,
        phone,
        subject: subject || 'استفسار عام',
        message,
      },
    });

    return NextResponse.json({ success: true, message: 'تم إرسال الرسالة بنجاح', data: newMsg });
  } catch (error) {
    console.error('Contact API Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم، يجدر المحاولة لاحقاً' },
      { status: 500 }
    );
  }
}
