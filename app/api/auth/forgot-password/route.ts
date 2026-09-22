import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // تأكد من مسار قاعدة البيانات لديك

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'برجاء إدخال البريد الإلكتروني' }, { status: 400 });
    }

    // 1. التحقق من وجود العميل بهذا البريد
    const customer = await db.customer.findUnique({ where: { email } });
    if (!customer) {
      // لأسباب أمنية، يفضل ألا تخبر المهاجم صراحة أن الإيميل غير موجود، ولكن للتسهيل:
      return NextResponse.json({ error: 'البريد الإلكتروني غير مسجل لدينا' }, { status: 404 });
    }

    // 2. توليد رمز OTP عشوائي (6 أرقام)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // صالح لمدة 10 دقائق

    // 3. حفظ الرمز ووقت الانتهاء في قاعدة البيانات للعميل
    await db.customer.update({
      where: { id: customer.id },
      data: {
        resetToken: otp,
        resetTokenExpiry: otpExpiry,
      },
    });

    // 4. إرسال الإيميل عبر Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY || '',
      },
      body: JSON.stringify({
        sender: {
          name: process.env.SENDER_NAME || 'متجر وَهَج',
          email: process.env.SENDER_EMAIL,
        },
        to: [{ email: customer.email, name: customer.name || 'عميلنا العزيز' }],
        subject: 'رمز استعادة كلمة المرور - متجر وَهَج',
        htmlContent: `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
            <h2 style="color: #b8860b;">متجر وَهَج للأناقة</h2>
            <p>مرحباً ${customer.name || ''},</p>
            <p>لقد طلبت إعادة تعيين كلمة المرور الخاصة بحسابك. استخدم الرمز أدناه لإتمام العملية:</p>
            <div style="background: #fff; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #b8860b; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #666; font-size: 12px;">هذا الرمز صالح لمدة 10 دقائق فقط. إذا لم تقم بهذا الطلب، يمكنك تجاهل هذه الرسالة.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      throw new Error('فشل إرسال البريد الإلكتروني عبر Brevo');
    }

    return NextResponse.json({ success: true, message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إرسال البريد' }, { status: 500 });
  }
}
