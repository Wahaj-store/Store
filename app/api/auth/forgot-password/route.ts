import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientKey, rateLimit } from '@/lib/rate-limit';
import { hashIdentifier } from '@/lib/security';
import crypto from 'crypto';

const OTP_TTL_MS = 10 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = normalizeEmail(body?.email);

    if (!email || !email.includes('@') || email.length > 254) {
      return NextResponse.json({ error: 'برجاء إدخال بريد إلكتروني صحيح' }, { status: 400 });
    }

    const clientKey = getClientKey(req);
    const ipLimit = rateLimit(`forgot-password:ip:${clientKey}`, 5, RATE_WINDOW_MS);
    const emailLimit = rateLimit(`forgot-password:email:${hashIdentifier(email)}`, 3, RATE_WINDOW_MS);

    if (!ipLimit.ok || !emailLimit.ok) {
      return NextResponse.json(
        { error: 'تم تجاوز عدد المحاولات المسموح بها. حاولي مرة أخرى لاحقًا.' },
        { status: 429 }
      );
    }

    const customer = await prisma.customer.findUnique({ where: { email } });

    // لا نكشف ما إذا كان البريد مسجلًا أم لا.
    if (!customer) {
      return NextResponse.json({
        success: true,
        message: 'إذا كان البريد الإلكتروني مسجلًا لدينا، فسيتم إرسال رمز التحقق إليه.',
      });
    }

    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.SENDER_EMAIL;

    if (!brevoApiKey || !senderEmail) {
      console.error('Forgot password email is not configured: BREVO_API_KEY/SENDER_EMAIL missing');
      return NextResponse.json({ error: 'تعذر إرسال البريد الإلكتروني حاليًا' }, { status: 500 });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashIdentifier(`${email}:${otp}`);
    const otpExpiry = new Date(Date.now() + OTP_TTL_MS);

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        // resetToken يحتفظ بالـHash فقط، وليس الـOTP الحقيقي.
        resetToken: otpHash,
        resetTokenExpiry: otpExpiry,
      },
    });

    const safeName = escapeHtml(customer.name || 'عميلنا العزيز');

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          name: process.env.SENDER_NAME || 'متجر وَهَج',
          email: senderEmail,
        },
        to: [{ email, name: customer.name || 'عميلنا العزيز' }],
        subject: 'رمز استعادة كلمة المرور - متجر وَهَج',
        htmlContent: `
          <style>@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;700;800;900&display=swap');</style>
          <div dir="rtl" style="font-family: 'Tajawal', sans-serif; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
            <h2 style="color: #b8860b;">متجر وَهَج للأناقة</h2>
            <p>مرحباً ${safeName},</p>
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
      const details = await response.text().catch(() => '');
      console.error('Brevo forgot-password error:', response.status, details);
      await prisma.customer.update({
        where: { id: customer.id },
        data: { resetToken: null, resetTokenExpiry: null },
      }).catch((cleanupError) => console.error('Forgot-password cleanup failed:', cleanupError));
      return NextResponse.json({ error: 'تعذر إرسال البريد الإلكتروني حاليًا' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني',
    });
  } catch (error) {
    console.error('FORGOT_PASSWORD_ERROR:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إرسال البريد' }, { status: 500 });
  }
}
