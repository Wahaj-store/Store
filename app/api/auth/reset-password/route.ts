import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { getClientKey, rateLimit } from '@/lib/rate-limit';
import { hashIdentifier, timingSafeEqualText } from '@/lib/security';

const OTP_RATE_WINDOW_MS = 10 * 60 * 1000;

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function isValidOtp(value: unknown): value is string {
  return typeof value === 'string' && /^\d{6}$/.test(value);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = normalizeEmail(body?.email);
    const otp = typeof body?.otp === 'string' ? body.otp.trim() : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'جميع البيانات مطلوبة' }, { status: 400 });
    }

    if (!email.includes('@') || email.length > 254 || !isValidOtp(otp)) {
      return NextResponse.json({ error: 'رمز التحقق غير صحيح أو انتهت صلاحيته' }, { status: 400 });
    }

    // حماية من تخمين الـOTP: 5 محاولات لكل IP + بريد خلال 10 دقائق.
    const clientKey = getClientKey(req);
    const ipLimit = rateLimit(`reset-password:ip:${clientKey}`, 10, OTP_RATE_WINDOW_MS);
    const emailLimit = rateLimit(`reset-password:email:${hashIdentifier(email)}`, 5, OTP_RATE_WINDOW_MS);

    if (!ipLimit.ok || !emailLimit.ok) {
      return NextResponse.json(
        { error: 'تم تجاوز عدد محاولات التحقق. حاولي طلب رمز جديد لاحقًا.' },
        { status: 429 }
      );
    }

    const customer = await prisma.customer.findUnique({ where: { email } });

    if (!customer || !customer.resetToken || !customer.resetTokenExpiry || customer.resetTokenExpiry.getTime() < Date.now()) {
      return NextResponse.json({ error: 'رمز التحقق غير صحيح أو انتهت صلاحيته' }, { status: 400 });
    }

    const suppliedHash = hashIdentifier(`${email}:${otp}`);
    const tokenMatches = timingSafeEqualText(suppliedHash, customer.resetToken);

    if (!tokenMatches) {
      return NextResponse.json({ error: 'رمز التحقق غير صحيح أو انتهت صلاحيته' }, { status: 400 });
    }

    // hashPassword يتحقق أيضًا من الحد الأدنى لطول كلمة المرور.
    const hashedPassword = await hashPassword(newPassword);

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح' });
  } catch (error: any) {
    if (error?.message === 'كلمة المرور يجب أن تكون 8 أحرف على الأقل') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('RESET_PASSWORD_ERROR:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إعادة تعيين كلمة المرور' }, { status: 500 });
  }
}
