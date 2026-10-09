import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/security';
import { getClientKey, rateLimit } from '@/lib/rate-limit';

const schema = z.object({
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional(),
}).refine(value => value.email || value.phone, { message: 'أدخل البريد أو الهاتف' })
  .refine(value => !value.phone || value.phone.replace(/\D/g, '').length >= 8, { message: 'رقم الهاتف غير صالح' });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const limit = rateLimit(`stock:${params.id}:${getClientKey(req)}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'محاولات كثيرة، حاولي لاحقًا' },
      { status: 429, headers: { 'Retry-After': '600', 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const body = schema.parse(await req.json());
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { id: true, stock: true, status: true },
    });
    if (!product || product.status !== 'PUBLISHED') return NextResponse.json({ error: 'المنتج غير متاح' }, { status: 404 });
    if (product.stock > 0) return NextResponse.json({ message: 'المنتج متوفر بالفعل' });

    const email = body.email ? body.email.toLowerCase() : null;
    const phone = body.phone ? normalizePhone(body.phone) : null;
    const existing = await prisma.backInStockSubscription.findFirst({
      where: {
        productId: product.id,
        notifiedAt: null,
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existing) return NextResponse.json({ ok: true, message: 'تم تسجيل طلب التنبيه مسبقًا' });
    await prisma.backInStockSubscription.create({ data: { productId: product.id, email, phone } });
    return NextResponse.json({ ok: true, message: 'تم تسجيل طلب التنبيه' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : 'بيانات غير صحيحة' }, { status: 400 });
  }
}
