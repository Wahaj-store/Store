import { NextResponse } from 'next/server';
import { getCustomer } from '@/lib/customer-auth';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { rateLimit, getClientKey } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const customer = await getCustomer();
    if (!customer) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const limit = rateLimit(`customer-password:${customer.id}:${getClientKey(req)}`, 5, 15 * 60 * 1000);
    if (!limit.ok) return NextResponse.json({ error: 'محاولات كثيرة. حاولي مرة أخرى لاحقًا.' }, { status: 429 });

    const body = await req.json().catch(() => null);
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
    if (!currentPassword || !newPassword) return NextResponse.json({ error: 'جميع حقول كلمة المرور مطلوبة' }, { status: 400 });
    if (newPassword.length < 8) return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }, { status: 400 });
    if (!customer.passwordHash || !(await verifyPassword(currentPassword, customer.passwordHash))) {
      return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 400 });
    }
    if (currentPassword === newPassword) return NextResponse.json({ error: 'اختاري كلمة مرور جديدة مختلفة' }, { status: 400 });

    await (await import('@/lib/prisma')).prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    return NextResponse.json({ ok: true, message: 'تم تحديث كلمة المرور بنجاح' });
  } catch (error: any) {
    if (error?.message === 'كلمة المرور يجب أن تكون 8 أحرف على الأقل') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('CUSTOMER_PASSWORD_ERROR:', error);
    return NextResponse.json({ error: 'تعذر تحديث كلمة المرور حاليًا' }, { status: 500 });
  }
}
