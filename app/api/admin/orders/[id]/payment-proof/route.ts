import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getClientKey, rateLimit } from '@/lib/rate-limit';
import { getPaymentProofUrl, isPrivatePaymentProofPath } from '@/lib/payment-proof';

const ALLOWED_ROLES = [
  'OWNER',
  'ADMIN',
  'MANAGER',
  'ORDER_MANAGER',
];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser(ALLOWED_ROLES);

  if (!user) {
    return NextResponse.json(
      { error: 'غير مصرح' },
      { status: 403 },
    );
  }

  const limit = await rateLimit(
    `payment-proof:${user.id}:${getClientKey(req)}`,
    30,
    10 * 60 * 1000,
  );

  if (!limit.ok) {
    return NextResponse.json(
      { error: 'تم تجاوز عدد المحاولات. حاول مرة أخرى لاحقًا.' },
      {
        status: 429,
        headers: {
          'Retry-After': '600',
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  try {
    const { id } = await params;

    const payment = await prisma.payment.findFirst({
      where: {
        orderId: id,
        proofUrl: {
          not: null,
        },
      },
      select: {
        proofUrl: true,
        method: true,
        orderId: true,
      },
    });

    if (!payment?.proofUrl) {
      return NextResponse.json(
        { error: 'إثبات الدفع غير موجود' },
        { status: 404 },
      );
    }

    if (!isPrivatePaymentProofPath(payment.proofUrl)) {
      return NextResponse.json(
        { error: 'إثبات الدفع غير متاح في التخزين الخاص' },
        { status: 404 },
      );
    }

    const signedUrl = await getPaymentProofUrl(payment.proofUrl);
    if (!signedUrl) {
      return NextResponse.json(
        { error: 'تعذر قراءة إثبات الدفع' },
        { status: 404 },
      );
    }

    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('PAYMENT_PROOF_READ_ERROR:', error);

    return NextResponse.json(
      { error: 'تعذر عرض إثبات الدفع حاليًا' },
      { status: 500 },
    );
  }
}
